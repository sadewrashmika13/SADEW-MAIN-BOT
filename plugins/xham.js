const { Sparky, isPublic } = require("../lib");
const axios = require('axios');

Sparky({
    name: "x", 
    alias: ["getlink"],
    fromMe: isPublic,
    category: "downloader",
    desc: "Search and get the link"
}, async ({ m, client, args }) => {
    try {
        let query = args ? (Array.isArray(args) ? args.join(" ").trim() : args.trim()) : m.quoted?.text;
        if (!query) return await m.reply("❌ *කරුණාකර සෙවිය යුතු පදයක් ඇතුළත් කරන්න!*");

        await m.react('⏳');

        // ඔයාගේ API ලින්ක් එක
        const searchUrl = `https://apis.davidcyril.name.ng/xhamster/search?q=asmr=${encodeURIComponent(query)}`;
        const response = await axios.get(searchUrl);

        // 🔴 මෙන්න මේ පේළිය අලුතින් දැම්මේ! මේකෙන් API එකේ ඇත්තටම තියෙන දේ ටර්මිනල් එකේ පෙන්නනවා.
        console.log("🟢 API RESPONSE DATA:", JSON.stringify(response.data, null, 2));

        const results = response.data?.results || response.data?.result || response.data;

        // මෙතනින් පහළ ටික කලින් විදිහටමයි...
        if (!results || !Array.isArray(results) || results.length === 0) {
            await m.react('❌');
            return await m.reply("_ප්‍රතිඵල කිසිවක් හමු වුණේ නැත! කරුණාකර ටර්මිනල් එක බලන්න._");
        }

        const firstResult = results[0];
        const directLink = firstResult.download || firstResult.url || firstResult.link || firstResult.video_url;

        if (!directLink) {
            await m.react('❌');
            return m.reply("❌ *මෙම ප්‍රතිඵලයේ ලින්ක් එකක් ඇතුළත් නොවේ!*");
        }

        let msgText = `🎥 *${firstResult.title || query}*\n\n🔗 *Link:* \n${directLink}`;
        await client.sendMessage(m.jid, { text: msgText }, { quoted: m });
        await m.react('✅');

    } catch (error) {
        await m.react('❌');
        console.error("Search Error:", error);
        m.reply(`_Error: දෝෂයක් මතු විය!_`);
    }
});
