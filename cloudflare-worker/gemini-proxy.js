// Cloudflare Worker: máy chủ trung gian giữ bí mật khóa Gemini API cho website Thế Giới Công Nghệ (THCS Vĩnh Xuân).
// Tối ưu tốc độ phản hồi (ưu tiên Flash 1-2s), phát hiện tức thì lỗi vị trí (node Hong Kong HKG) để không làm treo yêu cầu.

const MODELS = [
    'gemini-3-flash-preview',
    'gemini-2.5-flash',
    'gemini-3.1-pro-preview',
    'gemini-3.1-flash-lite-preview'
];
const MAX_BODY = 150000;
const MAX_TURNS = 20;

export default {
    async fetch(request, env) {
        const origin = request.headers.get('Origin') || '';
        const allowed = env.ALLOWED_ORIGIN || '*';
        const cors = {
            'Access-Control-Allow-Origin': allowed === '*' ? '*' : allowed,
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Vary': 'Origin'
        };
        if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
        if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });
        if (allowed !== '*' && origin !== allowed) return new Response('Forbidden', { status: 403, headers: cors });

        const raw = await request.text();
        if (raw.length > MAX_BODY) return json({ error: { message: 'Yêu cầu quá dài.' } }, 413, cors);

        let body;
        try { body = JSON.parse(raw); } catch { return json({ error: { message: 'JSON không hợp lệ.' } }, 400, cors); }

        const payload = {
            systemInstruction: body.systemInstruction,
            contents: Array.isArray(body.contents) ? body.contents.slice(-MAX_TURNS) : [],
            generationConfig: { temperature: 0.6, maxOutputTokens: 4096 }
        };
        if (!payload.contents.length) return json({ error: { message: 'Thiếu nội dung câu hỏi.' } }, 400, cors);

        let lastErrorText = '';
        let lastStatus = 500;

        for (const m of MODELS) {
            const r = await callModel(m, payload, env.GEMINI_API_KEY);
            const txt = await r.text();
            if (r.ok) {
                return new Response(txt, { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
            }
            lastStatus = r.status;
            lastErrorText = txt;
            // Nếu node Cloudflare hiện tại rơi vào Hong Kong (HKG) bị Google chặn vùng địa lý,
            // thoát ngay vòng lặp để trình duyệt chuyển tức thì sang cơ chế dự phòng mà không phải chờ.
            if (/location is not supported/i.test(txt)) {
                break;
            }
        }

        return new Response(lastErrorText || JSON.stringify({ error: { message: 'Hệ thống AI đang bận.' } }), {
            status: lastStatus,
            headers: { ...cors, 'Content-Type': 'application/json' }
        });
    }
};

function callModel(model, payload, apiKey) {
    return fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(payload)
    });
}

function json(obj, status, cors) {
    return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
