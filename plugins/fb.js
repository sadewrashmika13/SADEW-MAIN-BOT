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
        const finalUrl = res.request?.res?.responseUrl || res.config?.url || url;
        if (finalUrl && typeof finalUrl === 'string' && finalUrl.startsWith('http')) {
            return finalUrl;
        }
    } catch (e) {}
    return url;
}

Sparky({
    name: "fb",
    fromMe: isPublic,
    category: "downloader",
    desc: "Download Facebook videos - SADEW-MD"
}, async ({ m, client, args }) => {
    if (!args || args.trim() === "") {
        return await client.sendMessage(m.jid, {
            text: "❌ *Usage:* .fb <Facebook video URL>\n\n*Example:* .fb https://www.facebook.com/watch/?v=123"
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
            // 1. Parsing data.result
            if (data.result) {
                if (data.result.media) {
                    videoUrl = data.result.media.video_hd || data.result.media.video_sd;
                    title = data.result.title || data.result.info?.title || title;
                } else if (data.result.url) {
                    videoUrl = data.result.url;
                    title = data.result.title || title;
                } else if (data.result.download) {
                    videoUrl = data.result.download;
                    title = data.result.title || title;
                } else if (data.result.video) {
                    videoUrl = data.result.video;
                    title = data.result.title || title;
                }
            }
            
            // 2. Parsing data.data
            if (!videoUrl && data.data) {
                if (typeof data.data === 'string' && data.data.startsWith('http')) {
                    videoUrl = data.data;
                } else if (data.data.url) {
                    videoUrl = data.data.url;
                    title = data.data.title || title;
                } else if (data.data.download) {
                    videoUrl = data.data.download;
                    title = data.data.title || title;
                } else if (Array.isArray(data.data) && data.data[0]?.url) {
                    videoUrl = data.data[0].url;
                    title = data.data[0].title || title;
                }
            }

            // 3. Parsing Direct fields (handling nested objects)
            if (!videoUrl && data.url) videoUrl = typeof data.url === 'string' ? data.url : data.url?.url;
            if (!videoUrl && data.download) videoUrl = typeof data.download === 'string' ? data.download : data.download?.url || data.download?.link;
            if (!videoUrl && data.video) videoUrl = typeof data.video === 'string' ? data.video : data.video?.url;
            
            if (data.title && title === "Facebook Video") title = data.title;
        }

        if (!videoUrl || (typeof videoUrl === 'string' && !videoUrl.startsWith('http'))) {
            await m.react('❌');
            return await client.sendMessage(m.jid, {
                text: "❌ Could not get video URL. The video may be private, deleted, or the API is down."
            }, { quoted: m });
        }

        await m.react('⬇️');

        const senderName = m.pushName || m.name || "User";
        const caption = `🚀 *SADEW-MD FB DOWNLOADER*\n\n📝 *Title:* ${title}\n\n*Requested by:* ${senderName}`;

        await client.sendMessage(m.jid, {
            video: { url: videoUrl },
            mimetype: "video/mp4",
            caption: caption
        }, { quoted: m });

        await m.react('✅');

    } catch (error) {
        await m.react('❌');
        console.error("FB Error:", error.message);
        let errorText = error.message.includes("timeout")
            ? "⏰ Request timeout. Please try again later."
            : `❌ Error: ${error.message}`;
        await client.sendMessage(m.jid, { text: errorText }, { quoted: m });
    }
});
