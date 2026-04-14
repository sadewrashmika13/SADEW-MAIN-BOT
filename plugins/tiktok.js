const { Sparky, isPublic } = require("../lib");
const fetch = require('node-fetch');

Sparky({
    name: "tiktok",
    fromMe: isPublic,
    category: "download",
    desc: "Download TikTok videos."
}, async ({ m, client, args }) => {
    try {
        if (!args) return await m.reply("Please provide a TikTok video URL.");

        const tiktokUrl = args.match(/(https?:\/\/[^\s]+)/g);
        if (!tiktokUrl || !tiktokUrl[0].includes("tiktok.com")) {
            return await m.reply("Invalid TikTok link.");
        }

        await m.react('⏳');

        // New Stable API (No SSL issues)
        const apiUrl = `https://api.api-kun.xyz/api/tiktok?url=${encodeURIComponent(tiktokUrl[0])}`;
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!data || !data.data || !data.data.no_wm) {
            await m.react('❌');
            return await m.reply("Failed to fetch video. The API might be down or video is private.");
        }

        await m.react('⬇️');

        // Sending the Video
        await client.sendMessage(m.jid, { 
            video: { url: data.data.no_wm }, 
            caption: `*TIKTOK DOWNLOADER* ✅\n\n*Title:* ${data.data.title || 'No Title'}\n\n*Downloaded by X-BOT-MD*` 
        }, { quoted: m });

        await m.react('✅');

    } catch (error) {
        await m.react('❌');
        console.error("TikTok Plugin Error:", error);
        return await m.reply("An error occurred: " + error.message);
    }
});
