const { Sparky, isPublic } = require("../lib");
const { getString, isUrl } = require("./pluginsCore");
const axios = require("axios");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");

const lang = getString("download") || {};

const TIKWM_API = "https://www.tikwm.com/api/";
const MAX_IMAGES = Number(process.env.TTP_MAX_IMAGES || 30);
const MAX_VIDEO_BYTES = Number(process.env.TTP_MAX_VIDEO_MB || 95) * 1024 * 1024;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_AUDIO_BYTES = 30 * 1024 * 1024;

function extractUrl(text) {
    const match = String(text || "").match(/https?:\/\/[^\s]+/i);
    return match ? match[0].replace(/[),.]+$/, "") : "";
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildTikwmUrl(url) {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    return `https://www.tikwm.com${url.startsWith("/") ? "" : "/"}${url}`;
}

function sanitizeFileName(name) {
    return String(name || "tiktok-photo-video")
        .replace(/[\\/:*?"<>|]/g, "_")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);
}

function getQuality(args) {
    const text = String(args || "").toLowerCase();
    if (/\b(720|normal|sd)\b/.test(text)) return "normal";
    return "hd";
}

function prettyBytes(bytes) {
    return `${(Number(bytes || 0) / 1024 / 1024).toFixed(1)} MB`;
}

function pickImages(data) {
    const root = data?.data || data?.result || data || {};
    const set = new Set();

    const lists = [
        root.images,
        root.image_post?.images,
        root.imagePost?.images,
        root.photos,
        root.pictures
    ];

    for (const list of lists) {
        if (!Array.isArray(list)) continue;

        for (const item of list) {
            if (typeof item === "string") {
                set.add(buildTikwmUrl(item));
            } else if (item && typeof item === "object") {
                const url = item.url || item.image_url || item.display_image || item.origin_image || item.download_url;
                if (url) set.add(buildTikwmUrl(url));
            }
        }
    }

    return [...set].filter(Boolean).slice(0, MAX_IMAGES);
}

function pickAudio(data) {
    const root = data?.data || data?.result || data || {};
    return buildTikwmUrl(
        root.music ||
        root.music_info?.play ||
        root.music_info?.url ||
        root.music_info?.download_url ||
        root.musicInfo?.play ||
        root.musicInfo?.url
    );
}

function pickDirectVideo(data, quality) {
    const root = data?.data || data?.result || data || {};
    const urls = quality === "hd"
        ? [root.hdplay, root.play]
        : [root.play, root.hdplay];

    return buildTikwmUrl(urls.find(Boolean));
}

async function fetchTikwmData(tiktokUrl) {
    let lastError = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const res = await axios.get(TIKWM_API, {
                timeout: 25000,
                maxRedirects: 8,
                params: {
                    url: tiktokUrl,
                    hd: 1
                },
                headers: {
                    "User-Agent": "Mozilla/5.0",
                    "Accept": "application/json, text/plain, */*",
                    "Referer": "https://www.tikwm.com/"
                },
                validateStatus: (status) => status >= 200 && status < 500
            });

            if (res.status >= 400) throw new Error(`TikWM HTTP ${res.status}`);

            const code = Number(res.data?.code ?? res.data?.status ?? 0);
            if (code !== 0 && code !== 200) {
                throw new Error(res.data?.msg || res.data?.message || `TikWM code ${code}`);
            }

            return res.data;
        } catch (err) {
            lastError = err;
            if (attempt < 3) await sleep(attempt * 2500);
        }
    }

    throw lastError || new Error("TikWM API failed");
}

async function downloadBuffer(url, maxBytes, type = "media") {
    const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 90000,
        maxRedirects: 12,
        maxContentLength: maxBytes,
        maxBodyLength: maxBytes,
        headers: {
            "User-Agent": "Mozilla/5.0",
            "Accept": "*/*",
            "Referer": "https://www.tiktok.com/"
        },
        validateStatus: (status) => status >= 200 && status < 400
    });

    const buffer = Buffer.from(res.data || []);
    if (!buffer.length) throw new Error(`${type} buffer empty`);
    if (buffer.length > maxBytes) throw new Error(`${type} too large: ${prettyBytes(buffer.length)}`);

    const contentType = String(res.headers["content-type"] || "").toLowerCase();
    return { buffer, contentType };
}

function extFromContentType(contentType) {
    if (contentType.includes("png")) return ".png";
    if (contentType.includes("webp")) return ".webp";
    if (contentType.includes("mp3")) return ".mp3";
    if (contentType.includes("mpeg")) return ".mp3";
    if (contentType.includes("mp4")) return ".mp4";
    return ".jpg";
}

function runCommand(command, args, timeout = 180000) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
        const out = [];
        const err = [];

        const timer = setTimeout(() => {
            child.kill("SIGKILL");
            reject(new Error(`${command} timeout`));
        }, timeout);

        child.stdout.on("data", (chunk) => out.push(chunk));
        child.stderr.on("data", (chunk) => err.push(chunk));

        child.on("error", (error) => {
            clearTimeout(timer);
            reject(error.code === "ENOENT" ? new Error(`${command} install karala na`) : error);
        });

        child.on("close", (code) => {
            clearTimeout(timer);
            const stdout = Buffer.concat(out).toString("utf8").trim();
            const stderr = Buffer.concat(err).toString("utf8").trim();

            if (code !== 0) return reject(new Error(stderr || `${command} failed: ${code}`));
            resolve(stdout);
        });
    });
}

async function getAudioDuration(audioPath) {
    try {
        const output = await runCommand("ffprobe", [
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            audioPath
        ], 30000);

        const seconds = Number(output);
        return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
    } catch {
        return 0;
    }
}

async function createVideoFromPhotos(imagePaths, audioPath, outputPath, quality) {
    const audioDuration = await getAudioDuration(audioPath);
    const eachDuration = audioDuration
        ? Math.max(2.2, Math.min(5, audioDuration / imagePaths.length))
        : 3.2;

    const listPath = path.join(path.dirname(outputPath), "images.txt");
    const listBody = imagePaths.map((file) => {
        const safe = file.replace(/\\/g, "/").replace(/'/g, "'\\''");
        return `file '${safe}'\nduration ${eachDuration}`;
    }).join("\n") + `\nfile '${imagePaths[imagePaths.length - 1].replace(/\\/g, "/").replace(/'/g, "'\\''")}'\n`;

    await fs.writeFile(listPath, listBody);

    const profiles = quality === "hd"
        ? [
            { w: 1080, h: 1920, crf: 28 },
            { w: 720, h: 1280, crf: 30 },
            { w: 540, h: 960, crf: 32 }
        ]
        : [
            { w: 720, h: 1280, crf: 30 },
            { w: 540, h: 960, crf: 32 }
        ];

    let lastError = null;

    for (const profile of profiles) {
        try {
            await runCommand("ffmpeg", [
                "-y",
                "-hide_banner",
                "-loglevel", "error",
                "-f", "concat",
                "-safe", "0",
                "-i", listPath,
                "-i", audioPath,
                "-vf", `scale=${profile.w}:${profile.h}:force_original_aspect_ratio=decrease,pad=${profile.w}:${profile.h}:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p`,
                "-r", "30",
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", String(profile.crf),
                "-c:a", "aac",
                "-b:a", "128k",
                "-shortest",
                "-movflags", "+faststart",
                outputPath
            ]);

            const stat = await fs.stat(outputPath);
            if (stat.size > 0 && stat.size <= MAX_VIDEO_BYTES) {
                return { width: profile.w, height: profile.h, size: stat.size };
            }

            lastError = new Error(`video size too large: ${prettyBytes(stat.size)}`);
        } catch (err) {
            lastError = err;
        }
    }

    throw lastError || new Error("Video create failed");
}

async function buildSlideshowVideo(data, quality) {
    const images = pickImages(data);
    const audioUrl = pickAudio(data);

    if (!images.length) throw new Error("TikTok photo list eka hambune na");
    if (!audioUrl) throw new Error("TikTok audio eka hambune na");

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "sadew-ttp-"));

    try {
        const imagePaths = [];

        for (let i = 0; i < images.length; i++) {
            const image = await downloadBuffer(images[i], MAX_IMAGE_BYTES, "image");
            const imagePath = path.join(tmpDir, `image-${String(i + 1).padStart(2, "0")}${extFromContentType(image.contentType)}`);
            await fs.writeFile(imagePath, image.buffer);
            imagePaths.push(imagePath);
        }

        const audio = await downloadBuffer(audioUrl, MAX_AUDIO_BYTES, "audio");
        const audioPath = path.join(tmpDir, `audio${extFromContentType(audio.contentType)}`);
        await fs.writeFile(audioPath, audio.buffer);

        const outputPath = path.join(tmpDir, "tiktok-photo-video.mp4");
        const meta = await createVideoFromPhotos(imagePaths, audioPath, outputPath, quality);
        const videoBuffer = await fs.readFile(outputPath);

        return {
            buffer: videoBuffer,
            count: imagePaths.length,
            source: "ffmpeg-slideshow",
            quality: `${meta.width}x${meta.height}`,
            size: meta.size,
            cleanup: () => fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
        };
    } catch (err) {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
        throw err;
    }
}

async function ttPhotoVideoHandler({ m, client, args }) {
    let cleanup = null;

    try {
        args = args || m.quoted?.text || "";

        const tiktokUrl = extractUrl(args);
        const quality = getQuality(args);

        if (!tiktokUrl) {
            return await m.reply(
                "TikTok photo/slideshow link ekak denna.\n\n" +
                "Example:\n.ttp https://vt.tiktok.com/xxxx/\n" +
                ".ttp hd https://vt.tiktok.com/xxxx/\n" +
                ".ttp normal https://vt.tiktok.com/xxxx/"
            );
        }

        if (!await isUrl(tiktokUrl)) return await m.reply(lang.INVALID_LINK || "Invalid link");

        if (!/tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com/i.test(tiktokUrl)) {
            return await m.reply("Me command eka TikTok link walata witharai.");
        }

        await m.react("🔎");
        await m.reply("TikTok photo video prepare karanawa...\nPhoto + audio ekka MP4 video ekak hadanawa.");

        const result = await fetchTikwmData(tiktokUrl);
        const root = result?.data || {};
        const directVideoUrl = pickDirectVideo(result, quality);

        let videoBuffer = null;
        let source = "";
        let videoQuality = quality;

        if (directVideoUrl) {
            try {
                const direct = await downloadBuffer(directVideoUrl, MAX_VIDEO_BYTES, "video");
                videoBuffer = direct.buffer;
                source = quality === "hd" && root.hdplay ? "tikwm-hd-video" : "tikwm-video";
            } catch (err) {
                console.log("Direct TikWM video failed:", err);
            }
        }

        if (!videoBuffer) {
            const built = await buildSlideshowVideo(result, quality);
            videoBuffer = built.buffer;
            source = built.source;
            videoQuality = built.quality;
            cleanup = built.cleanup;
        }

        const fileName = `${sanitizeFileName(root.title || "tiktok-photo-video")}.mp4`;

        await m.react("⬆️");

        await client.sendMessage(m.jid, {
            video: videoBuffer,
            mimetype: "video/mp4",
            fileName,
            caption:
                `TikTok photo video ready!\n` +
                `Quality: ${videoQuality}\n` +
                `Size: ${prettyBytes(videoBuffer.length)}\n` +
                `Source: ${source}\n` +
                `Watermark: removed`
        }, { quoted: m });

        await m.react("✅");
    } catch (err) {
        console.log("TTP error:", err);
        await m.react("❌");
        await m.reply("TTP error:\n" + (err.message || err));
    } finally {
        if (cleanup) await cleanup();
    }
}

Sparky({
    name: "ttp",
    fromMe: isPublic,
    category: "tiktok",
    desc: "TikTok photo slideshow eka audio ekka MP4 video widihata download karanna"
}, ttPhotoVideoHandler);
