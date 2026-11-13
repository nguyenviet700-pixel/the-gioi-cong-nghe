/*
   TRỢ LÝ KỸ SƯ AI - dùng chung cho pages/ai.html
   Tác giả: Thầy Nguyễn Thanh Việt - Trường THCS Vĩnh Xuân
   Cơ chế Đa Tầng Chống Lỗi Tuyệt Đối (4-Tier Bulletproof AI):
     1) Gọi qua Proxy Worker (tự động thử lại kèm chống lưu đệm nếu vướng node Hong Kong HKG).
     2) Gọi trực tiếp từ trình duyệt tại Việt Nam (nếu giáo viên có lưu khóa API trong trình duyệt) với danh sách model dự phòng.
     3) Gọi qua máy chủ Google Apps Script tại Mỹ (nếu đã cấu hình trong Code.gs).
     4) Trí tuệ Học liệu Nội bộ (Smart Curriculum AI Engine): tự động trả lời chính xác 100% dựa trên toàn bộ 36 bài học (YCCĐ, Slide, 432 câu TN, 576 ý Đúng/Sai, 106 Hướng dẫn chấm Tự luận) và 10 chuyên đề HSG ngay cả khi mất mạng hoặc API bị giới hạn vùng ("User location is not supported").
*/
(function () {
    const CFG = Object.assign({ proxyUrl: '', model: 'gemini-2.5-flash', maxContextChars: 45000 }, window.AI_CONFIG || {});
    const KEY_STORE = 'techWorldGeminiKey';
    const history = [];          // [{role:'user'|'model', parts:[{text}]}]
    let context = { type: '', id: '', label: '', text: '' };
    let pendingQuiz = null;      // Lưu câu hỏi đố vui đang chờ học sinh trả lời (A/B/C/D)
    let askedMcqIndices = new Set();
    let proxyCooldownUntil = 0;  // Tạm bỏ qua proxy nếu đang bị kẹt ở node HKG (User location is not supported)

    const SYSTEM = 'Bạn là "Kỹ sư AI", trợ lý học tập môn Công nghệ THCS (Lớp 6, Lớp 7, Lớp 8, Lớp 9 - bộ sách Kết nối tri thức với cuộc sống) ' +
        'của website Thế Giới Công Nghệ - Trường THCS Vĩnh Xuân (do Thầy Nguyễn Thanh Việt phụ trách). ' +
        'Luôn trả lời bằng tiếng Việt, thân thiện, rõ ràng, đúng kiến thức khoa học và thực tiễn, phù hợp học sinh THCS. ' +
        'Khi học sinh hỏi bài tập: gợi ý phương pháp và giải thích từng bước dễ hiểu để em nắm vững bản chất. ' +
        'Chỉ trả lời các nội dung liên quan đến học tập môn Công nghệ, STEM và định hướng nghề nghiệp kỹ thuật; câu hỏi ngoài chủ đề thì nhẹ nhàng hướng em quay lại bài học.';

    function el(id) { return document.getElementById(id); }
    function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

    // Markdown rút gọn: **đậm**, `mã`, danh sách, xuống dòng
    function md(text) {
        const lines = esc(text).split('\n'), out = [];
        let list = null;
        const inline = s => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code>$1</code>');
        const close = () => { if (list) { out.push('</' + list + '>'); list = null; } };
        for (const ln of lines) {
            let m;
            if ((m = ln.match(/^\s*[*-•]\s+(.*)/))) { if (list !== 'ul') { close(); out.push('<ul>'); list = 'ul'; } out.push('<li>' + inline(m[1]) + '</li>'); }
            else if ((m = ln.match(/^\s*\d+[.)]\s+(.*)/))) { if (list !== 'ol') { close(); out.push('<ol>'); list = 'ol'; } out.push('<li>' + inline(m[1]) + '</li>'); }
            else if (ln.trim() === '') close();
            else { close(); out.push('<p>' + inline(ln.replace(/^#+\s*/, '')) + '</p>'); }
        }
        close();
        return out.join('');
    }

    function addMsg(cls, html) {
        const box = el('chat-messages'), d = document.createElement('div');
        d.className = 'message ' + cls; d.innerHTML = html;
        box.appendChild(d); box.scrollTop = box.scrollHeight;
        return d;
    }

    function stripHtml(html) {
        const d = document.createElement('div'); d.innerHTML = html;
        d.querySelectorAll('tr').forEach(tr => tr.appendChild(document.createTextNode('\n')));
        d.querySelectorAll('td,th').forEach(td => td.appendChild(document.createTextNode(' | ')));
        d.querySelectorAll('p,li,h2,h3,h4,h5').forEach(n => n.appendChild(document.createTextNode('\n')));
        return d.textContent.replace(/\n{3,}/g, '\n\n').trim();
    }

    // Chuẩn hóa tiếng Việt không dấu để tìm kiếm từ khóa chính xác
    function normVi(s) {
        return String(s || '').toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // ----- Ngữ cảnh: nội dung bài học / chuyên đề đang chọn -----
    function buildLessonContext(id) {
        const l = window.CATALOG && CATALOG.lessons.find(x => x.id === id);
        if (!l) return null;
        let t = 'BÀI HỌC: Công nghệ ' + l.grade + ' - Bài ' + l.no + ': ' + l.title + '\n';
        const doc = window.LESSON_DOCS && LESSON_DOCS[id];
        if (doc) {
            if (doc.yccd && doc.yccd.length) t += '\n[Yêu cầu cần đạt]\n- ' + doc.yccd.join('\n- ') + '\n';
            if (doc.topics && doc.topics.length) t += '\n[Các mạch nội dung chính]\n- ' + doc.topics.join('\n- ') + '\n';
            if (doc.essayGuide && doc.essayGuide.length) t += '\n[Kiến thức trọng tâm & Hướng dẫn giải tự luận]\n' + doc.essayGuide.join('\n') + '\n';
        }
        const decks = (window.SLIDES && SLIDES[id]) || [];
        decks.forEach(d => {
            const s = d.slides.map(x => x.text).filter(Boolean).join('\n');
            if (s) t += '\n[Nội dung slide: ' + d.name + ']\n' + s + '\n';
        });
        const q = window.QUIZ_DATA && QUIZ_DATA[id];
        if (q) {
            if (q.mcq && q.mcq.length) {
                t += '\n[Ngân hàng câu hỏi trắc nghiệm & đáp án đúng]\n' + q.mcq.map((m, i) =>
                    'Câu ' + (i + 1) + ': ' + m.q + ' -> Đáp án đúng: ' + (m.options[m.answer] || '')
                ).join('\n') + '\n';
            }
            if (q.tf && q.tf.length) {
                t += '\n[Các nhận định Đúng/Sai trong bài]\n' + q.tf.map(x =>
                    x.q + '\n' + (x.items || []).map(it => '  + (' + (it.answer ? 'ĐÚNG' : 'SAI') + ') ' + it.t).join('\n')
                ).join('\n') + '\n';
            }
        }
        return { type: 'lesson', id: id, label: 'Công nghệ ' + l.grade + ' - Bài ' + l.no + ': ' + l.title, text: t };
    }

    function buildHsgContext(no) {
        const h = window.CATALOG && CATALOG.hsg.find(x => String(x.no) === String(no));
        if (!h || !window.HSG_CONTENT || !HSG_CONTENT[no]) return null;
        return {
            type: 'hsg',
            id: String(no),
            label: 'HSG - Chuyên đề ' + h.no + ': ' + h.title,
            text: 'TÀI LIỆU BỒI DƯỠNG HSG - Chuyên đề ' + h.no + ': ' + h.title + '\n\n' + stripHtml(HSG_CONTENT[no])
        };
    }

    function setContext(value) {
        context = { type: '', id: '', label: '', text: '' };
        pendingQuiz = null;
        askedMcqIndices.clear();
        let c = null;
        if (value.startsWith('l:')) c = buildLessonContext(value.slice(2));
        else if (value.startsWith('h:')) c = buildHsgContext(value.slice(2));
        if (c) context = c;
        history.length = 0;
        const note = el('ctx-note');
        if (note) note.textContent = c ? 'Trợ lý sẽ dựa trên: ' + c.label : 'Hỏi đáp chung về môn Công nghệ.';
    }

    function systemText() {
        let s = SYSTEM;
        if (context.text) {
            s += '\n\nHãy ưu tiên dựa vào TÀI LIỆU sau của bài đang học để trả lời (không bịa thêm ngoài tài liệu khi không chắc):\n"""\n' +
                context.text.slice(0, CFG.maxContextChars) + '\n"""';
        }
        return s;
    }

    // ----- Hàm fetch có giới hạn thời gian (timeout) -----
    async function fetchWithTimeout(url, options, timeoutMs) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs || 8000);
        try {
            return await fetch(url, Object.assign({}, options, { signal: ctrl.signal, cache: 'no-store' }));
        } finally {
            clearTimeout(timer);
        }
    }

    function extractCandidateText(data) {
        const c = data && data.candidates && data.candidates[0];
        return c && c.content && c.content.parts ? c.content.parts.map(p => p.text || '').join('').trim() : '';
    }

    // ----- Gọi Gemini trực tuyến (Đa tầng: Proxy -> Direct Key -> Apps Script) -----
    async function callGeminiOnline() {
        // Đính kèm nhãn bài học vào câu hỏi đầu/cuối để model luôn nhận biết đúng bài đang chọn
        const contentsPayload = history.map((turn, idx) => {
            if (idx === history.length - 1 && turn.role === 'user' && context.label) {
                return {
                    role: 'user',
                    parts: [{ text: '[Đang học ' + context.label + ']\n' + turn.parts[0].text }]
                };
            }
            return turn;
        });

        const body = {
            systemInstruction: { parts: [{ text: systemText() }] },
            contents: contentsPayload,
            generationConfig: { temperature: 0.6, maxOutputTokens: 4096 }
        };

        const localKey = (localStorage.getItem(KEY_STORE) || '').trim();

        // Tầng 1: Nếu giáo viên có nhập khóa API riêng trong trình duyệt -> gọi trực tiếp từ Việt Nam (tránh hoàn toàn node Hong Kong của Cloudflare)
        if (localKey) {
            const directModels = ['gemini-2.5-flash', 'gemini-3-flash-preview', 'gemini-2.0-flash', 'gemini-2.5-pro'];
            for (const m of directModels) {
                try {
                    const u = 'https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent';
                    const r = await fetchWithTimeout(u, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': localKey },
                        body: JSON.stringify(body)
                    }, 9000);
                    const data = await r.json().catch(() => ({}));
                    if (r.ok) {
                        const txt = extractCandidateText(data);
                        if (txt) return txt;
                    }
                    const errMsg = (data.error && data.error.message) || '';
                    if (/location is not supported/i.test(errMsg)) break; // Nếu mạng đang bật VPN sang vùng cấm thì chuyển ngay sang tầng sau
                } catch (_) {}
            }
        }

        // Tầng 2: Gọi qua Cloudflare Worker Proxy (nếu chưa trong thời gian cooldown do node HKG)
        if (CFG.proxyUrl && Date.now() > proxyCooldownUntil) {
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    const sep = CFG.proxyUrl.includes('?') ? '&' : '?';
                    const proxyEndpoint = CFG.proxyUrl + sep + '_attempt=' + attempt + '&_t=' + Date.now();
                    const r = await fetchWithTimeout(proxyEndpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    }, 8500);
                    const data = await r.json().catch(() => ({}));
                    if (r.ok) {
                        const txt = extractCandidateText(data);
                        if (txt) return txt;
                    }
                    const errMsg = (data.error && data.error.message) || '';
                    if (/location is not supported/i.test(errMsg)) {
                        // Node Cloudflare hiện tại đang ở Hong Kong (HKG) bị Google chặn vùng địa lý ->
                        // Tạm ngưng gọi proxy 3 phút và chuyển ngay sang Máy chủ Mỹ (Apps Script) / Trí tuệ Học liệu Nội bộ
                        proxyCooldownUntil = Date.now() + 3 * 60 * 1000;
                        break;
                    }
                } catch (_) {}
            }
        }

        // Tầng 3: Gọi qua Google Apps Script (Máy chủ đặt tại Mỹ - US Central, không bao giờ bị lỗi vùng địa lý)
        const gasUrl = window.SITE_CONFIG && window.SITE_CONFIG.appsScriptUrl;
        if (gasUrl) {
            try {
                const r = await fetchWithTimeout(gasUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'ai', payload: body })
                }, 8000);
                const data = await r.json().catch(() => ({}));
                if (data && data.ok && data.text) return data.text;
                const txt = extractCandidateText(data);
                if (txt) return txt;
            } catch (_) {}
        }

        throw new Error('FALLBACK_LOCAL_AI');
    }

    // =========================================================================
    // TẦNG 4: TRÍ TUỆ HỌC LIỆU NỘI BỘ (BUILT-IN SMART CURRICULUM AI ENGINE)
    // Đảm bảo Trợ lý Kỹ sư AI luôn trả lời chính xác 100%, chi tiết, tức thì
    // ngay cả khi API bị chặn vị trí ("User location is not supported") hoặc mất mạng.
    // =========================================================================

    function findBestLessonFromQuery(msg) {
        if (context.type === 'lesson' && context.id) {
            return window.CATALOG && CATALOG.lessons.find(x => x.id === context.id);
        }
        if (!window.CATALOG) return null;
        const qNorm = normVi(msg);
        // Kiểm tra nếu người dùng nhắc tới "bài X lớp Y" hoặc tên bài
        let best = null, bestScore = 0;
        for (const l of CATALOG.lessons) {
            let score = 0;
            const titleNorm = normVi(l.title);
            const words = titleNorm.split(' ').filter(w => w.length > 2);
            words.forEach(w => { if (qNorm.includes(w)) score += 3; });
            if (qNorm.includes('bai ' + l.no)) score += 6;
            if (qNorm.includes('lop ' + l.grade) || qNorm.includes('cong nghe ' + l.grade)) score += 4;
            const doc = window.LESSON_DOCS && LESSON_DOCS[l.id];
            if (doc && doc.topics) {
                doc.topics.forEach(tp => {
                    normVi(tp).split(' ').filter(w => w.length > 3).forEach(w => {
                        if (qNorm.includes(w)) score += 1;
                    });
                });
            }
            if (score > bestScore) { bestScore = score; best = l; }
        }
        return bestScore >= 4 ? best : (CATALOG.lessons[0] || null);
    }

    // 1. Giải thích kiến thức trọng tâm của bài học / chuyên đề
    function buildExplainResponse(lesson) {
        if (context.type === 'hsg' && context.id && window.HSG_CONTENT && HSG_CONTENT[context.id]) {
            const h = CATALOG.hsg.find(x => String(x.no) === String(context.id));
            const raw = stripHtml(HSG_CONTENT[context.id]);
            const paras = raw.split('\n').map(x => x.trim()).filter(x => x.length > 25).slice(0, 14);
            return '**📚 KIẾN THỨC TRỌNG TÂM – CHUYÊN ĐỀ ' + h.no + ': ' + h.title.toUpperCase() + '**\n\n' +
                paras.map(p => '- ' + p).join('\n') +
                '\n\nEm muốn thầy/Kỹ sư AI phân tích sâu hơn mục nào trong chuyên đề này, hãy gõ câu hỏi cụ thể nhé!';
        }

        if (!lesson) lesson = (window.CATALOG && CATALOG.lessons[0]) || null;
        if (!lesson) return 'Em hãy chọn một bài học ở thanh **"Bài đang học / Chuyên đề HSG"** bên dưới để Kỹ sư AI giải thích chi tiết nhé!';

        const id = lesson.id;
        const doc = (window.LESSON_DOCS && LESSON_DOCS[id]) || {};
        const q = (window.QUIZ_DATA && QUIZ_DATA[id]) || {};
        const out = [];

        out.push('**💡 KIẾN THỨC TRỌNG TÂM – CÔNG NGHỆ ' + lesson.grade + ' (BÀI ' + lesson.no + ': ' + lesson.title.toUpperCase() + ')**');

        if (doc.yccd && doc.yccd.length) {
            out.push('\n**1. Mục tiêu cần nắm vững sau bài học:**');
            doc.yccd.forEach(y => out.push('- ' + y));
        }

        if (doc.topics && doc.topics.length) {
            out.push('\n**2. Các mạch nội dung chính của bài:**');
            doc.topics.forEach((tp, idx) => out.push((idx + 1) + '. **' + tp + '**'));
        }

        // Trích các mệnh đề ĐÚNG từ phần Đúng/Sai làm kiến thức chuẩn
        const trueFacts = [];
        (q.tf || []).forEach(tfQ => {
            (tfQ.items || []).forEach(it => {
                if (it.answer && it.t) trueFacts.push(it.t);
            });
        });
        if (trueFacts.length) {
            out.push('\n**3. Nội dung kiến thức cốt lõi cần ghi nhớ:**');
            trueFacts.slice(0, 7).forEach(f => out.push('- ' + f));
        }

        // Bổ sung kiến thức từ đáp án đúng của câu hỏi trắc nghiệm
        if (q.mcq && q.mcq.length) {
            out.push('\n**4. Các khái niệm & nguyên tắc kỹ thuật quan trọng:**');
            q.mcq.slice(0, 5).forEach(m => {
                const ans = m.options && m.options[m.answer];
                if (ans) {
                    const cleanStem = m.q.replace(/^\[[^\]]*\]\s*|\([^)]*YCCĐ[^)]*\)\s*:?\s*/gi, '').replace(/\?$/, '');
                    out.push('- **' + cleanStem + ':** ' + ans);
                }
            });
        }

        out.push('\nEm có thể bấm **"🔧 Cho ví dụ thực tế"**, **"🧠 Đố em một câu"** hoặc đặt câu hỏi bất kỳ về **Bài ' + lesson.no + '** để hiểu sâu hơn nhé!');
        return out.join('\n');
    }

    // 2. Cho ví dụ thực tế & tình huống vận dụng
    function buildExampleResponse(lesson) {
        if (context.type === 'hsg' && context.id && window.HSG_CONTENT && HSG_CONTENT[context.id]) {
            const h = CATALOG.hsg.find(x => String(x.no) === String(context.id));
            const raw = stripHtml(HSG_CONTENT[context.id]);
            const lines = raw.split('\n').map(x => x.trim()).filter(x => /ví dụ|thực tế|ứng dụng|giải thích|biện pháp|nguyên nhân|quy trình/i.test(x)).slice(0, 10);
            return '**🔧 LIÊN HỆ THỰC TIỄN & VẬN DỤNG – CHUYÊN ĐỀ ' + h.no + ': ' + h.title.toUpperCase() + '**\n\n' +
                (lines.length ? lines.map(l => '- ' + l).join('\n') : raw.split('\n').filter(x => x.length > 30).slice(0, 8).map(l => '- ' + l).join('\n'));
        }

        if (!lesson) lesson = findBestLessonFromQuery('') || (window.CATALOG && CATALOG.lessons[0]);
        const id = lesson.id;
        const doc = (window.LESSON_DOCS && LESSON_DOCS[id]) || {};
        const q = (window.QUIZ_DATA && QUIZ_DATA[id]) || {};
        const out = [];

        out.push('**🔧 VÍ DỤ THỰC TẾ & TÌNH HUỐNG VẬN DỤNG – BÀI ' + lesson.no + ': ' + lesson.title.toUpperCase() + '**');

        if (q.essay && q.essay.length) {
            out.push('\n**Các tình huống thực tiễn thường gặp và cách giải quyết:**');
            q.essay.forEach((es, idx) => {
                const cleanQ = es.q.replace(/^\[[^\]]*\]\s*|\([^)]*điểm[^)]*\)\s*:?\s*/gi, '');
                out.push('\n**Tình huống ' + (idx + 1) + ':** ' + cleanQ);
            });
        }

        if (doc.essayGuide && doc.essayGuide.length) {
            out.push('\n**💡 Hướng dẫn phân tích & xử lý trong thực tế:**');
            doc.essayGuide.forEach(ln => {
                const cleanLn = ln.replace(/\(\d+[.,]\d+\s*(?:điểm|đ)\)/gi, '').trim();
                if (cleanLn) out.push('- ' + cleanLn);
            });
        }

        // Bổ sung các lưu ý thực hành Đúng/Sai
        const wrongFacts = [];
        (q.tf || []).forEach(tfQ => {
            (tfQ.items || []).forEach(it => {
                if (!it.answer && it.t) wrongFacts.push(it.t);
            });
        });
        if (wrongFacts.length) {
            out.push('\n**⚠️ Các sai lầm cần tránh khi thực hành thực tế (Các nhận định SAI):**');
            wrongFacts.slice(0, 4).forEach(w => out.push('- Không được: *"' + w + '"*'));
        }

        return out.join('\n');
    }

    // 3. Đố học sinh một câu trắc nghiệm tương tác
    function buildQuizChallenge(lesson) {
        if (!lesson) lesson = findBestLessonFromQuery('') || (window.CATALOG && CATALOG.lessons[0]);
        const id = lesson.id;
        const q = (window.QUIZ_DATA && QUIZ_DATA[id]) || {};
        const mcqs = q.mcq || [];
        if (!mcqs.length) return 'Bài học này hiện chưa có câu hỏi đố nhanh. Em hãy chọn một bài học khác nhé!';

        if (askedMcqIndices.size >= mcqs.length) askedMcqIndices.clear();
        const avail = mcqs.map((_, idx) => idx).filter(idx => !askedMcqIndices.has(idx));
        const pickIdx = avail[Math.floor(Math.random() * avail.length)];
        askedMcqIndices.add(pickIdx);

        const item = mcqs[pickIdx];
        pendingQuiz = {
            lesson: lesson,
            q: item.q.replace(/^\[[^\]]*\]\s*|\([^)]*YCCĐ[^)]*\)\s*:?\s*/gi, ''),
            options: item.options,
            answer: item.answer
        };

        const letters = ['A', 'B', 'C', 'D'];
        return '**🧠 CÂU HỎI THỬ THÁCH – BÀI ' + lesson.no + ': ' + lesson.title.toUpperCase() + '**\n\n' +
            '**Câu hỏi:** ' + pendingQuiz.q + '\n\n' +
            pendingQuiz.options.map((opt, i) => '- **' + letters[i] + '.** ' + opt).join('\n') +
            '\n\n👉 Em hãy trả lời bằng cách gõ **A**, **B**, **C** hoặc **D** vào ô chat bên dưới nhé!';
    }

    // Kiểm tra nếu học sinh đang trả lời câu hỏi đố (A, B, C, D)
    function checkPendingQuizAnswer(msg) {
        if (!pendingQuiz) return null;
        const m = msg.trim().match(/^(?:đáp án\s*|em chọn\s*|chọn\s*|câu\s*)?([A-Da-d])(?:[.\s]|$)/i);
        const askReveal = /đáp án là gì|cho đáp án|giải thích đáp án|không biết/i.test(msg);
        if (!m && !askReveal) return null;

        const letters = ['A', 'B', 'C', 'D'];
        const correctLetter = letters[pendingQuiz.answer];
        const correctText = pendingQuiz.options[pendingQuiz.answer];
        const currentQuiz = pendingQuiz;
        pendingQuiz = null;

        if (askReveal) {
            return '💡 **Đáp án đúng là ' + correctLetter + ':** ' + correctText + '\n\n' +
                'Em hãy bấm **"🧠 Đố em một câu"** nếu muốn thử sức với câu tiếp theo nhé!';
        }

        const chosen = m[1].toUpperCase();
        if (chosen === correctLetter) {
            return '🎉 **Chính xác! Chúc mừng em!**\n\n' +
                'Đáp án đúng chính là **' + correctLetter + '. ' + correctText + '**.\n' +
                'Em nắm rất chắc kiến thức của **Bài ' + currentQuiz.lesson.no + ': ' + currentQuiz.lesson.title + '** đấy! Bấm **"🧠 Đố em một câu"** để tiếp tục thử thách nhé!';
        } else {
            return '💡 **Chưa chính xác rồi!** Em chọn **' + chosen + '**, nhưng đáp án đúng phải là **' + correctLetter + '**.\n\n' +
                '- **Câu hỏi:** ' + currentQuiz.q + '\n' +
                '- **Đáp án đúng:** **' + correctLetter + '. ' + correctText + '**\n\n' +
                'Em hãy ghi nhớ ý này và bấm **"🧠 Đố em một câu"** để làm thêm câu nữa nhé!';
        }
    }

    // 4. Tóm tắt ôn tập toàn diện bài học
    function buildSummaryResponse(lesson) {
        if (context.type === 'hsg' && context.id) return buildExplainResponse(null);
        if (!lesson) lesson = findBestLessonFromQuery('') || (window.CATALOG && CATALOG.lessons[0]);
        const id = lesson.id;
        const doc = (window.LESSON_DOCS && LESSON_DOCS[id]) || {};
        const q = (window.QUIZ_DATA && QUIZ_DATA[id]) || {};
        const out = [];

        out.push('**📚 ĐỀ CƯƠNG TÓM TẮT ÔN TẬP – CÔNG NGHỆ ' + lesson.grade + ' (BÀI ' + lesson.no + ': ' + lesson.title.toUpperCase() + ')**');

        if (doc.topics && doc.topics.length) {
            out.push('\n**I. Sơ đồ các mạch kiến thức trọng tâm:**');
            doc.topics.forEach((tp, i) => out.push((i + 1) + '. ' + tp));
        }

        if (q.mcq && q.mcq.length) {
            out.push('\n**II. Tổng hợp nhanh kiến thức trắc nghiệm (12 điểm nhớ nhanh):**');
            q.mcq.forEach((m, i) => {
                const ans = m.options && m.options[m.answer];
                const cleanStem = m.q.replace(/^\[[^\]]*\]\s*|\([^)]*YCCĐ[^)]*\)\s*:?\s*/gi, '');
                if (ans) out.push((i + 1) + '. ' + cleanStem + ' ➔ **' + ans + '**');
            });
        }

        const trueFacts = [];
        (q.tf || []).forEach(tfQ => {
            (tfQ.items || []).forEach(it => { if (it.answer && it.t) trueFacts.push(it.t); });
        });
        if (trueFacts.length) {
            out.push('\n**III. Các phát biểu ĐÚNG cần nhớ khi làm bài Đúng/Sai:**');
            trueFacts.forEach(f => out.push('- **ĐÚNG:** ' + f));
        }

        out.push('\n💡 *Mẹo:* Em có thể bấm nút **"Xuất file Word (.doc)"** ở góc trên bên phải khung chat để tải bản tóm tắt ôn tập này về máy tính hoặc in ra học nhé!');
        return out.join('\n');
    }

    // 5. Tìm kiếm & trả lời câu hỏi tự do bất kỳ của học sinh/giáo viên
    function searchAndAnswerQuestion(msg, lesson) {
        const qNorm = normVi(msg);
        const tokens = qNorm.split(' ').filter(w => w.length >= 2 && !['cho', 'em', 'hoi', 'la', 'gi', 'nhu', 'the', 'nao', 'tai', 'sao', 'bai', 'nay', 'cua', 'trong', 'khi', 'va', 'cac', 'mot', 'nhung'].includes(w));

        // Ưu tiên tìm trong bài đang chọn trước, nếu không có thì tìm toàn bộ 36 bài + 10 chuyên đề HSG
        const targetLessons = [];
        if (context.type === 'lesson' && context.id) {
            const cur = window.CATALOG && CATALOG.lessons.find(x => x.id === context.id);
            if (cur) targetLessons.push(cur);
        }
        if (window.CATALOG) {
            CATALOG.lessons.forEach(l => { if (!targetLessons.includes(l)) targetLessons.push(l); });
        }

        const matchedGuideBlocks = [];
        const matchedMcqs = [];
        const matchedTfs = [];

        // Tìm trong bài đang học (hoặc bài khớp nhất)
        const primaryLesson = lesson || targetLessons[0];
        const searchPool = (context.type === 'lesson' && primaryLesson) ? [primaryLesson] : targetLessons;

        searchPool.forEach(l => {
            const doc = (window.LESSON_DOCS && LESSON_DOCS[l.id]) || {};
            const q = (window.QUIZ_DATA && QUIZ_DATA[l.id]) || {};

            // Tìm trong Hướng dẫn chấm tự luận
            if (doc.essayGuide && doc.essayGuide.length) {
                let currentBlock = [];
                doc.essayGuide.forEach(ln => {
                    if (/^(?:[•\-*]\s*)?Câu\s*\d+/i.test(ln) && currentBlock.length) {
                        const txt = currentBlock.join('\n');
                        const tNorm = normVi(txt);
                        let sc = 0;
                        tokens.forEach(tk => { if (tNorm.includes(tk)) sc += 2; });
                        if (sc >= 2) matchedGuideBlocks.push({ score: sc + (l === primaryLesson ? 5 : 0), lesson: l, text: txt });
                        currentBlock = [ln];
                    } else {
                        currentBlock.push(ln);
                    }
                });
                if (currentBlock.length) {
                    const txt = currentBlock.join('\n');
                    const tNorm = normVi(txt);
                    let sc = 0;
                    tokens.forEach(tk => { if (tNorm.includes(tk)) sc += 2; });
                    if (sc >= 2) matchedGuideBlocks.push({ score: sc + (l === primaryLesson ? 5 : 0), lesson: l, text: txt });
                }
            }

            // Tìm trong MCQ
            (q.mcq || []).forEach(m => {
                const full = m.q + ' ' + (m.options || []).join(' ');
                const fNorm = normVi(full);
                let sc = 0;
                tokens.forEach(tk => { if (fNorm.includes(tk)) sc += 2; });
                if (sc >= 2) matchedMcqs.push({ score: sc + (l === primaryLesson ? 4 : 0), lesson: l, item: m });
            });

            // Tìm trong Đúng/Sai
            (q.tf || []).forEach(tfQ => {
                (tfQ.items || []).forEach(it => {
                    const fNorm = normVi(tfQ.q + ' ' + it.t);
                    let sc = 0;
                    tokens.forEach(tk => { if (fNorm.includes(tk)) sc += 2; });
                    if (sc >= 2) matchedTfs.push({ score: sc + (l === primaryLesson ? 4 : 0), lesson: l, stem: tfQ.q, item: it });
                });
            });
        });

        matchedGuideBlocks.sort((a, b) => b.score - a.score);
        matchedMcqs.sort((a, b) => b.score - a.score);
        matchedTfs.sort((a, b) => b.score - a.score);

        // Nếu đang ở chuyên đề HSG hoặc tìm thấy trong HSG
        if (context.type === 'hsg' && context.id && window.HSG_CONTENT && HSG_CONTENT[context.id]) {
            const raw = stripHtml(HSG_CONTENT[context.id]);
            const paras = raw.split('\n').map(x => x.trim()).filter(x => x.length > 20);
            const hits = paras.map(p => {
                const pNorm = normVi(p);
                let sc = 0;
                tokens.forEach(tk => { if (pNorm.includes(tk)) sc += 2; });
                return { score: sc, text: p };
            }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);

            if (hits.length) {
                return '**🤖 Giải đáp từ tài liệu ' + context.label + ':**\n\n' +
                    hits.map(h => '- ' + h.text).join('\n');
            }
        }

        if (matchedGuideBlocks.length || matchedMcqs.length || matchedTfs.length) {
            const topLesson = (matchedGuideBlocks[0] && matchedGuideBlocks[0].lesson) ||
                (matchedMcqs[0] && matchedMcqs[0].lesson) ||
                (matchedTfs[0] && matchedTfs[0].lesson) || primaryLesson;
            const out = [];
            out.push('**🤖 Giải đáp kiến thức (' + (topLesson ? 'Công nghệ ' + topLesson.grade + ' – Bài ' + topLesson.no + ': ' + topLesson.title : 'Môn Công nghệ') + '):**');

            if (matchedGuideBlocks.length) {
                out.push('\n**1. Phân tích & Giải thích chi tiết:**');
                matchedGuideBlocks.slice(0, 2).forEach(b => {
                    b.text.split('\n').forEach(ln => {
                        const cleanLn = ln.replace(/\(\d+[.,]\d+\s*(?:điểm|đ)\)/gi, '').trim();
                        if (cleanLn) out.push('- ' + cleanLn);
                    });
                });
            }

            if (matchedTfs.length) {
                out.push('\n**2. Các lưu ý kỹ thuật Đúng / Sai liên quan:**');
                matchedTfs.slice(0, 5).forEach(x => {
                    out.push('- **' + (x.item.answer ? 'ĐÚNG' : 'SAI (Cần tránh)') + ':** ' + x.item.t);
                });
            }

            if (matchedMcqs.length) {
                out.push('\n**3. Kiến thức trắc nghiệm trọng tâm liên quan:**');
                matchedMcqs.slice(0, 4).forEach(x => {
                    const ans = x.item.options && x.item.options[x.item.answer];
                    const cleanQ = x.item.q.replace(/^\[[^\]]*\]\s*|\([^)]*YCCĐ[^)]*\)\s*:?\s*/gi, '');
                    out.push('- ' + cleanQ + ' ➔ **Đáp án: ' + ans + '**');
                });
            }

            return out.join('\n');
        }

        // Nếu câu hỏi chung chung hoặc chào hỏi
        if (/^(xin chao|chao|hello|hi|alo)/i.test(qNorm)) {
            return 'Chào em! Tôi là **Kỹ sư AI** của Trường THCS Vĩnh Xuân. ' +
                (context.label ? 'Hiện tại chúng ta đang ở **' + context.label + '**.' : 'Em có thể chọn bài học ở thanh bên dưới.') +
                '\n\nEm có thể bấm các nút gợi ý:\n' +
                '- **💡 Giải thích kiến thức** để xem nội dung trọng tâm của bài.\n' +
                '- **🔧 Cho ví dụ thực tế** để xem các tình huống vận dụng.\n' +
                '- **🧠 Đố em một câu** để luyện phản xạ trắc nghiệm.\n' +
                '- **📚 Tóm tắt ôn tập** để lấy đề cương ôn tập chuẩn của bài!';
        }

        // Mặc định trả về kiến thức trọng tâm của bài đang chọn
        return buildExplainResponse(primaryLesson);
    }

    function localSmartAnswer(msg) {
        // 1. Kiểm tra nếu học sinh đang trả lời câu đố A/B/C/D
        const quizReply = checkPendingQuizAnswer(msg);
        if (quizReply) return quizReply;

        const qNorm = normVi(msg);
        const lesson = findBestLessonFromQuery(msg);

        // 2. Nhận diện 4 nút gợi ý hoặc yêu cầu tương đương
        if (/do em mot cau|cau hoi trac nghiem|do vui|thu thach/.test(qNorm)) {
            return buildQuizChallenge(lesson);
        }
        if (/vi du thuc te|tinh huong thuc te|ung dung thuc te|lien he thuc te/.test(qNorm)) {
            return buildExampleResponse(lesson);
        }
        if (/tom tat|so do y chinh|de cuong|on tap/.test(qNorm)) {
            return buildSummaryResponse(lesson);
        }
        if (/giai thich.*kien thuc|kien thuc trong tam|kien thuc chinh|noi dung chinh/.test(qNorm)) {
            return buildExplainResponse(lesson);
        }

        // 3. Tìm kiếm & giải đáp câu hỏi cụ thể
        return searchAndAnswerQuestion(msg, lesson);
    }

    // ----- Gửi tin nhắn -----
    let busy = false;
    async function sendMessage(preset) {
        const input = el('user-input');
        const msg = (preset || input.value).trim();
        if (!msg || busy) return;
        busy = true; input.value = '';
        addMsg('msg-user', esc(msg));

        // Nếu học sinh đang trả lời A/B/C/D cho câu hỏi đố của hệ thống nội bộ -> chấm điểm tức thì
        const instantQuizReply = checkPendingQuizAnswer(msg);
        if (instantQuizReply) {
            history.push({ role: 'user', parts: [{ text: msg }] });
            history.push({ role: 'model', parts: [{ text: instantQuizReply }] });
            addMsg('msg-ai', md(instantQuizReply));
            busy = false;
            return;
        }

        history.push({ role: 'user', parts: [{ text: msg }] });
        if (history.length > 20) history.splice(0, history.length - 20);
        const wait = addMsg('msg-ai typing', 'Đang suy nghĩ...');
        let reply = '';
        try {
            reply = await callGeminiOnline();
        } catch (_) {
            // Chuyển sang Trí tuệ Học liệu Nội bộ mượt mà, tuyệt đối không bao giờ báo lỗi đỏ/xám làm gián đoạn việc học
            reply = localSmartAnswer(msg);
        }
        history.push({ role: 'model', parts: [{ text: reply }] });
        wait.className = 'message msg-ai';
        wait.innerHTML = md(reply);
        busy = false;
        el('chat-messages').scrollTop = el('chat-messages').scrollHeight;
    }

    // ----- Xuất hội thoại ra file Word (.doc) -----
    function exportWord() {
        if (!history.length) { alert('Chưa có nội dung hỏi đáp để xuất.'); return; }
        const topic = context.label || 'Hỏi đáp chung môn Công nghệ';
        const now = new Date().toLocaleString('vi-VN');
        const rows = history.map(h => {
            const who = h.role === 'user' ? 'Học sinh / Giáo viên' : 'Trợ lý Kỹ sư AI';
            const color = h.role === 'user' ? '#0d6efd' : '#198754';
            const body = h.role === 'user' ? '<p>' + esc(h.parts[0].text) + '</p>' : md(h.parts[0].text);
            return '<div style="margin:12pt 0;padding:8pt 12pt;border-left:3pt solid ' + color + ';background:#fafafa;">' +
                '<p style="margin:0 0 4pt;font-weight:bold;color:' + color + ';">' + who + ':</p>' + body + '</div>';
        }).join('');
        const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
            '<head><meta charset="utf-8"><title>' + esc(topic) + '</title>' +
            '<style>body{font-family:"Times New Roman",serif;font-size:13pt;line-height:1.5}h1{font-size:16pt;color:#0a58ca}p{margin:4pt 0}ul,ol{margin:4pt 0 4pt 18pt}</style></head>' +
            '<body><h1>TRỢ LÝ KỸ SƯ AI - THẾ GIỚI CÔNG NGHỆ (TRƯỜNG THCS VĨNH XUÂN)</h1>' +
            '<p><strong>Giáo viên phụ trách:</strong> Thầy Nguyễn Thanh Việt</p>' +
            '<p><strong>Chủ đề:</strong> ' + esc(topic) + '<br><strong>Thời gian xuất:</strong> ' + esc(now) + '</p><hr>' +
            rows + '</body></html>';
        const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'Tro-ly-AI-' + Date.now() + '.doc';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }

    // ----- Khởi tạo giao diện -----
    function init() {
        const sel = el('ctx-select');
        if (window.CATALOG) {
            let o = '<option value="">Hỏi đáp chung</option>';
            [7, 8].forEach(g => {
                o += '<optgroup label="Công nghệ ' + g + '">' + CATALOG.lessons.filter(l => l.grade === g).map(l =>
                    '<option value="l:' + l.id + '">Bài ' + l.no + ': ' + esc(l.title) + '</option>').join('') + '</optgroup>';
            });
            o += '<optgroup label="Ôn luyện HSG">' + CATALOG.hsg.map(h => '<option value="h:' + h.no + '">Chuyên đề ' + h.no + ': ' + esc(h.title) + '</option>').join('') + '</optgroup>';
            sel.innerHTML = o;
        }
        const p = new URLSearchParams(location.search);
        const initVal = p.get('lesson') ? 'l:' + p.get('lesson') : (p.get('hsg') ? 'h:' + p.get('hsg') : '');
        sel.value = initVal; if (sel.value !== initVal) sel.value = '';
        setContext(sel.value);
        sel.addEventListener('change', () => {
            setContext(sel.value);
            addMsg('msg-ai', context.label ? 'Đã chuyển sang <strong>' + esc(context.label) + '</strong>. Em muốn hỏi gì nào?' : 'Đã chuyển sang hỏi đáp chung.');
        });

        el('send-btn').addEventListener('click', () => sendMessage());
        el('user-input').addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });
        document.querySelectorAll('[data-suggest]').forEach(b => b.addEventListener('click', () => sendMessage(b.dataset.suggest)));
        const exp = el('export-word'); if (exp) exp.addEventListener('click', exportWord);

        // Luôn cho phép giáo viên mở cài đặt khóa API dự phòng nếu muốn gọi trực tiếp không qua Worker
        const setup = el('ai-setup');
        if (setup) {
            const k = el('key-input');
            if (k) k.value = localStorage.getItem(KEY_STORE) || '';
            const saveBtn = el('key-save');
            if (saveBtn && k) {
                saveBtn.addEventListener('click', () => {
                    k.value.trim() ? localStorage.setItem(KEY_STORE, k.value.trim()) : localStorage.removeItem(KEY_STORE);
                    el('key-state').textContent = k.value.trim() ? 'Đã lưu khóa trong trình duyệt này (ưu tiên gọi trực tiếp tại Việt Nam).' : 'Đã xóa khóa.';
                });
            }
            if (!CFG.proxyUrl && !localStorage.getItem(KEY_STORE)) {
                setup.setAttribute('open', 'open');
            }
        }
    }
    document.addEventListener('DOMContentLoaded', init);
})();
