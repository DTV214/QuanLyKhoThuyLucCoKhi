# 02 — Cơ sở dữ liệu (Supabase / PostgreSQL)

File nguồn: `supabase/migrations/*.sql` (chạy theo thứ tự) và `supabase/seed.sql`.

## Sơ đồ quan hệ
```
warehouses 1─n zones 1─n racks 1─n locations ─┐
                                              │ (location_id)
categories ─┐                                 ▼
brands ─────┤                           inventory  (product × location, quantity ≥ 0)
countries ──┼──▶ products 1───────────────┘
materials ──┤        │
units ──────┘        └──n stock_movements n──1 stock_documents (phiếu)
                                │
profiles (role, status) ────────┴── user_id     notifications, audit_logs
```

## Bảng
| Bảng | Ý nghĩa | Ghi chú |
|---|---|---|
| `profiles` | Người dùng (1-1 với `auth.users`) | role `owner/admin/staff`, status `active/locked`, `must_change_password`; chỉ 1 owner |
| `warehouses` | Kho | `K1` Trong nhà, `K2` Kho lớn |
| `zones` | Khu vực trong kho | mã duy nhất trong 1 kho |
| `racks` | Kệ | thêm kệ → **tự tạo các tầng** theo `levels` |
| `locations` | Tầng/ô cụ thể | `code` tự sinh: `K1-A-03-T2` |
| `categories` | Loại hàng (cây cha-con) | `spec_schema` định nghĩa thông số riêng cho form |
| `brands`, `countries`, `materials`, `units`, `suppliers` | Danh mục tra cứu | `units.allow_decimal` cho phép số lẻ (mét) |
| `products` | Mặt hàng | `sku` duy nhất; `specs` JSONB; `search_text` tự sinh không dấu |
| `inventory` | Tồn theo vị trí | **chỉ đọc** với client |
| `stock_documents` | Phiếu nhập/xuất/chuyển/kiểm kê | `doc_no` từ `fn_next_doc_no`: `PN261126-00001` |
| `stock_movements` | Từng dòng biến động | **chỉ thêm**, không sửa/xoá; `balance_after` = tồn sau thao tác |
| `notifications` | Thông báo theo người nhận | realtime |
| `audit_logs` | Ai sửa gì trên danh mục | tự ghi bằng trigger |

## RPC (gọi bằng `supabase.rpc(name, args)`)
| Hàm | Ai | Việc |
|---|---|---|
| `fn_stock_out(product, location, qty, date?, note?, document?)` | mọi role | Lấy hàng. Khoá dòng, báo lỗi nếu không đủ. Trả `{remaining_at_location, total_remaining, location_code}` |
| `fn_stock_in(product, location, qty, date?, note?, document?)` | mọi role | Nhập hàng |
| `fn_transfer(product, from, to, qty, date?, note?, document?)` | mọi role | Chuyển kho/kệ |
| `fn_adjust(product, location, counted, reason, document?)` | owner, admin | Kiểm kê: đặt số thực tế |
| `fn_reverse_movement(movement_id, reason)` | owner, admin | Phiếu đảo, mỗi dòng chỉ đảo 1 lần |
| `fn_search_products(query?, warehouse?, category?, brand?, material?, low_stock?, limit?, offset?)` | mọi role | Tìm không dấu + gõ sai nhẹ + mã kệ; trả kèm `locations` JSON |
| `fn_next_doc_no(type)` | mọi role | Sinh số phiếu |

Mã lỗi: `42501` không có quyền · `P0001` không đủ hàng · `P0002` không tìm thấy · `22023` dữ liệu sai. Hàm `mapDbError()` (`src/lib/action-result.ts`) đổi sang câu tiếng Việt.

## Trigger quản lý sơ đồ kho (migration 004)
| Trigger | Việc |
|---|---|
| `racks_create_levels` | Thêm kệ → tạo đủ tầng |
| `racks_sync_levels` | Tăng số tầng → thêm tầng; giảm → ngừng tầng thừa (chặn nếu còn hàng) |
| `*_guard_deactivate` | Ngừng kho/khu/kệ → chặn nếu còn hàng |
| `*_refresh_codes` | Đổi mã kho/khu/kệ → sinh lại mã vị trí |
| View `v_location_stock` | Số mặt hàng + tổng số lượng trên mỗi vị trí |

## Mặt hàng chi tiết (migration 005)
- `products`: `quality_standard`, `connection_a/b`, `temp_min/max` (°C, ràng buộc min ≤ max), `pressure_max` (bar), `media text[]` (GIN index), `length/width/height_mm`, `weight_g`, `images jsonb` (≤ 8; trigger `products_main_image` chép ảnh đầu sang `image_url`), `description`.
- `racks`: `level_width_mm`, `level_depth_mm`, `level_height_mm`, `level_max_load_kg`.
- `f_norm(text)`: bỏ dấu + `Φ/Ø → phi` → tìm "phi8" ra "Φ8".
- `fn_search_products` thêm tham số: `p_country_id`, `p_media`, `p_temperature`, `p_connection`, `p_in_stock`; trả thêm thông số + `total_count`.

## Nghiệp vụ kho (migration 006)
- `products.extra_specs jsonb` — "Thông số khác" [{label, value}] ≤ 30, có trong chuỗi tìm kiếm.
- `fn_create_receipt(p_lines, p_date?, p_supplier_id?, p_reference_no?, p_note?)` — tạo phiếu `PN…` + gọi `fn_stock_in` từng dòng trong 1 giao dịch; lỗi dòng N → "Dòng N: …" và huỷ cả phiếu; báo quản lý.
- Trigger `stock_movements_date` + `fn_check_date`: ngày nhập/xuất không sau hôm nay, không cũ hơn 1 năm.

## RLS tóm tắt
- Danh mục + mặt hàng + tồn kho: ai đang `active` đều **xem**; chỉ owner/admin **thêm/sửa**; chỉ owner **xoá**.
- `inventory`, `stock_movements`, `audit_logs`: client **không có quyền ghi** (đã `revoke`).
- `stock_movements`, `stock_documents`: staff chỉ xem của mình; owner/admin xem hết.
- `profiles`: tự sửa tên/SĐT; đổi role/status chỉ qua server (service_role).
- Tài khoản `locked` → `fn_my_role()` trả NULL → mọi policy/RPC đều chặn.

## Cách cài lên Supabase
1. Tạo project tại supabase.com (region Singapore).
2. Authentication → Providers → Email: **tắt "Allow new users to sign up"**, bật "Confirm email".
3. Điền `DATABASE_URL` trong `.env.local` rồi chạy `npm run db:migrate` (mỗi migration chạy 1 lần, ghi trong bảng `_migrations`; `seed.sql` chạy lại an toàn).
   Cách khác: SQL Editor → dán lần lượt 3 file migration → `seed.sql`.
4. Chạy `npm run seed:owner` để tạo tài khoản ông chủ.

## Đã kiểm thử
Bộ migration được chạy thử trên PGlite (Postgres 17): nhập/lấy/chuyển/kiểm kê/đảo phiếu, chặn lấy quá tồn, chặn số lẻ, chặn staff kiểm kê, chặn sửa tồn trực tiếp, chặn tự nâng quyền, tìm "hat bap 316", "con tan inix" (gõ sai), "k2-a-01" (mã kệ).
