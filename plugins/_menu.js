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
        // ========== පළමුව: ඔයාගේ command එක එව්වාට පස්සේ කියවීම ==========
        // මෙතනදි category එකක number එකක් එව්වද කියලා check කරනවා
        
        let userMessage = args.join(" ").trim();
        
        // යවපු message එක number එකක්ද කියලා check කරන්න
        if (userMessage && /^[0-9]+$/.test(userMessage)) {
            let selectedNum = parseInt(userMessage);
            
            // categories define කරන්න
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
                // ඒ category එකට අදාල commands හොයන්න
                let catCommands = [];
                
                commands.forEach(cmd => {
                    if (cmd.dontAddCommandList) return;
                    
                    let cmdName = cmd.name;
                    if (typeof cmdName === 'object' && cmdName.source) {
                        cmdName = cmdName.source.split('\\s*')[1]?.toString().match(/([a-z0-9]+)/i)?.[1] || "";
                    }
                    
                    let cmdCategory = (cmd.category || "other").toLowerCase();
                    let cmdDesc = (cmd.desc || "").toLowerCase();
                    
                    // command එක මේ category එකට අදාලද කියලා check කරන්න
                    let isInCategory = false;
                    
                    if (cmdCategory === selectedCat.name.toLowerCase()) {
                        isInCategory = true;
                    } else {
                        // නැත්නම් keywords වලින් check කරන්න
                        for (let kw of selectedCat.keywords) {
                            if (cmdDesc.includes(kw) || (cmdName && cmdName.includes(kw))) {
                                isInCategory = true;
                                break;
                            }
                        }
                    }
                    
                    if (isInCategory && cmdName) {
                        catCommands.push(cmdName);
                    }
                });
                
                // අනෙක් commands category එකට දාන්න (OTHER සඳහා)
                if (selectedCat.name === "OTHER") {
                    const allCatNames = categoriesList.map(c => c.name.toLowerCase());
                    commands.forEach(cmd => {
                        if (cmd.dontAddCommandList) return;
                        let cmdName = cmd.name;
                        if (typeof cmdName === 'object' && cmdName.source) {
                            cmdName = cmdName.source.split('\\s*')[1]?.toString().match(/([a-z0-9]+)/i)?.[1] || "";
                        }
                        let cmdCategory = (cmd.category || "other").toLowerCase();
                        if (!allCatNames.includes(cmdCategory) && cmdName && !catCommands.includes(cmdName)) {
                            catCommands.push(cmdName);
                        }
                    });
                }
                
                // category menu එක හදන්න
                let categoryMenu = `
╔════════════════════════════╗
║     ${selectedCat.icon} ${selectedCat.name} MENU     
║        commands : ${catCommands.length}        
╚════════════════════════════╝

┌────────────────────────────┐
`;

                if (catCommands.length > 0) {
                    catCommands.sort().forEach((cmd, idx) => {
                        categoryMenu += `│ ${(idx+1).toString().padStart(2)}. ${cmd}\n`;
                    });
                } else {
                    categoryMenu += `│    📭 commands නැත\n`;
                }

                categoryMenu += `
└────────────────────────────┘

💡 *භාවිතය*
┣ ➤ ${m.prefix}${cmdName} [command]
┣ ➤ ${m.prefix}menu - ප්‍රධාන මෙනුවට
┗ ➤ ${m.prefix}menu [number] - category එක බලන්න

━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ⚡ ${selectedCat.name} SECTION ⚡
━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
                
                return await client.sendMessage(m.jid, { text: categoryMenu }, { quoted: m });
            }
        }
        
        // ========== ප්‍රධාන මෙනුව (categories list එක) ==========
        let uptime = await m.uptime();
        let [date, time] = new Date().toLocaleString("en-IN", {
            timeZone: "Asia/Colombo"
        }).split(",");
        
        let botName = config.BOT_INFO ? config.BOT_INFO.split(";")[0] : "SADEW MINI";
        let owner = config.BOT_INFO ? config.BOT_INFO.split(";")[1] : "Sadew";
        
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
│ 📦 ප්ලගින් : ${commands.length}
│ 🔰 පෙරවරු : ${m.prefix || "."}
└──────────────────────────────────┘

┌──────────────────────────────────┐
│        📚 CATEGORIES             │
├──────────────────────────────────┤
│                                  
│  ┌────────────────────────────┐
│  │ 1. 📥 DOWNLOAD MENU        │
│  │    YT, FB, IG වීඩියෝ      │
│  └────────────────────────────┘
│
│  ┌────────────────────────────┐
│  │ 2. 🧠 AI MENU              │
│  │    ChatGPT, Gemini, Bot    │
│  └────────────────────────────┘
│
│  ┌────────────────────────────┐
│  │ 3. 👥 GROUP MENU           │
│  │    Group එක manage කරන්න   │
│  └────────────────────────────┘
│
│  ┌────────────────────────────┐
│  │ 4. ⚙️ ADMIN MENU           │
│  │    Admin වැඩ කටයුතු       │
│  └────────────────────────────┘
│
│  ┌────────────────────────────┐
│  │ 5. 🔧 TOOLS MENU           │
│  │    Sticker, QR, Converter  │
│  └────────────────────────────┘
│
│  ┌────────────────────────────┐
│  │ 6. 👑 OWNER MENU           │
│  │    Bot පාලනය සඳහා        │
│  └────────────────────────────┘
│
│  ┌────────────────────────────┐
│  │ 7. 📁 OTHER MENU           │
│  │    වෙනත් විධාන            │
│  └────────────────────────────┘
│
└──────────────────────────────────┘

┌──────────────────────────────────┐
│         💡 HOW TO USE            │
├──────────────────────────────────┤
│                                  
│  ✨ අංකයක් එවන්න :             
│                                  
│     ${m.prefix || "."}menu 1  - DOWNLOAD menu
│     ${m.prefix || "."}menu 2  - AI menu
│     ${m.prefix || "."}menu 3  - GROUP menu
│     ${m.prefix || "."}menu 4  - ADMIN menu
│     ${m.prefix || "."}menu 5  - TOOLS menu
│     ${m.prefix || "."}menu 6  - OWNER menu
│     ${m.prefix || "."}menu 7  - OTHER menu
│
└──────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     💫 POWERED BY ${botName} 💫
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

        // main menu එක යවන්න
        await client.sendMessage(m.jid, { text: mainMenu }, { quoted: m });
        
    } catch (e) {
        console.log("Menu error:", e);
        m.reply(`❌ සමාවන්න, මෙනුව පෙන්වන්න බැරි වුණා.\n📝 Error: ${e.message}`);
    }
});
