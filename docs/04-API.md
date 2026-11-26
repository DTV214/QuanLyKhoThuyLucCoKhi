# 04 — Server Actions & API

Mọi action trả `ActionResult<T>` = `{ ok: true, data, message? } | { ok: false, error, fieldErrors? }`.
Cột "Trạng thái": ✅ đã có · ⏳ theo lộ trình.

## auth (`src/features/auth/actions.ts`)
| Action | Quyền | Mô tả | Trạng thái |
|---|---|---|---|
| `signIn({ email, password, next? })` | công khai | Đăng nhập; trả `redirectTo` | ✅ |
| `signOut()` | đã đăng nhập | Đăng xuất | ✅ |
| `requestPasswordReset({ email })` | công khai | Gửi email đặt lại (luôn báo thành công) | ✅ |
| `setNewPassword({ password, confirm })` | đã đăng nhập / link email | Đặt mật khẩu mới, tắt `must_change_password` | ✅ |

## users (`src/features/users/actions.ts`)
| Action | Quyền | Trạng thái |
|---|---|---|
| `createUser({ fullName, email, phone?, role })` → mật khẩu tạm | owner (mọi role), admin (staff) | ⏳ |
| `setUserLocked(id, locked)` (kèm ban trong Supabase Auth) | như trên | ⏳ |
| `changeUserRole(id, role)` | owner | ⏳ |
| `resetUserPassword(id)` → mật khẩu tạm mới | như trên | ⏳ |

## inventory (`src/features/inventory/actions.ts`) — gọi RPC trong `docs/02-DATABASE.md`
| Action | RPC | Quyền | Trạng thái |
|---|---|---|---|
| `takeStock({ productId, locationId, quantity, date?, note? })` | `fn_stock_out` | mọi role | ⏳ |
| `receiveStock({ date, supplierId?, referenceNo?, lines[] })` | `fn_stock_in` × n | mọi role | ⏳ |
| `transferStock(...)` | `fn_transfer` | mọi role | ⏳ |
| `adjustStock(...)` | `fn_adjust` | owner, admin | ⏳ |
| `reverseMovement(id, reason)` | `fn_reverse_movement` | owner, admin | ⏳ |

## products / locations / search
CRUD mặt hàng, kho/khu/kệ, danh mục (owner/admin); tìm kiếm qua `fn_search_products`. ⏳

## Route Handlers (`src/app/**/route.ts`)
| Route | Mô tả | Trạng thái |
|---|---|---|
| `GET /auth/callback?code&next` | Đổi code trong link email thành phiên đăng nhập | ✅ |
| `POST /api/upload/signature` | Ký upload Cloudinary (đã đăng nhập) | ⏳ |
