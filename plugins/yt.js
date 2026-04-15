const { cmd, commands } = require('../lib/command'); // ✅ Path එක නිවැරදියි
const yts = require('yt-search');
const { fetchJson } = require('../lib/functions');

cmd({
    pattern: "video",
    alias: ["ytv", "ytvideo"],
    desc: "Download YouTube videos",
    category: "download",
    use: '.video <search query or link>',
    filename: __filename
},
async(conn, mek, m, { from, quoted, body, isCmd, command, args, q, reply }) => {
    try {
        if (!q) return reply("❌ කරුණාකර Video එකේ නම හෝ Link එක දෙන්න.\nඋදාහරණ: *.video Leeland Way Maker*");

        // React - Loading
        try { await m.react('🔍') } catch(e){}

        // Search YouTube
        const search = await yts(q);
        const data = search.videos[0];
        
        if (!data) {
            try { await m.react('❌') } catch(e){}
            return reply("❌ වීඩියෝවක් සොයාගත නොහැකි විය.");
        }

        let desc = `*🎬 SADEW-MD VIDEO DOWNLOADER 🎬*\n\n` +
                   `🎵 *Title:* ${data.title}\n` +
                   `🕒 *Duration:* ${data.timestamp}\n` +
                   `👁️ *Views:* ${data.views.toLocaleString()}\n` +
                   `🔗 *Link:* ${data.url}\n\n` +
                   `📥 _Downloading your video... Please wait._`;

        // Send thumbnail and details
        await conn.sendMessage(from, { image: { url: data.thumbnail }, caption: desc }, { quoted: mek });

        // Download Video using API
        const apiUrl = `https://api.davidcyriltech.my.id/youtube/mp4?url=${data.url}`;
        const response = await fetchJson(apiUrl);
        
        if (!response || !response.result || !response.result.download_url) {
            try { await m.react('❌') } catch(e){}
            return reply("❌ Video එක download කිරීමට නොහැකි විය. වෙනත් link එකක් උත්සාහ කරන්න.");
        }

        const vidUrl = response.result.download_url;

        // Send the final video
        await conn.sendMessage(from, { 
            video: { url: vidUrl }, 
            mimetype: 'video/mp4',
            caption: `*${data.title}*\n\n🤖 *SADEW-MD*`
        }, { quoted: mek });

        // React - Done
        try { await m.react('✅') } catch(e){}

    } catch (e) {
        console.error(e);
        try { await m.react('❌') } catch(err){}
        reply(`❌ Error: ${e.message}`);
    }
});
