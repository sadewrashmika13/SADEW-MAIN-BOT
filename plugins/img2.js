const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

let baileys;
try {
  baileys = require("baileys");
} catch {
  baileys = require("@whiskeysockets/baileys");
}

const { proto, generateWAMessageFromContent, prepareWAMessageMedia } = baileys;

const API_TOKEN = process.env.WHITESHADOW_API_TOKEN || "VK4fry";
const API_URL = "https://whiteshadow-x-api.onrender.com/api/search/pinterest";
const BOT_NAME = "Sadew Rashmika";
const TOTAL_LIMIT = 20; // උපරිම ෆොටෝ 20ක්

const http = axios.create({
  timeout: 30000, // HD ෆොටෝ නිසා timeout එක පොඩ්ඩක් වැඩි කරා
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0 Safari/537.36",
    Accept: "application/json,text/plain,*/*",
  },
});

function getQuery(args) {
  return (Array.isArray(args) ? args.join(" ") : String(args || "")).trim();
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

// ==========================================
// 🔥 HD UPSCALER LOGIC - (HD QUALITY OPTION)
// ==========================================
// පින්ටරෙස්ට් ලින්ක් එකේ තියෙන size markers (236x, 736x) අඳුරගෙන
// ඒවා ඔරිජිනල් HD (/originals/) ලින්ක් එකක් බවට හරවනවා.
function upscalePinterestUrl(url) {
  if (!isHttpUrl(url)) return url;
  
  // පින්ටරෙස්ට් ලින්ක්ස් වල සාමාන්‍යයෙන් Thumbnail sizes තියෙන්නේ මෙහෙමයි: /236x/, /474x/, /736x/
  // අපි මේවා Full HD 'originals' කියන එකට Replace කරනවා.
  let hqUrl = url.replace(/\/(236x|474x|736x|564x|updates)\//g, '/originals/');
  
  // සමහර ලින්ක්ස් වල image path එක අවසානයේ තියෙන size markers අයින් කරනවා.
  hqUrl = hqUrl.replace(/_236\./g, '.'); // e.g. image_236.jpg -> image.jpg
  hqUrl = hqUrl.replace(/_736\./g, '.');
  
  return hqUrl;
}

// Pinterest API එකෙන් එන ඩේටා නෝමලයිස් කරගන්න ෆන්ක්ෂන් එක
function normalizePinterestResults(data) {
  const possibleResults = data?.result || data?.results || data?.data || data;
  const items = [];

  if (Array.isArray(possibleResults)) {
    for (const res of possibleResults) {
      if (typeof res === "string" && isHttpUrl(res)) {
        // ලින්ක් එකක් විදිහට ආවොත් කෙලින්ම HD කරලා ගන්නවා
        const hqUrl = upscalePinterestUrl(res);
        items.push({ imageUrl: hqUrl, title: "Pinterest HD Image", sourceUrl: hqUrl });
      } else if (res && typeof res === "object") {
        const url = res.url || res.image || res.imageUrl || res.link;
        if (url && isHttpUrl(url)) {
          // ඔබ්ජෙක්ට් එකක් ඇතුළේ ආවොත් URL එක HD කරලා ගන්නවා
          const hqUrl = upscalePinterestUrl(url);
          items.push({
            imageUrl: hqUrl,
            title: res.title || "Pinterest HD Image",
            sourceUrl: res.source || res.sourceUrl || hqUrl,
          });
        }
      }
    }
  }

  const seen = new Set();
  return items
    .filter((item) => {
      if (!item.imageUrl || seen.has(item.imageUrl)) return false;
      seen.add(item.imageUrl);
      return true;
    })
    .slice(0, TOTAL_LIMIT);
}

// API එකෙන් ඉමේජ් හොයන එක
async function searchPinterest(query) {
  const { data } = await http.get(API_URL, {
    params: {
      q: query,
      apitoken: API_TOKEN,
    },
  });

  const items = normalizePinterestResults(data);
  if (!items.length) {
    console.log("Pinterest API response:", JSON.stringify(data).slice(0, 1500));
    throw new Error("No images found from Pinterest API.");
  }

  return items;
}

// GitHub Actions වල ඩිස්ක් එකට ලියන්නේ නැතුව කෙලින්ම RAM Buffer එකට බාගන්න එක
// (HD ෆොටෝ නිසා ඩවුන්ලෝඩ් වෙන්න පොඩ්ඩක් වෙලා යයි)
async function downloadImage(item) {
  // අපි කලින්ම ලින්ක් එක HD කරපු නිසා, මෙතනදී කෙලින්ම originals එක බාන්නේ.
  console.log(`[Sadew-MD] Downloading HD Image: ${item.imageUrl}`);
  
  const response = await http.get(item.imageUrl, {
    responseType: "arraybuffer",
    headers: {
      Accept: "image/avif,image/webp,image/png,image/jpeg,image/*,*/*",
      Referer: "https://www.pinterest.com/",
    },
    validateStatus: (status) => status >= 200 && status < 400,
  });

  const contentType = String(response.headers["content-type"] || "").toLowerCase();
  
  if (!contentType.includes("image")) {
      throw new Error(`URL is not an image. Content-Type: ${contentType}`);
  }

  return {
    ...item,
    buffer: Buffer.from(response.data),
    mimetype: contentType.includes("png")
      ? "image/png"
      : contentType.includes("webp")
        ? "image/webp"
        : "image/jpeg",
  };
}

async function react(m, text) {
  try {
    if (typeof m.react === "function") await m.react(text);
  } catch {}
}

async function reply(client, m, text) {
  if (typeof m.reply === "function") return m.reply(text);
  return client.sendMessage(m.jid, { text }, { quoted: m });
}

function trimText(text, max = 55) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 3)}...` : clean;
}

// Carousel Card එක බිල්ඩ් කරන එක
async function buildCarouselCard(client, image, index, query, batchText) {
  const media = await prepareWAMessageMedia(
    { image: image.buffer },
    { upload: client.waUploadToServer }
  );

  return {
    header: proto.Message.InteractiveMessage.Header.fromObject({
      title: `Image ${index + 1} (HD)`,
      hasMediaAttachment: true,
      imageMessage: media.imageMessage,
    }),
    body: proto.Message.InteractiveMessage.Body.fromObject({
      text: `📌 ${trimText(query)}\n🖼️ ${trimText(image.title)}\n📦 ${batchText}`,
    }),
    footer: proto.Message.InteractiveMessage.Footer.fromObject({
      text: "✨ ＳＡＤＥＷ－Ｘ－ＭＤ",
    }),
    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
      buttons: [
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "Open HD Source",
            url: image.sourceUrl || image.imageUrl,
            merchant_url: image.sourceUrl || image.imageUrl,
          }),
        },
      ],
    }),
  };
}

// Carousel මැසේජ් එකක් යවන එක
async function sendCarouselBatch(client, m, images, query, batchNum) {
  const cards = [];
  const batchText = `Batch ${batchNum}/2`;

  for (let i = 0; i < images.length; i += 1) {
    cards.push(await buildCarouselCard(client, images[i], i, query, batchText));
  }

  const carouselMessage = proto.Message.InteractiveMessage.CarouselMessage.fromObject({
    cards,
  });

  const interactiveMessage = proto.Message.InteractiveMessage.fromObject({
    body: proto.Message.InteractiveMessage.Body.fromObject({
      text: `📸 *Pinterest HD Search* (${batchText})\n\n🔎 Query: *${query}*\n📌 Results: ${images.length}`,
    }),
    footer: proto.Message.InteractiveMessage.Footer.fromObject({
      text: BOT_NAME,
    }),
    carouselMessage,
  });

  const message = generateWAMessageFromContent(
    m.jid,
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

  await client.relayMessage(m.jid, message.message, { messageId: message.key.id });
}

// Carousel වැඩ නොකරොත් ෆෝල්බැක් එක විදිහට සාමාන්‍ය ඉමේජ් යවන එක
async function sendImagesFallback(client, m, images, query, batchNum) {
  for (let i = 0; i < images.length; i += 1) {
    const caption =
      i === 0
        ? `📸 *Pinterest Search HD Fallback* (Batch ${batchNum}/2)\n\n🔎 Query: *${query}*\n📌 Sent: ${images.length}\n\n*${BOT_NAME}*`
        : undefined;

    await client.sendMessage(
      m.jid,
      {
        image: images[i].buffer,
        mimetype: images[i].mimetype,
        caption,
      },
      { quoted: i === 0 ? m : undefined }
    );
    // HD නිසා Spam නොවෙන්න පොඩි delay එකක්
    await new Promise(resolve => setTimeout(resolve, 800));
  }
}

Sparky(
  {
    name: "img2",
    alias: ["pinterest2", "pimg", "pin2"],
    fromMe: isPublic,
    category: "tools",
    desc: "Search Pinterest images, auto-upscale to HD originals, and send 20 horizontal carousel cards split into 2 batches.",
  },
  async ({ client, m, args }) => {
    const query = getQuery(args);

    if (!query) {
      await react(m, "❓");
      return reply(
        client,
        m,
        `╭─「 *PINTEREST HD* 」
│
├ *Usage:* .img2 anime girl hd
├ *Example:* .img2 supercar
│
╰─ *${BOT_NAME}*`
      );
    }

    try {
      await react(m, "🔎");
      await client.sendPresenceUpdate("composing", m.jid);

      const results = await searchPinterest(query);
      const downloadedImages = [];

      // සේරම ඉමේජ් ටික RAM බෆර් වලට ගන්නවා
      for (const item of results) {
        try {
          downloadedImages.push(await downloadImage(item));
        } catch (error) {
          console.log("[Sadew-MD] Pinterest HD download failed for", item.imageUrl, "-", error.message);
        }
      }

      if (!downloadedImages.length) throw new Error("Images found, but download failed.");

      // ඉමේජ් 20, 10 ගානේ කෑලි 2කට වෙන් කරනවා (WhatsApp Carousel ලිමිට් එක මැක්ස් 10 නිසා)
      const batch1 = downloadedImages.slice(0, 10);
      const batch2 = downloadedImages.slice(10, 20);

      // ==== පළමු බැච් එක යැවීම ====
      if (batch1.length > 0) {
        try {
          await sendCarouselBatch(client, m, batch1, query, 1);
        } catch (error) {
          console.log("Batch 1 Carousel failed, using fallback:", error.message);
          await sendImagesFallback(client, m, batch1, query, 1);
        }
      }

      // ==== දෙවන බැච් එක යැවීම ====
      if (batch2.length > 0) {
        // වට්සැප් මැසේජ් ඕවර්ලැප් නොවෙන්න හෝ ෆොටෝ ඩවුන්ලෝඩ් වෙන්න HD නිසා පොඩි ඩිලේ එකක්
        await new Promise(resolve => setTimeout(resolve, TOTAL_LIMIT * 100)); // Adaptive delay based on image count
        try {
          await sendCarouselBatch(client, m, batch2, query, 2);
        } catch (error) {
          console.log("Batch 2 Carousel failed, using fallback:", error.message);
          await sendImagesFallback(client, m, batch2, query, 2);
        }
      }

      await react(m, "✅");
    } catch (error) {
      console.log("Pinterest search error:", error.response?.data || error.message);
      await react(m, "❌");
      await reply(
        client,
        m,
        `❌ Pinterest image HD search කරන්න බැරි වුණා. API එක down වෙලා ඇති හෝ result නැති query එකක් වෙන්න පුළුවන්.`
      );
    } finally {
      try {
        await client.sendPresenceUpdate("paused", m.jid);
      } catch {}
    }
  }
);
