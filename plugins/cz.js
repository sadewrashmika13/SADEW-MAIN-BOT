// commands/cinesubz.js
const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

if (!global.cinesubzContexts) global.cinesubzContexts = {};

const BOT_NAME = "★👑𝙎𝘼𝘿𝙀𝙒-𝙓-𝙈𝘿🔥 ★";
const POWERED_BY = "Powered by sadew rashmika";

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
        if (!query) return await m.reply(`🎬 *${BOT_NAME} - CINESUBZ*\n\n*භාවිතය:* ${m.prefix}cz <movie_name>\n*උදාහරණ:* ${m.prefix}cz harry potter\n\n_${POWERED_BY}_`);

        await m.react("🔍");
        await m.reply(`🔎 Cinesubz හි සොයමින් "${query}"...`);

        const searchUrl = `https://cinesubz-api-cnw.vercel.app/api/search?q=${encodeURIComponent(query)}`;
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

    if (context.step === "movie_select" && m.quoted.key.id === context.searchMsgId) {
        if (number >= 1 && number <= context.results.length) {
            const selectedMovie = context.results[number - 1];
            await fetchQualityOptionsForReply(client, m, selectedMovie, context);
        } else {
            m.reply(`❌ කරුණාකර 1 සිට ${context.results.length} දක්වා වූ නිවැරදි අංකයක් ලබා දෙන්න.`);
        }
    }
    
    else if (context.step === "quality_select" && m.quoted.key.id === context.qualityMsgId) {
        if (number >= 1 && number <= 3) {
            let qualityKey = "720p";
            if (number === 1) qualityKey = "480p";
            if (number === 2) qualityKey = "720p";
            if (number === 3) qualityKey = "1080p";

            const baseLink = context.baseLink;
            const movieTitle = context.movieTitle;

            // Quality එක වෙනස් කිරීම
            let finalUrl = baseLink;
            if (qualityKey === '480p') finalUrl = baseLink.replace(/(720p|1080p|1080|720)/gi, '480p');
            else if (qualityKey === '720p') finalUrl = baseLink.replace(/(480p|1080p|1080|480)/gi, '720p');
            else if (qualityKey === '1080p') finalUrl = baseLink.replace(/(480p|720p|480|720)/gi, '1080p');

            delete global.cinesubzContexts[m.sender];
            await downloadAndSendMovie(client, m, finalUrl, qualityKey, movieTitle);
        } else {
            m.reply(`❌ කරුණාකර 1, 2 හෝ 3 අංකයක් ලබා දෙන්න.`);
        }
    }
});

// ==========================================
// 3. FETCH QUALITY OPTIONS (NO FILTERS!)
// ==========================================
async function fetchQualityOptionsForReply(client, m, selectedMovie, context) {
    const title = selectedMovie.title;
    const movieId = selectedMovie.id;
    const movieImg = selectedMovie.image || selectedMovie.img || selectedMovie.thumbnail;

    await m.react("⏳");
    await m.reply(`📥 බාගැනීම් විකල්ප සකසමින්: *${title}*...`);

    try {
        const extractUrl = `https://cinesubz-api-cnw.vercel.app/api/extract?id=${movieId}&type=mv`;
        const { data } = await axios.get(extractUrl, { timeout: 15000 });

        if (!data || !data.status || !data.data || data.data.length === 0) {
            await m.react("❌");
            return await m.reply(`❌ මෙම චිත්‍රපටය සඳහා බාගැනීම් සබැඳි (Links) හමු නොවිණි.`);
        }

        // 🔴 ඔක්කොම Filters අයින් කළා! පළවෙනි එකම ගන්නවා.
        let baseLink = "";
        let firstItem = data.data[0];

        if (firstItem && firstItem.link) {
            // Iframe එකක් ආවොත් ඒකෙ ඇතුලේ තියෙන URL එක විතරක් ගලවා ගන්නවා
            if (firstItem.link.includes('<iframe')) {
                const match = firstItem.link.match(/src=["']([^"']+)["']/);
                if (match) baseLink = match[1];
            } else {
                baseLink = firstItem.link;
            }
        }

        if (!baseLink) {
            await m.react("❌");
            return await m.reply(`❌ ලින්ක් එකක් ලබා ගැනීමට නොහැකි විය.`);
        }

        // // වලින් පටන් ගන්නවා නම් https දානවා
        if (baseLink.startsWith('//')) {
            baseLink = 'https:' + baseLink;
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

        await m.react("🎬");

    } catch (err) {
        console.error("Quality Fetch Error:", err);
        await m.react("❌");
        await m.reply(`❌ Quality විකල්ප ලබා ගැනීම අසාර්ථකයි!`);
    }
}

// ==========================================
// 4. DOWNLOAD FUNCTION (ONLY DANUZZ API)
// ==========================================
async function downloadAndSendMovie(client, m, finalUrl, qualityStr, movieTitle) {
    try {
        await m.react("⬇️");
        const metaQuote = getMetaQuote();
        let realMp4Url = null;

        // 🌟 කෙලින්ම DanuZz API එකටම විතරක් යවනවා!
        console.log("🚀 Sending to DanuZz API:", finalUrl);
        
        try {
            const danuzApiUrl = `https://cz-dnuz.vercel.app/download?url=${encodeURIComponent(finalUrl)}`;
            const { data: danuzData } = await axios.get(danuzApiUrl, { timeout: 15000 });

            if (danuzData && danuzData.success && danuzData.result && danuzData.result.downloadUrls) {
                // t.me (Telegram) නැති නියම MP4 ලින්ක් එක හොයනවා
                const directLinkObj = danuzData.result.downloadUrls.find(d => d.url && !d.url.includes('t.me'));
                if (directLinkObj && directLinkObj.url) {
                    realMp4Url = directLinkObj.url;
                    console.log("✅ DanuZz API Success! Link:", realMp4Url);
                }
            }
        } catch (apiErr) {
            console.log("⚠️ DanuZz API Error:", apiErr.message);
        }

        // DanuZz API එකෙන් ලින්ක් එක ආවේ නැත්නම් එතනින් නවත්තනවා (24KB කතන්දර නෑ)
        if (!realMp4Url) {
            await m.react("❌");
            return await m.reply(`❌ DanuZz API එක හරහා මෙම චිත්‍රපටයේ ගොනුව ලබාගත නොහැක.`);
        }

        await client.sendMessage(m.jid, { text: `📥 *Downloading:* ${movieTitle}\n⚙️ *Quality:* ${qualityStr}\n\n_මෙය WhatsApp වෙත Upload වීමට ටික වේලාවක් ගත විය හැක..._` }, { quoted: metaQuote });
        
        const safeTitle = movieTitle.replace(/[^a-zA-Z0-9 ]/g, "").trim();
        const caption = `🎬 *${movieTitle}*\n⚙️ *Quality:* ${qualityStr}\n\n*${BOT_NAME}*\n_${POWERED_BY}_`;

        // 🌟 නියම MP4 ලින්ක් එකෙන් ෆයිල් එක යවනවා
        await client.sendMessage(m.jid, {
            document: { url: realMp4Url },
            mimetype: "video/mp4",
            fileName: `${safeTitle} - ${qualityStr}.mp4`,
            caption: caption
        }, { quoted: metaQuote });

        await m.react("✅");

    } catch (err) {
        console.error("Direct Upload Error:", err);
        await m.react("❌");
        await m.reply(`❌ බාගත කර ඔබ වෙත එවීමට අපොහොසත් විය.\n\nError: ${err.message.substring(0, 80)}`);
    }
}
