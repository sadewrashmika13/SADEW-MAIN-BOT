const { Sparky } = require("../lib");
const axios = require('axios');

// ==========================================
// 1. MOVIE SEARCH COMMAND (.cinesubz / .cz)
// ==========================================
Sparky({
    pattern: "cinesubz",
    alias: ["cz", "movie"],
    desc: "Search and get download links for movies from Cinesubz",
    category: "download",
    use: '.cinesubz <movie name>',
    filename: __filename
},
async ({ m, client, args }) => {
    try {
        // args හරහා යූසර් සර්ච් කරපු නම ලබා ගැනීම
        const query = args.join(" ");

        if (!query) {
            return await client.sendMessage(m.chat, { text: "🎬 *කරුණාකර Movie එකේ නම ලබා දෙන්න!*\n_උදා: .cz batman_" }, { quoted: m });
        }

        // Fake Quote (Meta AI Style) - Sadew MD නම යොදා ඇත
        const botName = "SADEW-MD";
        const metaQuote = {
            key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_CZ" },
            message: { contactMessage: { displayName: botName, vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${botName}\nORG:Cinesubz\nTEL;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
        };

        await client.sendMessage(m.chat, { react: { text: "🔍", key: m.key } });

        // Search API එකෙන් ඩේටා ෆෙච් කිරීම
        const searchUrl = `https://cinesubz-api-cnw.vercel.app/api/search?q=${encodeURIComponent(query)}`;
        const res = await axios.get(searchUrl);
        const data = res.data;

        if (!data.status || !data.data || data.data.length === 0) {
            return await client.sendMessage(m.chat, { text: "❌ *සමාවෙන්න, එම නමින් Movies කිසිවක් හමුවූයේ නැත.*" }, { quoted: m });
        }

        // මුල් ප්‍රතිපල 10 වෙන්කර ගැනීම
        const topResults = data.data.slice(0, 10);
        let listText = `🎬 *SADEW MD CINESUBZ MOVIE SEARCH*\n\n🔍 *සෙව්වේ:* ${query}\n👇 *ඔබට අවශ්‍ය ෆිල්ම් එකේ අංකය Reply කරන්න*\n\n`;
        
        topResults.forEach((mv, index) => {
            listText += `*${index + 1}.* ${mv.title} (${mv.year || 'N/A'})\n`;
        });
        listText += `\n> **Reply with 1 - ${topResults.length}**`;

        const listMsg = await client.sendMessage(m.chat, { text: listText }, { quoted: metaQuote });

        // ==========================================
        // REPLY LISTENER (අංකය අල්ලා ගැනීමේ කොටස)
        // ==========================================
        const listener = async ({ messages }) => {
            const replyMsg = messages[0];
            if (!replyMsg.message) return;

            const replyContext = replyMsg.message.extendedTextMessage?.contextInfo;
            const isReplyToBot = replyContext?.stanzaId === listMsg.key.id;

            if (isReplyToBot) {
                const userReply = (replyMsg.message.conversation || replyMsg.message.extendedTextMessage?.text || "").trim();
                const selectedIndex = parseInt(userReply) - 1;

                if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= topResults.length) {
                    return await client.sendMessage(m.chat, { text: "❌ *වැරදි අංකයක්! කරුණාකර නිවැරදි අංකයක් reply කරන්න.*" }, { quoted: replyMsg });
                }

                const selectedMovie = topResults[selectedIndex];

                try {
                    await client.sendMessage(m.chat, { react: { text: "🎬", key: replyMsg.key } });

                    // Extract API එකෙන් ඩීටේල්ස් ලබා ගැනීම
                    const extractUrl = `https://cinesubz-api-cnw.vercel.app/api/extract?id=${selectedMovie.id}&type=mv`;
                    const extRes = await axios.get(extractUrl);
                    const extData = extRes.data;

                    if (!extData.status || !extData.data || extData.data.length === 0) {
                        return await client.sendMessage(m.chat, { text: "❌ *මෙම චිත්‍රපටියේ Direct Links ලබාගත නොහැක.*" }, { quoted: replyMsg });
                    }

                    // Direct MP4 ලින්ක් එකක් තෝරා ගැනීම
                    const directVideo = extData.data.find(v => v.is_direct_mp4) || extData.data[0];
                    const baseLink = directVideo.link;

                    const caption = `🎬 *${selectedMovie.title}*\n\n📅 *Year:* ${selectedMovie.year}\n🎭 *Genres:* ${selectedMovie.genres}\n⭐ *IMDB:* ${selectedMovie.imdb}\n\n> *ඔබට අවශ්‍ය Quality එක පහලින් තෝරන්න* ⬇️`;

                    // Button IDs සීමාව පනින්නේ නැති වෙන්න title එක පොඩි කිරීම
                    const shortTitle = selectedMovie.title.substring(0, 20).replace(/[^a-zA-Z0-9 ]/g, "").trim();

                    // Buttons සැකසීම
                    const buttons = [
                        { buttonId: `.cz_dl ${shortTitle} || 480p || ${baseLink}`, buttonText: { displayText: "🎥 480p (SD)" }, type: 1 },
                        { buttonId: `.cz_dl ${shortTitle} || 720p || ${baseLink}`, buttonText: { displayText: "🎥 720p (HD)" }, type: 1 }
                    ];

                    await client.sendMessage(m.chat, {
                        image: { url: selectedMovie.img },
                        caption: caption,
                        footer: 'Sadew MD Cinesubz',
                        buttons: buttons,
                        headerType: 4
                    }, { quoted: replyMsg });
                    
                    // වැඩේ ඉවර නිසා Listener එක අයින් කිරීම
                    client.ev.off('messages.upsert', listener);

                } catch (e) {
                    console.error("Movie Detail Fetch Error:", e);
                }
            }
        };

        client.ev.on('messages.upsert', listener);
        setTimeout(() => { client.ev.off('messages.upsert', listener); }, 60000); // විනාඩියකින් ලැයිස්තුව අක්‍රිය වේ

    } catch (e) {
        console.error("Cinesubz Search Error:", e);
        await client.sendMessage(m.chat, { text: "❌ *සෙවීමේදී දෝෂයක් ඇතිවිය.*" }, { quoted: m });
    }
});

// ==========================================
// 2. MOVIE DOWNLOAD COMMAND (.cz_dl)
// ==========================================
Sparky({
    pattern: "cz_dl",
    dontAddCommandList: true, // මේක බටන් කමාන්ඩ් එකක් නිසා ලිස්ට් එකට දාන්න අවශ්‍ය නැහැ
    category: "download",
    filename: __filename
},
async ({ m, client, args }) => {
    // බටන් එකෙන් එන ID එක හෝ Text එක ලබා ගැනීම
    const textContent = m.message?.buttonsResponseMessage?.selectedButtonId || m.text || '';
    const inputData = textContent.replace(/^[.\/!#]cz_dl\s*/i, '').trim();
    
    if (!inputData.includes('||')) return;

    const [title, quality, originalUrl] = inputData.split(' || ');
    if (!originalUrl) return;

    const botName = "SADEW-MD";
    const metaQuote = {
        key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_CZ_DL" },
        message: { contactMessage: { displayName: botName, vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${botName}\nORG:Cinesubz Downloader\nTEL;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
    };

    try {
        await client.sendMessage(m.chat, { react: { text: "⬇️", key: m.key } });
        await client.sendMessage(m.chat, { text: `⬇️ *Downloading ${title} (${quality})...*\n_මෙය විශාල file එකක් බැවින්, WhatsApp වෙත Upload වීමට ටික වේලාවක් ගත විය හැක._` }, { quoted: metaQuote });

        // URL එකේ Quality එක ටැග් එක අනුව වෙනස් කිරීම
        let finalUrl = originalUrl;
        if (quality === '480p') {
            finalUrl = originalUrl.replace(/(720p|1080p|1080|720)/i, '480p');
        } else if (quality === '720p') {
            finalUrl = originalUrl.replace(/(480p|1080p|1080|480)/i, '720p');
        }
        
        // 1. File Size එක පරීක්ෂා කිරීම (2GB Limit Check)
        try {
            const headRes = await axios.head(finalUrl);
            if (headRes && headRes.headers['content-length']) {
                const sizeMB = parseInt(headRes.headers['content-length']) / (1024 * 1024);
                // 1.95 GB පැනලා නම් වට්ස්ඇප් යවන්න බැරි නිසා නවත්වනවා
                if (sizeMB > 1950) { 
                    await client.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
                    return await client.sendMessage(m.chat, { text: `❌ *Error: File එක 2GB වලට වඩා විශාලයි! (${sizeMB.toFixed(2)} MB)*\nWhatsApp හරහා මෙය යැවිය නොහැක.` }, { quoted: m });
                }
            }
        } catch (headErr) {
            console.log("Size check failed, proceeding with direct upload...");
        }

        // 2. WhatsApp එකට Direct URL එකෙන් Document එකක් විදියට යැවීම (No Disk Write)
        const caption = `🎬 *${title}* [${quality}]\n\n> **𝕊𝕒𝕕𝕖𝕨 𝕄𝔻 𝕄𝕚𝕟𝕚 ✨**`;

        await client.sendMessage(m.chat, {
            document: { url: finalUrl }, // GitHub Actions වල RAM/Buffer එකෙන් කෙලින්ම ස්ට්‍රීම් වෙනවා
            mimetype: "video/mp4",
            fileName: `${title} - ${quality}.mp4`,
            caption: caption
            }, { quoted: metaQuote });

        await client.sendMessage(m.chat, { react: { text: "✅", key: m.key } });

    } catch (e) {
        console.error("Cinesubz DL Error:", e.message);
        await client.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
        await client.sendMessage(m.chat, { text: "❌ *Download Failed! ලින්ක් එක දෝෂ සහිතයි හෝ Expire වී ඇත.*" }, { quoted: m });
    }
});
