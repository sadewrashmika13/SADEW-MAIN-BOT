// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  🎬 SADEW-MD | CineSubz Movie Downloader Plugin
//  Version: 3.0 (Direct CDN + RAM Optimized)
//  Engine: Sparky Engine (X-BOT-MD)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const { Sparky, isPublic } = require("../lib");
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const https = require("https");

// ─────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────
const BASE_URL = "https://cinesubz.co";
const SEARCH_URL = `${BASE_URL}/?s=`;
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Referer": BASE_URL,
};

// RAM limit for Render Free Tier (512 MB) — keep downloads under 80 MB
const MAX_DOWNLOAD_MB = 80;

// ─────────────────────────────────────────────────
//  HELPER: Search movies on CineSubz
// ─────────────────────────────────────────────────
async function searchMovies(query) {
  try {
    const { data } = await axios.get(
      SEARCH_URL + encodeURIComponent(query),
      { headers: HEADERS, timeout: 15000 }
    );
    const $ = cheerio.load(data);
    const results = [];

    // CineSubz uses .movies-list .ml-item or article.item or .result-item
    $("article, .result-item, .ml-item, .item").each((i, el) => {
      const title =
        $(el).find("h2, .tit, .title, .film-name").first().text().trim() ||
        $(el).find("a[title]").first().attr("title") || "";
      const link =
        $(el).find("a").first().attr("href") || "";
      const thumb =
        $(el).find("img").first().attr("src") ||
        $(el).find("img").first().attr("data-src") || "";

      if (title && link && link.includes("cinesubz")) {
        results.push({ title, link, thumb });
      }
    });

    // Fallback: parse search results from <h2> or <a> tags with movie URL pattern
    if (results.length === 0) {
      $("a[href*='/movies/']").each((i, el) => {
        const href = $(el).attr("href") || "";
        const text = $(el).text().trim();
        if (href && text && !results.find((r) => r.link === href)) {
          results.push({ title: text, link: href, thumb: "" });
        }
      });
    }

    // Deduplicate
    const seen = new Set();
    return results.filter((r) => {
      if (seen.has(r.link)) return false;
      seen.add(r.link);
      return true;
    }).slice(0, 8);
  } catch (err) {
    console.error("[CineSubz] Search error:", err.message);
    return [];
  }
}

// ─────────────────────────────────────────────────
//  HELPER: Get download options from movie page
// ─────────────────────────────────────────────────
async function getDownloadOptions(movieUrl) {
  try {
    const { data } = await axios.get(movieUrl, {
      headers: HEADERS,
      timeout: 20000,
    });
    const $ = cheerio.load(data);

    const title = $("h1, h2").first().text().trim().replace(/\s+/g, " ");
    const thumb =
      $("img.film-poster, .poster img, .film-detail img").first().attr("src") ||
      $("img").filter((_, el) => {
        const s = $(el).attr("src") || "";
        return s.includes("wp-content/uploads");
      }).first().attr("src") || "";

    const options = [];

    // ── NEW SYSTEM: Direct CDN links (bot6.sume321.online pattern)
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text().trim();

      // Direct MP4 CDN links with token
      if (
        (href.includes(".mp4") || href.includes("token=")) &&
        (href.includes("sume321") || href.includes("bot") || href.startsWith("http"))
      ) {
        const quality = detectQuality(href + " " + text);
        if (!options.find((o) => o.url === href)) {
          options.push({ label: `${quality} [Direct CDN]`, url: href, type: "direct" });
        }
      }

      // Telegram links
      if (href.includes("t.me") || href.includes("telegram")) {
        const quality = detectQuality(href + " " + text);
        if (!options.find((o) => o.url === href)) {
          options.push({ label: `${quality} [Telegram]`, url: href, type: "telegram" });
        }
      }
    });

    // ── BUTTON-BASED download links (.dwn-btn, .dl-btn, download buttons)
    $("a.dwn-btn, a.dl-btn, a[class*='download'], a[class*='btn'][href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text().trim();
      const quality = detectQuality(href + " " + text);

      if (href && !options.find((o) => o.url === href)) {
        const type = href.includes("t.me") ? "telegram"
          : href.includes(".mp4") ? "direct"
          : "redirect";
        options.push({ label: `${quality} [${text || "Download"}]`, url: href, type });
      }
    });

    // ── Fallback: scan all links for quality keywords
    if (options.length === 0) {
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href") || "";
        const text = $(el).text().trim();
        if (
          /480p|720p|1080p/i.test(text + href) &&
          href.startsWith("http") &&
          !href.includes("cinesubz")
        ) {
          const quality = detectQuality(href + " " + text);
          if (!options.find((o) => o.url === href)) {
            options.push({ label: `${quality}`, url: href, type: "redirect" });
          }
        }
      });
    }

    return { title, thumb, options };
  } catch (err) {
    console.error("[CineSubz] Page parse error:", err.message);
    return { title: "", thumb: "", options: [] };
  }
}

// ─────────────────────────────────────────────────
//  HELPER: Detect video quality from string
// ─────────────────────────────────────────────────
function detectQuality(str) {
  if (/1080p/i.test(str)) return "🎬 1080p FHD";
  if (/720p/i.test(str)) return "📺 720p HD";
  if (/480p/i.test(str)) return "📱 480p SD";
  if (/4k|2160p/i.test(str)) return "✨ 4K";
  return "🎞️ Standard";
}

// ─────────────────────────────────────────────────
//  HELPER: Stream-download direct CDN MP4
//  RAM-safe: streams to temp file, sends, deletes
// ─────────────────────────────────────────────────
async function streamDownloadToFile(url, destPath, progressCb) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const proto = urlObj.protocol === "https:" ? https : require("http");

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: {
        ...HEADERS,
        Referer: BASE_URL,
      },
    };

    const req = proto.get(options, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        return streamDownloadToFile(res.headers.location, destPath, progressCb)
          .then(resolve).catch(reject);
      }

      if (res.statusCode === 403) {
        return reject(new Error("TOKEN_EXPIRED"));
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }

      const totalBytes = parseInt(res.headers["content-length"] || "0", 10);
      const totalMB = totalBytes / (1024 * 1024);

      if (totalMB > MAX_DOWNLOAD_MB) {
        res.destroy();
        return reject(new Error(`FILE_TOO_LARGE:${totalMB.toFixed(0)}MB`));
      }

      let downloaded = 0;
      const file = fs.createWriteStream(destPath);

      res.on("data", (chunk) => {
        downloaded += chunk.length;
        if (progressCb) progressCb(downloaded, totalBytes);
      });

      res.pipe(file);

      file.on("finish", () => file.close(resolve));
      file.on("error", (e) => {
        fs.unlink(destPath, () => {});
        reject(e);
      });
    });

    req.on("error", reject);
    req.setTimeout(120000, () => {
      req.destroy();
      reject(new Error("TIMEOUT"));
    });
  });
}

// ─────────────────────────────────────────────────
//  HELPER: Format bytes
// ─────────────────────────────────────────────────
function fmtBytes(bytes) {
  if (!bytes) return "?? MB";
  const mb = bytes / (1024 * 1024);
  return mb >= 1000 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
}

// ─────────────────────────────────────────────────
//  SESSION STORE  (in-memory, no RAM overhead)
// ─────────────────────────────────────────────────
const sessions = {};

// ─────────────────────────────────────────────────
//  COMMAND: .cinesubz <movie name>
// ─────────────────────────────────────────────────
Sparky(
  {
    name: "cinesubz",
    fromMe: isPublic,
    category: "downloader",
    desc: "CineSubz වෙබ් අඩවියෙන් සිංහල උපසිරැසි සහිත චිත්‍රපට සොයා download කරන්න.",
  },
  async ({ m, client, args }) => {
    const sender = m.sender;
    const query = args.join(" ").trim();

    // ── STEP 3: Quality selection (user sent a number after seeing quality list)
    if (
      !query &&
      sessions[sender]?.step === "quality" &&
      /^\d+$/.test(m.text?.trim())
    ) {
      return handleQualitySelection(m, client, sender, parseInt(m.text.trim(), 10));
    }

    // ── STEP 2: Movie selection (user sent a number after search results)
    if (
      !query &&
      sessions[sender]?.step === "movie" &&
      /^\d+$/.test(m.text?.trim())
    ) {
      return handleMovieSelection(m, client, sender, parseInt(m.text.trim(), 10));
    }

    // ── STEP 1: New search
    if (!query) {
      return client.sendMessage(
        m.from,
        {
          text:
            "🎬 *SADEW-MD | CineSubz Downloader*\n\n" +
            "භාවිතය: `.cinesubz <movie name>`\n" +
            "උදා: `.cinesubz avengers endgame`",
        },
        { quoted: m }
      );
    }

    await client.sendMessage(
      m.from,
      { text: `🔍 *Searching CineSubz...*\n\`${query}\`` },
      { quoted: m }
    );

    const results = await searchMovies(query);

    if (!results.length) {
      return client.sendMessage(
        m.from,
        {
          text:
            "❌ *Movie Not Found!*\n\n" +
            `"*${query}*" සඳහා CineSubz හි ප්‍රතිඵල හමු නොවීය.\n\n` +
            "• Title spelling check කරන්න\n" +
            "• English name try කරන්න\n" +
            "• Less keywords use කරන්න",
        },
        { quoted: m }
      );
    }

    // Store search results in session
    sessions[sender] = { step: "movie", results, ts: Date.now() };

    // Build list
    let msg =
      "🚀 *SADEW-MD MOVIE DOWNLOADER*\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      `🔎 Search: *${query}*\n` +
      `📋 Found *${results.length}* result(s):\n\n`;

    results.forEach((r, i) => {
      msg += `*${i + 1}.* ${r.title}\n`;
    });

    msg +=
      "\n━━━━━━━━━━━━━━━━━━━━\n" +
      "ඔබට අවශ්‍ය movie එකේ *අංකය* reply කරන්න.";

    return client.sendMessage(m.from, { text: msg }, { quoted: m });
  }
);

// ─────────────────────────────────────────────────
//  HANDLER: Movie number selected
// ─────────────────────────────────────────────────
async function handleMovieSelection(m, client, sender, num) {
  const sess = sessions[sender];
  if (!sess?.results || num < 1 || num > sess.results.length) {
    return client.sendMessage(
      m.from,
      { text: "⚠️ Invalid number. .cinesubz සමඟ නැවත search කරන්න." },
      { quoted: m }
    );
  }

  const movie = sess.results[num - 1];
  await client.sendMessage(
    m.from,
    { text: `⏳ *Loading download options...*\n📽️ ${movie.title}` },
    { quoted: m }
  );

  const { title, thumb, options } = await getDownloadOptions(movie.link);

  if (!options.length) {
    delete sessions[sender];
    return client.sendMessage(
      m.from,
      {
        text:
          `❌ *Download Links Not Found*\n\n` +
          `*${title || movie.title}*\n\n` +
          "CineSubz page එකේ download links හමු නොවීය.\n" +
          `🌐 Manually check: ${movie.link}`,
      },
      { quoted: m }
    );
  }

  // Save options in session
  sessions[sender] = {
    step: "quality",
    movie: { title: title || movie.title, thumb, link: movie.link },
    options,
    ts: Date.now(),
  };

  let msg =
    "🚀 *SADEW-MD MOVIE DOWNLOADER*\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    `🎬 *${title || movie.title}*\n\n` +
    "📥 *Available Download Options:*\n\n";

  options.forEach((opt, i) => {
    msg += `*${i + 1}.* ${opt.label}\n`;
  });

  msg +=
    "\n━━━━━━━━━━━━━━━━━━━━\n" +
    "ඔබට අවශ්‍ය quality *අංකය* reply කරන්න.";

  return client.sendMessage(m.from, { text: msg }, { quoted: m });
}

// ─────────────────────────────────────────────────
//  HANDLER: Quality number selected → Download
// ─────────────────────────────────────────────────
async function handleQualitySelection(m, client, sender, num) {
  const sess = sessions[sender];
  if (!sess?.options || num < 1 || num > sess.options.length) {
    return client.sendMessage(
      m.from,
      { text: "⚠️ Invalid number. නැවත .cinesubz සමඟ search කරන්න." },
      { quoted: m }
    );
  }

  const opt = sess.options[num - 1];
  const movie = sess.movie;
  delete sessions[sender]; // clear session

  // ── Telegram link: just forward it
  if (opt.type === "telegram" || opt.url.includes("t.me")) {
    return client.sendMessage(
      m.from,
      {
        text:
          "🚀 *SADEW-MD MOVIE DOWNLOADER*\n" +
          "━━━━━━━━━━━━━━━━━━━━\n" +
          `🎬 *${movie.title}*\n` +
          `📥 Quality: ${opt.label}\n\n` +
          `📲 Telegram Download Link:\n${opt.url}\n\n` +
          "━━━━━━━━━━━━━━━━━━━━\n" +
          "_Powered by SADEW-MD 🤖_",
      },
      { quoted: m }
    );
  }

  // ── Direct CDN or redirect: try to stream download
  if (opt.type === "direct" || opt.url.includes(".mp4") || opt.url.includes("token=")) {
    return handleDirectDownload(m, client, sender, movie, opt);
  }

  // ── Other redirect links: resolve and try
  return handleDirectDownload(m, client, sender, movie, opt);
}

// ─────────────────────────────────────────────────
//  HANDLER: Stream download & send to WhatsApp
// ─────────────────────────────────────────────────
async function handleDirectDownload(m, client, sender, movie, opt) {
  const tmpDir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const safeTitle = movie.title
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 40);
  const tmpFile = path.join(tmpDir, `${safeTitle}_${Date.now()}.mp4`);

  let statusMsg;
  try {
    statusMsg = await client.sendMessage(
      m.from,
      {
        text:
          "⬇️ *Downloading...*\n\n" +
          `🎬 *${movie.title}*\n` +
          `📥 ${opt.label}\n\n` +
          "⏳ Please wait... (Render free tier - may take a while)",
      },
      { quoted: m }
    );
  } catch (_) {}

  try {
    let lastPct = 0;
    await streamDownloadToFile(opt.url, tmpFile, (dl, total) => {
      if (total > 0) {
        const pct = Math.floor((dl / total) * 100);
        if (pct - lastPct >= 25) {
          lastPct = pct;
          client.sendMessage(m.from, {
            text: `⬇️ Downloading... *${pct}%* (${fmtBytes(dl)} / ${fmtBytes(total)})`,
          }).catch(() => {});
        }
      }
    });

    const stat = fs.statSync(tmpFile);
    const fileMB = stat.size / (1024 * 1024);

    const caption =
      "🚀 *SADEW-MD MOVIE DOWNLOADER*\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      `🎬 *${movie.title}*\n` +
      `📥 Quality: ${opt.label}\n` +
      `📦 Size: ${fileMB.toFixed(1)} MB\n` +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "_Powered by SADEW-MD 🤖_";

    await client.sendMessage(m.from, {
      video: fs.readFileSync(tmpFile),
      caption,
      mimetype: "video/mp4",
    });

  } catch (err) {
    const errMsg = err.message || "";

    if (errMsg === "TOKEN_EXPIRED") {
      await client.sendMessage(
        m.from,
        {
          text:
            "⚠️ *Download Token Expired!*\n\n" +
            "CDN link expired වී ඇත.\n" +
            "✅ `.cinesubz` command නැවත use කර re-search කරන්න.\n\n" +
            `🔗 Manual: ${movie.link}`,
        },
        { quoted: m }
      );
    } else if (errMsg.startsWith("FILE_TOO_LARGE")) {
      const sz = errMsg.split(":")[1];
      await client.sendMessage(
        m.from,
        {
          text:
            `❌ *File Too Large (${sz})*\n\n` +
            `Render free tier RAM limit exceed වේ (max ${MAX_DOWNLOAD_MB} MB).\n\n` +
            "⬇️ Direct Link:\n" +
            `${opt.url}\n\n` +
            "Browser / IDM / ADM වලින් download කරගන්න.",
        },
        { quoted: m }
      );
    } else {
      await client.sendMessage(
        m.from,
        {
          text:
            `❌ *Download Failed*\n\n` +
            `Error: ${errMsg}\n\n` +
            "⬇️ Try manually:\n" +
            `${opt.url}`,
        },
        { quoted: m }
      );
    }
  } finally {
    // Always clean up temp file to free RAM/disk
    if (fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
    }
  }
}

// ─────────────────────────────────────────────────
//  SESSION CLEANUP: Clear old sessions every 10 min
// ─────────────────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const key in sessions) {
    if (now - sessions[key].ts > 10 * 60 * 1000) {
      delete sessions[key];
    }
  }
}, 10 * 60 * 1000);
