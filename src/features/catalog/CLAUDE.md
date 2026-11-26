# features/catalog

Danh mục — trang `/danh-muc` (owner/admin; chỉ owner xoá).

- Bảng đơn giản: brands, materials, countries, units, suppliers. Luật nhập: `LOOKUP_SCHEMAS` trong `schemas.ts`; cấu hình cột/form: `LOOKUPS` trong `components/catalog-view.tsx`. Thêm danh mục mới = thêm 1 khoá ở cả hai chỗ.
- `saveLookup(table, input)`: `table` từ client → kiểm tra `Object.hasOwn(LOOKUP_SCHEMAS, table)`.
- Loại hàng (`categories`) có `spec_schema` = mảng `SpecField { key, label, type: text|number|select, unit?, options? }`. `key` sinh từ nhãn (không dấu) khi tạo mới và **giữ nguyên** khi đổi nhãn (vì `products.specs` lưu theo key).
- Xoá: `deleteCatalogItem` (owner; RLS xoá chỉ owner; khoá ngoại chặn khi đang dùng). UI chỉ hiện nút Xoá khi `usage = 0`.
