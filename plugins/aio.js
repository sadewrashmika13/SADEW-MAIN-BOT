const { Sparky, isPublic } = require("../lib");
const axios = require('axios');

Sparky({
    name: "aio",
    alias: ["download", "dl", "get", "x"],
    fromMe: isPublic,
    category: "downloader",
    desc: "All-In-One Downloader for 50+ platforms using WhiteShadow API",
},
async ({ m, client, args }) => {
    try {
        let url = args || m.quoted?.text;

        // ලින්ක් එකක් දීලා නැත්නම් පෙන්වන මැසේජ් එක
        if (!url) {
            let menuText = `📥 *SADEW-MD AIO DOWNLOADER* 📥\n\n`;
            menuText += `*💡 භාවිතය:* \n.aio [වීඩියෝ හෝ ඕඩියෝ ලින්ක් එක]\n\n`;
            menuText += `*📌 SUPPORTED PLATFORMS:* \n`;
            menuText += `» TikTok, YT, Spotify, FB, IG, XNXX, etc. (50+ Sites)\n\n`;
            menuText += `_© Powered by WhiteShadow API_`;
            return await m.reply(menuText);
        }

        // ටෙක්ස්ට් එක අස්සෙන් ලින්ක් එක විතරක් කපා ගැනීම
        const linkRegex = /(https?:\/\/[^\s]+)/g;
        const match = url.match(linkRegex);
        if (!match) return await m.reply("*⚠️ කරුණාකර වලංගු HTTP/HTTPS මීඩියා ලින්ක් එකක් ඇතුළත් කරන්න!*");
        url = match[0];

        await m.react('⏳');

        // නිවැරදි කරන ලද API URL එක (apitoken parameter එක සමඟ)
        const apiUrl = `https://whiteshadow-x-api.onrender.com/api/download/aio?url=${encodeURIComponent(url)}&apitoken=VK4fry`;
        const response = await axios.get(apiUrl);

        // API Response එක සාර්ථක නම් (Code: 200 සහ Status: true නම්)
        if (response.data && response.data.Code === 200 && response.data.Result) {
            const res = response.data.Result;
            
            let downloadLink = "";
            let title = "AIO Downloaded Media";
            
            if (typeof res === 'object' && res !== null) {
                downloadLink = res.url || res.link || res.download || res.dl_link || res.video || res.audio;
                title = res.title || res.caption || title;
            } else if (typeof res === 'string') {
                downloadLink = res;
            }

            if (!downloadLink) {
                await m.react('❌');
                return await m.reply("_⚠️ කණගාටුයි, මෙම ලින්ක් එකෙන් Media URL එක වෙන් කර ගැනීමට නොහැකි විය!_");
            }

            // වීඩියෝ/ඕඩියෝ එක චැට් එකට අප්ලෝඩ් කිරීම
            await m.sendFromUrl(downloadLink, { 
                caption: `🎥 *${title}*\n\n_Powered by SADEW-MD_` 
            });
            
            await m.react('✅');
        } else {
            // උඹ දුන්න response එකේ විදිහට වැරදි ලින්ක් එකක් ආවොත් Error එක පෙන්වීම
            await m.react('❌');
            const errorMsg = response.data?.Error || "මෙම ලින්ක් එක දැනට ක්‍රියාත්මක නොවේ!";
            return await m.reply(`*⚠️ API Error:* ${errorMsg}`);
        }

    } catch (error) {
        await m.react('❌');
        console.error("AIO Downloader Global Error:", error);
        return m.reply(`_Error: ${error.message || error}_`);
    }
});
