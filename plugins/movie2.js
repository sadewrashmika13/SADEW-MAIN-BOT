const { Sparky, isPublic } = require("../lib");
const axios = require("axios");
const https = require("https");
const fs = require("fs");
const path = require("path");
const WebTorrent = require("webtorrent"); // 🔴 Torrent බාන්න මේක ඉන්ස්ටෝල් කරලා තියෙන්න ඕනේ

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// 1. Global Context (මල්ටි ස්ටේජ් මෙමරිය)
if (!global.moviePluginContext) global.moviePluginContext = {};

const API_BASE = "https://movies-api.accel.li/api/v2/list_movies.json";

// Trackers ලැයිස්තුව Magnet එක හදාගන්න
const torrentTrackers = [
    "udp://open.demonii.com:1337/announce",
    "udp://tracker.openbittorrent.com:80",
    "udp://tracker.coppersurfer.tk:6969",
    "udp://tracker.opentrackr.org:1337/announce",
    "udp://tracker.leechers-paradise.org:6969"
].map(t => `&tr=${encodeURIComponent(t)}`).join("");

// 2. Main Command (ෆිල්ම් එක සර්ච් කරලා ලිස්ට් එක දෙන කෑල්ල)
Sparky({
    name: "movie2",
    alias: ["yts", "torrentmovie"],
    fromMe: isPublic,
    category: "download",
    desc: "🎬 Search and Download Movies from YTS database"
}, async ({ client, m, args }) => {
    try {
        let movieSearch = args.join(" ").trim();
        if (!movieSearch) return m.reply("❌ *කරුණාකර චිත්‍රපටයේ නම ලබා දෙන්න.*\n\n*උදාහරණ:* `.movie2 Spider-Man`");

        try { if (typeof m.react === "function") await m.react("🔍"); } catch {}

        // YTS අලුත් API එකට රික්වෙස්ට් එක යවනවා
        let response = await axios.get(`${API_BASE}?query_term=${encodeURIComponent(movieSearch)}`, { timeout: 30000 });
        let resData = response.data;

        if (resData.status !== "ok" || !resData.data || resData.data.movie_count === 0 || !resData.data.movies) {
            return m.reply("❌ *ඔබ සෙවූ චිත්‍රපටය සොයාගත නොහැකි විය.*");
        }

        let moviesList = resData.data.movies.slice(0, 15); // මුල් ෆිල්ම් 15 විතරක් ගන්නවා
        let menuText = `🎬 *SADEW-MD MOVIE SEARCH* 🎬\n\n`;
        menuText += `🔎 *සෙවූ නම:* ${movieSearch}\n\n`;
        menuText += `*කරුණාකර ඔබට අවශ්‍ය චිත්‍රපටයේ අංකය මෙම පණිවිඩයට Reply කරන්න:*\n\n`;

        moviesList.forEach((movie, index) => {
            menuText += `*${index + 1}.* ${movie.title_long} (⭐ ${movie.rating || 'N/A'})\n`;
        });

        menuText += `\n📌 *Reply with the number only (e.g., 1)*`;

        let sentMsg = await client.sendMessage(m.jid, { text: menuText }, { quoted: m });

        // Stage 1 සේව් කරනවා මෙමරියට
        global.moviePluginContext[m.sender] = {
            quotedId: sentMsg.key.id,
            stage: "SELECT_MOVIE",
            movies: moviesList,
            timestamp: Date.now()
        };

    } catch (err) {
        console.error("Movie Search Error:", err.message);
        m.reply("❌ *චිත්‍රපට සෙවීමේදී දෝෂයක් සිදු විය.*");
    }
});

// 3. Multi-Stage Listener Command
Sparky({
    on: "text",
    fromMe: isPublic,
    dontAddCommandList: true
}, async ({ client, m }) => {
    let context = global.moviePluginContext[m.sender];
    if (!context || !m.quoted || m.quoted.key.id !== context.quotedId) return;

    let choice = parseInt(m.text.trim());
    if (isNaN(choice)) return;

    // 🔴 STAGE 1: යූසර් ෆිල්ම් එක තේරුවාම, කොලිටි මෙනු එක දෙන කෑල්ල
    if (context.stage === "SELECT_MOVIE") {
        if (choice < 1 || choice > context.movies.length) {
            return m.reply(`❌ *කරුණාකර 1 ත් ${context.movies.length} ත් අතර නිවැරදි අංකයක් ලබා දෙන්න.*`);
        }

        let selectedMovie = context.movies[choice - 1];

        if (!selectedMovie.torrents || selectedMovie.torrents.length === 0) {
            return m.reply("❌ *මෙම චිත්‍රපටය සඳහා ඩවුන්ලෝඩ් ලින්ක්ස් කිසිවක් නැත.*");
        }

        let qualityMenu = `✨ *SELECT MOVIE QUALITY* ✨\n\n`;
        qualityMenu += `🎬 *Movie:* ${selectedMovie.title_long}\n`;
        qualityMenu += `🎭 *Genres:* ${selectedMovie.genres ? selectedMovie.genres.join(", ") : "N/A"}\n\n`;
        qualityMenu += `*කරුණාකර ඔබට අවශ්‍ය Quality අංකය මෙම පණිවිඩයට Reply කරන්න:*\n\n`;

        selectedMovie.torrents.forEach((tor, index) => {
            qualityMenu += `*${index + 1}.* ${tor.quality} (${tor.type.toUpperCase()}) - 💾 Size: ${tor.size}\n`;
        });

        qualityMenu += `\n📌 *Reply with the number only (e.g., 2)*`;

        // පරණ මැසේජ් එක වෙනුවට අලුත් කොලිටි මැසේජ් එක යවනවා
        let newSentMsg = await client.sendMessage(m.jid, { text: qualityMenu }, { quoted: m });

        // Stage 2 එකට මෙමරිය අප්ඩේට් කරනවා
        global.moviePluginContext[m.sender] = {
            quotedId: newSentMsg.key.id,
            stage: "SELECT_QUALITY",
            movie: selectedMovie,
            timestamp: Date.now()
        };
        return;
    }

    // 🔴 STAGE 2: යූසර් කොලිටි එක තේරුවාම, ඩවුන්ලෝඩ් කරලා වට්ස්ඇප් යවන කෑල්ල
    if (context.stage === "SELECT_QUALITY") {
        let currentMovie = context.movie;
        if (choice < 1 || choice > currentMovie.torrents.length) {
            return m.reply(`❌ *කරුණාකර නිවැරදි Quality අංකයක් තෝරන්න.*`);
        }

        let selectedTorrent = currentMovie.torrents[choice - 1];
        
        // වැඩේ පටන් ගන්න නිසා මෙමරිය මකනවා
        delete global.moviePluginContext[m.sender];

        try { if (typeof m.react === "function") await m.react("⏳"); } catch {}
        await m.reply(`📥 *චිත්‍රපටය බාගත කිරීම ආරම්භ කලා...*\n\n🎬 *Movie:* ${currentMovie.title_long}\n🎨 *Quality:* ${selectedTorrent.quality}\n💾 *Size:* ${selectedTorrent.size}\n\n_මෙය Torrent එකක් බැවින් සයිස් එක අනුව විනාඩි කිහිපයක් ගත විය හැක. කරුණාකර රැඳී සිටින්න..._`);

        // Magnet ලින්ක් එක හදාගන්නවා Hash එකෙන්
        let magnetLink = `magnet:?xt=urn:btih:${selectedTorrent.hash}&dn=${encodeURIComponent(currentMovie.title)}` + torrentTrackers;
        
        // ඩවුන්ලෝඩ් ෆයිල් එක සේව් වෙන පාත් එක
        const downloadDir = path.join(__dirname, "../cache");
        if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir);
        
        const torrentClient = new WebTorrent();

        // Torrent එක බාන්න පටන් ගන්නවා
        torrentClient.add(magnetLink, { path: downloadDir }, (torrent) => {
            
            // ෆිල්ම් එකේ ලොකුම ෆයිල් එක (mp4/mkv) විතරක් හොයාගන්නවා
            let file = torrent.files.find(f => f.name.endsWith(".mp4") || f.name.endsWith(".mkv") || f.name.endsWith(".avi"));
            
            if (!file) {
                torrentClient.destroy();
                return m.reply("❌ *Torrent එක ඇතුළේ වීඩියෝ ෆයිල් එකක් සොයාගත නොහැකි විය.*");
            }

            let finalFilePath = path.join(downloadDir, file.name);

            // ඩවුන්ලෝඩ් එක ඉවර වුණාම ක්‍රියාත්මක වෙන කොටස
            torrent.on("done", async () => {
                try {
                    await m.reply(`📦 *බාගත කිරීම සාර්ථකයි! දැන් වට්ස්ඇප් වෙත අප්ලෝඩ් වෙමින් පවතී...*`);
                    
                    let captionText = `🎬 *SADEW-MD MOVIE DOWNLOADER* ✨\n\n`;
                    captionText += `🎥 *Name:* ${currentMovie.title_long}\n`;
                    captionText += `🎨 *Quality:* ${selectedTorrent.quality}\n`;
                    captionText += `💾 *Size:* ${selectedTorrent.size}`;

                    // වට්ස්ඇප් එකට Full HD ලොකු ෆයිල් එකක් විදිහට සෙන්ඩ් කරනවා (Document Mode)
                    await client.sendMessage(m.jid, {
                        document: fs.readFileSync(finalFilePath),
                        mimetype: "video/mp4",
                        fileName: file.name,
                        caption: captionText
                    }, { quoted: m });

                    try { if (typeof m.react === "function") await m.react("✅"); } catch {}

                } catch (sendErr) {
                    console.error("Upload Error:", sendErr);
                    m.reply(`❌ *ෆයිල් එක වට්ස්ඇප් එකට එවන්න බැරි වුණා.*\nහේතුව: ${sendErr.message}`);
                } finally {
                    // ඉඩ ඉතුරු කරගන්න බාපු ෆයිල් එක සර්වර් එකෙන් ඩිලීට් කරනවා
                    if (fs.existsSync(finalFilePath)) fs.unlinkSync(finalFilePath);
                    torrentClient.destroy();
                }
            });

            // ඩවුන්ලෝඩ් එකේදී මොකක් හරි අවුලක් වුණොත්
            torrent.on("error", (err) => {
                console.error("Torrent Processing Error:", err);
                m.reply(`❌ *Torrent එක ක්‍රියාත්මක කිරීමේදී දෝෂයක් ආවා:* ${err.message}`);
                torrentClient.destroy();
            });
        });

    }
});
