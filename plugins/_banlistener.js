// commands/_bancheck.js
const { Sparky } = require("../lib");

// Load ban list from ban.js
if (!global.banList) global.banList = new Map();

Sparky({
    name: "_bancheck",
    pattern: /(.*)/,
    dontAddCommandList: true,
    fromMe: false,
    desc: "Ban check"
}, async ({ client, m }) => {
    // Ignore bot's own messages
    if (m.key.fromMe) return;
    
    const sender = m.key.remoteJid || m.key.participant || m.sender;
    
    // Check if sender is banned
    if (global.banList && global.banList.has(sender)) {
        console.log(`⛔ Banned user blocked: ${sender}`);
        
        // Try to send warning (optional)
        if (!global._bannedWarned) global._bannedWarned = new Set();
        if (!global._bannedWarned.has(sender)) {
            global._bannedWarned.add(sender);
            try {
                await client.sendMessage(sender, { 
                    text: "⛔ *You are banned from using this bot!*"
                });
            } catch (e) {}
        }
        
        // 🔥 This prevents further command processing
        // The message will not trigger any other commands
        return "STOP";
    }
});
