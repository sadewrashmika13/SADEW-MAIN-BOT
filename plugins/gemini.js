const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

Sparky({
    name: "gpt",
    category: "ai",
    fromMe: isPublic,
    desc: "Chat with AI"
}, async ({ client, m, args }) => {
    try {
        const text = m.quoted 
            ? m.quoted.text 
            : (Array.isArray(args) ? args.join(" ") : args);

        if (!text || text.trim() === "") {
            return m.reply("*Example: .gpt What is AI?*");
        }

        await client.sendPresenceUpdate("composing", m.jid);

        // FREE AI API (no key)
        const res = await axios.get("https://api.affiliateplus.xyz/api/chatbot", {
            params: {
                message: text,
                ownername: "Sadew",
                botname: "Sparky-AI"
            },
            timeout: 15000
        });

        const reply = res.data?.message;

        if (!reply) {
            return m.reply("*❌ AI reply ekak na.*");
        }

        return m.reply(reply);

    } catch (e) {
        console.log(e);
        return m.reply("*⚠️ AI error ekak awa. Passe try karanna.*");
    }
});
