# features/notifications

Giai đoạn 6 — **thời gian thực**.

- `RealtimeSync` (gắn 1 lần trong `AppShell`): lắng nghe Supabase Realtime bảng `inventory` (RLS theo người xem). Có thay đổi → gom 1 giây → `router.refresh()` nếu đang ở `/tim-hang`, `/mat-hang/*`, `/kho`. Tab ẩn → làm mới khi quay lại.
- `NotificationBell` (chỉ owner/admin): đọc 30 thông báo mới nhất từ bảng `notifications` (do RPC tạo: `stock_out`, `stock_in`, `low_stock`, `adjust`), lắng nghe INSERT có `recipient_id = mình` → thêm vào danh sách + toast. Bấm thông báo có `payload.product_id` → mở trang mặt hàng. `markNotificationsRead(ids | "all")`.
- Kênh realtime: tạo đồng bộ với tên ngẫu nhiên, `subscribe()` sau `realtime.setAuth()`, gỡ khi unmount (React dev chạy effect 2 lần — dùng chung tên kênh sẽ lỗi "cannot add callbacks after subscribe"). Không dùng `crypto.randomUUID` (không có khi mở qua `http://192.168…`).
- Bảng cần nằm trong publication `supabase_realtime` (migration 003: inventory, notifications, stock_movements).
