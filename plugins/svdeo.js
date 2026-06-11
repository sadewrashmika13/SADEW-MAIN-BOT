// commands/svideo.js
const { Sparky, isPublic } = require("../lib");
const { exec } = require("child_process");
const fs = require("fs").promises;
const path = require("path");

function getQuery(args) {
    if (!args) return "";
    if (Array.isArray(args)) return args.join(" ").trim();
    if (typeof args === "string") return args.trim();
    if (typeof args === "object") return Object.values(args).join(" ").trim();
    return "";
}

Sparky({
    name: "svideo",
    alias: ["webvideo"],
    category: "tools",
    fromMe: isPublic,
    desc: "📹 Capture a scrolling video of any website"
}, async ({ client, m, args }) => {
    let url = getQuery(args);
    if (!url) {
        return m.reply(`📹 *Web Scrolling Video Generator*
        
*Usage:* ${m.prefix}svideo <website_url>
*Example:* ${m.prefix}svideo https://example.com`);
    }

    if (!url.startsWith("http")) url = "https://" + url;

    await m.react("⏳");
    await m.reply(`📹 *Capturing scrolling video of ${url}...*
_This may take up to a minute._`);

    const tempDir = path.join(__dirname, "../temp");
    await fs.mkdir(tempDir, { recursive: true });
    const outputFile = path.join(tempDir, `scroll_${Date.now()}.mp4`);
    const command = `npx rollberry capture ${url} --out ${outputFile} --duration 8 --fps 30`;

    exec(command, async (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            await m.react("❌");
            return m.reply(`❌ *Failed to capture video.*
            
Make sure ffmpeg is installed and the website is accessible.`);
        }

        try {
            const buffer = await fs.readFile(outputFile);
            const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
            const caption = `📹 *Scrolling Video Captured*
            
🔗 *URL:* ${url}
📦 *Size:* ${fileSizeMB} MB

> *Powered by Rollberry*`;

            await client.sendMessage(m.jid, {
                document: buffer,
                mimetype: "video/mp4",
                fileName: `scroll_${Date.now()}.mp4`,
                caption: caption
            }, { quoted: m });

            await fs.unlink(outputFile);
            await m.react("✅");
        } catch (err) {
            console.error(err);
            await m.react("❌");
            await m.reply("❌ *Error processing video.*");
        }
    });
});
