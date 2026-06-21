const { Sparky } = require("../lib");

// මැසේජ් මතක තියාගන්න Cache එක
if (!global.msgCache) global.msgCache = [];

// pattern වෙනුවට on: "all" හෝ pattern එක හිස්ව තියමු හැම එකම අල්ලන්න
Sparky({
    name: "antidelete",
    on: "message", 
    pattern: /[\s\S]*/, // Text නැති මැසේජ් වුණත් අල්ලන්න
    fromMe: false,
    dontAddCommandList: true,
    desc: "Anti-Delete System"
}, async ({ client, m }) => {
    try {
        if (!m || !m.key) return;

        // 1. එන හැම මැසේජ් එකක්ම Cache එකට දාගන්නවා
        if (m.message && !m.message.protocolMessage) {
            const exists = global.msgCache.find(msg => msg.id === m.key.id);
            if (!exists) {
                global.msgCache.push({
                    id: m.key.id,
                    message: m.message,
                    sender: m.sender || m.key.participant || m.key.remoteJid,
                    chat: m.key.remoteJid
                });
                
                if (global.msgCache.length > 500) {
                    global.msgCache.shift();
                }
            }
        }

        // 2. කවුරුහරි මැසේජ් එකක් මකනවද කියලා බලනවා
        let isRevoke = m.message && m.message.protocolMessage && 
                      (m.message.protocolMessage.type === 0 || 
                       m.message.protocolMessage.type === "REVOKE" || 
                       m.message.protocolMessage.type === 14);

        if (isRevoke) {
            let deletedKey = m.message.protocolMessage.key;
            let deletedId = deletedKey.id;

            // මකපු මැසේජ් එක අපේ Cache එකේ තියෙනවද හොයනවා
            let foundMsg = global.msgCache.find(msg => msg.id === deletedId);

            if (foundMsg) {
                // ⚠️ මෙතනට ඔයාගේ ඇත්තම නම්බර් එක දෙන්න (පහළ තියෙන එක හරිද බලන්න)
                let ownerNumber = "94783360267@s.whatsapp.net"; 

                let textMsg = `🚫 *DELETED MESSAGE DETECTED* 🚫\n\n`;
                textMsg += `👤 *Sender:* @${foundMsg.sender.split("@")[0]}\n`;
                textMsg += `📌 *Chat:* ${foundMsg.chat.includes("-") || foundMsg.chat.includes("g.us") ? "Group" : "Private Inbox"}\n`;
                textMsg += `⏳ *Time:* ${new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Colombo" })}\n\n`;
                textMsg += `👇 *මැකූ පණිවිඩය පහතින් ඇත* 👇`;

                await client.sendMessage(ownerNumber, { 
                    text: textMsg, 
                    mentions: [foundMsg.sender] 
                });

                await client.relayMessage(ownerNumber, foundMsg.message, { messageId: deletedId });
            }
        }
    } catch (e) {
        console.log("Anti-Delete Error:", e);
    }
});
