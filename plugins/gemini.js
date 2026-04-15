const { cmd, commands } = require('../lib/command');
const axios = require('axios');

cmd({
    pattern: "gemini",
    alias: ["ai", "chat", "gpt"],
    desc: "Chat with Gemini AI (SADEW-MD Edition)",
    category: "ai",
    use: '.gemini <message>',
    filename: __filename
},
async(conn, mek, m, { from, quoted, body, isCmd, command, args, q, reply }) => {
    try {
        if (!q) return reply("🤖 හෙලෝ සජාන! මම Gemini. ඔයාට මොනවා හරි දැනගන්න ඕනද?\n\nඋදා: *.ai මල්ලි කෙනෙක්ට දෙන උපන් දින සුභ පැතුමක් ලියන්න.*");

        // React - Thinking
        try { await m.react('🧠') } catch(e){}

        // මෙන්න මේ පාර මම වඩාත් වේගවත් API එකක් පාවිච්චි කරනවා
        const response = await axios.get(`https://api.giftedtech.my.id/api/ai/gpt4?apikey=gifted&q=${encodeURIComponent(q)}`);
        
        if (response.data && response.data.result) {
            await reply(response.data.result);
            try { await m.react('✨') } catch(e){}
        } else {
            // පළවෙනි එක වැඩ නැත්නම් Backup එකක් විදිහට මේක පාවිච්චි කරනවා
            const backupRes = await axios.get(`https://api.asith.md/gemini?q=${encodeURIComponent(q)}`);
            if (backupRes.data && backupRes.data.result) {
                await reply(backupRes.data.result);
                try { await m.react('✨') } catch(e){}
            } else {
                reply("❌ සොරි සජාන, මට මේ වෙලාවේ කනෙක්ට් වෙන්න බැහැ. පොඩ්ඩකින් ආයෙත් ට්‍රයි කරන්න.");
            }
        }

    } catch (e) {
        console.error(e);
        reply(`❌ Error එකක් ආවා: ${e.message}`);
    }
});
