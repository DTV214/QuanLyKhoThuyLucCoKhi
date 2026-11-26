# features/auth

Đăng nhập, đăng xuất, quên mật khẩu, đặt mật khẩu mới (lần đầu / qua email).

- **Không có đăng ký công khai.** Tài khoản do owner/admin tạo ở `features/users` (Supabase Admin API, `app_metadata.role`). Trigger `tg_handle_new_user` tạo `profiles`.
- `signIn`: lỗi luôn là "Email hoặc mật khẩu không đúng" (không lộ email tồn tại); tài khoản `locked` bị đăng xuất ngay.
- `requestPasswordReset`: luôn trả thành công. Link email → `/auth/callback?code=…&next=/dat-lai-mat-khau`.
- `setNewPassword`: dùng cho cả `/dat-lai-mat-khau` và `/doi-mat-khau-lan-dau`; tắt `must_change_password` bằng admin client.
- Chính sách mật khẩu: `newPasswordField` trong `schemas.ts` (≥ 8, có chữ + số). Cấu hình tương tự trong Supabase → Auth → Password.
- Chống dò mật khẩu: dựa vào rate limit của Supabase Auth (lỗi 429 → thông báo đợi).

File: `actions.ts` (server), `schemas.ts` (dùng chung), `components/*` (client).
