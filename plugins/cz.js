// commands/cinesubz.js
const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

if (!global.cinesubzContexts) global.cinesubzContexts = {};

const BOT_NAME = "★👑𝙎𝘼𝘿𝙀𝙒-𝙓-𝙈𝘿🔥 ★";
const POWERED_BY = "Powered by sadew rashmika";

// ========== API CONFIGURATION ==========
const OLD_API_SEARCH = "https://cinesubz-api-cnw.vercel.app/api/search";
const OLD_API_EXTRACT = "https://cinesubz-api-cnw.vercel.app/api/extract";
const NEW_API_DOWNLOAD = "https://cz-dnuz.vercel.app/download";

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

        // Use OLD API for search
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
            // Try to get download links (try both APIs)
            await fetchDownloadLinks(client, m, selectedMovie, context);
        } else {
            m.reply(`❌ කරුණාකර 1 සිට ${context.results.length} දක්වා වූ නිවැරදි අංකයක් ලබා දෙන්න.`);
        }
    }
    
    // Step 2: Quality / Download Selection
    else if (context.step === "download_select" && m.quoted.key.id === context.qualityMsgId) {
        if (number === 1 && context.downloadUrl) {
            await downloadAndSendMovie(client, m, context.downloadUrl, context.quality || "HD", context.movieTitle);
            delete global.cinesubzContexts[m.sender];
        } else {
            m.reply(`❌ කරුණාකර 1 අංකය පමණක් ලබා දෙන්න.`);
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

    let downloadUrl = null;
    let quality = "HD";
    let fileSize = "Unknown";
    let success = false;

    // ===== TRY 1: OLD API (extract) =====
    try {
        const movieId = selectedMovie.id;
        const extractUrl = `${OLD_API_EXTRACT}?id=${movieId}&type=mv`;
        const oldRes = await axios.get(extractUrl, { timeout: 15000 });

        if (oldRes.data.status && oldRes.data.data && oldRes.data.data.length > 0) {
            const directVideo = oldRes.data.data.find(v => v.is_direct_mp4) || oldRes.data.data[0];
            if (directVideo && directVideo.link) {
                downloadUrl = directVideo.link;
                quality = "720p";
                success = true;
                console.log(`[Cinesubz] ✅ Old API found: ${downloadUrl}`);
            }
        }
    } catch (err) {
        console.log(`[Cinesubz] Old API failed: ${err.message}`);
    }

    // ===== TRY 2: NEW API (cz-dnuz) =====
    if (!success) {
        try {
            const newApiUrl = `${NEW_API_DOWNLOAD}?url=${encodeURIComponent(movieUrl)}`;
            const newRes = await axios.get(newApiUrl, { timeout: 20000 });
            const newData = newRes.data;

            if (newData.success && newData.result && newData.result.downloadUrls && newData.result.downloadUrls.length > 0) {
                const info = newData.result;
                downloadUrl = info.downloadUrls[0].url;
                quality = info.title?.match(/(480p|720p|1080p)/i)?.[1] || "HD";
                fileSize = info.size || "Unknown";
                success = true;
                console.log(`[Cinesubz] ✅ New API found: ${downloadUrl}`);
            }
        } catch (err) {
            console.log(`[Cinesubz] New API failed: ${err.message}`);
        }
    }

    // ===== TRY 3: Direct URL construction (for some movies) =====
    if (!success) {
        try {
            // Try to guess the download URL from the movie title
            const cleanTitle = title.replace(/[^a-zA-Z0-9 ]/g, " ").trim();
            const searchQuery = encodeURIComponent(cleanTitle);
            // This is a fallback – might not work always
            downloadUrl = `https://bot3.sonic-cloud.online/server4/${searchQuery}.mp4`;
            success = true;
            console.log(`[Cinesubz] ⚠️ Using fallback URL: ${downloadUrl}`);
        } catch (err) {}
    }

    // ===== If no download URL found =====
    if (!success || !downloadUrl) {
        await m.react("❌");
        return await m.reply(`❌ මෙම චිත්‍රපටය සඳහා බාගැනීම් සබැඳි හමු නොවිණි.\n\n💡 *විකල්ප:*\n- වෙනත් චිත්‍රපටයක් උත්සාහ කරන්න\n- චිත්‍රපටයේ නම නිවැරදිව ටයිප් කරන්න`);
    }

    // ===== Show download option =====
    let msg = `🎬 *${title}*\n\n📥 *Download Ready!*\n`;
    msg += `🎚️ *Quality:* ${quality}\n`;
    msg += `📦 *Size:* ${fileSize}\n\n`;
    msg += `📌 *බාගැනීමට 1 අංකය Reply කරන්න.*`;

    let sentMsg = await sendMediaOrText(client, m.jid, msg, movieImg, m);

    context.step = "download_select";
    context.qualityMsgId = sentMsg.key.id;
    context.downloadUrl = downloadUrl;
    context.quality = quality;
    context.movieTitle = title;

    await m.react("🎬");
}

// ==========================================
// 4. DOWNLOAD & SEND FUNCTION
// ==========================================
async function downloadAndSendMovie(client, m, finalUrl, qualityStr, movieTitle) {
    try {
        await m.react("⬇️");
        const metaQuote = getMetaQuote();

        // Check file size (optional)
        try {
            const headRes = await axios.head(finalUrl, { timeout: 10000 });
            if (headRes && headRes.headers['content-length']) {
                const sizeInMB = parseInt(headRes.headers['content-length']) / (1024 * 1024);
                if (sizeInMB > 1990) {
                    await m.react("❌");
                    return await m.reply(`❌ *ගොනුව විශාල වැඩියි! (${sizeInMB.toFixed(2)} MB)*`);
                }
            }
        } catch (hErr) {}

        await client.sendMessage(m.jid, { 
            text: `📥 *Downloading:* ${movieTitle}\n⚙️ *Quality:* ${qualityStr}\n\n_WhatsApp වෙත Upload වෙමින් පවතී..._` 
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
        await m.reply(`✅ *Download complete!*`);

    } catch (err) {
        console.error("Download Error:", err);
        await m.react("❌");
        await m.reply(`❌ බාගත කිරීම අසාර්ථකයි.\n\nError: ${err.message.substring(0, 100)}`);
    }
}
