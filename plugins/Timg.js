// commands/timg.js
const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

// Helper function to get query from args
function getQuery(args) {
    if (!args) return "";
    if (Array.isArray(args)) return args.join(" ").trim();
    if (typeof args === "string") return args.trim();
    if (typeof args === "object") return Object.values(args).join(" ").trim();
    return "";
}

// Helper to extract video URL from API responses
function extractVideoUrlFromAPI(data, apiName) {
    if (apiName === 'tikwm') return data?.data?.play || null;
    if (apiName === 'tikmate') return data?.video_url || data?.download_url || null;
    if (apiName === 'tikvoid') return data?.data?.downloadUrl || data?.downloadUrl || null;
    if (apiName === 'omkar') return data?.media?.video_url || data?.media?.hd_video_url || null;
    return null;
}

// Helper to extract metadata (title, author) for caption
function extractMetadataForCaption(data, apiName, videoUrl) {
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
    } catch (e) { console.error("Metadata extraction error:", e); }
    return { song, author };
}

Sparky({
    name: "timg",
    alias: ["ttimg", "slideshow", "ttphoto"],
    category: "download",
    desc: "Download TikTok Photo Slideshow as an Actual Video File"
}, async ({ client, m, args }) => {
    const url = getQuery(args);
    if (!url) {
        return m.reply("_Please provide a TikTok photo slideshow link!\nExample: .timg https://vm.tiktok.com/xxxxxx_");
    }

    await m.react("⏳");
    await client.sendPresenceUpdate('composing', m.jid);

    // --- API Configuration Array (Order is priority: best to worst) ---
    const APIs = [
        { name: 'TikWM', endpoint: `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }, dataExtractor: (res) => extractVideoUrlFromAPI(res.data, 'tikwm'), metaExtractor: (res) => extractMetadataForCaption(res.data, 'tikwm', url) },
        { name: 'TikMate', endpoint: `https://api.tikmate.app/api/lookup?url=${encodeURIComponent(url)}`, method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0' }, dataExtractor: (res) => extractVideoUrlFromAPI(res.data, 'tikmate'), metaExtractor: (res) => extractMetadataForCaption(res.data, 'tikmate', url) },
        { name: 'TikVoidBackend', endpoint: `https://tiktok-void-backend.onrender.com/api/download`, method: 'POST', headers: { 'Content-Type': 'application/json' }, dataExtractor: (res) => extractVideoUrlFromAPI(res.data, 'tikvoid'), metaExtractor: (res) => extractMetadataForCaption(res.data, 'tikvoid', url), body: { url: url } },
        { name: 'OmkarCloud', endpoint: `https://tiktok-scraper.omkar.cloud/tiktok/videos/details?video_url=${encodeURIComponent(url)}`, method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0', 'API-Key': process.env.OMKAR_API_KEY || '' }, dataExtractor: (res) => extractVideoUrlFromAPI(res.data, 'omkar'), metaExtractor: (res) => extractMetadataForCaption(res.data, 'omkar', url) }
    ];

    for (const api of APIs) {
        try {
            console.log(`[TIKTOK] Trying API: ${api.name}`);
            const response = await axios({
                method: api.method,
                url: api.endpoint,
                data: api.body || undefined,
                headers: api.headers,
                timeout: 15000
            });

            const videoUrl = api.dataExtractor(response);
            if (!videoUrl) throw new Error(`No video URL found in ${api.name} response.`);

            // Download video as buffer
            const videoRes = await axios.get(videoUrl, {
                responseType: 'arraybuffer',
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 45000,
                maxRedirects: 5
            });
            const buffer = Buffer.from(videoRes.data);
            if (buffer.length < 5000) throw new Error(`Downloaded file is too small (empty video) from ${api.name}`);

            // Extract metadata for caption
            const { song, author } = api.metaExtractor(response);
            const caption = `🎬 *TikTok Photo Slideshow Converted to Video!*\n\n🎵 *Song:* ${song}\n👤 *Creator:* ${author}\n📸 *Photos converted to video*\n💫 *Watermark removed*\n\n✨ *Powered by ${api.name} API*`;

            await client.sendMessage(m.jid, { video: buffer, caption: caption, mimetype: 'video/mp4' }, { quoted: m });
            await m.react("✅");
            return; // Exit loop on success

        } catch (error) {
            console.error(`[TIKTOK] API ${api.name} failed:`, error.message);
            // Continue to next API
        }
    }

    // If all APIs fail
    await m.react("❌");
    m.reply("❌ *මචං, හැම TikTok API එකක්ම fail වුණා!* \n\n💡 *Solutions:*\n1. Link එක නිවැරදිද කියලා බලන්න.\n2. TikTok video එක public එකක්ද කියලා බලන්න.\n3. TikTok website එකෙන් video එකේ link එක copy කරලා බලන්න.\n4. ටික වෙලාවකින් නැවත try කරන්න.");
});
