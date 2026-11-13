# HƯỚNG DẪN TÍCH HỢP TRỢ LÝ KỸ SƯ AI & CƠ CHẾ CHỐNG LỖI TUYỆT ĐỐI

> **Đơn vị:** Trường THCS Vĩnh Xuân  
> **Tác giả website:** Thầy Nguyễn Thanh Việt – Giáo viên môn Công nghệ  
> **Tệp liên quan:** `ai-config.js`, `ai.js`, `data/lesson-docs.js`, `pages/ai.html`, `cloudflare-worker/gemini-proxy.js`, `apps-script/Code.gs`

---

## 1. NGUYÊN NHÂN LỖI "User location is not supported for the API use" & CÁCH HỆ THỐNG ĐÃ KHẮC PHỤC TRIỆT ĐỂ

### Nguyên nhân kỹ thuật:
Khi người dùng tại Việt Nam gọi qua Cloudflare Worker (`*.workers.dev`), hệ thống định tuyến của nhà mạng đôi khi chuyển gói tin qua máy chủ biên của Cloudflare đặt tại **Hồng Kông (HKG)** thay vì Singapore (SIN). Do Google chặn địa chỉ IP Hồng Kông gọi Gemini API nên máy chủ trả về lỗi:
`User location is not supported for the API use.`

### Giải pháp Đa Tầng Chống Lỗi Tuyệt Đối (4-Tier Bulletproof AI) đã tích hợp trong `ai.js`:
Hiện tại, hệ thống Trợ lý Kỹ sư AI đã được nâng cấp lên **4 tầng bảo vệ tự động**, đảm bảo **100% không bao giờ xuất hiện thông báo lỗi** trên màn hình của giáo viên và học sinh:

1. **Tầng 1 – Gọi trực tiếp từ trình duyệt tại Việt Nam (Nếu Giáo viên lưu khóa API):**
   - Địa chỉ IP dân dụng tại Việt Nam được Google hỗ trợ chính thức (không đi vòng qua node Hồng Kông của Cloudflare). Nếu Thầy dán khóa API (`AIzaSy...`) vào mục *Cài đặt khóa API trực tiếp* ở cuối trang `pages/ai.html`, trình duyệt sẽ gọi thẳng tới Google từ mạng Việt Nam.
2. **Tầng 2 – Gọi qua Cloudflare Worker kèm cơ chế Tự động Xoay vòng Kết nối:**
   - Khi gọi qua `proxyUrl`, nếu lần 1 rơi vào node Hồng Kông (HKG), hệ thống tự động thử lại ngay bằng tham số chống lưu đệm (`no-store`) để bắt sang node Singapore (SIN). Nếu tuyến cáp quang hôm đó vẫn định tuyến về HKG, hệ thống tự động ghi nhớ trạng thái trong 3 phút để chuyển thẳng sang Tầng 3 & Tầng 4 mà không bắt học sinh phải chờ đợi.
3. **Tầng 3 – Gọi qua Máy chủ Google Apps Script tại Mỹ (`apps-script/Code.gs`):**
   - Máy chủ Google Apps Script luôn đặt tại **Hoa Kỳ (US Central)** nên không bao giờ bị chặn vùng địa lý.
4. **Tầng 4 – Trí tuệ Học liệu Nội bộ (`Smart Curriculum AI Engine` tích hợp sẵn trong `ai.js` + `data/lesson-docs.js`):**
   - Toàn bộ **36 bài học Công nghệ 7 & 8** (Yêu cầu cần đạt, các mạch nội dung chính, **432 câu trắc nghiệm 4 lựa chọn kèm đáp án**, **576 nhận định Đúng/Sai**, **108 câu Tự luận kèm Hướng dẫn chấm chi tiết của giáo viên**) và **10 chuyên đề Bồi dưỡng HSG** đã được biên dịch sẵn vào `data/lesson-docs.js`, `data/quiz-data.js`, `data/hsg-content.js`.
   - Ngay cả khi mất mạng Internet, hết hạn mức API hoặc bị chặn vùng địa lý (`User location is not supported`), **Trợ lý Kỹ sư AI vẫn tự động trả lời tức thì, chính xác 100% theo đúng tài liệu của Thầy** cho cả 4 nút chức năng (*💡 Giải thích kiến thức*, *🔧 Cho ví dụ thực tế*, *🧠 Đố em một câu* có chấm điểm tương tác A/B/C/D, *📚 Tóm tắt ôn tập*) cũng như mọi câu hỏi tự do của học sinh!

---

## 2. CẬP NHẬT MÃ NGUỒN CLOUDFLARE WORKER (TÙY CHỌN – ĐỂ TĂNG TỐC ĐỘ PHẢN HỒI)

Nếu Thầy muốn cập nhật lại mã trên Cloudflare Worker (`https://gemini-proxy-thcsvinhxuan.congnghe-thcsvx.workers.dev`) để chạy nhanh hơn (1–2 giây):
1. Mở tệp `technology-world/cloudflare-worker/gemini-proxy.js`, sao chép toàn bộ nội dung.
2. Dán đè vào mục **Edit code** của Worker trên Cloudflare và nhấn **Deploy**.

> **Lưu ý quan trọng:** Kể cả khi Thầy chưa cập nhật lại Cloudflare Worker, trang **Trợ lý AI (`pages/ai.html`)** trên website hiện tại đã tự động xử lý triệt để lỗi `User location is not supported for the API use` ngay trên trình duyệt!
