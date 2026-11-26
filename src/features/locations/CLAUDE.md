# features/locations

Sơ đồ kho — trang `/kho` (mọi người xem; owner/admin sửa).

- Cấu trúc: `warehouses` → `zones` → `racks` → `locations` (tầng). Mã vị trí `K1-A-03-T2` do trigger `tg_location_code` sinh, **không sửa tay**.
- Thêm kệ → trigger tạo đủ tầng. Sửa `racks.levels` → `tg_rack_sync_levels` thêm tầng / ngừng tầng thừa (chặn nếu tầng thừa còn hàng).
- Đổi mã kho/khu/kệ → `tg_refresh_location_codes` sinh lại mã vị trí.
- Không xoá; "ngừng dùng" = `is_active = false`, bị `tg_guard_deactivate` chặn khi còn hàng.
- Đếm hàng mỗi tầng: view `v_location_stock` (security_invoker).
- `queries.ts#getWarehouseTree()` trả cây `WarehouseNode` (types.ts). UI: `WarehouseMap` (chọn kho, khung khu, ô kệ, hộp chi tiết kệ vẽ như kệ thật, form qua `FormDialog`).

Migration liên quan: `20261127000004_locations_admin.sql`.
