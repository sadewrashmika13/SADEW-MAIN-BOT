const { Sparky, isPublic } = require("../lib");
const fetch = require('node-fetch');

// API Configuration
const API_KEY = "f8deeb99a26a9666731c6b5dede05914c64ab64ca9b4cfeee8859408a3f9ce30";
const BASE_URL = "https://back.asitha.top/api/tiktok/download";

Sparky({
    name: "tiktok",
    fromMe: isPublic,
    category: "download",
    desc: "Download TikTok videos using Asitha API."
}, async ({ m, client, args }) => {
    try {
        if (!args) return await m.reply("Please provide a TikTok video URL.");

        // Extract the URL from the arguments
        const tiktokUrl = args.match(/(https?:\/\/[^\s]+)/g);
        if (!tiktokUrl || !tiktokUrl[0].includes("tiktok.com")) {
            return await m.reply("Invalid TikTok link. Please make sure it's a correct TikTok URL.");
        }

        await m.react('⏳');

        // Sending Request to Asitha API
        const response = await fetch(`${BASE_URL}?url=${tiktokUrl[0]}&apiKey=${API_KEY}`);
        const data = await response.json();

        // Check if the API response is successful
        if (!data || !data.status) {
            await m.react('❌');
            return await m.reply("Failed to download the video. Please check the link or API status.");
        }

        await m.react('⬇️');

        // Sending the Video with details
        await client.sendMessage(m.jid, { 
            video: { url: data.result.no_wm }, 
            caption: `*TIKTOK DOWNLOADER* ✅\n\n*Title:* ${data.result.title || 'No Title'}\n*Author:* ${data.result.author || 'Unknown'}\n\n*Downloaded by X-BOT-MD*` 
        }, { quoted: m });

        await m.react('✅');

    } catch (error) {
        await m.react('❌');
        console.error(error);
        return await m.reply("An error occurred while processing your request. Please try again later.");
    }
});
