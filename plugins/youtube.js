const {
  Sparky,
  isPublic,
  YtInfo,
  yts
} = require("../lib");
const { getString, isUrl } = require('./pluginsCore');
const axios = require('axios'); // ⚡ සුපිරි වේගවත් RAM Streaming සහ HTTP Requests සඳහා
const lang = getString('download');

// 🔑 Asitha Premium API සැකසුම්
const API_KEY = "f8deeb99a26a9666731c6b5dede05914c64ab64ca9b4cfeee8859408a3f9ce30"; 
const API_BASE_URL = "https://back.asitha.top/api/ytapi";

const SAFE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "*/*"
};

// 🛠️ Premium API එකෙන් ලින්ක් එක ගන්නා පොදු Helper Function එක
async function fetchPremiumLink(videoUrl, isVideo = false) {
    try {
        // ඔයා දුන්නු Recommended Authorization Header ක්‍රමය
        const response = await axios.get(API_BASE_URL, {
            params: {
                url: videoUrl,
                fo: isVideo ? "1" : "2", // 1 = Video, 2 = Audio (API Standard)
                qu: isVideo ? "360" : "128"
            },
            headers: {
                'Authorization': `Bearer ${API_KEY}`, 
            },
            timeout: 12000
        });

        const d = response.data?.result || response.data?.data || response.data;
        return d?.download || d?.link || d?.url || d?.audio || d?.video;
    } catch (error) {
        console.error("Premium API Error, trying fallback parameters...", error.message);
        try {
            // Alternative parameter structure just in case
            const altResponse = await axios.get(API_BASE_URL, {
                params: { url: videoUrl, fo: "1", qu: "144" },
                headers: { 'Authorization': `Bearer ${API_KEY}` },
                timeout: 10000
            });
            const d2 = altResponse.data?.result || altResponse.data;
            return d2?.download || d2?.link || d2?.url;
        } catch (e) {
            return null;
        }
    }
}

// ==========================================
// 🔎 1. YTS COMMAND (NATIVE NO-DELAY SEARCH)
// ==========================================
Sparky({
  name: "yts",
  fromMe: isPublic,
  category: "youtube",
  desc: "search in youtube"
}, async ({ m, client, args }) => {
  const query = Array.isArray(args) ? args.join(" ") : args;
  if (!query) return await m.reply(lang.NEED_Q);
  
  await m.react('🔎');
  try {
    if (await isUrl(query)) {
      const yt = await YtInfo(query);
      return await client.sendMessage(m.jid, { image: { url: yt.thumbnail }, caption: "*title :* " + yt.title + "\n*author :* " + yt.author + "\n*url :* " + query + "\n*video id :* " + yt.videoId });
    } else {
      const videos = await yts(query);
      if (!videos || videos.length === 0) return m.reply("_❌ සර්ච් රිසල්ට් කිසිවක් හමුවුණේ නැහැ._");
      
      const result = videos.slice(0, 8).map(video => `*🏷️ Title :* _*${video.title}*_\n*📁 Duration :* _${video.duration}_\n*🔗 Link :* _${video.url}_`);
      return await m.reply(`\n\n_*Result Of ${query} 🔍*_\n\n` + result.join('\n\n'));
    }
  } catch (error) {
    await m.react('❌');
    return m.reply(`_❌ Search Error: ${error.message}_`);
  }
});

// ==========================================
// 🎬 2. YTV COMMAND (PREMIUM VIDEO DOWNLOADER)
// ==========================================
Sparky({
  name: "ytv",
  fromMe: isPublic,
  category: "youtube",
  desc: "Find details of a song"
}, async ({ m, client, args }) => {
    try {
      args = args || m.quoted?.text;
      const query = Array.isArray(args) ? args.join(" ") : args;
      if (!query) return await m.reply(lang.NEED_URL);
      if (!await isUrl(query)) return await m.reply(lang.INVALID_LINK);
      
      await m.react('⬇️');
      
      // 🥇 1st Choice: Asitha Premium API (Ultra Fast)
      let videoUrl = await fetchPremiumLink(query, true);

      // 🥈 2nd Choice: Public Backup Engine (If premium fails)
      if (!videoUrl) {
          try {
              const res = await axios.get("https://bk9.fun/download/ytmp4?url=" + encodeURIComponent(query), { timeout: 8000 });
              videoUrl = res.data?.result?.download || res.data?.result?.url;
          } catch (e) {}
      }

      if (!videoUrl) {
          await m.react('❌');
          return m.reply("_❌ වීඩියෝ සර්වර්ස් සියල්ලම මේ වෙලාවේ කාර්යබහුලයි. පසුව උත්සාහ කරන්න!_");
      }

      // Stream Buffer Directly to WhatsApp (No lagging)
      const stream = await axios.get(videoUrl, { responseType: 'arraybuffer', headers: SAFE_HEADERS, timeout: 60000 });
      const buffer = Buffer.from(stream.data);

      await m.react('✅');
      return await client.sendMessage(m.jid, { video: buffer, mimetype: 'video/mp4' }, { quoted: m });
    } catch (error) {
      await m.react('❌');
      m.reply(`_❌ Error: ${error.message}_`);
    }
});

// ==========================================
// 🎵 3. YTA COMMAND (PREMIUM AUDIO DOWNLOADER)
// ==========================================
Sparky({
  name: "yta",
  fromMe: isPublic,
  category: "youtube",
  desc: "Find details of a song"
}, async ({ m, client, args }) => {
    try {
      args = args || m.quoted?.text;
      const query = Array.isArray(args) ? args.join(" ") : args;
      if (!query) return await m.reply(lang.NEED_URL);
      if (!await isUrl(query)) return await m.reply(lang.INVALID_LINK);
      
      await m.react('⬇️');
      
      // 🥇 1st Choice: Asitha Premium API
      let mp3Url = await fetchPremiumLink(query, false);
      
      // 🥈 2nd Choice: Public Backup Engine
      if (!mp3Url) {
          try {
              const res = await axios.get("https://bk9.fun/download/ytmp3?url=" + encodeURIComponent(query), { timeout: 8000 });
              mp3Url = res.data?.result?.download || res.data?.result?.url;
          } catch (e) {}
      }

      if (!mp3Url) {
          await m.react('❌');
          return m.reply("_❌ ඕඩියෝ සර්වර්ස් සියල්ලම කාර්යබහුලයි. පසුව උත්සාහ කරන්න!_");
      }

      const stream = await axios.get(mp3Url, { responseType: 'arraybuffer', headers: SAFE_HEADERS, timeout: 40000 });
      const buffer = Buffer.from(stream.data);

      await m.react('✅');
      return await client.sendMessage(m.jid, { audio: buffer, mimetype: 'audio/mpeg', ptt: false }, { quoted: m });
    } catch (error) {
      await m.react('❌');
      m.reply(`_❌ Error: ${error.message}_`);
    }
});

// ==========================================
// 🚀 4 & 5. PLAY & SONG HYBRID PREMIUM ENGINE
// ==========================================
const playSongHandler = async ({ m, client, args }) => {
    try {
      args = args || m.quoted?.text;
      const query = Array.isArray(args) ? args.join(" ") : args;
      if (!query) return await m.reply(lang.NEED_Q);
      
      await m.react('🔎');
      
      // Local Stable Search Engine
      const searchList = await yts(query);
      if (!searchList || searchList.length === 0) {
          await m.react('❌');
          return m.reply("_❌ මචං ඔය නමින් සින්දුවක් YouTube එකෙන් හොයාගන්න ලැබුණේ නැහැ!_");
      }
      
      const play = searchList[0];
      await m.reply(`_*📥 Downloading:* ${play.title}_`);
      await m.react('⬇️');

      // 🥇 1st Choice: Asitha Premium API Fetch
      let finalMp3Url = await fetchPremiumLink(play.url, false);

      // 🥈 2nd Choice: Backup Engine Fetch
      if (!finalMp3Url) {
          try {
              const res = await axios.get("https://bk9.fun/download/ytmp3?url=" + encodeURIComponent(play.url), { timeout: 8000 });
              finalMp3Url = res.data?.result?.download || res.data?.result?.url;
          } catch (e) {}
      }

      if (!finalMp3Url) {
          await m.react('❌');
          return m.reply("_❌ සින්දුව බාගන්න ලැබුනේ නැහැ, සර්වර්ස් සියල්ලම බිසී! පොඩ්ඩකින් ආයෙ ට්‍රැයි කරන්න._");
      }

      // Fast Stream to RAM Buffer
      const audioStream = await axios.get(finalMp3Url, { responseType: 'arraybuffer', headers: SAFE_HEADERS, timeout: 40000 });
      const audioBuffer = Buffer.from(audioStream.data);

      await m.react('✅');
      return await client.sendMessage(m.jid, { audio: audioBuffer, mimetype: 'audio/mpeg', ptt: false }, { quoted: m });
    } catch (error) {
      await m.react('❌');
      m.reply(`_❌ Error: ${error.message}_`);
    }
};

Sparky({ name: "play", fromMe: isPublic, category: "youtube", desc: "play a song" }, playSongHandler);
Sparky({ name: "song", fromMe: isPublic, category: "youtube", desc: "play a song" }, playSongHandler);
