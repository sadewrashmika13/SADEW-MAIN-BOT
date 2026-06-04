// commands/mod.js
const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

function getQuery(args) {
    if (!args) return "";
    if (Array.isArray(args)) return args.join(" ").trim();
    if (typeof args === "string") return args.trim();
    return "";
}

// API configuration
const API_KEY = "zan_FIAO7Ayh_eo1vllkep6";
const API_BASE = "https://api.zanta-mini.store/api/modapk";

// Global session store for search results
if (!global.modSessions) global.modSessions = new Map();

Sparky({
    name: "mod",
    alias: ["modapk"],
    category: "download",
    fromMe: isPublic,
    desc: "🎮 Search and download MOD APK games (AN1.com)"
}, async ({ client, m, args }) => {
    let query = getQuery(args);
    if (!query) {
        return m.reply(`🎮 *MOD APK Downloader*\n\n*Usage:* ${client.prefix}mod <game name>\n*Example:* ${client.prefix}mod Hill Climb Racing`);
    }

    await m.react("🔍");
    await client.sendPresenceUpdate('composing', m.jid);
    await m.reply(`Searching for "${query}"...`);

    try {
        // 1. Search for the game on AN1.com via the API
        const searchUrl = `${API_BASE}/search?apiKey=${API_KEY}&url=${encodeURIComponent(query)}`;
        const searchRes = await axios.get(searchUrl, { timeout: 15000 });

        if (!searchRes.data?.success || !searchRes.data?.result?.length) {
            throw new Error("No mods found");
        }

        const results = searchRes.data.result.slice(0, 10); // limit to 10 results
        let listMsg = `🎮 *MOD APK Search Results*\n\n🔍 *Search:* ${query}\n📊 *Found:* ${results.length} games\n\n`;
        results.forEach((game, idx) => {
            listMsg += `${idx+1}. ${game.title}\n   👤 Developer: ${game.developer || "Unknown"}\n   ⭐ Rating: ${game.rating || "N/A"}\n\n`;
        });
        listMsg += `📌 *How to download:* Reply to this message with the game number (e.g., "1")\n\n> *Powered by ZANTA-MD API*`;

        const sentMsg = await client.sendMessage(m.jid, { text: listMsg }, { quoted: m });

        // Store the session for 5 minutes
        global.modSessions.set(m.sender, {
            step: "awaiting_selection",
            results: results,
            msgId: sentMsg.key.id,
            query: query
        });
        setTimeout(() => global.modSessions.delete(m.sender), 300000); // auto clear after 5 min

        await m.react("✅");

    } catch (error) {
        console.error("MOD search error:", error);
        await m.react("❌");
        m.reply(`❌ *Search failed*\n\n${error.message.substring(0, 100)}`);
    }
});

// Handle number replies (requires dontPrefix: true in Sparky)
Sparky({
    name: "mod_reply",
    pattern: /^\d+$/,
    dontPrefix: true,
    fromMe: false,
    dontAddCommandList: true,
    desc: "Internal: handle game selection"
}, async ({ client, m, args }) => {
    const userJid = m.sender;
    const session = global.modSessions.get(userJid);
    if (!session || session.step !== "awaiting_selection") return;

    // Check that the reply is directed to the correct message
    if (!m.quoted || m.quoted.key.id !== session.msgId) return;

    const number = parseInt(args[0]);
    if (isNaN(number) || number < 1 || number > session.results.length) {
        return m.reply(`❌ Invalid number. Please choose 1-${session.results.length}.`);
    }

    const selected = session.results[number - 1];
    const gameUrl = encodeURIComponent(selected.url);
    const gameTitle = selected.title;

    await m.react("⏳");
    await client.sendPresenceUpdate('composing', m.jid);
    await m.reply(`✅ *Selected:* ${gameTitle}\n⬇️ Getting download link...`);

    try {
        // 2. Get the direct download link from the API
        const dlUrl = `${API_BASE}/dl?apiKey=${API_KEY}&url=${gameUrl}`;
        const dlRes = await axios.get(dlUrl, { timeout: 15000 });

        if (!dlRes.data?.success || !dlRes.data?.download_url) {
            throw new Error("No download URL found");
        }

        const downloadUrl = dlRes.data.download_url;
        console.log(`[MOD] Direct download URL: ${downloadUrl}`);

        await m.reply(`✅ Got download link. Fetching file...`);

        // 3. Download the APK file
        const apkRes = await axios.get(downloadUrl, {
            responseType: 'arraybuffer',
            timeout: 90000,
            headers: { 'User-Agent': 'Mozilla/5.0' },
            maxRedirects: 5
        });

        const buffer = Buffer.from(apkRes.data);
        const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);

        if (buffer.length < 500000) { // less than ~0.5 MB is suspicious
            throw new Error(`Downloaded file too small (${fileSizeMB} MB). Might be invalid.`);
        }

        const fileName = `${gameTitle.replace(/[^a-z0-9]/gi, '_')}.apk`;
        const caption = `🎮 *${gameTitle}* [MOD APK]\n📦 Size: ${fileSizeMB} MB\n📥 *File ready for installation*\n\n> *Powered by AN1.com*`;

        await client.sendMessage(m.jid, {
            document: buffer,
            mimetype: "application/vnd.android.package-archive",
            fileName: fileName,
            caption: caption
        }, { quoted: m });

        await m.react("✅");
        global.modSessions.delete(userJid); // clear session on success

    } catch (error) {
        console.error("MOD download error:", error);
        await m.react("❌");
        m.reply(`❌ *Download failed*\n\n${error.message.substring(0, 150)}`);
    }
});
