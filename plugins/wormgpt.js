const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

// 🔑 ඔයාගේ WolfApis එකෙන් ලැබුණු නිවැරදි API Key එක
const WOLF_API_KEY = "wxa_f_4e840b5e42";

Sparky(
  {
    name: "wormgpt",
    alias: ["ai", "ask", "chat"],
    fromMe: isPublic,
    category: "ai",
    desc: "Chat with WormGPT AI using WolfApis endpoint.",
  },
  async ({ m, client, args }) => {
    try {
      // පරිශීලකයා ඇතුළත් කළ ප්‍රශ්නය හෝ රිප්ලයි කළ මැසේජ් එකේ ටෙක්ස්ට් එක ලබා ගැනීම
      let textInput = args.join(" ") || m.quoted?.text;

      if (!textInput) {
        return await m.reply("❌ කරුණාකර ප්‍රශ්නයක් හෝ විධානයක් ඇතුළත් කරන්න.\n\n💡 උදා: `.wormgpt write a html runner game code`");
      }

      // බොටා වැඩ කරන බව පෙන්වීමට Reaction එකක් දැමීම
      try { if (typeof m.react === "function") await m.react("🧠"); } catch {}

      // 🌐 ඔයා ලබා දුන් නිවැරදි API URL එක සහ Parameters සැකසීම
      const targetUrl = `https://apis.xwolf.space/api/ai/wormgpt?q=${encodeURIComponent(textInput)}&key=${WOLF_API_KEY}`;

      console.log("[SADEW-MD WORM-GPT] Sending request to WolfApis...");
      const response = await axios.get(targetUrl, { timeout: 40000 });

      // ⚙️ API එකෙන් එන දත්ත පරීක්ෂා කර Response එක වෙන් කර ගැනීම
      if (response.data) {
          // සාමාන්‍යයෙන් මේ වගේ API වල උත්තරය එන්නේ result, response හෝ reply කියන fields ඇතුළේයි
          const aiReply = response.data.result || response.data.response || response.data.reply;

          if (aiReply) {
              try { if (typeof m.react === "function") await m.react("✅"); } catch {}
              return await m.reply(`🤖 *WormGPT AI Response:* \n\n${aiReply}`);
          } else {
              // එකක්වත් නැත්නම් මුළු JSON එකම මැසේජ් එකක් විදිහට දාලා බලන්න (Debugging වලට ලේසියි)
              try { if (typeof m.react === "function") await m.react("✅"); } catch {}
              return await m.reply(`🤖 *WormGPT Raw Response:* \n\n${JSON.stringify(response.data, null, 2)}`);
          }
      } else {
          try { if (typeof m.react === "function") await m.react("❌"); } catch {}
          return await m.reply("❌ *Error:* API සේවාදායකයෙන් හිස් ප්‍රතිචාරයක් (Empty Response) ලැබුණි.");
      }

    } catch (error) {
      console.error("[SADEW-MD WORM-GPT] Error:", error.message);
      try { if (typeof m.react === "function") await m.react("❌"); } catch {}
      return await m.reply(`❌ *WormGPT API Error:* ${error.message}`);
    }
  }
);
