const { cmd, commands } = require('../lib/command');
const { fetchJson } = require('../lib/functions');

cmd({
    pattern: "tiktok",
    alias: ["tt", "dltt"],
    desc: "Download TikTok videos without watermark.",
    category: "download",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        if (!q) return reply("Please provide a valid TikTok video URL.");
        if (!q.includes("tiktok.com")) return reply("This is not a valid TikTok link.");

        reply("Downloading your video... Please wait. ⏳");

        // Fetching data from a public TikTok API
        let data = await fetchJson(`https://api.paxsenix.biz.id/dl/tiktok?url=${q}`);

        if (!data.ok) return reply("Failed to fetch the video. Please try again later.");

        // Sending the video to the chat
        await conn.sendMessage(from, { 
            video: { url: data.data.no_watermark }, 
            caption: `*TIKTOK DOWNLOADER* ✅\n\n*Title:* ${data.data.title}\n*Author:* ${data.data.author.nickname}\n\n*Downloaded by X-BOT-MD*` 
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        reply(`An error occurred: ${e.message}`);
    }
});
