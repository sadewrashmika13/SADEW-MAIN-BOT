// commands/moddl.js
const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

function getQuery(args) {
    if (!args) return "";
    if (Array.isArray(args)) return args.join(" ").trim();
    if (typeof args === "string") return args.trim();
    if (typeof args === "object") return Object.values(args).join(" ").trim();
    return "";
}

const API_KEY = "zan_FIAO7Ayh_eo1vllkep6";
const API_BASE = "https://api.zanta-mini.store/api/modapk";

Sparky({
    name: "moddl",
    alias: ["moddownload"],
    category: "download",
    fromMe: isPublic,
    desc: "⬇️ Download MOD APK by number from search results"
}, async ({ client, m, args }) => {
    const num = parseInt(getQuery(args));
    if (isNaN(num)) {
        return m.reply(`❌ *Usage:* ${m.prefix}moddl <number>\nExample: ${m.prefix}moddl 1\n\n*First search with:* ${m.prefix}mod <game name>`);
    }

    const session = global.modSearchResults?.get(m.sender);
    if (!session || !session.results) {
        return m.reply(`❌ No active search. Please run \`${m.prefix}mod <game name>\` first.`);
    }

    if (num < 1 || num > session.results.length) {
        return m.reply(`❌ Invalid number. Choose 1-${session.results.length}.`);
    }

    const selected = session.results[num - 1];
    const gameUrl = encodeURIComponent(selected.url);
    const gameTitle = selected.title;

    await m.react("⏳");
    await m.reply(`📥 Downloading *${gameTitle}* ...`);

    try {
        const dlUrl = `${API_BASE}/dl?apiKey=${API_KEY}&url=${gameUrl}`;
        const { data } = await axios.get(dlUrl, { timeout: 15000 });

        if (!data?.success || !data?.download_url) throw new Error("No download link");

        const downloadUrl = data.download_url;
        const apkRes = await axios.get(downloadUrl, {
            responseType: 'arraybuffer',
            timeout: 90000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const buffer = Buffer.from(apkRes.data);
        const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
        if (buffer.length < 500000) throw new Error("File too small");

        const fileName = `${gameTitle.replace(/[^a-z0-9]/gi, '_')}.apk`;
        const caption = `🎮 *${gameTitle}* [MOD APK]\n📦 Size: ${fileSizeMB} MB\n📥 *Ready*`;

        await client.sendMessage(m.jid, {
            document: buffer,
            mimetype: "application/vnd.android.package-archive",
            fileName: fileName,
            caption: caption
        }, { quoted: m });

        await m.react("✅");
        global.modSearchResults.delete(m.sender); // clear session
    } catch (err) {
        console.error(err);
        await m.react("❌");
        m.reply(`❌ *Download failed*\n${err.message.substring(0, 100)}`);
    }
});
