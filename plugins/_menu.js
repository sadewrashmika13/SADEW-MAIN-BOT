const {
    Sparky,
    commands,
    isPublic
} = require("../lib");
const config = require("../config.js");

// Buttons යවන්න අවශ්‍ය Baileys Packages
const { generateWAMessageFromContent, proto, prepareWAMessageMedia } = require("@whiskeysockets/baileys");

// Global set to track main menu message IDs
if (!global.menuMsgIds) global.menuMsgIds = new Set();

// Helper function to show category submenu (reused in both .menu number and reply handler)
async function showCategoryMenu(client, m, categoryNumber, prefix) {
    const defaultImg = config.MENU_IMAGE_URL || "https://res.cloudinary.com/dqlh378fb/image/upload/v1780590033/zanta_media_uploads/dttqjshprca9zvqcpbwg.jpg";

    const categoriesList = [
        { num: 1, name: "DOWNLOAD", image: "https://res.cloudinary.com/dqlh378fb/image/upload/v1782010878/zanta_media_uploads/k6btsgegjtnjuykb7g7f.jpg", icon: "📥", keywords: ["download", "yt", "youtube", "facebook", "fb", "instagram", "ig", "media", "video"] },
        { num: 2, name: "AI", image: "https://res.cloudinary.com/dqlh378fb/image/upload/v1782010845/zanta_media_uploads/j4lvxxlc48np5muhyn1a.jpg", icon: "🧠", keywords: ["ai", "chatgpt", "gpt", "gemini", "bard", "chatbot", "ai chat"] },
        { num: 3, name: "GROUP", image: defaultImg, icon: "👥", keywords: ["group", "gc", "gcast", "groupcast", "tag", "mention", "invite", "link", "group info"] },
        { num: 4, name: "ADMIN", image: defaultImg, icon: "⚙️", keywords: ["admin", "promote", "demote", "kick", "remove", "add", "mute", "unmute", "warning", "warn"] },
        { num: 5, name: "TOOLS", image: "https://res.cloudinary.com/dqlh378fb/image/upload/v1782010867/zanta_media_uploads/snnqp75qm9iuzouz6piu.jpg", icon: "🔧", keywords: ["tool", "qr", "scanner", "shortener", "url", "converter", "sticker", "photo", "image", "edit"] },
        { num: 6, name: "OWNER", image: defaultImg, icon: "👑", keywords: ["owner", "bot", "restart", "shutdown", "update", "block", "unblock", "broadcast"] },
        { num: 7, name: "OTHER", image: defaultImg, icon: "📁", keywords: ["fun", "game", "meme", "quote", "weather", "news", "search", "info"] },
        { num: 8, name: "SONG", image: "https://res.cloudinary.com/dqlh378fb/image/upload/v1782010855/zanta_media_uploads/hy5xd30khptmco5hcksw.jpg", icon: "🎵", keywords: ["song", "music", "mp3", "play", "audio", "spotify", "ytmp3", "lyrics"] }
    ];
    
    let selectedCat = categoriesList.find(cat => cat.num === categoryNumber);
    if (!selectedCat) return false;

    let allValidCategories = categoriesList.map(c => c.name.toLowerCase());
    let catCommands = [];

    if (commands && Array.isArray(commands)) {
        commands.forEach(cmd => {
            if (cmd.dontAddCommandList) return;
            
            let cmdName = cmd.name;
            let cmdNameStr = "";
            if (typeof cmdName === 'object' && cmdName && cmdName.source) {
                let match = cmdName.source.split('\\s*')[1]?.toString().match(/([a-z0-9]+)/i);
                cmdNameStr = match ? match[1] : "";
            } else if (typeof cmdName === 'string') {
                cmdNameStr = cmdName;
            } else if (cmdName && typeof cmdName === 'object') {
                cmdNameStr = Object.values(cmdName)[0] || "";
            }

            let cmdCategory = (cmd.category || "other").toLowerCase();
            let cmdDesc = (cmd.desc || "").toLowerCase();
            let isInCategory = false;
            
            if (cmdCategory === selectedCat.name.toLowerCase()) {
                isInCategory = true;
            } else if (!allValidCategories.includes(cmdCategory) || cmdCategory === "other") {
                for (let kw of selectedCat.keywords) {
                    let exactWordRegex = new RegExp(`\\b${kw}\\b`, 'i');
                    if (exactWordRegex.test(cmdDesc) || exactWordRegex.test(cmdNameStr)) {
                        isInCategory = true;
                        break;
                    }
                }
            }

            if (isInCategory && cmdNameStr && cmdNameStr !== "unknown" && cmdNameStr !== "") {
                if (!catCommands.includes(cmdNameStr)) catCommands.push(cmdNameStr);
            }
        });
    }

    let categoryMenu = `
╔════════════════════════════╗
║     ${selectedCat.icon} ${selectedCat.name} MENU     
║        commands : ${catCommands.length}        
╚════════════════════════════╝

┌────────────────────────────┐
`;
    if (catCommands.length > 0) {
        catCommands.sort().forEach((cmd, idx) => {
            let num = (idx + 1).toString().padStart(2, '0');
            categoryMenu += `│ ${num}. ${cmd}\n`;
        });
    } else {
        categoryMenu += `│    📭 කිසිදු command එකක් නැත\n`;
    }
    categoryMenu += `
└────────────────────────────┘

💡 *භාවිතය*
┣ ➤ ${prefix}menu [number] - category එක බලන්න
┣ ➤ ${prefix}menu - ප්‍රධාන මෙනුවට
┗ ➤ ${prefix}help - උදව් සඳහා

━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ⚡ ${selectedCat.name} SECTION ⚡
━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    await client.sendMessage(m.jid, { 
        image: { url: selectedCat.image }, 
        caption: categoryMenu 
    }, { quoted: m });
    
    return true;
}

// Main menu command
Sparky({
    name: "menu",
    category: "misc",
    fromMe: isPublic,
    desc: "📋 සියලුම විධාන බලන්න - අංකයක් එවන්න"
}, async ({ client, m, args }) => {
    try {
        let userInput = "";
        if (args && Array.isArray(args)) {
            userInput = args.join(" ").trim();
        } else if (args && typeof args === 'string') {
            userInput = args.trim();
        } else if (args && typeof args === 'object') {
            userInput = Object.values(args).join(" ").trim();
        } else {
            userInput = "";
        }
        
        if (userInput && /^[0-9]+$/.test(userInput)) {
            let selectedNum = parseInt(userInput);
            await showCategoryMenu(client, m, selectedNum, m.prefix || ".");
            return;
        }
        
        let uptime = await m.uptime();
        let now = new Date();
        let date = now.toLocaleDateString("en-IN", { timeZone: "Asia/Colombo" });
        let time = now.toLocaleTimeString("en-IN", { timeZone: "Asia/Colombo" });
        
        let botName = config.BOT_INFO ? config.BOT_INFO.split(";")[0] : "SADEW MINI";
        
        // ඔයා දුන්න ලස්සන Text Layout එක ඒ විදිහටම තියෙනවා
        let mainMenu = `
┌──⟡ 🤖 ${botName} ⟡──
┊
┠⪼✿ ✦ 👤 𝓝𝓪𝓶𝓮   : ${m.pushName || "Guest"}
┠⪼✿ ✦ 🔖 𝓜𝓸𝓭𝓮   : ${config.WORK_TYPE || "Public"}
┠⪼✿ ✦ 📅 𝓓𝓪𝓽𝓮   : ${date}
┠⪼✿ ✦ ⏰ 𝓣𝓲𝓶𝓮   : ${time}
┠⪼✿ ✦ ⚡ 𝓤𝓹𝓽𝓲𝓶𝓮 : ${uptime}
┠⪼✿ ✦ 📦 𝓟𝓵𝓾𝓰𝓲𝓷𝓼: ${commands ? (Array.isArray(commands) ? commands.length : 0) : 0}
┠⪼✿ ✦ 🔰 𝓟𝓻𝓮𝓯𝓲𝔁 : ${m.prefix || "."}
┊
└──⟡ ━━━━━━━━━━━━━━━━ ⟡
┏━━━━『 𝐂𝐀𝐓𝐄𝐆𝐎𝐑𝐈𝐄𝐒 』━━━━━
┣⪼ ❖ 1. 📥 Download Menu✿
┣⪼ ❖ 2. 🧠 AI Commands✿
┣⪼ ❖ 3. 👥 Group Manage✿
┣⪼ ❖ 4. ⚙️ Admin Menu✿
┣⪼ ❖ 5. 🔧 Tools & Edits✿
┣⪼ ❖ 6. 👑 Owner Area✿
┣⪼ ❖ 7. 📁 Other Cmds✿
┣⪼ ❖ 8. 🎵 Song & Music✿
┗━━━━━━━━━━━━━━━━━━━━━━━━━
⊱ ─────── { 𑁍 } ─────── ⊰
╰┈⪼ 𝘗𝘰𝘸𝘦𝘳𝘦𝘥 𝘉𝘺 ${botName} ⪻
⊱ ─────── { 𑁍 } ─────── ⊰
`;

        const menuImageUrl = config.MENU_IMAGE_URL || "https://res.cloudinary.com/dqlh378fb/image/upload/v1780590033/zanta_media_uploads/dttqjshprca9zvqcpbwg.jpg";
        
        // ෆොටෝ එක Process කිරීම
        let mediaMsg = await prepareWAMessageMedia({ image: { url: menuImageUrl } }, { upload: client.waUploadToServer });

        // යටින් වැටෙන Buttons ටික සෙට් කිරීම
        let buttons = [
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "📥 DOWNLOAD MENU", id: `${m.prefix || "."}menu 1` }) },
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🧠 AI COMMANDS", id: `${m.prefix || "."}menu 2` }) },
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "👥 GROUP MANAGE", id: `${m.prefix || "."}menu 3` }) },
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "⚙️ ADMIN MENU", id: `${m.prefix || "."}menu 4` }) },
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🔧 TOOLS & EDITS", id: `${m.prefix || "."}menu 5` }) },
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "👑 OWNER AREA", id: `${m.prefix || "."}menu 6` }) },
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "📁 OTHER CMDS", id: `${m.prefix || "."}menu 7` }) },
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🎵 SONG & MUSIC", id: `${m.prefix || "."}menu 8` }) }
        ];

        // Interactive Message එක හැදීම (Zanta-MD View Once Style)
        let interactiveMessage = {
            body: { text: mainMenu },
            footer: { text: "👇 කරුණාකර පහත මෙනුවකින් එකක් තෝරන්න" },
            header: {
                title: "",
                hasMediaAttachment: true,
                imageMessage: mediaMsg.imageMessage
            },
            nativeFlowMessage: {
                buttons: buttons
            }
        };

        let msg = generateWAMessageFromContent(m.jid, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: interactiveMessage
                }
            }
        }, { quoted: m });

        const sentMsg = await client.relayMessage(m.jid, msg.message, { messageId: msg.key.id });
        
        global.menuMsgIds.add(msg.key.id);
        setTimeout(() => global.menuMsgIds.delete(msg.key.id), 5 * 60 * 1000);
        
    } catch (e) {
        console.log("Menu error:", e);
        console.log("Error stack:", e.stack);
        m.reply(`❌ සමාවන්න, මෙනුව පෙන්වන්න බැරි වුණා.\n\n📝 *Error:* ${e.message}\n\n💡 උපදෙස්: ${m.prefix || "."}help`);
    }
});

// Button Clicks අල්ලගන්න වෙනම Commands ටික (Safe Fallback)
for (let i = 1; i <= 8; i++) {
    Sparky({
        name: `menu ${i}`,
        category: "misc",
        fromMe: isPublic,
        dontAddCommandList: true,
        desc: `Category ${i} මෙනුව පෙන්වීමට`
    }, async ({ client, m }) => {
        await showCategoryMenu(client, m, i, m.prefix || ".");
    });
}

// Command to capture replies with just a number
Sparky({
    name: "menureply",
    pattern: /^\d+$/,
    dontPrefix: true, 
    fromMe: false,
    dontAddCommandList: true,
    desc: "Internal handler for menu number replies"
}, async ({ client, m, args }) => {
    if (!m.quoted) return;
    const quotedId = m.quoted.key.id;
    if (!global.menuMsgIds || !global.menuMsgIds.has(quotedId)) return;
    
    const number = parseInt(m.text || args[0]);
    if (isNaN(number) || number < 1 || number > 8) return;
    
    const prefix = m.prefix || ".";
    await showCategoryMenu(client, m, number, prefix);
});
