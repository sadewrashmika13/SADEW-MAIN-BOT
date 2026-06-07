const axios = require("axios");
const {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  proto,
} = require("@whiskeysockets/baileys");
const { Sparky } = require("../lib");

// 🔄 වැඩ කරන සුපිරි බැකප් API ලින්ක්ස්
const API_ENDPOINTS = [
  "https://api.maher-zubair.tech/search/tiktok",
  "https://api.agatz.xyz/api/tiktok",
  "https://itzpire.com/search/tiktok"
];

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

async function fetchTikTokResults(searchQuery) {
  let lastError = null;

  for (const baseUrl of API_ENDPOINTS) {
    try {
      console.log(`Trying TikTok API: ${baseUrl}`);
      const endpoint = `${baseUrl}?query=${encodeURIComponent(searchQuery)}&q=${encodeURIComponent(searchQuery)}`;
      
      const { data } = await axios.get(endpoint, { timeout: 10000 });
      const rawResults = data?.result || data?.data || data?.results || [];
      const items = Array.isArray(rawResults) ? rawResults : (rawResults.data || []);

      if (Array.isArray(items) && items.length > 0) {
        return items
          .map((rawVideo, index) => {
            return {
              title: rawVideo.title || rawVideo.caption || rawVideo.desc || `TikTok Result ${index + 1}`,
              body: rawVideo.author?.nickname || rawVideo.author?.name || rawVideo.author || "TikTok Video",
              thumbnail: rawVideo.cover || rawVideo.thumbnail || rawVideo.dynamic_cover,
              url: rawVideo.video || rawVideo.url || rawVideo.link || rawVideo.nowm || rawVideo.play,
            };
          })
          .filter((v) => v.url) // වීඩියෝ URL එක අනිවාර්යයෙන් තියෙන්න ඕනේ
          .slice(0, MAX_RESULTS);
      }
    } catch (e) {
      console.warn(`API ${baseUrl} failed: ${e.message}`);
      lastError = e;
    }
  }

  throw new Error(lastError ? `All TikTok APIs failed. Last error: ${lastError.message}` : "No results found");
}

// 🎥 මෙන්න මෙතනදී තමයි වීඩියෝ එක ඩවුන්ලෝඩ් කරලා කාඩ් එකට ඔබන්නේ:
async function buildCarouselCards(client, videos) {
  const cards = [];
  for (const video of videos) {
    try {
      // 🚨 ඉමේජ් වෙනුවට කෙලින්ම වීඩියෝ ලින්ක් එක වට්ස්ඇප් එකට සකස් කරනවා
      const mediaContent = { video: { url: video.url } };
      const media = await client.prepareWAMessageMedia(mediaContent, {
        upload: client.waUploadToServer,
      });

      const card = proto.Message.CarouselMessage.Card.fromObject({
        header: proto.Message.InteractiveMessage.Header.fromObject({
          title: truncateText(video.title, 30),
          hasMediaAttachment: true,
          videoMessage: media.videoMessage, // 👈 මෙතනට වීඩියෝ මැසේජ් එක දැම්මා
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
                display_text: "🎥 Play / Info",
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
    desc: "Search TikTok and stream videos horizontally.",
  },
  async ({ m, client, args }) => {
    const searchQuery = args && Array.isArray(args) ? args.join(" ").trim() : String(args || "").trim();

    if (!searchQuery) {
      return await sendText(m, client, "❌ *Usage:* `.ts sadew`");
    }

    try {
      await safeReact(m, "📥"); // වීඩියෝ ඩවුන්ලෝඩ් වෙන හින්දා 📥 ඉමෝජි එක දැම්මා

      const videos = await fetchTikTokResults(searchQuery);
      const jid = getJid(m);
      
      // වීඩියෝ 6ක්ම එකපාර බේලීස් වලින් ප්‍රොසෙස් වෙන්න තත්පර කිහිපයක් යනවා
      const cards = await buildCarouselCards(client, videos);

      if (!cards.length) throw new Error("Could not download or process any videos for carousel");

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
