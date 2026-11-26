# features/products

Mặt hàng — trang `/tim-hang` (danh sách + bộ lọc, mọi người), `/mat-hang/[id]` (chi tiết), `/mat-hang/moi`, `/mat-hang/[id]/sua` (owner/admin).

## Dữ liệu (migration 005)
Ngoài trường cơ bản, mặt hàng có: `quality_standard`, `connection_a/b` (2 đầu nối, có thể khác cỡ), `temp_min/temp_max` (°C), `pressure_max` (bar), `media text[]` (môi chất), `length_mm/width_mm/height_mm/weight_g`, `images jsonb [{url, publicId}]` (≤ 8, ảnh đầu = ảnh chính; trigger tự chép sang `image_url`), `description`, `specs` (theo `categories.spec_schema`).

## Tìm kiếm
- `fn_search_products` (RPC, security invoker): chữ không dấu + `Φ/Ø → phi` (`f_norm`), gõ sai nhẹ (pg_trgm), mã kệ; lọc kho, loại (gồm loại con), hãng, vật liệu, xuất xứ, môi chất, nhiệt độ chịu được, cỡ đầu nối, còn hàng, sắp hết; trả `total_count`.
- Bộ lọc lưu trên URL (`searchFiltersSchema`): `q, kho, loai, hang, vatlieu, xuatxu, moichat, nhietdo, daunoi, conhang, saphet, so`.

## Ảnh (Cloudinary)
- Trình duyệt thu nhỏ ảnh (≤ 1600px, JPEG) → xin chữ ký `POST /api/upload/signature` (owner/admin) → upload thẳng lên Cloudinary vào `CLOUDINARY_FOLDER/mat-hang`.
- `saveProduct` từ chối ảnh không thuộc thư mục đó; ảnh bị bỏ khỏi mặt hàng → xoá trên Cloudinary. Bấm Huỷ → `discardUploadedImages` dọn ảnh vừa tải.
- Hiển thị qua `cldUrl(url, width)` (`src/lib/cloudinary-url.ts`) — f_auto, q_auto.

## Quy tắc
- `saveProduct` lọc `specs` theo `spec_schema` của loại hàng (bỏ khoá lạ, ép số, kiểm tra lựa chọn).
- Không xoá mặt hàng: `setProductActive` (ngừng kinh doanh) để giữ lịch sử.
- Số tồn KHÔNG sửa ở đây — chỉ qua nhập/lấy/kiểm kê (giai đoạn 5).
