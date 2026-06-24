const axios = require("axios");
const { Sparky, isPublic } = require("../lib");

Sparky({
    name: "unsplash",
    alias: ["images", "imgsearch"],
    fromMe: isPublic,
    category: "search",
    desc: "Search multiple images from API",
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
        if (!prompt) return await sendMsg("❌ කරුණාකර නමක් ලබා දෙන්න. (උදා: .unsplash anime girl)");

        try { if (typeof m.react === "function") await m.react("⏳"); } catch {}
        await sendMsg(`⏳ _"${prompt}" සඳහා ඡායාරූප සොයමින් පවතී... මේ සඳහා තත්පර කිහිපයක් ගත විය හැක._`);

        // 🔴 ෆොටෝ 5ක් ගන්නවා
        let photoCount = 5; 
        let imageUrls = [];

        // ✅ ඔයාගේ XWOLF API ලින්ක් එක මෙතනට ඇඩ් කළා!
        const API_DOMAIN = "https://apis.xwolf.space"; 
        const API_KEY = "wxa_f_4e840b5e42";

        // API එකෙන් එකින් එක ෆොටෝ ගන්න Loop එක
        for (let i = 0; i < photoCount; i++) {
            try {
                // එකම ෆොටෝ එක එන එක නවත්තන්න Random Number එකක් දානවා
                let res = await axios.get(`${API_DOMAIN}/api/ai/image/dall-e`, {
                    params: {
                        prompt: prompt,
                        apikey: API_KEY,
                        random_cache_buster: Math.random() // මේකෙන් සර්වර් එක රවට්ටනවා
                    },
                    timeout: 15000 
                });
                
                // ෆොටෝ එකක් ආවොත්, ඒක කලින් ආපු එකක් නෙමෙයි නම් විතරක් Array එකට එකතු කරනවා
                if (res.data && res.data.success && res.data.url) {
                    if (!imageUrls.includes(res.data.url)) {
                        imageUrls.push(res.data.url);
                    }
                }
            } catch (err) {
                console.log(`[WARNING] Image ${i+1} fetch failed, continuing...`);
            }
        }

        if (imageUrls.length === 0) {
            try { if (typeof m.react === "function") await m.react("❌"); } catch {}
            return await sendMsg("❌ සර්වර් එකෙන් ඡායාරූප ලබාගැනීමට නොහැකි විය. කරුණාකර පසුව නැවත උත්සාහ කරන්න.");
        }

        // ෆොටෝ ටික හම්බුණා කියලා මැසේජ් එකක් දානවා
        await sendMsg(`✅ ඡායාරූප ${imageUrls.length} ක් සාර්ථකව සොයාගන්නා ලදී. ඒවා එවමින් පවතී...`);

        // ගත්ත ෆොටෝ ටික එකින් එක Chat එකට යවනවා
        for (let i = 0; i < imageUrls.length; i++) {
            await client.sendMessage(m.jid, { 
                image: { url: imageUrls[i] }, 
                caption: `*📸 Image ${i + 1} of ${imageUrls.length}*\n🔎 *Search:* ${prompt}` 
            }, { quoted: m });
        }

        try { if (typeof m.react === "function") await m.react("✅"); } catch {}

    } catch (error) {
        console.error("Unsplash Plugin Error:", error);
        try { if (typeof m.react === "function") await m.react("❌"); } catch {}
        await sendMsg(`❌ *Internal Error:* ${error.message}`);
    }
});
