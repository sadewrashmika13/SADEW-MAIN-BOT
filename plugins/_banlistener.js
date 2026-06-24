// commands/_bancheck.js
const { Sparky } = require("../lib");

// Load ban list from ban.js
if (!global.banList) global.banList = new Map();

// This command matches ANY message that starts with a prefix (., !, #, etc.)
// And runs BEFORE other commands because it starts with _
Sparky({
    name: "_bancheck",
    pattern: /^[.\/#!]/,  // 👈 Matches messages starting with ., !, #, /
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
        
        // Send warning (once per session)
        if (!global._bannedWarned) global._bannedWarned = new Set();
        if (!global._bannedWarned.has(sender)) {
            global._bannedWarned.add(sender);
            try {
                await client.sendMessage(sender, { 
                    text: "⛔ *You are banned from using this bot!*\n\nIf you think this is a mistake, contact the bot owner."
                });
            } catch (e) {}
        }
        
        // 🔥 This is the key - we throw an error to stop command execution
        // Since Sparky catches errors, this will stop the command from running
        throw new Error("BANNED_USER");
    }
});
