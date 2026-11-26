# features/users

Quản lý tài khoản — trang `/nguoi-dung` (owner, admin).

- Tạo tài khoản: `createUser` dùng Supabase Admin API (`createAdminSupabase`), ghi role/tên/SĐT vào `app_metadata` → trigger `tg_handle_new_user` tạo `profiles`. Mật khẩu tạm từ `generateTempPassword()` (`src/server/auth/temp-password.ts`), hiện **một lần** trong `TempPasswordCard`, `must_change_password = true`.
- Quy tắc quyền: `canManageUser(actor, target)` trong `src/lib/roles.ts` — owner quản lý admin + staff, admin chỉ quản lý staff; không ai thao tác lên chính mình hay lên owner. Đổi role: chỉ owner.
- Khoá: cập nhật `profiles.status = 'locked'` (DB chặn ngay qua `fn_my_role()`) **và** `ban_duration` trong Supabase Auth (không đăng nhập/làm mới phiên được).
- `profiles.role/status` chỉ đổi được bằng service_role (trigger `tg_protect_profile`).
- UI: `UsersView` (tìm không dấu + lọc trạng thái, bảng trên máy tính / thẻ trên điện thoại), `UserRowActions` (menu + hộp xác nhận), `RolePicker` (thẻ chọn quyền lớn).

File: `actions.ts` (server), `queries.ts` (server, `listUsers`), `schemas.ts`, `components/*`.
