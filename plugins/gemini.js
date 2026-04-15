const { cmd, commands } = require('../lib/command'); // ✅ Path එක නිවැරදි කළා
const { fetchJson } = require('../lib/functions');

cmd({
    pattern: "gemini",
    alias: ["ai", "chatgpt", "bot"],
    desc: "Chat with Gemini AI",
    category: "ai",
    use: '.gemini <ඔයාට අහන්න ඕන දේ>',
    filename: __filename
},
async(conn, mek, m, { from, quoted, body, isCmd, command, args, q, reply }) => {
    try {
        if (!q) return reply("💡 හෙලෝ! මම Gemini AI. ඔයාට දැනගන්න ඕන ඕනෑම දෙයක් මගෙන් අහන්න.\n\nඋදාහරණ: *.ai ලෝකයේ උසම කන්ද කුමක්ද?*");

        // React - Thinking
        try { await m.react('🧠') } catch(e){}

        // Gemini API එකට Request එක යැවීම
        // මෙහිදී වඩාත් ස්ථාවර API එකක් භාවිතා කර ඇත
        const apiUrl = `https://api.asith.md/gemini?q=${encodeURIComponent(q)}`;
        const response = await fetchJson(apiUrl);
        
        if (!response || !response.result) {
            try { await m.react('❌') } catch(e){}
            return reply("❌ මට පිළිතුරක් සොයාගන්න අපහසු වුණා. කරුණාකර නැවත උත්සාහ කරන්න.");
        }

        // පිළිතුර එවමු
        await reply(response.result);

        // React - Success
        try { await m.react('✨') } catch(e){}

    } catch (e) {
        console.error(e);
        try { await m.react('❌') } catch(err){}
        reply(`❌ Error: ${e.message}`);
    }
});
