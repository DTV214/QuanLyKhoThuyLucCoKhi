# 04 — Server Actions & API

Mọi action trả `ActionResult<T>` = `{ ok: true, data, message? } | { ok: false, error, fieldErrors? }`.
Cột "Trạng thái": ✅ đã có · ⏳ theo lộ trình.

## auth (`src/features/auth/actions.ts`)
| Action | Quyền | Mô tả | Trạng thái |
|---|---|---|---|
| `signIn({ email, password, next? })` | công khai | Đăng nhập; trả `redirectTo` | ✅ |
| `signOut()` | đã đăng nhập | Đăng xuất | ✅ |
| `requestPasswordReset({ email })` | công khai | Gửi email đặt lại (luôn báo thành công) | ✅ |
| `setNewPassword({ password, confirm })` | lần đăng nhập đầu, hoặc phiên từ link khôi phục (< 15 phút) | Đặt mật khẩu mới không cần mật khẩu cũ, tắt `must_change_password` | ✅ |
| `changeOwnPassword({ current, password, confirm })` | đã đăng nhập | Tự đổi mật khẩu, phải nhập đúng mật khẩu hiện tại (trang `/tai-khoan`) | ✅ |

## users (`src/features/users/actions.ts`)
| Action | Quyền | Trạng thái |
|---|---|---|
| `createUser({ fullName, email, phone?, role })` → `{ email, fullName, tempPassword }` | owner (admin + staff), admin (staff) | ✅ |
| `updateUserInfo({ id, fullName, phone? })` | như trên | ✅ |
| `setUserLocked({ id, locked })` — `profiles.status` + ban trong Supabase Auth | như trên | ✅ |
| `resetUserPassword({ id })` → mật khẩu tạm mới, bắt đổi lại | như trên | ✅ |
| `changeUserRole({ id, role })` — chỉ `admin`/`staff` | owner | ✅ |

Không ai tự thao tác lên chính mình qua các action này; không ai thao tác lên ông chủ.
Đọc danh sách: `listUsers()` trong `queries.ts` (server, RLS).

## inventory (`src/features/inventory/actions.ts`) — gọi RPC trong `docs/02-DATABASE.md`
| Action | RPC | Quyền | Trạng thái |
|---|---|---|---|
| `takeStock({ productId, locationId, quantity, date?, note? })` | `fn_stock_out` | mọi role | ⏳ |
| `receiveStock({ date, supplierId?, referenceNo?, lines[] })` | `fn_stock_in` × n | mọi role | ⏳ |
| `transferStock(...)` | `fn_transfer` | mọi role | ⏳ |
| `adjustStock(...)` | `fn_adjust` | owner, admin | ⏳ |
| `reverseMovement(id, reason)` | `fn_reverse_movement` | owner, admin | ⏳ |

## locations (`src/features/locations/actions.ts`) — owner, admin
| Action | Mô tả | Trạng thái |
|---|---|---|
| `saveWarehouse({ id?, code, name, address?, description? })` | Thêm / sửa kho | ✅ |
| `saveZone({ id?, warehouseId, code, name, description? })` | Thêm / sửa khu vực | ✅ |
| `saveRack({ id?, zoneId, code, levels, name?, description? })` | Thêm kệ (tự tạo tầng) / sửa, đổi số tầng | ✅ |
| `setActive({ entity: warehouses\|zones\|racks, id, active })` | Ngừng dùng / dùng lại (chặn khi còn hàng) | ✅ |

Đọc: `getWarehouseTree()` (`queries.ts`).

## catalog (`src/features/catalog/actions.ts`)
| Action | Quyền | Trạng thái |
|---|---|---|
| `saveLookup(table, { id?, ... })` — brands, materials, countries, units, suppliers | owner, admin | ✅ |
| `saveCategory({ id?, code, name, parentId?, sortOrder, specSchema[] })` | owner, admin | ✅ |
| `deleteCatalogItem({ table, id })` — chỉ khi chưa dùng | owner | ✅ |

Đọc: `getCatalog()` (`queries.ts`).

## products (`src/features/products/actions.ts`)
| Action | Quyền | Trạng thái |
|---|---|---|
| `saveProduct({ id?, sku, name, categoryId, unitId, …, specs, images[] })` → `{ id }` | owner, admin | ✅ |
| `setProductActive({ id, active })` — ngừng / kinh doanh lại | owner, admin | ✅ |
| `discardUploadedImages(publicIds[])` — dọn ảnh tải lên rồi huỷ | owner, admin | ✅ |

Đọc: `searchProducts(filters)`, `getProduct(id)`, `getProductFormOptions()` (`queries.ts`).

## Route Handlers (`src/app/**/route.ts`)
| Route | Mô tả | Trạng thái |
|---|---|---|
| `GET /auth/callback?code&next` | Đổi code trong link email thành phiên đăng nhập | ✅ |
| `POST /api/upload/signature` | Ký upload ảnh mặt hàng lên Cloudinary (owner/admin; chỉ thư mục `…/mat-hang`, định dạng jpg/png/webp) | ✅ |
