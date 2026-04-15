const { cmd } = require('../lib/command');
const axios = require('axios');

cmd({
    pattern: "download",
    alias: ["get", "dl"],
    desc: "Download videos from various links (FB, IG, TT, etc.)",
    category: "download",
    use: '.download <link>',
    filename: __filename
},
async(conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("🔗 කරුණාකර වීඩියෝ ලින්ක් එක ලබා දෙන්න.\nඋදා: *.download https://vm.tiktok.com/xxxx*");

        await m.react('⏳');

        // All-in-one Downloader API
        const apiUrl = `https://api.giftedtech.my.id/api/download/allinone?url=${encodeURIComponent(q)}&apikey=gifted`;
        const response = await axios.get(apiUrl);

        if (!response.data || !response.data.result) {
            return reply("❌ මේ ලින්ක් එකෙන් වීඩියෝව ලබාගන්න අපහසුයි. කරුණාකර වෙනත් ලින්ක් එකක් උත්සාහ කරන්න.");
        }

        const data = response.data.result;
        const videoUrl = data.url || data.video_url || data.link;

        if (videoUrl) {
            await conn.sendMessage(from, { 
                video: { url: videoUrl }, 
                caption: `✅ *Downloaded Successfully!*\n\n🤖 *SADEW-MD*` 
            }, { quoted: mek });
            await m.react('✅');
        } else {
            reply("❌ වීඩියෝ ලින්ක් එක සොයාගත නොහැකි විය.");
        }

    } catch (e) {
        console.error(e);
        reply("❌ Error: " + e.message);
    }
});