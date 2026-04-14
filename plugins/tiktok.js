const { Sparky, isPublic } = require("../lib");
const fetch = require('node-fetch');

Sparky({
    name: "tiktok",
    fromMe: isPublic,
    category: "download",
    desc: "Download TikTok videos without watermark."
}, async ({ m, client, args }) => {
    try {
        if (!args) return await m.reply("Please provide a valid TikTok video URL.");
        if (!args.includes("tiktok.com")) return await m.reply("This is not a valid TikTok link.");

        await m.react('⏳');
        
        // Fetching data from the API
        const response = await fetch(`https://api.paxsenix.biz.id/dl/tiktok?url=${args}`);
        const data = await response.json();

        if (!data.ok) return await m.reply("Failed to fetch the video. Please try again later.");

        await m.react('⬇️');

        // Sending the video
        await client.sendMessage(m.jid, { 
            video: { url: data.data.no_watermark }, 
            caption: `*TIKTOK DOWNLOADER* ✅\n\n*Title:* ${data.data.title}\n*Author:* ${data.data.author.nickname}\n\n*Downloaded by X-BOT-MD*` 
        }, { quoted: m });

        await m.react('✅');

    } catch (error) {
        await m.react('❌');
        console.log(error);
        return await m.reply(`Error: ${error.message}`);
    }
});
