# HƯỚNG DẪN ĐƯA WEBSITE LÊN MẠNG & TÍCH HỢP VÀO GOOGLE SITES

> **Đơn vị:** Trường THCS Vĩnh Xuân  
> **Tác giả website:** Thầy Nguyễn Thanh Việt – Giáo viên môn Công nghệ

---

## 1. NGUYÊN LÝ KHI ĐƯA WEBSITE LÊN GOOGLE SITES

**Google Sites** không cho phép tải trực tiếp một thư mục gồm hàng trăm tệp (`.html`, `.js`, `.css`, `.pptx`, `.mp4`, `.pdf`, `.docx`) lên máy chủ của Google Sites. Do đó, quy trình chuẩn và hiệu quả nhất gồm **2 bước đơn giản**:
1. **Bước A:** Đưa thư mục website lên một dịch vụ lưu trữ web tĩnh miễn phí (**Netlify Drop** hoặc **GitHub Pages**) để có một đường dẫn `https://...` tốc độ cao.
2. **Bước B:** Mở **Google Sites** của Trường/Giáo viên và **Nhúng nguyên trang (Full-page Embed)** đường dẫn `https://...` đó vào Google Sites. Học sinh chỉ cần vào địa chỉ Google Sites quen thuộc của trường là sử dụng được đầy đủ mọi tính năng!

---

## 2. BƯỚC A: ĐƯA WEBSITE LÊN MẠNG MIỄN PHÍ (CHỌN 1 TRONG 2 CÁCH)

### Cách A1: Nhanh nhất bằng Netlify Drop (Kéo – Thả trong 1 phút, khuyên dùng cho giao diện + slide + quiz + HSG + AI)
> *Lưu ý:* Nếu kéo thả lên Netlify, thư mục `technology-world` rất nhẹ (~25 MB bao gồm toàn bộ 36 bài Quiz, toàn bộ ảnh Slide của 48 bài PowerPoint, 10 chuyên đề HSG đọc trực tiếp, logo trường, ảnh tác giả và Trợ lý AI).

1. Truy cập **https://app.netlify.com** và đăng ký/đăng nhập miễn phí bằng tài khoản Google hoặc Email.
2. Ở menu bên trái, chọn **Sites** (hoặc **Projects**).
3. Kéo thư mục **`technology-world`** từ máy tính thả vào khung **"Drag and drop your site output folder here"**.
4. Đợi khoảng 20–30 giây để Netlify tải lên. Sau khi hoàn tất, Netlify cấp cho Thầy một đường dẫn dạng:
   `https://ten-ngau-nhien.netlify.app`
5. Nhấn **Site configuration** -> **Change site name** -> đổi thành tên dễ nhớ, ví dụ:
   `https://thegioicongnghe-thcsvinhxuan.netlify.app`

### Cách A2: Đưa toàn bộ học liệu (cả Video & PDF) lên GitHub Pages (Miễn phí, lâu dài)
1. Đăng ký tài khoản tại **https://github.com** và cài phần mềm **GitHub Desktop** (https://desktop.github.com).
2. Tạo một Repository mới tên `the-gioi-cong-nghe` (chế độ **Public**).
3. Sao chép các tệp trong `WED HỌC TẬP` vào thư mục Repository (nếu có video `.mp4` lớn hơn 100 MB, có thể để video trên Google Drive hoặc nén dưới 100 MB trước khi đẩy lên).
4. Trong GitHub Desktop: nhấn **Commit to main** -> **Push origin**.
5. Trên trang web GitHub của Repository: vào **Settings** -> **Pages** -> mục *Branch* chọn `main` / `/ (root)` -> nhấn **Save**.
6. Sau 1–2 phút, website hoạt động tại địa chỉ:
   `https://<ten-tai-khoan>.github.io/the-gioi-cong-nghe/technology-world/`

---

## 3. BƯỚC B: ĐƯA WEBSITE LÊN GOOGLE SITES (CHI TIẾT TỪNG BƯỚC)

Sau khi đã có đường dẫn `https://...` từ Bước A (ví dụ `https://thegioicongnghe-thcsvinhxuan.netlify.app`), Thầy thực hiện trên **Google Sites** như sau:

### Cách 1: Nhúng Toàn Trang (Full-Page Embed) – Đẹp nhất, hiển thị như một website độc lập ngay trong Google Sites
1. Truy cập **https://sites.google.com** bằng tài khoản Google của Thầy.
2. Nhấn **Trang trống (+)** để tạo trang Google Sites mới (hoặc mở trang Google Sites hiện có của Trường THCS Vĩnh Xuân).
3. Ở cột công cụ bên phải, chuyển sang tab **Trang (Pages)**:
   - Đưa chuột vào nút dấu cộng **`+`** ở góc dưới bên phải -> chọn biểu tượng **Nhúng toàn trang (Full page embed)** *(biểu tượng `</>`)* .
   - Đặt tên trang là **Thế Giới Công Nghệ** -> nhấn **Xong (Done)**.
4. Nhấn nút **Thêm nội dung nhúng (Add embed)** ở giữa màn hình -> chọn tab **Bằng URL (By URL)**.
5. Dán đường dẫn website của Thầy (ví dụ: `https://thegioicongnghe-thcsvinhxuan.netlify.app`) vào ô.
6. Chọn **Toàn bộ trang (Whole page)** -> nhấn **Chèn (Insert)**.
7. *(Tùy chọn)* Để giao diện rộng tối đa, Thầy có thể ẩn phần Đầu trang (Header) của Google Sites bằng cách rê chuột lên tiêu đề đầu trang và nhấn biểu tượng **Thùng rác (Xóa tiêu đề)**.
8. Nhấn nút **Công bố (Publish)** màu xanh ở góc phải trên cùng:
   - Đặt địa chỉ web (ví dụ: `sites.google.com/view/congnghe-thcsvinhxuan`).
   - Ở mục *Ai có thể xem trang web của tôi*, chọn **Bất kỳ ai (Public)**.
   - Nhấn **Công bố (Publish)**.

### Cách 2: Nhúng bằng Mã HTML (`<iframe>`) vào một phần của trang Google Sites
Nếu Thầy đã có sẵn một trang chủ Google Sites nhiều mục và muốn đặt khung **Thế Giới Công Nghệ** vào giữa trang:
1. Mở trang Google Sites -> ở cột phải chọn tab **Chèn (Insert)** -> chọn **Nhúng (Embed)**.
2. Chuyển sang tab **Mã nhúng (Embed code)** và dán đoạn mã sau:
   ```html
   <iframe 
     src="https://thegioicongnghe-thcsvinhxuan.netlify.app" 
     style="width: 100%; height: 92vh; border: none; border-radius: 12px;" 
     allow="fullscreen; clipboard-write" 
     allowfullscreen>
   </iframe>
   ```
   *(Thay `src="..."` bằng đường dẫn thực tế của Thầy)*.
3. Nhấn **Tiếp theo (Next)** -> **Chèn (Insert)** -> kéo rộng khung nhúng ra toàn chiều ngang trang -> nhấn **Công bố (Publish)**.

### Cách 3: Gắn thêm danh mục sách PDF / Video từ Google Drive lên Google Sites (Bổ trợ khi dùng Netlify)
Nếu Thầy dùng Netlify Drop (chỉ tải thư mục `technology-world` để siêu nhẹ) và muốn học sinh tải các tệp Video `.mp4` hoặc 17 cuốn PDF nặng từ Google Drive:
1. Tạo 1 thư mục trên Google Drive chứa 17 tệp PDF và các thư mục `CN7`, `CN8` -> Chuột phải vào thư mục chọn **Chia sẻ (Share)** -> đổi thành **Bất kỳ ai có đường liên kết đều có thể xem (Anyone with the link: Viewer)**.
2. Trong Google Sites, vào tab **Chèn (Insert)** -> chọn **Drive** -> chọn thư mục vừa chia sẻ để hiển thị song song hoặc tạo một nút bấm trên Google Sites dẫn thẳng tới thư mục Drive đó.
