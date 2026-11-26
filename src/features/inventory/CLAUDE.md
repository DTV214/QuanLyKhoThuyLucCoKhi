# features/inventory

Nghiệp vụ kho: **lấy hàng, nhập hàng, chuyển vị trí, kiểm kê** + tìm nhanh (Ctrl+K).

## Nơi dùng
- Trang mặt hàng `/mat-hang/[id]` → `StockPanel`: mỗi vị trí có nút **Lấy hàng** (mọi người), **Chuyển** (mọi người), **Kiểm kê** (owner/admin); nút **Nhập thêm hàng này** → `/nhap-hang?sp=<id>`.
- `/nhap-hang` → `ReceiptForm`: phiếu nhiều dòng (mặt hàng – vị trí cất – số lượng), ngày mặc định hôm nay.
- Thanh đầu trang → `QuickSearch` (nút + phím Ctrl/⌘ K). Chỉ gắn **1 lần** trong `AppShell` (2 bản sẽ mở 2 hộp).

## Quy tắc
- Mọi thay đổi số lượng gọi RPC: `fn_stock_out`, `fn_stock_in` (qua `fn_create_receipt`), `fn_transfer`, `fn_adjust`. Không update `inventory` trực tiếp.
- `fn_create_receipt`: tất cả dòng trong 1 giao dịch; dòng lỗi → huỷ cả phiếu, thông báo "Dòng N: …".
- Trigger `stock_movements_date` (migration 006) chặn ngày ở tương lai / quá 1 năm.
- Lấy hàng 3 bước (`TakeStockDialog`): nhập số → xác nhận (vị trí, số lấy, số còn lại) → kết quả (còn tại vị trí + tổng còn). Hộp thoại được mount ở `StockPanel` với **bản chụp** vị trí để không biến mất khi trang làm mới sau khi trừ kho.
- Kiểm tra số lượng ở client (số nguyên / số lẻ theo `units.allow_decimal`, không vượt tồn) chỉ để báo sớm; database vẫn là nơi chặn cuối.
- Gợi ý vị trí cất: các vị trí đang chứa mặt hàng đó lên đầu (`LocationSelect` → nhóm "Đang chứa mặt hàng này").

File: `actions.ts` (server), `queries.ts` (`getLocationOptions`, `getSuppliers`), `schemas.ts`, `types.ts`, `components/*`.
