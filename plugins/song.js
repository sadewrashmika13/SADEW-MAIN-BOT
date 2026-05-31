const { Sparky } = require("../lib");
const axios = require("axios");

// 🌐 බ්ලොක් වීම් වැළැක්වීමට Headers
const SAFE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "*/*"
};

Sparky({
    name: "song",
    alias: ["play", "ytmp3", "music"],
    category: "download",
    desc: "Download MP3 songs using Whiteshadow Engine"
}, async ({ client, m, args }) => {
    try {
        const query = Array.isArray(args) ? args.join(" ") : args;

        if (!query) {
            return m.reply("_මචං කරුණාකරලා සින්දුවක නමක් දාපන්!_ \n\n*Example:* `.song සිතින් විතරක්`");
        }

        await m.react("⏳");
        await client.sendPresenceUpdate('composing', m.jid);

        console.log(`[SONG ENGINE] 🔎 Searching YouTube for: ${query}`);

        // 1️⃣ STEP 1: YouTube Search API එකෙන් වීඩියෝ එක සර්ච් කිරීම
        const searchApi = "https://whiteshadow-x-api." + "vercel.app" + "/api/search/yt?q=" + encodeURIComponent(query) + "&apitoken=VK4fry";
        const searchRes = await axios.get(searchApi, { timeout: 10000 });

        // API එකෙන් එන දත්ත වල පළමු වීඩියෝ ලින්ක් එක වෙන් කර ගැනීම
        const ytResult = searchRes.data?.result?.[0] || searchRes.data?.response?.[0];
        const videoUrl = ytResult?.url || ytResult?.link;
        const songTitle = ytResult?.title || "YouTube Audio";

        if (!videoUrl) {
            await m.react("❌");
            return m.reply("❌ *මචං සර්ච් ඒපීඅයි එකෙන් මේ සින්දුව හොයාගන්න ලැබුණේ නැහැ. කරුණාකරලා වෙනත් නමකින් සර්ච් කරන්න!*");
        }

        console.log(`[SONG ENGINE] 🎯 Found! URL: ${videoUrl}`);
        console.log(`[SONG ENGINE] 📥 Fetching Direct MP3 Download Link...`);

        // 2️⃣ STEP 2: Download API එකෙන් Direct MP3 Link එක ලබා ගැනීම
        const downloadApi = "https://whiteshadow-x-api." + "vercel.app" + "/api/download/yt?url=" + encodeURIComponent(videoUrl) + "&apitoken=VK4fry";
        const downRes = await axios.get(downloadApi, { timeout: 12000 });

        // API Response එකෙන් ඩවුන්ලෝඩ් ලින්ක් එක අල්ලගැනීම (Flexible Key Check)
        const downloadData = downRes.data?.result || downRes.data?.response;
        let mp3Url = downloadData?.mp3 || downloadData?.download || downloadData?.url || downloadData?.link;

        // 🔄 BACKUP ENGINE: පළවෙනි ඩවුන්ලෝඩ් API එක අවුල් ගියොත් ඔයා දීපු 2වෙනි API එකට මාරු වීම
        if (!mp3Url) {
            console.log(`[SONG ENGINE] ⚠️ First API failed, trying Backup Dark Shan API...`);
            const backupApi = "https://api-dark-shan-yt." + "koyeb.app" + "/download/ytmp3?url=" + encodeURIComponent(videoUrl);
            const backupRes = await axios.get(backupApi, { timeout: 12000 });
            const backupData = backupRes.data?.result || backupRes.data?.response;
            mp3Url = backupData?.mp3 || backupData?.download || backupData?.url || backupData?.link;
        }

        if (!mp3Url) {
            await m.react("❌");
            return m.reply("❌ *මචං සින්දුවේ ඩවුන්ලෝඩ් ලින්ක් එක සර්වර් එකෙන් ගන්න බැරි වුණා. පසුව උත්සාහ කරන්න!*");
        }

        console.log(`[SONG ENGINE] 📥 Streaming audio buffer from: ${mp3Url}`);

        // 3️⃣ STEP 3: කෙලින්ම RAM Buffer එකට සින්දුව Stream කර බාගැනීම
        const audioStream = await axios.get(mp3Url, {
            responseType: 'arraybuffer',
            headers: SAFE_HEADERS,
            timeout: 30000
        });

        const audioBuffer = Buffer.from(audioStream.data);

        if (!audioBuffer || audioBuffer.length < 5000) {
            await m.react("❌");
            return m.reply("❌ *මචං ලැබුණු ඕඩියෝ ෆයිල් එක සවුත්තුයි (Corrupted file).*");
        }

        await m.react("✅");
        const fileSizeMB = (audioBuffer.length / (1024 * 1024)).toFixed(2);
        console.log(`[SONG ENGINE] 📤 Sending playable MP3 to WhatsApp (${fileSizeMB} MB)...`);

        // 4️⃣ STEP 4: WhatsApp එකට කෙලින්ම Play කරන්න පුළුවන් Audio එකක් විදිහට යැවීම
        return await client.sendMessage(m.jid, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            ptt: false
        }, { quoted: m });

    } catch (error) {
        console.log(`[🚨 SONG ENGINE ERROR]:`, error.message);
        await m.react("❌");
        return m.reply(`❌ *මචං සින්දුව වැඩ කරන වෙලාවේ සර්වර් දෝෂයක් ආවා!* \n_\`Error: ${error.message}\`_`);
    }
});
