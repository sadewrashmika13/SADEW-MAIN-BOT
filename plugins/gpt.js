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
      // 🌟 AI එක පිස්සු කෙළින එක නවත්වන්න System Prompt එක වෙනස් කරා මචං
      const systemPrompt = "Instruction: You are a friendly WhatsApp bot named SADEW-MD. Respond to the user in a casual, natural, and friendly mix of Sinhala and English (using Sinhala script, but blending in standard English words naturally where necessary), exactly how Sri Lankan friends text each other. Keep it short and engaging. User Question: ";
      const finalQuery = systemPrompt + queryText;

      const response = await axios.get("https://whiteshadow-x-api.onrender.com/api/ai/chatgpt", {
        params: {
          q: finalQuery,
          apitoken: "VK4fry"
        },
        timeout: 15000
      });

      let replyAnswer = "";
      let resData = response.data;

      // 🛠️ ක්‍රමය 1: සාමාන්‍ය JSON Parse එක
      if (typeof resData === "string") {
        try {
          resData = JSON.parse(resData);
        } catch (e) {
          replyAnswer = resData;
        }
      }

      if (resData && typeof resData === "object") {
        replyAnswer = resData.response || resData.result || resData.reply || resData.data;
      }

      // 🛠️ ක්‍රමය 2 (Foolproof): JSON එක String එකක් විදිහටම ආවොත් Regex එකෙන් "response" එක විතරක් කඩා ගන්නවා
      if (!replyAnswer || typeof replyAnswer === "object" || replyAnswer.includes('{"model"')) {
        const rawString = typeof response.data === "string" ? response.data : JSON.stringify(response.data);
        const match = rawString.match(/"response"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (match && match[1]) {
          replyAnswer = match[1]
            .replace(/\\"/g, '"')
            .replace(/\\n/g, '\n')
            .replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => String.fromCharCode(parseInt(grp, 16))); // Unicode සිංහල අකුරු හරියට ගන්න
        }
      }

      // අවසාන ආරක්ෂක පියවර
      if (!replyAnswer) {
        replyAnswer = typeof resData === "object" ? (resData.response || JSON.stringify(resData)) : resData;
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
