# 05 — Node.js cho người mới (trong dự án này)

## Node.js là gì?
JavaScript bình thường chạy trong trình duyệt. **Node.js** cho JavaScript chạy trên máy chủ: đọc database, giữ bí mật (khoá API), gửi email. Next.js chạy trên Node.js, nên phần "BE" của dự án chính là các file chạy phía server của Next.js.

## Cài đặt & chạy
```powershell
node -v          # cần >= 20 (máy đang có v24)
npm install      # cài thư viện theo package.json (tạo node_modules/)
copy .env.example .env.local   # rồi điền khoá Supabase/Cloudinary
npm run dev      # mở http://localhost:3000
```
- `package.json`: danh sách thư viện + lệnh (`scripts`).
- `node_modules/`: thư viện đã tải, **không commit**.
- `.env.local`: khoá bí mật, **không commit**.

## Code nào chạy ở đâu?
| Dấu hiệu | Chạy ở | Ví dụ |
|---|---|---|
| File có `"use client"` ở đầu | Trình duyệt | nút bấm, hộp thoại, form |
| File có `"use server"` ở đầu (`actions.ts`) | **Node.js server** | `takeStock()` gọi database |
| `src/app/api/**/route.ts` | **Node.js server** | API REST `GET`/`POST` |
| `src/server/**` (có `import "server-only"`) | **Node.js server** | khoá service role, Cloudinary |
| `page.tsx` không có `"use client"` | Server (render HTML) | đọc dữ liệu rồi hiển thị |

## Một Server Action mẫu (đọc từ trên xuống)
```ts
"use server";                                       // 1. chạy trên Node.js
export async function takeStock(input: unknown) {
  const user = await requireUser();                 // 2. đã đăng nhập chưa?
  const data = takeStockSchema.parse(input);        // 3. dữ liệu có hợp lệ không? (Zod)
  const supabase = await createServerSupabase();    // 4. kết nối DB bằng phiên của user
  const { data: r, error } = await supabase.rpc("fn_stock_out", { ... });  // 5. gọi DB
  if (error) return fail(mapDbError(error));        // 6. lỗi → câu tiếng Việt
  revalidatePath("/tim-hang");                      // 7. làm mới trang
  return ok(r);
}
```
Ở client chỉ cần: `const res = await takeStock({...})` — Next.js tự gửi request lên server.

## Gỡ lỗi
- `console.log()` trong file server → in ra **cửa sổ terminal** đang chạy `npm run dev`, không phải F12.
- `console.log()` trong file `"use client"` → in ra **F12 → Console** của trình duyệt.
- Lỗi TypeScript: `npm run typecheck`. Lỗi build: `npm run build`.

## Khi nào cần server Express riêng?
Khi có app di động/hệ thống khác gọi vào nhiều, hoặc tác vụ chạy nền dài. Lúc đó chuyển `src/server/**` + logic trong `actions.ts` sang Express; database và RPC giữ nguyên.
