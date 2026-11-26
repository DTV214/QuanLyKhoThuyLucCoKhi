# 07 — Lộ trình (cập nhật 27/11/2026)

✅ xong · 🔜 đang tới · ⏳ sau

| # | Giai đoạn | Nội dung | Trạng thái |
|---|---|---|---|
| 0 | Nền móng | Next.js, shadcn, schema DB, RLS, tài liệu | ✅ |
| 1 | Auth & người dùng | Đăng nhập, quên/đổi mật khẩu, tạo & khoá tài khoản, phân quyền | ✅ |
| 2 | Kho & Kệ, Danh mục | Sơ đồ kho, kệ, tầng; loại hàng + thông số riêng; hãng, vật liệu… | ✅ |
| **2.5** | **Responsive toàn bộ** | Rà lại mọi trang đã làm trên điện thoại / máy tính bảng (xem mục R) | 🔜 làm trước GĐ 3 |
| 3 | Mặt hàng | Thêm/sửa mặt hàng, thông số động theo loại, ảnh Cloudinary, **kích thước & khối lượng** (chuẩn bị cho AI) | ⏳ |
| 4 | Tìm kiếm | Ô tìm không dấu, lọc chip, Ctrl+K | ⏳ |
| 5 | Nhập / lấy / chuyển / kiểm kê | Hộp xác nhận lấy hàng, phiếu nhập nhiều dòng | ⏳ |
| 6 | Realtime & thông báo | Cập nhật tức thì, chuông thông báo, sắp hết hàng | ⏳ |
| 7 | Dashboard & báo cáo | Biểu đồ, lịch sử, xuất Excel | ⏳ |
| **8** | **Trợ lý AI** | Hộp chat hỏi đáp (xem mục AI) | ⏳ sau khi GĐ 3–7 xong |
| 9 | (Tuỳ chọn) QR | In nhãn QR cho kệ, quét để mở vị trí | ⏳ |

Mỗi giai đoạn từ nay **phải đạt chuẩn responsive (mục R) trước khi coi là xong**.

---

## R. Chuẩn responsive (áp dụng mọi trang)

Kiểm tra ở 3 khổ: **điện thoại 375px**, **máy tính bảng 768px**, **máy tính ≥ 1280px**.

| Hạng mục | Yêu cầu |
|---|---|
| Không cuộn ngang | Không có thanh cuộn ngang ở 375px (trừ bên trong bảng dữ liệu có khung riêng) |
| Bảng dữ liệu | < 768px chuyển sang **dạng thẻ** (như trang Người dùng); hoặc khung cuộn ngang có cột đầu cố định |
| Nút bấm | Vùng chạm ≥ 44×44px; nút chính có thể dàn hết chiều ngang trên điện thoại |
| Hộp thoại | Trên điện thoại mở gần toàn màn hình, nút Lưu/Huỷ luôn nhìn thấy (không bị bàn phím che) |
| Menu | Điện thoại: thanh dưới cùng; mục thứ 5–6 (Báo cáo, Người dùng) vào nút **"Thêm"** — hiện đang bị ẩn, phải sửa |
| Thanh lọc / tab | Cuộn ngang được bằng tay hoặc tự xuống dòng, không bị cắt chữ |
| Chữ | Không nhỏ hơn 14px ở bất kỳ khổ nào; tiêu đề tự xuống dòng |
| Ô nhập số | `inputMode="numeric"` / `decimal` để bật bàn phím số trên điện thoại |

**Việc cụ thể của GĐ 2.5** (rà các trang đã làm):
1. Menu dưới điện thoại: thêm nút **Thêm** chứa Báo cáo, Người dùng, Tài khoản, Đăng xuất.
2. Header điện thoại: logo + tên rút gọn, nút đăng xuất gọn (chỉ icon có nhãn).
3. `/danh-muc`: bảng → thẻ trên điện thoại; hàng tab cuộn ngang.
4. `/kho`: nút "Thêm khu vực / Sửa kho / Ngừng dùng" xếp gọn; lưới kệ 2 cột; hộp chi tiết kệ vừa màn hình.
5. `/nguoi-dung`: nút lọc cuộn ngang ở 375px.
6. Hộp thoại (`FormDialog`, `ConfirmDialog`): toàn màn hình trên điện thoại, nút lưu dính đáy.
7. Chụp màn hình 3 khổ cho từng trang, lưu vào `docs/screenshots/` làm mốc so sánh.

---

## AI. Trợ lý AI (Giai đoạn 8)

### Mục tiêu (phần nhẹ, không phải trọng tâm)
Một **nút tròn "Hỏi trợ lý"** ở góc phải dưới mọi trang → mở khung chat. Ưu tiên theo thứ tự:

1. **Hướng dẫn dùng web** (chính): "Làm sao lấy hàng?", "Thêm kệ mới thế nào?", "Quên mật khẩu làm sao?". Kiến thức lấy từ `docs/06-HUONG-DAN-SU-DUNG.md`.
2. **Tra cứu dữ liệu thật trong kho** (chỉ đọc, theo quyền người hỏi): "Van bi 1/2 inch Parker còn bao nhiêu, ở kệ nào?", "Kệ K1-A-03 đang chứa gì?".
3. **Lời khuyên sắp xếp kho**: cảnh báo khi hàng **nặng / dài / cồng kềnh bất thường** so với kệ — vd ống inox 6m không nên đặt ở kệ 1,2m; hàng nặng nên để tầng thấp; tầng trên cùng chỉ để hàng nhẹ.
4. **Kiến thức cơ khí cơ bản** (phụ): hạt bắp là gì, 316 khác 316L thế nào, NPT khác BSPP, van bi chịu áp tầm bao nhiêu… — chỉ mức phổ thông.

### Bắt buộc: lưu ý độ chính xác
Dưới **mọi câu trả lời** có nhắc đến thông số / kiến thức kỹ thuật, hiện dòng cố định (không phụ thuộc AI có nhớ viết hay không):

> ⚠️ *Thông tin kỹ thuật do AI viết, có thể sai. Trước khi dùng cho lắp đặt, báo giá hoặc tư vấn khách, hãy kiểm tra catalogue của hãng hoặc tìm thêm trên Google.*

Ngoài ra:
- Câu trả lời phân biệt rõ **"Theo dữ liệu kho:"** (số liệu thật từ database) và **"Kiến thức chung (AI):"** (cần kiểm chứng).
- Thông số an toàn (áp suất, nhiệt độ) AI **không tự khẳng định** cho một mã hàng cụ thể nếu database không có — phải nói "chưa có trong dữ liệu, xem catalogue hãng".
- AI **không được** thêm/sửa/xoá/trừ kho. Chỉ đọc. Mọi thao tác vẫn qua giao diện có hộp xác nhận.
- Nút 👍/👎 dưới mỗi câu trả lời; 👎 ghi lại để quản trị xem câu nào AI trả lời sai.

### Dữ liệu cần chuẩn bị từ GĐ 2–3 (để AI khuyên được)
| Ở đâu | Trường mới | Dùng cho |
|---|---|---|
| `racks` | chiều dài, sâu, cao mỗi tầng (cm); tải trọng tối đa mỗi tầng (kg) | so sánh với hàng |
| `products` | dài × rộng × cao (cm), khối lượng 1 đơn vị (kg) | cảnh báo hàng quá dài/nặng |
| `products.specs` | áp suất, nhiệt độ… theo loại (đã có từ GĐ 2) | AI đọc thông số thật thay vì đoán |

→ Thêm vào migration của **GĐ 3**; form kệ thêm ô kích thước & tải trọng (không bắt buộc).
→ Khi cất hàng (GĐ 5) có thể hiện cảnh báo nhẹ ngay trên giao diện (không cần AI): "Hàng dài 600cm, tầng chỉ sâu 120cm".

### Kỹ thuật đề xuất
| Hạng mục | Lựa chọn |
|---|---|
| Mô hình | Claude API (`@anthropic-ai/sdk`), mặc định **`claude-opus-5-5`** với `output_config.effort: "low"` cho chat (nhanh, tiết kiệm). Có thể đổi sang model rẻ hơn nếu chủ muốn giảm chi phí — đó là quyết định của chủ |
| Cách chạy | **Route Handler** `POST /api/tro-ly` trong Next.js (Node.js), trả lời dạng **streaming** (chữ hiện dần). Dùng **Tool Runner** của SDK với các tool chỉ-đọc chạy trên server **bằng phiên đăng nhập của người hỏi** (RLS áp dụng, nhân viên không xem được thứ ngoài quyền) |
| Tools (chỉ đọc) | `search_products(query, filters)` → `fn_search_products`; `get_product(id)`; `get_rack(code)` → tầng, kích thước, tải trọng, hàng đang chứa; `check_fit(productId, locationId)` → so kích thước/khối lượng với tầng kệ |
| Kiến thức hướng dẫn | Nội dung `docs/06-HUONG-DAN-SU-DUNG.md` + bảng thuật ngữ `docs/00-TONG-QUAN.md` đặt trong system prompt, **bật prompt caching** (phần này không đổi → rẻ ~90% từ câu thứ 2) |
| An toàn | `ANTHROPIC_API_KEY` chỉ ở server; giới hạn số câu hỏi / người / ngày; xử lý `stop_reason: "refusal"` (kèm fallback); không gửi email/SĐT nhân viên vào AI |
| Lưu trữ | Bảng `ai_conversations`, `ai_feedback` (👍/👎) — RLS: mỗi người xem chat của mình, quản lý xem phản hồi |
| Giao diện | Nút nổi góc phải dưới (trên điện thoại nằm trên thanh menu), khung chat toàn màn hình trên điện thoại; gợi ý sẵn 3–4 câu hỏi mẫu; dòng lưu ý cố định ở chân khung chat |

### Phương án khác (để chủ chọn khi tới GĐ 8)
- **Managed Agents** của Anthropic (Anthropic chạy vòng lặp agent): ít code hơn nhưng thêm phí theo thời gian phiên và lưu lịch sử phía Anthropic; tools vẫn phải chạy ở server mình để giữ phân quyền. Với hộp hỏi đáp ngắn như này, cách tự chạy trong Next.js ở trên đơn giản và rẻ hơn.

### Ước lượng chi phí (để chủ cân nhắc)
Mỗi câu hỏi ≈ vài nghìn token vào (phần lớn được cache) + vài trăm token ra. Sẽ đo thực tế bằng `response.usage` ở bản thử và báo lại trước khi bật cho toàn công ty.

### Tiêu chí xong
- Trả lời đúng ≥ 90% bộ 30 câu hỏi mẫu về cách dùng web (soạn từ tài liệu hướng dẫn).
- Câu về số lượng/vị trí lấy đúng dữ liệu thật và tôn trọng phân quyền.
- Lưu ý ⚠️ luôn hiện; AI không có bất kỳ tool ghi dữ liệu nào.
- Dùng tốt trên điện thoại.
