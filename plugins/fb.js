const { Sparky, isPublic } = require("../lib");
const axios = require("axios");
const https = require("https");

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

function getStringUrl(field) {
    if (!field) return null;
    if (typeof field === 'string') return field;
    if (typeof field === 'object') return field.url || field.link || null;
    return null;
}

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

    // Flag to track if we already sent a final response (video or error)
    let finalResponseSent = false;

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
            finalResponseSent = true;
            await m.react('❌');
            await client.sendMessage(m.jid, {
                text: "❌ Could not get video URL. The video may be private, deleted, or the API is down."
            }, { quoted: m });
            return;
        }

        await m.react('⬇️');

        const senderName = m.pushName || m.name || "User";
        const caption = `🚀 *SADEW-MD FB DOWNLOADER*\n\n📝 *Title:* ${title}\n\n*Requested by:* ${senderName}`;

        // Send video – this is the main response
        await client.sendMessage(m.jid, {
            video: { url: videoUrl },
            mimetype: "video/mp4",
            caption: caption
        }, { quoted: m });

        // Mark that we successfully sent the video
        finalResponseSent = true;
        await m.react('✅');

    } catch (error) {
        // Only send error if we haven't sent any final response yet
        if (!finalResponseSent) {
            await m.react('❌');
            console.error("FB Error:", error.message);
            let errorMsg = "❌ Could not download the video. Please try again later.";
            if (error.message.includes("404")) errorMsg = "❌ Video not found or it's private.";
            await client.sendMessage(m.jid, { text: errorMsg }, { quoted: m });
        } else {
            // Video already sent, ignore this error silently
            console.log("FB: Video sent successfully, ignoring background error:", error.message);
        }
    }
});
