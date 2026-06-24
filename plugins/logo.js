const { Sparky, isPublic } = require("../lib");
const axios = require("axios");
const https = require("https"); 

// 1. Global Context (Memory එක හදනවා)
if (!global.logoPluginContext) global.logoPluginContext = {};

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

// 2. Main Command
Sparky(
    {
        name: "logo",
        alias: ["textpro", "maker"],
        fromMe: isPublic,
        category: "logo",
        desc: "Generate HD Logos using TextPro APIs",
    },
    async ({ m, client, args }) => {
        let textToGenerate = Array.isArray(args) ? args.join(" ").trim() : String(args || "").trim();

        if (!textToGenerate) {
            return m.reply("❌ *කරුණාකර නමක් ලබා දෙන්න.*\n\n*උදාහරණ:* `.logo Sadew`");
        }

        let menuText = `✨ *SADEW-MD LOGO MAKER* ✨\n\n`;
        menuText += `📝 *ඔබේ නම:* ${textToGenerate}\n\n`;
        menuText += `*කරුණාකර පහත ලැයිස්තුවෙන් ඔබට අවශ්‍ය Logo Effect එකේ අංකය මෙම පණිවිඩයට Reply කරන්න:*\n\n`;
        
        textProEffects.forEach((effect, index) => {
            let cleanName = effect.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            menuText += `*${index + 1}.* ${cleanName}\n`;
        });

        menuText += `\n*Reply only with the number (e.g., 12)*`;

        try {
            let sentMsg = await client.sendMessage(m.jid, { text: menuText }, { quoted: m });
            global.logoPluginContext[m.sender] = { quotedId: sentMsg.key.id, data: textToGenerate };
        } catch (err) {
            console.error("Menu Send Error:", err);
            m.reply("❌ *මෙනුව යැවීමට නොහැකි විය.*");
        }
    }
);

// 3. Listener Command
Sparky(
    { 
        on: "text", 
        fromMe: isPublic, 
        dontAddCommandList: true 
    }, 
    async ({ client, m }) => {
        let context = global.logoPluginContext[m.sender];
        if (!context || !m.quoted) return;

        if (m.quoted.key.id === context.quotedId) {
            
            let choice = parseInt(m.text.trim());
            if (isNaN(choice) || choice < 1 || choice > textProEffects.length) {
                return m.reply("❌ *කරුණාකර ලැයිස්තුවේ ඇති නිවැරදි අංකයක් පමණක් Reply කරන්න.*");
            }

            let textToGenerate = context.data;
            delete global.logoPluginContext[m.sender];

            try { if (typeof m.react === "function") await m.react("⏳"); } catch {}
            await client.sendMessage(m.jid, { text: "⏳ _ලෝගෝව නිර්මාණය වෙමින් පවතී... මේ සඳහා තත්පර කිහිපයක් ගත විය හැක._" }, { quoted: m });

            let selectedEffect = textProEffects[choice - 1];
            let cleanName = selectedEffect.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

            const API_KEY = "wxa_f_4e840b5e42";
            const API_URL = `https://apis.xwolf.space/api/textpro/${selectedEffect}?text=${encodeURIComponent(textToGenerate)}&key=${API_KEY}`;

            try {
                const httpsAgent = new https.Agent({ family: 4 }); 

                let response = await axios.get(API_URL, { 
                    timeout: 40000,
                    adapter: 'http', // 🔴 THE MAGIC FIX: මේකෙන් තමයි අලුත් fetch එක අයින් කරලා අපේ IPv4 සෙටින්ග්ස් වැඩ කරන්න හදන්නේ
                    httpsAgent: httpsAgent,
                    headers: { 
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        "Accept": "application/json, text/plain, */*"
                    }
                });
                
                let apiData = response.data;

                if (apiData.success && apiData.imageUrl) {
                    
                    let finalCaption = `✨ *SADEW-MD LOGO MAKER* ✨\n\n`;
                    finalCaption += `🎨 *Effect:* ${cleanName}\n`;
                    finalCaption += `📝 *Text:* ${apiData.text || textToGenerate}\n`;
                    finalCaption += `⚡ *Powered by:* ${apiData.provider || "XWOLF"}`;

                    await client.sendMessage(
                        m.jid, 
                        { image: { url: apiData.imageUrl }, caption: finalCaption }, 
                        { quoted: m }
                    );

                    try { if (typeof m.react === "function") await m.react("✅"); } catch {}

                } else {
                    throw new Error("API එකෙන් අදාළ ඡායාරූපය ලබා දුන්නේ නැත.");
                }

            } catch (error) {
                console.error("[LOGO MAKER ERROR]:", error.message);
                try { if (typeof m.react === "function") await m.react("❌"); } catch {}
                
                let errMsg = error.response?.data?.error || error.message;
                await client.sendMessage(m.jid, { text: `❌ *ලෝගෝව නිර්මාණය කිරීමට නොහැකි විය.*\nහේතුව: ${errMsg}` }, { quoted: m });
            }
        }
    }
);
