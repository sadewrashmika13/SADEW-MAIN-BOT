const { Sparky, isPublic, yts, yta } = require("../lib");
const axios = require("axios");
const { spawn } = require("child_process");

const ffmpegBin = "ffmpeg";

function getArgsText(args, m) {
    if (Array.isArray(args)) return args.join(" ").trim();
    if (typeof args === "string") return args.trim();

    return (
        m.quoted?.text ||
        m.text?.replace(/^[./!#]music\s*/i, "") ||
        m.body?.replace(/^[./!#]music\s*/i, "") ||
        ""
    ).trim();
}

function sanitizeFileName(name) {
    return String(name || "music")
        .replace(/[\\/:*?"<>|]/g, "_")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);
}

function durationToSeconds(duration) {
    const parts = String(duration || "").split(":").map(Number);
    if (parts.some(isNaN)) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
}

function pickBestSong(results) {
    if (!Array.isArray(results) || !results.length) return null;

    return results.find((item) => {
        const seconds = durationToSeconds(item.duration);
        return seconds > 0 && seconds <= 15 * 60;
    }) || results[0];
}

async function downloadToBuffer(url) {
    const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 120000,
        maxRedirects: 5,
        headers: {
            "User-Agent": "Mozilla/5.0"
        },
        maxContentLength: 80 * 1024 * 1024,
        maxBodyLength: 80 * 1024 * 1024
    });

    return Buffer.from(res.data);
}

function convertToPhoneMp3(inputBuffer) {
    return new Promise((resolve, reject) => {
        const args = [
            "-hide_banner",
            "-loglevel", "error",
            "-i", "pipe:0",
            "-vn",
            "-map_metadata", "-1",
            "-ac", "2",
            "-ar", "44100",
            "-c:a", "libmp3lame",
            "-b:a", "128k",
            "-id3v2_version", "3",
            "-f", "mp3",
            "pipe:1"
        ];

        const ffmpeg = spawn(ffmpegBin, args, {
            stdio: ["pipe", "pipe", "pipe"]
        });

        const outputChunks = [];
        const errorChunks = [];

        const timer = setTimeout(() => {
            ffmpeg.kill("SIGKILL");
            reject(new Error("MP3 convert timeout වුණා."));
        }, 180000);

        ffmpeg.stdout.on("data", (chunk) => outputChunks.push(chunk));
        ffmpeg.stderr.on("data", (chunk) => errorChunks.push(chunk));

        ffmpeg.on("error", (err) => {
            clearTimeout(timer);
            reject(err.code === "ENOENT" ? new Error("FFmpeg install කරලා නෑ.") : err);
        });

        ffmpeg.on("close", (code) => {
            clearTimeout(timer);

            const output = Buffer.concat(outputChunks);
            const errorText = Buffer.concat(errorChunks).toString("utf8");

            if (code !== 0) return reject(new Error(errorText || `FFmpeg failed: ${code}`));
            if (!output || output.length < 1000) return reject(new Error("MP3 output empty වුණා."));

            resolve(output);
        });

        ffmpeg.stdin.end(inputBuffer);
    });
}

Sparky({
    name: "music",
    fromMe: isPublic,
    category: "download",
    desc: "Song name එකෙන් phone-compatible MP3 audio එකක් send කරන්න"
}, async ({ client, m, args }) => {
    try {
        const query = getArgsText(args, m);

        if (!query) {
            return await m.reply("🎵 Song name එකක් දෙන්න.\n\nඋදා: .music mithaya myam");
        }

        await m.react("🔎");

        const results = await yts(query);
        const song = pickBestSong(results);

        if (!song || !song.url) {
            await m.react("❌");
            return await m.reply("❌ Song එක හොයාගන්න බැරි වුණා.");
        }

        await m.reply(`🎧 *${song.title}*\n⏱️ ${song.duration || "Unknown"}\n\n_Preparing phone supported MP3..._`);
        await m.react("⬇️");

        const rawAudioUrl = await yta(song.url);
        if (!rawAudioUrl) throw new Error("Audio download link එක ලැබුණේ නෑ.");

        const rawBuffer = await downloadToBuffer(rawAudioUrl);
        if (!rawBuffer || rawBuffer.length < 1000) throw new Error("Audio download failed.");

        const mp3Buffer = await convertToPhoneMp3(rawBuffer);
        const fileName = `${sanitizeFileName(song.title)}.mp3`;

        await client.sendMessage(m.jid, {
            audio: mp3Buffer,
            mimetype: "audio/mpeg",
            fileName,
            ptt: false
        }, { quoted: m });

        await m.react("✅");
    } catch (err) {
        console.log("Music command error:", err);
        await m.react("❌");
        await m.reply("❌ Music command error:\n" + err.message);
    }
});
