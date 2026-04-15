const { Sparky, isPublic } = require("../lib");
const axios = require("axios");
const config = require("../config.js");

Sparky({
    name: "ai",
    category: "ai",
    fromMe: isPublic,
    desc: "Chat with Gemini AI (Stable Version)"
}, async ({ client, m, args }) => {
    try {
        // Get user text properly
        const text = m.quoted 
            ? m.quoted.text 
            : (Array.isArray(args) ? args.join(" ") : args);

        // Empty check
        if (!text || text.trim() === "") {
            return m.reply("*හලෝ සජාන! මම Gemini 🤖 ඔයාට මොනවද දැනගන්න ඕනේ?*");
        }

        // Get API key
        const apiKey = process.env.GEMINI_API_KEY || config.GEMINI_API_KEY;
        if (!apiKey) {
            return m.reply("*❌ GEMINI_API_KEY එක set කරලා නෑ (GitHub Secrets check කරන්න).*");
        }

        // Typing effect
        await client.sendPresenceUpdate('composing', m.jid);

        const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`;

        const response = await axios.post(apiUrl, {
            contents: [{ parts: [{ text }] }]
        }, {
            timeout: 20000
        });

        // Safe response handling
        let aiReply = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!aiReply) {
            return m.reply("*❌ Gemini response එකක් ලැබුණේ නෑ. API limit හරි error එකක් වෙන්න පුළුවන්.*");
        }

        // Clean formatting
        aiReply = aiReply.replace(/\*\*/g, "*");

        // Limit long messages (WhatsApp safe)
        aiReply = aiReply.substring(0, 4000);

        return await m.reply(aiReply);

    } catch (e) {
        console.log(e);

        const errorMsg = e.code === 'ECONNABORTED'
            ? "සර්වර් එක ප්‍රමාදයි (Timeout)"
            : e?.response?.data?.error?.message || e.message;

        return m.reply("*⚠️ Error:* " + errorMsg);
    }
});
