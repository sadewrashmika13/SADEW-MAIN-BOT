const { Sparky, isPublic } = require("../lib");

Sparky({
    name: "forward",
    category: "tools",
    fromMe: isPublic,
    desc: "Forward a quoted message to the same chat or a specific JID"
}, async ({ client, m, args }) => {
    try {
        if (!m.quoted) {
            return await client.sendMessage(m.jid, {
                text: "⚠️ *කරුණාකර ඕනෑම මැසේජ් එකකට රිප්ලයි කර .forward ලෙස ටයිප් කරන්න.*"
            }, { quoted: m });
        }

        let targetJid = args[0] ? args[0].trim() : m.jid;
        
        // JID එක නිවැරදිව සැකසීම
        if (!targetJid.includes("@")) {
            targetJid = targetJid + "@s.whatsapp.net";
        }

        const statusMsg = await client.sendMessage(m.jid, {
            text: `⏳ Forwarding...`
        }, { quoted: m });

        // මෙන්න මෙතන තමයි වෙනස - m.quoted වෙනුවට m.quoted.message පාවිච්චි කරමු
        // එතකොට තමයි ගොඩක් බොට් වල copyNForward වැඩ කරන්නේ
        await client.copyNForward(targetJid, m.quoted, true);

        await client.sendMessage(m.jid, {
            text: `✅ සාර්ථකව Forward කරන ලදී!`
        }, { edit: statusMsg.key });

    } catch (error) {
        console.error("Forward error:", error);
        await client.sendMessage(m.jid, {
            text: `❌ Error: ${error.message}`
        }, { quoted: m });
    }
});
