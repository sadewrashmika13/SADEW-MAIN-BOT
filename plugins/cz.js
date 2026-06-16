// commands/cinesubz.js
const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

if (!global.cinesubzSessions) global.cinesubzSessions = new Map();

// ආගියුමන්ට්ස් පිරිසිදුව ලබා ගැනීමට ඔයාගේම getQuery ෆන්ක්ෂන් එක
function getQuery(args) {
    if (!args) return "";
    if (Array.isArray(args)) return args.join(" ").trim();
    if (typeof args === "string") return args.trim();
    if (typeof args === "object") return Object.values(args).join(" ").trim();
    return "";
}

Sparky({
    name: "cinesubz",
    alias: ["cz", "movie2"],
    category: "download",
    fromMe: isPublic,
    desc: "🎬 Cinesubz වෙබ් අඩවියෙන් චිත්‍රපට සොයා බාගත කරගන්න."
}, async ({ client, m, args }) => {
    try {
        const query = getQuery(args);

        if (!query) {
            return await m.reply(`🎬 *CINESUBZ MOVIE DOWNLOADER*

*භාවිතය:* ${m.prefix}cz <movie_name>
*උදාහරණ:* ${m.prefix}cz batman

📌 *චිත්‍රපටය තෝරා ගැනීමට:* ${m.prefix}cz <අංකය>
📌 *Quality එක තෝරා ගැනීමට:* ${m.prefix}cz <අංකය>`);
        }

        const session = global.cinesubzSessions.get(m.sender);

        // ==========================================
        // 1. SESSION HANDLING (අංක රිප්ලයි අල්ලා ගැනීම)
        // ==========================================
        if (session && !isNaN(query)) {
            const num = parseInt(query);

            // පියවර 1: චිත්‍රපටය තෝරා ගැනීම (.cz 1)
            if (session.step === "awaiting_movie") {
                const idx = num - 1;
                if (idx < 0 || idx >= session.results.length) {
                    return await m.reply(`❌ වැරදි අංකයක්! කරුණාකර 1-${session.results.length} අතර අංකයක් ඇතුලත් කරන්න.`);
                }
                const selectedMovie = session.results[idx];
                
                // පැරණි සෙශන් එක මකා දමනවා
                global.cinesubzSessions.delete(m.sender);
                
                // බාගැනීම් විකල්ප සෙවීම ආරම්භ කිරීම
                await fetchQualityOptions(client, m, selectedMovie.id, selectedMovie.title);
                return;
            }

            // පියවර 2: Quality එක තෝරාගෙන ඩවුන්ලෝඩ් කිරීම (.cz 1 / 2 / 3)
            if (session.step === "awaiting_quality") {
                if (num < 1 || num > 3) {
                    return await m.reply(`❌ වැරදි අංකයක්! කරුණාකර 1, 2 හෝ 3 තෝරන්න.\n\n1. 480p\n2. 720p\n3. 1080p`);
                }
                
                let qualityStr = "720p";
                if (num === 1) qualityStr = "480p";
                if (num === 2) qualityStr = "720p";
                if (num === 3) qualityStr = "1080p";

                const baseLink = session.baseLink;
                const movieTitle = session.movieTitle;

                // සෙශන් එක සම්පූර්ණයෙන්ම මකා දමනවා
                global.cinesubzSessions.delete(m.sender);

                // ෆිල්ම් එක ඩවුන්ලෝඩ් කර යැවීම
                await downloadAndSendMovie(client, m, baseLink, qualityStr, movieTitle);
                return;
            }
        }

        // ==========================================
        // 2. NEW MOVIE SEARCH (අලුතින්ම සෙවීම)
        // ==========================================
        await m.react("🔍");
        await client.sendPresenceUpdate('composing', m.jid);
        await m.reply(`🔎 Cinesubz හි සොයමින් "${query}"...`);

        const searchUrl = `https://cinesubz-api-cnw.vercel.app/api/search?q=${encodeURIComponent(query)}`;
        const { data } = await axios.get(searchUrl, { timeout: 15000 });

        if (!data.status || !data.data || data.data.length === 0) {
            await m.react("❌");
            return await m.reply(`❌ සමාවෙන්න, "${query}" සඳහා කිසිදු චිත්‍රපටයක් හමුනොවිය.`);
        }

        const results = data.data.slice(0, 10); // මුල් ප්‍රතිඵල 10ක් පමණක් ගනී
        let listMsg = `🎬 *SADEW MD - CINESUBZ SEARCH*\n\n🔍 *සෙව්වේ:* ${query}\n📊 ප්‍රතිඵල ගණන: ${results.length}\n\n`;
        
        results.forEach((movie, i) => {
            listMsg += `*${i + 1}.* ${movie.title} (${movie.year || 'N/A'})\n`;
        });
        
        listMsg += `\n📌 *චිත්‍රපටය තෝරා ගැනීමට:* ${m.prefix}cz <අංකය>\n*උදාහරණ:* ${m.prefix}cz 1`;

        await client.sendMessage(m.jid, { text: listMsg }, { quoted: m });

        // සෙශන් එක සේව් කර තැබීම
        global.cinesubzSessions.set(m.sender, {
            step: "awaiting_movie",
            results: results,
            timestamp: Date.now()
        });
        
        setTimeout(() => global.cinesubzSessions.delete(m.sender), 5 * 60 * 1000);
        await m.react("✅");

    } catch (err) {
        console.error("Cinesubz Search Error:", err);
        await m.react("❌");
        await m.reply(`❌ සෙවීම අසාර්ථකයි: ${err.message.substring(0, 100)}`);
    }
});

// ==========================================
// 3. FETCH QUALITY LINKS FUNCTION
// ==========================================
async function fetchQualityOptions(client, m, movieId, title) {
    try {
        await m.react("⏳");
        await client.sendPresenceUpdate('composing', m.jid);
        await m.reply(`📥 බාගැනීම් විකල්ප සකසමින්: *${title}*...`);

        const extractUrl = `https://cinesubz-api-cnw.vercel.app/api/extract?id=${movieId}&type=mv`;
        const { data } = await axios.get(extractUrl, { timeout: 15000 });

        if (!data.status || !data.data || data.data.length === 0) {
            await m.react("❌");
            return await m.reply(`❌ මෙම චිත්‍රපටය සඳහා බාගැනීම් සබැඳි (Links) හමු නොවිණි.`);
        }

        // Base ලින්ක් එක වෙන් කර ගැනීම
        const directVideo = data.data.find(v => v.is_direct_mp4) || data.data[0];
        const baseLink = directVideo.link;

        if (!baseLink) {
            await m.react("❌");
            return await m.reply(`❌ බාගත හැකි මට්ටමේ කිසිදු ලින්ක් එකක් හමු නොවිණි.`);
        }

        let qualMsg = `🎬 *${title}*\n\n📥 *ඔබට අවශ්‍ය Quality එක තෝරන්න:*\n\n`;
        qualMsg += `1. *480p* (SD Quality)\n`;
        qualMsg += `2. *720p* (HD Quality)\n`;
        qualMsg += `3. *1080p* (Full HD Quality)\n\n`;
        qualMsg += `📌 *බාගැනීමට:* ${m.prefix}cz <අංකය>\n*උදාහරණ:* ${m.prefix}cz 1`;

        await client.sendMessage(m.jid, { text: qualMsg }, { quoted: m });

        // Quality සෙශන් එක අප්ඩේට් කිරීම
        global.cinesubzSessions.set(m.sender, {
            step: "awaiting_quality",
            baseLink: baseLink,
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
// 4. DOWNLOAD & SEND MOVIE FUNCTION
// ==========================================
async function downloadAndSendMovie(client, m, baseLink, qualityStr, movieTitle) {
    try {
        await m.react("⬇️");
        
        const botName = "SADEW-MD";
        const metaQuote = {
            key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "SADEW_MD_CINESUBZ" },
            message: { contactMessage: { displayName: botName, vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${botName}\nORG:Sadew MD Downloader\nTEL;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
        };

        await client.sendMessage(m.jid, { text: `📥 *Downloading:* ${movieTitle}\n⚙️ *Quality:* ${qualityStr}\n\n_මෙය විශාල file එකක් බැවින්, WhatsApp වෙත Upload වීමට ටික වේලාවක් ගත විය හැක..._` }, { quoted: metaQuote });

        // URL එක තෝරාගත් Quality එකට අනුව වෙනස් කිරීම
        let finalUrl = baseLink;
        if (qualityStr === '480p') {
            finalUrl = baseLink.replace(/(720p|1080p|1080|720)/i, '480p');
        } else if (qualityStr === '720p') {
            finalUrl = baseLink.replace(/(480p|1080p|1080|480)/i, '720p');
        } else if (qualityStr === '1080p') {
            finalUrl = baseLink.replace(/(480p|720p|480|720)/i, '1080p');
        }
        
        // Size Limit Check (Max 1.95GB)
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
        const caption = `🎬 *${movieTitle}*\n⚙️ *Quality:* ${qualityStr}\n\n> **𝕊𝕒𝕕𝕖𝕨 𝕄𝔻 𝕄𝕚𝕟𝕚 ✨**`;

        // Direct Stream (RAM එකෙන් කෙලින්ම වට්ස්ඇප් එකට යැවීම)
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
