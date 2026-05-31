const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

function getArgsText(args, m) {
    if (Array.isArray(args)) return args.join(" ").trim();
    if (typeof args === "string") return args.trim();

    return (
        m.quoted?.text ||
        m.text?.replace(/^[./!#]attp\s*/i, "") ||
        m.body?.replace(/^[./!#]attp\s*/i, "") ||
        ""
    ).trim();
}

function buildAttpUrls(text) {
    const q = encodeURIComponent(text);

    return [
        `https://api.betabotz.eu.org/api/maker/attp?text=${q}`,
        `https://api.ryzendesu.vip/api/maker/attp?text=${q}`,
        `https://api.agatz.xyz/api/attp?message=${q}`,
        `https://widipe.com/attp?text=${q}`,
        `https://api.neoxr.eu/api/attp?text=${q}`,
        `https://itzpire.com/maker/attp?text=${q}`
    ];
}

async function downloadBuffer(url) {
    const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 20000,
        headers: {
            "User-Agent": "Mozilla/5.0",
            "Accept": "image/webp,image/gif,image/png,image/*,*/*"
        },
        validateStatus: (status) => status >= 200 && status < 400
    });

    const contentType = String(res.headers["content-type"] || "").toLowerCase();
    const buffer = Buffer.from(res.data);

    if (contentType.includes("application/json")) {
        const json = JSON.parse(buffer.toString("utf8"));

        const imageUrl =
            json.result ||
            json.url ||
            json.data?.url ||
            json.data?.result ||
            json.data?.image ||
            json.image;

        if (!imageUrl) throw new Error("API JSON response එකේ sticker URL එකක් නෑ");
        return await downloadBuffer(imageUrl);
    }

    return buffer;
}

async function fetchAttpSticker(text) {
    const urls = buildAttpUrls(text);
    let lastError = null;

    for (const url of urls) {
        try {
            const buffer = await downloadBuffer(url);

            if (buffer && buffer.length > 1000) {
                return buffer;
            }
        } catch (err) {
            lastError = err;
        }
    }

    throw lastError || new Error("ATTP sticker එක හදාගන්න බැරි වුණා");
}

Sparky({
    name: "attp",
    alias: ["ttp", "animatedtext"],
    category: "tools",
    fromMe: isPublic,
    desc: "Text එක animated color sticker එකක් බවට convert කරන්න"
}, async ({ client, m, args }) => {
    try {
        const text = getArgsText(args, m);

        if (!text) {
            return await m.reply(
                "✍️ Sticker කරන්න text එකක් දෙන්න මචං.\n\n" +
                "උදා:\n" +
                ".attp Sadew Mini"
            );
        }

        if (text.length > 80) {
            return await m.reply("❌ Text එක දිග වැඩියි මචං. characters 80 ට අඩුවෙන් දෙන්න.");
        }

        await m.react("🎨");

        const stickerBuffer = await fetchAttpSticker(text);

        await client.sendMessage(m.jid, {
            sticker: stickerBuffer
        }, { quoted: m });

        await m.react("✅");
    } catch (err) {
        console.log("ATTP command error:", err);
        await m.react("❌");

        await m.reply(
            "❌ ATTP sticker එක හදාගන්න බැරි වුණා මචං.\n\n" +
            "වෙන text එකක් try කරන්න."
        );
    }
});
