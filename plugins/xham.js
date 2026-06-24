const { Sparky, isPublic } = require("../lib");
const axios = require('axios');

Sparky({
    name: "xx", // ඔයා කලින් පාවිච්චි කරපු නම
    alias: ["dlfirst"],
    fromMe: isPublic,
    category: "downloader",
    desc: "Search and download the first result immediately"
}, async ({ m, client, args }) => {
    try {
        let query = args ? (Array.isArray(args) ? args.join(" ").trim() : args.trim()) : m.quoted?.text;
        if (!query) return await m.reply("❌ *කරුණාකර සෙවිය යුතු පදයක් ඇතුළත් කරන්න!*");

        await m.react('⏳');

        // 🔴 1. ඔයාගේ Search API එක මෙතනට දාන්න
        const searchUrl = `https://apis.davidcyril.name.ng/xhamster/search?q=asmr=${encodeURIComponent(query)}`;
        const response = await axios.get(searchUrl);

        // 2. JSON එකෙන් එන Results Array එක (ඔයාගේ JSON එක අනුව 'results' ද 'data' ද බලලා දෙන්න)
        const results = response.data?.results;

        if (!results || results.length === 0) {
            await m.react('❌');
            return await m.reply("_ප්‍රතිඵල කිසිවක් හමු වුණේ නැත!_");
        }

        // 🔴 3. වැදගත්ම කෑල්ල: පළවෙනි රිසල්ට් එක (1st item) පමණක් අල්ලගන්නවා (Index 0)
        const firstResult = results[0];

        await m.reply(`📥 *පළමු ප්‍රතිඵලය බාගත වෙමින් පවතී...*\n\n📌 *නම:* ${firstResult.title}`);

        // 🔴 4. Download API එකට යවනවා (ඔයාගේ DL API ලින්ක් එක මෙතනට දාන්න)
        const downloadApiUrl = `ඔයාගේ_DOWNLOAD_API_ලින්ක්_එක=${encodeURIComponent(firstResult.url)}`;
        const dlResponse = await axios.get(downloadApiUrl);
        
        // JSON එකෙන් ඩවුන්ලෝඩ් ලින්ක් එක ගන්නවා (මේකත් JSON එක අනුව වෙනස් කරගන්න)
        const directDownloadLink = dlResponse.data?.result?.dl_links?.high || dlResponse.data?.result?.dl_links?.low;

        if (!directDownloadLink) {
            await m.react('❌');
            return m.reply("❌ *ඩවුන්ලෝඩ් ලින්ක් එක ලබාගැනීමට නොහැකි විය!*");
        }

        // 5. WhatsApp එකට කෙලින්ම Video එක යවනවා
        await client.sendMessage(m.jid, { 
            video: { url: directDownloadLink }, 
            caption: `🎥 *${firstResult.title}*` 
        }, { quoted: m });

        await m.react('✅');

    } catch (error) {
        await m.react('❌');
        console.error("Auto DL Error:", error);
        m.reply(`_Error: දෝෂයක් මතු විය! ${error.message}_`);
    }
});
