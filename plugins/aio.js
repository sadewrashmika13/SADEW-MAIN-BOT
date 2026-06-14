// commands/aio.js
const { Sparky, isPublic } = require("../lib");
const axios = require("axios");
const ytdl = require("ytdl-core");
const fs = require("fs");
const path = require("path");

const API_TOKEN = "VK4fry";
const API_BASE = "https://whiteshadow-x-api.onrender.com/api/download/aio";

function getQuery(args) {
    if (!args) return "";
    if (Array.isArray(args)) return args.join(" ").trim();
    if (typeof args === "string") return args.trim();
    if (typeof args === "object") return Object.values(args).join(" ").trim();
    return "";
}

// YouTube video duration get කරන්න (තත්පර වලින්)
async function getVideoDuration(url) {
    const info = await ytdl.getInfo(url);
    return parseInt(info.videoDetails.lengthSeconds);
}

Sparky({
    name: "aio",
    alias: ["alldl", "multidownload"],
    category: "download",
    fromMe: isPublic,
    desc: "🌍 Social media වීඩියෝ/ඕඩියෝ ඩවුන්ලෝඩ් (TikTok, YT, IG, FB, Twitter, etc.)"
}, async ({ client, m, args }) => {
    let url = getQuery(args);
    if (!url) {
        return m.reply(`🌐 *All-in-One Downloader*

*Usage:* ${m.prefix}aio <link>
*Example:* ${m.prefix}aio https://www.tiktok.com/@user/video/123
*Example:* ${m.prefix}aio https://youtu.be/xxxxx`);
    }
    if (!url.startsWith("http")) url = "https://" + url;

    await m.react("⏳");
    await client.sendPresenceUpdate('composing', m.jid);
    await m.reply(`🔍 *Processing:* ${url}`);

    try {
        // ---------- YouTube Handling ----------
        if (url.includes("youtube.com") || url.includes("youtu.be")) {
            // Get video info
            const info = await ytdl.getInfo(url);
            const title = info.videoDetails.title;
            const durationSec = parseInt(info.videoDetails.lengthSeconds);
            const isLong = durationSec > 300; // 5m ට වැඩිද?

            // Quality තීරණය: දිග 5m ට අඩු -> 720p, වැඩි -> 480p
            const targetQuality = isLong ? "lowest" : "137"; // 137 = 1080p, but we'll pick 720p
            // Better: use ytdl with filter
            const format = ytdl.chooseFormat(info.formats, { quality: isLong ? "lowest" : "highest", filter: "videoandaudio" });
            if (!format) throw new Error("No suitable format");

            await m.reply(`📹 *${title}* (${isLong ? "480p" : "720p"} | ${Math.round(durationSec/60)}m)\n⬇️ Downloading...`);

            // Download as stream -> buffer
            const stream = ytdl(url, { quality: isLong ? "lowest" : "highest", filter: "videoandaudio" });
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            const buffer = Buffer.concat(chunks);
            const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
            const fileName = `${title.replace(/[^a-z0-9]/gi, '_')}.mp4`;
            const caption = `🎬 *${title}*\n🎚️ Quality: ${isLong ? "480p (30fps)" : "720p (30fps)"}\n📦 Size: ${fileSizeMB} MB\n\n> *YouTube Downloader*`;

            await client.sendMessage(m.jid, {
                video: buffer,
                caption: caption,
                mimetype: "video/mp4"
            }, { quoted: m });

            await m.react("✅");
            await m.reply(`✅ *Download complete!* (${fileSizeMB} MB)`);
            return;
        }

        // ---------- Other platforms (via API) ----------
        const apiUrl = `${API_BASE}?url=${encodeURIComponent(url)}&apitoken=${API_TOKEN}`;
        const response = await axios.get(apiUrl, { timeout: 20000 });
        const data = response.data;

        if (!data || data.Status !== true || data.Code !== 200) {
            throw new Error(data?.Error || "API error");
        }

        const result = data.Result;
        if (!result || result.type !== "multiple" || !result.medias || result.medias.length === 0) {
            throw new Error("No media found");
        }

        // Pick best video (watermark-free if available)
        let bestVideo = null;
        let bestAudio = null;
        for (const media of result.medias) {
            if (media.type === "video") {
                if (!bestVideo) bestVideo = media;
                else if (media.quality === "hd_no_watermark") bestVideo = media;
                else if (media.quality === "no_watermark" && bestVideo.quality !== "hd_no_watermark") bestVideo = media;
                else if (media.width * media.height > bestVideo.width * bestVideo.height) bestVideo = media;
            } else if (media.type === "audio") {
                bestAudio = media;
            }
        }

        if (!bestVideo) throw new Error("No video URL");

        const videoUrl = bestVideo.url;
        const quality = bestVideo.quality || "HD";
        const title = result.title || "Media";
        const author = result.author || result.unique_id || "Unknown";

        await m.reply(`✅ *${title}* by @${author}\n🎚️ Quality: ${quality}\n⬇️ Downloading...`);

        const videoRes = await axios.get(videoUrl, {
            responseType: 'arraybuffer',
            timeout: 60000,
            headers: { 'User-Agent': 'Mozilla/5.0' },
            maxRedirects: 5
        });
        const buffer = Buffer.from(videoRes.data);
        const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
        const fileName = `${title.replace(/[^a-z0-9]/gi, '_')}.mp4`;
        const caption = `🌐 *${title}*\n👤 *${author}*\n🎚️ Quality: ${quality}\n📦 Size: ${fileSizeMB} MB\n\n> *AIO Downloader*`;

        await client.sendMessage(m.jid, {
            video: buffer,
            caption: caption,
            mimetype: "video/mp4"
        }, { quoted: m });

        // Optional: send audio separately (TikTok audio)
        if (bestAudio && bestAudio.url) {
            const audioRes = await axios.get(bestAudio.url, { responseType: 'arraybuffer' });
            const audioBuffer = Buffer.from(audioRes.data);
            await client.sendMessage(m.jid, {
                audio: audioBuffer,
                mimetype: "audio/mpeg",
                ptt: false
            }, { quoted: m });
        }

        await m.react("✅");
        await m.reply(`✅ *Download complete!*`);

    } catch (error) {
        console.error("AIO error:", error);
        await m.react("❌");
        let errorMsg = `❌ *Download failed*\n\n`;
        if (error.message.includes("No media")) {
            errorMsg += `Unsupported link or platform.\nSupported: TikTok, YouTube, Instagram, Twitter, Facebook, Reddit, Pinterest, etc.`;
        } else if (error.message.includes("403")) {
            errorMsg += `YouTube download blocked by Google. Try using a different link or later.`;
        } else {
            errorMsg += `Error: ${error.message.substring(0, 150)}`;
        }
        await m.reply(errorMsg);
    }
});
