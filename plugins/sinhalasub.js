// commands/cinesubz.js
const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

if (!global.cinesubzSessions) global.cinesubzSessions = new Map();

Sparky({
    name: "cinesubz",
    alias: ["cz", "movie2"],
    category: "download",
    fromMe: isPublic,
    desc: "🎬 Cinesubz වෙබ් අඩවියෙන් චිත්‍රපට සොයා බාගත කරගන්න."
}, async ({ client, m, args }) => {
    
    // යූසර් ටයිප් කරපු ටෙක්ස්ට් එක පිරිසිදු කර ගැනීම
    let query = "";
    if (args) {
        query = Array.isArray(args) ? args.join(" ").trim() : args.trim();
    }

    if (!query) {
        return m.reply(`🎬 *CINESUBZ MOVIE DOWNLOADER*

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

        // පියවර 1: චිත්‍රපටය තෝරා ගැනීම
        if (session.step === "awaiting_movie") {
            const idx = num - 1;
            if (idx < 0 || idx >= session.results.length) {
                return m.reply(`❌ වැරදි අංකයක්! කරුණාකර 1-${session.results.length} අතර අංකයක් ඇතුලත් කරන්න.`);
            }
            const selectedMovie = session.results[idx];
            await fetchQualityOptions(client, m, selectedMovie.id, selectedMovie.title);
            return;
        }

        // පියවර 2: Quality එක තෝරාගෙන ඩවුන්ලෝඩ් කිරීම
        if (session.step === "awaiting_quality") {
            const idx = num - 1;
            if (idx < 0 || idx >= session.links.length) {
                return m.reply(`❌ වැරදි අංකයක්! කරුණාකර ලබා දී ඇති නිවැරදි අංකයක් තෝරන්න.`);
            }
            const selectedLink = session.links[idx];
            await downloadAndSendMovie(client, m, selectedLink, session.movieTitle);
            global.cinesubzSessions.delete(m.sender); // වැඩේ ඉවර නිසා සෙශන් එක මකනවා
            return;
        }
    }

    // ==========================================
    // 2. NEW MOVIE SEARCH (අලුතින්ම සෙවීම)
    // ==========================================
    await m.react("🔍");
    await client.sendPresenceUpdate('composing', m.jid);
    await m.reply(`🔎 Cinesubz හි සොයමින් "${query}"...`);

    try {
        const searchUrl = `https://cinesubz-api-cnw.vercel.app/api/search?q=${encodeURIComponent(query)}`;
        const { data } = await axios.get(searchUrl, { timeout: 15000 });

        if (!data.status || !data.data || data.data.length === 0) {
            await m.react("❌");
            return m.reply(`❌ සමාවෙන්න, "${query}" සඳහා කිසිදු චිත්‍රපටයක් හමුනොවිය.`);
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
        
        // විනාඩි 5කින් සෙශන් එක ඔටෝ මැකෙන්න දැමීම
        setTimeout(() => global.cinesubzSessions.delete(m.sender), 5 * 60 * 1000);
        await m.react("✅");

    } catch (err) {
        console.error("Cinesubz Search Error:", err);
        await m.react("❌");
        m.reply(`❌ සෙවීම අසාර්ථකයි: ${err.message.substring(0, 100)}`);
    }
});

// ==========================================
// 3. FETCH QUALITY LINKS FUNCTION
// ==========================================
async function fetchQualityOptions(client, m, movieId, title) {
    await m.react("⏳");
    await client.sendPresenceUpdate('composing', m.jid);
    await m.reply(`📥 බාගැනීම් විකල්ප සකසමින්: *${title}*...`);

    try {
        const extractUrl = `https://cinesubz-api-cnw.vercel.app/api/extract?id=${movieId}&type=mv`;
        const { data } = await axios.get(extractUrl, { timeout: 15000 });

        if (!data.status || !data.data || data.data.length === 0) {
            await m.react("❌");
            return m.reply(`❌ මෙම චිත්‍රපටය සඳහා බාගැනීම් සබැඳි (Links) හමු නොවිණි.`);
        }

        // වීඩියෝ ලින්ක්ස් ටික පමණක් ෆිල්ටර් කර පිළිවෙලට සකසා ගැනීම
        const rawLinks = data.data;
        const validLinks = [];

        // 480p, 720p, 1080p ලින්ක්ස් වෙන් කර හඳුනාගැනීම
        rawLinks.forEach(linkObj => {
            let qName = "Unknown Quality";
            let str = (linkObj.quality || linkObj.resolution || "").toLowerCase();
            
            if (str.includes("480")) qName = "480p (SD)";
            else if (str.includes("720")) qName = "720p (HD)";
            else if (str.includes("1080")) qName = "1080p (FHD)";
            else qName = linkObj.quality || "Direct MP4";

            validLinks.push({
                displayQuality: qName,
                size: linkObj.size || "Unknown Size",
                url: linkObj.link
            });
        });

        if (validLinks.length === 0) {
            await m.react("❌");
            return m.reply(`❌ බාගත හැකි මට්ටමේ කිසිදු Quality ලින්ක් එකක් හමු නොවිණි.`);
        }

        let qualMsg = `🎬 *${title}*\n\n📥 *ඔබට අවශ්‍ය Quality එක තෝරන්න:*\n\n`;
        validLinks.forEach((l, i) => {
            qualMsg += `*${i + 1}.* ${l.displayQuality} -- [${l.size}]\n`;
        });
        
        qualMsg += `\n📌 *බාගැනීමට:* ${m.prefix}cz <අංකය>\n*උදාහරණ:* ${m.prefix}cz 1`;

        await client.sendMessage(m.jid, { text: qualMsg }, { quoted: m });

        // ඊළඟ පියවර සඳහා සෙශන් එක අප්ඩේට් කිරීම
        global.cinesubzSessions.set(m.sender, {
            step: "awaiting_quality",
            links: validLinks,
            movieTitle: title,
            timestamp: Date.now()
        });
        
        setTimeout(() => global.cinesubzSessions.delete(m.sender), 5 * 60 * 1000);
        await m.react("🎬");

    } catch (err) {
        console.error("Quality Fetch Error:", err);
        await m.react("❌");
        m.reply(`❌ Quality විකල්ප ලබා ගැනීම අසාර්ථකයි: ${err.message.substring(0, 100)}`);
    }
}

// ==========================================
// 4. DOWNLOAD & SEND MOVIE FUNCTION
// ==========================================
async function downloadAndSendMovie(client, m, linkInfo, movieTitle) {
    await m.react("⬇️");
    
    // Fake Quote සැකසීම (Sadew MD නමින්)
    const botName = "SADEW-MD";
    const metaQuote = {
        key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "SADEW_MD_CINESUBZ" },
        message: { contactMessage: { displayName: botName, vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${botName}\nORG:Sadew MD Downloader\nTEL;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
    };

    await client.sendMessage(m.jid, { text: `📥 *Downloading:* ${movieTitle}\n⚙️ *Quality:* ${linkInfo.displayQuality}\n📦 *Size:* ${linkInfo.size}\n\n_කරුණාකර රැඳී සිටින්න, චිත්‍රපටය ඔබ වෙත Upload වෙමින් පවතී..._` }, { quoted: metaQuote });

    try {
        // වට්ස්ඇප් සීමාවන් ඉක්මවා යනවාදැයි බැලීමට Size Check එකක් දාමු (Max 1.95GB)
        try {
            const headRes = await axios.head(linkInfo.url, { timeout: 10000 });
            if (headRes && headRes.headers['content-length']) {
                const sizeInMB = parseInt(headRes.headers['content-length']) / (1024 * 1024);
                if (sizeInMB > 1990) {
                    await m.react("❌");
                    return m.reply(`❌ *ගොනුව විශාල වැඩියි! (${sizeInMB.toFixed(2)} MB)*\nවට්ස්ඇප් හරහා යැවිය හැක්කේ 2GB ට අඩු ෆයිල් පමණි.`);
                }
            }
        } catch (hErr) {
            console.log("Size check bypassed, trying direct stream.");
        }

        // ෆයිල් එක සිලෙක්ට් කරගත් නමින් වට්ස්ඇප් ඩොකියුමන්ට් එකක් විදියට කෙලින්ම යැවීම
        const safeTitle = movieTitle.replace(/[^a-zA-Z0-9 ]/g, "").trim();
        const caption = `🎬 *${movieTitle}*\n⚙️ *Quality:* ${linkInfo.displayQuality}\n📦 *Size:* ${linkInfo.size}\n\n> **𝕊𝕒𝕕𝕖𝕨 𝕄𝔻 𝕄𝕚𝕟𝕚 ✨**`;

        await client.sendMessage(m.jid, {
            document: { url: linkInfo.url },
            mimetype: "video/mp4",
            fileName: `${safeTitle} - ${linkInfo.displayQuality}.mp4`,
            caption: caption
        }, { quoted: metaQuote });

        await m.react("✅");

    } catch (err) {
        console.error("Direct Upload Error:", err);
        await m.react("❌");
        m.reply(`❌ බාගත කර ඔබ වෙත එවීමට අපොහොසත් විය. සර්වර් සබැඳියේ දෝෂයකි.\nError: ${err.message.substring(0, 80)}`);
    }
}
