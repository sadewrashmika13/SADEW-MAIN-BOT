const { Sparky, isPublic } = require("../lib");
const axios = require('axios');

// 🔴 1. Memory එක (Context) හදාගන්නවා
// යූසර් සර්ච් කරපු දේවල් සහ මැසේජ් ID එක තාවකාලිකව සේව් කරගන්නවා
if (!global.searchContexts) global.searchContexts = {};

// ==========================================
// 1. 🔥 SEARCH COMMAND (.wall) - සර්ච් කරන කොටස
// ==========================================
Sparky({
    name: "wall",
    alias: ["wallpaper", "picsearch"],
    fromMe: isPublic,
    category: "search",
    desc: "Search Wallpapers and get a numbered list",
}, async ({ m, client, args }) => {
    try {
        let query = args.join(" ").trim() || m.quoted?.text;
        if (!query) return await m.reply("❌ *කරුණාකර සෙවිය යුතු පදයක් ඇතුළත් කරන්න! (උදා: .wall nature)*");

        await m.react('🔎');
        
        // 💡 මෙතනට ඔයාගේ ඕනෑම API ලින්ක් එකක් දාන්න පුළුවන්
        // (උදාහරණයක් විදිහට Pixabay වගේ පින්තූර දෙන API එකක්)
        const searchUrl = `https://apis.davidcyril.name.ng/xhamster/search?q=asmr=${encodeURIComponent(query)}&image_type=photo`;
        const searchResponse = await axios.get(searchUrl);
        
        // API එකෙන් එන JSON එකේ ඩේටා තියෙන තැන (මේක API එකෙන් API එකට වෙනස් වෙනවා)
        const results = searchResponse.data?.hits;
        
        if (!results || results.length === 0) {
            await m.react('❌');
            return await m.reply("_ප්‍රතිඵල කිසිවක් හමු වුණේ නැත!_");
        }

        let listText = `🖼️ *SADEW-MD WALLPAPER SEARCH* 🖼️\n\n🔎 *Query:* ${query}\n\n`;
        
        // රිසල්ට් 10ක් පමණක් වෙන් කර ගැනීම
        let limitedResults = results.slice(0, 10);
        limitedResults.forEach((item, index) => {
            // ලිස්ට් එක හදනවා
            listText += `*${index + 1}.* ${item.tags} (Size: ${item.imageWidth}x${item.imageHeight})\n`;
        });
        
        listText += `\n_💡 පින්තූරය ලබා ගැනීමට අදාළ අංකය මෙම පණිවිඩයට Reply කරන්න. (1 - ${limitedResults.length})_`;

        // ලිස්ට් මැසේජ් එක යවනවා
        let sentMsg = await client.sendMessage(m.jid, { text: listText }, { quoted: m });
        await m.react('📑');

        // 🔴 ලොජික් එකේ වැදගත්ම කෑල්ල: ID එක සහ Results සේව් කිරීම
        global.searchContexts[m.sender] = { 
            quotedId: sentMsg.key.id, 
            results: limitedResults // ඩේටා ඔක්කොම මෙමරියට දානවා
        };

        // විනාඩි 5කින් Auto Clear වෙන්න හදනවා (Memory Leak නොවෙන්න)
        setTimeout(() => {
            if (global.searchContexts[m.sender]) {
                delete global.searchContexts[m.sender];
            }
        }, 5 * 60 * 1000);

    } catch (error) {
        await m.react('❌');
        console.error("Search Error:", error);
        return m.reply(`_Error: ${error.message || error}_`);
    }
});

// ==========================================
// 2. 🔥 LISTENER COMMAND - අංකයට රිප්ලයි කරන කොටස
// ==========================================
Sparky({
    on: "text", // හැම මැසේජ් එකක්ම අහන් ඉන්නවා
    fromMe: isPublic,
    dontAddCommandList: true
}, async ({ client, m }) => {
    let context = global.searchContexts[m.sender];
    
    // මේ User ට අදාළ Context එකක් නැත්නම් හෝ මැසේජ් එකකට Reply කරලා නැත්නම් අතාරිනවා
    if (!context || !m.quoted) return;

    // රිප්ලයි කරලා තියෙන්නේ අර අපි යවපු සර්ච් රිසල්ට් මැසේජ් එකටමද කියලා බලනවා
    if (m.quoted.key.id === context.quotedId) {
        
        let number = parseInt(m.text.trim());
        
        // ගහපු අංකය 1ත් ලිස්ට් එකේ ගාණත් අතර තියෙනවද කියලා බලනවා
        if (!isNaN(number) && number >= 1 && number <= context.results.length) {
            
            // ✅ අංකය හරි නම්, අර මෙමරියේ තිබ්බ ඩේටා වලින් අදාළ එක එළියට ගන්නවා
            const selectedItem = context.results[number - 1];
            
            // වැඩේ පටන් ගත්ත නිසා මෙමරිය මකලා දානවා
            delete global.searchContexts[m.sender];
            
            try {
                await m.react('⏳');
                await m.reply(`📥 *පින්තූරය ගෙන එමින් පවතී...*\nTags: ${selectedItem.tags}`);

                // අදාළ ෆොටෝ එක/වීඩියෝ එක ඩවුන්ලෝඩ් කරලා යවනවා
                await client.sendMessage(m.jid, { 
                    image: { url: selectedItem.largeImageURL }, 
                    caption: `🖼️ *Here is your Wallpaper!*\n🔖 *Tags:* ${selectedItem.tags}` 
                }, { quoted: m });
                
                await m.react('✅');

            } catch (error) {
                await m.react('❌');
                console.error("Download Error:", error);
                return m.reply(`_Error: අදාළ ගොනුව ලබාගැනීමට නොහැකි විය._`);
            }
        } else {
            // වැරදි අංකයක් ගැහුවොත්
            m.reply(`❌ කරුණාකර 1 සිට ${context.results.length} දක්වා වූ නිවැරදි අංකයක් ලබා දෙන්න.`);
        }
    }
});
