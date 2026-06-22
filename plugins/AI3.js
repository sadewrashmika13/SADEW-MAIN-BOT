const axios = require("axios");
const FormData = require("form-data");
const { Sparky } = require("../lib");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

const API_TOKEN = process.env.WHITESHADOW_API_TOKEN || "VK4fry";
const REQUEST_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 40000);

const EMOJI_THINKING = "\uD83E\uDD16";
const EMOJI_DONE = "\u2705";
const EMOJI_ERROR = "\u274C";

const STYLE_INSTRUCTION = "Reply in a natural Sinhala and English mixed style.nutural sinhala kind friendly sinhala latters.don'tUse singlish.use friendly clear Sinhala-English mix like a Sri Lankan WhatsApp chat.";

function getJid(m) {
    return m.jid || m.chat || m.from || m.key?.remoteJid;
}

function getPrompt(args, m) {
    let text = "";
    if (Array.isArray(args) && args.length) text = args.join(" ").trim();
    else if (typeof args === "string" && args.trim()) text = args.trim();
    else if (m?.text) text = m.text.replace(/^[./!#]ai3\s*/i, "").trim();

    if (!text && m?.quoted?.text) {
        text = m.quoted.text.trim();
    }
    return text; 
}

function extractTextFromObject(value, depth = 0) {
    if (!value || depth > 4) return "";
    if (typeof value === "string") return value.trim();
    if (Array.isArray(value)) {
        for (const item of value) {
            const found = extractTextFromObject(item, depth + 1);
            if (found) return found;
        }
        return "";
    }
    if (typeof value !== "object") return "";

    const priorityKeys = ["BK9", "result", "response", "answer", "message", "text", "content", "reply", "output", "data"];
    for (const key of priorityKeys) {
        if (value[key]) {
            const found = extractTextFromObject(value[key], depth + 1);
            if (found) return found;
        }
    }
    return "";
}

async function safeReact(m, emoji) {
    try { await m.react?.(emoji); } catch (error) {}
}

async function sendText(m, client, text) {
    const jid = getJid(m);
    if (typeof m.reply === "function") return m.reply(text);
    if (typeof client?.sendMessage === "function") {
        return client.sendMessage(jid, { text }, { quoted: m });
    }
}

async function downloadMedia(message, type) {
    const stream = await downloadContentFromMessage(message, type);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
}

// 🔴 BULLETPROOF MULTI-UPLOADER (100% Direct Links Only!)
async function uploadImageToUrl(buffer, mimeType) {
    const ext = mimeType.split("/")[1] || "jpeg";
    const filename = `file_${Date.now()}.${ext}`;

    // 1. ImgBB (Best - Never blocks AI APIs)
    try {
        let form = new FormData();
        form.append("image", buffer.toString("base64"));
        const res = await axios.post("https://api.imgbb.com/1/upload?key=6d207e02198a847aa98d0a2a901485a5", form);
        if (res.data && res.data.data && res.data.data.url) {
            console.log("Uploaded to ImgBB:", res.data.data.url);
            return res.data.data.url;
        }
    } catch (e) {
        console.log("ImgBB Upload Failed.");
    }

    // 2. Pomf2 (Alternative Direct Link)
    try {
        let form = new FormData();
        form.append("files[]", buffer, { filename, contentType: mimeType });
        const res = await axios.post("https://pomf2.lain.la/upload.php", form, { headers: form.getHeaders() });
        if (res.data && res.data.files && res.data.files[0].url) {
            console.log("Uploaded to Pomf2:", res.data.files[0].url);
            return res.data.files[0].url;
        }
    } catch (e) {
        console.log("Pomf2 Upload Failed.");
    }

    throw new Error("ඡායාරූපය Upload කිරීම අසාර්ථක විය. (Uploaders Down)");
}

// 🔴 MULTI-API SYSTEM FOR TEXT
async function askGeminiText(prompt) {
    const q = `${prompt}\n\n${STYLE_INSTRUCTION}`;
    const apiList = [
        { url: "https://whiteshadow-x-api.onrender.com/api/ai/gemini", params: { q: q, apitoken: API_TOKEN } },
        { url: "https://api.siputzx.my.id/api/ai/gemini", params: { content: q } },
        { url: "https://api.giftedtech.my.id/api/ai/geminiai", params: { apikey: "gifted", q: q } }
    ];

    for (let api of apiList) {
        try {
            const { data } = await axios.get(api.url, {
                timeout: REQUEST_TIMEOUT_MS,
                params: api.params,
                headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36" }
            });
            
            if (typeof data === "string" && data.trim().startsWith("<")) continue;
            const answer = extractTextFromObject(data);
            if (answer) return answer;
        } catch (e) {
            console.log(`Text API Failed (${api.url}):`, e.message);
            continue; 
        }
    }
    throw new Error("සියලුම AI සර්වර් මේ මොහොතේ කාර්යබහුලයි හෝ අවහිර කර ඇත.");
}

// 🔴 MULTI-API SYSTEM FOR VISION (IMAGES)
async function askGeminiVision(prompt, imageUrl) {
    const q = `${prompt}\n\n${STYLE_INSTRUCTION}`;
    const apiList = [
        { url: "https://api.bk9.site/ai/geminiimg", params: { q: q, url: imageUrl } },
        { url: "https://api.siputzx.my.id/api/ai/gemini-image", params: { url: imageUrl, text: q } },
        { url: "https://api.giftedtech.my.id/api/ai/geminivision", params: { apikey: "gifted", q: q, url: imageUrl } },
        { url: "https://widipe.com/gemini", params: { url: imageUrl, text: q } }
    ];

    for (let api of apiList) {
        try {
            const { data } = await axios.get(api.url, {
                timeout: REQUEST_TIMEOUT_MS,
                params: api.params,
                headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36" }
            });

            if (typeof data === "string" && data.trim().startsWith("<")) {
                console.log(`Vision API Blocked by HTML (${api.url})`);
                continue;
            }

            const answer = extractTextFromObject(data);
            if (answer) return answer;
        } catch (e) {
            console.log(`Vision API Failed (${api.url}):`, e.message);
            continue; 
        }
    }
    throw new Error("සියලුම Image Vision සර්වර් මේ මොහොතේ කාර්යබහුලයි හෝ අවහිර කර ඇත.");
}

// --- Main Command ---

Sparky({
    name: "ai3", 
    fromMe: false,
    category: "ai",
    desc: "Chat with AI3 (Gemini Vision) in Sinhala-English mixed style.",
}, async ({ m, client, args }) => {
    
    let prompt = getPrompt(args, m);
    let isImage = false;
    let targetMessage = m.message;
    let mimeType = "image/jpeg";

    if (m.quoted && m.quoted.message) {
        let quotedType = Object.keys(m.quoted.message)[0];
        if (quotedType === 'messageContextInfo') quotedType = Object.keys(m.quoted.message)[1];
        if (quotedType === 'imageMessage') {
            isImage = true;
            targetMessage = m.quoted.message.imageMessage;
            mimeType = m.quoted.message.imageMessage.mimetype || "image/jpeg";
            if (!prompt) prompt = "කරුණාකර මෙම ඡායාරූපය ගැන විස්තර කරන්න.";
        }
    } else if (m.message && m.message.imageMessage) {
        isImage = true;
        targetMessage = m.message.imageMessage;
        mimeType = m.message.imageMessage.mimetype || "image/jpeg";
        if (!prompt) prompt = "කරුණාකර මෙම ඡායාරූපය ගැන විස්තර කරන්න.";
    }

    if (!prompt && !isImage) {
        return sendText(m, client, `${EMOJI_ERROR} *Usage:* \`.ai3 oyage question eka\`\n\nExample: .ai3 Write a poem about nature`);
    }

    try {
        await safeReact(m, EMOJI_THINKING);
        await client.sendPresenceUpdate('composing', getJid(m));

        let answer = "";

        if (isImage) {
            let imageBuffer = await downloadMedia(targetMessage, 'image');
            let imageUrl = await uploadImageToUrl(imageBuffer, mimeType);
            answer = await askGeminiVision(prompt, imageUrl);
        } else {
            answer = await askGeminiText(prompt);
        }

        await sendText(m, client, answer);
        await safeReact(m, EMOJI_DONE);

    } catch (error) {
        console.error("ai3 command error:", error);
        await safeReact(m, EMOJI_ERROR);
        const errMsg = error?.response?.data?.message || error?.response?.statusText || error.message || "Unknown Error";
        return sendText(m, client, `${EMOJI_ERROR} AI3 Error.\nReason: ${errMsg}`);
    }
});
