const { Sparky, isPublic } = require("../lib");

Sparky({
    name: "forward",
    category: "tools",
    fromMe: isPublic,
    desc: "Forward a quoted message safely"
}, async ({ client, m, args }) => {
    try {
        // 1. Check if a message is quoted
        if (!m.quoted) {
            return await client.sendMessage(m.jid, {
                text: "⚠️ *Please reply to any message* (text, image, video) and type `.forward`"
            }, { quoted: m });
        }

        // 2. Determine target JID
        let targetJid = args[0] ? args[0].trim() : m.jid;
        if (!targetJid.includes("@") && !targetJid.includes("g.us")) {
            targetJid = targetJid + "@s.whatsapp.net";
        }

        // 3. Send status
        const statusMsg = await client.sendMessage(m.jid, {
            text: `⏳ Forwarding to ${targetJid}...`
        }, { quoted: m });

        // 4. Forward the quoted message (CORRECT METHOD)
        await client.sendMessage(targetJid, { forward: m.quoted });

        // 5. Update status to success
        await client.sendMessage(m.jid, {
            text: `✅ Successfully forwarded to ${targetJid}`
        }, { edit: statusMsg.key });

    } catch (error) {
        console.error("Forward error:", error);
        await client.sendMessage(m.jid, {
            text: `❌ Forward failed: ${error.message}`
        }, { quoted: m });
    }
});
