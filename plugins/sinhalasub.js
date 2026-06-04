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

// Prioritized server order (best first)
const SERVER_PRIORITY = ["Pixeldrain", "FilesPayout", "DLServer-01", "DLServer-02", "Telagram"];

function getBestLinkForQuality(links, targetQuality) {
    // Filter links that match the quality (e.g., "HD 720p" or "SD 480p")
    const matched = links.filter(link => link.size === targetQuality);
    if (matched.length === 0) return null;
    // Sort by priority
    matched.sort((a, b) => {
        const aIdx = SERVER_PRIORITY.indexOf(a.quality);
        const bIdx = SERVER_PRIORITY.indexOf(b.quality);
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
    });
    return matched[0].direct_link;
}

Sparky({
    name: "movie",
    alias: ["cinema", "films"],
    category: "download",
    fromMe: isPublic,
    desc: "🎬 සිංහල චිත්‍රපට සොයා සෘජුවම බාගන්න (720p/480p)"
}, async ({ client, m, args }) => {
    const query = getQuery(args);
    if (!query) {
        return m.reply(`🎬 *සිංහල චිත්‍රපට සෙවුම*

*Usage:* ${m.prefix}movie <movie name>
*Example:* ${m.prefix}movie kishkindha

*After search:* ${m.prefix}movie <number>
*Then choose quality:* ${m.prefix}movie 1 (720p) හෝ ${m.prefix}movie 2 (480p)`);
    }

    const session = global.movieSessions.get(m.sender);

    // Step 3: Choose quality (1=720p, 2=480p)
    if (session && session.step === "awaiting_quality" && (query === "1" || query === "2")) {
        const quality = query === "1" ? "HD 720p" : "SD 480p";
        const selectedLink = getBestLinkForQuality(session.allLinks, quality);
        if (!selectedLink) {
            return m.reply(`❌ No ${quality} link available for this movie.`);
        }
        await downloadAndSend(client, m, selectedLink, session.movieTitle, quality, session.subtitleLink);
        global.movieSessions.delete(m.sender);
        return;
    }

    // Step 2: Choose movie number → fetch links and show quality options
    if (session && session.step === "awaiting_movie" && !isNaN(query)) {
        const idx = parseInt(query) - 1;
        if (idx < 0 || idx >= session.results.length) {
            return m.reply(`❌ Invalid number. Choose 1-${session.results.length}.`);
        }
        const selected = session.results[idx];
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
        let listMsg = `🎬 *සිංහල චිත්‍රපට ප්‍රතිඵල*\n🔍 *${query}*\n📊 Found: ${results.length}\n\n`;
        results.forEach((movie, i) => {
            listMsg += `${i+1}. *${movie.title}*\n`;
        });
        listMsg += `\n📌 *To see available qualities:* ${m.prefix}movie <number>\nExample: ${m.prefix}movie 1`;

        await client.sendMessage(m.jid, { text: listMsg }, { quoted: m });

        global.movieSessions.set(m.sender, {
            step: "awaiting_movie",
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

        const allLinks = data.results.links;
        const videoLinks = allLinks.filter(l => l.quality !== "Subtitles");
        const subLink = allLinks.find(l => l.quality === "Subtitles");

        // Check available qualities
        const has720p = videoLinks.some(l => l.size === "HD 720p");
        const has480p = videoLinks.some(l => l.size === "SD 480p");

        if (!has720p && !has480p) {
            await m.react("❌");
            return m.reply(`❌ No standard qualities (720p/480p) found.`);
        }

        let qualMsg = `🎬 *${title}*\n📥 *Choose quality:*\n\n`;
        if (has720p) qualMsg += `1. *720p* (HD) – Recommended for faster download\n`;
        if (has480p) qualMsg += `2. *480p* (SD) – Smaller file\n`;
        qualMsg += `\n📌 *Reply with:* ${m.prefix}movie 1 (for 720p) or ${m.prefix}movie 2 (for 480p)`;

        await client.sendMessage(m.jid, { text: qualMsg }, { quoted: m });

        global.movieSessions.set(m.sender, {
            step: "awaiting_quality",
            allLinks: videoLinks,
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

async function downloadAndSend(client, m, downloadUrl, title, quality, subtitleLink) {
    await m.react("⏳");
    await m.reply(`⬇️ Downloading *${title}* (${quality})...\nThis may take a moment depending on file size.`);

    try {
        const response = await axios.get(downloadUrl, {
            responseType: 'arraybuffer',
            timeout: 120000,
            headers: { 'User-Agent': 'Mozilla/5.0' },
            maxRedirects: 5
        });

        const buffer = Buffer.from(response.data);
        const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);

        if (buffer.length < 500000) {
            throw new Error(`File too small (${fileSizeMB} MB). Link may be invalid.`);
        }

        const fileName = `${title.replace(/[^a-z0-9]/gi, '_')}_${quality}.mp4`;
        let caption = `🎬 *${title}*\n📀 Quality: ${quality}\n📦 Size: ${fileSizeMB} MB`;
        if (subtitleLink) caption += `\n📝 *Subtitles:* ${subtitleLink}`;
        caption += `\n\n> *Direct download via SADEW-MINI*`;

        await client.sendMessage(m.jid, {
            document: buffer,
            mimetype: "video/mp4",
            fileName: fileName,
            caption: caption
        }, { quoted: m });

        await m.react("✅");
        await m.reply(`✅ *${title}* (${quality}) sent successfully!`);
    } catch (err) {
        console.error("Download error:", err);
        await m.react("❌");
        let errorMsg = `❌ *Download failed*\n\n`;
        if (err.message.includes("timeout")) {
            errorMsg += `The file is large or server is slow. Try a lower quality (480p) or use the Pixeldrain link manually.`;
        } else {
            errorMsg += `Error: ${err.message.substring(0, 100)}`;
        }
        await m.reply(errorMsg);
    }
}
