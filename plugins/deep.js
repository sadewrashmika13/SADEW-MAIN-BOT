const { Sparky } = require("../lib");
const axios = require("axios");

Sparky({
    name: "deepseek",
    category: "ai",
    desc: "Chat with DeepSeek AI"
}, async ({ client, m, args }) => {
    if (!args) return m.reply("_මචං අහන්න ඕන ප්‍රශ්නයක් දාපන්! Example: .deepseek What is Node.js_");

    try {
        await m.reply("_DeepSeek AI උත්තරය හදමින් පවතී... 🧠_");
        
        // උඹ දුන්න විදිහට apitoken එකත් එක්කම URL එක හැදුවා මචං
        const url = `https://whiteshadow-x-api.vercel.app/api/ai/deepseekv4?q=${encodeURIComponent(args)}&apitoken=VK4fry`;
        const res = await axios.get(url);
        
        // API එකෙන් response එක එනවාද කියලා චෙක් කරනවා
        if (res.data && res.data.success && res.data.response) {
            return m.reply(res.data.response);
        } else {
            return m.reply("_අයියෝ API එකෙන් response එකක් ආවේ නැහැ මචං! ටෝකන් එක කල් ඉකුත් වෙලාද දන්නේ නැහැ._");
        }
    } catch (e) {
        console.log(e);
        return m.reply("_API එකට කනෙක්ට් වෙන්න බැරි වුණා. පස්සේ ට්‍රයි කරපන්!_");
    }
});
