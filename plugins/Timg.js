// commands/timg.js
const { Sparky, isPublic } = require("../lib");
const axios = require("axios");
const config = require("../config");

function getQuery(args) {
    if (!args) return "";
    if (Array.isArray(args)) return args.join(" ").trim();
    if (typeof args === "string") return args.trim();
    if (typeof args === "object") return Object.values(args).join(" ").trim();
    return "";
}

function extractVideoUrl(data, apiName) {
    try {
        if (apiName === 'tikwm') return data?.data?.play;
        if (apiName === 'tikmate') return data?.video_url || data?.download_url;
        if (apiName === 'tikvoid') return data?.data?.downloadUrl || data?.downloadUrl;
        if (apiName === 'omkar') return data?.media?.video_url || data?.media?.hd_video_url;
        return null;
    } catch { return null; }
}

function extractMetadata(data, apiName) {
    let song = "Unknown", author = "Unknown";
    try {
        if (apiName === 'tikwm' && data?.data) {
            song = data.data.music_info?.title || data.data.title || "Unknown";
            author = data.data.author?.unique_id || data.data.author?.nickname || "Unknown";
        } else if (apiName === 'tikmate' && data) {
            song = data.title || data.description || "Unknown";
            author = data.author || data.username || "Unknown";
        } else if (apiName === 'tikvoid' && data?.data) {
            song = data.data.title || "Unknown";
            author = data.data.author || "Unknown";
        } else if (apiName === 'omkar' && data) {
            song = data.caption || data.description || "Unknown";
            author = data.author?.unique_id || data.author?.handle || "Unknown";
        }
    } catch (e) {}
    return { song, author };
}

Sparky({
    name: "timg",
    alias: ["ttimg", "slideshow", "ttphoto"],
    category: "download",
    desc: "Download TikTok Photo Slideshow as an Actual Video File"
}, async ({ client, m, args }) => {
    const url = getQuery(args);
    if (!url) return m.reply("_Please provide a TikTok photo slideshow link!\nExample: .timg https://vm.tiktok.com/xxxxxx_");

    await m.react("⏳");
    await client.sendPresenceUpdate('composing', m.jid);

    // API list with configurations
    const APIs = [
        { name: 'TikWM', method: 'GET', endpoint: `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, headers: { 'User-Agent': 'Mozilla/5.0' }, body: null },
        { name: 'TikMate', method: 'GET', endpoint: `https://api.tikmate.app/api/lookup?url=${encodeURIComponent(url)}`, headers: { 'User-Agent': 'Mozilla/5.0' }, body: null },
        { name: 'TikVoidBackend', method: 'POST', endpoint: 'https://tiktok-void-backend.onrender.com/api/download', headers: { 'Content-Type': 'application/json' }, body: { url: url } },
        { name: 'omkar', method: 'GET', endpoint: `https://tiktok-scraper.omkar.cloud/tiktok/videos/details?video_url=${encodeURIComponent(url)}`, headers: { 'User-Agent': 'Mozilla/5.0', 'API-Key': config.OMKAR_API_KEY || "" }, body: null }
    ];

    for (const api of APIs) {
        try {
            console.log(`[TIKTOK] Trying ${api.name}...`);
            const response = await axios({ method: api.method, url: api.endpoint, data: api.body, headers: api.headers, timeout: 15000 });
            const videoUrl = extractVideoUrl(response.data, api.name);
            if (!videoUrl) throw new Error(`No video URL from ${api.name}`);

            const videoRes = await axios.get(videoUrl, { responseType: 'arraybuffer', headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 45000, maxRedirects: 5 });
            const buffer = Buffer.from(videoRes.data);
            if (buffer.length < 5000) throw new Error(`Empty video from ${api.name}`);

            const { song, author } = extractMetadata(response.data, api.name);
            const caption = `🎬 *TikTok Photo Slideshow Converted to Video!*\n\n🎵 *Song:* ${song}\n👤 *Creator:* ${author}\n📸 *Photos converted to video*\n💫 *Watermark removed*\n\n✨ *Powered by ${api.name} API*`;
            await client.sendMessage(m.jid, { video: buffer, caption: caption, mimetype: 'video/mp4' }, { quoted: m });
            await m.react("✅");
            return;
        } catch (err) {
            console.error(`[TIKTOK] ${api.name} failed:`, err.message);
        }
    }

    await m.react("❌");
    m.reply("❌ *මචං, සියලුම TikTok APIs fail වුණා!*\n\n💡 Link එක නිවැරදිද, video public එකක්ද කියලා බලන්න. ටික වෙලාවකින් නැවත try කරන්න.");
});
