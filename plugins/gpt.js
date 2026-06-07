const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

Sparky(
  {
    name: "gpt",
    fromMe: isPublic,
    category: "ai",
    desc: "Chat with ChatGPT (Alternative Stable API).",
  },
  async ({ m, client, args }) => {
    if (!args || args.trim() === "") {
      return await client.sendMessage(
        m.jid, 
        { text: "❌ *Usage:* `.gpt ඔයාට දැනගන්න ඕනේ දේ ටයිප් කරන්න.*" }, 
        { quoted: m }
      );
    }

    const queryText = args.trim();
    await m.react('🧠');

    try {
      // 🔥 මෙන්න මම API එක වෙනස් කරලා අලුත්, ස්ථාවර සර්වර් එකක් දැම්මා මචං
      const apiUrl = `https://api.shimonmod.xyz/api/chatgpt?q=${encodeURIComponent(queryText)}`;
      
      const response = await axios.get(apiUrl, { timeout: 15000 });
      const data = response.data;

      // API එකෙන් එන response එක අනුව data.result හෝ data.reply චෙක් කරනවා
      const replyAnswer = data.result || data.reply || data.answer;

      if (!replyAnswer) {
        throw new Error("ChatGPT සර්වර් එකෙන් නිසි ප්‍රතිචාරයක් ලැබුණේ නැත.");
      }

      await m.react('💬');
      
      const captionText = `🤖 *CHAT-GPT ANSWER*\n\n${replyAnswer}\n\n*POWERED BY SADEW-MD*`;
      
      await client.sendMessage(m.jid, { text: captionText }, { quoted: m });

    } catch (error) {
      await m.react('❌');
      console.error("ChatGPT Error:", error);
      
      let errorMsg = error.message.includes("timeout")
        ? "❌ *Timeout:* සර්වර් එකෙන් උත්තරයක් දෙන්න ප්‍රමාද වැඩියි."
        : `❌ *Error:* ${error.message}`;
        
      await client.sendMessage(m.jid, { text: errorMsg }, { quoted: m });
    }
  }
);
