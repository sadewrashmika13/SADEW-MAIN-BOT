const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

// අංකයට රිප්ලයි කිරීමේ මතකය (Context) තබාගැනීමට
if (!global.cinesubzContexts) global.cinesubzContexts = {};

// බොට් බ්‍රෑන්ඩින්ග්
const BOT_NAME = "★👑𝙎𝘼𝘿𝙀𝙒-𝙓-𝙈𝘿🔥 ★";

function getMetaQuote() {
    return {
        key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_CZ" },
        message: { contactMessage: { displayName: BOT_NAME, vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${BOT_NAME}\nORG:Cinesubz\nTEL;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
    };
}

// ==========================================
// 1. SEARCH COMMAND (.cz / .cinesubz) - යාළුවගේ විදිහටම
// ==========================================
Sparky({
    name: "cinesubz",
    alias: ["cz"],
    category: "download",
    fromMe: isPublic,
    desc: "🎬 Cinesubz Movie Search"
}, async ({ client, m, text }) => {
    const query = text;
    if (!query) {
        return await m.reply("🎬 *කරුණාකර Movie එකේ නම ලබා දෙන්න!*\n_උදා: .cz batman_");
    }

    try {
        await m.react("🔍");
        
        // Search from Vercel API
        const searchUrl = `https://cinesubz-api-cnw.vercel.app/api/search?q=${encodeURIComponent(query)}`;
        const { data } = await axios.get(searchUrl);

        if (!data.status || !data.data || data.data.length === 0) {
            return await m.reply("❌ *සමාවෙන්න, එම නමින් Movies කිසිවක් හමුවූයේ නැත.*");
        }

        // මුල් ප්‍රතිපල 10 වෙන්කර ගැනීම
        const topResults = data.data.slice(0, 10);
        let listText = `🎬 *CINESUBZ MOVIE SEARCH*\n\n🔍 *සෙව්වේ:* ${query}\n👇 *ඔබට අවශ්‍ය ෆිල්ම් එකේ අංකය Reply කරන්න*\n\n`;
        
        topResults.forEach((mv, index) => {
            listText += `*${index + 1}.* ${mv.title} (${mv.year || 'N/A'})\n`;
        });
        listText += `\n> **Reply with 1 - ${topResults.length}**`;

        const listMsg = await client.sendMessage(m.jid, { text: listText }, { quoted: getMetaQuote() });

        // Save context for reply listener
        global.cinesubzContexts[m.sender] = {
            step: "movie_select",
            searchMsgId: listMsg.key.id,
            results: topResults
        };
        
        setTimeout(() => { if (global.cinesubzContexts[m.sender]) delete global.cinesubzContexts[m.sender]; }, 60000);

    } catch (e) {
        console.error("Cinesubz Search Error:", e);
        await m.reply("❌ *සෙවීමේදී දෝෂයක් ඇතිවිය.*");
    }
});

// ==========================================
// 2. REPLY LISTENER (අංකය අල්ලා ගැනීමේ කොටස)
// ==========================================
Sparky({
    on: "text",
    fromMe: isPublic,
    dontAddCommandList: true
}, async ({ client, m }) => {
    let context = global.cinesubzContexts[m.sender];
    if (!context || !m.quoted || context.step !== "movie_select") return;

    // Check if replying to the exact search message
    if (m.quoted.key.id !== context.searchMsgId) return;

    let rawText = m.text || m.body || "";
    let selectedIndex = parseInt(rawText.trim()) - 1;

    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= context.results.length) {
        return await m.reply("❌ *වැරදි අංකයක්! කරුණාකර නිවැරදි අංකයක් reply කරන්න.*");
    }

    const selectedMovie = context.results[selectedIndex];
    delete global.cinesubzContexts[m.sender]; // වැඩේ ඉවර නිසා Context මකනවා

    try {
        await m.react("🎬");

        // Fetch details & links from API
        const extractUrl = `https://cinesubz-api-cnw.vercel.app/api/extract?id=${selectedMovie.id}&type=mv`;
        const { data: extData } = await axios.get(extractUrl);

        if (!extData.status || !extData.data || extData.data.length === 0) {
            return await m.reply("❌ *මෙම චිත්‍රපටියේ Direct Links ලබාගත නොහැක.*");
        }

        // Direct MP4 ලින්ක් එකක් තෝරා ගැනීම
        const directVideo = extData.data.find(v => v.is_direct_mp4) || extData.data[0];
        const baseLink = directVideo.link;

        const caption = `🎬 *${selectedMovie.title}*\n\n📅 *Year:* ${selectedMovie.year}\n🎭 *Genres:* ${selectedMovie.genres}\n⭐ *IMDB:* ${selectedMovie.imdb}\n\n> *ඔබට අවශ්‍ය Quality එක පහලින් තෝරන්න* ⬇️`;

        // Button IDs limit එක පනින්නේ නැති වෙන්න title එක පොඩි කරනවා
        const shortTitle = selectedMovie.title.substring(0, 20).replace(/[^a-zA-Z0-9 ]/g, "").trim();

        // 🔘 Interactive Buttons (යාළුවගේ විදිහටම)
        const buttons = [
            { buttonId: `.cz_dl ${shortTitle} || 480p || ${baseLink}`, buttonText: { displayText: "🎥 480p (SD)" }, type: 1 },
            { buttonId: `.cz_dl ${shortTitle} || 720p || ${baseLink}`, buttonText: { displayText: "🎥 720p (HD)" }, type: 1 }
        ];

        await client.sendMessage(m.jid, {
            image: { url: selectedMovie.img },
            caption: caption,
            footer: 'SADEW-X-MD Cinesubz',
            buttons: buttons,
            headerType: 4
        }, { quoted: m });

    } catch (e) {
        console.error("Movie Detail Fetch Error:", e);
        await m.reply("❌ *විස්තර ලබා ගැනීමේදී දෝෂයක් ඇතිවිය.*");
    }
});

// ==========================================
// 3. DOWNLOAD COMMAND (.cz_dl)
// ==========================================
Sparky({
    name: "cz_dl",
    fromMe: isPublic,
    dontAddCommandList: true
}, async ({ client, m, text }) => {
    // Buttons වලින් එන text එක අල්ලගන්නවා
    let inputData = text || "";
    if (!inputData.includes('||')) return;

    const [title, quality, originalUrl] = inputData.split(' || ');
    if (!originalUrl) return;

    try {
        await m.react("⬇️");
        await client.sendMessage(m.jid, { text: `⬇️ *Downloading ${title} (${quality})...*\n_මෙය විශාල file එකක් බැවින්, WhatsApp වෙත Upload වීමට ටික වේලාවක් ගත විය හැක._` }, { quoted: getMetaQuote() });

        // URL එකේ Quality එක වෙනස් කිරීම (720p -> 480p වගේ)
        let finalUrl = originalUrl.trim();
        let q = quality.trim();
        if (q === '480p') {
            finalUrl = finalUrl.replace(/(720p|1080p|1080|720)/i, '480p');
        } else if (q === '720p') {
            finalUrl = finalUrl.replace(/(480p|1080p|1080|480)/i, '720p');
        }
        
        // 1. File Size එක පරීක්ෂා කිරීම (2GB Limit Check)
        try {
            const headRes = await axios.head(finalUrl);
            if (headRes && headRes.headers['content-length']) {
                const sizeMB = parseInt(headRes.headers['content-length']) / (1024 * 1024);
                // 1.95 GB (1950 MB) ට වඩා වැඩි නම් නවත්වනවා (WhatsApp Document Limit)
                if (sizeMB > 1950) { 
                    await m.react("❌");
                    return await m.reply(`❌ *Error: File එක 2GB වලට වඩා විශාලයි! (${sizeMB.toFixed(2)} MB)*\nWhatsApp හරහා මෙය යැවිය නොහැක.`);
                }
            }
        } catch (headErr) {
            console.log("Size check failed, proceeding with direct upload...");
        }

        // 2. WhatsApp එකට Direct URL එකෙන් Document එකක් විදියට යැවීම
        const caption = `🎬 *${title.trim()}* [${q}]\n\n> **★👑𝙎𝘼𝘿𝙀𝙒-𝙓-𝙈𝘿🔥 ★ ✨**`;

        await client.sendMessage(m.jid, {
            document: { url: finalUrl }, // Disk එකට save කරන්නේ නැතුව කෙලින්ම URL එක දෙනවා
            mimetype: "video/mp4",
            fileName: `${title.trim()} - ${q}.mp4`,
            caption: caption
        }, { quoted: getMetaQuote() });

        await m.react("✅");

    } catch (e) {
        console.error("Cinesubz DL Error:", e.message);
        await m.react("❌");
        await m.reply("❌ *Download Failed! ලින්ක් එක දෝෂ සහිතයි හෝ Expire වී ඇත.*");
    }
});
