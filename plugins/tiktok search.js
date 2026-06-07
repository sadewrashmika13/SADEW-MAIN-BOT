const axios = require("axios");
const {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
} = require("@whiskeysockets/baileys");
const { Sparky } = require("../lib");

const MAX_RESULTS = 4; 
const OUTER_HEADER_TITLE = "ＬＯＡＤＩＮＧ．．． ＳＡＤＥＷ  ＭＤ";
const OUTER_FOOTER_TEXT = "│ ᴘᴏᴡᴇʀᴅ ʙʏ sᴀᴅᴇᴡ-ᴍᴅ";
const CARD_FOOTER_TEXT = "SADEW LITE BOT";

function getJid(m) {
  return m.jid || m.chat || m.from || m.key?.remoteJid;
}

function truncateText(value, maxLength) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

async function sendText(m, client, text) {
  try {
    const jid = getJid(m);
    if (client && typeof client.sendMessage === "function") {
      return await client.sendMessage(jid, { text }, { quoted: m });
    }
    if (typeof m.reply === "function") return await m.reply(text);
  } catch (e) {
    console.error("Critical: sendText failed:", e.message);
  }
}

async function safeReact(m, emoji) {
  try {
    await m.react?.(emoji);
  } catch (e) {}
}

async function fetchTikWMSearchResults(searchQuery) {
  try {
    console.log(`Searching TikTok via TikWM for: ${searchQuery}`);
    
    const response = await axios.post(
      "https://tikwm.com/api/feed/search",
      new URLSearchParams({
        keywords: searchQuery,
        count: String(MAX_RESULTS),
        cursor: "0"
      }),
      { timeout: 15000 }
    );

    const videos = response.data?.data?.videos;
    if (!Array.isArray(videos) || !videos.length) {
      throw new Error("No videos found for this keyword on TikWM");
    }

    return videos.map((v, index) => {
      let videoUrl = v.play || v.wmplay;
      if (videoUrl && videoUrl.startsWith('/')) videoUrl = `https://tikwm.com${videoUrl}`;
      
      let thumbUrl = v.cover;
      if (thumbUrl && thumbUrl.startsWith('/')) thumbUrl = `https://tikwm.com${thumbUrl}`;

      return {
        title: v.title || `TikTok Result ${index + 1}`,
        body: v.author?.nickname || `@${v.author?.unique_id}` || "TikTok Video",
        url: videoUrl, 
        thumbnail: thumbUrl
      };
    }).filter(v => v.url);

  } catch (e) {
    console.error("TikWM Search API Error:", e.message);
    throw new Error(`TikWM API failed: ${e.message}`);
  }
}

// ✨ Object-Based ක්‍රමයට කාඩ්ස් සාදන කොටස (ක්‍රෑෂ් වෙන්නේ නැති Bulletproof ක්‍රමය)
async function buildCarouselCards(client, videos) {
  const cards = [];
  
  for (const video of videos) {
    try {
      console.log(`Downloading video buffer for: ${video.title}`);
      
      const videoRes = await axios.get(video.url, {
        responseType: "arraybuffer",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://tikwm.com/"
        },
        timeout: 12000
      }).catch(() => null);

      let media;
      let headerConfig;

      if (videoRes && videoRes.data) {
        media = await prepareWAMessageMedia(
          { video: videoRes.data },
          { upload: client.waUploadToServer }
        );
        headerConfig = {
          title: truncateText(video.title, 30),
          hasMediaAttachment: true,
          videoMessage: media.videoMessage,
        };
      } else {
        console.log(`Video buffer failed, falling back to thumbnail for: ${video.title}`);
        media = await prepareWAMessageMedia(
          { image: { url: video.thumbnail } },
          { upload: client.waUploadToServer }
        );
        headerConfig = {
          title: truncateText(video.title, 30),
          hasMediaAttachment: true,
          imageMessage: media.imageMessage,
        };
      }

      // 🛠️ proto කෑලි අයින් කරලා කෙලින්ම පිරිසිදු Object එකක් හැදුවා
      const card = {
        header: headerConfig,
        body: {
          text: truncateText(video.body, 60),
        },
        footer: {
          text: CARD_FOOTER_TEXT,
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({
                display_text: "📥 Download Video",
                id: `.tiktok ${video.url}`,
              }),
            },
          ],
        },
      };
      cards.push(card);
    } catch (e) {
      console.error("Error creating card for:", video.title, e.message);
    }
  }
  return cards;
}

Sparky(
  {
    name: "ts",
    fromMe: false,
    category: "search",
    desc: "Search TikTok and display direct video carousel using TikWM.",
  },
  async ({ m, client, args }) => {
    const searchQuery = args && Array.isArray(args) ? args.join(" ").trim() : String(args || "").trim();

    if (!searchQuery) {
      return await sendText(m, client, "❌ *Usage:* `.ts sadew`");
    }

    try {
      await safeReact(m, "📥");

      const videos = await fetchTikWMSearchResults(searchQuery);
      const jid = getJid(m);
      
      const cards = await buildCarouselCards(client, videos);

      if (!cards.length) throw new Error("Could not process any video or image cards");

      // 🛠️ මුළු මැසේජ් එකම සාමාන්‍ය JS Object එකක් විදිහට සකස් කලා මචං
      const interactiveMessage = {
        header: {
          title: OUTER_HEADER_TITLE,
          hasMediaAttachment: false,
        },
        body: {
          text: `TikTok video results for: ${searchQuery}`,
        },
        footer: {
          text: OUTER_FOOTER_TEXT,
        },
        carouselMessage: {
          cards: cards,
          messageVersion: 1,
        },
      };

      const message = generateWAMessageFromContent(
        jid,
        {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
              },
              interactiveMessage,
            },
          },
        },
        { quoted: m }
      );

      await client.relayMessage(jid, message.message, { messageId: message.key.id });
      await safeReact(m, "⚡");

    } catch (error) {
      console.error("Main TS Command Error:", error.message);
      await safeReact(m, "❌");
      return await sendText(
        m,
        client,
        `❌ TikTok search failed.\nReason: ${error.message || "Unknown Error"}`
      );
    }
  }
);
