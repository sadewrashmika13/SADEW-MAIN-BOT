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
    desc: "📋 සියලුම විධාන බලන්න"
}, async ({
    client,
    m,
    args
}) => {
    try {
        // එක් කමාන්ඩ් එකක් ගැන විස්තරයක් ඇවිත් නම්
        if (args && args.length > 0) {
            for (let cmd of commands) {
                if (cmd.name && cmd.name.test(args)) {
                    return m.reply(`📌 *Command:* ${args.trim()}\n📝 *Description:* ${cmd.desc || "No description"}`);
                }
            }
            return m.reply(`❌ "${args}" කියන කමාන්ඩ් එක හමු වුනේ නැහැ.`);
        }

        // ප්‍රධාන මෙනුව
        let uptime = await m.uptime();
        let [date, time] = new Date().toLocaleString("en-IN", {
            timeZone: "Asia/Colombo"
        }).split(",");
        
        let botName = config.BOT_INFO.split(";")[0] || "SADEW MINI";
        let owner = config.BOT_INFO.split(";")[1] || "Sadew";
        
        // ========== ලස්සන මෙනුව ==========
        let menu = `
┏━━━━━━━━━━━━━━━━━━┓
┃   🤖 ${botName}   
┃   ✨ ඔයාව පිළිගන්නවා
┗━━━━━━━━━━━━━━━━━━┛

▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

👤 *ඔයාගේ තොරතුරු*
┣ 🏷 නම : ${m.pushName || "Guest"}
┣ 🔖 තත්වය : ${config.WORK_TYPE || "Public"}
┣ 📅 දිනය : ${date}
┣ ⏰ වේලාව : ${time}
┣ ⚡ ක්‍රියාත්මක කාලය : ${uptime}
┣ 📦 ප්ලගින් ගණන : ${commands.length}
┗ 🔰 පෙරවරු : ${m.prefix || "."}

▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

📚 *කමාන්ඩ් මෙනුව*
`;

        // කැටගරි අනුව කමාන්ඩ් එකතු කරන්න
        let categories = {};
        
        commands.forEach(cmd => {
            if (cmd.dontAddCommandList) return;
            
            let cat = cmd.category || "general";
            cat = cat.toLowerCase().replace(/[^a-z]/g, '');
            
            let cmdName = cmd.name;
            if (typeof cmdName === 'object' && cmdName.source) {
                cmdName = cmdName.source.split('\\s*')[1]?.toString().match(/([a-z0-9]+)/i)?.[1] || "unknown";
            }
            
            if (!categories[cat]) categories[cat] = [];
            if (cmdName && cmdName !== "unknown") {
                categories[cat].push(cmdName);
            }
        });

        // කැටගරි අනුපිළිවෙලට පෙන්වන්න
        const order = ["owner", "admin", "group", "download", "ai", "sticker", "tools", "misc", "general"];
        
        Object.keys(categories).sort((a, b) => {
            let idxA = order.indexOf(a);
            let idxB = order.indexOf(b);
            if (idxA === -1) idxA = 999;
            if (idxB === -1) idxB = 999;
            return idxA - idxB;
        }).forEach(cat => {
            if (categories[cat].length > 0) {
                let icon = {
                    owner: "👑", admin: "⚙️", group: "👥", 
                    download: "📥", ai: "🧠", sticker: "🎴",
                    tools: "🔧", misc: "🎮", general: "📌"
                }[cat] || "📁";
                
                menu += `\n${icon} *${cat.toUpperCase()}*\n`;
                menu += `┣━━━━━━━━━━━━━━━━\n`;
                
                categories[cat].forEach(c => {
                    menu += `┃ 🔸 ${c}\n`;
                });
                menu += `┗━━━━━━━━━━━━━━━━\n`;
            }
        });

        menu += `
▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

💡 *උපදෙස්*
┣ ➤ ${m.prefix || "."}menu [command] - කමාන්ඩ් එක ගැන විස්තර
┣ ➤ ${m.prefix || "."}ping - බොට් එක සජීවීද බලන්න
┗ ➤ ${m.prefix || "."}alive - බොට් තොරතුරු

━━━━━━━━━━━━━━━━━━━━━
   💫 POWERED BY SADEW MINI 💫
━━━━━━━━━━━━━━━━━━━━━
`;

        // මෙනුව යවන්න
        await client.sendMessage(m.jid, {
            text: menu
        }, { quoted: m });
        
    } catch (e) {
        console.log("Menu error:", e);
        m.reply("❌ සමාවන්න, මෙනුව පෙන්වන්න බැරි වුණා. ටික වෙලාවකින් නැවත උත්සාහ කරන්න.");
    }
});
