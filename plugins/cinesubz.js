const { Sparky, isPublic } = require("../lib");
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const https = require("https");

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const BASE_URL = "https://cinesubz.co";
const SEARCH_URL = `${BASE_URL}/?s=`;
const MAX_DOWNLOAD_MB = 1000;

// Session storage
const sessions = {};

// Helper: Search movies with better error handling
async function searchMovies(query) {
    try {
        console.log(`[CineSubz] Searching for: ${query}`);
        const { data } = await axios.get(SEARCH_URL + encodeURIComponent(query), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Referer': BASE_URL,
            },
            httpsAgent,
            timeout: 20000
        });
        
        const $ = cheerio.load(data);
        const results = [];

        // Try multiple selectors that CineSubz actually uses
        $("article, .result-item, .movie-item, .film-item, .post").each((i, el) => {
            const titleElem = $(el).find("h2 a, h3 a, .title a, .film-title a");
            const title = titleElem.text().trim() || $(el).find("a[title]").attr("title") || "";
            let link = titleElem.attr("href") || $(el).find("a").first().attr("href") || "";
            
            if (title && link && !link.startsWith("http")) {
                link = BASE_URL + link;
            }
            if (title && link && (link.includes("cinesubz") || link.includes(BASE_URL))) {
                results.push({ title, link });
            }
        });

        // Fallback: look for any link containing /movies/
        if (results.length === 0) {
            $("a[href*='/movies/']").each((i, el) => {
                let href = $(el).attr("href");
                const text = $(el).text().trim();
                if (href && text) {
                    if (href.startsWith("/")) href = BASE_URL + href;
                    if (!results.find(r => r.link === href)) {
                        results.push({ title: text, link: href });
                    }
                }
            });
        }

        // Deduplicate
        const seen = new Set();
        const unique = results.filter(r => {
            if (seen.has(r.link)) return false;
            seen.add(r.link);
            return true;
        }).slice(0, 10);

        console.log(`[CineSubz] Found ${unique.length} results for "${query}"`);
        return unique;
    } catch (err) {
        console.error(`[CineSubz] Search error for "${query}":`, err.message);
        return [];
    }
}

// Helper: Get download options from movie page
async function getDownloadOptions(movieUrl) {
    try {
        const { data } = await axios.get(movieUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': BASE_URL,
            },
            httpsAgent,
            timeout: 20000
        });
        const $ = cheerio.load(data);
        const title = $("h1.entry-title, h1.title, h1").first().text().trim() || "Movie";
        const options = [];

        // Look for direct MP4 links
        $("a[href]").each((i, el) => {
            const href = $(el).attr("href");
            const text = $(el).text().toLowerCase();
            if (!href) return;
            
            // Direct video links
            if (href.includes(".mp4") || href.includes("token=") || href.includes("sume321")) {
                let quality = "Standard";
                if (text.includes("1080p") || href.includes("1080p")) quality = "1080p FHD";
                else if (text.includes("720p") || href.includes("720p")) quality = "720p HD";
                else if (text.includes("480p") || href.includes("480p")) quality = "480p SD";
                options.push({ label: `${quality} [Direct]`, url: href, type: "direct" });
            }
            // Telegram links
            else if (href.includes("t.me") || href.includes("telegram")) {
                options.push({ label: "Telegram Link", url: href, type: "telegram" });
            }
        });

        // If no options, look for download buttons
        if (options.length === 0) {
            $("a.download-btn, a.dl-btn, a[class*='download'], a[href*='download']").each((i, el) => {
                const href = $(el).attr("href");
                if (href && href.startsWith("http")) {
                    options.push({ label: "Download Link", url: href, type: "redirect" });
                }
            });
        }

        console.log(`[CineSubz] Found ${options.length} download options for "${title}"`);
        return { title, options };
    } catch (err) {
        console.error(`[CineSubz] Parse error for ${movieUrl}:`, err.message);
        return { title: "", options: [] };
    }
}

// Helper: Stream download (same as before, but with agent)
async function streamDownloadToFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith("https") ? https : require("http");
        const req = protocol.get(url, { 
            headers: { 'User-Agent': 'Mozilla/5.0' }, 
            agent: httpsAgent 
        }, (res) => {
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
    const sender = m.jid;
    const query = args ? args.join(" ").trim() : "";

    // Handle number replies for quality/movie selection
    const userMsg = m.body ? m.body.trim() : "";
    if (!query && sessions[sender]?.step === "quality" && /^\d+$/.test(userMsg)) {
        return handleQualitySelection(m, client, sender, parseInt(userMsg, 10));
    }
    if (!query && sessions[sender]?.step === "movie" && /^\d+$/.test(userMsg)) {
        return handleMovieSelection(m, client, sender, parseInt(userMsg, 10));
    }

    // New search
    if (!query) {
        return await client.sendMessage(m.jid, {
            text: "🎬 *SADEW-MD | CineSubz Downloader*\n\nUsage: `.cinesubz <movie name>`\nExample: `.cinesubz avengers`"
        }, { quoted: m });
    }

    await client.sendMessage(m.jid, { text: `🔍 Searching for *${query}* on CineSubz...` }, { quoted: m });

    const results = await searchMovies(query);
    if (results.length === 0) {
        return await client.sendMessage(m.jid, {
            text: `❌ No results found for "*${query}*".\n\nPossible reasons:\n- Site may be down or blocking requests\n- Try different spelling\n- Try `.cinesubz batman` as a test`
        }, { quoted: m });
    }

    sessions[sender] = { step: "movie", results, ts: Date.now() };

    let msg = "🚀 *SADEW-MD MOVIE DOWNLOADER*\n━━━━━━━━━━━━━━━━━━━━\n";
    msg += `🔎 Search: *${query}*\n📋 Found *${results.length}* results:\n\n`;
    results.forEach((r, i) => { msg += `${i+1}. ${r.title}\n`; });
    msg += "\n━━━━━━━━━━━━━━━━━━━━\nReply with the *number* of the movie.";

    await client.sendMessage(m.jid, { text: msg }, { quoted: m });
});

// Movie selection handler
async function handleMovieSelection(m, client, sender, num) {
    const sess = sessions[sender];
    if (!sess?.results || num < 1 || num > sess.results.length) {
        return await client.sendMessage(m.jid, { text: "❌ Invalid number. Run `.cinesubz` again." }, { quoted: m });
    }
    const movie = sess.results[num - 1];
    await client.sendMessage(m.jid, { text: `⏳ Loading options for *${movie.title}*...` }, { quoted: m });

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

// Quality selection and download handler
async function handleQualitySelection(m, client, sender, num) {
    const sess = sessions[sender];
    if (!sess?.options || num < 1 || num > sess.options.length) {
        return await client.sendMessage(m.jid, { text: "❌ Invalid number. Run `.cinesubz` again." }, { quoted: m });
    }
    const opt = sess.options[num - 1];
    const movie = sess.movie;
    delete sessions[sender];

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
        fs.unlinkSync(tmpFile);
    } catch (err) {
        console.error("Download error:", err.message);
        let errMsg = err.message.includes("FILE_TOO_LARGE") 
            ? `❌ File too large (${err.message.split(":")[1]}). Download manually:\n${opt.url}`
            : `❌ Download failed: ${err.message}\nTry manually: ${opt.url}`;
        await client.sendMessage(m.jid, { text: errMsg }, { quoted: m });
    }
}

// Session cleanup
setInterval(() => {
    const now = Date.now();
    for (const key in sessions) {
        if (now - sessions[key].ts > 10 * 60 * 1000) delete sessions[key];
    }
}, 10 * 60 * 1000);