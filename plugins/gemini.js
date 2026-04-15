const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

Sparky({
    name: "ai",
    category: "ai",
    fromMe: isPublic,
    desc: "Simple AI Chat (No API Key)"
}, async ({ client, m, args }) => {
    try {
        const text = m.quoted 
            ? m.quoted.text 
            : (Array.isArray(args) ? args.join(" ") : args);

        if (!text || text.trim() === "") {
            return m.reply("*🤖 Prashnayak ahanna.*");
        }

        await client.sendPresenceUpdate('composing', m.jid);

        // FREE API (no key needed)
        const url = `https://api.simsimi.vn/v2/simtalk`;

        const response = await axios.post(url, {
            text: text,
            lc: "en"
        });

        const reply = response?.data?.message;

        if (!reply) {
            return m.reply("*❌ AI reply ekak na.*");
        }

        return m.reply(reply);

    } catch (e) {
        console.log(e);
        return m.reply("*⚠️ AI error ekak awa.*");
    }
});
