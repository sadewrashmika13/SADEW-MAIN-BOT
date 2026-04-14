const { Sparky, isPublic } = require("../lib");
const axios = require("axios");
const FormData = require("form-data");
const https = require("https");

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const API_KEY = "f8deeb99a26a9666731c6b5dede05914c64ab64ca9b4cfeee8859408a3f9ce30";
const API_URL = "https://back.asitha.top/api/nanobanana";

async function uploadToTelegraph(buffer) {
    const form = new FormData();
    form.append("file", buffer, { filename: "image.jpg" });
    const res = await axios.post("https://telegra.ph/upload", form, {
        headers: form.getHeaders(),
        httpsAgent,
        timeout: 30000
    });
    if (!res.data?.[0]?.src) throw new Error("Telegraph upload failed");
    return "https://telegra.ph" + res.data[0].src;
}

Sparky({
    name: "imgedit",
    fromMe: isPublic,
    category: "ai",
    desc: "AI මගින් රූප වෙනස් කිරීමට (Nano Banana)"
}, async ({ m, client, args }) => {
    // Get the quoted message (the image)
    const quoted = m.quoted || m;
    const mime = (quoted.msg || quoted).mimetype || '';

    if (!mime.startsWith('image/')) {
        return await client.sendMessage(
            m.jid,
            { text: "❌ Reply to an image with `.imgedit <prompt>`\nExample: `.imgedit cinematic portrait`" },
            { quoted: m }
        );
    }

    const prompt = args?.trim();
    if (!prompt) {
        return await client.sendMessage(
            m.jid,
            { text: "❌ Please provide an editing prompt.\nExample: `.imgedit cyberpunk style`" },
            { quoted: m }
        );
    }

    await m.react('⏳');

    try {
        // Download image - support both Sparky methods
        let buffer;
        if (typeof quoted.download === 'function') {
            buffer = await quoted.download();
        } else if (client.downloadMediaMessage) {
            buffer = await client.downloadMediaMessage(quoted);
        } else {
            throw new Error("Cannot download media");
        }

        if (!buffer || buffer.length === 0) throw new Error("Empty image buffer");

        await m.react('📤');
        const imageUrl = await uploadToTelegraph(buffer);

        await m.react('🎨');
        const response = await axios.get(API_URL, {
            params: { prompt, imageUrl },
            headers: { 'Authorization': `Bearer ${API_KEY}` },
            httpsAgent,
            timeout: 60000
        });

        const resultUrl = response.data?.imageUrl || response.data?.url;
        if (!resultUrl) throw new Error("No image URL in API response");

        // Download the result (to avoid broken external links)
        const resultBuffer = await axios.get(resultUrl, {
            httpsAgent,
            responseType: 'arraybuffer',
            timeout: 30000
        }).then(r => Buffer.from(r.data));

        await client.sendMessage(m.jid, {
            image: resultBuffer,
            caption: `✨ *AI Image Edit*\n🎨 Prompt: ${prompt}\n🚀 Powered by X-BOT-MD`
        }, { quoted: m });

        await m.react('✅');
    } catch (error) {
        await m.react('❌');
        console.error("imgedit error:", error);
        let errMsg = error.message.includes("timeout") ? "⏰ Timeout. Try again." : `❌ ${error.message}`;
        await client.sendMessage(m.jid, { text: errMsg }, { quoted: m });
    }
});
