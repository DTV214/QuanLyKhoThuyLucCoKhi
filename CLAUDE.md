# CLAUDE.md — Kho Công ty Thành Danh VMC

Web app nội bộ quản lý kho linh kiện thủy lực / khí nén / cơ khí (ống, co nối, hạt bắp, con tán, van…).
2 kho: **Kho 1 – Trong nhà** (`K1`) và **Kho 2 – Kho lớn** (`K2`). Người dùng chính là người lớn tuổi → **đơn giản trước, đẹp sau**.

Đọc thêm trước khi code: `docs/00-TONG-QUAN.md` → `docs/01-KIEN-TRUC.md` → `docs/02-DATABASE.md` → `docs/03-PHAN-QUYEN.md`.

## Công nghệ
- Next.js 15 App Router + TypeScript (strict). BE = Server Actions + Route Handlers chạy Node.js trong cùng project.
- Supabase: Postgres + Auth (email/mật khẩu, **không** OAuth, **không** đăng ký công khai) + Realtime + RLS.
- Cloudinary: ảnh sản phẩm (upload có chữ ký từ server).
- UI: shadcn/ui (radix-nova) là chuẩn. Magic UI / Aceternity / React Bits chỉ để trang trí (login, banner) → đặt trong `src/components/magic/`.
- Zod validate mọi input ở cả client và server. TanStack Query cho dữ liệu client. `sonner` cho toast.

## Lệnh
- `npm run dev` — chạy dev (http://localhost:3000)
- `npm run build` / `npm run lint` / `npm run typecheck`
- `npm run db:types` — sinh `src/types/database.ts` từ Supabase (cần Supabase CLI + `SUPABASE_PROJECT_ID`)

## Cấu trúc (feature-based)
```
src/app/         chỉ routing + layout, KHÔNG chứa logic nghiệp vụ
src/features/X/  components/ actions.ts (server) queries.ts schemas.ts hooks/ index.ts CLAUDE.md
src/server/      code chỉ chạy server: supabase admin, guard quyền, cloudinary
src/lib/         tiện ích dùng chung (client + server), supabase browser client, constants
src/components/  ui/ (shadcn, không sửa tay trừ khi cần) · magic/ · layout/ · common/
supabase/        migrations/*.sql, seed.sql
docs/            tài liệu cho người và cho AI
```

## Quy tắc bắt buộc
1. **Không bao giờ UPDATE bảng `inventory` trực tiếp.** Mọi thay đổi số lượng đi qua RPC Postgres: `fn_stock_in`, `fn_stock_out`, `fn_transfer`, `fn_adjust`, `fn_reverse_movement`.
2. `stock_movements` và `audit_logs` chỉ INSERT — không sửa, không xoá. Sửa sai bằng **phiếu đảo** (`fn_reverse_movement`).
3. Mọi Server Action bắt đầu bằng `await requireUser()` hoặc `await requireRole([...])` (`src/server/auth/guard.ts`), sau đó `schema.parse(input)`.
4. File trong `src/server/**` có `import "server-only"`. `SUPABASE_SERVICE_ROLE_KEY`, `CLOUDINARY_API_SECRET` chỉ được đọc ở đây.
5. Feature chỉ import feature khác qua `@/features/<x>` (file `index.ts`), không import sâu vào bên trong.
6. Toàn bộ chữ trên giao diện là **tiếng Việt**. Route dùng tiếng Việt không dấu (`/tim-hang`, `/nhap-hang`).
7. UX cho người lớn tuổi: chữ ≥ 16px, nút chính `size="lg"` (cao ≥ 44px), icon luôn đi kèm chữ, mọi thao tác trừ kho phải có hộp xác nhận hiển thị rõ **vị trí + số lượng + tồn còn lại**.
8. Ngày nhập/xuất mặc định **hôm nay** (`todayISO()` trong `src/lib/date.ts`, múi giờ Asia/Ho_Chi_Minh).
9. Số lượng là `numeric(14,3)` (ống tính theo mét có lẻ); hiển thị bằng `formatQty()`.
10. Server Action trả về `ActionResult<T>` (`src/lib/action-result.ts`), không throw lỗi ra client.

## Màu & thương hiệu
- Tên hiển thị: **Kho Công ty Thành Danh VMC**. Logo: `src/components/layout/logo.tsx`.
- Primary xanh `#1E5AA8`, sáng `#3B82F6`, nền trắng. Banner dùng class `bg-brand-gradient`.
