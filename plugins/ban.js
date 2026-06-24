// commands/ban.js
const { Sparky, isPublic } = require("../lib");
const config = require("../config");
const fs = require("fs");

// ---------- BAN LIST STORAGE ----------
const BAN_FILE = "./banned.json";

if (!global.banList) {
    try {
        if (fs.existsSync(BAN_FILE)) {
            const data = JSON.parse(fs.readFileSync(BAN_FILE));
            global.banList = new Map(Object.entries(data));
            console.log(`[BAN] Loaded ${global.banList.size} banned users`);
        } else {
            global.banList = new Map();
        }
    } catch (e) {
        global.banList = new Map();
    }
}

function saveBans() {
    try {
        const obj = Object.fromEntries(global.banList);
        fs.writeFileSync(BAN_FILE, JSON.stringify(obj, null, 2));
    } catch (e) {}
}

function getQuery(args) {
    if (!args) return "";
    if (Array.isArray(args)) return args.join(" ").trim();
    if (typeof args === "string") return args.trim();
    if (typeof args === "object") return Object.values(args).join(" ").trim();
    return "";
}

// ==========================================
// 🔨 BAN COMMAND
// ==========================================
Sparky({
    name: "ban",
    category: "owner",
    fromMe: true,
    desc: "🔨 භාවිතාකරුවෙකු බොට් එකෙන් තහනම් කරන්න"
}, async ({ client, m, args }) => {
    try {
        let target = getQuery(args);
        
        if (!target) {
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

        if (target.includes("@")) {
            targetJid = target;
            if (!targetJid.includes("@s.whatsapp.net") && !targetJid.includes("@g.us")) {
                targetJid = targetJid.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
            }
        } else {
            let cleanNumber = target.replace(/[^0-9]/g, "");
            if (cleanNumber.length < 10) {
                return m.reply(`❌ *Invalid phone number!*\nPlease provide a valid number with country code.`);
            }
            targetJid = cleanNumber + "@s.whatsapp.net";
        }

        if (targetJid === m.sender) {
            return m.reply(`❌ *Cannot ban yourself!*`);
        }

        const sudoList = config.SUDO ? config.SUDO.split(",").map(s => s.trim()) : [];
        const ownerJids = sudoList.map(num => num + "@s.whatsapp.net");
        if (ownerJids.includes(targetJid)) {
            return m.reply(`❌ *Cannot ban the bot owner!*`);
        }

        if (global.banList.has(targetJid)) {
            return m.reply(`⚠️ *Already banned!*\n\n📱 ${targetJid}\n📅 ${global.banList.get(targetJid).date}`);
        }

        global.banList.set(targetJid, {
            date: new Date().toLocaleString(),
            bannedBy: m.sender
        });
        saveBans();

        await m.reply(`🔨 *User Banned!*\n\n📱 ${targetJid}\n📅 ${new Date().toLocaleString()}`);
        await m.react("🔨");

    } catch (error) {
        console.error("Ban error:", error);
        m.reply(`❌ *Ban failed:* ${error.message.substring(0, 100)}`);
    }
});

// ==========================================
// 🔓 UNBAN COMMAND
// ==========================================
Sparky({
    name: "unban",
    category: "owner",
    fromMe: true,
    desc: "🔓 භාවිතාකරුවෙකු අවහිරය ඉවත් කරන්න"
}, async ({ client, m, args }) => {
    try {
        let target = getQuery(args);
        
        if (!target) {
            if (global.banList && global.banList.size > 0) {
                let listMsg = `🔓 *Banned Users*\n\n`;
                let count = 1;
                for (const [jid, info] of global.banList) {
                    listMsg += `${count}. ${jid}\n`;
                    listMsg += `   📅 ${info.date}\n\n`;
                    count++;
                }
                listMsg += `📌 *To unban:* ${m.prefix}unban <JID or number>\nExample: ${m.prefix}unban 94712345678`;
                return m.reply(listMsg);
            } else {
                return m.reply(`🔓 *No users are currently banned.*`);
            }
        }

        let targetJid = null;

        if (!target.includes("@")) {
            let cleanNumber = target.replace(/[^0-9]/g, "");
            if (cleanNumber.length < 10) {
                return m.reply(`❌ *Invalid phone number!*`);
            }
            targetJid = cleanNumber + "@s.whatsapp.net";
        } else {
            targetJid = target;
        }

        if (!global.banList.has(targetJid)) {
            return m.reply(`❌ *User is not banned!*\n\n📱 ${targetJid}`);
        }

        global.banList.delete(targetJid);
        saveBans();

        await m.reply(`🔓 *User Unbanned!*\n\n📱 ${targetJid}\n📅 ${new Date().toLocaleString()}`);
        await m.react("🔓");

    } catch (error) {
        console.error("Unban error:", error);
        m.reply(`❌ *Unban failed:* ${error.message.substring(0, 100)}`);
    }
});
