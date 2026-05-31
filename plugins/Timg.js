// commands/timg.js
const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

// Helper to get the final video URL (follow redirects)
async function getFinalUrl(url) {
    try {
        const response = await axios.head(url, {
            maxRedirects: 5,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        return response.request.res.responseUrl || url;
    } catch {
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
        // ---- 1. Use tikwm.com API ----
        console.log("Fetching TikTok data from tikwm.com...");
        const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000
        });

        const data = response.data;
        if (!data || data.code !== 0 || !data.data) {
            throw new Error("Invalid response from tikwm.com");
        }

        const videoUrl = data.data.play;
        if (!videoUrl) {
            throw new Error("No video URL found (maybe not a slideshow?)");
        }

        // Follow redirects to get the real video URL
        const finalVideoUrl = await getFinalUrl(videoUrl);
        console.log(`Final video URL: ${finalVideoUrl}`);

        // ---- 2. Download the video as a buffer ----
        const videoResponse = await axios.get(finalVideoUrl, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 30000,
            maxRedirects: 5
        });

        const videoBuffer = Buffer.from(videoResponse.data);
        if (videoBuffer.length < 1000) {
            throw new Error("Downloaded file is too small (empty video)");
        }

        // ---- 3. Send the video ----
        const caption = `🎬 *TikTok Photo Slideshow Converted to Video!*\n\n` +
                        `🎵 *Music:* ${data.data.music_info?.title || "Unknown"}\n` +
                        `👤 *Creator:* ${data.data.author?.nickname || "Unknown"}\n` +
                        `📸 *Photos converted to video*\n` +
                        `💫 *Watermark removed*`;

        await client.sendMessage(m.jid, {
            video: videoBuffer,
            caption: caption,
            mimetype: 'video/mp4'
        }, { quoted: m });

        await m.react("✅");

    } catch (error) {
        console.error("TikTok slideshow error:", error);
        await m.react("❌");
        m.reply(`❌ *Failed to download the slideshow.*\n\n📝 Error: ${error.message.substring(0, 100)}\n\n💡 Try again later or use a different link.`);
    }
});
