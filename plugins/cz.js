// commands/cinesubz.js
const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

// Global context for number reply system
if (!global.cinesubzContexts) global.cinesubzContexts = {};

const BOT_NAME = "★👑𝙎𝘼𝘿𝙀𝙒-𝙓-𝙈𝘿🔥 ★";
const POWERED_BY = "Powered by sadew rashmika";

// NEW API Endpoint
const NEW_API_BASE = "https://cz-dnuz.vercel.app/download";
const OLD_API_BASE = "https://cinesubz-api-cnw.vercel.app/api";

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
        } catch (e) {
            console.error("Thumbnail sending failed:", e);
        }
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
// 1. MAIN SEARCH COMMAND (.cinesubz / .cz)
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
            return await m.reply(`🎬 *${BOT_NAME} - CINESUBZ*\n\n*භාවිතය:* ${m.prefix}cz <movie_name>\n*උදාහරණ:* ${m.prefix}cz harry potter\n\n_${POWERED_BY}_`);
        }

        await m.react("🔍");
        await client.sendPresenceUpdate('composing', m.jid);
        await m.reply(`🔎 Cinesubz හි සොයමින් "${query}"...`);

        // Search API (same as before)
        const searchUrl = `${OLD_API_BASE}/search?q=${encodeURIComponent(query)}`;
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
        
        setTimeout(() => {
            if (global.cinesubzContexts[m.sender]) delete global.cinesubzContexts[m.sender];
        }, 5 * 60 * 1000);
        
        await m.react("✅");

    } catch (err) {
        console.error("Search Error:", err);
        await m.react("❌");
        await m.reply(`❌ සෙවීම අසාර්ථකයි!`);
    }
});

// ==========================================
// 2. DYNAMIC REPLY LISTENER (TEXT COMMAND)
// ==========================================
Sparky({
    on: "text",
    fromMe: isPublic,
    dontAddCommandList: true
}, async ({ client, m }) => {
    let context = global.cinesubzContexts[m.sender];
    if (!context || !m.quoted) return;

    let number = parseInt(m.text.trim());
    if (isNaN(number)) return;

    // Step 1: Movie Selection
    if (context.step === "movie_select" && m.quoted.key.id === context.searchMsgId) {
        if (number >= 1 && number <= context.results.length) {
            const selectedMovie = context.results[number - 1];
            await fetchQualityOptions(client, m, selectedMovie, context);
        } else {
            m.reply(`❌ කරුණාකර 1 සිට ${context.results.length} දක්වා වූ නිවැරදි අංකයක් ලබා දෙන්න.`);
        }
    }
    
    // Step 2: Quality Selection
    else if (context.step === "quality_select" && m.quoted.key.id === context.qualityMsgId) {
        if (number === 1) {
            // Download the movie using the URL we got from new API
            await downloadAndSendMovie(client, m, context.downloadUrl, context.quality, context.movieTitle);
            delete global.cinesubzContexts[m.sender];
        } else {
            m.reply(`❌ කරුණාකර 1 අංකය පමණක් ලබා දෙන්න.`);
        }
    }
});

// ==========================================
// 3. FETCH QUALITY OPTIONS (NEW API + FALLBACK)
// ==========================================
async function fetchQualityOptions(client, m, selectedMovie, context) {
    const title = selectedMovie.title;
    const movieUrl = selectedMovie.url; // Get the full page URL
    const movieImg = selectedMovie.image || selectedMovie.img || selectedMovie.thumbnail;

    await m.react("⏳");
    await m.reply(`📥 බාගැනීම් විකල්ප සකසමින්: *${title}*...`);

    try {
        // ===== TRY NEW API FIRST =====
        const newApiUrl = `${NEW_API_BASE}?url=${encodeURIComponent(movieUrl)}`;
        console.log(`[Cinesubz] New API: ${newApiUrl}`);
        
        const newRes = await axios.get(newApiUrl, { timeout: 20000 });
        const newData = newRes.data;

        if (newData.success && newData.result && newData.result.downloadUrls && newData.result.downloadUrls.length > 0) {
            const downloadInfo = newData.result;
            const downloadUrl = downloadInfo.downloadUrls[0].url;
            const fileTitle = downloadInfo.title || title;
            const fileSize = downloadInfo.size || "Unknown";
            
            // Extract quality from filename (e.g., "480p", "720p")
            let quality = "Unknown";
            const qualityMatch = fileTitle.match(/(480p|720p|1080p|4K)/i);
            if (qualityMatch) quality = qualityMatch[1];

            let qualMsg = `🎬 *${title}*\n\n📥 *Available Download:*\n`;
            qualMsg += `📄 *File:* ${fileTitle}\n`;
            qualMsg += `📦 *Size:* ${fileSize}\n`;
            qualMsg += `🎚️ *Quality:* ${quality}\n\n`;
            qualMsg += `📌 *බාගැනීමට 1 අංකය Reply කරන්න.*`;

            let sentMsg = await sendMediaOrText(client, m.jid, qualMsg, movieImg, m);

            context.step = "quality_select";
            context.qualityMsgId = sentMsg.key.id;
            context.downloadUrl = downloadUrl;
            context.quality = quality;
            context.movieTitle = title;

            await m.react("🎬");
            return;
        }

        // ===== FALLBACK: OLD API =====
        console.log(`[Cinesubz] New API failed, trying old API...`);
        const movieId = selectedMovie.id;
        const extractUrl = `${OLD_API_BASE}/extract?id=${movieId}&type=mv`;
        const oldRes = await axios.get(extractUrl, { timeout: 15000 });

        if (!oldRes.data.status || !oldRes.data.data || oldRes.data.data.length === 0) {
            throw new Error("No download links found from any API");
        }

        const directVideo = oldRes.data.data.find(v => v.is_direct_mp4) || oldRes.data.data[0];
        const baseLink = directVideo.link;

        if (!baseLink) {
            throw new Error("No download link available");
        }

        let qualMsg = `🎬 *${title}*\n\n📥 *ඔබට අවශ්‍ය Quality එක තෝරන්න:*\n\n`;
        qualMsg += `*1.* 🟢 480p (SD Quality)\n`;
        qualMsg += `*2.* 🟢 720p (HD Quality)\n`;
        qualMsg += `*3.* 🟢 1080p (Full HD)\n\n`;
        qualMsg += `_📌 බාගැනීමට අවශ්‍ය අංකය (1, 2 හෝ 3) මෙම පණිවිඩයට Reply කරන්න._`;

        let sentMsg = await sendMediaOrText(client, m.jid, qualMsg, movieImg, m);

        context.step = "quality_select";
        context.qualityMsgId = sentMsg.key.id;
        context.baseLink = baseLink;
        context.movieTitle = title;
        context.useOldApi = true;

        await m.react("🎬");

    } catch (err) {
        console.error("Quality Fetch Error:", err);
        await m.react("❌");
        await m.reply(`❌ මෙම චිත්‍රපටය සඳහා බාගැනීම් සබැඳි හමු නොවිණි.\n\nError: ${err.message.substring(0, 100)}`);
    }
}

// ==========================================
// 4. DOWNLOAD & SEND FUNCTION
// ==========================================
async function downloadAndSendMovie(client, m, finalUrl, qualityStr, movieTitle) {
    try {
        await m.react("⬇️");
        const metaQuote = getMetaQuote();

        // Check if URL is valid
        try {
            const headRes = await axios.head(finalUrl, { timeout: 10000 });
            if (headRes && headRes.headers['content-length']) {
                const sizeInMB = parseInt(headRes.headers['content-length']) / (1024 * 1024);
                if (sizeInMB > 1990) {
                    await m.react("❌");
                    return await m.reply(`❌ *ගොනුව විශාල වැඩියි! (${sizeInMB.toFixed(2)} MB)*\nවට්ස්ඇප් හරහා යැවිය හැක්කේ 2GB ට අඩු ෆයිල් පමණි.`);
                }
            }
        } catch (hErr) {
            // If HEAD fails, try GET with range (some servers block HEAD)
            console.log("HEAD request failed, proceeding with download attempt...");
        }

        await client.sendMessage(m.jid, { 
            text: `📥 *Downloading:* ${movieTitle}\n⚙️ *Quality:* ${qualityStr}\n\n_මෙය WhatsApp වෙත Upload වීමට ටික වේලාවක් ගත විය හැක..._` 
        }, { quoted: metaQuote });
        
        const safeTitle = movieTitle.replace(/[^a-zA-Z0-9 ]/g, "").trim();
        const caption = `🎬 *${movieTitle}*\n⚙️ *Quality:* ${qualityStr}\n\n*${BOT_NAME}*\n_${POWERED_BY}_`;

        await client.sendMessage(m.jid, {
            document: { url: finalUrl },
            mimetype: "video/mp4",
            fileName: `${safeTitle} - ${qualityStr}.mp4`,
            caption: caption
        }, { quoted: metaQuote });

        await m.react("✅");

    } catch (err) {
        console.error("Download Error:", err);
        await m.react("❌");
        await m.reply(`❌ බාගත කර ඔබ වෙත එවීමට අපොහොසත් විය.\n\nError: ${err.message.substring(0, 100)}`);
    }
}
