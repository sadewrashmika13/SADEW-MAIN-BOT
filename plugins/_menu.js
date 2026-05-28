const {
    Sparky,
    commands,
    isPublic
} = require("../lib");
const config = require("../config.js");

Sparky({
    name: "menu",
    category: "misc",
    fromMe: isPublic,
    desc: "📋 සියලුම විධාන බලන්න - අංකයක් එවන්න"
}, async ({
    client,
    m,
    args
}) => {
    try {
        // ========== args හරියට handle කරන්න ==========
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
        
        // ========== category number එකක් එව්වාද? ==========
        if (userInput && /^[0-9]+$/.test(userInput)) {
            let selectedNum = parseInt(userInput);
            
            const categoriesList = [
                { num: 1, name: "DOWNLOAD", icon: "📥", keywords: ["download", "yt", "youtube", "facebook", "fb", "instagram", "ig", "media", "video", "audio", "song", "music"] },
                { num: 2, name: "AI", icon: "🧠", keywords: ["ai", "chatgpt", "gpt", "gemini", "bard", "chatbot", "ai chat"] },
                { num: 3, name: "GROUP", icon: "👥", keywords: ["group", "gc", "gcast", "groupcast", "tag", "mention", "invite", "link", "group info"] },
                { num: 4, name: "ADMIN", icon: "⚙️", keywords: ["admin", "promote", "demote", "kick", "remove", "add", "mute", "unmute", "warning", "warn"] },
                { num: 5, name: "TOOLS", icon: "🔧", keywords: ["tool", "qr", "scanner", "shortener", "url", "converter", "sticker", "photo", "image", "edit"] },
                { num: 6, name: "OWNER", icon: "👑", keywords: ["owner", "bot", "restart", "shutdown", "update", "block", "unblock", "broadcast"] },
                { num: 7, name: "OTHER", icon: "📁", keywords: ["fun", "game", "meme", "quote", "weather", "news", "search", "info"] }
            ];
            
            let selectedCat = categoriesList.find(cat => cat.num === selectedNum);
            
            if (selectedCat) {
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
                        } else {
                            for (let kw of selectedCat.keywords) {
                                if (cmdDesc.includes(kw) || cmdNameStr.includes(kw)) {
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
                        let num = (idx + 1).toString().padStart(2);
                        categoryMenu += `│ ${num}. ${cmd}\n`;
                    });
                } else {
                    categoryMenu += `│    📭 කිසිදු command එකක් නැත\n`;
                }
                categoryMenu += `
└────────────────────────────┘

💡 *භාවිතය*
┣ ➤ ${m.prefix || "."}menu [number] - category එක බලන්න
┣ ➤ ${m.prefix || "."}menu - ප්‍රධාන මෙනුවට
┗ ➤ ${m.prefix || "."}help - උදව් සඳහා

━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ⚡ ${selectedCat.name} SECTION ⚡
━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
                return await client.sendMessage(m.jid, { text: categoryMenu }, { quoted: m });
            }
        }
        
        // ========== ප්‍රධාන මෙනුව (IMAGE + CAPTION) ==========
        let uptime = await m.uptime();
        let now = new Date();
        let date = now.toLocaleDateString("en-IN", { timeZone: "Asia/Colombo" });
        let time = now.toLocaleTimeString("en-IN", { timeZone: "Asia/Colombo" });
        
        let botName = config.BOT_INFO ? config.BOT_INFO.split(";")[0] : "SADEW MINI";
        
        let mainMenu = `
╔══════════════════════════════════╗
║        🤖 ${botName}                ║
║      ✨ MAIN MENU ✨               ║
╚══════════════════════════════════╝

┌──────────────────────────────────┐
│         👤 USER INFO              │
├──────────────────────────────────┤
│ 🏷 නම     : ${m.pushName || "Guest"}
│ 🔖 මාදිලිය  : ${config.WORK_TYPE || "Public"}
│ 📅 දිනය    : ${date}
│ ⏰ වේලාව    : ${time}
│ ⚡ වැඩ කල කාලය : ${uptime}
│ 📦 ප්ලගින් : ${commands ? (Array.isArray(commands) ? commands.length : 0) : 0}
│ 🔰 පෙරවරු : ${m.prefix || "."}
└──────────────────────────────────┘

┌──────────────────────────────────┐
│        📚 CATEGORIES             │
├──────────────────────────────────┤
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
└──────────────────────────────────┘

┌──────────────────────────────────┐
│         💡 HOW TO USE             │
├──────────────────────────────────┤
│                                  
│  📌 අංකයක් එවන්න :               
│                                  
│     ${m.prefix || "."}menu 1  → DOWNLOAD
│     ${m.prefix || "."}menu 2  → AI
│     ${m.prefix || "."}menu 3  → GROUP
│     ${m.prefix || "."}menu 4  → ADMIN
│     ${m.prefix || "."}menu 5  → TOOLS
│     ${m.prefix || "."}menu 6  → OWNER
│     ${m.prefix || "."}menu 7  → OTHER
│
└──────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     💫 POWERED BY ${botName} 💫
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

        // 🖼️ ප්‍රධාන මෙනුව IMAGE එකක් + CAPTION එකක් ලෙස යවන්න
        const menuImageUrl = config.MENU_IMAGE_URL || "https://res.cloudinary.com/dqlh378fb/image/upload/v1779928206/zanta_media_uploads/n6pgdmmiivooq8ylvrao.jpg";
        
        await client.sendMessage(m.jid, {
            image: { url: menuImageUrl },
            caption: mainMenu
        }, { quoted: m });
        
    } catch (e) {
        console.log("Menu error:", e);
        console.log("Error stack:", e.stack);
        m.reply(`❌ සමාවන්න, මෙනුව පෙන්වන්න බැරි වුණා.\n\n📝 *Error:* ${e.message}\n\n💡 උපදෙස්: ${m.prefix || "."}help`);
    }
});
