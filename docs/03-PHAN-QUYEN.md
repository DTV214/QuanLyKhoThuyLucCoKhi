# 03 — Phân quyền

| Chức năng | Ông chủ `owner` | Quản trị `admin` | Nhân viên `staff` |
|---|:-:|:-:|:-:|
| Xem / tìm hàng, vị trí, tồn kho | ✅ | ✅ | ✅ |
| Lấy hàng (xuất) | ✅ | ✅ | ✅ |
| Nhập hàng | ✅ | ✅ | ✅ |
| Chuyển kho / kệ | ✅ | ✅ | ✅ |
| Thêm/sửa mặt hàng, kho, khu, kệ, danh mục | ✅ | ✅ | ❌ |
| Kiểm kê (sửa số lượng, bắt buộc lý do) | ✅ | ✅ | ❌ |
| Huỷ thao tác sai (phiếu đảo) | ✅ | ✅ | ❌ |
| Xoá cứng dữ liệu danh mục | ✅ | ❌ | ❌ |
| Tạo tài khoản / reset mật khẩu / khoá **staff** | ✅ | ✅ | ❌ |
| Tạo / khoá / hạ quyền **admin** | ✅ | ❌ | ❌ |
| Xem lịch sử | tất cả | tất cả | của mình |
| Xem nhật ký hệ thống | ✅ | ✅ | ❌ |
| Nhận thông báo lấy hàng / sắp hết | ✅ | ✅ | ❌ |

## Thực thi ở đâu
| Lớp | File | Việc |
|---|---|---|
| Route | `src/middleware.ts` | chưa đăng nhập → `/dang-nhap` |
| Trang | `src/server/auth/guard.ts` → `requireRole()` trong `page.tsx` | staff vào `/nguoi-dung` → về trang chủ |
| Server Action | `requireRole()` đầu mỗi action | chặn gọi action trái phép |
| Database | RLS + `fn_require_role()` trong RPC | chặn cuối cùng, kể cả gọi thẳng API |

Hằng số role và nhãn tiếng Việt: `src/lib/roles.ts`.
