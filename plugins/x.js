const { Sparky, isPublic } = require("../lib");
const axios = require('axios');

Sparky({
    name: "x",
    alias: ["xdown", "xsearch"],
    fromMe: isPublic,
    category: "downloader",
    desc: "Search and download from XNXX using Zanta API",
},
async ({ m, client, args }) => {
    try {
        let query = args || m.quoted?.text;
        if (!query) return await m.reply("*කරුණාකර සෙවිය යුතු පදයක් ඇතුළත් කරන්න! (උදා: .x sri lanka)*");

        await m.react('🔎');
        
        // 1. 🔥 SEARCH API CALL
        const searchUrl = `https://api.zanta-mini.store/api/xnxx/search?apiKey=zan_FIAO7Ayh_eo1vllkep6&url=${encodeURIComponent(query)}`;
        const searchResponse = await axios.get(searchUrl);
        
        // Zanta API එකෙන් එන 'results' Array එක ගන්නවා
        const results = searchResponse.data?.results;
        
        if (!results || results.length === 0) {
            await m.react('❌');
            return await m.reply("_ප්‍රතිඵල කිසිවක් හමු වුණේ නැත!_");
        }
        
        // පළමු වීඩියෝ එකේ සැබෑ url එක වෙන් කරගන්නවා
        const videoUrl = results[0]?.url;
        if (!videoUrl) {
            await m.react('❌');
            return await m.reply("_වීඩියෝ URL එක සොයාගත නොහැකි විය!_");
        }

        await m.react('⬇️');
        
        // 2. 🔥 DOWNLOAD API CALL
        const downloadApiUrl = `https://api.zanta-mini.store/api/xnxx/dl?apiKey=zan_FIAO7Ayh_eo1vllkep6&url=${encodeURIComponent(videoUrl)}`;
        const downloadResponse = await axios.get(downloadApiUrl);
        
        const dlData = downloadResponse.data?.result;
        
        // JSON එක අනුව dl_links.high හෝ dl_links.low වලින් ඩිරෙක්ට් ලින්ක් එක ගන්නවා
        const directDownloadLink = dlData?.dl_links?.high || dlData?.dl_links?.low;
        const videoTitle = dlData?.title || "XNXX Video";

        if (!directDownloadLink) {
            await m.react('❌');
            return await m.reply("_Direct Download Link එක ලබා ගැනීමට නොහැකි විය!_");
        }

        // 3. 🔥 WHATSAPP UPLOAD
        // බොට් සර්වර් එක හරහා කෙලින්ම වට්සැප් එකට වීඩියෝ එක අප්ලෝඩ් කරනවා
        await m.sendFromUrl(directDownloadLink, { caption: `🎥 *${videoTitle}*` });
        await m.react('✅');

    } catch (error) {
        await m.react('❌');
        console.error("XNXX Command Error:", error);
        return m.reply(`_Error: ${error.message || error}_`);
    }
});
