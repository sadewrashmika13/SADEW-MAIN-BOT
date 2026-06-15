const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

// 🔑 WhiteShadow API Token
const API_TOKEN = "VK4fry";

Sparky(
  {
    name: "google",
    alias: ["gsearch", "search", "සර්ච්"],
    fromMe: isPublic,
    category: "search",
    desc: "Search Google for links and get a live webpage screenshot.",
  },
  async ({ m, client, args }) => {
    try {
      let textInput = "";
      if (typeof args === "string") {
          textInput = args.trim();
      } else if (Array.isArray(args)) {
          textInput = args.join(" ").trim();
      }
      
      textInput = textInput || m.quoted?.text || "";

      if (!textInput) {
        return await m.reply("❌ කරුණාකර සෙවිය යුතු දේ ඇතුළත් කරන්න.\n\n💡 උදා: `.google Sri Lanka`");
      }

      try { if (typeof m.react === "function") await m.react("🔍"); } catch {}

      // 🌐 1. Text Results ලබාගැනීම (WhiteShadow Google API)
      const targetUrl = `https://whiteshadow-x-api.onrender.com/api/search/google?q=${encodeURIComponent(textInput)}&apitoken=${API_TOKEN}`;
      
      console.log("[SADEW-MD GOOGLE] Fetching search results...");
      const response = await axios.get(targetUrl, { timeout: 30000 });

      if (response.data && response.data.success && response.data.result) {
          const results = response.data.result;
          
          if (results.length === 0) {
              try { if (typeof m.react === "function") await m.react("❌"); } catch {}
              return await m.reply("❌ ප්‍රතිඵල කිසිවක් හමු නොවීය.");
          }

          let searchMessage = `🔍 *Google Search Results for:* _${textInput}_\n\n`;
          results.forEach((item, index) => {
              searchMessage += `*${index + 1}. ${item.title}*\n`;
              searchMessage += `🔗 *Link:* ${item.link}\n`;
              searchMessage += `📝 _${item.snippet}_\n\n───────────────────\n\n`;
          });

          // ලින්ක්ස් ටික යැවීම
          await m.reply(searchMessage);

          // 📸 2. Screenshot ලබාගැනීම (CAPTCHA එක බයිපාස් කිරීමට Bing Search එක පාවිච්චි කර ඇත)
          try {
              if (typeof m.react === "function") await m.react("⏳");
              await client.sendPresenceUpdate('composing', m.jid);

              // 💡 මෙතනට Bing දැම්මම කැප්චා වදයක් නැතුව සර්ච් පේජ් එකේ ලස්සන ෆොටෝ එකක් එනවා!
              const alternativeSearchUrl = `https://www.bing.com/search?q=${encodeURIComponent(textInput)}`;
              
              // API 1: ScreenshotAPI.net
              const screenshotUrl = `https://shot.screenshotapi.net/screenshot?url=${encodeURIComponent(alternativeSearchUrl)}&width=1280&height=800&output=image&file_type=png`;
              
              console.log("[SADEW-MD GOOGLE] Fetching live screenshot from Bing visual...");
              const ssResponse = await axios.get(screenshotUrl, {
                  responseType: 'arraybuffer',
                  timeout: 25000,
                  headers: { 'User-Agent': 'Mozilla/5.0' }
              });

              if (ssResponse.status === 200 && ssResponse.data && ssResponse.data.length > 1000) {
                  const caption = `📸 *Live Search View for:* _${textInput}_\n🤖 SADEW-MINI\n⏱️ ${new Date().toLocaleString()}`;
                  
                  await client.sendMessage(m.jid, {
                      image: Buffer.from(ssResponse.data),
                      caption: caption
                  }, { quoted: m });

                  if (typeof m.react === "function") await m.react("✅");
                  return;
              } else {
                  throw new Error("Failed response from API 1");
              }

          } catch (ssError) {
              console.error("[SADEW-MD GOOGLE] Screenshot API 1 Failed. Trying Fallback...", ssError.message);
              
              // Fallback API 2: Microlink (Bing හරහාම)
              try {
                  const alternativeSearchUrl = `https://www.bing.com/search?q=${encodeURIComponent(textInput)}`;
                  const fallbackUrl = `https://api.microlink.io/?url=${encodeURIComponent(alternativeSearchUrl)}&screenshot=true&meta=false`;
                  
                  const { data } = await axios.get(fallbackUrl, { timeout: 20000 });
                  const fallbackSsUrl = data?.data?.screenshot?.url;
                  
                  if (fallbackSsUrl) {
                      const caption = `📸 *Live Search View for:* _${textInput}_\n🤖 SADEW-MINI (fallback)\n⏱️ ${new Date().toLocaleString()}`;
                      await client.sendMessage(m.jid, { image: { url: fallbackSsUrl }, caption: caption }, { quoted: m });
                      if (typeof m.react === "function") await m.react("✅");
                  } else {
                      if (typeof m.react === "function") await m.react("❌");
                  }
              } catch (fallbackError) {
                  console.error("[SADEW-MD GOOGLE] Fallback failed too:", fallbackError.message);
                  if (typeof m.react === "function") await m.react("❌");
              }
          }

      } else {
          if (typeof m.react === "function") await m.react("❌");
          return await m.reply("❌ *Error:* Google API එකෙන් දත්ත ලබාගැනීමට නොහැකි විය.");
      }

    } catch (error) {
      console.error("[SADEW-MD GOOGLE] Main Error:", error.message);
      try { if (typeof m.react === "function") await m.react("❌"); } catch {}
      return await m.reply(`❌ *Google Search Error:* ${error.message}`);
    }
  }
);
