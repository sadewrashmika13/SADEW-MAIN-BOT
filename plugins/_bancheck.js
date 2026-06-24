// commands/_bancheck.js
const { Sparky, isPublic } = require("../lib");
const config = require("../config");

// Global ban list (shared with ban.js)
if (!global.banList) global.banList = new Map();

// 🔥 This runs BEFORE any other command (highest priority)
Sparky({
    name: "_bancheck",
    pattern: /(.*)/,        // Matches ANY message
    dontAddCommandList: true,
    fromMe: false,
    priority: 999,           // Highest priority (if your Sparky supports it)
    desc: "Internal ban check"
}, async ({ client, m }) => {
    // Ignore bot's own messages
    if (m.key.fromMe) return;

    const sender = m.key.remoteJid || m.key.participant || m.sender;
    
    // Check if sender is banned
    if (global.banList && global.banList.has(sender)) {
        // Banned user - block everything
        console.log(`⛔ Banned user: ${sender}`);
        
        // Optional: Send warning message (only once per session)
        if (!global._bannedWarned) global._bannedWarned = new Set();
        if (!global._bannedWarned.has(sender)) {
            global._bannedWarned.add(sender);
            await client.sendMessage(sender, { 
                text: "⛔ *You are banned from using this bot!*\n\nIf you think this is a mistake, contact the bot owner." 
            });
        }
        
        // Stop further processing
        return;
    }
});
