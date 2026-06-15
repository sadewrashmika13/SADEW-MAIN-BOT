const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

// 🔑 WolfApis Claude AI එක සඳහා වන API Key එක (කැමති නම් පස්සේ වෙනස් කරගන්න පුළුවන්)
const CLAUDE_API_KEY = "wxa_d_test";

Sparky(
  {
    name: "claude",
    alias: ["claudeai", "anthropic"],
    fromMe: isPublic,
    category: "ai",
    desc: "Chat with Claude AI smoothly via WolfApis.",
  },
  async ({ m, client, args }) => {
    try {
      // 🛠️ args එක String එකක්ද Array එකක්ද කියා පරික්ෂා කර ටෙක්ස්ට් එක ලබාගැනීම
      let textInput = "";
      if (typeof args === "string") {
          textInput = args.trim();
      } else if (Array.isArray(args)) {
          textInput = args.join(" ").trim();
      }
      
      // ප්‍රශ්නයක් ටයිප් කර නැත්නම් රිප්ලයි කරපු මැසේජ් එකේ ටෙක්ස්ට් එක ගන්නවා
      textInput = textInput || m.quoted?.text || "";

      if (!textInput) {
        return await m.reply("❌ කරුණාකර ප්‍රශ්නයක් ඇතුළත් කරන්න.\n\n💡 උදා: `.claude write a clean sign-in form html code`");
      }

      // බොටා හිතන බව පෙන්වීමට Reaction එකක් දැමීම
      try { if (typeof m.react === "function") await m.react("🧠"); } catch {}

      // 🌐 Claude AI එක සඳහා වන නිවැරදි URL එක සැකසීම
      const targetUrl = `https://apis.xwolf.space/api/ai/claude?q=${encodeURIComponent(textInput)}&key=${CLAUDE_API_KEY}`;

      console.log("[SADEW-MD CLAUDE-AI] Fetching response from server...");
      const response = await axios.get(targetUrl, { timeout: 40000 });

      // ⚙️ API Response එක පරික්ෂා කිරීම
      if (response.data) {
          const aiReply = response.data.result || response.data.response || response.data.reply;

          if (aiReply) {
              try { if (typeof m.react === "function") await m.react("✅"); } catch {}
              return await m.reply(`🤖 *Claude AI:* \n\n${aiReply}`);
          } else {
              try { if (typeof m.react === "function") await m.react("✅"); } catch {}
              return await m.reply(`🤖 *Claude Raw Response:* \n\n${JSON.stringify(response.data, null, 2)}`);
          }
      } else {
          try { if (typeof m.react === "function") await m.react("❌"); } catch {}
          return await m.reply("❌ *Error:* Claude API එකෙන් හිස් ප්‍රතිචාරයක් ලැබුණි.");
      }

    } catch (error) {
      console.error("[SADEW-MD CLAUDE-AI] Error:", error.message);
      try { if (typeof m.react === "function") await m.react("❌"); } catch {}
      return await m.reply(`❌ *Claude API Error:* ${error.message}`);
    }
  }
);
