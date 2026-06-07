const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

Sparky(
  {
    name: "gpt",
    fromMe: isPublic,
    category: "ai",
    desc: "Chat with ChatGPT 4o Mini in a natural Sinhala/English mixed style.",
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
      // AI එකට Sinhala & English mix කරලා කතා කරන්න බල කරන Instruction එක
      const systemPrompt = "Instruction: Act as a friendly WhatsApp bot. Respond in a casual, natural mix of Sinhala and English (using Sinhala script, but blending in standard English technical/common words naturally where necessary), exactly how friends text each other. Keep it engaging and smart. User Question: ";
      const finalQuery = systemPrompt + queryText;

      const response = await axios.get("https://whiteshadow-x-api.onrender.com/api/ai/chatgpt", {
        params: {
          q: finalQuery,
          apitoken: "VK4fry"
        },
        timeout: 15000
      });

      let resData = response.data;
      let replyAnswer = "";

      // 🌟 මෙතනින් තමයි රෝ දත්ත ටික JSON එකක් විදිහට Parse කරලා ලෙඩේ වළක්වන්නේ මචං
      if (typeof resData === "string") {
        try {
          resData = JSON.parse(resData);
        } catch (e) {
          // JSON නෙවෙයි නම් ආපු Text එක ඒ විදිහටම ගන්නවා
          replyAnswer = resData; 
        }
      }

      if (resData && typeof resData === "object") {
        // API එකෙන් ආපු JSON එකෙන් "response" කියන කෑල්ල විතරක් වෙන් කරලා ගන්නවා
        replyAnswer = resData.response || resData.result || resData.reply || resData.data;
        
        if (typeof replyAnswer === "object" && replyAnswer !== null) {
          replyAnswer = replyAnswer.text || JSON.stringify(replyAnswer);
        }
      }

      if (!replyAnswer) {
        replyAnswer = typeof resData === "object" ? JSON.stringify(resData) : resData;
      }

      await m.react('💬');
      
      const captionText = `🤖 *AI ANSWER (GPT-4o MINI)*\n\n${replyAnswer}\n\n*POWERED BY SADEW-MD*`;
      
      await client.sendMessage(m.jid, { text: captionText }, { quoted: m });

    } catch (error) {
      await m.react('❌');
      console.error("ChatGPT API Error:", error.message);
      
      let errorMsg = `❌ *AI Error:* ${error.message}`;
      if (error.message.includes("timeout")) {
        errorMsg = "❌ *Timeout:* සර්වර් එකෙන් Response එක එන්න ගොඩක් වෙලා යනවා මචං.";
      }
      
      await client.sendMessage(m.jid, { text: errorMsg }, { quoted: m });
    }
  }
);
