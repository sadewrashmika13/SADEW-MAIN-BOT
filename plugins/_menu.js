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
        categoryAliases: ["download", "downloader", "media", "video", "audio", "song"],
        keywords: ["download", "down", "yt", "youtube", "facebook", "fb", "instagram", "ig", "video", "audio", "song", "music", "tiktok", "mediafire"]
    },
    {
        num: 2,
        name: "AI",
        icon: "🧠",
        title: "AI MENU",
        subtitle: "ChatGPT, Gemini, Bot",
        categoryAliases: ["ai", "chatbot", "gpt", "openai"],
        keywords: ["ai", "ask", "chatgpt", "gpt", "gemini", "bard", "bot", "deepseek", "groq", "llama"]
    },
    {
        num: 3,
        name: "GROUP",
        icon: "👥",
        title: "GROUP MENU",
        subtitle: "Group එක manage කරන්න",
        categoryAliases: ["group", "gc"],
        keywords: ["group", "gc", "tag", "mention", "invite", "link", "welcome", "goodbye", "kick", "promote", "demote"]
    },
    {
        num: 4,
        name: "ADMIN",
        icon: "⚙️",
        title: "ADMIN MENU",
        subtitle: "Admin වැඩ කටයුතු",
        categoryAliases: ["admin", "moderation"],
        keywords: ["admin", "promote", "demote", "kick", "remove", "add", "mute", "unmute", "warn", "ban"]
    },
    {
        num: 5,
        name: "TOOLS",
        icon: "🔧",
        title: "TOOLS MENU",
        subtitle: "Sticker, QR, Converter",
        categoryAliases: ["tools", "tool", "utility", "converter"],
        keywords: ["tool", "qr", "scan", "short", "url", "convert", "sticker", "photo", "image", "edit", "s"]
    },
    {
        num: 6,
        name: "OWNER",
        icon: "👑",
        title: "OWNER MENU",
        subtitle: "Bot පාලනය සඳහා",
        categoryAliases: ["owner", "sudo", "system"],
        keywords: ["owner", "restart", "shutdown", "update", "block", "unblock", "broadcast", "jid", "eval"]
    },
    {
        num: 7,
        name: "OTHER",
        icon: "📁",
        title: "OTHER MENU",
        subtitle: "වෙනත් විධාන",
        categoryAliases: ["other", "misc", "main", "general"],
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
        message.documentMessage?.caption ||
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

    const possibleNames = [
        cmd.name,
        cmd.pattern,
        cmd.command,
        cmd.cmd
    ];

    for (const item of possibleNames) {
        if (!item) continue;

        if (typeof item === "string") {
            return item.replace(/^[./!#]/, "").trim();
        }

        if (item instanceof RegExp || item.source) {
            const source = item.source || "";
            const matches = source.match(/[a-zA-Z0-9]+/g);

            if (matches && matches.length > 0) {
                return matches[matches.length - 1];
            }
        }
    }

    return "";
}

function getArgsText(args, m) {
    if (Array.isArray(args)) {
        return args.join(" ").trim();
    }

    if (typeof args === "string") {
        return args.trim();
    }

    if (args && typeof args === "object") {
        return Object.values(args).join(" ").trim();
    }

    const text = m?.text || m?.body || "";
    return text.replace(/^[./!#]menu/i, "").trim();
}

function commandBelongsToCategory(cmd, selectedCat) {
    const cmdName = getCommandName(cmd).toLowerCase();
    const cmdCategory = String(cmd.category || "other").toLowerCase();
    const cmdDesc = String(cmd.desc || "").toLowerCase();

    if (selectedCat.categoryAliases.some((cat) => cmdCategory.includes(cat))) {
        return true;
    }

    return selectedCat.keywords.some((kw) => {
        return cmdName === kw || cmdName.includes(kw) || cmdDesc.includes(kw);
    });
}

function getCommandsForCategory(selectedCat) {
    const catCommands = [];

    if (!Array.isArray(commands)) return catCommands;

    commands.forEach((cmd) => {
        if (!cmd || cmd.dontAddCommandList) return;

        const cmdName = getCommandName(cmd);
        if (!cmdName) return;

        if (commandBelongsToCategory(cmd, selectedCat)) {
            if (!catCommands.includes(cmdName)) {
                catCommands.push(cmdName);
            }
        }
    });

    return catCommands.sort();
}

async function showCategoryMenu(client, m, categoryNumber, prefix, quotedMsg = null) {
    const selectedCat = categoriesList.find((cat) => cat.num === categoryNumber);
    if (!selectedCat) return false;

    const catCommands = getCommandsForCategory(selectedCat);

    let categoryMenu = `
╔════════════════════════════╗
║     ${selectedCat.icon} ${selectedCat.title}
║     Commands: ${catCommands.length}
╚════════════════════════════╝

┌────────────────────────────┐
`;

    if (catCommands.length > 0) {
        catCommands.forEach((cmd, index) => {
            const num = String(index + 1).padStart(2, "0");
            categoryMenu += `│ ${num}. ${prefix}${cmd}\n`;
        });
    } else {
        categoryMenu += "│ 📭 මේ category එකට commands හමු වුණේ නෑ\n";
    }

    categoryMenu += `└────────────────────────────┘

💡 භාවිතය
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
                    reply: (replyText) => {
                        return client.sendMessage(msg.key.remoteJid, { text: replyText }, { quoted: msg });
                    }
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
        const userInput = getArgsText(args, m);

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
│ Reply: 1  → DOWNLOAD MENU
│ Reply: 2  → AI MENU
│ Reply: 3  → GROUP MENU
│ Reply: 4  → ADMIN MENU
│ Reply: 5  → TOOLS MENU
│ Reply: 6  → OWNER MENU
│ Reply: 7  → OTHER MENU
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
