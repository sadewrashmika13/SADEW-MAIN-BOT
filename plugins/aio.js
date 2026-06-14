// commands/aio.js
const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

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
    desc: "🌐 ඕනෑම social media link එකකින් video/image/audio බාගන්න\nSupported: TikTok, Instagram, YouTube, Twitter, Facebook, Reddit, Pinterest, etc."
}, async ({ client, m, args }) => {
    let url = getQuery(args);
    if (!url) {
        return m.reply(`🌐 *All-in-One Downloader*

*Usage:* ${m.prefix}aio <link>
*Example:* ${m.prefix}aio https://www.tiktok.com/@user/video/123456789

*Supported platforms:* TikTok, Instagram, YouTube, Twitter, Facebook, Reddit, Pinterest, Imgur, etc.`);
    }

    // Validate URL format
    if (!url.startsWith("http")) url = "https://" + url;

    await m.react("⏳");
    await client.sendPresenceUpdate('composing', m.jid);
    await m.reply(`🔍 *Fetching media from:*\n${url}`);

    try {
        // 1. Call the AIO API
        const apiUrl = `${API_BASE}?url=${encodeURIComponent(url)}&apitoken=${API_TOKEN}`;
        const response = await axios.get(apiUrl, { timeout: 20000 });

        // 2. Check API response
        if (!response.data || response.data.Status === false || response.data.Code !== 200) {
            throw new Error(response.data?.Error || "Invalid URL or unsupported platform");
        }

        const result = response.data.Result;
        if (!result || !result.download_url) {
            throw new Error("No download URL found in response");
        }

        const downloadUrl = result.download_url;
        const title = result.title || "Media";
        const quality = result.quality || "HD";
        const type = result.type || "video"; // video, image, audio

        await m.reply(`✅ *${title}* (${quality})\n⬇️ Downloading file...`);

        // 3. Download the actual file
        const fileRes = await axios.get(downloadUrl, {
            responseType: 'arraybuffer',
            timeout: 90000,
            headers: { 'User-Agent': 'Mozilla/5.0' },
            maxRedirects: 5
        });

        const buffer = Buffer.from(fileRes.data);
        const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
        if (buffer.length < 5000) throw new Error("Downloaded file is too small – invalid.");

        // 4. Determine file extension and mime type
        let mimetype = "application/octet-stream";
        let fileName = `${title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}`;

        if (type === "video" || downloadUrl.match(/\.(mp4|mkv|mov|webm)/i)) {
            mimetype = "video/mp4";
            fileName += ".mp4";
        } else if (type === "audio" || downloadUrl.match(/\.(mp3|m4a|wav|ogg)/i)) {
            mimetype = "audio/mpeg";
            fileName += ".mp3";
        } else if (type === "image" || downloadUrl.match(/\.(jpg|jpeg|png|gif|webp)/i)) {
            mimetype = "image/jpeg";
            fileName += ".jpg";
        } else {
            fileName += ".mp4"; // default
        }

        const caption = `🌐 *AIO Downloader*\n📌 *Title:* ${title}\n🎚️ *Quality:* ${quality}\n📦 *Size:* ${fileSizeMB} MB\n\n> *Powered by WhiteShadow API*`;

        // 5. Send the file (as document to avoid any limitations)
        await client.sendMessage(m.jid, {
            document: buffer,
            mimetype: mimetype,
            fileName: fileName,
            caption: caption
        }, { quoted: m });

        await m.react("✅");
        await m.reply(`✅ *Download complete!* ${title} (${fileSizeMB} MB)`);

    } catch (error) {
        console.error("AIO download error:", error);
        await m.react("❌");
        let errorMsg = `❌ *Download failed*\n\n`;
        if (error.message.includes("Invalid URL")) {
            errorMsg += `The link seems invalid or the platform is not supported.\nSupported sites: TikTok, Instagram, YouTube, Twitter, Facebook, Reddit, Pinterest, etc.`;
        } else if (error.message.includes("timeout")) {
            errorMsg += `The download took too long. Please try again later.`;
        } else {
            errorMsg += `Error: ${error.message.substring(0, 150)}`;
        }
        await m.reply(errorMsg);
    }
});
