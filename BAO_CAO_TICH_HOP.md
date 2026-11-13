# BÁO CÁO CẬP NHẬT & TÍCH HỢP TOÀN BỘ WEBSITE "THẾ GIỚI CÔNG NGHỆ"

- **Đơn vị:** Trường THCS Vĩnh Xuân
- **Tác giả website:** Thầy Nguyễn Thanh Việt – Giáo viên môn Công nghệ
- **Thời điểm cập nhật:** 30/10/2026

---

## 1. Nhận diện Trường học & Tác giả
- **Logo trường (`logo vĩnh xuân.JPG` -> `technology-world/assets/logo-truong.jpg`):** Đã tích hợp trên Thanh điều hướng (Navbar) của toàn bộ 11 trang, khung Hero trang chủ, mục Giới thiệu Đơn vị & Tác giả, và Chân trang (Footer).

## 2. Kết quả tích hợp học liệu từ các tài liệu đã chỉnh sửa
- **Công nghệ 7 (`CN7\BÀI 1`..`BÀI 16`):** 16 bài học, đã chuyển toàn bộ bộ câu hỏi sang định dạng chuẩn `.docx`. Tất cả 16/16 bài đều có đủ **12 câu trắc nghiệm 4 lựa chọn + 4 câu Đúng/Sai + 3 câu Tự luận** chấm điểm tự động.
- **Công nghệ 8 (`CN8\BÀI 1`..`BÀI 20`):** 20 bài học, đã chuyển toàn bộ bộ câu hỏi sang định dạng chuẩn `.docx`. Tất cả 20/20 bài đều có đủ **12 câu trắc nghiệm 4 lựa chọn + 4 câu Đúng/Sai + 3 câu Tự luận** chấm điểm tự động.
- **Bài giảng PowerPoint (`data/slides.js` & `slides/`):** 48 tệp `.pptx` của 36 bài học đã được kết xuất thành ảnh từng slide và văn bản đi kèm để xem trực tiếp trên trang bài học (`pages/bai-hoc.html`).
- **Tài liệu Bồi dưỡng HSG (`TÀI LIỆU HSG CÔNG NGHỆ` -> `data/hsg-content.js`):** Toàn bộ 10 chuyên đề `.docx` (kèm Công văn định hướng thi HSG THCS cấp tỉnh 2026–2027) được chuyển đổi sang HTML sạch để đọc trực tiếp tại `pages/hsg.html` và tải về tại `pages/tai-lieu-hsg.html`.
- **Kho Tài liệu PDF Khối 6, 7, 8, 9 (`pages/tai-lieu.html`):** Đã tích hợp đầy đủ **17 cuốn sách PDF** (SGK, SBT, SGV của Công nghệ 6, 7, 8 và 4 phân môn Công nghệ 9) kèm bộ lọc theo từng khối lớp và khung đọc PDF trực tiếp.

## 3. Tích hợp Google Sheets, Trợ lý AI, Bộ đếm truy cập & Hướng dẫn Google Sites
- **Ghi điểm Google Sheets (`apps-script/Code.gs`, `site-config.js`, `pages/quiz.html`):**
  - ID Lớp 7 (`KẾT QUẢ LỚP 7`): `1QbWCqtJ5yackeTiwrbltxp4i6kWUAnGYCZZ8z414SwQ`
  - ID Lớp 8 (`KẾT QUẢ LỚP 8`): `1QdwapQ2LmfZXbpVRDbt-A9W1K1G7O88VpLOBDCRV0hY`
- **Trợ lý Kỹ sư AI (`ai-config.js`, `ai.js`, `pages/ai.html`, `cloudflare-worker/gemini-proxy.js`):**
  - Cấu hình mô hình **`gemini-3.1-pro-preview`** (kèm cơ chế đa tầng dự phòng với `gemini-3-flash-preview`, `gemini-2.5-flash` và Trí tuệ Học liệu Nội bộ), tự động nạp nội dung bài học/chuyên đề HSG đang chọn và hỗ trợ nút **"Xuất file Word (.doc)"**.
- **Bộ đếm số lượt truy cập (`script.js` & `apps-script/Code.gs`):**
  - Hiển thị tại chân trang của mọi trang web (`Lượt truy cập | Hôm nay | Người truy cập`), có chế độ đếm cục bộ dự phòng khi chưa điền `appsScriptUrl` và đồng bộ toàn trường ngay khi cấu hình `appsScriptUrl`.
- **Bộ tài liệu hướng dẫn chi tiết (Markdown & Word `.doc`):**
  1. `technology-world/HUONG_DAN_GOOGLE_SHEETS_VA_DEM_TRUY_CAP.md`
  2. `technology-world/HUONG_DAN_TICH_HOP_AI.md`
  3. `technology-world/HUONG_DAN_DUA_WEB_LEN_GOOGLE_SITES.md`
  4. `technology-world/HUONG_DAN_TOAN_BO_HE_THONG.md`
  5. `HUONG_DAN_SU_DUNG_VA_TICH_HOP_WEB.doc` & `technology-world/Huong_dan_Website_The_Gioi_Cong_Nghe.doc`
