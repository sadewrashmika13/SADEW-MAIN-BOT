const { Sparky, isPublic } = require("../lib");
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const https = require("https");

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const BASE_URL = "https://cinesubz.co";
const SEARCH_URL = `${BASE_URL}/?s=`;
const MAX_DOWNLOAD_MB = 1000; // Render free tier safe limit

// Session storage (in-memory)
const sessions = {};

// Helper: Search movies
async function searchMovies(query) {
    try {
        const { data } = await axios.get(SEARCH_URL + encodeURIComponent(query), {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            httpsAgent,
            timeout: 15000
        });
        const $ = cheerio.load(data);
        const results = [];

        $("article, .result-item, .ml-item, .item").each((i, el) => {
            const title = $(el).find("h2, .tit, .title, .film-name").first().text().trim() ||
                          $(el).find("a[title]").first().attr("title") || "";
            const link = $(el).find("a").first().attr("href") || "";
            if (title && link && link.includes("cinesubz")) {
                results.push({ title, link });
            }
        });

        if (results.length === 0) {
            $("a[href*='/movies/']").each((i, el) => {
                const href = $(el).attr("href") || "";
                const text = $(el).text().trim();
                if (href && text && !results.find(r => r.link === href)) {
                    results.push({ title: text, link: href });
                }
            });
        }

        // Deduplicate
        const seen = new Set();
        return results.filter(r => {
            if (seen.has(r.link)) return false;
            seen.add(r.link);
            return true;
        }).slice(0, 10);
    } catch (err) {
        console.error("Search error:", err.message);
        return [];
    }
}

// Helper: Get download options from movie page
async function getDownloadOptions(movieUrl) {
    try {
        const { data } = await axios.get(movieUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            httpsAgent,
            timeout: 20000
        });
        const $ = cheerio.load(data);
        const title = $("h1, h2").first().text().trim() || "Movie";
        const options = [];

        // Look for direct MP4 links
        $("a[href]").each((i, el) => {
            const href = $(el).attr("href") || "";
            const text = $(el).text().trim().toLowerCase();
            if (href.includes(".mp4") || href.includes("token=") || href.includes("sume321")) {
                let quality = "Standard";
                if (text.includes("1080p") || href.includes("1080p")) quality = "1080p FHD";
                else if (text.includes("720p") || href.includes("720p")) quality = "720p HD";
                else if (text.includes("480p") || href.includes("480p")) quality = "480p SD";
                options.push({ label: `${quality} [Direct]`, url: href, type: "direct" });
            }
            else if (href.includes("t.me") || href.includes("telegram")) {
                let quality = "Telegram";
                options.push({ label: quality, url: href, type: "telegram" });
            }
        });

        // If no options, look for buttons with download class
        if (options.length === 0) {
            $("a.dwn-btn, a.dl-btn, a[class*='download']").each((i, el) => {
                const href = $(el).attr("href") || "";
                if (href && href.startsWith("http")) {
                    options.push({ label: "Download Link", url: href, type: "redirect" });
                }
            });
        }

        return { title, options };
    } catch (err) {
        console.error("Parse error:", err.message);
        return { title: "", options: [] };
    }
}

// Helper: Stream download file (memory efficient)
async function streamDownloadToFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith("https") ? https : require("http");
        const req = protocol.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, agent: httpsAgent }, (res) => {
            if (res.statusCode === 302 || res.statusCode === 301) {
                return streamDownloadToFile(res.headers.location, destPath).then(resolve).catch(reject);
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
            const file = fs.createWriteStream(destPath);
            res.pipe(file);
            file.on("finish", () => resolve());
            file.on("error", reject);
        });
        req.on("error", reject);
        req.setTimeout(120000, () => {
            req.destroy();
            reject(new Error("TIMEOUT"));
        });
    });
}

// -------------------- MAIN COMMAND --------------------
Sparky({
    name: "cinesubz",
    fromMe: isPublic,
    category: "downloader",
    desc: "Search and download movies from CineSubz"
}, async ({ m, client, args }) => {
    const sender = m.jid; // unique chat ID (user or group)
    const query = args ? args.join(" ").trim() : "";

    // Step 3: User replied with a number for quality selection
    if (!query && sessions[sender]?.step === "quality" && m.body && /^\d+$/.test(m.body.trim())) {
        return handleQualitySelection(m, client, sender, parseInt(m.body.trim(), 10));
    }

    // Step 2: User replied with a number for movie selection
    if (!query && sessions[sender]?.step === "movie" && m.body && /^\d+$/.test(m.body.trim())) {
        return handleMovieSelection(m, client, sender, parseInt(m.body.trim(), 10));
    }

    // Step 1: New search
    if (!query) {
        return await client.sendMessage(m.jid, {
            text: "🎬 *SADEW-MD | CineSubz Downloader*\n\nUsage: `.cinesubz <movie name>`\nExample: `.cinesubz avengers`"
        }, { quoted: m });
    }

    await client.sendMessage(m.jid, { text: `🔍 Searching CineSubz for: *${query}*...` }, { quoted: m });

    const results = await searchMovies(query);
    if (results.length === 0) {
        return await client.sendMessage(m.jid, {
            text: `❌ No results found for "*${query}*". Try different keywords.`
        }, { quoted: m });
    }

    // Store search results
    sessions[sender] = { step: "movie", results, ts: Date.now() };

    let msg = "🚀 *SADEW-MD MOVIE DOWNLOADER*\n━━━━━━━━━━━━━━━━━━━━\n";
    msg += `🔎 Search: *${query}*\n📋 Found *${results.length}* results:\n\n`;
    results.forEach((r, i) => { msg += `${i+1}. ${r.title}\n`; });
    msg += "\n━━━━━━━━━━━━━━━━━━━━\nReply with the *number* of the movie.";

    await client.sendMessage(m.jid, { text: msg }, { quoted: m });
});

// Handle movie selection
async function handleMovieSelection(m, client, sender, num) {
    const sess = sessions[sender];
    if (!sess?.results || num < 1 || num > sess.results.length) {
        return await client.sendMessage(m.jid, { text: "❌ Invalid number. Run `.cinesubz` again." }, { quoted: m });
    }

    const movie = sess.results[num - 1];
    await client.sendMessage(m.jid, { text: `⏳ Loading download options for *${movie.title}*...` }, { quoted: m });

    const { title, options } = await getDownloadOptions(movie.link);
    if (options.length === 0) {
        delete sessions[sender];
        return await client.sendMessage(m.jid, {
            text: `❌ No download links found for *${title || movie.title}*.\nTry manually: ${movie.link}`
        }, { quoted: m });
    }

    sessions[sender] = { step: "quality", movie: { title: title || movie.title, link: movie.link }, options, ts: Date.now() };

    let msg = "🚀 *SADEW-MD MOVIE DOWNLOADER*\n━━━━━━━━━━━━━━━━━━━━\n";
    msg += `🎬 *${title || movie.title}*\n\n📥 *Download Options:*\n\n`;
    options.forEach((opt, i) => { msg += `${i+1}. ${opt.label}\n`; });
    msg += "\n━━━━━━━━━━━━━━━━━━━━\nReply with the *number* of the quality.";

    await client.sendMessage(m.jid, { text: msg }, { quoted: m });
}

// Handle quality selection and download
async function handleQualitySelection(m, client, sender, num) {
    const sess = sessions[sender];
    if (!sess?.options || num < 1 || num > sess.options.length) {
        return await client.sendMessage(m.jid, { text: "❌ Invalid number. Run `.cinesubz` again." }, { quoted: m });
    }

    const opt = sess.options[num - 1];
    const movie = sess.movie;
    delete sessions[sender];

    // Telegram link: just send the link
    if (opt.type === "telegram" || opt.url.includes("t.me")) {
        return await client.sendMessage(m.jid, {
            text: `🚀 *SADEW-MD MOVIE DOWNLOADER*\n━━━━━━━━━━━━━━━━━━━━\n🎬 *${movie.title}*\n📥 ${opt.label}\n\n📲 Telegram Link:\n${opt.url}\n\n━━━━━━━━━━━━━━━━━━━━\n_Powered by SADEW-MD_`
        }, { quoted: m });
    }

    // Direct download
    const tmpDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const safeTitle = movie.title.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 40);
    const tmpFile = path.join(tmpDir, `${safeTitle}_${Date.now()}.mp4`);

    await client.sendMessage(m.jid, { text: `⬇️ Downloading *${movie.title}* (${opt.label})... Please wait.` }, { quoted: m });

    try {
        await streamDownloadToFile(opt.url, tmpFile);
        const fileBuffer = fs.readFileSync(tmpFile);
        const fileSizeMB = (fileBuffer.length / (1024 * 1024)).toFixed(1);

        const caption = `🚀 *SADEW-MD MOVIE DOWNLOADER*\n━━━━━━━━━━━━━━━━━━━━\n🎬 *${movie.title}*\n📥 ${opt.label}\n📦 Size: ${fileSizeMB} MB\n━━━━━━━━━━━━━━━━━━━━\n_Powered by SADEW-MD_`;

        await client.sendMessage(m.jid, {
            document: fileBuffer,
            mimetype: "video/mp4",
            fileName: `${safeTitle}.mp4`,
            caption: caption
        }, { quoted: m });

        // Cleanup
        fs.unlinkSync(tmpFile);
    } catch (err) {
        console.error("Download error:", err.message);
        let errMsg = err.message.includes("FILE_TOO_LARGE") 
            ? `❌ File too large (${err.message.split(":")[1]}). Download manually:\n${opt.url}`
            : `❌ Download failed: ${err.message}\nTry manually: ${opt.url}`;
        await client.sendMessage(m.jid, { text: errMsg }, { quoted: m });
    }
}

// Clean old sessions every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const key in sessions) {
        if (now - sessions[key].ts > 10 * 60 * 1000) delete sessions[key];
    }
}, 10 * 60 * 1000);
