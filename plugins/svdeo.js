// commands/svideo.js
const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

function getQuery(args) {
    if (!args) return "";
    if (Array.isArray(args)) return args.join(" ").trim();
    if (typeof args === "string") return args.trim();
    if (typeof args === "object") return Object.values(args).join(" ").trim();
    return "";
}

Sparky({
    name: "svideo",
    alias: ["webvideo", "scrollvideo"],
    category: "tools",
    fromMe: isPublic,
    desc: "📹 වෙබ් අඩවියක් ස්ක්‍රෝල් කරන වීඩියෝවක් (MP4) ගන්න"
}, async ({ client, m, args }) => {
    let url = getQuery(args);
    if (!url) {
        return m.reply(`📹 *Web Scrolling Video Generator*

*Usage:* ${m.prefix}svideo <website_url>
*Example:* ${m.prefix}svideo google.com

*Note:* This captures a scrolling video of the entire page.`);
    }

    // URL එකට https:// add කරන්න (අවශ්‍ය නම්)
    if (!url.startsWith("http")) url = "https://" + url;

    await m.react("⏳");
    await client.sendPresenceUpdate('composing', m.jid);
    await m.reply(`📹 *Capturing scrolling video of ${url}...*\n_This may take 10–30 seconds._`);

    try {
        // 1. API call to Microlink (generates video)
        const microlinkUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&video=true&video.duration=10&video.device=desktop&video.record&video.fullPage=true&video.scroll=true&video.scrollSpeed=300&video.viewportWidth=1280&video.viewportHeight=800`;
        
        const { data } = await axios.get(microlinkUrl, { timeout: 60000 });

        // 2. Check if video was generated
        if (!data?.video?.url) {
            throw new Error("No video URL returned. The website might be blocked or unreachable.");
        }

        const videoUrl = data.video.url;
        const videoDuration = data.video?.duration || "N/A";
        const pageTitle = data?.title || url;

        // 3. Download the video as buffer
        const videoRes = await axios.get(videoUrl, {
            responseType: 'arraybuffer',
            timeout: 60000,
            headers: { 'User-Agent': 'Mozilla/5.0' },
            maxRedirects: 5
        });

        const buffer = Buffer.from(videoRes.data);
        const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);

        if (buffer.length < 10000) throw new Error("Video file is too small (invalid).");

        const fileName = `scroll_${Date.now()}.mp4`;
        const caption = `📹 *Scrolling Video Captured*\n\n🔗 *URL:* ${url}\n📄 *Page Title:* ${pageTitle}\n⏱️ *Duration:* ${videoDuration}s\n📦 *Size:* ${fileSizeMB} MB\n\n> *Powered by SADEW-MINI & Microlink*`;

        // Send video as a document (works for larger files)
        await client.sendMessage(m.jid, {
            document: buffer,
            mimetype: "video/mp4",
            fileName: fileName,
            caption: caption
        }, { quoted: m });

        await m.react("✅");
        await m.reply(`✅ *Video captured successfully!*`);
    } catch (err) {
        console.error("Scrolling video error:", err);
        await m.react("❌");
        
        let errorMsg = `❌ *Failed to capture scrolling video*\n\n`;
        if (err.message.includes("timeout")) {
            errorMsg += `The website took too long to respond. Try a smaller or faster website.`;
        } else if (err.message.includes("No video URL")) {
            errorMsg += `Could not generate video. The website might not be accessible.`;
        } else {
            errorMsg += `Error: ${err.message.substring(0, 150)}`;
        }
        await m.reply(errorMsg);
    }
});
