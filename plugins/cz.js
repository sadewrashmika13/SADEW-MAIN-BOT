// commands/cinesubz.js
const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

// Global context for number reply
if (!global.cinesubzContexts) global.cinesubzContexts = {};

const BOT_NAME = "★👑𝙎𝘼𝘿𝙀𝙒-𝙓-𝙈𝘿🔥 ★";
const POWERED_BY = "Powered by sadew rashmika";

// APIs
const OLD_API_SEARCH = "https://cinesubz-api-cnw.vercel.app/api/search";
const OLD_API_EXTRACT = "https://cinesubz-api-cnw.vercel.app/api/extract";
const DANUZ_API_DOWNLOAD = "https://cz-dnuz.vercel.app/download";

function getMetaQuote() {
    return {
        key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "SADEW_X_MD" },
        message: { contactMessage: { displayName: BOT_NAME, vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${BOT_NAME}\nORG:${POWERED_BY}\nTEL;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
    };
}

async function sendMediaOrText(client, jid, text, imageUrl, quoted) {
    if (imageUrl) {
        try {
            return await client.sendMessage(jid, { image: { url: imageUrl }, caption: text }, { quoted });
        } catch (e) {}
    }
    return await client.sendMessage(jid, { text: text }, { quoted });
}

function getQuery(args) {
    if (!args) return "";
    if (Array.isArray(args)) return args.join(" ").trim();
    if (typeof args === "string") return args.trim();
    if (typeof args === "object") return Object.values(args).join(" ").trim();
    return "";
}

// ==========================================
// 1. MAIN SEARCH COMMAND (.cz)
// ==========================================
Sparky({
    name: "cinesubz",
    alias: ["cz", "movie2"],
    category: "download",
    fromMe: isPublic,
    desc: "🎬 Cinesubz වෙබ් අඩවියෙන් චිත්‍රපට සොයන්න."
}, async ({ client, m, args }) => {
    try {
        const query = getQuery(args);
        if (!query) {
            return await m.reply(`🎬 *${BOT_NAME} - CINESUBZ*\n\n*භාවිතය:* ${m.prefix}cz <movie_name>\n*උදාහරණ:* ${m.prefix}cz batman\n\n_${POWERED_BY}_`);
        }

        await m.react("🔍");
        await m.reply(`🔎 Cinesubz හි සොයමින් "${query}"...`);

        const searchUrl = `${OLD_API_SEARCH}?q=${encodeURIComponent(query)}`;
        const { data } = await axios.get(searchUrl, { timeout: 15000 });

        if (!data.status || !data.data || data.data.length === 0) {
            await m.react("❌");
            return await m.reply(`❌ සමාවෙන්න, "${query}" සඳහා කිසිදු චිත්‍රපටයක් හමුනොවිය.`);
        }

        const results = data.data.slice(0, 10);
        let listMsg = `🎬 *${BOT_NAME} - SEARCH RESULTS*\n\n🔍 *සෙව්වේ:* ${query}\n📊 ප්‍රතිඵල ගණන: ${results.length}\n\n`;
        
        results.forEach((movie, i) => {
            listMsg += `*${i + 1}.* ${movie.title} (${movie.year || 'N/A'})\n`;
        });
        
        listMsg += `\n_📌 චිත්‍රපටය තෝරා ගැනීමට මෙම පණිවිඩයට අදාළ අංකය (1 - ${results.length}) Reply කරන්න._`;

        const firstMovieImg = results[0].image || results[0].img || results[0].thumbnail;
        let sentMsg = await sendMediaOrText(client, m.jid, listMsg, firstMovieImg, m);

        global.cinesubzContexts[m.sender] = {
            step: "movie_select",
            searchMsgId: sentMsg.key.id,
            results: results
        };
        
        setTimeout(() => { if (global.cinesubzContexts[m.sender]) delete global.cinesubzContexts[m.sender]; }, 5 * 60 * 1000);
        await m.react("✅");

    } catch (err) {
        console.error("Search Error:", err);
        await m.react("❌");
        await m.reply(`❌ සෙවීම අසාර්ථකයි!`);
    }
});

// ==========================================
// 2. DYNAMIC REPLY LISTENER
// ==========================================
Sparky({
    on: "text",
    fromMe: isPublic,
    dontAddCommandList: true
}, async ({ client, m }) => {
    let context = global.cinesubzContexts[m.sender];
    if (!context || !m.quoted) return;

    let rawText = m.text || m.body || "";
    if (!rawText) return; 

    let number = parseInt(rawText.trim());
    if (isNaN(number)) return;

    // Step 1: Movie selection
    if (context.step === "movie_select" && m.quoted.key.id === context.searchMsgId) {
        if (number >= 1 && number <= context.results.length) {
            const selectedMovie = context.results[number - 1];
            await fetchDownloadLinks(client, m, selectedMovie, context);
        } else {
            m.reply(`❌ කරුණාකර 1 සිට ${context.results.length} දක්වා වූ නිවැරදි අංකයක් ලබා දෙන්න.`);
        }
    }
    
    // Step 2: Quality selection
    else if (context.step === "quality_select" && m.quoted.key.id === context.qualityMsgId) {
        if (number >= 1 && number <= context.qualityOptions.length) {
            const selected = context.qualityOptions[number - 1];
            const downloadUrl = selected.url;
            const quality = selected.quality;
            await downloadAndSendMovie(client, m, downloadUrl, quality, context.movieTitle);
            delete global.cinesubzContexts[m.sender];
        } else {
            m.reply(`❌ කරුණාකර 1 සිට ${context.qualityOptions.length} දක්වා වූ නිවැරදි අංකයක් ලබා දෙන්න.`);
        }
    }
});

// ==========================================
// 3. FETCH DOWNLOAD LINKS (DUAL API)
// ==========================================
async function fetchDownloadLinks(client, m, selectedMovie, context) {
    const title = selectedMovie.title;
    const movieUrl = selectedMovie.url;
    const movieImg = selectedMovie.image || selectedMovie.img || selectedMovie.thumbnail;

    await m.react("⏳");
    await m.reply(`📥 බාගැනීම් විකල්ප සොයමින්: *${title}*...`);

    let qualityOptions = [];
    let fallbackUrl = null;

    // ---- TRY 1: OLD API (extract) ----
    try {
        const movieId = selectedMovie.id;
        const extractUrl = `${OLD_API_EXTRACT}?id=${movieId}&type=mv`;
        const oldRes = await axios.get(extractUrl, { timeout: 15000 });

        if (oldRes.data.status && oldRes.data.data && oldRes.data.data.length > 0) {
            for (const item of oldRes.data.data) {
                if (item.link && item.link.startsWith('http')) {
                    let link = item.link;
                    // Clean iframe
                    if (link.includes('<iframe')) {
                        const match = link.match(/src=["']([^"']+)["']/);
                        if (match) link = match[1];
                    }
                    if (link.startsWith('//')) link = 'https:' + link;
                    
                    // Extract quality from filename or link
                    let quality = "HD";
                    const qMatch = link.match(/(480p|720p|1080p|4K)/i);
                    if (qMatch) quality = qMatch[1];
                    
                    qualityOptions.push({ url: link, quality: quality });
                }
            }
        }
    } catch (err) {
        console.log("Old API extract failed:", err.message);
    }

    // ---- TRY 2: DANUZ API (new) ----
    try {
        const danuzUrl = `${DANUZ_API_DOWNLOAD}?url=${encodeURIComponent(movieUrl)}`;
        const danuzRes = await axios.get(danuzUrl, { timeout: 20000 });
        const danuzData = danuzRes.data;

        if (danuzData.success && danuzData.result && danuzData.result.downloadUrls) {
            for (const entry of danuzData.result.downloadUrls) {
                if (entry.url && !entry.url.includes('t.me')) {
                    let quality = "HD";
                    const qMatch = entry.url.match(/(480p|720p|1080p|4K)/i);
                    if (qMatch) quality = qMatch[1];
                    // Avoid duplicates
                    if (!qualityOptions.some(o => o.url === entry.url)) {
                        qualityOptions.push({ url: entry.url, quality: quality });
                    }
                }
            }
        }
    } catch (err) {
        console.log("DanuZz API failed:", err.message);
    }

    // ---- FALLBACK: If no links found, use the movie URL itself ----
    if (qualityOptions.length === 0 && movieUrl) {
        qualityOptions.push({ url: movieUrl, quality: "Unknown" });
    }

    if (qualityOptions.length === 0) {
        await m.react("❌");
        return await m.reply(`❌ මෙම චිත්‍රපටය සඳහා බාගැනීම් සබැඳි හමු නොවිණි.`);
    }

    // ---- Present quality options ----
    let qualMsg = `🎬 *${title}*\n\n📥 *ඔබට අවශ්‍ය Quality එක තෝරන්න:*\n\n`;
    qualityOptions.forEach((opt, idx) => {
        qualMsg += `*${idx + 1}.* 🟢 ${opt.quality}\n`;
    });
    qualMsg += `\n_📌 බාගැනීමට අදාළ අංකය මෙම පණිවිඩයට Reply කරන්න._`;

    let sentMsg = await sendMediaOrText(client, m.jid, qualMsg, movieImg, m);

    context.step = "quality_select";
    context.qualityMsgId = sentMsg.key.id;
    context.qualityOptions = qualityOptions;
    context.movieTitle = title;

    await m.react("🎬");
}

// ==========================================
// 4. DOWNLOAD & SEND FUNCTION
// ==========================================
async function downloadAndSendMovie(client, m, downloadUrl, quality, movieTitle) {
    try {
        await m.react("⬇️");
        const metaQuote = getMetaQuote();

        // ---- Send the download link as text FIRST ----
        let linkMsg = `🎬 *${movieTitle}*\n⚙️ *Quality:* ${quality}\n\n🔗 *Download Link:*\n${downloadUrl}\n\n💡 *If the video doesn't auto-download, copy the link and open in browser.*`;
        await client.sendMessage(m.jid, { text: linkMsg }, { quoted: metaQuote });

        // ---- Check if it's a real video (content-type) ----
        let isVideo = false;
        try {
            const headRes = await axios.head(downloadUrl, { timeout: 10000 });
            const contentType = headRes.headers['content-type'] || '';
            isVideo = contentType.includes('video') || contentType.includes('application/octet-stream');
            console.log(`[Cinesubz] Content-Type: ${contentType}, isVideo: ${isVideo}`);
        } catch (headErr) {
            console.log("HEAD request failed, attempting upload anyway...");
            isVideo = true; // assume it's video
        }

        if (!isVideo) {
            await m.reply(`⚠️ *The link appears to be a webpage, not a direct video.*\nPlease use the link above to download manually.`);
            await m.react("⚠️");
            return;
        }

        // ---- Check file size ----
        try {
            const headRes = await axios.head(downloadUrl, { timeout: 10000 });
            if (headRes && headRes.headers['content-length']) {
                const sizeMB = parseInt(headRes.headers['content-length']) / (1024 * 1024);
                if (sizeMB > 1950) {
                    await m.react("❌");
                    await m.reply(`❌ *File is too large! (${sizeMB.toFixed(2)} MB)*\nPlease use the link above to download.`);
                    return;
                }
            }
        } catch (headErr) {
            console.log("Size check failed, attempting upload...");
        }

        // ---- Send as WhatsApp document ----
        const safeTitle = movieTitle.replace(/[^a-zA-Z0-9 ]/g, "").trim();
        const caption = `🎬 *${movieTitle}*\n⚙️ *Quality:* ${quality}\n\n*${BOT_NAME}*\n_${POWERED_BY}_`;

        await client.sendMessage(m.jid, {
            document: { url: downloadUrl },
            mimetype: "video/mp4",
            fileName: `${safeTitle} - ${quality}.mp4`,
            caption: caption
        }, { quoted: metaQuote });

        await m.react("✅");
        await m.reply(`✅ *Download complete!*`);

    } catch (err) {
        console.error("Download Error:", err);
        await m.react("❌");
        await m.reply(`❌ *Upload failed.*\n\nPlease use the link above to download your movie.`);
    }
}
