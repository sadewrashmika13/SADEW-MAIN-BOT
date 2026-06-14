const axios = require('axios');
const { cmd, commands } = require('../command'); // ඔයාගේ බොට්ගේ command ලිබ් එකේ පාත් එක දෙන්න

cmd({
    pattern: "aio",
    alias: ["download","allinone"],
    desc: "All In One Downloader (TikTok, YouTube, FB etc.)",
    category: "download",
    use: ".aio <url>",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        // 1. යූසර් ලින්ක් එකක් දීලා නැත්නම්
        if (!q) return reply("⚠️ කරුණාකර ඩවුන්ලෝඩ් කරගත යුතු ලින්ක් එක ලබා දෙන්න.\n\n*Example:* .aio https://tiktok.com/xxxx");

        // 2. වීඩියෝව ඩවුන්ලෝඩ් වන බව පෙන්වීමට රිප්ලයි එකක් දීම
        await reply("🔄 කරුණාකර පොඩ්ඩක් රැඳී සිටින්න, ඔබගේ වීඩියෝව සකසමින් පවතියි...");

        const apiToken = "VK4fry";
        const apiUrl = `https://whiteshadow-x-api.onrender.com/api/download/aio?url=${encodeURIComponent(q)}&apitoken=${apiToken}`;

        // API එකට Request එක යැවීම
        const response = await axios.get(apiUrl);
        const data = response.data;

        // 3. API එකෙන් Error එකක් ආවොත් (Status: false නම්)
        if (!data || data.Status === false) {
            return reply(`❌ Error: ${data.Error || "යම් දෝෂයක් සිදු වී ඇත. ලින්ක් එක නිවැරදිදැයි පරීක්ෂා කරන්න."}`);
        }

        // 4. API එක සාර්ථක නම් (Status: true නම්) Result එක ලබා ගැනීම
        const result = data.Result;

        // 💡 සටහන: WhiteShadow API එකේ සාර්ථක Response එක අනුව පහත ලින්ක් ගන්නා ක්‍රමය (result.url / result.medias) වෙනස් විය හැක.
        // සාමාන්‍යයෙන් AIO API වල කෙලින්ම වීඩියෝ ලින්ක් එකක් හෝ මීඩියා ඇරේ එකක් එනවා.
        const videoUrl = result.url || (result.medias && result.medias[0]?.url);
        const title = result.title || "AIO Downloader";

        if (!videoUrl) {
            return reply("❌ වීඩියෝ ලින්ක් එක සොයා ගැනීමට නොහැකි විය.");
        }

        // 5. WhatsApp එකට වීඩියෝව සෙන්ඩ් කිරීම
        await conn.sendMessage(from, { 
            video: { url: videoUrl }, 
            mimetype: 'video/mp4', 
            caption: `*✨ Sadew-MD AIO Downloader ✨*\n\n📌 *Title:* ${title}\n\n💻 *Powered by WhiteShadow*`
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        reply(`❌ පද්ධතියේ දෝෂයක් සිදුවිය: ${e.message}`);
    }
});
