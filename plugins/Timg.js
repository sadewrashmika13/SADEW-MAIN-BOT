// commands/timg.js
const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

// Helper: follow redirects and get final video URL
async function getFinalVideoUrl(url) {
    try {
        const response = await axios.head(url, {
            maxRedirects: 5,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 10000
        });
        return response.request.res.responseUrl || url;
    } catch (e) {
        return url;
    }
}

Sparky({
    name: "timg",
    alias: ["ttimg", "slideshow", "ttphoto"],
    category: "download",
    desc: "Download TikTok Photo Slideshow as an Actual Video File"
}, async ({ client, m, args }) => {
    let url = (args && Array.isArray(args)) ? args.join(" ").trim() : (typeof args === "string" ? args.trim() : "");
    if (!url) {
        return m.reply("_Please provide a TikTok photo slideshow link!\nExample: .timg https://vm.tiktok.com/xxxxxx_");
    }

    await m.react("⏳");
    await client.sendPresenceUpdate('composing', m.jid);

    try {
        // ---- Primary API: tikwm.com ----
        const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
        console.log(`[TIKTOK] Fetching from tikwm.com: ${apiUrl}`);
        const response = await axios.get(apiUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000
        });

        const data = response.data;
        if (!data || data.code !== 0 || !data.data) {
            throw new Error("Invalid response from tikwm.com");
        }

        let videoUrl = data.data.play;
        if (!videoUrl) {
            throw new Error("No video URL found (maybe not a slideshow?)");
        }

        // Follow redirects to get real video URL
        videoUrl = await getFinalVideoUrl(videoUrl);
        console.log(`[TIKTOK] Final video URL: ${videoUrl}`);

        // Download the video as buffer
        const videoRes = await axios.get(videoUrl, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 30000,
            maxRedirects: 5
        });

        const buffer = Buffer.from(videoRes.data);
        if (buffer.length < 5000) {
            throw new Error("Downloaded file is too small (empty video)");
        }

        const caption = `🎬 *TikTok Photo Slideshow Converted to Video!*\n\n` +
                        `🎵 *Song:* ${data.data.music_info?.title || "Unknown"}\n` +
                        `👤 *Creator:* ${data.data.author?.nickname || "Unknown"}\n` +
                        `📸 *Photos converted to video*\n` +
                        `💫 *Watermark removed*`;

        await client.sendMessage(m.jid, {
            video: buffer,
            caption: caption,
            mimetype: 'video/mp4'
        }, { quoted: m });

        await m.react("✅");

    } catch (error) {
        console.error("[TIKTOK ERROR] Primary API failed:", error.message);
        await m.react("❌");
        
        // ---- Fallback API: tikmate.app ----
        try {
            console.log("[TIKTOK] Trying fallback API: tikmate.app");
            const fallbackUrl = `https://api.tikmate.app/api/lookup?url=${encodeURIComponent(url)}`;
            const fallbackRes = await axios.get(fallbackUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 15000
            });
            const videoUrl = fallbackRes.data?.video_url;
            if (!videoUrl) throw new Error("No video URL from fallback");

            const videoRes = await axios.get(videoUrl, {
                responseType: 'arraybuffer',
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 30000
            });
            const buffer = Buffer.from(videoRes.data);
            if (buffer.length < 5000) throw new Error("Empty video from fallback");

            const caption = `🎬 *TikTok Slideshow (fallback API)*\n💫 *Watermark removed*`;
            await client.sendMessage(m.jid, { video: buffer, caption: caption, mimetype: 'video/mp4' }, { quoted: m });
            await m.react("✅");
            return;
        } catch (fallbackErr) {
            console.error("[TIKTOK] Fallback also failed:", fallbackErr.message);
        }

        m.reply(`❌ *Failed to download the slideshow.*\n\n📝 Error: ${error.message.substring(0, 100)}\n\n💡 Try again later or use a different link.`);
    }
});
