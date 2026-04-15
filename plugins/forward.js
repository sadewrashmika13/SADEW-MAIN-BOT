const { Sparky, isPublic } = require("../lib");

Sparky({
    name: "forward",
    category: "tools",
    fromMe: isPublic,
    desc: "Forward messages without any extra processing"
}, async ({ client, m, args }) => {
    try {
        // රිප්ලයි කරපු මැසේජ් එකක් තියෙනවාද කියලා ඉතාම සරලව බලමු
        const quoted = m.quoted ? m.quoted : null;
        
        if (!quoted) {
            return await client.sendMessage(m.jid, { text: "⚠️ *Please reply to a message and type .forward*" });
        }

        // ටාගට් එක තෝරාගැනීම
        let target = m.jid;
        if (args && args.length > 0 && args[0].length > 5) {
            target = args[0].includes("@") ? args[0] : args[0] + "@s.whatsapp.net";
        }

        // කිසිම split එකක් නැතිව කෙලින්ම Forward කිරීම
        // මෙය Baileys වල එන standard ක්‍රමයයි
        await client.sendMessage(target, { forward: quoted }, { quoted: m });

        // සාර්ථක මැසේජ් එකක් යැවීම
        await client.sendMessage(m.jid, { text: "✅ Forwarded Successfully!" });

    } catch (error) {
        console.error("FORWARD ERROR:", error);
        // Error එක ආවොත් ඒක බොට් හරහාම දැනුම් දීම
        await client.sendMessage(m.jid, { text: "❌ Failed: " + error.message });
    }
});
