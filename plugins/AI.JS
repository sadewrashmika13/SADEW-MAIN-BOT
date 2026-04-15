const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

Sparky({
    name: "gpt",
    category: "ai",
    fromMe: isPublic,
    desc: "Chat with AI (Working)"
}, async ({ client, m, args }) => {
    try {
        const text = m.quoted 
            ? m.quoted.text 
            : (Array.isArray(args) ? args.join(" ") : args);

        if (!text || text.trim() === "") {
            return m.reply("*Example: .gpt hi*");
        }

        await client.sendPresenceUpdate("composing", m.jid);

        // ✅ NEW WORKING API
        const res = await axios.get(`https://api.simsimi.vn/v2/simtalk`, {
            params: {
                text: text,
                lc: "en"
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

        if (e.code === "ENOTFOUND") {
            return m.reply("*🌐 Server eka reach karanna ba (API down).*");
        }

        return m.reply("*⚠️ AI error ekak awa.*");
    }
});
