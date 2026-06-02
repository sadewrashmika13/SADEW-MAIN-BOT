const { Sparky, isPublic, YtInfo, yts, yta, ytv: oldYtv } = require("../lib");
const { getString, isUrl } = require("./pluginsCore");
const axios = require("axios");
const { spawn } = require("child_process");

const lang = getString("download") || {};
const ffmpegBin = process.env.FFMPEG_PATH || "ffmpeg";

const WS_YT_TOKEN = process.env.WHITESHADOW_API_TOKEN || "VK4fry";
const DARK_SHAN_API_URL = "https://api-dark-shan-yt.koyeb.app/download/ytmp4";
const DARK_SHAN_API_KEY = process.env.DARK_SHAN_API_KEY || "";

const REQUEST_TIMEOUT = 120000;
const API_TIMEOUT = 15000;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
const MAX_AUDIO_BYTES = 80 * 1024 * 1024;

function extractUrl(text) {
    const match = String(text || "").match(/https?:\/\/[^\s]+/i);
    return match ? match[0].replace(/[),.]+$/, "") : "";
}

function extractQuality(text) {
    const match = String(text || "").match(/\b(144|240|360|480|720|1080)\b/i);
    return match ? match[1] : "720";
}

function sanitizeFileName(name) {
    return String(name || "youtube")
        .replace(/[\\/:*?"<>|]/g, "_")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);
}

function durationToSeconds(duration) {
    const parts = String(duration || "").split(":").map(Number);
    if (parts.some(Number.isNaN)) return 0;
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

function prettyBytes(bytes) {
    const size = Number(bytes || 0);
    if (!size) return "0 MB";
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function isProbablyMediaUrl(url) {
    const text = String(url || "").trim();
    const cleanPath = text.split("?")[0].toLowerCase();

    if (!/^https?:\/\//i.test(text)) return false;
    if (/youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts/i.test(text)) return false;
    if (/\.(jpg|jpeg|png|webp|gif)$/i.test(cleanPath)) return false;

    return true;
}

function findMediaUrl(data) {
    const seen = new Set();

    function walk(value) {
        if (!value) return "";

        if (typeof value === "string") {
            return isProbablyMediaUrl(value) ? value.trim() : "";
        }

        if (typeof value !== "object") return "";
        if (seen.has(value)) return "";
        seen.add(value);

        if (Array.isArray(value)) {
            for (const item of value) {
                const found = walk(item);
                if (found) return found;
            }
            return "";
        }

        const priorityKeys = [
            "download_url",
            "downloadUrl",
            "download",
            "dl_url",
            "dlUrl",
            "dl_link",
            "video_url",
            "videoUrl",
            "video",
            "mp4",
            "audio_url",
            "audioUrl",
            "audio",
            "url",
            "link",
            "result",
            "data"
        ];

        for (const key of priorityKeys) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                const found = walk(value[key]);
                if (found) return found;
            }
        }

        for (const key of Object.keys(value)) {
            const found = walk(value[key]);
            if (found) return found;
        }

        return "";
    }

    return walk(data);
}

function normalizeMediaUrl(value) {
    if (!value) return "";
    if (typeof value === "string") return isProbablyMediaUrl(value) ? value.trim() : "";
    return findMediaUrl(value);
}

function axiosHeaders(extra = {}) {
    return {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
        "Accept": "*/*",
        "Referer": "https://www.youtube.com/",
        ...extra
    };
}

async function requestJson(apiUrl, label) {
    const res = await axios.get(apiUrl, {
        timeout: API_TIMEOUT,
        maxRedirects: 10,
        headers: axiosHeaders(),
        validateStatus: (status) => status >= 200 && status < 500
    });

    if (res.status >= 400) throw new Error(`${label} HTTP ${res.status}`);

    const mediaUrl = normalizeMediaUrl(res.data);
    if (!mediaUrl) throw new Error(`${label} media URL not found`);

    return mediaUrl;
}

async function ytvDarkShan(youtubeUrl, quality) {
    const params = new URLSearchParams({
        url: youtubeUrl,
        quality
    });

    if (DARK_SHAN_API_KEY) params.set("apikey", DARK_SHAN_API_KEY);

    return await requestJson(`${DARK_SHAN_API_URL}?${params.toString()}`, "DarkShan");
}

async function ytvWhiteShadow(youtubeUrl, quality) {
    const params = new URLSearchParams({
        url: youtubeUrl,
        quality,
        apitoken: WS_YT_TOKEN
    });

    return await requestJson(`https://whiteshadow-x-api.vercel.app/api/download/yt?${params.toString()}`, "WhiteShadow");
}

async function ytvLocalLib(youtubeUrl) {
    const media = await oldYtv(youtubeUrl);
    const mediaUrl = normalizeMediaUrl(media);
    if (!mediaUrl) throw new Error("Local ytv media URL not found");
    return mediaUrl;
}

function buildQualityList(requestedQuality) {
    const qualities = [String(requestedQuality || "720"), "720", "480", "360", "240", "144"];
    return [...new Set(qualities.filter(Boolean))];
}

function buildVideoProviders(youtubeUrl, quality) {
    return [
        {
            name: "DarkShan",
            getUrl: () => ytvDarkShan(youtubeUrl, quality)
        },
        {
            name: "WhiteShadow",
            getUrl: () => ytvWhiteShadow(youtubeUrl, quality)
        },
        {
            name: "LocalLib",
            getUrl: () => ytvLocalLib(youtubeUrl)
        }
    ];
}

async function downloadToBuffer(url, maxBytes = MAX_VIDEO_BYTES) {
    const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: REQUEST_TIMEOUT,
        maxRedirects: 20,
        headers: axiosHeaders(),
        maxContentLength: maxBytes,
        maxBodyLength: maxBytes,
        validateStatus: (status) => status >= 200 && status < 400
    });

    const buffer = Buffer.from(res.data || []);
    if (!buffer.length) throw new Error("Downloaded file is empty");
    if (buffer.length > maxBytes) throw new Error(`File too large: ${prettyBytes(buffer.length)}`);

    return buffer;
}

async function getVideoBufferFromProviders(youtubeUrl, requestedQuality) {
    const errors = [];

    for (const quality of buildQualityList(requestedQuality)) {
        const providers = buildVideoProviders(youtubeUrl, quality);

        for (const provider of providers) {
            try {
                const mediaUrl = await provider.getUrl();
                const buffer = await downloadToBuffer(mediaUrl, MAX_VIDEO_BYTES);

                return {
                    buffer,
                    quality,
                    provider: provider.name,
                    mediaUrl
                };
            } catch (err) {
                const msg = `${provider.name} ${quality}p: ${err.message || err}`;
                errors.push(msg);
                console.log("YTV provider failed:", msg);
            }
        }
    }

    throw new Error(errors.slice(-4).join(" | ") || "All YTV providers failed");
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
            reject(new Error("MP3 convert timeout una."));
        }, 180000);

        ffmpeg.stdout.on("data", (chunk) => outputChunks.push(chunk));
        ffmpeg.stderr.on("data", (chunk) => errorChunks.push(chunk));

        ffmpeg.on("error", (err) => {
            clearTimeout(timer);
            reject(err.code === "ENOENT" ? new Error("FFmpeg install karala na.") : err);
        });

        ffmpeg.on("close", (code) => {
            clearTimeout(timer);

            const output = Buffer.concat(outputChunks);
            const errorText = Buffer.concat(errorChunks).toString("utf8");

            if (code !== 0) return reject(new Error(errorText || `FFmpeg failed: ${code}`));
            if (!output || output.length < 1000) return reject(new Error("MP3 output empty una."));

            resolve(output);
        });

        ffmpeg.stdin.end(inputBuffer);
    });
}

async function sendPhoneSupportedMp3(client, m, song) {
    const rawAudio = await yta(song.url);
    const rawAudioUrl = normalizeMediaUrl(rawAudio);

    if (!rawAudioUrl) throw new Error("Audio download link eka labune na.");

    const rawBuffer = await downloadToBuffer(rawAudioUrl, MAX_AUDIO_BYTES);
    if (!rawBuffer || rawBuffer.length < 1000) throw new Error("Audio download failed.");

    const mp3Buffer = await convertToPhoneMp3(rawBuffer);
    const fileName = `${sanitizeFileName(song.title)}.mp3`;

    await client.sendMessage(m.jid, {
        audio: mp3Buffer,
        mimetype: "audio/mpeg",
        fileName,
        ptt: false
    }, { quoted: m });
}

Sparky({
    name: "yts",
    fromMe: isPublic,
    category: "youtube",
    desc: "Search in YouTube"
}, async ({ m, client, args }) => {
    try {
        if (!args) return await m.reply(lang.NEED_Q || "Need a Query");

        if (await isUrl(args)) {
            const yt = await YtInfo(args);
            if (!yt) return await m.reply("YouTube info ganna bari una.");

            return await client.sendMessage(m.jid, {
                image: { url: yt.thumbnail },
                caption:
                    `*Title:* ${yt.title}\n` +
                    `*Author:* ${yt.author}\n` +
                    `*URL:* ${args}\n` +
                    `*Video ID:* ${yt.videoId}`
            }, { quoted: m });
        }

        await m.react("🔎");

        const videos = await yts(args);

        if (!videos || !videos.length) {
            await m.react("❌");
            return await m.reply("Result ekak hambune na.");
        }

        const result = videos.slice(0, 10).map((video, i) => {
            return `${i + 1}. *${video.title}*\nDuration: ${video.duration || "Unknown"}\nURL: ${video.url}`;
        });

        await m.reply(`_*Result Of ${args} 🔍*_\n\n` + result.join("\n\n"));
        await m.react("✅");
    } catch (err) {
        console.log("YTS error:", err);
        await m.react("❌");
        await m.reply("YTS error:\n" + err.message);
    }
});

Sparky({
    name: "ytv",
    fromMe: isPublic,
    category: "youtube",
    desc: "YouTube video download"
}, async ({ m, client, args }) => {
    try {
        args = args || m.quoted?.text || "";

        const youtubeUrl = extractUrl(args);
        const quality = extractQuality(args);

        if (!youtubeUrl) {
            return await m.reply(
                "YouTube URL ekak denna.\n\n" +
                "Udaharana:\n.ytv https://youtu.be/dXJLRrRDkj8\n" +
                ".ytv 720 https://youtu.be/dXJLRrRDkj8"
            );
        }

        if (!await isUrl(youtubeUrl)) {
            return await m.reply(lang.INVALID_LINK || "Invalid link");
        }

        await m.react("🔎");

        await m.reply(
            `🎬 *YouTube Video Preparing...*\n` +
            `Quality: ${quality}p\n\n` +
            `_API eken link eka aran RAM buffer ekata download karanawa..._`
        );

        const start = Date.now();
        const video = await getVideoBufferFromProviders(youtubeUrl, quality);
        const yt = await YtInfo(youtubeUrl).catch(() => null);
        const fileName = `${sanitizeFileName(yt?.title || "YouTube Video")}.mp4`;
        const seconds = ((Date.now() - start) / 1000).toFixed(1);

        await m.react("⬆️");

        await client.sendMessage(m.jid, {
            video: video.buffer,
            mimetype: "video/mp4",
            fileName,
            caption:
                `✅ YouTube video ready!\n` +
                `Quality: ${video.quality}p\n` +
                `Size: ${prettyBytes(video.buffer.length)}\n` +
                `API: ${video.provider}\n` +
                `Time: ${seconds}s`
        }, { quoted: m });

        await m.react("✅");
    } catch (error) {
        console.log("YTV error:", error);
        await m.react("❌");
        await m.reply(
            "YTV error una.\n\n" +
            "Video eka godak loku nam 480/360 quality try karanna.\n" +
            "Error: " + (error.message || error)
        );
    }
});

Sparky({
    name: "yta",
    fromMe: isPublic,
    category: "youtube",
    desc: "YouTube audio download"
}, async ({ m, client, args }) => {
    try {
        args = args || m.quoted?.text || "";

        const youtubeUrl = extractUrl(args);

        if (!youtubeUrl) return await m.reply(lang.NEED_URL || "Need a YouTube URL");
        if (!await isUrl(youtubeUrl)) return await m.reply(lang.INVALID_LINK || "Invalid link");

        await m.react("⬇️");

        const yt = await YtInfo(youtubeUrl).catch(() => null);
        const song = {
            title: yt?.title || "YouTube Audio",
            url: youtubeUrl
        };

        await sendPhoneSupportedMp3(client, m, song);

        await m.react("✅");
    } catch (error) {
        console.log("YTA error:", error);
        await m.react("❌");
        await m.reply("YTA error:\n" + (error.message || error));
    }
});

async function songSearchHandler({ m, client, args }) {
    try {
        args = args || m.quoted?.text || "";

        if (!args) {
            return await m.reply(
                "Song name ekak denna.\n\n" +
                "Udaharana:\n.music mithaya myam"
            );
        }

        await m.react("🔎");

        const results = await yts(args);
        const song = pickBestSong(results);

        if (!song || !song.url) {
            await m.react("❌");
            return await m.reply("Song eka hoyaganna bari una.");
        }

        await m.reply(
            `🎧 *${song.title}*\n` +
            `Duration: ${song.duration || "Unknown"}\n\n` +
            `_Phone supported MP3 prepare karanawa..._`
        );

        await m.react("⬇️");

        await sendPhoneSupportedMp3(client, m, song);

        await m.react("✅");
    } catch (error) {
        console.log("Song/Music/Play error:", error);
        await m.react("❌");
        await m.reply("Song/Music/Play error:\n" + (error.message || error));
    }
}

Sparky({
    name: "song",
    fromMe: isPublic,
    category: "youtube",
    desc: "Song name eken phone supported MP3 audio ekak send karanna"
}, songSearchHandler);

Sparky({
    name: "music",
    fromMe: isPublic,
    category: "youtube",
    desc: "Song name eken phone supported MP3 audio ekak send karanna"
}, songSearchHandler);

Sparky({
    name: "play",
    fromMe: isPublic,
    category: "youtube",
    desc: "Song name eken phone supported MP3 audio ekak send karanna"
}, songSearchHandler);
