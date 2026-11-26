# 00 — Tổng quan nghiệp vụ

## Mục tiêu
Biết chính xác **mặt hàng gì – thông số gì – bao nhiêu – ở đâu** theo thời gian thực, và giúp nhân viên lấy hàng đúng chỗ, đúng số lượng.

## Người dùng
| Role | Mô tả |
|---|---|
| `owner` – Ông chủ | Toàn quyền, kể cả quản lý admin và cấu hình hệ thống |
| `admin` – Quản trị | Quản lý hàng hoá, kệ, kiểm kê, tạo tài khoản nhân viên |
| `staff` – Nhân viên | Tìm hàng, lấy hàng, nhập hàng, xem lịch sử của mình |

Tài khoản **chỉ do owner/admin tạo**. Không có trang đăng ký công khai.

## Thuật ngữ
| Từ trong công ty | Tiếng Anh / ý nghĩa |
|---|---|
| Ống | Tube / Pipe (đơn vị: cây 6m, mét) |
| Co nối, tê, nối thẳng, nối giảm | Fitting: elbow, tee, union, reducer |
| **Hạt bắp** | Ferrule (hạt trước / hạt sau) |
| **Con tán** | Nut |
| Van bi, van kim, van một chiều | Ball valve, needle valve, check valve |
| Đầu nối nhanh | Quick coupling |
| Ron / gioăng | Seal / gasket / O-ring |
| Inox 304 / 316 / 316L | Stainless steel; 316L = carbon thấp, chống ăn mòn mối hàn tốt hơn |
| NPT / BSPP / BSPT / JIC / ORFS | Tiêu chuẩn ren / kiểu kết nối |
| OD | Đường kính ngoài ống (Outer Diameter) |

Thương hiệu thường gặp: Swagelok, Hy-Lok, Parker, DK-Lok, SMC, Festo… (thêm được trong hệ thống).

## Vị trí trong kho
```
Kho → Khu vực → Kệ → Tầng
K1  →   A     → 03 →  2      ⇒ mã vị trí: K1-A-03-T2
```
Một mặt hàng có thể nằm ở nhiều vị trí; tồn kho = tổng các vị trí.

## Luồng chính
1. **Tìm hàng**: gõ tên / mã / cỡ (gõ không dấu được) → thấy thẻ hàng + vị trí + số lượng.
2. **Lấy hàng**: chọn vị trí → nhập số lượng (nút − / +) → xác nhận → kho trừ ngay → thông báo: *"Bạn đã lấy 5 cái tại K1-A-03-T2. Còn lại 25."*
3. **Nhập hàng**: phiếu nhập nhiều dòng, ngày mặc định hôm nay, chọn vị trí cất.
4. **Chuyển kho**: K1 ↔ K2, hoặc giữa các kệ.
5. **Kiểm kê**: nhập số đếm thực tế → hệ thống ghi chênh lệch + lý do (admin/owner).
6. **Sửa sai**: không xoá lịch sử; admin/owner tạo **phiếu đảo**.
7. **Cảnh báo sắp hết**: khi tồn ≤ mức tối thiểu → thông báo admin/owner.
