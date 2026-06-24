// commands/ban.js
const { Sparky, isPublic } = require("../lib");
const config = require("../config");

// Helper function to safely extract query string from args
function getQuery(args) {
    if (!args) return "";
    if (Array.isArray(args)) return args.join(" ").trim();
    if (typeof args === "string") return args.trim();
    if (typeof args === "object") return Object.values(args).join(" ").trim();
    return "";
}

// Global ban list (in-memory)
if (!global.banList) global.banList = new Map();

Sparky({
    name: "ban",
    category: "owner",
    fromMe: true,
    desc: "🔨 භාවිතාකරුවෙකු WhatsApp බොට් එකෙන් තහනම් කරන්න"
}, async ({ client, m, args }) => {
    try {
        let target = getQuery(args);
        if (!target) {
            // Reply to quoted message
            if (m.quoted && m.quoted.sender) {
                target = m.quoted.sender;
            } else {
                return m.reply(`🔨 *Ban Command*

*Usage:* ${m.prefix}ban <@mention or phone number>
*Example:* ${m.prefix}ban 94712345678
*Or reply to a user's message with* .ban`);
            }
        }

        let targetJid = null;
        let targetName = "Unknown User";

        // If target is already a JID (contains @)
        if (target.includes("@")) {
            targetJid = target;
            if (!targetJid.includes("@s.whatsapp.net") && !targetJid.includes("@g.us")) {
                targetJid = targetJid.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
            }
        } 
        // If it's a phone number
        else {
            let cleanNumber = target.replace(/[^0-9]/g, "");
            if (cleanNumber.length < 10) {
                return m.reply(`❌ *Invalid phone number!*\nPlease provide a valid number with country code.`);
            }
            targetJid = cleanNumber + "@s.whatsapp.net";
        }

        // Don't ban yourself
        if (targetJid === m.sender) {
            return m.reply(`❌ *Cannot ban yourself!*`);
        }

        // Don't ban the bot owner
        const ownerJid = config.SUDO ? config.SUDO.split(",")[0].trim() + "@s.whatsapp.net" : null;
        if (targetJid === ownerJid) {
            return m.reply(`❌ *Cannot ban the bot owner!*`);
        }

        // Check if already banned
        if (global.banList.has(targetJid)) {
            return m.reply(`⚠️ *Already banned!*\n\n👤 *User:* ${targetName}\n📱 *JID:* ${targetJid}\n📅 *Banned on:* ${global.banList.get(targetJid).date}`);
        }

        // Ban the user
        global.banList.set(targetJid, {
            date: new Date().toLocaleString(),
            bannedBy: m.sender
        });

        await m.reply(`🔨 *User Banned!*\n\n👤 *User:* ${targetName}\n📱 *JID:* ${targetJid}\n📅 *Date:* ${new Date().toLocaleString()}\n\n❌ This user can no longer use the bot.`);
        await m.react("🔨");

    } catch (error) {
        console.error("Ban error:", error);
        m.reply(`❌ *Ban failed:* ${error.message.substring(0, 100)}`);
    }
});
