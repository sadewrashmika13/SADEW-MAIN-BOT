// commands/anime.js
const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

if (!global.animeSessions) global.animeSessions = new Map();

const BOT_NAME = "★👑𝙎𝘼𝘿𝙀𝙒-𝙓-𝙈𝘿🔥 ★";

// 1. SEARCH COMMAND
Sparky({ name: "anime", alias: ["ac"], category: "download", fromMe: isPublic }, async ({ client, m, args }) => {
    const query = args.join(" ");
    if (!query) return await m.reply("🎌 *Anime Search*\n\nUsage: .anime <name>");

    await m.react("🔍");
    try {
        const { data } = await axios.get(`https://animeclub-api.udmodz-2ab.workers.dev/search?q=${encodeURIComponent(query)}`);
        // API එකෙන් එන ඕනෑම දෙයක් Array එකක් විදිහට අල්ලගන්නවා
        const results = Array.isArray(data) ? data : (data.data || data.results || data.result || []);
        
        if (results.length === 0) return await m.reply("❌ කිසිවක් හමු නොවීය.");

        let msg = `🎌 *Anime Search Results:*\n\n`;
        results.slice(0, 10).forEach((a, i) => msg += `*${i + 1}.* ${a.title || a.name}\n`);
        msg += `\n📌 .<අංකය> තෝරන්න (Ex: .1)`;

        await client.sendMessage(m.jid, { image: { url: results[0].image || results[0].thumbnail || "" }, caption: msg }, { quoted: m });
        global.animeSessions.set(m.sender, { step: "awaiting_anime", results: results.slice(0, 10) });
        await m.react("✅");
    } catch (e) { await m.react("❌"); await m.reply("❌ Error: " + e.message); }
});

// 2. NUMBER SELECTORS
for (let i = 1; i <= 10; i++) {
    Sparky({ name: `${i}`, category: "download", fromMe: isPublic }, async ({ client, m }) => {
        const sess = global.animeSessions.get(m.sender);
        if (!sess || sess.step !== "awaiting_anime") return;

        const sel = sess.results[i - 1];
        global.animeSessions.delete(m.sender);
        await m.react("⏳");
        
        const { data } = await axios.get(`https://animeclub-api.udmodz-2ab.workers.dev/dl?url=${encodeURIComponent(sel.url || sel.link)}`);
        
        // Quality ලින්ක්ස් අල්ලගන්නවා
        const links = { "480p": null, "720p": null };
        function scan(o) {
            if (!o || typeof o !== 'object') return;
            let u = o.url || o.link || o.download;
            let q = (o.quality || o.name || "").toString().toLowerCase();
            if (u && typeof u === 'string' && u.startsWith('http')) {
                if (q.includes("480")) links["480p"] = u;
                if (q.includes("720")) links["720p"] = u;
            }
            for (let k in o) scan(o[k]);
        }
        scan(data);

        let msg = `🎌 *${sel.title}*\n\n🟢 *480p* ➡️ .m1\n🟢 *720p* ➡️ .m2`;
        await m.reply(msg);
        global.animeSessions.set(m.sender, { step: "awaiting_anime_quality", links, title: sel.title });
        await m.react("🎬");
    });
}

// 3. DOWNLOAD (.m1, .m2)
for (let j = 1; j <= 2; j++) {
    Sparky({ name: `m${j}`, category: "download", fromMe: isPublic }, async ({ client, m }) => {
        const sess = global.animeSessions.get(m.sender);
        if (!sess || sess.step !== "awaiting_anime_quality") return;

        const url = sess.links[j === 1 ? "480p" : "720p"];
        if (!url) return await m.reply("❌ නැත.");
        
        global.animeSessions.delete(m.sender);
        await m.react("⬇️");
        
        // Drive Bypass
        let dUrl = url;
        if (url.includes("drive.google.com")) {
            const ws = await axios.get(`https://whiteshadow-x-api.onrender.com/api/download/gdrive?url=${encodeURIComponent(url)}&apitoken=VK4fry`);
            if (ws.data.success !== false) dUrl = ws.data.downloadUrl || ws.data.url || url;
        }

        await client.sendMessage(m.jid, { document: { url: dUrl }, mimetype: "video/mp4", fileName: `${sess.title}.mp4` }, { quoted: m });
        await m.react("✅");
    });
}
