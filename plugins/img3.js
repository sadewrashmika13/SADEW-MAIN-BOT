const axios = require("axios");
const { Sparky } = require("../lib");

Sparky({
    name: "unsplash", // ඔයාට කැමති කමාන්ඩ් නමක් දාගන්න
    category: "search",
    desc: "Search multiple images from Unsplash API",
}, async ({ m, client, args }) => {
    
    let prompt = args.join(" ").trim();
    if (!prompt) return m.reply("❌ කරුණාකර නමක් ලබා දෙන්න. (උදා: .unsplash red sports car)");

    await m.react("⏳");
    await m.reply(`⏳ _"${prompt}" සඳහා ඡායාරූප සොයමින් පවතී... මේ සඳහා තත්පර කිහිපයක් ගත විය හැක._`);

    // 🔴 මෙතනින් ඔයාට ඕනේ ෆොටෝ ගාණ වෙනස් කරන්න පුළුවන් (දැනට 5ක් දාලා තියෙන්නේ)
    let photoCount = 5; 
    let imageUrls = [];

    // ඔයාගේ API URL එක මෙතනට දාන්න (Base URL එක දීලා නැති නිසා මම මේක දැම්මා)
    const API_BASE_URL = "https://ඔයාගේ-API-ලින්ක්-එක.com/api/ai/image/dall-e"; 
    const API_KEY = "wxa_f_4e840b5e42";

    try {
        // API එකෙන් එකින් එක ෆොටෝ ගන්න Loop එක
        for (let i = 0; i < photoCount; i++) {
            try {
                let res = await axios.get(`${API_BASE_URL}?prompt=${encodeURIComponent(prompt)}&apikey=${API_KEY}`);
                
                // ෆොටෝ එකක් ආවොත් ඒක Array එකට එකතු කරනවා
                if (res.data && res.data.success && res.data.url) {
                    imageUrls.push(res.data.url);
                }
            } catch (err) {
                console.log(`[WARNING] Image ${i+1} fetch failed, continuing...`);
            }
        }

        if (imageUrls.length === 0) {
            await m.react("❌");
            return m.reply("❌ ඡායාරූප කිසිවක් සොයාගත නොහැකි විය. සර්වර් එක කාර්යබහුලයි.");
        }

        // ගත්ත ෆොටෝ ටික එකින් එක Chat එකට යවනවා
        for (let i = 0; i < imageUrls.length; i++) {
            await client.sendMessage(m.jid, { 
                image: { url: imageUrls[i] }, 
                caption: `*📸 Image ${i + 1} of ${imageUrls.length}*\n🔎 *Search:* ${prompt}` 
            });
        }

        await m.react("✅");

    } catch (error) {
        console.error(error);
        await m.react("❌");
        m.reply("❌ *Error:* API එකෙන් ඡායාරූප ලබාගැනීමට නොහැකි විය.");
    }
});
