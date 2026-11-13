// Cấu hình kết nối Google Apps Script (ghi kết quả bài làm vào Google Sheets & đếm lượt truy cập).
// Xem hướng dẫn chi tiết tại: HUONG_DAN_GOOGLE_SHEETS_VA_DEM_TRUY_CAP.md
window.SITE_CONFIG = {
    // Dán địa chỉ Web App (kết thúc bằng /exec) sau khi triển khai apps-script/Code.gs:
    appsScriptUrl: 'https://script.google.com/macros/s/AKfycbxsg5JL_eNz4vI56tpymN38Y6Sm8Z3nVrb3OK22BSARpoFAK5knXjfbv2wGv0Wu3EYC/exec',

    // ID hai bảng tính Google Sheets nhận kết quả học sinh (đã cấu hình sẵn trong apps-script/Code.gs):
    sheetIds: {
        grade7: '1QbWCqtJ5yackeTiwrbltxp4i6kWUAnGYCZZ8z414SwQ', // KẾT QUẢ LỚP 7
        grade8: '1QdwapQ2LmfZXbpVRDbt-A9W1K1G7O88VpLOBDCRV0hY'  // KẾT QUẢ LỚP 8
    }
};
