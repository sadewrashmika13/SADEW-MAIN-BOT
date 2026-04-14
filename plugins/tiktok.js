const { Sparky, isPublic } = require("../lib");
const axios = require("axios");
const https = require("https");

// Render SSL bypass agent
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

Sparky(
  {
    name: "tiktok",
    fromMe: isPublic,
    category: "downloader",
    desc: "Download TikTok videos without watermark (Stable)",
  },
  async ({ m, client, args }) => {
    // 1. Better Arguments Check
    if (!args || args.trim() === "") {
      return await client.sendMessage(
        m.jid,
        { text: "❌ *Usage:* `.tiktok <TikTok URL>`" },
        { quoted: m }
      );
    }

    // 2. URL Extraction and Validation (Supports vt.tiktok.com and tiktok.com)
    const urlMatch = args.match(/(https?:\/\/[^\s]+)/g);
    const tiktokRegex = /(tiktok\.com|vt\.tiktok\.com)/;
    
    if (!urlMatch || !tiktokRegex.test(urlMatch[0])) {
      return await client.sendMessage(
        m.jid,
        { text: "❌ *Invalid TikTok URL*. Please provide a valid link." },
        { quoted: m }
      );
    }

    const tiktokUrl = urlMatch[0];
    await m.react('⏳');

    try {
      // 3. API Call with Timeout (15s)
      const apiUrl = `https://tikwm.com/api/?url=${encodeURIComponent(tiktokUrl)}`;
      const response = await axios.get(apiUrl, { httpsAgent, timeout: 15000 });
      const data = response.data;

      if (!data || !data.data || !data.data.play) {
        throw new Error("No video found or API limit reached.");
      }

      const videoUrl = data.data.play; 
      const title = data.data.title || "TikTok video";
      const duration = data.data.duration || "N/A";

      await m.react('⬇️');

      // 4. Download video buffer
      const videoStream = await axios.get(videoUrl, {
        httpsAgent,
        responseType: "arraybuffer",
        timeout: 20000
      });
      const videoBuffer = Buffer.from(videoStream.data);

      // 5. Handling 16MB WhatsApp Limit
      const isLarge = videoBuffer.length > 16 * 1024 * 1024;
      const captionText = `🎬 *TIKTOK DOWNLOADER*\n\n📝 *Title:* ${title}\n⏱️ *Duration:* ${duration}s\n\n*Downloaded by X-BOT-MD*`;

      if (isLarge) {
        // Send as Document if file size > 16MB
        await client.sendMessage(
          m.jid,
          {
            document: videoBuffer,
            mimetype: "video/mp4",
            fileName: `tiktok_${Date.now()}.mp4`,
            caption: `⚠️ *File is large (${(videoBuffer.length / (1024 * 1024)).toFixed(2)}MB)*\n${captionText}`
          },
          { quoted: m }
        );
      } else {
        // Send as Video
        await client.sendMessage(
          m.jid,
          {
            video: videoBuffer,
            caption: captionText,
          },
          { quoted: m }
        );
      }

      await m.react('✅');

    } catch (error) {
      await m.react('❌');
      console.error("TikTok error:", error);
      let errorMsg = error.message.includes("timeout") 
        ? "❌ *Request Timeout:* Server took too long to respond." 
        : `❌ *Error:* ${error.message}`;
      
      await client.sendMessage(m.jid, { text: errorMsg }, { quoted: m });
    }
  }
);
