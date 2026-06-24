const { Sparky, isPublic } = require("../lib");
const axios = require('axios');

Sparky({
    name: "xx", 
    alias: ["getlink"],
    fromMe: isPublic,
    category: "downloader",
    desc: "Search and get the link of the first result"
}, async ({ m, client, args }) => {
    try {
        let query = args ? (Array.isArray(args) ? args.join(" ").trim() : args.trim()) : m.quoted?.text;
        
        if (!query) return await m.reply("❌ *කරුණාකර සෙවිය යුතු පදයක් ඇතුළත් කරන්න!*");

        await m.react('⏳');

        // 1. Search API එකට විතරක් Request එක යවනවා
        const searchUrl = `https://apis.davidcyril.name.ng/xhamster/search?q=asmr=${encodeURIComponent(query)}`;
        const response = await axios.get(searchUrl);

        // JSON එකේ Results තියෙන තැන හොයාගන්නවා
        const results = response.data?.results || response.data?.result || response.data;

        if (!results || !Array.isArray(results) || results.length === 0) {
            await m.react('❌');
            return await m.reply("_ප්‍රතිඵල කිසිවක් හමු වුණේ නැත!_");
        }

        // 2. පළවෙනි රිසල්ට් එක විතරක් ගන්නවා
        const firstResult = results[0];
        
        // 🔴 3. සර්ච් රිසල්ට් එකේ තියෙන ලින්ක් එක අල්ලනවා
        // API එකෙන් එවන නම අනුව (url, link, download, video) මේක වැඩ කරනවා
        const directLink = firstResult.download || firstResult.url || firstResult.link || firstResult.video_url;

        if (!directLink) {
            await m.react('❌');
            return m.reply("❌ *මෙම ප්‍රතිඵලයේ ලින්ක් එකක් ඇතුළත් නොවේ! (API එකෙන් ලින්ක් එකක් ලබා දී නැත)*");
        }

        // 4. WhatsApp එකට Text Link එකක් විදිහට යැවීම
        let msgText = `🎥 *${firstResult.title || query}*\n\n🔗 *Link:* \n${directLink}\n\n_💡 මෙම ලින්ක් එක මත ක්ලික් කර අදාළ ගොනුව ලබාගන්න._`;

        await client.sendMessage(m.jid, { text: msgText }, { quoted: m });
        await m.react('✅');

    } catch (error) {
        await m.react('❌');
        console.error("Search Error:", error);
        m.reply(`_Error: දෝෂයක් මතු විය! ${error.message}_`);
    }
});
