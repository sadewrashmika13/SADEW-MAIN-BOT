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

      // 🔥 [object Object] එන එක නවත්තන්න සුපිරිම Parsing පාරක් මෙතන තියෙන්නේ මචං
      let replyAnswer = "";
      const resData = response.data;

      if (typeof resData === "string") {
        replyAnswer = resData;
      } else if (resData && typeof resData === "object") {
        // API එකෙන් එන්න පුළුවන් හැම ප්‍රධාන Key එකක්ම auto-check කරනවා
        const rawData = resData.result || resData.response || resData.reply || resData.data || resData.message;
        
        if (typeof rawData === "object" && rawData !== null) {
          replyAnswer = rawData.reply || rawData.text || rawData.message || rawData.result || JSON.stringify(rawData);
        } else {
          replyAnswer = rawData || JSON.stringify(resData);
        }
      } else {
        replyAnswer = JSON.stringify(resData);
      }

      if (!replyAnswer) throw new Error("API එකෙන් නිසි ප්‍රතිචාරයක් ලැබුණේ නැත.");

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
