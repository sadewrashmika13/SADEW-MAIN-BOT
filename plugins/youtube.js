const {
  Sparky,
  isPublic,
  YtInfo,
  yts
} = require("../lib");
const { getString, isUrl } = require('./pluginsCore');
const axios = require('axios'); // ⚡ සුපිරි වේගවත් RAM Streaming සහ HTTP Requests සඳහා
const lang = getString('download');

// 🌐 සර්වර් බ්ලොක් සහ Speed Limits මුළුමනින්ම මඟහැරීමට පාවිච්චි කරන Headers
const SAFE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "*/*"
};

// ==========================================
// 🔎 1. YTS COMMAND (NATIVE NOP-DELAY SEARCH)
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
// 🎬 2. YTV COMMAND (ULTRA BACKUP VIDEO ENGINE)
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
      let videoUrl = null;

      // 🚀 Server 1: BK9 High-Speed MP4 Engine
      try {
          const res = await axios.get("https://bk9.fun/download/ytmp4?url=" + encodeURIComponent(query), { timeout: 9000 });
          videoUrl = res.data?.result?.download || res.data?.BK9?.download || res.data?.result?.url;
      } catch (e) { console.log("Video Server 1 Down..."); }

      // 🚀 Server 2: BTCH Global Bypass Engine
      if (!videoUrl) {
          try {
              const res = await axios.get("https://api.btch.bx2.xyz/api/download/ytmp4?url=" + encodeURIComponent(query), { timeout: 9000 });
              videoUrl = res.data?.result?.video || res.data?.result?.url || res.data?.result;
          } catch (e) { console.log("Video Server 2 Down..."); }
      }

      if (!videoUrl) {
          await m.react('❌');
          return m.reply("_❌ වීඩියෝ සර්වර්ස් සියල්ලම මේ වෙලාවේ කාර්යබහුලයි. පසුව උත්සාහ කරන්න!_");
      }

      // Stream Direct To Buffer
      const stream = await axios.get(videoUrl, { responseType: 'arraybuffer', headers: SAFE_HEADERS, timeout: 50000 });
      const buffer = Buffer.from(stream.data);

      await m.react('✅');
      return await client.sendMessage(m.jid, { video: buffer, mimetype: 'video/mp4' }, { quoted: m });
    } catch (error) {
      await m.react('❌');
      m.reply(`_❌ Error: ${error.message}_`);
    }
});

// ==========================================
// 🎵 3. YTA COMMAND (TURBO AUDIO ENGINE)
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
      let mp3Url = null;
      
      // 🚀 Server 1: BK9 Audio Engine
      try {
          const res = await axios.get("https://bk9.fun/download/ytmp3?url=" + encodeURIComponent(query), { timeout: 9000 });
          mp3Url = res.data?.result?.download || res.data?.BK9?.download || res.data?.result?.url;
      } catch (e) {}

      // 🚀 Server 2: BTCH Audio Engine
      if (!mp3Url) {
          try {
              const res = await axios.get("https://api.btch.bx2.xyz/api/download/ytmp3?url=" + encodeURIComponent(query), { timeout: 9000 });
              mp3Url = res.data?.result?.audio || res.data?.result?.url;
          } catch (e) {}
      }

      // 🚀 Server 3: Vreden Premium Multi-DL
      if (!mp3Url) {
          try {
              const res = await axios.get("https://api.vreden.my.id/api/ytmp3?url=" + encodeURIComponent(query), { timeout: 9000 });
              mp3Url = res.data?.result?.download?.url || res.data?.result?.url;
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
// 🚀 4 & 5. PLAY & SONG HYBRID TURBO ENGINE
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

      let finalMp3Url = null;

      // 🚀 Try Server 1 (BK9 Engine)
      try {
          const res = await axios.get("https://bk9.fun/download/ytmp3?url=" + encodeURIComponent(play.url), { timeout: 9000 });
          finalMp3Url = res.data?.result?.download || res.data?.BK9?.download || res.data?.result?.url;
      } catch (e) {}

      // 🚀 Try Server 2 (BTCH Engine)
      if (!finalMp3Url) {
          try {
              const res = await axios.get("https://api.btch.bx2.xyz/api/download/ytmp3?url=" + encodeURIComponent(play.url), { timeout: 9000 });
              finalMp3Url = res.data?.result?.audio || res.data?.result?.url;
          } catch (e) {}
      }

      // 🚀 Try Server 3 (Vreden Engine)
      if (!finalMp3Url) {
          try {
              const res = await axios.get("https://api.vreden.my.id/api/ytmp3?url=" + encodeURIComponent(play.url), { timeout: 9000 });
              finalMp3Url = res.data?.result?.download?.url || res.data?.result?.url;
          } catch (e) {}
      }

      if (!finalMp3Url) {
          await m.react('❌');
          return m.reply("_❌ සින්දුව බාගන්න ලැබුනේ නැහැ, සර්වර්ස් සියල්ලම බිසී! පොඩ්ඩකින් ආයෙ ට්‍රැයි කරන්න._");
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
