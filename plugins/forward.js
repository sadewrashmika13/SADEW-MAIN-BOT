const { Sparky, isPublic } = require("../lib");

Sparky({
    name: "forward",
    category: "tools",
    fromMe: isPublic,
    desc: "Forward a quoted message safely"
}, async ({ client, m, args }) => {
    try {
        if (!m.quoted) {
            return await client.sendMessage(m.jid, {
                text: "⚠️ *Please reply to a message and type .forward*"
            }, { quoted: m });
        }

        let targetJid = args[0] ? args[0].trim() : m.jid;
        if (!targetJid.includes("@") && !targetJid.includes("g.us")) {
            targetJid = targetJid + "@s.whatsapp.net";
        }

        const statusMsg = await client.sendMessage(m.jid, {
            text: `⏳ Forwarding...`
        }, { quoted: m });

        // මෙන්න මේ ක්‍රමය පාවිච්චි කරමු - මේක වඩාත් සාර්ථකයි
        await client.sendMessage(targetJid, { forward: m.quoted.fakeObj ? m.quoted.fakeObj : m.quoted });

        await client.sendMessage(m.jid, {
            text: `✅ Forwarded successfully to ${targetJid}`
        }, { edit: statusMsg.key });

    } catch (error) {
        console.error("Forward error:", error);
        
        // Backup Method: මැසේජ් එකේ Content එක අරන් යැවීම
        try {
            await client.sendMessage(targetJid, { text: m.quoted.text || "" }, { quoted: m.quoted });
            await client.sendMessage(m.jid, { text: "✅ Forwarded as Text (Backup)" }, { edit: statusMsg.key });
        } catch (e) {
            await client.sendMessage(m.jid, {
                text: `❌ Forward failed: ${error.message}`
            }, { quoted: m });
        }
    }
});
