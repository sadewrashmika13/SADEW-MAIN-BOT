// commands/tiktok.js
const { Sparky } = require("../lib");
const axios = require("axios");

const TIK_API = "https://tikwm.com/api/feed/search";

// Helper: shuffle array
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Helper: safely get query string from args
function getQuery(args) {
  if (!args) return "";
  if (Array.isArray(args)) return args.join(" ").trim();
  if (typeof args === "string") return args.trim();
  if (typeof args === "object") return Object.values(args).join(" ").trim();
  return "";
}

Sparky({
  name: "tiktok",
  alias: ["ts", "tik"],
  category: "download",
  fromMe: false,
  desc: "🎵 TikTok වීඩියෝ සෙවීම"
}, async ({ client, m, args }) => {
  try {
    const query = getQuery(args);
    if (!query) {
      return m.reply(
        "🎵 *TikTok Video Search*\n\n" +
        "භාවිතය: `.tiktok ගායකයා හෝ ගීතය`\n" +
        "උදා: `.tiktok ගායනේ`"
      );
    }

    await m.react("⏳");

    const params = new URLSearchParams();
    params.append("text", query);
    params.append("count", "10");
    params.append("cursor", "0");
    params.append("HD", "1");

    const { data } = await axios.post(TIK_API, params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0",
        Cookie: "tt_webid=1234567890;"
      },
      timeout: 15000
    });

    if (!data?.data?.videos?.length) {
      await m.react("❌");
      return m.reply(`😞 *${query}* සඳහා TikTok වීඩියෝ හමු නොවිණි.`);
    }

    let videos = shuffleArray(data.data.videos).slice(0, 5);
    let successCount = 0;

    for (const video of videos) {
      try {
        const title = video.title || "TikTok වීඩියෝව";
        const videoUrl = video.play;
        if (!videoUrl) continue;

        const videoBuffer = await axios.get(videoUrl, { responseType: "arraybuffer", timeout: 30000 });
        const caption = `🎬 *${title.substring(0, 100)}*\n👤 @${video.author?.unique_id || "unknown"}\n❤️ ${(video.digg_count || 0).toLocaleString()} likes\n💬 ${(video.comment_count || 0).toLocaleString()} comments\n\n📌 ${query}`;

        await client.sendMessage(m.jid, {
          video: Buffer.from(videoBuffer.data),
          caption: caption,
          mimetype: "video/mp4"
        }, { quoted: m });

        successCount++;
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (err) {
        console.error("Video send error:", err.message);
      }
    }

    await m.react("✅");
    if (successCount === 0) {
      return m.reply("❌ කිසිදු වීඩියෝවක් යැවීමට නොහැකි විය.");
    }
    await m.reply(`✅ සාර්ථකයි! ${successCount}/${videos.length} වීඩියෝ යවන ලදී.`);

  } catch (error) {
    console.error("TikTok error:", error);
    await m.react("❌");
    m.reply(`⚠️ TikTok සෙවුම අසාර්ථකයි.\n📝 හේතුව: ${error.message}`);
  }
});
