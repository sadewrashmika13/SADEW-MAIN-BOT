const axios = require("axios");
const FormData = require("form-data");
const { Sparky } = require("../lib");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

const EMOJI_THINKING = "\u23F3"; // ⏳
const EMOJI_DONE = "\u2728"; // ✨
const EMOJI_ERROR = "\u274C"; // ❌

// --- Helper Functions ---

function getJid(m) {
    return m.jid || m.chat || m.from || m.key?.remoteJid;
}

function getPrompt(args, m) {
    if (Array.isArray(args) && args.length) return args.join(" ").trim();
    if (typeof args === "string" && args.trim()) return args.trim();
    if (m?.text) {
        // කමාන්ඩ් එකේ නම අයින් කරලා prompt එක ගන්නවා (උදා: .editimg anime girl)
        let text = m.text.replace(/^[./!#]editimg\s*/i, "").trim();
        return text;
    }
    return "";
}

async function safeReact(m, emoji) {
    try { await m.react?.(emoji); } catch (error) {}
}

async function downloadMedia(message, type) {
    const stream = await downloadContentFromMessage(message, type);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
}

// 1. ImgBB Upload Function (AI වලට පේන්න Direct Link එකක් ගන්න)
async function uploadToImgBB(buffer) {
    try {
        let form = new FormData();
        form.append("image", buffer.toString("base64"));
        // Free ImgBB Key (කැමති නම් වෙනස් කරගන්න පුළුවන්)
        const res = await axios.post("https://api.imgbb.com/1/upload?key=6d207e02198a847aa98d0a2a901485a5", form);
        if (res.data && res.data.data && res.data.data.url) {
            return res.data.data.url;
        }
    } catch (e) {
        throw new Error("ImgBB Upload Failed.");
    }
    throw new Error("ඡායාරූපය Upload කිරීම අසාර්ථක විය.");
}

// 2. JSON Response එකෙන් අලුත් ෆොටෝ එකේ ලින්ක් එක හොයන Function එක
function extractImageUrl(obj, depth = 0) {
    if (depth > 5 || !obj) return null;
    if (typeof obj === 'string' && obj.startsWith('http')) return obj;
    
    if (typeof obj === 'object') {
        // ගොඩක් API වල ලින්ක් එක එන්නේ මේ නම් වලින්
        const keysToCheck = ['url', 'image', 'result', 'data', 'output', 'link'];
        for (let key of keysToCheck) {
            if (obj[key]) {
                if (typeof obj[key] === 'string' && obj[key].startsWith('http')) {
                    return obj[key];
                }
                let nested = extractImageUrl(obj[key], depth + 1);
                if (nested) return nested;
            }
        }
        // වෙනත් නම් වලින් තිබ්බොත්
        for (let key in obj) {
            let nested = extractImageUrl(obj[key], depth + 1);
            if (nested) return nested;
        }
    }
    return null;
}

// --- Main Command ---

Sparky({
    name: "editimg", 
    fromMe: false,
    category: "ai",
    desc: "Edit image using NanoBanana AI by replying to a photo.",
}, async ({ m, client, args }) => {
    
    let prompt = getPrompt(args, m);
    let isImage = false;
    let targetMessage = null;

    // ෆොටෝ එකකට රිප්ලයි කරලද බලනවා
    if (m.quoted && m.quoted.message) {
        let quotedType = Object.keys(m.quoted.message)[0];
        if (quotedType === 'messageContextInfo') quotedType = Object.keys(m.quoted.message)[1];
        if (quotedType === 'imageMessage') {
            isImage = true;
            targetMessage = m.quoted.message.imageMessage;
        }
    }

    if (!isImage) {
        return m.reply(`${EMOJI_ERROR} කරුණාකර ඡායාරූපයකට (Photo) Reply කරමින් කමාන්ඩ් එක භාවිතා කරන්න.\n\n*Usage:* \`.editimg convert to real anime beautiful girl\``);
    }

    if (!prompt) {
        return m.reply(`${EMOJI_ERROR} ඡායාරූපය Edit කළ යුතු ආකාරය (Prompt) ලබා දෙන්න!\n\n*Example:* \`.editimg make it cyberpunk style\``);
    }

    try {
        await safeReact(m, EMOJI_THINKING);
        await client.sendPresenceUpdate('composing', getJid(m));

        // 1. ෆොටෝ එක බාගන්නවා
        let imageBuffer = await downloadMedia(targetMessage, 'image');
        
        // 2. ImgBB එකට අප්ලෝඩ් කරලා ලින්ක් එක ගන්නවා
        let imageUrl = await uploadToImgBB(imageBuffer);

        // 3. උඹ දුන්න NanoBanana API එකට Request එක යවනවා
        const targetUrl = `https://www.movanest.xyz/v2/nanobanana-pub?image_url=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(prompt)}&maxTries=20`;
        
        const response = await axios.get(targetUrl, {
            // Image Generation වලට වෙලා යන නිසා Timeout එක ටිකක් වැඩිපුර දෙනවා (60 තත්පර)
            timeout: 60000, 
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
        });

        // 4. JSON එකෙන් අලුත් ෆොටෝ එකේ ලින්ක් එක ගන්නවා
        let generatedImageUrl = extractImageUrl(response.data);

        if (!generatedImageUrl) {
            throw new Error("API එකෙන් ඡායාරූපයක් ලබා දුන්නේ නැත.");
        }

        // 5. අලුත් HD ෆොටෝ එක සෙන්ඩ් කරනවා!
        await client.sendMessage(getJid(m), { 
            image: { url: generatedImageUrl }, 
            caption: `*✨ NanoBanana AI Editor ✨*\n\n🎯 *Prompt:* ${prompt}` 
        }, { quoted: m });

        await safeReact(m, EMOJI_DONE);

    } catch (error) {
        console.error("editimg command error:", error);
        await safeReact(m, EMOJI_ERROR);
        const errMsg = error?.response?.data?.message || error.message || "Unknown Error";
        return m.reply(`${EMOJI_ERROR} *Image Generation Error:*\n${errMsg}`);
    }
});