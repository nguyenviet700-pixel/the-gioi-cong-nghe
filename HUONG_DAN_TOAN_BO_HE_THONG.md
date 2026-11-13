# CẨM NANG TOÀN BỘ HỆ THỐNG WEBSITE "THẾ GIỚI CÔNG NGHỆ"
## TRƯỜNG THCS VĨNH XUÂN – GIÁO VIÊN: THẦY NGUYỄN THANH VIỆT

---

## I. TỔNG QUAN HỆ THỐNG ĐÃ CẬP NHẬT

1. **Nhận diện Nhà trường & Tác giả:**
   - **Logo trường:** `technology-world/assets/logo-truong.jpg` (hiển thị trên thanh điều hướng mọi trang, thẻ Hero trang chủ, mục Giới thiệu Đơn vị & Tác giả, và chân trang).
   2. **Học liệu Bài học Công nghệ 7 & Công nghệ 8 (36 bài học):**
   - **Công nghệ 7:** 16 bài học (`BÀI 1` đến `BÀI 16`), đã cập nhật bộ câu hỏi mới nhất của Bài 1 (`Bo_cau_hoi_Bai_1_Cong_nghe_7.docx`).
   - **Công nghệ 8:** 20 bài học (`BÀI 1` đến `BÀI 20`).
   - **Slide trực tuyến:** 48 bộ slide PowerPoint đã được trích xuất thành ảnh và văn bản trong `technology-world/slides/` và `data/slides.js` để học sinh xem trực tiếp trên web mà không cần cài Office.
   - **Ngân hàng câu hỏi Quiz (`data/quiz-data.js`):** Cả **36/36 bài học** đều đạt chuẩn **12 câu trắc nghiệm 4 lựa chọn + 4 câu Đúng/Sai (16 ý) + 3 câu Tự luận** (Tổng cộng: **432 câu trắc nghiệm 4 lựa chọn**, **144 câu Đúng/Sai**, **108 câu Tự luận**).
3. **Kho Tài liệu PDF (17 cuốn sách Khối 6, 7, 8, 9 – trang `pages/tai-lieu.html`):**
   - **Khối 6 (3 cuốn):** SGK, SBT, SGV Công nghệ 6.
   - **Khối 7 (3 cuốn):** SGK, SBT, SGV Công nghệ 7.
   - **Khối 8 (3 cuốn):** SGK, SBT, SGV Công nghệ 8.
   - **Khối 9 (8 cuốn):** Định hướng nghề nghiệp (SGK, SGV), Lắp đặt mạng điện trong nhà (SGK, SGV), Trồng cây ăn quả (SGK, SGV), Chế biến thực phẩm (SGK, SGV).
4. **Tài liệu Bồi dưỡng Học sinh giỏi (10 chuyên đề + Công văn định hướng 2026–2027 – trang `pages/tai-lieu-hsg.html` & `pages/hsg.html`):**
   - Đã cập nhật lại toàn bộ nội dung từ 10 tệp `.docx` đã chỉnh sửa ngày `30/10/2026` trong thư mục `TÀI LIỆU HSG CÔNG NGHỆ` sang trang đọc trực tiếp (`data/hsg-content.js`).

---

## II. HƯỚNG DẪN TÍCH HỢP ID GOOGLE SHEETS & BỘ ĐẾM LƯỢT TRUY CẬP

### 1. Hai ID Google Sheets đã cấu hình sẵn trong `apps-script/Code.gs`:
- **Kết quả Lớp 7 (`KẾT QUẢ LỚP 7`):** `1QbWCqtJ5yackeTiwrbltxp4i6kWUAnGYCZZ8z414SwQ`
- **Kết quả Lớp 8 (`KẾT QUẢ LỚP 8`):** `1QdwapQ2LmfZXbpVRDbt-A9W1K1G7O88VpLOBDCRV0hY`

### 2. Các bước kích hoạt (Chỉ làm 1 lần):
1. Truy cập **https://script.google.com** bằng tài khoản Google của Thầy -> nhấn **Dự án mới (New project)**.
2. Mở tệp `technology-world/apps-script/Code.gs`, sao chép toàn bộ mã và dán đè vào khung soạn thảo trên Google Apps Script -> nhấn **Lưu (Ctrl + S)**.
3. Nhấn **Triển khai (Deploy)** -> **Tùy chọn triển khai mới (New deployment)**:
   - Chọn loại: **Ứng dụng web (Web app)**.
   - Thực thi dưới dạng (Execute as): **Tôi (Me)**.
   - Ai có quyền truy cập (Who has access): **Bất kỳ ai (Anyone)**.
4. Nhấn **Triển khai (Deploy)** -> cấp quyền truy cập (*Advanced -> Go to ... (unsafe) -> Allow*).
5. Sao chép địa chỉ **URL ứng dụng web** (`https://script.google.com/macros/s/.../exec`).
6. Mở tệp `technology-world/site-config.js`, dán URL vào `appsScriptUrl`:
   ```javascript
   window.SITE_CONFIG = {
       appsScriptUrl: 'https://script.google.com/macros/s/AKfycbx.../exec',
       sheetIds: {
           grade7: '1QbWCqtJ5yackeTiwrbltxp4i6kWUAnGYCZZ8z414SwQ',
           grade8: '1QdwapQ2LmfZXbpVRDbt-A9W1K1G7O88VpLOBDCRV0hY'
       }
   };
   ```
7. Lưu tệp `site-config.js`. Ngay lập tức cả **Ghi điểm tự động vào Google Sheets** và **Bộ đếm số lượt truy cập ở chân trang** sẽ đồng bộ toàn trường!

---

## III. HƯỚNG DẪN TÍCH HỢP TRỢ LÝ AI

### Cách 1: Dùng ngay trên máy tính của Giáo viên
1. Lấy khóa API miễn phí tại **https://aistudio.google.com/apikey** (bắt đầu bằng `AIzaSy...`).
2. Mở trang **Trợ lý AI** (`pages/ai.html`), cuộn xuống mục **Cài đặt nhanh dành cho Giáo viên**, dán khóa vào và bấm **Lưu khóa**.

### Cách 2: Đưa lên mạng cho học sinh dùng chung (qua Cloudflare Worker)
1. Đăng nhập **https://dash.cloudflare.com** -> **Workers & Pages** -> **Create Worker**.
2. Dán mã trong tệp `technology-world/cloudflare-worker/gemini-proxy.js` vào Worker và nhấn **Deploy**.
3. Vào **Settings** -> **Variables and Secrets** của Worker -> thêm Secret tên `GEMINI_API_KEY` có giá trị là khóa `AIzaSy...`.
4. Dán địa chỉ Worker (`https://...workers.dev`) vào thuộc tính `proxyUrl` trong tệp `technology-world/ai-config.js`.

---

## IV. HƯỚNG DẪN ĐƯA WEBSITE LÊN MẠNG (CLOUDFLARE PAGES / GOOGLE SITES)

1. **Cách nhanh nhất (Cloudflare Pages – khuyến nghị):**
   - Chạy tệp `CAP_NHAT_WEB.bat` ở thư mục gốc `WED HỌC TẬP` để đồng bộ toàn bộ dữ liệu mới nhất.
   - Mở dự án trên **Cloudflare Pages** (`thegioicongnghe-thcsvinhxuan`) → nhấn **New deployment** → kéo thả/chọn thư mục `technology-world` → nhấn **Deploy**.
2. **Nhúng vào Google Sites (nếu cần):**
   - Mở **https://sites.google.com** -> vào tab **Trang (Pages)** -> nhấn dấu **`+`** -> chọn **Nhúng toàn trang (Full page embed)** -> dán đường dẫn `https://...` -> **Chèn (Insert)** -> **Công bố (Publish)**.

---

## V. CÁCH CẬP NHẬT LẠI WEBSITE KHI THẦY CHỈNH SỬA TÀI LIỆU TRONG TƯƠNG LAI

Mỗi khi Thầy sửa tệp Word câu hỏi (`.docx`), sửa chuyên đề HSG (`.docx`), thêm sách PDF hoặc thêm bài PowerPoint mới vào thư mục `WED HỌC TẬP`, Thầy chỉ cần nháy đúp chạy tệp **`CAP_NHAT_WEB.bat`** (hoặc chạy PowerShell bên dưới):

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
$r = (Get-Location).Path
$tools = "$r\technology-world\tools"
& "$tools\dump-docx.ps1" -Root $r -Out "$tools\dump2"
& "$tools\parse-quiz.ps1" -Dump "$tools\dump2" -OutJson "$tools\quiz-parsed.json" -Report "$tools\quiz-report.txt"
& "$tools\build-catalog.ps1" -Root $r -Site "$r\technology-world" -QuizJson "$tools\quiz-parsed.json"
& "$tools\build-content.ps1"
```
Toàn bộ danh mục bài học, câu hỏi trắc nghiệm, slide và chuyên đề HSG trên website sẽ được cập nhật tự động 100%!
