// commands/apk.js
const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

function getQuery(args) {
    if (!args) return "";
    if (Array.isArray(args)) return args.join(" ").trim();
    if (typeof args === "string") return args.trim();
    if (typeof args === "object") return Object.values(args).join(" ").trim();
    return "";
}

// API Token (ඔයාගේ token එක)
const API_TOKEN = "VK4fry";
const API_BASE = "https://whiteshadow-x-api.onrender.com/api";

Sparky({
    name: "apk",
    alias: ["apkdl", "getapk"],
    category: "download",
    fromMe: isPublic,
    desc: "📲 Aptoide වෙතින් APK files ඩවුන්ලෝඩ් කරන්න"
}, async ({ client, m, args }) => {
    let query = getQuery(args);
    if (!query) {
        return m.reply(`📲 *APK Downloader (Aptoide)*\n\n*Usage:* ${m.prefix}apk <app name>\n*Example:* ${m.prefix}apk whatsapp\n*Example:* ${m.prefix}apk com.whatsapp\n\n*Note:* App එක හොයාගන්න නම හෝ package name එක දාන්න.`);
    }

    await m.react("⏳");
    await client.sendPresenceUpdate('composing', m.jid);
    await m.reply(`🔍 *Searching "${query}" on Aptoide...*`);

    try {
        // ========== 1. Search for the app ==========
        const searchUrl = `${API_BASE}/search/aptoide?q=${encodeURIComponent(query)}&apitoken=${API_TOKEN}`;
        const searchRes = await axios.get(searchUrl, { timeout: 15000 });

        if (!searchRes.data?.success || !searchRes.data?.results?.length) {
            throw new Error("No results found");
        }

        const app = searchRes.data.results[0];
        const packageName = app.package || query;
        const appName = app.name || query;

        await m.reply(`✅ *Found:* ${appName}\n⬇️ *Downloading APK...*`);

        // ========== 2. Download the APK ==========
        const downloadUrl = `${API_BASE}/download/aptoide?package=${packageName}&apitoken=${API_TOKEN}`;
        const downloadRes = await axios.get(downloadUrl, {
            responseType: 'arraybuffer',
            timeout: 60000,
            maxRedirects: 5,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const buffer = Buffer.from(downloadRes.data);
        if (buffer.length < 100000) throw new Error("Downloaded file is too small");

        const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
        const fileName = `${appName.replace(/[^a-z0-9]/gi, '_')}.apk`;

        const caption = `📲 *${appName}*\n📦 Size: ${fileSizeMB} MB\n📥 *APK ready for install*\n\n> *Powered by Aptoide*`;

        await client.sendMessage(m.jid, {
            document: buffer,
            mimetype: "application/vnd.android.package-archive",
            fileName: fileName,
            caption: caption
        }, { quoted: m });

        await m.react("✅");

    } catch (error) {
        console.error("APK error:", error);
        await m.react("❌");
        
        let errMsg = `❌ *APK Download Failed*\n\n`;
        if (error.message.includes("No results")) {
            errMsg += `"${query}" සඳහා Aptoide එකේ ප්‍රතිඵල හමු නොවුණා.\n💡 Try a different name or use package name (e.g., com.whatsapp)`;
        } else {
            errMsg += `📝 Error: ${error.message.substring(0, 100)}`;
        }
        await m.reply(errMsg);
    }
});
