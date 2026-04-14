const { Sparky, isPublic } = require("../lib");
const axios = require("axios");
const cheerio = require("cheerio");
const https = require("https");

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const userSearches = new Map();

// -------------------- 1. SEARCH COMMAND --------------------
Sparky({
    name: "cinesubz",
    fromMe: isPublic,
    category: "downloader",
    desc: "Search movies on Cinesubz"
}, async ({ m, client, args }) => {
    if (!args || args.trim() === "") {
        return await client.sendMessage(
            m.jid,
            { text: "❌ Please provide a movie name. Example: .cinesubz Batman" },
            { quoted: m }
        );
    }

    await m.react('⏳');
    try {
        const searchUrl = `https://cinesubz.co/?s=${encodeURIComponent(args)}`;
        const response = await axios.get(searchUrl, { httpsAgent, timeout: 15000 });
        const $ = cheerio.load(response.data);

        let results = [];
        $("article, .result-item, div.post, div.movie").each((i, el) => {
            const title = $(el).find("h2 a, .title a, h3 a").first().text().trim();
            const link = $(el).find("h2 a, .title a, h3 a").first().attr("href");
            if (title && link) results.push({ title, link });
        });

        if (results.length === 0) {
            await m.react('❌');
            return await client.sendMessage(
                m.jid,
                { text: "🔍 No movies found. Try different keywords." },
                { quoted: m }
            );
        }

        userSearches.set(m.jid, results.slice(0, 10));
        let msg = `🎥 *CINESUBZ SEARCH RESULTS*\n\n`;
        results.slice(0, 10).forEach((movie, idx) => {
            msg += `${idx + 1}. ${movie.title.substring(0, 60)}\n`;
        });
        msg += `\n📌 *Reply with*: .cszsel <number>`;

        await client.sendMessage(m.jid, { text: msg }, { quoted: m });
        await m.react('✅');
    } catch (error) {
        await m.react('❌');
        console.error("Search error:", error);
        await client.sendMessage(
            m.jid,
            { text: `⚠️ Error: ${error.message}` },
            { quoted: m }
        );
    }
});

// -------------------- 2. SELECT QUALITY COMMAND --------------------
Sparky({
    name: "cszsel",
    fromMe: isPublic,
    category: "downloader",
    desc: "Select a movie from search results"
}, async ({ m, client, args }) => {
    const movies = userSearches.get(m.jid);
    if (!movies || !args || isNaN(args)) {
        return await client.sendMessage(
            m.jid,
            { text: "❌ Please run .cinesubz first, then use .cszsel <number>" },
            { quoted: m }
        );
    }

    const index = parseInt(args) - 1;
    const movie = movies[index];
    if (!movie) {
        return await client.sendMessage(
            m.jid,
            { text: "❌ Invalid number. Choose between 1 and " + movies.length },
            { quoted: m }
        );
    }

    await m.react('⏳');
    try {
        const res = await axios.get(movie.link, { httpsAgent, timeout: 15000 });
        const $ = cheerio.load(res.data);

        let qualityOptions = [];

        $("a").each((i, el) => {
            const link = $(el).attr("href");
            const text = $(el).text().toLowerCase();
            if (link && (text.includes("direct download") || link.includes("t.me"))) {
                let type = link.includes("t.me") ? "🚀 Telegram" : "📥 Direct";
                qualityOptions.push({
                    name: `${type} - ${text.substring(0, 40)}`,
                    link: link
                });
            }
        });

        if (qualityOptions.length === 0) {
            await m.react('❌');
            return await client.sendMessage(
                m.jid,
                { text: "❌ No download links found for this movie." },
                { quoted: m }
            );
        }

        userSearches.set(m.jid + "_qualities", qualityOptions);
        userSearches.set(m.jid + "_movie_title", movie.title);

        let msg = `🎬 *${movie.title}*\n\n*Select quality:*\n`;
        qualityOptions.forEach((opt, idx) => {
            msg += `${idx + 1}. ${opt.name}\n`;
        });
        msg += `\n📌 *Reply with*: .cszdl <number>`;

        await client.sendMessage(m.jid, { text: msg }, { quoted: m });
        await m.react('✅');
    } catch (error) {
        await m.react('❌');
        console.error("Quality fetch error:", error);
        await client.sendMessage(
            m.jid,
            { text: `⚠️ Error: ${error.message}` },
            { quoted: m }
        );
    }
});

// -------------------- 3. FINAL DOWNLOAD COMMAND --------------------
Sparky({
    name: "cszdl",
    fromMe: isPublic,
    category: "downloader",
    desc: "Download the selected quality"
}, async ({ m, client, args }) => {
    const qualities = userSearches.get(m.jid + "_qualities");
    const title = userSearches.get(m.jid + "_movie_title");

    if (!qualities || !args || isNaN(args)) {
        return await client.sendMessage(
            m.jid,
            { text: "❌ Please select a quality first using .cszsel <number>" },
            { quoted: m }
        );
    }

    const index = parseInt(args) - 1;
    const selected = qualities[index];
    if (!selected) {
        return await client.sendMessage(
            m.jid,
            { text: "❌ Invalid selection. Choose a number from the list." },
            { quoted: m }
        );
    }

    await m.react('⬇️');

    try {
        // Case 1: Telegram link
        if (selected.link.includes("t.me")) {
            await client.sendMessage(
                m.jid,
                {
                    text: `🎬 *${title}*\n\n🚀 *Telegram Link*\nThis movie is hosted on Telegram. Open the link to download:\n\n${selected.link}\n\n*Note:* You may need the Telegram app.`
                },
                { quoted: m }
            );
            await m.react('✅');
            return;
        }

        // Case 2: Direct download link
        // Follow redirects to get final URL
        const followRes = await axios.get(selected.link, {
            httpsAgent,
            maxRedirects: 5,
            timeout: 15000,
            validateStatus: status => status >= 200 && status < 400
        });
        let finalUrl = followRes.request.res.responseUrl || selected.link;

        // Check file size without downloading (HEAD request)
        let fileSize = 0;
        try {
            const headRes = await axios.head(finalUrl, {
                httpsAgent,
                timeout: 10000,
                validateStatus: status => status >= 200 && status < 400
            });
            fileSize = parseInt(headRes.headers['content-length'] || 0);
        } catch (headErr) {
            console.warn("HEAD request failed, proceeding without size check");
        }

        const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
        // 🔥 Change the limit here if needed (default 50MB safe for Render)
        const isLarge = fileSize > 50 * 1024 * 1024; // change 50 to 100 for 100MB limit

        if (isLarge && fileSize > 0) {
            await client.sendMessage(
                m.jid,
                {
                    text: `⚠️ *File too large for WhatsApp*\n\n🎬 *${title}*\n📦 Size: ${sizeMB} MB\n\n🔗 *Direct Download Link:*\n${finalUrl}\n\nPlease download using a browser or download manager.`
                },
                { quoted: m }
            );
            await m.react('ℹ️');
            return;
        }

        // File size is acceptable, download and send
        await client.sendMessage(
            m.jid,
            { text: `📥 Downloading *${title}* (${sizeMB || "unknown"} MB)... Please wait.` },
            { quoted: m }
        );

        const fileRes = await axios.get(finalUrl, {
            httpsAgent,
            responseType: "arraybuffer",
            timeout: 60000
        });
        const fileBuffer = Buffer.from(fileRes.data);

        // Send as document (safe for all file types)
        await client.sendMessage(
            m.jid,
            {
                document: fileBuffer,
                mimetype: "video/mp4",
                fileName: `${title.replace(/[^a-z0-9]/gi, '_')}.mp4`,
                caption: `✅ *${title}*\n📦 Size: ${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB\n\n*Downloaded by X-BOT-MD*`
            },
            { quoted: m }
        );

        await m.react('✅');

        // Clean up stored data
        userSearches.delete(m.jid + "_qualities");
        userSearches.delete(m.jid + "_movie_title");

    } catch (error) {
        await m.react('❌');
        console.error("Download error:", error);
        let errorMsg = error.message.includes("timeout")
            ? "⏰ Download timeout. The server is slow. Try again later or use the direct link."
            : `❌ Download failed: ${error.message}`;
        await client.sendMessage(
            m.jid,
            { text: `${errorMsg}\n\nYou can try downloading manually from:\n${selected.link}` },
            { quoted: m }
        );
    }
});
