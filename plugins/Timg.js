const { Sparky } = require("../lib");
const axios = require("axios");

Sparky({
    name: "timg",
    alias: ["ttimg", "slideshow", "ttphoto"],
    category: "download",
    desc: "Download TikTok Photo Slideshow as an Actual Video File"
}, async ({ client, m, args }) => {
    
    // 1. යූසර් ලින්ක් එක දාලා නැත්නම් රිප්ලයි එකක් දෙනවා
    if (!args) return m.reply("_මචං කරුණාකරලා TikTok Photo Slideshow ලින්ක් එකක් දාපන්! \nExample: .timg https://vm.tiktok.com/xxxxxxxx/_");

    await m.react("⏳");
    await client.sendPresenceUpdate('composing', m.jid);

    try {
        console.log(`\n[TIKTOK LOG] ⚡ Fetching TikTok API Data...`);
        
        // TikWM API එක හරහා ටික්ටොක් ඩේටා ලබාගැනීම
        const response = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(args)}`);
        const result = response.data;

        if (!result || result.code !== 0 || !result.data) {
            await m.react("❌");
            return m.reply("❌ *මචං ටික්ටොක් දත්ත ලබාගන්න බැරි වුණා. ලින්ක් එක නිවැරදිද කියලා ආයෙ බලපන්!*");
        }

        const data = result.data;

        // ✨ TikWM එකෙන් සින්දුවයි ෆොටෝ ටිකයි එකතු කරලා හදපු වීඩියෝ ලින්ක් එක (data.play) තියෙනවා නම්
        if (data.play) {
            console.log(`\n[TIKTOK LOG] 📥 Downloading actual video file into Buffer...`);
            
            // 📥 වීඩියෝ URL එකෙන් මුළු වීඩියෝ එකම Buffer එකක් (RAM) විදිහට බොට් ඇතුලටම බාගන්නවා
            const videoStream = await axios.get(data.play, { responseType: 'arraybuffer' });
            const videoBuffer = Buffer.from(videoStream.data);

            await m.react("✅");
            console.log(`\n[TIKTOK LOG] 🚀 Sending actual video file to WhatsApp...`);
            
            // 🎬 බාගත්ත සැබෑ වීඩියෝ ෆයිල් එක (Buffer) කෙලින්ම චැට් එකට වීඩියෝ එකක් විදිහටම සෙන්ඩ් කරනවා
            return await client.sendMessage(m.jid, {
                video: videoBuffer,
                caption: `✨ *TikTok Photo to Video Successfully Downloaded!* 🎬\n\n🎵 *Song:* ${data.music_info?.title || "Unknown"}\n👤 *Creator:* ${data.author?.nickname || "Unknown"}\nℹ️ *Watermark Removed.*`,
                mimetype: 'video/mp4'
            }, { quoted: m });

        } else {
            await m.react("❌");
            return m.reply("❌ *මචං මේ ලින්ක් එකේ වීඩියෝ එකක් හෝ ෆොටෝ ස්ලයිඩ්ෂෝ එකක් සොයාගන්න නැහැ.*");
        }

    } catch (error) {
        console.log(`\n[🚨 TIKTOK COMMAND ERROR] Details:`, error.message);
        await m.react("❌");
        return m.reply("❌ *මචං වීඩියෝ ෆයිල් එක ඩවුන්ලෝඩ් කරද්දී සිස්ටම් දෝෂයක් වුණා!*");
    }
});
