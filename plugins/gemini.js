const { Sparky, isPublic } = require("../lib");
const axios = require("axios");
const config = require("../config.js");

Sparky({
    name: "ai",
    category: "ai",
    fromMe: isPublic,
    desc: "Chat with Gemini AI (Ultimate Stable)"
}, async ({ client, m, args }) => {
    try {
        // Get message
        const text = m.quoted 
            ? m.quoted.text 
            : (Array.isArray(args) ? args.join(" ") : args);

        if (!text || text.trim() === "") {
            return m.reply("*🤖 හලෝ! මට ප්‍රශ්නයක් කියන්න.*");
        }

        // API KEY
        const apiKey = process.env.GEMINI_API_KEY || config.GEMINI_API_KEY;
        if (!apiKey) {
            return m.reply("*❌ GEMINI_API_KEY එක දාලා නෑ.*");
        }

        // typing effect
        await client.sendPresenceUpdate('composing', m.jid);

        // function to call API
        const callGemini = async (model) => {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            
            return await axios.post(url, {
                contents: [{ parts: [{ text }] }]
            }, { timeout: 20000 });
        };

        let response;

        // 🔥 TRY MULTIPLE MODELS (NO FAIL SYSTEM)
        try {
            response = await callGemini("gemini-1.5-flash-latest");
        } catch (e1) {
            try {
                response = await callGemini("gemini-1.5-flash");
            } catch (e2) {
                try {
                    response = await callGemini("gemini-1.0-pro");
                } catch (e3) {
                    console.log("All models failed");
                    return m.reply("*❌ AI service වැඩ කරන්නේ නෑ. API key හරි නැතිවෙලා හෝ access නෑ.*");
                }
            }
        }

        // get reply safely
        let aiReply = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!aiReply) {
            return m.reply("*❌ Gemini reply එකක් ලැබුණේ නෑ.*");
        }

        // clean + limit
        aiReply = aiReply.replace(/\*\*/g, "*").substring(0, 4000);

        return await m.reply(aiReply);

    } catch (e) {
        console.log(e);

        const errorMsg = e.code === 'ECONNABORTED'
            ? "⏳ Timeout (server slow)"
            : e?.response?.data?.error?.message || e.message;

        return m.reply("*⚠️ Error:* " + errorMsg);
    }
});
