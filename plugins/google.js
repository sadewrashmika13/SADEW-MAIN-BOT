const { Sparky, isPublic } = require("../lib");
const googleIt = require('google-it');

Sparky({
    name: "google",
    category: "search",
    fromMe: isPublic,
    desc: "Search Google without API key"
}, async ({ client, m, args }) => {
    try {
        const query = args.join(" ");
        if (!query) return await m.reply("*🔍 මොනවා ගැනද හොයන්න ඕනේ? (උදා: .google Sri Lanka)*");

        await m.reply("*⏳ හොයමින් පවතී... පොඩ්ඩක් ඉන්න.*");

        // API නැතිව Google එකෙන් දත්ත ගැනීම
        const results = await googleIt({ query: query });

        if (!results || results.length === 0) {
            return await m.reply("*❌ ප්‍රතිඵල කිසිවක් හමුවුණේ නැහැ.*");
        }

        let msg = `*🌐 Google සෙවුම් ප්‍රතිඵල: ${query}*\n\n`;
        
        // මුල් ප්‍රතිඵල 5 පමණක් පෙන්වීම
        for (let i = 0; i < Math.min(5, results.length); i++) {
            msg += `*${i + 1}. ${results[i].title}*\n`;
            msg += `📝 ${results[i].snippet}\n`;
            msg += `🔗 ${results[i].link}\n\n`;
        }

        return await m.reply(msg);
        
    } catch (e) {
        console.error(e);
        return await m.reply("*❌ සෙවුම අසාර්ථකයි. පසුව නැවත උත්සාහ කරන්න.*");
    }
});
