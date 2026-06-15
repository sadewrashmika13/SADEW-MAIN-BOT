const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

// 🔑 ඔයා ලබාදුන් නිවැරදි WhiteShadow API Token එක
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
      // 🛠️ args එක String එකක්ද Array එකක්ද කියා පරික්ෂා කර සර්ච් කරන වචනය ගැනීම
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

      // බොටා වැඩ කරන බව පෙන්වීමට සර්ච් ඉමෝජි එකක් දාමු
      try { if (typeof m.react === "function") await m.react("🔍"); } catch {}

      // 🌐 1. Text Results ලබාගැනීම (WhiteShadow API)
      const targetUrl = `https://whiteshadow-x-api.onrender.com/api/search/google?q=${encodeURIComponent(textInput)}&apitoken=${API_TOKEN}`;
      
      console.log("[SADEW-MD GOOGLE] Fetching search results...");
      const response = await axios.get(targetUrl, { timeout: 30000 });

      if (response.data && response.data.success && response.data.result) {
          const results = response.data.result;
          
          if (results.length === 0) {
              try { if (typeof m.react === "function") await m.react("❌"); } catch {}
              return await m.reply("❌ ප්‍රතිඵල කිසිවක් හමු නොවීය.");
          }

          // 📝 සයිට් වල නම සහ ලින්ක් ලස්සනට Format කරගැනීම
          let searchMessage = `🔍 *Google Search Results for:* _${textInput}_\n\n`;
          
          results.forEach((item, index) => {
              searchMessage += `*${index + 1}. ${item.title}*\n`;
              searchMessage += `🔗 *Link:* ${item.link}\n`;
              searchMessage += `📝 _${item.snippet}_\n\n───────────────────\n\n`;
          });

          // ලින්ක්ස් ටික මුලින්ම මැසේජ් එකක් විදිහට යවනවා
          await m.reply(searchMessage);

          // 📸 2. Screenshot ලබාගැනීම (ඔයාගේ ss.js එකේ වැඩ කරන සුපිරි ලොජික් එකමයි)
          try {
              if (typeof m.react === "function") await m.react("⏳");
              await client.sendPresenceUpdate('composing', m.jid);

              // ලයිව් ගූගල් සර්ච් එකේ URL එක
              const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(textInput)}`;
              
              // API 1: ScreenshotAPI.net (free tier, no key)
              const screenshotUrl = `https://shot.screenshotapi.net/screenshot?url=${encodeURIComponent(googleSearchUrl)}&width=1280&height=800&output=image&file_type=png`;
              
              console.log("[SADEW-MD GOOGLE] Fetching live screenshot from API 1...");
              const ssResponse = await axios.get(screenshotUrl, {
                  responseType: 'arraybuffer',
                  timeout: 25000,
                  headers: { 'User-Agent': 'Mozilla/5.0' }
              });

              if (ssResponse.status === 200 && ssResponse.data && ssResponse.data.length > 1000) {
                  const caption = `📸 *Google Search View for:* _${textInput}_\n🤖 SADEW-MINI\n⏱️ ${new Date().toLocaleString()}`;
                  
                  // m.chat වෙනුවට නිවැරදිව m.jid භාවිතා කර ඇත (JID Decode Error එක මෙතනින් ෆික්ස් වේ)
                  await client.sendMessage(m.jid, {
                      image: Buffer.from(ssResponse.data),
                      caption: caption
                  }, { quoted: m });

                  if (typeof m.react === "function") await m.react("✅");
                  return; // සාර්ථක නම් මෙතනින් නවතී.
              } else {
                  throw new Error("Empty or failed response from API 1");
              }

          } catch (ssError) {
              console.error("[SADEW-MD GOOGLE] Screenshot API 1 Failed. Trying Fallback API...", ssError.message);
              
              // Fallback API 2: Microlink.io (කලින් එක ෆේල් වුණොත් මේකට මාරු වෙනවා)
              try {
                  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(textInput)}`;
                  const fallbackUrl = `https://api.microlink.io/?url=${encodeURIComponent(googleSearchUrl)}&screenshot=true&meta=false`;
                  
                  const { data } = await axios.get(fallbackUrl, { timeout: 20000 });
                  const fallbackSsUrl = data?.data?.screenshot?.url;
                  
                  if (fallbackSsUrl) {
                      const caption = `📸 *Google Search View for:* _${textInput}_\n🤖 SADEW-MINI (fallback)\n⏱️ ${new Date().toLocaleString()}`;
                      
                      await client.sendMessage(m.jid, { 
                          image: { url: fallbackSsUrl }, 
                          caption: caption 
                      }, { quoted: m });
                      
                      if (typeof m.react === "function") await m.react("✅");
                  } else {
                      if (typeof m.react === "function") await m.react("❌");
                  }
              } catch (fallbackError) {
                  console.error("[SADEW-MD GOOGLE] Fallback screenshot API also failed:", fallbackError.message);
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
