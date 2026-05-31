const { Sparky, commands, isPublic } = require("../lib");
const config = require("../config.js");

const MENU_REPLY_TIMEOUT = 5 * 60 * 1000;

if (!global.menuReplyStore) global.menuReplyStore = new Map();
if (!global.menuReplyListenerClients) global.menuReplyListenerClients = new WeakSet();

const categoriesList = [
    {
        num: 1,
        name: "DOWNLOAD",
        icon: "📥",
        title: "DOWNLOAD MENU",
        subtitle: "YT, FB, IG වීඩියෝ",
        categoryAliases: ["download", "downloader", "media"],
        keywords: ["download", "yt", "youtube", "facebook", "fb", "instagram", "ig", "video", "audio", "song", "music", "tiktok"]
    },
    {
        num: 2,
        name: "AI",
        icon: "🧠",
        title: "AI MENU",
        subtitle: "ChatGPT, Gemini, Bot",
        categoryAliases: ["ai", "chatbot"],
        keywords: ["ai", "chatgpt", "gpt", "gemini", "bard", "bot", "deepseek", "groq"]
    },
    {
        num: 3,
        name: "GROUP",
        icon: "👥",
        title: "GROUP MENU",
        subtitle: "Group එක manage කරන්න",
        categoryAliases: ["group", "gc"],
        keywords: ["group", "gc", "tag", "mention", "invite", "link", "welcome", "goodbye"]
    },
    {
        num: 4,
        name: "ADMIN",
        icon: "⚙️",
        title: "ADMIN MENU",
        subtitle: "Admin වැඩ කටයුතු",
        categoryAliases: ["admin"],
        keywords: ["admin", "promote", "demote", "kick", "remove", "add", "mute", "unmute", "warn"]
    },
    {
        num: 5,
        name: "TOOLS",
        icon: "🔧",
        title: "TOOLS MENU",
        subtitle: "Sticker, QR, Converter",
        categoryAliases: ["tools", "tool", "utility", "converter"],
        keywords: ["tool", "qr", "scan", "short", "url", "convert", "sticker", "photo", "image", "edit"]
    },
    {
        num: 6,
        name: "OWNER",
        icon: "👑",
        title: "OWNER MENU",
        subtitle: "Bot පාලනය සඳහා",
        categoryAliases: ["owner", "sudo"],
        keywords: ["owner", "restart", "shutdown", "update", "block", "unblock", "broadcast", "jid"]
    },
    {
        num: 7,
        name: "OTHER",
        icon: "📁",
        title: "OTHER MENU",
        subtitle: "වෙනත් විධාන",
        categoryAliases: ["other", "misc", "main"],
        keywords: ["fun", "game", "meme", "quote", "weather", "news", "search", "info", "alive", "ping", "menu"]
    }
];

function getTextFromMessage(msg) {
    const message = msg?.message || {};
    return (
        message.conversation ||
        message.extendedTextMessage?.text ||
        message.imageMessage?.caption ||
        message.videoMessage?.caption ||
        ""
    ).trim();
}

function getQuotedMessageId(msg) {
    const message = msg?.message || {};
    const contextInfo =
        message.extendedTextMessage?.contextInfo ||
        message.imageMessage?.contextInfo ||
        message.videoMessage?.contextInfo ||
        message.documentMessage?.contextInfo ||
        message.audioMessage?.contextInfo ||
        message.stickerMessage?.contextInfo;

    return contextInfo?.stanzaId || null;
}

function getCommandName(cmd) {
    if (!cmd) return "";

    if (typeof cmd.name === "string") {
        return cmd.name;
    }

    if (cmd.name instanceof RegExp) {
        const match = cmd.name.source.match(/[a-z0-9]+/i);
        return match ? match[0] : "";
    }

    if (cmd.pattern instanceof RegExp) {
        const match = cmd.pattern.source.match(/[a-z0-9]+/i);
        return match ? match[0] : "";
    }

    return "";
}

function commandBelongsToCategory(cmd, selectedCat) {
    const cmdName = getCommandName(cmd).toLowerCase();
    const cmdCategory = String(cmd.category || "other").toLowerCase();
    const cmdDesc = String(cmd.desc || "").toLowerCase();

    if (selectedCat.categoryAliases.includes(cmdCategory)) return true;

    return selectedCat.keywords.some((kw) => {
        return cmdName.includes(kw) || cmdDesc.includes(kw) || cmdCategory.includes(kw);
    });
}

async function showCategoryMenu(client, m, categoryNumber, prefix, quotedMsg = null) {
    const selectedCat = categoriesList.find((cat) => cat.num === categoryNumber);
    if (!selectedCat) return false;

    const catCommands = [];

    if (Array.isArray(commands)) {
        commands.forEach((cmd) => {
            if (!cmd || cmd.dontAddCommandList) return;

            const cmdName = getCommandName(cmd);
            if (!cmdName) return;

            if (commandBelongsToCategory(cmd, selectedCat)) {
                if (!catCommands.includes(cmdName)) catCommands.push(cmdName);
            }
        });
    }

    let categoryMenu = `
╔════════════════════════════╗
║     ${selectedCat.icon} ${selectedCat.title}
║     Commands: ${catCommands.length}
╚════════════════════════════╝

┌────────────────────────────┐
`;

    if (catCommands.length > 0) {
        catCommands.sort().forEach((cmd, index) => {
            const num = String(index + 1).padStart(2, "0");
            categoryMenu += `│ ${num}. ${prefix}${cmd}\n`;
        });
    } else {
        categoryMenu += "│ 📭 මේ category එකට commands හමු වුණේ නෑ\n";
    }

    categoryMenu += `└────────────────────────────┘

💡 *භාවිතය*
➤ Command එක run කරන්න: ${prefix}command
➤ Main menu එකට යන්න: ${prefix}menu

⚡ ${selectedCat.name} SECTION ⚡
`;

    await client.sendMessage(m.jid, { text: categoryMenu }, { quoted: quotedMsg || m });
    return true;
}

function setupMenuReplyListener(client) {
    if (!client?.ev) return;
    if (global.menuReplyListenerClients.has(client)) return;

    global.menuReplyListenerClients.add(client);

    client.ev.on("messages.upsert", async (chatUpdate) => {
        try {
            const messages = chatUpdate.messages || [];

            for (const msg of messages) {
                if (!msg?.message) continue;
                if (msg.key?.fromMe) continue;

                const text = getTextFromMessage(msg);
                if (!/^[1-7]$/.test(text)) continue;

                const quotedId = getQuotedMessageId(msg);
                if (!quotedId) continue;

                const menuData = global.menuReplyStore.get(quotedId);
                if (!menuData) continue;

                if (Date.now() > menuData.expiresAt) {
                    global.menuReplyStore.delete(quotedId);
                    continue;
                }

                if (menuData.jid !== msg.key.remoteJid) continue;

                const fakeM = {
                    ...msg,
                    jid: msg.key.remoteJid,
                    sender: msg.key.participant || msg.key.remoteJid,
                    prefix: menuData.prefix,
                    reply: (replyText) => client.sendMessage(msg.key.remoteJid, { text: replyText }, { quoted: msg })
                };

                await showCategoryMenu(client, fakeM, Number(text), menuData.prefix, msg);
            }
        } catch (err) {
            console.log("Menu reply listener error:", err);
        }
    });
}

Sparky({
    name: "menu",
    category: "misc",
    fromMe: isPublic,
    desc: "සියලුම විධාන බලන්න"
}, async ({ client, m, args }) => {
    try {
        setupMenuReplyListener(client);

        const prefix = m.prefix || ".";
        let userInput = "";

        if (Array.isArray(args)) {
            userInput = args.join(" ").trim();
        } else if (typeof args === "string") {
            userInput = args.trim();
        }

        if (/^[1-7]$/.test(userInput)) {
            await showCategoryMenu(client, m, Number(userInput), prefix);
            return;
        }

        const uptime = typeof m.uptime === "function" ? await m.uptime() : "Unknown";
        const now = new Date();
        const date = now.toLocaleDateString("en-IN", { timeZone: "Asia/Colombo" });
        const time = now.toLocaleTimeString("en-IN", { timeZone: "Asia/Colombo" });
        const botName = config.BOT_INFO ? config.BOT_INFO.split(";")[0] : "SADEW MINI";
        const totalCommands = Array.isArray(commands) ? commands.length : 0;

        const mainMenu = `
╔══════════════════════════════╗
║          🤖 ${botName}
║          ✨ MAIN MENU ✨
╚══════════════════════════════╝

┌──────────────────────────────┐
│          👤 USER INFO
├──────────────────────────────┤
│ 🏷️ නම      : ${m.pushName || "Guest"}
│ 🔖 මාදිලිය : ${config.WORK_TYPE || "Public"}
│ 📅 දිනය    : ${date}
│ ⏰ වේලාව   : ${time}
│ ⚡ Uptime  : ${uptime}
│ 📦 Plugins : ${totalCommands}
│ 🔰 Prefix  : ${prefix}
└──────────────────────────────┘

┌──────────────────────────────┐
│          📚 CATEGORIES
├──────────────────────────────┤
│
│  1. 📥 DOWNLOAD MENU
│     YT, FB, IG වීඩියෝ
│
│  2. 🧠 AI MENU
│     ChatGPT, Gemini, Bot
│
│  3. 👥 GROUP MENU
│     Group එක manage කරන්න
│
│  4. ⚙️ ADMIN MENU
│     Admin වැඩ කටයුතු
│
│  5. 🔧 TOOLS MENU
│     Sticker, QR, Converter
│
│  6. 👑 OWNER MENU
│     Bot පාලනය සඳහා
│
│  7. 📁 OTHER MENU
│     වෙනත් විධාන
│
└──────────────────────────────┘

┌──────────────────────────────┐
│          💡 HOW TO USE
├──────────────────────────────┤
│ මේ message එකට reply කරලා
│ number එක විතරක් එවන්න.
│
│ උදා:
│ Reply: 1  → DOWNLOAD MENU
│ Reply: 2  → AI MENU
│
│ නැත්නම්:
│ ${prefix}menu 1
│ ${prefix}menu 2
└──────────────────────────────┘

     💫 POWERED BY ${botName} 💫
`;

        const menuImageUrl = config.MENU_IMAGE_URL || "https://res.cloudinary.com/dqlh378fb/image/upload/v1779928206/zanta_media_uploads/n6pgdmmiivooq8ylvrao.jpg";

        const sentMsg = await client.sendMessage(m.jid, {
            image: { url: menuImageUrl },
            caption: mainMenu
        }, { quoted: m });

        const sentId = sentMsg?.key?.id;

        if (sentId) {
            global.menuReplyStore.set(sentId, {
                jid: m.jid,
                prefix,
                expiresAt: Date.now() + MENU_REPLY_TIMEOUT
            });

            setTimeout(() => {
                global.menuReplyStore.delete(sentId);
            }, MENU_REPLY_TIMEOUT);
        }
    } catch (e) {
        console.log("Menu error:", e);
        await m.reply(`❌ සමාවන්න, menu එක පෙන්වන්න බැරි වුණා.\n\nError: ${e.message}`);
    }
});
