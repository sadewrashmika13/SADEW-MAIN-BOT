const { Sparky, isPublic } = require("../lib");
const axios = require("axios");
const https = require("https");

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function resolveUrl(url) {
    try {
        const res = await axios.get(url, {
            timeout: 20000,
            maxRedirects: 10,
            httpsAgent,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        return res.config?.url || url;
    } catch (e) {
        return url;
    }
}

function getStringUrl(field) {
    if (!field) return null;
    if (typeof field === 'string') return field;
    if (typeof field === 'object') return field.url || field.link || null;
    return null;
}

Sparky({
    name: "fb2",
    fromMe: isPublic,
    category: "downloader",
    desc: "Facebook video downloader (Alternative) - SADEW-MD"
}, async ({ m, client, args }) => {
    if (!args || args.trim() === "") {
        return await client.sendMessage(m.jid, {
            text: "❌ *Usage:* .fb2 <Facebook video URL>\n\n*Example:* .fb2 https://www.facebook.com/watch/?v=123"
        }, { quoted: m });
    }

    let url = args.trim();
    if (!url.includes("facebook.com") && !url.includes("fb.watch")) {
        return await client.sendMessage(m.jid, {
            text: "❌ Please provide a valid Facebook link."
        }, { quoted: m });
    }

    await m.react('🔄');

    try {
        const resolvedUrl = await resolveUrl(url);
        const apiUrl = `https://api.hanggts.xyz/download/facebook?url=${encodeURIComponent(resolvedUrl)}`;
        const response = await axios.get(apiUrl, {
            timeout: 30000,
            httpsAgent,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const data = response.data;
        let videoUrl = null;
        let title = "Facebook Video";

        if (data) {
            if (data.result) {
                if (data.result.media) {
                    videoUrl = getStringUrl(data.result.media.video_hd) || getStringUrl(data.result.media.video_sd);
                    title = data.result.title || data.result.info?.title || title;
                }
                if (!videoUrl) videoUrl = getStringUrl(data.result.url);
                if (!videoUrl) videoUrl = getStringUrl(data.result.download);
                if (!videoUrl) videoUrl = getStringUrl(data.result.video);
                if (data.result.title && title === "Facebook Video") title = data.result.title;
            }
            if (!videoUrl && data.data) {
                videoUrl = getStringUrl(data.data) || getStringUrl(data.data.url) || getStringUrl(data.data.download);
                if (data.data.title && title === "Facebook Video") title = data.data.title;
            }
            if (!videoUrl) videoUrl = getStringUrl(data.url) || getStringUrl(data.download) || getStringUrl(data.video);
            if (data.title && title === "Facebook Video") title = data.title;
        }

        if (!videoUrl || !videoUrl.startsWith('http')) {
            await m.react('❌');
            return await client.sendMessage(m.jid, {
                text: "❌ Could not get video URL. The video may be private, deleted, or the API is down."
            }, { quoted: m });
        }

        await m.react('⬇️');

        const senderName = m.pushName || m.name || "User";
        const caption = `🚀 *SADEW-MD FB DOWNLOADER (fb2)*\n\n📝 *Title:* ${title}\n\n*Requested by:* ${senderName}`;

        await client.sendMessage(m.jid, {
            video: { url: videoUrl },
            mimetype: "video/mp4",
            caption: caption
        }, { quoted: m });

        await m.react('✅');

    } catch (error) {
        await m.react('❌');
        console.error("FB2 Error:", error.message);
        let errorText = error.message.includes("timeout")
            ? "⏰ Request timeout. Please try again later."
            : `❌ Error: ${error.message}`;
        await client.sendMessage(m.jid, { text: errorText }, { quoted: m });
    }
});
