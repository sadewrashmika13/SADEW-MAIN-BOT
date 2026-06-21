const { Sparky, isPublic } = require("../lib");
const axios = require('axios');

// සර්ච් රිසල්ට් සහ මැසේජ් ID එක තියාගන්න අලුත් Context Object එකක්
if (!global.xnxxContexts) global.xnxxContexts = {};

// ==========================================
// 1. 🔥 SEARCH COMMAND (.xxx)
// ==========================================
Sparky({
    name: "xxx",
    alias: ["xlist", "xsearch2"],
    fromMe: isPublic,
    category: "downloader",
    desc: "Search XNXX and get a numbered list with thumbnail",
}, async ({ m, client, args }) => {
    try {
        let query = args ? (Array.isArray(args) ? args.join(" ").trim() : args.trim()) : m.quoted?.text;
        if (!query) return await m.reply("*කරුණාකර සෙවිය යුතු පදයක් ඇතුළත් කරන්න! (උදා: .xxx sri lanka)*");

        await m.react('🔎');
        
        const searchUrl = `https://api.zanta-mini.store/api/xnxx/search?apiKey=zan_FIAO7Ayh_eo1vllkep6&url=${encodeURIComponent(query)}`;
        const searchResponse = await axios.get(searchUrl);
        
        const results = searchResponse.data?.results;
        
        if (!results || results.length === 0) {
            await m.react('❌');
            return await m.reply("_ප්‍රතිඵල කිසිවක් හමු වුණේ නැත!_");
        }

        let listText = `🔥 *SADEW-MD XNXX SEARCH* 🔥\n\n\`\`\`Query: ${query}\`\`\`\n\n`;
        
        // රිසල්ට් 15ක් පමණක් වෙන් කර ගැනීම
        let limitedResults = results.slice(0, 15);
        limitedResults.forEach((video, index) => {
            listText += `*${index + 1}.* ${video.title}\n\n`;
        });
        
        listText += `_💡 වීඩියෝ එක ලබා ගැනීමට අදාළ අංකය මෙම පණිවිඩයට Reply කරන්න. (1 - 15)_`;

        const firstThumbnail = limitedResults[0]?.thumbnail;
        let sentMsg;

        // මැසේජ් එක යවලා ඒකේ Object එක අල්ලගන්නවා (ID එක ගන්න ඕන නිසා)
        if (firstThumbnail) {
            sentMsg = await client.sendMessage(m.jid, { image: { url: firstThumbnail }, caption: listText }, { quoted: m });
        } else {
            sentMsg = await client.sendMessage(m.jid, { text: listText }, { quoted: m });
        }
        
        await m.react('📑');

        // 🔴 අලුත් Reply ලොජික් එක: ID එක සහ Results සේව් කිරීම
        global.xnxxContexts[m.sender] = { 
            quotedId: sentMsg.key.id, 
            results: limitedResults
        };

        // විනාඩි 10කින් Auto Clear වෙන්න හදනවා (Memory එක පිරෙන්නේ නැති වෙන්න)
        setTimeout(() => {
            if (global.xnxxContexts[m.sender]) delete global.xnxxContexts[m.sender];
        }, 10 * 60 * 1000);

    } catch (error) {
        await m.react('❌');
        console.error("XNXX List Error:", error);
        return m.reply(`_Error: ${error.message || error}_`);
    }
});

// ==========================================
// 2. 🔥 DYNAMIC REPLY SELECTION LISTENER
// ==========================================
Sparky({
    on: "text",
    fromMe: isPublic,
    dontAddCommandList: true
}, async ({ client, m }) => {
    let context = global.xnxxContexts[m.sender];
    
    // මේ User ට අදාළ Context එකක් නැත්නම් හෝ මැසේජ් එකකට Reply කරලා නැත්නම් අතාරිනවා
    if (!context || !m.quoted) return;

    // රිප්ලයි කරලා තියෙන්නේ අර අපි යවපු සර්ච් රිසල්ට් මැසේජ් එකටමද කියලා බලනවා
    if (m.quoted.key.id === context.quotedId) {
        let number = parseInt(m.text.trim());
        
        // ගහපු අංකය 1ත් ලිස්ට් එකේ ගාණත් අතර තියෙනවද කියලා බලනවා
        if (!isNaN(number) && number >= 1 && number <= context.results.length) {
            try {
                const selectedVideo = context.results[number - 1];
                await m.react('⏳');

                if (selectedVideo.thumbnail) {
                    await client.sendMessage(m.jid, { 
                        image: { url: selectedVideo.thumbnail }, 
                        caption: `📥 *Downloading Video No ${number}:* _${selectedVideo.title}_\n*සැනෙකින් වීඩියෝව අප්ලෝඩ් වේ, රැඳී සිටින්න...*` 
                    }, { quoted: m });
                }

                // API Call
                const downloadApiUrl = `https://api.zanta-mini.store/api/xnxx/dl?apiKey=zan_FIAO7Ayh_eo1vllkep6&url=${encodeURIComponent(selectedVideo.url)}`;
                const downloadResponse = await axios.get(downloadApiUrl);
                
                const dlData = downloadResponse.data?.result;
                const directDownloadLink = dlData?.dl_links?.high || dlData?.dl_links?.low;

                if (!directDownloadLink) {
                    await m.react('❌');
                    return await m.reply("_Direct Download Link එක ලබා ගැනීමට නොහැකි විය!_");
                }

                // WhatsApp Video Upload
                await client.sendMessage(m.jid, { 
                    video: { url: directDownloadLink }, 
                    caption: `🎥 *${dlData.title || selectedVideo.title}*` 
                }, { quoted: m });
                
                await m.react('✅');

            } catch (error) {
                await m.react('❌');
                console.error("XNXX DL Error:", error);
                return m.reply(`_Error: ${error.message || error}_`);
            }
        }
    }
});
