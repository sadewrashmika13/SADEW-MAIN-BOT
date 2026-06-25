const axios = require("axios");
const { Sparky, isPublic } = require("../lib");

// API Configuration
const API_KEY = "wxa_f_4e840b5e42";
const BASE_URL = "https://apis.xwolf.space/api/ai/tools";

// ඔයාගේ API ස්ටයිල් ටික මෙතන තියෙනවා
const aiStyles = [
    { cmd: "realistic", path: "realistic", desc: "Photorealistic images", ratio: "1:1" },
    { cmd: "anime", path: "anime", desc: "Anime style images", ratio: "1:1" },
    { cmd: "darkart", path: "dark-art", desc: "Dark art style images", ratio: "1:1" },
    { cmd: "ghibli", path: "ghibli", desc: "Studio Ghibli style", ratio: "1:1" },
    { cmd: "portrait", path: "portrait", desc: "High quality portraits", ratio: "1:1" }
];

// ලූප් එකක් මගින් හැම ස්ටයිල් එකකටම කමාන්ඩ් එකක් හදනවා
aiStyles.forEach(style => {
    Sparky({
        name: style.cmd,
        category: "ai-images",
        fromMe: isPublic,
        desc: style.desc
    }, async ({ m, text, args }) => {
        
        // 🔴 CRASH FIX: args.join Error Fixed 🔴
        let promptInput = text || "";
        
        // args ආවා නම්, ඒක Array එකක්ද String එකක්ද කියලා බලලා ගන්නවා
        if (!promptInput && args) {
            if (Array.isArray(args)) {
                promptInput = args.join(" ");
            } else {
                promptInput = args.toString(); // Array එකක් නෙමෙයි නම් කෙලින්ම ගන්නවා
            }
        }
        
        // ඒත් ආවේ නැත්නම් මැසේජ් එකේ තියෙන මුළු වචන ටික අරන් පළවෙනි වචනෙ කපලා දානවා
        if (!promptInput) {
            let rawText = m.text || m.body || "";
            let splitText = rawText.trim().split(" ");
            if (splitText.length > 1) {
                promptInput = splitText.slice(1).join(" ");
            }
        }

        // අමතර හිස්තැන් අයින් කරනවා
        promptInput = promptInput.trim();

        // ඊටපස්සෙත් prompt එකක් නැත්නම් විතරක් Error එක දෙනවා
        if (!promptInput) {
            return await m.reply(`❌ කරුණාකර prompt එකක් දෙන්න!\n\n💡 Example:\n.${style.cmd} a wolf sitting on a mountain`);
        }

        await m.reply(`🎨 *Generating ${style.cmd} image... මොහොතක් රැඳී සිටින්න.*`);

        try {
            const apiUrl = `${BASE_URL}/${style.path}?prompt=${encodeURIComponent(promptInput)}&ratio=${style.ratio}&key=${API_KEY}`;
            
            const response = await axios.get(apiUrl, { timeout: 45000 });
            const data = response?.data;

            if (data?.url) {
                const caption = `✨ *AI Generated (${style.cmd.toUpperCase()})*\n\n📝 *Prompt:* ${promptInput}\n\n❤️‍🩹 *❖👑𝙎𝘼𝘿𝙀𝙒-𝙓-𝙈𝘿🔥💎*`;
                
                // 🛠️ MEDIA SENDING
                if (typeof m.sendFromUrl === "function") {
                    return await m.sendFromUrl(data.url, { caption: caption, quoted: m });
                } else if (typeof m.replyUrl === "function") {
                    return await m.replyUrl(data.url, { caption: caption });
                } else {
                    return await m.reply({ image: { url: data.url }, caption: caption });
                }
            } else {
                return await m.reply("❌ API එකෙන් පින්තූරයක් ලැබුණේ නැහැ. නැවත උත්සාහ කරන්න.");
            }

        } catch (err) {
            console.error(err);
            await m.reply("❌ Error: API එකට සම්බන්ධ වීමට නොහැක.");
        }
    });
});
