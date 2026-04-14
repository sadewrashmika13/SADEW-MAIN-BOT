const { Sparky, isPublic } = require("../lib");
const fetch = require('node-fetch');

const API_KEY = "f8deeb99a26a9666731c6b5dede05914c64ab64ca9b4cfeee8859408a3f9ce30";

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

        // Attempt 1: Asitha API
        let response = await fetch(`https://back.asitha.top/api/tiktok/download?url=${encodeURIComponent(tiktokUrl[0])}&apiKey=${API_KEY}`);
        let data = await response.json();

        // If Asitha API fails, try Attempt 2: Public API
        if (!data || !data.status || !data.result) {
            console.log("Asitha API failed, trying fallback...");
            response = await fetch(`https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(tiktokUrl[0])}`);
            data = await response.json();
            
            // Checking Fallback result
            if (data && data.status === 200) {
                await m.react('⬇️');
                return await client.sendMessage(m.jid, { 
                    video: { url: data.result.video.no_watermark }, 
                    caption: `*TIKTOK DOWNLOADER (Fallback)* ✅\n\n*Title:* ${data.result.title}\n\n*Downloaded by X-BOT-MD*` 
                }, { quoted: m });
            }
            
            await m.react('❌');
            return await m.reply("Both APIs failed to fetch the video. The video might be private or the API limit is reached.");
        }

        // If Asitha API is successful
        await m.react('⬇️');
        await client.sendMessage(m.jid, { 
            video: { url: data.result.no_wm || data.result.video_low }, 
            caption: `*TIKTOK DOWNLOADER* ✅\n\n*Title:* ${data.result.title || 'No Title'}\n*Author:* ${data.result.author || 'Unknown'}\n\n*Downloaded by X-BOT-MD*` 
        }, { quoted: m });

        await m.react('✅');

    } catch (error) {
        await m.react('❌');
        console.error("TikTok Plugin Error:", error);
        return await m.reply("An error occurred: " + error.message);
    }
});
