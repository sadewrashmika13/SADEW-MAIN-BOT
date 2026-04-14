const { Sparky, isPublic } = require("../lib");
const fetch = require('node-fetch');
const https = require('https');

// SSL Certificate check එක අයින් කිරීමට (මෙය අර error එක නවත්වයි)
const agent = new https.Agent({
  rejectUnauthorized: false
});

Sparky({
    name: "tiktok",
    fromMe: isPublic,
    category: "download",
    desc: "Download TikTok videos (SSL Fix)."
}, async ({ m, client, args }) => {
    try {
        if (!args) return await m.reply("Please provide a TikTok video URL.");

        const tiktokUrl = args.match(/(https?:\/\/[^\s]+)/g);
        if (!tiktokUrl || !tiktokUrl[0].includes("tiktok.com")) {
            return await m.reply("Invalid TikTok link.");
        }

        await m.react('⏳');

        // මෙතනදී අපි agent එක පාවිච්චි කරනවා අර error එක නොවෙන්න
        const apiUrl = `https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(tiktokUrl[0])}`;
        const response = await fetch(apiUrl, { agent });
        const data = await response.json();

        if (!data || data.status !== 200) {
            await m.react('❌');
            return await m.reply("Could not fetch video. Please try another link.");
        }

        await m.react('⬇️');

        await client.sendMessage(m.jid, { 
            video: { url: data.result.video.no_watermark }, 
            caption: `*TIKTOK DOWNLOADER* ✅\n\n*Title:* ${data.result.title || 'No Title'}\n\n*Downloaded by X-BOT-MD*` 
        }, { quoted: m });

        await m.react('✅');

    } catch (error) {
        await m.react('❌');
        console.error("TikTok Error:", error);
        return await m.reply("An error occurred. Check Render logs for details.");
    }
});
