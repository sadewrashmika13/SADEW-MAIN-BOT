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

Sparky({
    name: "movie",
    alias: ["cinema", "films"],
    category: "download",
    fromMe: isPublic,
    desc: "🎬 සිංහල චිත්‍රපට සෙවීම සහ බාගැනීම"
}, async ({ client, m, args }) => {
    const query = getQuery(args);
    if (!query) {
        return m.reply(`🎬 *සිංහල චිත්‍රපට සෙවුම*

*Usage:* ${m.prefix}movie <movie name>
*Example:* ${m.prefix}movie kishkindha

*After search, type:* ${m.prefix}movie <number>
*Example:* ${m.prefix}movie 1`);
    }

    const session = global.movieSessions.get(m.sender);

    // If user already has search results and enters a number -> download
    if (session && session.step === "awaiting_download" && !isNaN(query)) {
        const idx = parseInt(query) - 1;
        if (idx < 0 || idx >= session.results.length) {
            return m.reply(`❌ Invalid number. Choose 1-${session.results.length}.`);
        }
        const selected = session.results[idx];
        await fetchDownloadLinks(client, m, selected.url, selected.title);
        global.movieSessions.delete(m.sender);
        return;
    }

    // Otherwise, search
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
            listMsg += `${i+1}. *${movie.title}*\n   🔗 ${movie.url}\n\n`;
        });
        listMsg += `📌 *To download:* ${m.prefix}movie <number>\nExample: ${m.prefix}movie 1`;

        await client.sendMessage(m.jid, { text: listMsg }, { quoted: m });

        global.movieSessions.set(m.sender, {
            step: "awaiting_download",
            results: results,
            timestamp: Date.now()
        });
        setTimeout(() => global.movieSessions.delete(m.sender), 5 * 60 * 1000);

        await m.react("✅");
    } catch (err) {
        console.error("Movie search error:", err);
        await m.react("❌");
        m.reply(`❌ Search failed: ${err.message.substring(0, 100)}`);
    }
});

async function fetchDownloadLinks(client, m, movieUrl, title) {
    await m.react("⏳");
    await client.sendPresenceUpdate('composing', m.jid);
    await m.reply(`📥 Fetching download links for *${title}*...`);

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

        let msg = `🎬 *${title}*\n\n📥 *Download Links*\n`;
        videoLinks.forEach(link => {
            msg += `▶️ *${link.quality}* (${link.size || 'N/A'})\n`;
            msg += `🔗 ${link.direct_link}\n\n`;
        });
        if (subLink) {
            msg += `📝 *Subtitles (SRT)*\n🔗 ${subLink.direct_link}\n`;
        }

        await client.sendMessage(m.jid, { text: msg }, { quoted: m });
        await m.react("✅");
    } catch (err) {
        console.error("Download error:", err);
        await m.react("❌");
        m.reply(`❌ Download failed: ${err.message.substring(0, 100)}`);
    }
}
