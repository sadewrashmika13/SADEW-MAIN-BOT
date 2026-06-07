const axios = require("axios");
const {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  proto,
} = require("@whiskeysockets/baileys");
const { Sparky } = require("../lib");

const API_TOKEN = "VK4fry";
const WHITESHADOW_API =
  "https://whiteshadow-x-api.onrender.com/api/search/tiktok";
const TIKWM_SEARCH_API = "https://tikwm.com/api/feed/search";
const MAX_RESULTS = 6;

const OUTER_HEADER_TITLE = "ＬＯＡＤＩＮＧ．．． ＳＡＤＥＷ ＭＤ";
const OUTER_FOOTER_TEXT = "│ ᴘᴏᴡᴇʀᴅ ʙʏ sᴀᴅᴇᴡ-ᴍᴅ";
const CARD_FOOTER_TEXT = "SADEW LITE BOT";

function getJid(m) {
  return m.jid || m.chat || m.from || m.key?.remoteJid;
}

function getSearchQuery(args) {
  if (Array.isArray(args)) return args.join(" ").trim();
  if (typeof args === "string") return args.trim();
  return "";
}

function truncateText(value, maxLength) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

function pickResultsArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.results)) return payload.data.results;
  if (Array.isArray(payload?.data?.videos)) return payload.data.videos;
  if (Array.isArray(payload?.result)) return payload.result;
  return [];
}

function pickFirstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function toAbsoluteTikwmUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `https://tikwm.com${url}`;
  return url;
}

function createProto(type, value) {
  if (type?.fromObject) return type.fromObject(value);
  if (type?.create) return type.create(value);
  return value;
}

function buildTikTokPageUrl(video) {
  const id = pickFirstString(video.id, video.video_id, video.aweme_id);
  const username = pickFirstString(
    video.author?.unique_id,
    video.author?.username,
    video.author_unique_id,
    video.username,
    video.unique_id
  );

  if (id && username) return `https://www.tiktok.com/@${username}/video/${id}`;
  return "";
}

function normalizeVideo(rawVideo, index) {
  const title = pickFirstString(
    rawVideo.title,
    rawVideo.caption,
    rawVideo.desc,
    rawVideo.description,
    rawVideo.text,
    `TikTok Result ${index + 1}`
  );
  const author = pickFirstString(
    rawVideo.author?.nickname,
    rawVideo.author?.unique_id,
    rawVideo.nickname,
    rawVideo.username
  );
  const body = pickFirstString(
    rawVideo.caption,
    rawVideo.desc,
    rawVideo.description,
    rawVideo.hashtags,
    author ? `Creator: ${author}` : "",
    title
  );
  const thumbnail = toAbsoluteTikwmUrl(
    pickFirstString(
      rawVideo.thumbnail,
      rawVideo.cover,
      rawVideo.dynamic_cover,
      rawVideo.origin_cover,
      rawVideo.image,
      rawVideo.thumb
    )
  );
  const directVideo = toAbsoluteTikwmUrl(
    pickFirstString(
      rawVideo.play,
      rawVideo.wmplay,
      rawVideo.video_url,
      rawVideo.play_url,
      rawVideo.download_url
    )
  );
  const pageUrl = pickFirstString(
    rawVideo.url,
    rawVideo.link,
    rawVideo.share_url,
    rawVideo.shareUrl,
    rawVideo.webpage_url,
    buildTikTokPageUrl(rawVideo)
  );

  return {
    title,
    body,
    thumbnail,
    url: pageUrl || directVideo,
  };
}

async function safeReact(m, emoji) {
  try {
    await m.react?.(emoji);
  } catch (error) {
    console.error("ts command react error:", error);
  }
}

async function sendText(m, client, text) {
  const jid = getJid(m);

  if (typeof m.reply === "function") return m.reply(text);
  if (typeof m.sendMsg === "function") return m.sendMsg(jid, text, { quoted: m });
  if (typeof client?.sendMessage === "function") {
    return client.sendMessage(jid, { text }, { quoted: m });
  }

  throw new Error("No supported text send method found");
}

async function fetchWhiteShadowResults(searchQuery) {
  const endpoint = `${WHITESHADOW_API}?query=${encodeURIComponent(
    searchQuery
  )}&apitoken=${API_TOKEN}`;

  const { data } = await axios.get(endpoint, { timeout: 15000 });
  return pickResultsArray(data).map(normalizeVideo);
}

async function fetchTikwmResults(searchQuery) {
  const body = new URLSearchParams({
    keywords: searchQuery,
    count: String(MAX_RESULTS),
    cursor: "0",
  });

  const { data } = await axios.post(TIKWM_SEARCH_API, body, {
    timeout: 15000,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36",
      Referer: "https://tikwm.com/",
    },
  });

  return pickResultsArray(data).map(normalizeVideo);
}

async function fetchTikTokResults(searchQuery) {
  try {
    console.log(`Searching TikTok via WhiteShadow for: ${searchQuery}`);
    const videos = await fetchWhiteShadowResults(searchQuery);
    const usable = videos.filter((video) => video.url).slice(0, MAX_RESULTS);
    if (usable.length) return usable;
  } catch (error) {
    console.error("WhiteShadow TikTok API error:", error.message);
  }

  console.log(`Searching TikTok via TikWM for: ${searchQuery}`);
  const videos = await fetchTikwmResults(searchQuery);
  const usable = videos.filter((video) => video.url).slice(0, MAX_RESULTS);

  if (!usable.length) throw new Error("No TikTok results found");
  return usable;
}

async function prepareImageHeader(client, thumbnailUrl) {
  if (!thumbnailUrl) throw new Error("Missing thumbnail URL");

  return prepareWAMessageMedia(
    {
      image: {
        url: thumbnailUrl,
      },
    },
    {
      upload: client.waUploadToServer,
    }
  );
}

async function buildCarouselCards(client, videos) {
  const InteractiveMessage = proto.Message.InteractiveMessage;
  const cards = [];

  for (const video of videos) {
    try {
      const media = await prepareImageHeader(client, video.thumbnail);
      const card = createProto(InteractiveMessage, {
        header: createProto(InteractiveMessage.Header, {
          title: truncateText(video.title, 30),
          hasMediaAttachment: true,
          imageMessage: media.imageMessage,
        }),
        body: createProto(InteractiveMessage.Body, {
          text: truncateText(video.body, 60),
        }),
        footer: createProto(InteractiveMessage.Footer, {
          text: CARD_FOOTER_TEXT,
        }),
        nativeFlowMessage: createProto(InteractiveMessage.NativeFlowMessage, {
          buttons: [
            {
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({
                display_text: "📥 Download Video",
                id: `.tiktok ${video.url}`,
              }),
            },
          ],
        }),
      });

      cards.push(card);
    } catch (error) {
      console.error(`TS card skipped: ${video.title}`, error.message);
    }
  }

  return cards;
}

async function sendCarousel(m, client, searchQuery, videos) {
  const jid = getJid(m);
  const InteractiveMessage = proto.Message.InteractiveMessage;
  const CarouselMessage =
    InteractiveMessage?.CarouselMessage || proto.Message.CarouselMessage;

  if (!InteractiveMessage) throw new Error("InteractiveMessage proto not found");
  if (!CarouselMessage) throw new Error("CarouselMessage proto not found");
  if (typeof client?.relayMessage !== "function") {
    throw new Error("client.relayMessage is not available");
  }

  const cards = await buildCarouselCards(client, videos);
  if (!cards.length) throw new Error("Could not process any video or image cards");

  const interactiveMessage = createProto(InteractiveMessage, {
    header: createProto(InteractiveMessage.Header, {
      title: OUTER_HEADER_TITLE,
      hasMediaAttachment: false,
    }),
    body: createProto(InteractiveMessage.Body, {
      text: `TikTok video results for: ${searchQuery}`,
    }),
    footer: createProto(InteractiveMessage.Footer, {
      text: OUTER_FOOTER_TEXT,
    }),
    carouselMessage: createProto(CarouselMessage, {
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
    {
      quoted: m,
    }
  );

  await client.relayMessage(jid, message.message, {
    messageId: message.key.id,
  });
}

async function sendFallbackList(m, client, searchQuery, videos) {
  const lines = [
    `TikTok search results for: ${searchQuery}`,
    "",
    ...videos.slice(0, MAX_RESULTS).map((video, index) => {
      const title = truncateText(video.title || `TikTok Result ${index + 1}`, 80);
      return `${index + 1}. ${title}\n${video.url}`;
    }),
  ];

  return sendText(m, client, lines.join("\n\n"));
}

Sparky(
  {
    name: "ts",
    fromMe: false,
    category: "search",
    desc: "Search TikTok videos and display in a beautiful carousel grid.",
    description: "Search TikTok videos and display in a beautiful carousel grid.",
  },
  async ({ m, client, args }) => {
    const searchQuery = getSearchQuery(args);

    if (!searchQuery) {
      return sendText(m, client, "❌ *Usage:* `.ts sadew`");
    }

    try {
      await safeReact(m, "🔍");

      const videos = await fetchTikTokResults(searchQuery);

      try {
        await sendCarousel(m, client, searchQuery, videos);
      } catch (carouselError) {
        console.error("TS carousel failed, sending fallback:", carouselError);
        await sendFallbackList(m, client, searchQuery, videos);
      }

      await safeReact(m, "⚡");
    } catch (error) {
      console.error("Main TS Command Error:", error);
      await safeReact(m, "❌");

      return sendText(
        m,
        client,
        `❌ TikTok search failed.\nReason: ${
          error?.response?.data?.message || error.message || "Unknown Error"
        }`
      );
    }
  }
);
