// commands/sinhalasub.js (replace your existing file)
const { Sparky } = require("../lib");
const axios = require("axios");
const config = require("../config");

const API_KEY = config.SINHALASUB_API_KEY || "zanta_fCZXpI08BXyizOiRJlDBShW6";
const API_BASE = "https://api.zanta-mini.store/api/sinhalasub";
const userSessions = new Map();

function getQuery(args) {
  if (!args) return "";
  if (Array.isArray(args)) return args.join(" ").trim();
  if (typeof args === "string") return args.trim();
  if (typeof args === "object") return Object.values(args).join(" ").trim();
  return "";
}

function setSessionTimeout(jid) {
  setTimeout(() => userSessions.delete(jid), 5 * 60 * 1000);
}

// Main search command
Sparky({
  name: "sinhalasub",
  category: "download",
  fromMe: false,
  desc: "🎬 සිංහල චිත්‍රපට සොයා බාගන්න"
}, async ({ client, m, args }) => {
  try {
    const query = getQuery(args);
    const jid = m.sender;

    if (userSessions.has(jid)) {
      return m.reply(`⚠️ සැසියක් පවතී. \`${m.prefix}cancel\` ටයිප් කර අවලංගු කරන්න.`);
    }
    if (!query) {
      return m.reply(`📌 *සිංහල චිත්‍රපට සෙවුම*\n\nභාවිතය: \`${m.prefix}sinhalasub චිත්‍රපට නම\`\nඋදා: \`${m.prefix}sinhalasub RRR\``);
    }

    await m.react("⏳");
    const searchUrl = `${API_BASE}/search?apiKey=${API_KEY}&text=${encodeURIComponent(query)}`;
    const { data } = await axios.get(searchUrl, { timeout: 15000 });

    if (!data?.success || !data.results?.length) {
      await m.react("❌");
      return m.reply(`😞 *${query}* සඳහා ප්‍රතිඵල නැත.`);
    }

    const results = data.results.slice(0, 8);
    let listMsg = `🎬 *"${query}"* සඳහා ප්‍රතිඵල:\n\n`;
    results.forEach((movie, i) => { listMsg += `${i+1}. ${movie.title}\n`; });
    listMsg += `\n📌 *ඊළඟ පියවර:* ඔබට අවශ්‍ය චිත්‍රපටයේ **අංකය පෙරවරු සමඟ** (උදා: \`${m.prefix}1\`) මෙම පණිවිඩයට **Reply** කරන්න.`;

    const sent = await client.sendMessage(m.jid, { text: listMsg }, { quoted: m });
    userSessions.set(jid, { step: "movie", results, listMsgId: sent.key.id, prefix: m.prefix });
    setSessionTimeout(jid);
    await m.react("✅");
  } catch (err) {
    console.error(err);
    await m.react("❌");
    m.reply(`⚠️ සෙවුම අසාර්ථකයි: ${err.message}`);
  }
});

// This command triggers when user types .1, .2, etc. (number with prefix)
Sparky({
  name: "subreply",
  pattern: /^\d+$/,
  fromMe: false,
  dontAddCommandList: true,
  desc: "internal"
}, async ({ client, m, args }) => {
  const jid = m.sender;
  const session = userSessions.get(jid);
  if (!session) return;
  if (!m.quoted || m.quoted.key.id !== session.listMsgId) return;

  const num = parseInt(args[0]);
  if (session.step === "movie") {
    const idx = num - 1;
    if (idx < 0 || idx >= session.results.length) {
      return m.reply(`❌ 1-${session.results.length} අතර අංකයක් එවන්න.`);
    }
    const movie = session.results[idx];
    await m.reply(`⏳ *${movie.title}* සඳහා quality ලබා ගැනීම...`);

    const dlUrl = `${API_BASE}/dl?apiKey=${API_KEY}&text=${encodeURIComponent(movie.url)}`;
    const { data } = await axios.get(dlUrl, { timeout: 15000 });

    if (!data?.success || !data.results?.links?.length) {
      await m.reply(`❌ ${movie.title} සඳහා quality links හමු නොවුණා.`);
      userSessions.delete(jid);
      return;
    }

    const allLinks = data.results.links;
    const videoLinks = allLinks.filter(l => l.quality !== "Subtitles");
    const subLink = allLinks.find(l => l.quality === "Subtitles" && l.size === "SRT");

    if (!videoLinks.length) {
      await m.reply(`❌ වීඩියෝ links නැත.`);
      userSessions.delete(jid);
      return;
    }

    let qualMsg = `🎬 *${movie.title}*\n📥 ගුණාත්මක තේරීම:\n\n`;
    videoLinks.forEach((l, i) => { qualMsg += `${i+1}. ${l.quality} (${l.size || "N/A"})\n`; });
    if (subLink) qualMsg += `\n🔤 උපසිරැසි පමණක්: ${videoLinks.length+1}\n`;
    qualMsg += `\n📌 අංකය **පෙරවරු සමඟ** (උදා: \`${session.prefix}2\`) මෙම පණිවිඩයට Reply කරන්න.`;

    const qualSent = await client.sendMessage(m.jid, { text: qualMsg }, { quoted: m });
    session.step = "quality";
    session.videoLinks = videoLinks;
    session.subLink = subLink;
    session.movieTitle = movie.title;
    session.qualMsgId = qualSent.key.id;
    userSessions.set(jid, session);
    setSessionTimeout(jid);
    return;
  }

  if (session.step === "quality" && m.quoted.key.id === session.qualMsgId) {
    const idx = num - 1;
    const videoLinks = session.videoLinks;
    const subLink = session.subLink;
    if (subLink && idx === videoLinks.length) {
      await client.sendMessage(m.jid, { text: `✅ *${session.movieTitle}* SRT උපසිරැසි:\n${subLink.direct_link}` }, { quoted: m });
      userSessions.delete(jid);
      return;
    }
    if (idx < 0 || idx >= videoLinks.length) {
      return m.reply(`❌ 1-${videoLinks.length + (subLink ? 1 : 0)} අතර අංකයක් එවන්න.`);
    }
    const selected = videoLinks[idx];
    await client.sendMessage(m.jid, { text: `🎬 *${session.movieTitle}*\n📀 Quality: ${selected.quality}\n📦 Size: ${selected.size}\n\n🔗 *Download Link:* ${selected.direct_link}${session.subLink ? `\n\n📝 Subtitles: ${session.subLink.direct_link}` : ""}` }, { quoted: m });
    userSessions.delete(jid);
  }
});

// Cancel command
Sparky({
  name: "cancel",
  category: "tools",
  fromMe: false,
  desc: "❌ සැසිය අවලංගු කරන්න"
}, async ({ client, m }) => {
  const jid = m.sender;
  if (userSessions.has(jid)) {
    userSessions.delete(jid);
    m.reply("✅ සැසිය අවලංගු කරන ලදි.");
  } else {
    m.reply("⚠️ කිසිදු සැසියක් නැත.");
  }
});
