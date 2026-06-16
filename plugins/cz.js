// commands/cinesubz.js
const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

if (!global.cinesubzSessions) global.cinesubzSessions = new Map();

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
            await client.sendMessage(jid, { image: { url: imageUrl }, caption: text }, { quoted });
            return;
        } catch (e) {
            console.error("Thumbnail sending failed, falling back to text:", e);
        }
    }
    await client.sendMessage(jid, { text: text }, { quoted });
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
            return await m.reply(`🎬 *${BOT_NAME} - CINESUBZ*

*භාවිතය:* ${m.prefix}cz <movie_name>
*උදාහරණ:* ${m.prefix}cz harry potter

📌 *චිත්‍රපටය තෝරා ගැනීමට:* .<අංකය> (උදා: .1 සිට .10 දක්වා)
📌 *Quality තෝරා ගැනීමට:* .m1, .m2, .m3

_${POWERED_BY}_`);
        }

        await m.react("🔍");
        await client.sendPresenceUpdate('composing', m.jid);
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
        
        listMsg += `\n📌 *චිත්‍රපටය තෝරා ගැනීමට අංකය ටයිප් කරන්න:* .<අංකය>\n*උදාහරණ:* .1 හෝ .10 දක්වා ඕනෑම එකක්`;

        const firstMovieImg = results[0].image || results[0].img || results[0].thumbnail;
        await sendMediaOrText(client, m.jid, listMsg, firstMovieImg, m);

        global.cinesubzSessions.set(m.sender, {
            step: "awaiting_movie",
            results: results,
            timestamp: Date.now()
        });
        
        setTimeout(() => global.cinesubzSessions.delete(m.sender), 5 * 60 * 1000);
        await m.react("✅");

    } catch (err) {
        console.error("Search Error:", err);
        await m.react("❌");
        await m.reply(`❌ සෙවීම අසාර්ථකයි: ${err.message.substring(0, 100)}`);
    }
});

// ==========================================
// 2. DYNAMIC NUMBER SELECTORS (.1 To .10)
// ==========================================
for (let i = 1; i <= 10; i++) {
    Sparky({
        name: `${i}`,
        category: "download",
        fromMe: isPublic,
        desc: `Cinesubz චිත්‍රපට අංක ${i} තෝරා ගැනීමට.`
    }, async ({ client, m }) => {
        try {
            const session = global.cinesubzSessions.get(m.sender);
            if (!session || session.step !== "awaiting_movie") return; 

            const idx = i - 1;
            if (idx < 0 || idx >= session.results.length) {
                return await m.reply(`❌ වැරදි අංකයක්! කරුණාකර ලයිස්තුවේ ඇති 1-${session.results.length} අතර අංකයක් ඇතුලත් කරන්න.`);
            }

            const selectedMovie = session.results[idx];
            global.cinesubzSessions.delete(m.sender);
            
            await fetchQualityOptions(client, m, selectedMovie);
        } catch (err) {
            console.error(`Error in numeric command .${i}:`, err);
        }
    });
}

// ==========================================
// 3. DYNAMIC QUALITY SELECTORS (.m1, .m2, .m3)
// ==========================================
for (let j = 1; j <= 3; j++) {
    Sparky({
        name: `m${j}`,
        category: "download",
        fromMe: isPublic,
        desc: `Quality ${j} තෝරා බාගත කර ගැනීමට.`
    }, async ({ client, m }) => {
        try {
            const session = global.cinesubzSessions.get(m.sender);
            if (!session || session.step !== "awaiting_quality") return;

            let qualityKey = "720p";
            if (j === 1) qualityKey = "480p";
            if (j === 2) qualityKey = "720p";
            if (j === 3) qualityKey = "1080p";

            const finalUrl = session.linksMap[qualityKey];
            const movieTitle = session.movieTitle;

            // සයිට් එකේ ඇත්තටම ලින්ක් එක නැත්නම් මැසේජ් එකක් දෙනවා සිලෙක්ට් කරන්න නොදී
            if (!finalUrl) {
                return await m.reply(`❌ සමාවෙන්න, මෙම චිත්‍රපටය සඳහා *${qualityKey}* Quality එක වෙබ් අඩවියේ ලබා දීමට නැත. කරුණාකර මෙනුවේ ඇති වෙනත් Quality එකක් තෝරන්න.`);
            }

            global.cinesubzSessions.delete(m.sender);

            await downloadAndSendMovie(client, m, finalUrl, qualityKey, movieTitle);
        } catch (err) {
            console.error(`Error in quality command .m${j}:`, err);
        }
    });
}

// ==========================================
// FETCH QUALITY OPTIONS FUNCTION
// ==========================================
async function fetchQualityOptions(client, m, selectedMovie) {
    const title = selectedMovie.title;
    const movieId = selectedMovie.id;
    const movieImg = selectedMovie.image || selectedMovie.img || selectedMovie.thumbnail;

    await m.react("⏳");
    await client.sendPresenceUpdate('composing', m.jid);
    await m.reply(`📥 බාගැනීම් විකල්ප සකසමින්: *${title}*...`);

    try {
        const extractUrl = `https://cinesubz-api-cnw.vercel.app/api/extract?id=${movieId}&type=mv`;
        const { data } = await axios.get(extractUrl, { timeout: 15000 });

        if (!data.status || !data.data || data.data.length === 0) {
            await m.react("❌");
            return await m.reply(`❌ මෙම චිත්‍රපටය සඳහා බාගැනීම් සබැඳි (Links) හමු නොවිණි.`);
        }

        const linksMap = {
            "480p": null,
            "720p": null,
            "1080p": null
        };

        // ඇත්තටම තියෙන ඒව විතරක් Map කරගන්නවා
        data.data.forEach(linkObj => {
            const qStr = (linkObj.quality || linkObj.resolution || "").toLowerCase();
            if (qStr.includes("480")) linksMap["480p"] = linkObj.link;
            else if (qStr.includes("720")) linksMap["720p"] = linkObj.link;
            else if (qStr.includes("1080")) linksMap["1080p"] = linkObj.link;
        });

        // කිසිම Specific Quality එකක් නැතිව එකම එක ලින්ක් එකක් විතරක් ආවොත් ඒක 720p වලට දානවා
        const fallbackLink = (data.data.find(v => v.is_direct_mp4) || data.data[0])?.link;
        if (!linksMap["480p"] && !linksMap["720p"] && !linksMap["1080p"]) {
            linksMap["720p"] = fallbackLink;
        }

        // මැසේජ් එක ඩයිනමික් ලෙස නිර්මාණය කිරීම (ඇති ඒවා පමණක් පෙන්වීමට)
        let qualMsg = `🎬 *${title}*\n\n📥 *වෙබ් අඩවියේ ඇති බාගත කිරීම් විකල්ප:*\n\n`;
        let availableCount = 0;

        if (linksMap["480p"]) {
            qualMsg += `🟢 *480p* (SD Quality) ➡️ 📥 *.m1*\n`;
            availableCount++;
        }
        if (linksMap["720p"]) {
            qualMsg += `🟢 *720p* (HD Quality) ➡️ 📥 *.m2*\n`;
            availableCount++;
        }
        if (linksMap["1080p"]) {
            qualMsg += `🟢 *1080p* (Full HD) ➡️ 📥 *.m3*\n`;
            availableCount++;
        }

        qualMsg += `\n📌 *බාගැනීමට අදාළ කමාන්ඩ් එක දෙන්න.*`;

        await sendMediaOrText(client, m.jid, qualMsg, movieImg, m);

        global.cinesubzSessions.set(m.sender, {
            step: "awaiting_quality",
            linksMap: linksMap,
            movieTitle: title,
            timestamp: Date.now()
        });
        
        setTimeout(() => global.cinesubzSessions.delete(m.sender), 5 * 60 * 1000);
        await m.react("🎬");

    } catch (err) {
        console.error("Quality Fetch Error:", err);
        await m.react("❌");
        await m.reply(`❌ Quality විකල්ප ලබා ගැනීම අසාර්ථකයි: ${err.message.substring(0, 100)}`);
    }
}

// ==========================================
// DOWNLOAD & DIRECT SEND FUNCTION
// ==========================================
async function downloadAndSendMovie(client, m, finalUrl, qualityStr, movieTitle) {
    try {
        await m.react("⬇️");
        const metaQuote = getMetaQuote();

        await client.sendMessage(m.jid, { text: `📥 *Downloading:* ${movieTitle}\n⚙️ *Quality:* ${qualityStr}\n\n_මෙය WhatsApp වෙත Upload වීමට ටික වේලාවක් ගත විය හැක..._` }, { quoted: metaQuote });
        
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
            console.log("Size check bypassed.");
        }

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
        console.error("Direct Upload Error:", err);
        await m.react("❌");
        await m.reply(`❌ බාගත කර ඔබ වෙත එවීමට අපොහොසත් විය. සර්වර් සබැඳියේ දෝෂයකි.\nError: ${err.message.substring(0, 80)}`);
    }
}
