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

Sparky({
    name: "aio",
    alias: ["alldl", "multidownload"],
    category: "download",
    fromMe: isPublic,
    desc: "🌐 Download video/audio from YouTube, TikTok, Instagram, Twitter, Facebook, etc."
}, async ({ client, m, args }) => {
    let url = getQuery(args);
    if (!url) {
        return m.reply(`🌐 *All-in-One Downloader*

*Usage:* ${m.prefix}aio <link>
*Examples:*
${m.prefix}aio https://www.tiktok.com/@user/video/123456789
${m.prefix}aio https://youtu.be/xxxxx
${m.prefix}aio https://www.instagram.com/p/xxxxx`);
    }
    if (!url.startsWith("http")) url = "https://" + url;

    await m.react("⏳");
    await client.sendPresenceUpdate('composing', m.jid);
    await m.reply(`🔍 *Processing:* ${url}`);

    try {
        // ---------- YOUTUBE ----------
        if (url.includes("youtube.com") || url.includes("youtu.be")) {
            try {
                // Get video info
                const info = await ytdl.getInfo(url);
                const title = info.videoDetails.title;
                const durationSec = parseInt(info.videoDetails.lengthSeconds);
                const isLong = durationSec > 300; // 5 minutes

                // Choose best format (video+audio combined)
                let format = ytdl.chooseFormat(info.formats, {
                    quality: isLong ? 'lowest' : 'highest',
                    filter: 'videoandaudio'
                });
                if (!format) {
                    // Fallback: video only (will still work)
                    format = ytdl.chooseFormat(info.formats, {
                        quality: isLong ? 'lowest' : 'highest',
                        filter: 'video'
                    });
                }
                if (!format) throw new Error('No suitable format found');

                const qualityLabel = isLong ? "480p (30fps)" : "720p (30fps)";
                await m.reply(`📹 *${title}* (${qualityLabel} | ~${Math.round(durationSec/60)} min)\n⬇️ Downloading...`);

                // Download with proper headers and buffer
                const stream = ytdl(url, {
                    format: format,
                    requestOptions: {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept-Language': 'en-US,en;q=0.9',
                        }
                    },
                    highWaterMark: 1 << 25, // 32MB buffer
                });

                const chunks = [];
                for await (const chunk of stream) chunks.push(chunk);
                const buffer = Buffer.concat(chunks);
                const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
                const fileName = `${title.replace(/[^a-z0-9]/gi, '_')}.mp4`;
                const caption = `🎬 *YouTube*\n📹 *${title}*\n🎚️ *Quality:* ${qualityLabel}\n📦 *Size:* ${fileSizeMB} MB\n\n> *Downloaded with ytdl-core*`;

                await client.sendMessage(m.jid, {
                    video: buffer,
                    caption: caption,
                    mimetype: "video/mp4"
                }, { quoted: m });

                await m.react("✅");
                await m.reply(`✅ *Download complete!* (${fileSizeMB} MB)`);
                return;
            } catch (ytError) {
                console.error("YouTube error:", ytError);
                throw new Error(`YouTube download failed: ${ytError.message.substring(0, 100)}`);
            }
        }

        // ---------- ALL OTHER PLATFORMS (via API) ----------
        const apiUrl = `${API_BASE}?url=${encodeURIComponent(url)}&apitoken=${API_TOKEN}`;
        const response = await axios.get(apiUrl, { timeout: 20000 });
        const data = response.data;

        if (!data || data.Status !== true || data.Code !== 200) {
            throw new Error(data?.Error || "API error (unsupported platform or invalid link)");
        }

        const result = data.Result;
        if (!result || result.type !== "multiple" || !result.medias || result.medias.length === 0) {
            throw new Error("No media found");
        }

        // Select best video (prioritise no_watermark / hd_no_watermark)
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

        if (!bestVideo) throw new Error("No video URL found");

        const videoUrl = bestVideo.url;
        const quality = bestVideo.quality || "HD";
        const title = result.title || "Media";
        const author = result.author || result.unique_id || "Unknown";

        await m.reply(`✅ *${title}* by @${author}\n🎚️ *Quality:* ${quality}\n⬇️ Downloading video...`);

        const videoRes = await axios.get(videoUrl, {
            responseType: 'arraybuffer',
            timeout: 60000,
            headers: { 'User-Agent': 'Mozilla/5.0' },
            maxRedirects: 5
        });
        const buffer = Buffer.from(videoRes.data);
        const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
        const caption = `🌐 *${title}*\n👤 *Author:* ${author}\n🎚️ *Quality:* ${quality}\n📦 *Size:* ${fileSizeMB} MB\n\n> *AIO Downloader*`;

        await client.sendMessage(m.jid, {
            video: buffer,
            caption: caption,
            mimetype: "video/mp4"
        }, { quoted: m });

        // Send audio if available (e.g., TikTok original sound)
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
        if (error.message.includes("YouTube")) {
            errorMsg += `YouTube error: ${error.message}\nTry a different video or use another source.`;
        } else if (error.message.includes("API error") || error.message.includes("No media")) {
            errorMsg += `Unsupported link or platform.\nSupported: YouTube, TikTok, Instagram, Twitter, Facebook, Reddit, Pinterest, etc.`;
        } else {
            errorMsg += `Error: ${error.message.substring(0, 150)}`;
        }
        await m.reply(errorMsg);
    }
});
