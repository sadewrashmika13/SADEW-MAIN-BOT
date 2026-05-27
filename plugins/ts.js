// commands/tiktok.js
const { Sparky } = require("../lib");
const axios = require("axios");

// TikTok API base URL (free, no key required)
const TIK_API = "https://tikwm.com/api/feed/search";

// Helper: shuffle array (original code එකේ shuffle තිබුණා)
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

Sparky({
  name: "tiktok",
  alias: ["ts", "tik"],
  category: "download",
  fromMe: false,
  desc: "🎵 TikTok වීඩියෝ සෙවීම (ජනප්‍රිය ගීත/ප්‍රවණතා)"
}, async ({ client, m, args }) => {
  try {
    const query = args.join(" ").trim();
    if (!query) {
      return m.reply(
        "🎵 *TikTok Video Search*\n\n" +
        "භාවිතය: `.tiktok ගායකයා හෝ ගීතය`\n" +
        "උදා: `.tiktok ගායනේ`\n\n" +
        "🎯 උපදෙස්: සිංහලෙන් හෝ ඉංග්‍රීසියෙන් සෙවිය හැක."
      );
    }

    // ========== 1. API වෙත POST request ==========
    await m.react("⏳"); // hourglass reaction

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

    // ========== 2. ප්‍රතිඵල පරීක්ෂා කිරීම ==========
    if (!data?.data?.videos?.length) {
      await m.react("❌");
      return m.reply(`😞 *${query}* සඳහා TikTok වීඩියෝ කිසිවක් හමු නොවිණි.\n\n💡 වෙනත් වචන උත්සාහ කරන්න.`);
    }

    let videos = data.data.videos;
    // original code එකේ shuffle තිබුණා (random order)
    videos = shuffleArray(videos).slice(0, 5); // පළමු 5 පමණක් යවමු

    // ========== 3. එක් එක් වීඩියෝව යැවීම ==========
    let successCount = 0;
    for (const video of videos) {
      try {
        const title = video.title || "TikTok වීඩියෝව";
        const videoUrl = video.play; // HD වීඩියෝ URL
        if (!videoUrl) continue;

        // වීඩියෝව buffer එකක් ලෙස download කර send කරන්න
        const videoBuffer = await axios.get(videoUrl, { responseType: "arraybuffer", timeout: 30000 });
        const caption = `🎬 *${title.substring(0, 100)}*\n🔗 හිමිකරු: @${video.author?.unique_id || "unknown"}\n❤️ ${(video.digg_count || 0).toLocaleString()} likes\n💬 ${(video.comment_count || 0).toLocaleString()} comments\n\n📌 TikTok සෙවුම: ${query}`;

        await client.sendMessage(m.jid, {
          video: Buffer.from(videoBuffer.data),
          caption: caption,
          mimetype: "video/mp4"
        }, { quoted: m });

        successCount++;
        await new Promise(resolve => setTimeout(resolve, 800)); // rate limit වළක්වන්න
      } catch (err) {
        console.error("වීඩියෝවක් යැවීමේ දෝෂය:", err.message);
      }
    }

    await m.react("✅");
    if (successCount === 0) {
      return m.reply("❌ කිසිදු වීඩියෝවක් යැවීමට නොහැකි විය. පසුව නැවත උත්සාහ කරන්න.");
    }
    await m.reply(`✅ *හමු වූ TikTok වීඩියෝ:* ${successCount}/${videos.length}\n🎵 සෙවුම: ${query}`);

  } catch (error) {
    console.error("TikTok command error:", error);
    await m.react("❌");
    m.reply(`⚠️ TikTok සෙවුම අසාර්ථකයි.\n📝 හේතුව: ${error.message.substring(0, 100)}`);
  }
});
