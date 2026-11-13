/*
   THƯ VIỆN HỌC LIỆU - Thế Giới Công Nghệ (Trường THCS Vĩnh Xuân)
   Dùng dữ liệu trong data/catalog.js (sinh tự động từ file thực tế) và data/quiz-data.js.
   Mọi trang trong thư mục pages/ dùng chung tệp này.
*/

// Thư mục chứa CN7, CN8, PDF, HSG nằm ngang hàng với thư mục website => từ pages/ lùi 2 cấp.
const MEDIA_ROOT = '../../';
// Thư mục gốc của website (chứa slides/, assets/) => từ pages/ lùi 1 cấp.
const MEDIA_SITE = '../';

function isLocalHost() {
    return location.protocol === 'file:' || /^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname);
}

function fileUrl(path) {
    return MEDIA_ROOT + String(path || '').split('/').map(encodeURIComponent).join('/');
}

function drivePreviewUrl(driveId) {
    return 'https://drive.google.com/file/d/' + encodeURIComponent(driveId) + '/preview';
}

function driveViewUrl(driveId) {
    return 'https://drive.google.com/file/d/' + encodeURIComponent(driveId) + '/view';
}

function driveDownloadUrl(driveId) {
    return 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(driveId);
}

function previewUrl(item) {
    if (item && typeof item === 'object') {
        if (!isLocalHost() && item.driveId) return drivePreviewUrl(item.driveId);
        return fileUrl(item.path);
    }
    return fileUrl(item);
}

function openUrl(item) {
    if (item && typeof item === 'object') {
        if (!isLocalHost() && item.driveId) return driveViewUrl(item.driveId);
        return fileUrl(item.path);
    }
    return fileUrl(item);
}

function downloadUrl(item) {
    if (item && typeof item === 'object') {
        if (!isLocalHost() && item.driveId) return driveDownloadUrl(item.driveId);
        return fileUrl(item.path);
    }
    return fileUrl(item);
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function getLesson(id) {
    return (window.CATALOG && CATALOG.lessons.find(l => l.id === id)) || null;
}

function getQuiz(id) {
    return (window.QUIZ_DATA && QUIZ_DATA[id]) || null;
}

// Bài có luyện tập chấm điểm tự động khi đáp án đã lấy từ nguồn
function quizStatus(id) {
    const q = getQuiz(id);
    if (!q) return { mcq: 0, tf: 0, essay: 0, any: false };
    return {
        mcq: q.mcqGradable ? q.mcq.length : 0,
        tf: q.tfGradable ? q.tf.length : 0,
        essay: q.essay.length,
        any: (q.mcqGradable && q.mcq.length > 0) || (q.tfGradable && q.tf.length > 0)
    };
}

// Xem trực tuyến PowerPoint chỉ dùng được khi website được đưa lên máy chủ công khai (http/https, không phải localhost)
function canUseOfficeViewer() {
    return /^https?:$/.test(location.protocol) && !/^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname);
}

function officeViewerUrl(path) {
    const abs = new URL(fileUrl(path), location.href).href;
    return 'https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(abs);
}

// Hiển thị danh sách bài học của một lớp
function renderLessonGrid(containerId, grade) {
    const box = document.getElementById(containerId);
    if (!box) return;
    if (!window.CATALOG) { box.innerHTML = '<p>Không tải được danh mục học liệu (data/catalog.js).</p>'; return; }
    const lessons = CATALOG.lessons.filter(l => l.grade === grade);
    box.innerHTML = lessons.map(l => {
        const qs = quizStatus(l.id);
        const badges = [];
        if (l.ppt.length) badges.push('<span class="badge-res b-ppt"><i class="fa-solid fa-file-powerpoint"></i> PowerPoint' + (l.ppt.length > 1 ? ' ×' + l.ppt.length : '') + '</span>');
        if (l.video.length) badges.push('<span class="badge-res b-video"><i class="fa-solid fa-video"></i> Video</span>');
        if (qs.any) badges.push('<span class="badge-res b-quiz"><i class="fa-solid fa-gamepad"></i> Luyện tập (' + qs.mcq + ' TN + ' + qs.tf + ' Đ/S)</span>');
        else if (l.questionDocs.length) badges.push('<span class="badge-res b-doc"><i class="fa-solid fa-file-word"></i> Bộ câu hỏi</span>');
        return '<div class="card lesson-card">' +
            '<span class="lesson-no">Bài ' + l.no + '</span>' +
            '<h3>' + escapeHtml(l.title) + '</h3>' +
            '<div class="lesson-badges">' + (badges.join('') || '<span class="badge-res b-doc">Chưa có học liệu</span>') + '</div>' +
            '<div class="card-actions mt-auto">' +
            '<a href="bai-hoc.html?id=' + l.id + '" class="btn btn-primary">Vào học</a>' +
            (qs.any ? '<a href="quiz.html?id=' + l.id + '" class="btn btn-outline">Luyện tập</a>' : '') +
            '</div>' +
            '</div>';
    }).join('');
}

// ===== Xem slide trực tiếp (ảnh từng slide được sinh sẵn bởi tools/build-content.ps1) =====
function getDecks(id) {
    return (window.SLIDES && SLIDES[id]) || [];
}

function renderSlideViewer(box, deck) {
    const S = deck.slides;
    let cur = 0;
    let showNotes = false;
    box.innerHTML =
        '<div class="slide-viewer" tabindex="0">' +
        '<div class="slide-stage"></div>' +
        '<div class="slide-bar"><button data-a="prev"><i class="fa-solid fa-chevron-left"></i> Trước</button>' +
        '<span class="slide-count"></span>' +
        '<button data-a="next">Sau <i class="fa-solid fa-chevron-right"></i></button>' +
        '<button data-a="text" title="Hiện/Ẩn nội dung chữ"><i class="fa-solid fa-align-left"></i> Nội dung chữ</button>' +
        '<button data-a="full" title="Toàn màn hình"><i class="fa-solid fa-expand"></i></button></div>' +
        '<div class="slide-thumbs"></div><div class="slide-text"></div></div>';
    const root = box.firstChild, stage = root.querySelector('.slide-stage'), count = root.querySelector('.slide-count'),
        thumbs = root.querySelector('.slide-thumbs'), txt = root.querySelector('.slide-text');
    thumbs.innerHTML = S.map((s, i) => s.img ? '<img loading="lazy" data-i="' + i + '" src="' + MEDIA_SITE + s.img + '" alt="Slide ' + (i + 1) + '">' : '').join('');
    function show(i) {
        cur = Math.max(0, Math.min(S.length - 1, i));
        const s = S[cur];
        stage.innerHTML = s.img ? '<img src="' + MEDIA_SITE + s.img + '" alt="Slide ' + (cur + 1) + '">' :
            '<div class="slide-textonly">' + escapeHtml(s.text || '(Slide không có nội dung chữ)') + '</div>';
        count.textContent = (cur + 1) + ' / ' + S.length;
        txt.textContent = (s.img && showNotes) ? s.text : '';
        thumbs.querySelectorAll('img').forEach(im => im.classList.toggle('on', +im.dataset.i === cur));
        const on = thumbs.querySelector('img.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
    root.addEventListener('click', e => {
        const b = e.target.closest('button'), im = e.target.closest('.slide-thumbs img');
        if (im) return show(+im.dataset.i);
        if (!b) return;
        if (b.dataset.a === 'prev') show(cur - 1);
        else if (b.dataset.a === 'next') show(cur + 1);
        else if (b.dataset.a === 'text') { showNotes = !showNotes; show(cur); }
        else if (b.dataset.a === 'full') (document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen && root.requestFullscreen());
    });
    root.addEventListener('keydown', e => {
        if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); show(cur + 1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); show(cur - 1); }
    });
    show(0);
    root.focus({ preventScroll: true });
}
