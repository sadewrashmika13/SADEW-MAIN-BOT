const axios = require("axios");
const { Sparky, isPublic } = require("../lib");

Sparky({
    name: "unsplash",
    alias: ["images", "imgsearch"],
    fromMe: isPublic,
    category: "search",
    desc: "Search an image from API",
}, async ({ m, client, args }) => {

    // 🛡️ Fail-Safe Message Sender 
    const sendMsg = async (text) => {
        try {
            if (typeof m.reply === "function") {
                await m.reply(text);
            } else {
                await client.sendMessage(m.jid, { text }, { quoted: m });
            }
        } catch (e) {
            try {
                await client.sendMessage(m.jid, { text });
            } catch (err) {}
        }
    };

    try {
        let prompt = Array.isArray(args) ? args.join(" ").trim() : String(args || "").trim();
        if (!prompt) return await sendMsg("❌ කරුණාකර නමක් ලබා දෙන්න. (උදා: .unsplash a wolf howling at the moon)");

        try { if (typeof m.react === "function") await m.react("⏳"); } catch {}
        await sendMsg(`⏳ _"${prompt}" සඳහා ඡායාරූපය සොයමින් පවතී..._`);

        // ✅ ඔයාගේ API දත්ත
        const API_KEY = "wxa_f_4e840b5e42";
        const API_URL = `https://apis.xwolf.space/api/ai/image/dall-e?key=${API_KEY}`;

        // 🔴 FIX: GET වෙනුවට POST පාවිච්චි කිරීම!
        const response = await axios.post(
            API_URL, 
            { prompt: prompt }, // Body එක ඇතුළේ Prompt එක යවනවා
            { 
                headers: { "Content-Type": "application/json" },
                timeout: 15000 
            }
        );

        // ෆොටෝ එක ආවොත් කෙලින්ම යවනවා
        if (response.data && response.data.success && response.data.url) {
            await client.sendMessage(m.jid, { 
                image: { url: response.data.url }, 
                caption: `🔎 *Search:* ${prompt}\n✨ *Powered by ★彡 👑ＳＡＤＥＷ－Ｘ－ＭＤ🔥 彡★*` 
            }, { quoted: m });
            
            try { if (typeof m.react === "function") await m.react("✅"); } catch {}
        } else {
            throw new Error("API එකෙන් ඡායාරූපයක් ලැබුණේ නැත.");
        }

    } catch (error) {
        console.error("Unsplash Plugin Error:", error.message);
        try { if (typeof m.react === "function") await m.react("❌"); } catch {}
        
        let errMsg = error.response?.data?.error || error.message;
        await sendMsg(`❌ *ඡායාරූපය ලබාගැනීමට නොහැකි විය.*\nහේතුව: ${errMsg}`);
    }
});
