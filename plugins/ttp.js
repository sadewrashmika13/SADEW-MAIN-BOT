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
const MAX_AUDIO_BYTES = 40 * 1024 * 1024;

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
    if (/\b(normal|sd|720)\b/.test(text)) return "normal";
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

async function fetchTikwmData(tiktokUrl) {
    let lastError = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const res = await axios.get(TIKWM_API, {
                timeout: 25000,
                maxRedirects: 8,
                params: { url: tiktokUrl, hd: 1 },
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
            "Accept": "*
