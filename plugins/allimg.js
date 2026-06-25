const axios = require("axios");
const { Sparky, isPublic } = require("../lib");

// API Configuration
const API_KEY = "wxa_f_4e840b5e42";
const BASE_URL = "https://apis.xwolf.space/api/ai/tools";

// ඔයාගේ API ස්ටයිල් ටික මෙතන තියෙනවා
const aiStyles = [
    { cmd: "realistic", path: "realistic", desc: "Photorealistic images", ratio: "16:9" },
    { cmd: "anime", path: "anime", desc: "Anime style images", ratio: "9:16" },
    { cmd: "darkart", path: "dark-art", desc: "Dark art style images", ratio: "9:16" },
    { cmd: "ghibli", path: "ghibli", desc: "Studio Ghibli style", ratio: "16:9" },
    { cmd: "portrait", path: "portrait", desc: "High quality portraits", ratio: "1:1" }
];

// ලූප් එකක් මගින් හැම ස්ටයිල් එකකටම කමාන්ඩ් එකක් හදනවා
aiStyles.forEach(style => {
    Sparky({
        name: style.cmd,
        category: "ai-images", // මේක තමයි මෙනු එකේ කැටගරි එක
        fromMe: isPublic,
        desc: style.desc
    }, async ({ m, text }) => {
        
        if (!text) {
            return await m.reply(`❌ කරුණාකර prompt එකක් දෙන්න!\n\n💡 Example:\n.${style.cmd} a wolf sitting on a mountain`);
        }

        await m.reply(`🎨 *Generating ${style.cmd} image... මොහොතක් රැඳී සිටින්න.*`);

        try {
            const apiUrl = `${BASE_URL}/${style.path}?prompt=${encodeURIComponent(text)}&ratio=${style.ratio}&key=${API_KEY}`;
            
            const response = await axios.get(apiUrl, { timeout: 45000 });
            const data = response?.data;

            if (data?.url) {
                const caption = `✨ *AI Generated (${style.cmd.toUpperCase()})*\n\n📝 *Prompt:* ${text}\n\n❤️‍🩹 *❖👑𝙎𝘼𝘿𝙀𝙒-𝙓-𝙈𝘿🔥💎*`;
                
                return await m.reply({ 
                    image: { url: data.url }, 
                    caption: caption 
                });
            } else {
                return await m.reply("❌ API එකෙන් පින්තූරයක් ලැබුණේ නැහැ. නැවත උත්සාහ කරන්න.");
            }

        } catch (err) {
            console.error(err);
            await m.reply("❌ Error: API එකට සම්බන්ධ වීමට නොහැක.");
        }
    });
});
