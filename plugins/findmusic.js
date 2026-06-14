const { Sparky, isPublic } = require("../lib");
const axios = require("axios");
const FormData = require("form-data");

// 🎵 Music Recognition API Keys (Failover List)
const API_KEYS = [
    "8d48a5d0f1c1f94d56cde6edf1b2bf00", // ප්‍රධාන AudD Key එක
    "test"                              // Backup Test Token
];

// 🌐 WhiteShadow YT APIs & Token
const API_TOKEN = "VK4fry";
const YT_SEARCH_API = "https://whiteshadow-x-api.onrender.com/api/search/yt";
const YT_DOWNLOAD_API = "https://whiteshadow-x-api.onrender.com/api/download/ytmp3";

Sparky(
  {
    name: "find",
    alias: ["shazam", "whatsong", "findsong", "song"],
    fromMe: isPublic,
    category: "tools",
    desc: "Finds song info and automatically sends the 320kbps MP3 audio file from YouTube.",
  },
  async ({ m, client, args }) => {
    
    // 🛡️ Fail-Safe Text Message Sender
    const sendMsg = async (text) => {
      try {
        if (typeof m.reply === "function") {
          await m.reply(text);
        } else {
          await client.sendMessage(m.jid, { text }, { quoted: m });
        }
      } catch (e) {
        console.error("[SADEW-MD BOT] Text reply failed:", e.message);
        try {
          await client.sendMessage(m.jid, { text });
        } catch (err) {
          console.error("[SADEW-MD BOT] Unable to send text at all:", err.message);
        }
      }
    };

    // 🌟 GLOBAL TRY-CATCH SYSTEM
    try {
      console.log("[SADEW-MD BOT V2] Command execution started.");

      // චැට් එකේ වීඩියෝ හෝ ඕඩියෝ එකකට රිප්ලයි කරලාද බලනවා
      const isQuotedMedia = m.quoted && (
          m.quoted.mtype === "audioMessage" || 
          m.quoted.mtype === "videoMessage" ||
          m.quoted.type === "audio" ||
          m.quoted.type === "video" ||
          (m.quoted.mime && (m.quoted.mime.startsWith("audio/") || m.quoted.mime.startsWith("video/"))) ||
          !!m.quoted.message?.audioMessage ||
          !!m.quoted.message?.videoMessage ||
          !!m.quoted.message?.viewOnceMessage?.message?.videoMessage
      );

      if (!isQuotedMedia) {
        return await sendMsg("❌ *Error:* කරුණාකර සින්දුව සෙවීමට සහ ඩවුන්ලෝඩ් කිරීමට අවශ්‍ය වීඩියෝවකට (Video) හෝ ඕඩියෝවකට (Audio) රිප්ලයි කර `.find` ලෙස ටයිප් කරන්න.");
      }

      try { if (typeof m.react === "function") await m.react("⏳"); } catch {}

      // 1. Media Download කිරිම
      console.log("[SADEW-MD BOT V2] Downloading media into RAM...");
      await sendMsg("⏳ _Downloading media file into RAM Buffer..._");
      
      let mediaBuffer;
      try {
        if (typeof m.quoted.download === "function") {
            mediaBuffer = await m.quoted.download();
        } else if (client.downloadMediaMessage) {
            mediaBuffer = await client.downloadMediaMessage(m.quoted);
        } else {
            const msg = m.quoted.message?.audioMessage || m.quoted.message?.videoMessage || m.quoted.message?.viewOnceMessage?.message?.videoMessage;
            if (msg) mediaBuffer = await client.downloadMediaMessage(msg);
        }
        
        if (!mediaBuffer) throw new Error("Buffer is empty.");
      } catch (err) {
        console.error("[SADEW-MD BOT V2] Download Failed:", err.message);
        try { if (typeof m.react === "function") await m.react("❌"); } catch {}
        return await sendMsg("❌ *Error:* වීඩියෝව/ඕඩියෝව ඩවුන්ලෝඩ් කරගැනීමට නොහැකි විය.");
      }

      const mimetype = m.quoted.mime || (m.quoted.mtype === "audioMessage" ? "audio/mp3" : "video/mp4");

      // 2. Audio Tracking (AudD API)
      await sendMsg("🔍 _Identifying the song audio track..._");
      
      let songData = null;
      for (let i = 0; i < API_KEYS.length; i++) {
         try {
            const form = new FormData();
            form.append("api_token", API_KEYS[i]);
            form.append("file", mediaBuffer, { filename: "media.mp4", contentType: mimetype });
            form.append("return", "apple_music,spotify");

            const response = await axios.post("https://api.audd.io/", form, {
                headers: form.getHeaders(),
                timeout: 15000
            });

            if (response.data && response.data.status === "success" && response.data.result) {
                songData = response.data.result;
                break;
            }
         } catch (apiErr) {
            console.error(`[SADEW-MD BOT V2] AudD Method ${i + 1} Failed:`, apiErr.message);
         }
      }

      // සින්දුව හොයාගන්න බැරි වුණොත් එතනින් නවතිනවා
      if (!songData) {
         try { if (typeof m.react === "function") await m.react("❌"); } catch {}
         return await sendMsg("❌ *Error:* කණගාටුයි, මෙම වීඩියෝවේ ඇති සින්දුව හඳුනා ගැනීමට අපොහොසත් වුණා.");
      }

      // සින්දුවේ නම සහ ගායකයා එකතු කරලා සර්ච් ක්වෙරි එක හදනවා
      const songTitle = songData.title || "Unknown Song";
      const songArtist = songData.artist || "Unknown Artist";
      const searchQuery = `${songTitle} ${songArtist}`;

      // 3. YouTube Search (WhiteShadow YT Search API)
      await sendMsg(`🎵 *සින්දුව අහුවුණා:* _${songTitle} - ${songArtist}_\n\n🚀 _Searching on YouTube for matching audio..._`);
      console.log(`[SADEW-MD BOT V2] Searching YT for: ${searchQuery}`);
      
      let youtubeUrl = null;
      try {
          const searchResponse = await axios.get(`${YT_SEARCH_API}?q=${encodeURIComponent(searchQuery)}&apitoken=${API_TOKEN}`, { timeout: 20000 });
          
          if (searchResponse.data?.success && searchResponse.data?.result?.length > 0) {
              // පළවෙනි වීඩියෝ රිසල්ට් එකේ URL එක ගන්නවා
              youtubeUrl = searchResponse.data.result[0].url;
              console.log("[SADEW-MD BOT V2] YouTube Video URL Found:", youtubeUrl);
          }
      } catch (searchErr) {
          console.error("[SADEW-MD BOT V2] YouTube Search API Error:", searchErr.message);
      }

      // යූටියුබ් එකෙන් වීඩියෝ එකක් සෙට් වුනේ නැත්නම් විස්තර ටික විතරක් යවනවා බැකප් එකක් විදිහට
      if (!youtubeUrl) {
          let fallbackMsg = `*🎵 සින්දුව හඳුනාගත්තා (Sadew MD) 🎵*\n\n📌 *නම:* ${songTitle}\n👤 *ගායකයා:* ${songArtist}\n\n⚠️ _YouTube සෙවුම ක්‍රියා විරහිත බැවින් ඕඩියෝ එක ලබා දිය නොහැක._`;
          try { if (typeof m.react === "function") await m.react("✅"); } catch {}
          return await sendMsg(fallbackMsg);
      }

      // 4. YouTube MP3 Download (WhiteShadow YTMP3 API)
      await sendMsg("📥 _Extracting 320kbps High-Quality Audio stream from YouTube..._");
      console.log(`[SADEW-MD BOT V2] Fetching download link for: ${youtubeUrl}`);

      let audioDownloadUrl = null;
      try {
          const downloadResponse = await axios.get(`${YT_DOWNLOAD_API}?url=${encodeURIComponent(youtubeUrl)}&quality=320&apitoken=${API_TOKEN}`, { timeout: 30000 });
          
          if (downloadResponse.data?.success && downloadResponse.data?.result?.download_url) {
              audioDownloadUrl = downloadResponse.data.result.download_url;
              console.log("[SADEW-MD BOT V2] Audio Download Link Success:", audioDownloadUrl);
          }
      } catch (dlErr) {
          console.error("[SADEW-MD BOT V2] YT Download API Error:", dlErr.message);
      }

      if (!audioDownloadUrl) {
          let fallbackMsg = `*🎵 සින්දුව හඳුනාගත්තා (Sadew MD) 🎵*\n\n📌 *නම:* ${songTitle}\n👤 *ගායකයා:* ${songArtist}\n\n⚠️ _320kbps ඕඩියෝ ලින්ක් එක ජෙනරේට් කරගැනීමට නොහැකි විය._`;
          try { if (typeof m.react === "function") await m.react("✅"); } catch {}
          return await sendMsg(fallbackMsg);
      }

      // 5. WhatsApp Mobile Device Compatible Audio එකක් විදිහට යැවීම
      await sendMsg("⬆️ _Uploading and sending audio file to WhatsApp..._");
      
      const songInfoText = `*🎵 Sadew-MD V2 Music Finder 🎵*\n\n📌 *Title:* ${songTitle}\n👤 *Artist:* ${songArtist}\n💿 *Quality:* 320kbps High-Quality\n🚀 *System:* Auto YT-Bypass Active`;

      // මුලින්ම විස්තර ටික යවනවා
      await sendMsg(songInfoText);

      // ඊටපස්සේ කෙලින්ම ඕඩියෝ ප්ලේයර් එකට සපෝට් කරන විදිහට MP3 එක යවනවා
      await client.sendMessage(
          m.jid,
          {
              audio: { url: audioDownloadUrl },
              mimetype: "audio/mpeg", // Mobile සපෝට් එක සුපිරියටම එන්න audio/mpeg දාන්න ඕනේ MP3 එකකට
              ptt: false,             // Voice note එකක් නෙමෙයි, Audio එකක් විදිහට යන්න
              fileName: `${songTitle}.mp3`
          },
          { quoted: m }
      );

      try { if (typeof m.react === "function") await m.react("✅"); } catch {}

    } catch (globalError) {
      console.error("[SADEW-MD BOT V2] CRITICAL GLOBAL ERROR:", globalError);
      try { if (typeof m.react === "function") await m.react("❌"); } catch {}
      await sendMsg(`❌ *Sadew-MD V2 Internal Error:* ${globalError.message}\n\nPlease check \`pm2 logs\`.`);
    }
  }
);
