const axios = require("axios");
const { Sparky, isPublic } = require("../lib"); 

// ======================================================
// 🎨 AI IMAGE GENERATOR (FIXED)
// ======================================================
Sparky({
    name: "oil",
    alias: ["genimg", "draw"],
    category: "tools",
    fromMe: isPublic,
    desc: "Generate AI Images and send as media correctly"
}, async ({ m, text }) => {
    try {
        const input = (text || m.text || m.body || "").trim();

        let cleanInput = input;
        if (cleanInput.startsWith(".")) {
            cleanInput = cleanInput.replace(/^\.\w+\s+/, "");
        }

        if (!cleanInput) {
            return m.reply(
                "❌ කරුණාකර prompt එකක් දෙන්න!\n\n💡 Example:\n.oil anime a girl in forest\n.oil cyberpunk city"
            );
        }

        // =========================
        // 🎯 STYLE DETECTION
        // =========================
        let style = "oil-painting"; 
        let promptText = cleanInput;

        const styleMap = {
            anime: "anime",
            realistic: "realistic",
            cyberpunk: "cyberpunk",
            oil: "oil-painting",
            painting: "oil-painting"
        };

        const firstWord = cleanInput.split(" ")[0].toLowerCase();

        if (styleMap[firstWord]) {
            style = styleMap[firstWord];
            promptText = cleanInput.split(" ").slice(1).join(" ");
        }

        if (!promptText.trim()) {
            return m.reply("❌ Style එකෙන් පස්සේ prompt එක දෙන්න!");
        }

        await m.reply(`🎨 *Generating ${style} image... කරුණාකර මොහොතක් රැඳී සිටින්න.*`);

        const apiKey = "wxa_f_4e840b5e42"; 
        const apiUrl = `https://apis.xwolf.space/api/ai/tools/style-transfer?prompt=${encodeURIComponent(promptText)}&style=${encodeURIComponent(style)}&ratio=1%3A1&key=${apiKey}`;

        console.log("📡 API URL:", apiUrl);

        const response = await axios.get(apiUrl, { timeout: 45000 }); 
        const data = response?.data;

        let imageUrl = data?.url || data?.result || data?.image || null;

        if (!imageUrl) {
            return m.reply(
                "❌ Image generate කරන්න බැරි වුණා.\n\n📦 API Response:\n" +
                JSON.stringify(data, null, 2)
            );
        }

        // 🔴 නිවැරදි කරපු Caption එක මෙන්න (Backticks පාවිච්චි කළා)
        const caption = `✨ *AI Generated Image*

🎭 *Style:* ${style}
📝 *Prompt:* ${promptText}

❤️‍🩹 *❖👑𝙎𝘼𝘿𝙀𝙒-𝙓-𝙈𝘿🔥💎*`;

        // ======================================================
        // 🛠️ MEDIA SENDING
        // ======================================================
        if (typeof m.sendFromUrl === "function") {
            return await m.sendFromUrl(imageUrl, { caption: caption, quoted: m });
        } else if (typeof m.replyUrl === "function") {
            return await m.replyUrl(imageUrl, { caption: caption });
        } else {
            return await m.reply({ image: { url: imageUrl }, caption: caption });
        }

    } catch (err) {
        console.error("❌ ERROR:", err);
        return m.reply(
            "❌ Error occurred:\n" +
            (err.response?.data
                ? JSON.stringify(err.response.data, null, 2)
                : err.message || "Unknown error")
        );
    }
});
