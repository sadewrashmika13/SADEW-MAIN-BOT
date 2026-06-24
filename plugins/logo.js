// commands/logo.js
const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

// 1. Global Context (Memory එක හදනවා)
if (!global.logoPluginContext) global.logoPluginContext = {};

// TextPro Effects List එක
const textProEffects = [
    "alien-glow", "neon-blue", "neon-pink", "neon-purple", "neon-red", "neon-gold", "neon-cyan", "neon-orange", "neon-white",
    "3d-outline", "3d-blue", "3d-red", "3d-green", "3d-purple", "chrome", "gold-chrome", "blue-chrome", "copper-chrome",
    "epic-3d", "simple-3d", "fire", "inferno", "lava", "ice-fire", "embossed", "gold-embossed", "classic-gold", "retro",
    "groovy", "groovy-blue", "steel", "dark-steel", "comic-pop", "comic-red", "graffiti", "graffiti-green", "old-stone",
    "stone-blue", "carved", "glitter-gold", "glitter-silver", "glitter-pink", "glitter-blue", "glitter-green", "glitter-purple",
    "glitter-red", "glitter-cyan", "glitter-orange", "glitter-bronze", "gradient", "gradient-blue", "gradient-green",
    "curvy", "curvy-orange", "basic-bold", "basic-red", "scratch", "scratch-silver", "elegant", "elegant-silver",
    "tribal", "tribal-red", "sketch", "sketch-blue", "racing", "racing-blue", "medieval", "medieval-gold", "chalk",
    "chalk-pink", "sparkle", "sparkle-blue", "sparkle-pink", "sharp", "sharp-blue", "fantasy", "fantasy-gold", "watercolor",
    "watercolor-green", "blocky", "blocky-blue", "glass", "glass-green", "stencil", "stencil-red", "matrix", "matrix-blue",
    "nifty", "nifty-purple", "futuristic", "futuristic-red", "vintage", "vintage-gold", "candy", "candy-blue", "pastel",
    "pastel-mint", "metallic", "metallic-gold", "pixel", "pixel-green", "western", "western-gold", "horror", "horror-green",
    "sci-fi", "sci-fi-red", "frost", "frost-blue"
];

// Helper function
function getQuery(args) {
    if (!args) return "";
    if (Array.isArray(args)) return args.join(" ").trim();
    if (typeof args === "string") return args.trim();
    if (typeof args === "object") return Object.values(args).join(" ").trim();
    return "";
}

// 2. Main Command (මෙනු එක යවන කමාන්ඩ් එක)
Sparky({
    name: "logo",
    alias: ["textpro", "maker"],
    fromMe: isPublic,
    category: "logo",
    desc: "🎨 TextPro API භාවිතයෙන් HD ලාංඡන සාදන්න"
}, async ({ client, m, args }) => {
    try {
        let textToGenerate = getQuery(args);

        if (!textToGenerate) {
            return m.reply(`❌ *කරුණාකර නමක් ලබා දෙන්න.*
            
*Usage:* ${m.prefix}logo <name>
*Example:* ${m.prefix}logo Sadew

*ඉන්පසු ලැයිස්තුවෙන් අංකයක් Reply කරන්න.*`);
        }

        // මෙනු එක ලස්සනට හදනවා
        let menuText = `✨ *SADEW-MD LOGO MAKER* ✨\n\n`;
        menuText += `📝 *ඔබේ නම:* ${textToGenerate}\n\n`;
        menuText += `*කරුණාකර පහත ලැයිස්තුවෙන් ඔබට අවශ්‍ය Logo Effect එකේ අංකය මෙම පණිවිඩයට Reply කරන්න:*\n\n`;

        textProEffects.forEach((effect, index) => {
            let cleanName = effect.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            menuText += `*${index + 1}.* ${cleanName}\n`;
        });

        menuText += `\n📌 *Reply with the number only (e.g., 12)*`;

        // මෙනු එක Send කරනවා
        let sentMsg = await client.sendMessage(m.jid, { text: menuText }, { quoted: m });

        // User ගේ Memory එකට Message ID එකයි Text එකයි සේව් කරනවා
        global.logoPluginContext[m.sender] = {
            quotedId: sentMsg.key.id,
            data: textToGenerate,
            timestamp: Date.now()
        };

        // 5 minutes auto-clear
        setTimeout(() => {
            if (global.logoPluginContext[m.sender]) {
                delete global.logoPluginContext[m.sender];
            }
        }, 5 * 60 * 1000);

    } catch (err) {
        console.error("Menu Send Error:", err);
        m.reply("❌ *මෙනුව යැවීමට නොහැකි විය.*");
    }
});

// 🔥 FIX: Listener Command (අංකයට රිප්ලයි කරාම අල්ලගන්න කමාන්ඩ් එක)
// Using pattern: /^\d+$/ to match only numbers
Sparky({
    name: "logo_reply",
    pattern: /^\d+$/,      // 👈 numbers only
    dontPrefix: true,      // 👈 allows raw number without dot
    fromMe: false,
    dontAddCommandList: true,
    desc: "Logo effect selection"
}, async ({ client, m }) => {
    let context = global.logoPluginContext[m.sender];

    // Memory එකේ දත්ත නැත්නම් හරි, රිප්ලයි කරලා නැත්නම් හරි අතෑරලා දානවා
    if (!context || !m.quoted) return;

    // රිප්ලයි කරපු මැසේජ් එකේ ID එක, සේව් කරපු මැසේජ් එකේ ID එකට සමානද බලනවා
    if (m.quoted.key.id !== context.quotedId) return;

    let choice = parseInt(m.text.trim());

    // වැරදි අංකයක් ගැහුවොත්
    if (isNaN(choice) || choice < 1 || choice > textProEffects.length) {
        return m.reply(`❌ *කරුණාකර ලැයිස්තුවේ ඇති නිවැරදි අංකයක් පමණක් Reply කරන්න.*
        
💡 Valid numbers: 1-${textProEffects.length}`);
    }

    // ✅ අංකය හරි නම්, Memory එක අනිවාර්යයෙන්ම මකනවා
    let textToGenerate = context.data;
    delete global.logoPluginContext[m.sender];

    // ⏳ ලෝඩින් එක
    await m.reply(`⏳ *Logo එක සාදමින්...*\nEffect: ${textProEffects[choice - 1]}\nText: ${textToGenerate}\n_මෙය තත්පර කිහිපයක් ගත විය හැක._`);

    // තේරුව Effect එක ගන්නවා
    let selectedEffect = textProEffects[choice - 1];
    let cleanName = selectedEffect.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    // ✅ XWOLF API එක (GET request)
    const API_KEY = "wxa_f_4e840b5e42";
    const API_URL = `https://apis.xwolf.space/api/textpro/${selectedEffect}?text=${encodeURIComponent(textToGenerate)}&key=${API_KEY}`;

    try {
        let response = await axios.get(API_URL, { timeout: 30000 });
        let apiData = response.data;

        if (apiData.success && apiData.imageUrl) {
            let finalCaption = `✨ *SADEW-MD LOGO MAKER* ✨\n\n`;
            finalCaption += `🎨 *Effect:* ${cleanName}\n`;
            finalCaption += `📝 *Text:* ${apiData.text || textToGenerate}\n`;
            finalCaption += `⚡ *Powered by:* ${apiData.provider || "XWOLF"}`;

            // හදපු ලෝගෝ එක Chat එකට යවනවා
            await client.sendMessage(m.jid, {
                image: { url: apiData.imageUrl },
                caption: finalCaption
            }, { quoted: m });

            await m.react("✅");
        } else {
            throw new Error(apiData.message || "API එකෙන් අදාළ ඡායාරූපය ලබා දුන්නේ නැත.");
        }

    } catch (error) {
        console.error("[LOGO MAKER ERROR]:", error.message);

        let errMsg = error.response?.data?.error || error.message || "Unknown error";
        m.reply(`❌ *ලෝගෝව නිර්මාණය කිරීමට නොහැකි විය.*

📝 *හේතුව:* ${errMsg}

💡 *විසඳුම්:*
- නිවැරදි අංකයක් තෝරා ගන්න
- නැවත උත්සාහ කරන්න
- Effect එක කෙලින්ම භාවිතා කරන්න: \`.logo ${selectedEffect} ${textToGenerate}\``);
    }
});
