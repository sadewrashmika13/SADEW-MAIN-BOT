const { Sparky } = require("../lib");
const axios = require("axios");

// 🌐 YouTube සර්වර් බ්ලොක් සහ Speed Limits මඟහැරීමට සාමාන්‍ය Headers
const BYPASS_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "*/*"
};

Sparky({
    name: "song",
    alias: ["play", "ytmp3", "music"],
    category: "download",
    desc: "Download and play any song by its name from YouTube as MP3"
}, async ({ client, m, args }) => {
    try {
        // 1. යූසර් ගැහුව සින්දුවේ නම එකතු කර ගැනීම
        const query = Array.isArray(args) ? args.join(" ") : args;

        if (!query) {
            return m.reply("_මචං කරුණාකරලා සින්දුවක නමක් දාපන්!_ \n\n*Example:* `.song සිතින් විතරක්` හෝ `.song Alone Alan Walker`");
        }

        await m.react("⏳");
        await client.sendPresenceUpdate('composing', m.jid);

        console.log(`[SONG ENGINE] ⚡ Searching YouTube & getting high-speed MP3 link for: ${query}`);

        // 🔥 YouTube Throttling (25kb/s සීමාව) බයිපාස් කරපු සුපිරිම Fast API එකක් භාවිතය
        const apiUrl = `https://api.dreaded.site/api/ytdl?url=${encodeURIComponent(query)}`;
        const res = await axios.get(apiUrl, { timeout: 12000 });

        if (!res.data || !res.data.success || !res.data.result || !res.data.result.audio) {
            await m.react("❌");
            return m.reply("❌ *මචං මේ සින්දුව සොයාගන්න ලැබුණේ නැහැ. කරුණාකරලා අකුරු නිවැරදිව ආයෙ ටයිප් කරලා බලන්න!*");
        }

        const ytData = res.data.result;
        const downloadUrl = ytData.audio; // ඩිරෙක්ට් හයි-ස්පීඩ් MP3 ලින්ක් එක

        console.log(`[SONG ENGINE] 📥 Streaming MP3 directly into RAM Buffer...`);

        // 🚀 කිසිම Hard disk එකක් පාවිච්චි නොකර කෙලින්ම RAM Buffer එකට බාගැනීම (Fast & Safe)
        const audioStream = await axios.get(downloadUrl, {
            responseType: 'arraybuffer',
            headers: BYPASS_HEADERS,
            timeout: 30000 // බාගන්න උපරිම තත්පර 30ක් දෙනවා
        });

        const audioBuffer = Buffer.from(audioStream.data);

        // 🛑 හිස් හෝ කැඩිච්ච ෆයිල් ආරක්ෂණය (0-byte file check)
        if (!audioBuffer || audioBuffer.length < 5000) {
            await m.react("❌");
            return m.reply("❌ *මචං සර්වර් එකෙන් ආපු ඕඩියෝ ෆයිල් එක කැඩිලා. කරුණාකරලා ආයෙ පාරක් ට්‍රැයි කරන්න!*");
        }

        await m.react("✅");
        console.log(`[SONG ENGINE] 🚀 Sending playable MP3 audio to WhatsApp...`);

        // 📤 WhatsApp එක ඇතුලෙන්ම කෙලින්ම Play කරන්න පුළුවන් සාමාන්‍ය Audio එකක් විදිහට යැවීම
        return await client.sendMessage(m.jid, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            ptt: false // මෙතන true දැම්මොත් Voice Message (කොළ පාට මයික්) එකක් විදිහට යන්නේ මචං
        }, { quoted: m });

    } catch (error) {
        console.log(`[🚨 SONG ENGINE ERROR] Details:`, error.message);
        await m.react("❌");
        return m.reply(`❌ *මචං සින්දුව හොයලා බාගන්න ගිය වෙලාවේ දෝෂයක් වුණා!* \n_\`Error: ${error.message}\`_\n\n*විසඳුම:* පොඩ්ඩක් ඉඳලා ආයෙත් උත්සාහ කරන්න.`);
    }
});
