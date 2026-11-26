# 06 — Hướng dẫn sử dụng

Tài liệu cho người dùng trong công ty. Phần A làm **một lần** khi cài đặt; các phần sau là thao tác hằng ngày.

---

## A. Cài đặt lần đầu (người phụ trách kỹ thuật)

### A1. Điền file `.env.local`
Mở file `.env.local` ở thư mục dự án, kiểm tra từng dòng:

| Dòng | Lấy ở đâu | Ví dụ đúng |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → Data API | `https://rerpkesfmjffkyfuftjb.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API Keys → **Publishable key** | `sb_publishable_…` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API Keys → **Secret key** (bấm con mắt để hiện) | `sb_secret_…` |
| `SUPABASE_PROJECT_ID` | Supabase → Project Settings → General | `rerpkesfmjffkyfuftjb` |
| `DATABASE_URL` | Supabase → nút **Connect** → Session pooler → URI, thay `[YOUR-PASSWORD]` | `postgresql://postgres.rerpk…:MatKhau@aws-0-ap-south-1.pooler.supabase.com:5432/postgres` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary → tên môi trường ở góc trên bên trái (chữ thường) | `dratbz8bh` |
| `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary → Settings → API Keys | |
| `OWNER_EMAIL` | **Email thật** của ông chủ (dùng để đăng nhập và nhận link quên mật khẩu) | `chu@thanhdanh.vn` |
| `OWNER_PASSWORD` | Mật khẩu ông chủ: **≥ 8 ký tự, có cả chữ và số** | `ThanhDanh2026` |
| `OWNER_FULL_NAME` | Họ tên ông chủ | `Võ Minh Cương` |

> Mật khẩu database có ký tự đặc biệt thì phải viết mã: `@` → `%40`, `#` → `%23`, `/` → `%2F`, `:` → `%3A`.

### A2. Tạo bảng và dữ liệu mẫu
```powershell
npm run db:migrate
```
Chạy lại bất cứ lúc nào có file migration mới (lệnh tự bỏ qua file đã chạy). Thành công khi dòng cuối có `Xong: { kho: '2', ... }`.

### A3. Tắt đăng ký tự do (bắt buộc)
Supabase → **Authentication → Sign In / Providers → Email** → tắt **"Allow new users to sign up"** → Save.
Nếu không tắt, người ngoài có thể tự tạo tài khoản qua API (dù không vào được dữ liệu kho).

### A4. Cấu hình link email
Supabase → **Authentication → URL Configuration**:
- **Site URL**: `http://localhost:3000` (khi đưa lên mạng thì đổi thành địa chỉ thật)
- **Redirect URLs**: thêm `http://localhost:3000/auth/callback`

### A5. Tạo tài khoản ông chủ
```powershell
npm run seed:owner
```
Xong thì **xoá dòng `OWNER_PASSWORD`** trong `.env.local`.

### A6. Chạy web
```powershell
npm run dev
```
Mở trình duyệt: http://localhost:3000

---

## B. Đăng nhập

1. Mở trang web → hiện màn hình **Đăng nhập**.
2. Gõ **Email** và **Mật khẩu** được cấp → bấm nút xanh **Đăng nhập**.
   - Muốn xem lại mật khẩu đã gõ: bấm **Hiện** ở cuối ô mật khẩu.
3. **Lần đầu đăng nhập** (tài khoản do quản lý tạo): hệ thống bắt đổi mật khẩu.
   Gõ mật khẩu mới 2 lần (≥ 8 ký tự, có chữ và số) → **Đổi mật khẩu và bắt đầu**.
4. Báo lỗi **"Email hoặc mật khẩu không đúng"** → kiểm tra lại, chú ý chữ hoa/thường.
   Sai nhiều lần liên tiếp sẽ bị tạm khoá vài phút.
5. Báo **"Tài khoản đã bị khoá"** → liên hệ ông chủ hoặc quản trị.

### Quên mật khẩu
1. Ở màn hình đăng nhập bấm **Quên mật khẩu?**
2. Gõ email → **Gửi link đặt lại mật khẩu**.
3. Mở hộp thư, bấm link trong email (link có hạn, nên làm ngay).
4. Gõ mật khẩu mới 2 lần → **Lưu mật khẩu mới**.

Hoặc nhờ quản trị bấm **Đặt lại mật khẩu** cho bạn (xem mục D).

### Tự đổi mật khẩu
Bấm vào **tên của bạn** (góc trên bên phải) → trang **Tài khoản của tôi** → nhập mật khẩu hiện tại và mật khẩu mới → **Đổi mật khẩu**.

### Đăng xuất
Máy tính: bấm **Đăng xuất** ở góc trên bên phải. Điện thoại: nút **Thêm** ở menu dưới → **Đăng xuất**. Dùng máy chung thì luôn đăng xuất khi xong việc.

---

## C. Màn hình chính

| Menu | Ai thấy | Dùng để |
|---|---|---|
| **Tìm hàng** | tất cả | tìm hàng, xem vị trí & thông số; quản lý thêm/sửa mặt hàng (lấy hàng: giai đoạn 5) |
| **Nhập hàng** | tất cả | nhập hàng vào kho *(giai đoạn 5)* |
| **Lịch sử** | tất cả | xem ai lấy/nhập gì *(giai đoạn 7)* |
| **Kho & Kệ** | tất cả | xem sơ đồ kho; quản lý sửa kho/khu/kệ |
| **Báo cáo** | ông chủ, quản trị | *(giai đoạn 7)* |
| **Người dùng** | ông chủ, quản trị | tạo và quản lý tài khoản |

Trên điện thoại và máy tính bảng, menu nằm ở **dưới cùng màn hình**: 4 mục chính và nút **Thêm** (☰) — bấm vào để thấy Báo cáo, Người dùng, **Tài khoản của tôi** và **Đăng xuất**.

---

## D. Quản lý người dùng (ông chủ, quản trị)

Menu **Người dùng**.

### Thêm tài khoản
1. Bấm **Thêm tài khoản**.
2. Điền **Họ và tên**, **Email** (bắt buộc), **Số điện thoại** (không bắt buộc).
3. Chọn quyền: **Nhân viên** hoặc **Quản trị** (chỉ ông chủ thấy ô Quản trị).
4. Bấm **Tạo tài khoản** → màn hình hiện **mật khẩu tạm** (vd `TDkmqp4827`).
5. Bấm **Sao chép thông tin đăng nhập** rồi gửi Zalo/tin nhắn cho nhân viên, hoặc đọc trực tiếp.
   **Mật khẩu tạm chỉ hiện 1 lần.** Quên chép thì dùng **Đặt lại mật khẩu**.

### Các thao tác khác — nút **Thao tác** ở mỗi dòng
| Nút | Tác dụng |
|---|---|
| **Sửa thông tin** | đổi họ tên, số điện thoại (email không đổi được) |
| **Đặt lại mật khẩu** | tạo mật khẩu tạm mới, người dùng phải đổi khi đăng nhập |
| **Đổi quyền** *(chỉ ông chủ)* | chuyển giữa Nhân viên ↔ Quản trị |
| **Khoá tài khoản** | người đó bị đăng xuất và không vào được nữa (dùng khi nghỉ việc). Lịch sử vẫn giữ |
| **Mở khoá tài khoản** | cho dùng lại |

Ô tìm kiếm phía trên gõ không dấu được (vd `pham thi`). Nút lọc: **Tất cả / Đang hoạt động / Đã khoá**.
Trạng thái **"Chờ đổi mật khẩu"** = người đó chưa đăng nhập lần đầu.

---

## E. Kho & Kệ

Menu **Kho & Kệ**.

### Xem sơ đồ (mọi người)
1. Bấm chọn **Kho 1 – Trong nhà** hoặc **Kho 2 – Kho lớn** ở trên cùng.
2. Mỗi khung là một **khu vực** (vd `K1-A Khu A – Fitting & hạt bắp`), bên trong là các **kệ**.
3. Mỗi ô kệ ghi mã kệ (vd **K1-A-01**), số tầng, và số mặt hàng đang nằm trên kệ (ô xanh) hoặc **Trống**.
4. Bấm vào một kệ → hiện các tầng **xếp như kệ thật (tầng cao nhất ở trên)**, kèm **mã vị trí** từng tầng, vd **K1-A-01-T2**.

> **Mã vị trí** = Kho – Khu – Kệ – Tầng. Nên in mã này dán lên từng tầng kệ, để khi phần mềm báo "lấy tại K1-A-01-T2" là đi đúng chỗ.

### Sửa sơ đồ (ông chủ, quản trị)
| Việc | Cách làm |
|---|---|
| Thêm khu vực | chọn kho → **Thêm khu vực** → nhập **Mã khu** (vd `D`) và tên |
| Thêm kệ | trong khung khu vực → **Thêm kệ** → nhập **Mã kệ** (vd `04`) và **Số tầng** → các tầng tự được tạo |
| Thêm/bớt tầng | bấm vào kệ → **Sửa kệ / số tầng** → đổi số tầng. Bớt tầng chỉ được khi tầng bị bỏ đang trống |
| Đổi mã | sửa mã kho/khu/kệ → mọi mã vị trí tự đổi theo (nhớ in lại nhãn) |
| Ngừng dùng | **Ngừng dùng** ở kho/khu/kệ → ẩn khỏi danh sách. Chỉ làm được khi không còn hàng ở đó. Tick **Hiện cả mục ngừng dùng** để xem lại và bấm **Dùng lại** |
| Thêm kho mới | **Thêm kho** cạnh nút chọn kho |

Mã chỉ gồm chữ không dấu và số, tối đa 6 ký tự, tự viết hoa.

---

## E2. Tìm hàng & xem mặt hàng (mọi người)

Menu **Tìm hàng**.
1. Gõ vào ô tìm: tên, mã, cỡ, hãng, vật liệu hoặc **mã kệ**. Gõ **không dấu** cũng được; ký hiệu Φ gõ là `phi` (vd `van phi8`). Kết quả hiện ngay khi ngừng gõ.
2. Bấm nút **Bộ lọc** (biểu tượng thanh trượt) để lọc thêm: Kho, Loại hàng, Thương hiệu, Vật liệu, Xuất xứ, **Môi chất** (axit, kiềm, dầu…), **Chịu được nhiệt độ** (vd 250 → chỉ hiện hàng chịu được 250 °C), **Cỡ đầu nối** (vd Φ8), **Chỉ hàng còn trong kho**, **Sắp hết hàng**. Bấm **Bỏ hết bộ lọc** để xoá.
3. Mỗi thẻ hàng cho biết: số còn (xanh = đủ, cam = sắp hết, đỏ = hết) và **mã vị trí** đang chứa (vd `K1-A-01-T2 (8)`).
4. Bấm vào thẻ → trang mặt hàng: ảnh, tồn kho từng vị trí (Kho › Khu › Kệ › Tầng), bảng thông số, mô tả.

> Có thể gửi đường link trang tìm kiếm cho đồng nghiệp — bộ lọc đi theo link.

## E3. Thêm / sửa mặt hàng (ông chủ, quản trị)

**Tìm hàng → Thêm mặt hàng**, hoặc trong trang mặt hàng bấm **Sửa mặt hàng**. Form có 5 phần; **chỉ phần 1 là bắt buộc**:

| Phần | Nội dung | Ví dụ (van một chiều Φ8) |
|---|---|---|
| 1. Thông tin chính | Tên, loại hàng, đơn vị, mã nội bộ (bấm **Gợi ý mã tự động**), mã hãng, thương hiệu, xuất xứ, vật liệu, tiêu chuẩn | Van một chiều nối nhanh Φ8–Φ8 · Van · Cái · Nhựa PTFE · Tiêu chuẩn Đức |
| 2. Thông số kỹ thuật | Đầu nối 1 & 2, áp suất tối đa, **nhiệt độ làm việc** (thấp nhất – cao nhất), **môi chất** (bấm chọn nhiều), thông số riêng theo loại hàng | Φ8 / Φ8 · -190 đến 280 °C · Axit, Kiềm, Hoá chất ăn mòn · Cỡ lục giác 19 |
| 3. Kích thước & khối lượng | Dài × rộng × cao (mm), nặng (gam) của **1 đơn vị** | 78 × 24 mm |
| 4. Hình ảnh | **Chọn ảnh từ máy** hoặc **Chụp ảnh** (điện thoại). Tối đa 8 ảnh, ảnh viền xanh là ảnh chính; **Đặt chính**, ← → để đổi thứ tự, 🗑 để bỏ | Ảnh sản phẩm, ảnh phiếu thông số |
| 5. Mô tả & quản lý | Mô tả chi tiết, **tồn tối thiểu** (để báo sắp hết), ghi chú nội bộ | Tồn tối thiểu 5 |

Bấm **Lưu mặt hàng** (thanh dưới cùng). Bấm **Huỷ** sẽ bỏ cả ảnh vừa tải.

> **Xuất xứ** = nước sản xuất. **Tiêu chuẩn** = chuẩn chất lượng in trên hàng (vd hàng sản xuất ở Trung Quốc nhưng ghi "Tiêu chuẩn Đức"). Nên điền riêng hai ô này.

**Ngừng kinh doanh**: trong trang mặt hàng → nút **Ngừng kinh doanh** (ẩn khỏi tìm kiếm, giữ lịch sử). Không có nút xoá mặt hàng.

### Kích thước kệ
Kho & Kệ → bấm kệ → **Sửa kệ / số tầng** → điền chiều ngang, sâu, cao và **tải trọng tối đa** mỗi tầng. Dùng để sau này cảnh báo khi cất hàng quá dài / quá nặng.

## F. Danh mục hàng hoá (ông chủ, quản trị)

Menu **Kho & Kệ** → nút **Danh mục hàng hoá** (góc trên bên phải).

Các thẻ: **Loại hàng · Thương hiệu · Vật liệu · Xuất xứ · Đơn vị tính · Nhà cung cấp**. Đã có sẵn dữ liệu mẫu (Swagelok, Hy-Lok, Parker…, Inox 304/316/316L…, Mỹ, Hàn Quốc, Nhật…).

- **Thêm**: chọn thẻ → nút **Thêm …** góc phải.
- **Sửa**: nút **Sửa** cuối mỗi dòng.
- **Xoá** *(chỉ ông chủ)*: chỉ hiện khi cột *Sử dụng* ghi **Chưa dùng**. Mục đã có mặt hàng dùng thì không xoá được.

### Loại hàng và thông số riêng
Mỗi loại hàng có **thông số kỹ thuật riêng** — khi thêm mặt hàng thuộc loại đó, form sẽ hiện đúng các ô này.
Ví dụ loại **Van** có: Loại van (chọn), Kiểu kết nối, Áp suất tối đa (bar), Nhiệt độ (°C)…

Sửa loại hàng → phần **Thông số kỹ thuật riêng**:
1. **Thêm thông số** → gõ tên (vd `Áp suất tối đa`).
2. Chọn kiểu: **Chữ**, **Số**, hoặc **Chọn từ danh sách**.
3. Ô **Đơn vị** (vd `bar`, `mm`) — không bắt buộc.
4. Kiểu *Chọn từ danh sách*: gõ các lựa chọn cách nhau bằng dấu phẩy, vd `Van bi, Van kim, Van một chiều`.
5. **Lên / Xuống** để đổi thứ tự, **Bỏ** để xoá thông số → **Lưu**.

**Đơn vị tính**: chọn *Cho nhập số lẻ* với đơn vị như **mét** (lấy 2,5 m ống); *Chỉ số nguyên* với **cái, bộ, cây**.
