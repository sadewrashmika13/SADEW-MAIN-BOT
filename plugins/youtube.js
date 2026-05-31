const {
  Sparky,
  isPublic,
  YtInfo,
  yts
} = require("../lib");
const { getString, isUrl } = require('./pluginsCore');
const axios = require('axios');
const lang = getString('download');

// 🌐 ඩවුන්ලෝඩ් ස්පීඩ් එක උපරිම කිරීමට සහ සර්වර් බ්ලොක් මඟහැරීමට Headers
const SAFE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "*/*"
};

// ==========================================
// 🔎 1. YTS COMMAND (NATIVE ULTRA-FAST SEARCH)
// ==========================================
Sparky({
  name: "yts",
  fromMe: isPublic,
  category: "youtube",
  desc: "search in youtube"
}, async ({ m, client, args }) => {
  if (!args) return await m.reply(lang.NEED_Q);
  
  await m.react('🔎');
  try {
    if (await isUrl(args)) {
      const yt = await YtInfo(args);
      return await client.sendMessage(m.jid, { image: { url: yt.thumbnail }, caption: "*title :* " + yt.title + "\n*author :* " + yt.author + "\n*url :* " + args + "\n*video id :* " + yt.videoId });
    } else {
      // බාහිර API එකක් වෙනුවට බොට්ගේම Local Engine එකෙන් සර්ච් කරන නිසා කිසිම ලැග් එකක් නැත
      const videos = await yts(args);
      if (!videos || videos.length === 0) return m.reply("_❌ සර්ච් රිසල්ට් කිසිවක් හමුවුණේ නැහැ._");
      
      const result = videos.slice(0, 8).map(video => `*🏷️ Title :* _*${video.title}*_\n*📁 Duration :* _${video.duration}_\n*🔗 Link :* _${video.url}_`);
      return await m.reply(`\n\n_*Result Of ${args} 🔍*_\n\n` + result.join('\n\n'));
    }
  } catch (error) {
    await m.react('❌');
    return m.reply(`_❌ Search Error: ${error.message}_`);
  }
});

// ==========================================
// 🎬 2. YTV COMMAND (TURBO SPEED VIDEO ENGINE)
// ==========================================
Sparky({
  name: "ytv",
  fromMe: isPublic,
  category: "youtube",
  desc: "Find details of a song"
}, async ({ m, client, args }) => {
    try {
      args = args || m.quoted?.text;
      if (!args) return await m.reply(lang.NEED_URL);
      if (!await isUrl(args)) return await m.reply(lang.INVALID_LINK);
      
      await m.react('⬇️');
      let videoUrl = null;

      // New Active Server 1: Maher Zubair Core Engine
      try {
          const res = await axios.get("https://api.maher-zubair.tech" + "/download/ytmp4?url=" + encodeURIComponent(args), { timeout: 8000 });
          videoUrl = res.data?.result?.link || res.data?.result?.url;
      } catch (e) { console.log("Video Server 1 down, trying Server 2..."); }

      // Backup Server 2: Dreaded Global Downloader
      if (!videoUrl) {
          try {
              const res = await axios.get("https://api." + "dreaded" + ".site/api/ytdl?url=" + encodeURIComponent(args), { timeout: 8000 });
              videoUrl = res.data?.result?.video || res.data?.result?.download;
          } catch (e) {}
      }

      if (!videoUrl) {
          await m.react('❌');
          return m.reply("_❌ වීඩියෝ සර්වර්ස් සියල්ලම කාර්යබහුලයි. පසුව උත්සාහ කරන්න!_");
      }

      // Buffer Streaming directly to RAM
      const stream = await axios.get(videoUrl, { responseType: 'arraybuffer', headers: SAFE_HEADERS, timeout: 45000 });
      const buffer = Buffer.from(stream.data);

      await m.react('✅');
      return await client.sendMessage(m.jid, { video: buffer, mimetype: 'video/mp4' }, { quoted: m });
    } catch (error) {
      await m.react('❌');
      m.reply(`_❌ Error: ${error.message}_`);
    }
});

// ==========================================
// 🎵 3. YTA COMMAND (HIGH QUALITY AUDIO ENGINE)
// ==========================================
Sparky({
  name: "yta",
  fromMe: isPublic,
  category: "youtube",
  desc: "Find details of a song"
}, async ({ m, client, args }) => {
    try {
      args = args || m.quoted?.text;
      if (!args) return await m.reply(lang.NEED_URL);
      if (!await isUrl(args)) return await m.reply(lang.INVALID_LINK);
      
      await m.react('⬇️');
      let mp3Url = null;
      
      // New Active Server 1: Maher Zubair Core Engine
      try {
          const res = await axios.get("https://api.maher-zubair.tech" + "/download/ytmp3?url=" + encodeURIComponent(args), { timeout: 8000 });
          mp3Url = res.data?.result?.link || res.data?.result?.url;
      } catch (e) {}

      // Backup Server 2: Dreaded Global Downloader
      if (!mp3Url) {
          try {
              const res = await axios.get("https://api." + "dreaded" + ".site/api/ytdl?url=" + encodeURIComponent(args), { timeout: 8000 });
              mp3Url = res.data?.result?.audio || res.data?.result?.mp3;
          } catch (e) {}
      }

      if (!mp3Url) {
          await m.react('❌');
          return m.reply("_❌ ඕඩියෝ සර්වර්ස් සියල්ලම කාර්යබහුලයි. පසුව උත්සාහ කරන්න!_");
      }

      const stream = await axios.get(mp3Url, { responseType: 'arraybuffer', headers: SAFE_HEADERS, timeout: 35000 });
      const buffer = Buffer.from(stream.data);

      await m.react('✅');
      return await client.sendMessage(m.jid, { audio: buffer, mimetype: 'audio/mpeg', ptt: false }, { quoted: m });
    } catch (error) {
      await m.react('❌');
      m.reply(`_❌ Error: ${error.message}_`);
    }
});

// ==========================================
// 🚀 4 & 5. PLAY & SONG HYBRID TUNED ENGINE
// ==========================================
const playSongHandler = async ({ m, client, args }) => {
    try {
      args = args || m.quoted?.text;
      if (!args) return await m.reply(lang.NEED_Q);
      
      await m.react('🔎');
      
      // 100% Stable Local Search - කිසිලෙසකවත් ටයිම්අවුට් නොවේ
      const searchList = await yts(args);
      if (!searchList || searchList.length === 0) {
          await m.react('❌');
          return m.reply("_❌ මචං ඔය නමින් සින්දුවක් YouTube එකෙන් හොයාගන්න ලැබුණේ නැහැ!_");
      }
      
      const play = searchList[0];
      await m.reply(`_*📥 Downloading:* ${play.title}_`);
      await m.react('⬇️');

      let finalMp3Url = null;

      // Server 1 Fetch
      try {
          const res = await axios.get("https://api.maher-zubair.tech" + "/download/ytmp3?url=" + encodeURIComponent(play.url), { timeout: 8000 });
          finalMp3Url = res.data?.result?.link || res.data?.result?.url;
      } catch (e) {}

      // Server 2 Fetch (Fallback)
      if (!finalMp3Url) {
          try {
              const res = await axios.get("https://api." + "dreaded" + ".site/api/ytdl?url=" + encodeURIComponent(play.url), { timeout: 8000 });
              finalMp3Url = res.data?.result?.audio || res.data?.result?.mp3;
          } catch (e) {}
      }

      if (!finalMp3Url) {
          await m.react('❌');
          return m.reply("_❌ සින්දුව ඩවුන්ලෝඩ් කරගන්න ලැබුනේ නැහැ, සර්වර්ස් ඩවුන්! පොඩ්ඩකින් ආයෙ ට්‍රැයි කරන්න._");
      }

      // Fast Stream to RAM Buffer
      const audioStream = await axios.get(finalMp3Url, { responseType: 'arraybuffer', headers: SAFE_HEADERS, timeout: 35000 });
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
