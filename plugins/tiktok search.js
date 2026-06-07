const axios = require("axios");
const {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  proto,
} = require("@whiskeysockets/baileys");
const { Sparky } = require("../lib");

const MAX_RESULTS = 6;
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

// 🔍 TikWM සර්වර් එකෙන් TikTok වීඩියෝ සර්ච් කරන කොටස
async function fetchTikWMSearchResults(searchQuery) {
  try {
    console.log(`Searching TikTok via TikWM for: ${searchQuery}`);
    
    // TikWM සර්ච් එකට POST රික්වෙස්ට් එකක් Form Data විදිහට යැවීම තමයි ආරක්ෂිතම ක්‍රමය
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
      return {
        title: v.title || `TikTok Result ${index + 1}`,
        body: v.author?.nickname || `@${v.author?.unique_id}` || "TikTok Video",
        // 'play' කියන්නේ වෝටර්මාර්ක් නැති ඩිරෙක්ට් වීඩියෝ ස්ට්‍රීම් ලින්ක් එක
        url: v.play || `https://tikwm.com${v.play}`, 
        thumbnail: v.cover || `https://tikwm.com${v.cover}`
      };
    });

  } catch (e) {
    console.error("TikWM Search API Error:", e.message);
    throw new Error(`TikWM API failed: ${e.message}`);
  }
}

// 🎥 වීඩියෝ ටික වට්ස්ඇප් සර්වර් එකට අප්ලෝඩ් කරලා හොරිසොන්ටල් කාඩ්ස් හදන කොටස
async function buildVideoCarouselCards(client, videos) {
  const cards = [];
  for (const video of videos) {
    try {
      // කෙලින්ම TikWM වීඩියෝ ලින්ක් එක බේලීස් වලට දීලා අප්ලෝඩ් කරවනවා
      const mediaContent = { video: { url: video.url } };
      const media = await client.prepareWAMessageMedia(mediaContent, {
        upload: client.waUploadToServer,
      });

      const card = proto.Message.CarouselMessage.Card.fromObject({
        header: proto.Message.InteractiveMessage.Header.fromObject({
          title: truncateText(video.title, 30),
          hasMediaAttachment: true,
          videoMessage: media.videoMessage, // 👈 වීඩියෝ එක කාඩ් එක ඇතුළටම දැම්මා
        }),
        body: proto.Message.InteractiveMessage.Body.fromObject({
          text: truncateText(video.body, 60),
        }),
        footer: proto.Message.InteractiveMessage.Footer.fromObject({
          text: CARD_FOOTER_TEXT,
        }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
          buttons: [
            {
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({
                display_text: "🎥 High Quality Play",
                id: `.tiktok ${video.url}`,
              }),
            },
          ],
        }),
      });
      cards.push(card);
    } catch (e) {
      console.error("Error creating video card for:", video.title, e.message);
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
      await safeReact(m, "📥"); // වීඩියෝ ප්‍රොසෙස් වෙන හින්දා 📥 ඉමෝජි එක දැම්මා

      // 1. TikWM එකෙන් ඩේටා ඇදීම
      const videos = await fetchTikWMSearchResults(searchQuery);
      const jid = getJid(m);
      
      // 2. වීඩියෝ 6 වට්ස්ඇප් එකට අප්ලෝඩ් කරලා කාඩ්ස් සකස් කිරීම
      const cards = await buildVideoCarouselCards(client, videos);

      if (!cards.length) throw new Error("Could not download or process any videos from TikWM");

      // 3. මුළු කැරොසල් මැසේජ් එකම එකතු කරලා සකස් කිරීම
      const interactiveMessage = proto.Message.InteractiveMessage.fromObject({
        header: proto.Message.InteractiveMessage.Header.fromObject({
          title: OUTER_HEADER_TITLE,
          hasMediaAttachment: false,
        }),
        body: proto.Message.InteractiveMessage.Body.fromObject({
          text: `TikTok video results for: ${searchQuery}`,
        }),
        footer: proto.Message.InteractiveMessage.Footer.fromObject({
          text: OUTER_FOOTER_TEXT,
          }),
        carouselMessage: proto.Message.CarouselMessage.fromObject({
          cards,
          messageVersion: 1,
        }),
      });

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

      // 4. මැසේජ් එක වට්ස්ඇප් එකට රිලේ කිරීම
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
