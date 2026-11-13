# HƯỚNG DẪN TÍCH HỢP ID GOOGLE SHEETS & BỘ ĐẾM SỐ LƯỢT TRUY CẬP TRANG WEB

> **Đơn vị:** Trường THCS Vĩnh Xuân  
> **Tác giả website:** Thầy Nguyễn Thanh Việt – Giáo viên môn Công nghệ  
> **Tệp liên quan:** `apps-script/Code.gs`, `site-config.js`, `script.js`, `pages/quiz.html`

---

## PHẦN 1. TỔNG QUAN CƠ CHẾ HOẠT ĐỘNG

Hệ thống sử dụng **1 Google Apps Script duy nhất** (miễn phí 100% theo tài khoản Google của giáo viên) để thực hiện đồng thời **2 nhiệm vụ**:
1. **Ghi kết quả làm bài Quiz tự động vào Google Sheets:**
   - Khi học sinh làm bài thuộc **Công nghệ 7** và bấm **Nộp bài**, kết quả tự động ghi vào tệp **`KẾT QUẢ LỚP 7`** (ID: `1QbWCqtJ5yackeTiwrbltxp4i6kWUAnGYCZZ8z414SwQ`).
   - Khi học sinh làm bài thuộc **Công nghệ 8** và bấm **Nộp bài**, kết quả tự động ghi vào tệp **`KẾT QUẢ LỚP 8`** (ID: `1QdwapQ2LmfZXbpVRDbt-A9W1K1G7O88VpLOBDCRV0hY`).
   - Các cột được tạo tự động trong trang tính **`KetQua`**:
     `Thời gian | Họ và tên | Lớp | Khối | Bài luyện tập | Trắc nghiệm đúng | Tổng câu trắc nghiệm | Đúng/Sai: ý đúng | Đúng/Sai: tổng ý | Tỉ lệ đúng (%) | Điểm thưởng`
2. **Bộ đếm số lượt truy cập trang web (ở chân trang mọi trang):**
   - Hiển thị 3 chỉ số thực tế:
     - **Lượt truy cập:** Tổng số phiên truy cập vào website.
     - **Hôm nay:** Số lượt truy cập tính riêng trong ngày hiện tại (theo múi giờ Việt Nam `Asia/Ho_Chi_Minh`).
     - **Người truy cập:** Số thiết bị/trình duyệt duy nhất đã vào học.
   - *Lưu ý:* Khi chưa dán `appsScriptUrl`, website vẫn tự động đếm và hiển thị bộ đếm cục bộ trên trình duyệt để giao diện luôn hoạt động mượt mà. Sau khi dán `appsScriptUrl`, bộ đếm sẽ đồng bộ số liệu chung của toàn trường.

---

## PHẦN 2. CÁCH LẤY HOẶC ĐỔI ID GOOGLE SHEETS

Hai ID bảng tính hiện tại của Thầy đã được điền sẵn trong `apps-script/Code.gs` (dòng 9–12):

```javascript
var SHEET_IDS = {
  '7': '1QbWCqtJ5yackeTiwrbltxp4i6kWUAnGYCZZ8z414SwQ',  // KẾT QUẢ LỚP 7
  '8': '1QdwapQ2LmfZXbpVRDbt-A9W1K1G7O88VpLOBDCRV0hY'   // KẾT QUẢ LỚP 8
};
```

**Nếu sau này Thầy tạo bảng tính mới cho năm học tiếp theo và muốn lấy ID:**
1. Mở tệp Google Sheets trên trình duyệt.
2. Quan sát thanh địa chỉ (URL) có dạng:
   `https://docs.google.com/spreadsheets/d/1QbWCqtJ5yackeTiwrbltxp4i6kWUAnGYCZZ8z414SwQ/edit#gid=0`
3. Chuỗi ký tự nằm giữa `/d/` và `/edit` chính là **ID Google Sheet**.
4. Thay chuỗi ID mới vào `SHEET_IDS['7']` hoặc `SHEET_IDS['8']` trong `apps-script/Code.gs`.

---

## PHẦN 3. CÁC BƯỚC TRIỂN KHAI GOOGLE APPS SCRIPT (CHỈ LÀM 1 LẦN – 3 PHÚT)

### Bước 1: Tạo dự án Apps Script
1. Đăng nhập đúng tài khoản Google sở hữu 2 tệp **`KẾT QUẢ LỚP 7`** và **`KẾT QUẢ LỚP 8`**.
2. Truy cập địa chỉ: **https://script.google.com**
3. Nhấn nút **Dự án mới (New project)** ở góc trái trên cùng.
4. Đặt tên dự án (ví dụ: `MayChu_TheGioiCongNghe_THCSVinhXuan`).

### Bước 2: Dán mã nguồn `Code.gs`
1. Mở tệp `technology-world/apps-script/Code.gs` trên máy tính bằng Notepad (hoặc VS Code).
2. Nhấn `Ctrl + A` -> `Ctrl + C` để sao chép toàn bộ mã.
3. Quay lại trang Google Apps Script, xóa đoạn `function myFunction() {}` mặc định trong khung soạn thảo `Mã.gs` (`Code.gs`), rồi nhấn `Ctrl + V` để dán mã vừa chép vào.
4. Nhấn biểu tượng **Đĩa mềm (Lưu dự án / Save)** hoặc `Ctrl + S`.

### Bước 3: Triển khai thành Ứng dụng Web (Web App)
1. Ở góc phải trên cùng của Google Apps Script, nhấn nút màu xanh **Triển khai (Deploy)** -> chọn **Tùy chọn triển khai mới (New deployment)**.
2. Nhấn biểu tượng **Bánh răng ⚙️** cạnh dòng *Chọn loại (Select type)* -> tích chọn **Ứng dụng web (Web app)**.
3. Điền 3 thông tin quan trọng sau:
   - **Mô tả (Description):** `Ghi điểm Quiz và đếm lượt truy cập`
   - **Thực thi dưới dạng (Execute as):** Chọn **Tôi (Me)** *(bắt buộc để Script có quyền ghi vào Google Sheet của Thầy mà học sinh không cần đăng nhập)*.
   - **Ai có quyền truy cập (Who has access):** Chọn **Bất kỳ ai (Anyone)** *(bắt buộc để mọi học sinh làm bài trên điện thoại/máy tính đều gửi được điểm)*.
4. Nhấn nút **Triển khai (Deploy)**.

### Bước 4: Cấp quyền truy cập (Ủy quyền lần đầu)
1. Nhấn **Ủy quyền truy cập (Authorize access)** -> Chọn tài khoản Google của Thầy.
2. Khi Google hiện cảnh báo *"Google hasn't verified this app" (Google chưa xác minh ứng dụng này)*:
   - Nhấn vào dòng chữ nhỏ **Nâng cao (Advanced)** ở góc dưới bên trái.
   - Nhấn tiếp **Đi tới ... (không an toàn) / Go to ... (unsafe)**.
   - Nhấn **Cho phép (Allow)**.
3. Sau khi cấp quyền xong, màn hình hiện ra địa chỉ **URL ứng dụng web (Web app URL)** có dạng:
   ```text
   https://script.google.com/macros/s/AKfycbx.../exec
   ```
4. Nhấn **Sao chép (Copy)** địa chỉ `/exec` này.

### Bước 5: Dán URL vào tệp `site-config.js`
1. Mở tệp `technology-world/site-config.js` bằng Notepad.
2. Dán địa chỉ vừa sao chép vào giữa cặp dấu nháy đơn của `appsScriptUrl`:
   ```javascript
   window.SITE_CONFIG = {
       appsScriptUrl: 'https://script.google.com/macros/s/AKfycbx.../exec',
       sheetIds: {
           grade7: '1QbWCqtJ5yackeTiwrbltxp4i6kWUAnGYCZZ8z414SwQ',
           grade8: '1QdwapQ2LmfZXbpVRDbt-A9W1K1G7O88VpLOBDCRV0hY'
       }
   };
   ```
3. Lưu tệp `site-config.js` (`Ctrl + S`).

---

## PHẦN 4. KIỂM TRA HOẠT ĐỘNG

1. **Kiểm tra bộ đếm lượt truy cập:**
   - Mở `technology-world/index.html` trên trình duyệt, cuộn xuống chân trang.
   - Dòng `Lượt truy cập: ... | Hôm nay: ... | Người truy cập: ...` sẽ tự động tăng và hiển thị số thực tế.
2. **Kiểm tra ghi điểm Google Sheets:**
   - Mở trang **Chơi & Quiz** (`pages/quiz.html`), nhập thử Họ tên, Lớp (ví dụ `7A1`), chọn 1 bài Công nghệ 7, làm bài và nhấn **Nộp bài**.
   - Dưới phần điểm sẽ hiện thông báo màu xanh: `✓ Đã lưu kết quả vào bảng tính Kết quả lớp 7.`
   - Mở tệp Google Sheet **`KẾT QUẢ LỚP 7`**, Thầy sẽ thấy trang tính `KetQua` xuất hiện dòng điểm vừa nộp kèm ngày giờ chính xác.

> **Lưu ý khi chỉnh sửa `Code.gs`:** Nếu sau này Thầy sửa mã trong Google Apps Script, hãy vào **Triển khai (Deploy)** -> **Quản lý nội dung triển khai (Manage deployments)** -> nhấn biểu tượng **Bút chì ✏️ (Chỉnh sửa)** -> ở mục *Phiên bản (Version)* chọn **Phiên bản mới (New version)** -> nhấn **Triển khai (Deploy)**. Khi đó địa chỉ `/exec` giữ nguyên không đổi.
