const { Sparky } = require("../lib");
const axios = require("axios");

Sparky({
    name: "timg",
    alias: ["ttimg", "slideshow", "ttphoto"],
    category: "download",
    desc: "Download TikTok Photo Slideshow or Video as an Actual MP4 File"
}, async ({ client, m, args }) => {
    try {
        // 1. args එක Array එකක් වුනත් String එකක් වුනත් ආරක්ෂිතව ලින්ක් එක වෙන් කර ගැනීම
        const tiktokUrl = Array.isArray(args) ? args[0] : args;

        // 2. යූසර් ලින්ක් එක දාලා නැත්නම් හෝ ඒක TikTok ලින්ක් එකක් නොවෙයි නම් රිප්ලයි එකක් දෙනවා
        if (!tiktokUrl || !tiktokUrl.includes("tiktok.com")) {
            return m.reply("_මචං කරුණාකරලා වලංගු TikTok Photo Slideshow හෝ වීඩියෝ ලින්ක් එකක් දාපන්!_\n\n*Example:* `.timg https://vm.tiktok.com/xxxxxxxx/`");
        }

        await m.react("⏳");
        await client.sendPresenceUpdate('composing', m.jid);

        console.log(`\n[TIKTOK LOG] ⚡ Fetching data from TikWM API...`);
        
        // TikWM API එක හරහා ටික්ටොක් ඩේටා ලබාගැනීම
        const response = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(tiktokUrl)}`);
        const result = response.data;

        if (!result || result.code !== 0 || !result.data) {
            await m.react("❌");
            return m.reply("❌ *මචං ටික්ටොක් දත්ත ලබාගන්න බැරි වුණා. ලින්ක් එක නිවැරදිද කියලා ආයෙ බලපන්!*");
        }

        const data = result.data;

        // ✨ TikWM එකෙන් සින්දුවයි ෆොටෝ ටිකයි එකතු කරලා හදපු වීඩියෝ ලින්ක් එක (data.play) තියෙනවා නම්
        if (data.play) {
            console.log(`\n[TIKTOK LOG] 📥 Downloading actual video file into Buffer...`);
            
            // 📥 GitHub Actions RAM එක ඇතුලටම 'arraybuffer' එකක් විදිහට බාගන්නවා (No physical disk writes)
            const videoStream = await axios.get(data.play, { responseType: 'arraybuffer' });
            const videoBuffer = Buffer.from(videoStream.data);

            await m.react("✅");
            console.log(`\n[TIKTOK LOG] 🚀 Sending actual video file to WhatsApp...`);
            
            // 🎬 බාගත්ත සැබෑ වීඩියෝ ෆයිල් එක (Buffer) කෙලින්ම චැට් එකට වීඩියෝ එකක් විදිහටම සෙන්ඩ් කරනවා
            return await client.sendMessage(m.jid, {
                video: videoBuffer,
                caption: `✨ *TikTok Media Successfully Downloaded!* 🎬\n\n🎵 *Song:* ${data.music_info?.title || "Unknown"}\n👤 *Creator:* ${data.author?.nickname || "Unknown"}\nℹ️ *Watermark Removed.*`,
                mimetype: 'video/mp4'
            }, { quoted: m });

        } else {
            await m.react("❌");
            return m.reply("❌ *මචං මේ ලින්ක් එකෙන් වීඩියෝ එකක් හෝ ෆොටෝ ස්ලයිඩ්ෂෝ එකක් ජෙනරේට් කරන්න බැරි වුණා.*");
        }

    } catch (error) {
        console.log(`\n[🚨 TIKTOK COMMAND ERROR] Details:`, error.message);
        await m.react("❌");
        return m.reply("❌ *මචං වීඩියෝ ෆයිල් එක ප්‍රොසෙස් කරද්දී සිස්ටම් දෝෂයක් වුණා!*");
    }
});
