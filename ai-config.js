// Cấu hình Trợ lý Kỹ sư AI cho website Thế Giới Công Nghệ - Trường THCS Vĩnh Xuân.
// Xem hướng dẫn chi tiết tại: HUONG_DAN_TICH_HOP_AI.md
window.AI_CONFIG = {
    // Địa chỉ Cloudflare Worker trung gian giữ bí mật khóa API khi đưa web lên mạng:
    proxyUrl: 'https://gemini-proxy-thcsvinhxuan.congnghe-thcsvx.workers.dev',

    // Mô hình Gemini sử dụng (mặc định dùng Gemini 3.1 Pro):
    model: 'gemini-3.1-pro-preview'
};
