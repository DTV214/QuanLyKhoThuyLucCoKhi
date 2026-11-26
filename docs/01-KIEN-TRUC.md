# 01 — Kiến trúc

```
 Trình duyệt (React, shadcn)                Next.js server (Node.js)                 Supabase
┌──────────────────────────┐   form/click  ┌───────────────────────────┐  SQL/RPC  ┌──────────────────┐
│ features/*/components    │ ────────────▶ │ features/*/actions.ts     │ ────────▶ │ Postgres + RLS   │
│ TanStack Query (cache)   │ ◀──────────── │  requireRole → zod.parse  │ ◀──────── │ fn_stock_* (RPC) │
└────────────┬─────────────┘  ActionResult │  → supabase.rpc(...)      │           │ Auth (bcrypt)    │
             │                             └─────────────┬─────────────┘           │ Realtime         │
             │ websocket (Realtime: inventory, notifications)                      └────────┬─────────┘
             └──────────────────────────────────────────────────────────────────────────────┘
                                                         │ ký chữ ký upload
                                                         ▼
                                                    Cloudinary (ảnh)
```

## Vì sao BE nằm trong Next.js?
- `actions.ts` có `"use server"` → hàm này **chạy trên Node.js server**, client gọi như gọi hàm bình thường. Đây là cách dễ nhất để bắt đầu với Node.js.
- `src/app/api/**/route.ts` → API REST thật (GET/POST), dùng khi cần gọi từ bên ngoài (webhook, upload).
- `src/server/**` là "tầng backend": nếu sau này tách ra Express/NestJS chỉ cần chuyển thư mục này.

## Dòng chảy 1 thao tác "Lấy hàng"
1. `TakeStockDialog` (client) gọi `takeStock({ productId, locationId, quantity, note, date })`.
2. `features/inventory/actions.ts`: `requireUser()` → `takeStockSchema.parse()` → `supabase.rpc("fn_stock_out", ...)`.
3. Postgres `fn_stock_out`: khoá dòng `inventory FOR UPDATE` → kiểm tra đủ hàng → trừ → ghi `stock_movements` → nếu dưới mức tối thiểu ghi `notifications`. Tất cả trong 1 transaction.
4. Supabase Realtime phát thay đổi bảng `inventory` → các trình duyệt khác `invalidateQueries` → số mới hiện ngay.
5. Action trả `{ ok: true, data: { remaining } }` → toast thông báo.

## Bảo mật 3 lớp
1. `src/middleware.ts`: chưa đăng nhập → `/dang-nhap`; tài khoản `must_change_password` → `/doi-mat-khau-lan-dau`.
2. Server Action: `requireRole()`.
3. RLS Postgres + RPC `SECURITY DEFINER` kiểm tra role bên trong.

## Biến môi trường (`.env.local`, xem `.env.example`)
| Biến | Ở đâu | Ghi chú |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client+server | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client+server | an toàn vì có RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | **chỉ server** | dùng tạo tài khoản; tuyệt đối không lộ |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | server | |
| `NEXT_PUBLIC_SITE_URL` | | link trong email đặt lại mật khẩu |
