const { Sparky, isPublic } = require("../lib");
const axios = require('axios');

// සර්ච් රිසල්ට් තාවකාලිකව තබා ගැනීමට ග්ලෝබල් ඔබ්ජෙක්ට් එකක් සාදා ගැනීම
global.xnxx_cache = global.xnxx_cache || {};

// ==========================================
// 1. 🔥 SEARCH COMMAND (.xxx)
// ==========================================
Sparky({
    name: "xxx",
    alias: ["xlist", "xsearch2"],
    fromMe: isPublic,
    category: "downloader",
    desc: "Search XNXX and get a numbered list with thumbnail",
},
async ({ m, client, args }) => {
    try {
        let query = args || m.quoted?.text;
        if (!query) return await m.reply("*කරුණාකර සෙවිය යුතු පදයක් ඇතුළත් කරන්න! (උදා: .xxx sri lanka)*");

        await m.react('🔎');
        
        const searchUrl = `https://api.zanta-mini.store/api/xnxx/search?apiKey=zan_FIAO7Ayh_eo1vllkep6&url=${encodeURIComponent(query)}`;
        const searchResponse = await axios.get(searchUrl);
        
        const results = searchResponse.data?.results;
        
        if (!results || results.length === 0) {
            await m.react('❌');
            return await m.reply("_ප්‍රතිඵල කිසිවක් හමු වුණේ නැත!_");
        }

        // මේ චැට් එකට අදාළව සර්ච් රිසල්ට් ටික මෙමරියේ සේව් කරගන්නවා
        global.xnxx_cache[m.chat] = results;

        // ලිස්ට් එක මැසේජ් එකක් විදිහට සකස් කරගැනීම (උපරිම රිසල්ට් 15ක්)
        let listText = `🔥 *SADEW-MD XNXX SEARCH* 🔥\n\n\`\`\`Query: ${query}\`\`\`\n\n`;
        
        results.slice(0, 15).forEach((video, index) => {
            listText += `*${index + 1}.* ${video.title}\n\n`;
        });
        
        listText += `_💡 වීඩියෝ එක ලබා ගැනීමට .1 , .2 වැනි අංකයකින් රිප්ලයි කරන්න._`;

        // පළමු වීඩියෝ එකේ තම්බ්නේල් එක ලින්ක් එකෙන් අරන් ඒකත් එක්කම ලිස්ට් එක යැවීම
        const firstThumbnail = results[0]?.thumbnail;
        
        if (firstThumbnail) {
            await m.sendFromUrl(firstThumbnail, { caption: listText });
        } else {
            await m.reply(listText);
        }
        
        await m.react('📑');

    } catch (error) {
        await m.react('❌');
        console.error("XNXX List Error:", error);
        return m.reply(`_Error: ${error.message || error}_`);
    }
});


// ==========================================
// 2. 🔥 SELECTION COMMAND (.1, .2, .3... .15)
// ==========================================
Sparky({
    name: "1",
    alias: ["2","3","4","5","6","7","8","9","10","11","12","13","14","15"],
    fromMe: isPublic,
    category: "downloader",
    dontAddCommandList: true // මේකෙන් මේ අංක ටික මේන් මෙනු එකේ පේන්නෙ නැතිව වහල තියනවා
},
async ({ m, client }) => {
    try {
        // මෙමරියේ මේ චැට් එකට අදාළව සර්ච් ඩේටා තියෙනවාද බලනවා
        if (!global.xnxx_cache || !global.xnxx_cache[m.chat]) return;

        // යවපු මැසේජ් එකෙන් අංකය විතරක් වෙන් කර ගැනීම (උදා: .1 එකෙන් 1 ගනී)
        const numMatch = m.body.match(/\d+/);
        if (!numMatch) return;
        
        const selectedIndex = parseInt(numMatch[0]) - 1;
        const results = global.xnxx_cache[m.chat];
        const selectedVideo = results[selectedIndex];

        if (!selectedVideo) return await m.reply("_කරුණාකර ලිස්ට් එකේ ඇති වලංගු අංකයක් තෝරන්න!_");

        await m.react('⏳');

        // 🌟 ඔයා කිව්වා වගේ සිලෙක්ට් කරපු වීඩියෝ එකේ තම්බ්නේල් එක මුලින්ම සෙන්ඩ් කරනවා
        if (selectedVideo.thumbnail) {
            await m.sendFromUrl(selectedVideo.thumbnail, { caption: `📥 *Downloading:* _${selectedVideo.title}_\n*සැනෙකින් වීඩියෝව අප්ලෝඩ් වේ, රැඳී සිටින්න...*` });
        }

        // 3. 🔥 DOWNLOAD API CALL
        const downloadApiUrl = `https://api.zanta-mini.store/api/xnxx/dl?apiKey=zan_FIAO7Ayh_eo1vllkep6&url=${encodeURIComponent(selectedVideo.url)}`;
        const downloadResponse = await axios.get(downloadApiUrl);
        
        const dlData = downloadResponse.data?.result;
        const directDownloadLink = dlData?.dl_links?.high || dlData?.dl_links?.low;

        if (!directDownloadLink) {
            await m.react('❌');
            return await m.reply("_Direct Download Link එක ලබා ගැනීමට නොහැකි විය!_");
        }

        // 4. 🔥 WHATSAPP VIDEO UPLOAD
        await m.sendFromUrl(directDownloadLink, { caption: `🎥 *${dlData.title || selectedVideo.title}*` });
        await m.react('✅');

    } catch (error) {
        await m.react('❌');
        console.error("XNXX Selection Download Error:", error);
        return m.reply(`_Error: ${error.message || error}_`);
    }
});
