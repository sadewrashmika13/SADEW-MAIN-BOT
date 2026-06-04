// commands/movie.js
const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

const API_KEY = "zan_FIAO7Ayh_eo1vllkep6";
const API_BASE = "https://api.zanta-mini.store/api/sinhalasub";

function getQuery(args) {
    if (!args) return "";
    if (Array.isArray(args)) return args.join(" ").trim();
    if (typeof args === "string") return args.trim();
    if (typeof args === "object") return Object.values(args).join(" ").trim();
    return "";
}

if (!global.movieSessions) global.movieSessions = new Map();

// Helper to wait a bit
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Main search command
Sparky({
    name: "movie",
    alias: ["cinema", "films"],
    category: "download",
    fromMe: isPublic,
    desc: "🎬 සිංහල චිත්‍රපට සොයා සෘජුවම WhatsApp වෙත යවන්න"
}, async ({ client, m, args }) => {
    const query = getQuery(args);
    if (!query) {
        return m.reply(`🎬 *සිංහල චිත්‍රපට සෙවුම*

*Usage:* ${m.prefix}movie <movie name>
*Example:* ${m.prefix}movie kishkindha

*After search, select a number:* ${m.prefix}movie <number>
*Then choose quality:* ${m.prefix}movie <quality number>`);
    }

    const session = global.movieSessions.get(m.sender);

    // Step 3: User chooses quality number
    if (session && session.step === "awaiting_quality" && !isNaN(query)) {
        const qualIdx = parseInt(query) - 1;
        if (qualIdx < 0 || qualIdx >= session.videoLinks.length) {
            return m.reply(`❌ Invalid quality number. Choose 1-${session.videoLinks.length}.`);
        }
        const selected = session.videoLinks[qualIdx];
        await downloadAndSend(client, m, selected.direct_link, session.movieTitle, selected.quality, session.subtitleLink);
        global.movieSessions.delete(m.sender);
        return;
    }

    // Step 2: User chooses movie number → fetch quality options
    const existing = global.movieSessions.get(m.sender);
    if (existing && existing.step === "awaiting_download" && !isNaN(query)) {
        const idx = parseInt(query) - 1;
        if (idx < 0 || idx >= existing.results.length) {
            return m.reply(`❌ Invalid number. Choose 1-${existing.results.length}.`);
        }
        const selected = existing.results[idx];
        await fetchQualityOptions(client, m, selected.url, selected.title);
        global.movieSessions.delete(m.sender);
        return;
    }

    // Step 1: Search
    await m.react("🔍");
    await client.sendPresenceUpdate('composing', m.jid);
    await m.reply(`🔎 Searching for "${query}"...`);

    try {
        const searchUrl = `${API_BASE}/search?apiKey=${API_KEY}&text=${encodeURIComponent(query)}`;
        const { data } = await axios.get(searchUrl, { timeout: 15000 });

        if (!data?.success || !data?.results?.length) {
            await m.react("❌");
            return m.reply(`❌ No results found for "${query}".`);
        }

        const results = data.results.slice(0, 8);
        let listMsg = `🎬 *සිංහල උපසිරැසි ප්‍රතිඵල*\n🔍 *${query}*\n📊 Found: ${results.length}\n\n`;
        results.forEach((movie, i) => {
            listMsg += `${i+1}. *${movie.title}*\n\n`;
        });
        listMsg += `📌 *To see qualities:* ${m.prefix}movie <number>\nExample: ${m.prefix}movie 1`;

        await client.sendMessage(m.jid, { text: listMsg }, { quoted: m });

        global.movieSessions.set(m.sender, {
            step: "awaiting_download",
            results: results,
            timestamp: Date.now()
        });
        setTimeout(() => global.movieSessions.delete(m.sender), 5 * 60 * 1000);

        await m.react("✅");
    } catch (err) {
        console.error("Search error:", err);
        await m.react("❌");
        m.reply(`❌ Search failed: ${err.message.substring(0, 100)}`);
    }
});

// Fetch quality options (video links + subtitle)
async function fetchQualityOptions(client, m, movieUrl, title) {
    await m.react("⏳");
    await client.sendPresenceUpdate('composing', m.jid);
    await m.reply(`📥 Fetching download options for *${title}*...`);

    try {
        const dlUrl = `${API_BASE}/dl?apiKey=${API_KEY}&text=${encodeURIComponent(movieUrl)}`;
        const { data } = await axios.get(dlUrl, { timeout: 15000 });

        if (!data?.success || !data?.results?.links?.length) {
            await m.react("❌");
            return m.reply(`❌ No download links found for "${title}".`);
        }

        const links = data.results.links;
        const videoLinks = links.filter(l => l.quality !== "Subtitles");
        const subLink = links.find(l => l.quality === "Subtitles");

        if (videoLinks.length === 0) {
            await m.react("❌");
            return m.reply(`❌ No video links available.`);
        }

        let qualMsg = `🎬 *${title}*\n📥 *Choose quality:*\n\n`;
        videoLinks.forEach((link, i) => {
            qualMsg += `${i+1}. *${link.quality}* (${link.size || 'N/A'})\n`;
        });
        qualMsg += `\n📌 *Reply with number:* ${m.prefix}movie <number>\nExample: ${m.prefix}movie 1`;

        await client.sendMessage(m.jid, { text: qualMsg }, { quoted: m });

        global.movieSessions.set(m.sender, {
            step: "awaiting_quality",
            videoLinks: videoLinks,
            subtitleLink: subLink ? subLink.direct_link : null,
            movieTitle: title,
            timestamp: Date.now()
        });
        setTimeout(() => global.movieSessions.delete(m.sender), 5 * 60 * 1000);

        await m.react("✅");
    } catch (err) {
        console.error("Quality fetch error:", err);
        await m.react("❌");
        m.reply(`❌ Failed to fetch options: ${err.message.substring(0, 100)}`);
    }
}

// Download and send the actual file
async function downloadAndSend(client, m, downloadUrl, title, quality, subtitleLink) {
    await m.react("⏳");
    await m.reply(`⬇️ Downloading *${title}* (${quality})...\nThis may take a while for large files.`);

    try {
        // Download the file as buffer
        const response = await axios.get(downloadUrl, {
            responseType: 'arraybuffer',
            timeout: 120000, // 2 minutes
            headers: { 'User-Agent': 'Mozilla/5.0' },
            maxRedirects: 5
        });

        const buffer = Buffer.from(response.data);
        const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);

        if (buffer.length < 1_000_000) { // less than 1MB → suspicious
            throw new Error(`File too small (${fileSizeMB} MB). Link may be invalid.`);
        }

        const fileName = `${title.replace(/[^a-z0-9]/gi, '_')}_${quality}.mp4`;
        let caption = `🎬 *${title}*\n📀 Quality: ${quality}\n📦 Size: ${fileSizeMB} MB`;
        if (subtitleLink) caption += `\n📝 *Subtitles:* ${subtitleLink}`;
        caption += `\n\n> *Direct download via SADEW-MINI*`;

        // Send as document (works for large files, up to ~2GB)
        await client.sendMessage(m.jid, {
            document: buffer,
            mimetype: "video/mp4",
            fileName: fileName,
            caption: caption
        }, { quoted: m });

        await m.react("✅");
        await m.reply(`✅ *${title}* (${quality}) sent successfully!`);
    } catch (err) {
        console.error("Download/send error:", err);
        await m.react("❌");
        let errorMsg = `❌ *Download failed*\n\n`;
        if (err.message.includes("timeout")) {
            errorMsg += `The file is too large or the server is slow. Try again with a lower quality.`;
        } else {
            errorMsg += `Error: ${err.message.substring(0, 100)}`;
        }
        await m.reply(errorMsg);
    }
}
