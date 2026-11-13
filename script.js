/* 
   TỆP JAVASCRIPT CHÍNH - THẾ GIỚI CÔNG NGHỆ (TRƯỜNG THCS VĨNH XUÂN)
   Tác giả: Thầy Nguyễn Thanh Việt
   Chứa các chức năng tương tác chung, ghi điểm Google Sheets và bộ đếm lượt truy cập.
*/

document.addEventListener('DOMContentLoaded', () => {
    // 1. Chức năng Menu Hamburger (Dành cho điện thoại)
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const dropdowns = document.querySelectorAll('.dropdown');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = hamburger.querySelector('i');
            if (icon) {
                if (navLinks.classList.contains('active')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-xmark');
                } else {
                    icon.classList.remove('fa-xmark');
                    icon.classList.add('fa-bars');
                }
            }
        });
    }

    // Xử lý click vào menu Dropdown trên điện thoại
    dropdowns.forEach(dropdown => {
        dropdown.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                dropdown.classList.toggle('active');
            }
        });
    });

    // 2. Khởi tạo LocalStorage cho Tiến trình học tập & Huy hiệu
    if (!localStorage.getItem('techWorldScore')) {
        localStorage.setItem('techWorldScore', '0');
    }
    if (!localStorage.getItem('techWorldBadges')) {
        localStorage.setItem('techWorldBadges', JSON.stringify([]));
    }

    updateProgressDisplay();
    initVisitorCounter();
});

// Hàm dùng chung: Cập nhật hiển thị điểm
function updateProgressDisplay() {
    const scoreElement = document.getElementById('user-score');
    if (scoreElement) {
        scoreElement.textContent = localStorage.getItem('techWorldScore');
    }
}

// Hàm dùng chung: Thêm điểm
function addScore(points) {
    let currentScore = parseInt(localStorage.getItem('techWorldScore')) || 0;
    currentScore += points;
    localStorage.setItem('techWorldScore', currentScore.toString());
    updateProgressDisplay();
    checkBadges(currentScore);
}

// Hàm dùng chung: Kiểm tra và trao huy hiệu
function checkBadges(score) {
    let badges = JSON.parse(localStorage.getItem('techWorldBadges') || '[]');
    let newBadge = null;

    if (score >= 100 && !badges.includes('Nhà khám phá')) newBadge = 'Nhà khám phá';
    else if (score >= 300 && !badges.includes('Kỹ thuật viên nhí')) newBadge = 'Kỹ thuật viên nhí';
    else if (score >= 500 && !badges.includes('Kỹ sư nhí')) newBadge = 'Kỹ sư nhí';
    else if (score >= 1000 && !badges.includes('Bậc thầy Công nghệ')) newBadge = 'Bậc thầy Công nghệ';

    if (newBadge) {
        badges.push(newBadge);
        localStorage.setItem('techWorldBadges', JSON.stringify(badges));
        showNotification(`🎉 Chúc mừng! Bạn đã nhận được huy hiệu: ${newBadge}`);
    }
}

// Hàm hiển thị thông báo
function showNotification(message) {
    const notif = document.createElement('div');
    notif.className = 'notification';
    notif.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); border-left: 5px solid var(--accent-color); font-weight: bold; position: fixed; bottom: 20px; right: 20px; z-index: 9999; animation: slideIn 0.5s ease;">
            ${message}
        </div>
    `;
    document.body.appendChild(notif);

    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transition = 'opacity 0.5s ease';
        setTimeout(() => notif.remove(), 500);
    }, 4000);
}

const styleAnim = document.createElement('style');
styleAnim.innerHTML = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(styleAnim);

/* ---------------- ĐẾM LƯỢT TRUY CẬP & GHI KẾT QUẢ (Google Apps Script) ---------------- */
function getAppsScriptUrl() {
    return (window.SITE_CONFIG && window.SITE_CONFIG.appsScriptUrl) || localStorage.getItem('techWorldAppsScriptUrl') || '';
}

// Gửi kết quả bài làm lên Google Sheets (lớp 7 / lớp 8). Trả về Promise<boolean>.
function sendResultToSheet(payload) {
    const url = getAppsScriptUrl();
    if (!url) return Promise.resolve(false);
    // text/plain để tránh yêu cầu preflight CORS của Apps Script
    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({ action: 'result' }, payload))
    })
        .then(r => r.json())
        .then(j => !!j.ok)
        .catch(() => false);
}

// Bộ đếm truy cập: hiển thị ở chân trang mọi trang web.
// Nếu đã cấu hình appsScriptUrl -> lấy số liệu toàn hệ thống từ Google Apps Script.
// Nếu chưa cấu hình appsScriptUrl -> tự động đếm và hiển thị trên trình duyệt để trang luôn hoạt động mượt.
function initVisitorCounter() {
    const footer = document.querySelector('footer .footer-content');
    if (!footer || document.getElementById('vc-total')) return;

    const box = document.createElement('p');
    box.className = 'visit-counter';
    box.innerHTML = '<i class="fa-solid fa-chart-simple"></i> Lượt truy cập: <strong id="vc-total">…</strong>' +
        ' &nbsp;|&nbsp; Hôm nay: <strong id="vc-today">…</strong>' +
        ' &nbsp;|&nbsp; Người truy cập: <strong id="vc-unique">…</strong>';
    footer.appendChild(box);

    const fmt = n => Number(n || 0).toLocaleString('vi-VN');
    const todayKey = new Date().toISOString().slice(0, 10);

    let isNew = '0';
    try {
        if (!localStorage.getItem('techWorldVisitor')) {
            localStorage.setItem('techWorldVisitor', String(Date.now()));
            isNew = '1';
        }
    } catch (e) {}

    let counted = false;
    try { counted = sessionStorage.getItem('techWorldCounted') === '1'; } catch (e) {}

    // Cập nhật bộ đếm cục bộ dự phòng
    function updateLocalCounter() {
        try {
            let total = parseInt(localStorage.getItem('tw_vc_total') || '0', 10);
            let unique = parseInt(localStorage.getItem('tw_vc_unique') || '0', 10);
            let savedDay = localStorage.getItem('tw_vc_day') || '';
            let todayCount = parseInt(localStorage.getItem('tw_vc_today') || '0', 10);
            if (savedDay !== todayKey) {
                savedDay = todayKey;
                todayCount = 0;
            }
            if (!counted) {
                total += 1;
                todayCount += 1;
                if (isNew === '1' || unique === 0) unique += 1;
                localStorage.setItem('tw_vc_total', String(total));
                localStorage.setItem('tw_vc_unique', String(unique));
                localStorage.setItem('tw_vc_day', savedDay);
                localStorage.setItem('tw_vc_today', String(todayCount));
                sessionStorage.setItem('techWorldCounted', '1');
            }
            document.getElementById('vc-total').textContent = fmt(Math.max(1, total));
            document.getElementById('vc-today').textContent = fmt(Math.max(1, todayCount));
            document.getElementById('vc-unique').textContent = fmt(Math.max(1, unique));
        } catch (e) {
            document.getElementById('vc-total').textContent = '1';
            document.getElementById('vc-today').textContent = '1';
            document.getElementById('vc-unique').textContent = '1';
        }
    }

    const url = getAppsScriptUrl();
    if (!url) {
        updateLocalCounter();
        box.title = 'Đang hiển thị bộ đếm trên thiết bị. Xem HUONG_DAN_GOOGLE_SHEETS_VA_DEM_TRUY_CAP.md để đồng bộ toàn trường.';
        return;
    }

    const q = counted ? 'action=stats' : 'action=hit&isNew=' + isNew;
    fetch(url + (url.includes('?') ? '&' : '?') + q)
        .then(r => r.json())
        .then(s => {
            if (!s || !s.ok) { updateLocalCounter(); return; }
            try { sessionStorage.setItem('techWorldCounted', '1'); } catch (e) {}
            document.getElementById('vc-total').textContent = fmt(s.total);
            document.getElementById('vc-today').textContent = fmt(s.today);
            document.getElementById('vc-unique').textContent = fmt(s.unique);
        })
        .catch(() => updateLocalCounter());
}
