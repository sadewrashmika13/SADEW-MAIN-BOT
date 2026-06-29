const { Sparky, commands, isPublic } = require("../lib");
const config = require("../config.js");

// Users ලා කිහිප දෙනෙක් එකපාර මෙනු එක පාවිච්චි කරද්දී පැටලෙන්නේ නැති වෙන්න Map එකක් පාවිච්චි කරනවා
if (!global.menuContexts) global.menuContexts = {};

// Helper function to show category submenu
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

// 1. ප්‍රධාන මෙනුව යවන කමාන්ඩ් එක
Sparky({
    name: "menu",
    alias: ["help", "list"],
    category: "misc",
    fromMe: isPublic,
    desc: "📋 සියලුම විධාන බලන්න"
}, async ({ client, m, args }) => {
    try {
        let userInput = args ? (Array.isArray(args) ? args.join(" ").trim() : args.trim()) : "";
        
        // කෙලින්ම ".menu 1" වගේ ගැහුවොත් අදාළ මෙනුවට යෑම
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

📌 *ඉදිරියට යාමට අදාළ අංකය Reply කරන්න.* (Reply with a number)
`;

        const menuImageUrl = config.MENU_IMAGE_URL || "https://res.cloudinary.com/dqlh378fb/image/upload/v1780590033/zanta_media_uploads/dttqjshprca9zvqcpbwg.jpg";
        
        const sentMsg = await client.sendMessage(m.jid, {
            image: { url: menuImageUrl },
            caption: mainMenu
        }, { quoted: m });
        
        // 🔴 ඔයා හොයාගත්ත සුපිරි ලොජික් එක මෙතන තියෙනවා: ID එක සේව් කිරීම
        global.menuContexts[m.sender] = { 
            step: "main_menu", 
            quotedId: sentMsg.key.id 
        };
        
        // විනාඩි 5කින් Auto Clear වෙන්න හදනවා (Memory එක පිරෙන්නේ නැති වෙන්න)
        setTimeout(() => {
            if (global.menuContexts[m.sender]) delete global.menuContexts[m.sender];
        }, 5 * 60 * 1000);
        
    } catch (e) {
        console.log("Menu error:", e);
        m.reply(`❌ සමාවන්න, මෙනුව පෙන්වන්න බැරි වුණා.\n📝 *Error:* ${e.message}`);
    }
});

// 2. අර ඔයා හොයාගත්ත Reply අල්ලන සුපිරි ලොජික් එක! (Listen to text replies)
Sparky({
    on: "text",
    fromMe: isPublic,
    dontAddCommandList: true
}, async ({ client, m }) => {
    let context = global.menuContexts[m.sender];
    
    // User ට Context එකක් නැත්නම් හෝ Reply කරලා නැත්නම් මුකුත් කරන්නේ නෑ
    if (!context || !m.quoted) return;

    // මැසේජ් එක රිප්ලයි කරලා තියෙන්නේ අපේ මෙනු එකටමද කියලා බලනවා
    if (context.step === "main_menu" && m.quoted.key.id === context.quotedId) {
        let number = parseInt(m.text.trim());
        
        // 1 ඉඳන් 8 ට අංකයක් ගැහුවොත්
        if (!isNaN(number) && number >= 1 && number <= 8) {
            await showCategoryMenu(client, m, number, m.prefix || ".");
            
            // වැඩේ ඉවර වුණාට පස්සේ Context එක අයින් කරනවා (එක පාරයි වැඩ කරන්නේ)
            delete global.menuContexts[m.sender];
        }
    }
});
