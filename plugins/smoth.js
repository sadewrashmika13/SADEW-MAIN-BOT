const { Sparky } = require("../lib");
const ffmpegPath = require("ffmpeg-static");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

const execFileAsync = promisify(execFile);

async function streamToBuffer(stream) {
    const chunks = [];

    for await (const chunk of stream) {
        chunks.push(chunk);
    }

    return Buffer.concat(chunks);
}

async function downloadVideo(m) {
    if (m.quoted?.download) {
        return await m.quoted.download();
    }

    if (m.download) {
        return await m.download();
    }

    const quoted = m.quoted?.message || m.quoted;
    const videoMessage =
        quoted?.videoMessage ||
        m.message?.videoMessage ||
        m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage;

    if (!videoMessage) {
        throw new Error("Video message එකක් හමු වුණේ නෑ");
    }

    const stream = await downloadContentFromMessage(videoMessage, "video");
    return await streamToBuffer(stream);
}

async function convertTo60Fps(inputBuffer) {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "smooth-"));
    const inputPath = path.join(tempDir, "input.mp4");
    const outputPath = path.join(tempDir, "output.mp4");

    try {
        fs.writeFileSync(inputPath, inputBuffer);

        const args = [
            "-y",
            "-i", inputPath,
            "-vf", "minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "23",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "128k",
            "-movflags", "+faststart",
            outputPath
        ];

        await execFileAsync(ffmpegPath, args, {
            timeout: 10 * 60 * 1000,
            maxBuffer: 1024 * 1024 * 20
        });

        return fs.readFileSync(outputPath);
    } finally {
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch {}
    }
}

Sparky({
    name: "smooth",
    alias: ["60fps", "fps60", "smoothvideo"],
    category: "tools",
    fromMe: false,
    desc: "සාමාන්‍ය වීඩියෝ එකක් 60fps smooth video එකක් බවට convert කරන්න"
}, async ({ client, m }) => {
    try {
        const quotedVideo =
            m.quoted?.videoMessage ||
            m.quoted?.message?.videoMessage ||
            m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage;

        if (!quotedVideo && !m.message?.videoMessage) {
            return await m.reply(
                "🎬 Video එකකට reply කරලා command එක දෙන්න මචං.\n\nඋදා:\n.smooth"
            );
        }

        await m.react?.("🎬");

        const videoBuffer = await downloadVideo(m);

        if (!videoBuffer || videoBuffer.length < 1000) {
            return await m.reply("❌ Video එක download කරන්න බැරි වුණා.");
        }

        if (videoBuffer.length > 80 * 1024 * 1024) {
            return await m.reply("❌ Video එක ලොකු වැඩියි මචං. 80MB ට අඩු video එකක් try කරන්න.");
        }

        await m.reply("⏳ Video එක 60fps smooth කරනවා... ටිකක් ඉන්න.");

        const outputBuffer = await convertTo60Fps(videoBuffer);

        await client.sendMessage(m.jid, {
            video: outputBuffer,
            mimetype: "video/mp4",
            caption: "✅ 60fps Smooth video ready!"
        }, { quoted: m });

        await m.react?.("✅");
    } catch (err) {
        console.log("Smooth command error:", err);
        await m.react?.("❌");

        await m.reply(
            "❌ Video එක smooth කරන්න බැරි වුණා මචං.\n\n" +
            "හේතුව: " + err.message
        );
    }
});
