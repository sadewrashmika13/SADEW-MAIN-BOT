const { Sparky, isPublic } = require("../lib");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const axios = require('axios');

// =============================================
// CINESUBZ MOVIE SEARCH PLUGIN
// For: X-BOT-MD / Sparky Engine
// Commands: .cz | .cinesubz
// =============================================

Sparky(
    {
        pattern: /(cz|cinesubz) ?(.*)/i,
        fromMe: isPublic,
        desc: "Cinesubz ඒකෙන් Movie Search කරන්න",
        type: "downloader",
    },
    async (msg, match) => {
        const socket = msg.client;
        const sender  = msg.jid;
        const query   = match[2]?.trim();

        if (!query) {
            return await msg.reply(
                "🎬 *කරුණාකර Movie නම ලබා දෙන්න!*\n_උදා: .cz batman_"
            );
        }

        // ── Meta-style fake quote ──────────────────────────────────
        const BOT_NAME  = "WHITESHADOW-MD";
        const makeQuote = (id) => ({
            key: {
                remoteJid  : "status@broadcast",
                participant: "0@s.whatsapp.net",
                fromMe     : false,
                id,
            },
            message: {
                contactMessage: {
                    displayName: BOT_NAME,
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${BOT_NAME}\nORG:Cinesubz\nTEL;waid=13135550002:+1 313 555 0002\nEND:VCARD`,
                },
            },
        });

        try {
            await socket.sendMessage(sender, { react: { text: "🔍", key: msg.key } });

            // ── 1. Search ────────────────────────────────────────────
            const searchRes  = await fetch(
                `https://cinesubz-api-cnw.vercel.app/api/search?q=${encodeURIComponent(query)}`
            );
            const searchData = await searchRes.json();

            if (!searchData.status || !searchData.data?.length) {
                return await socket.sendMessage(
                    sender,
                    { text: "❌ *සමාවෙන්න, ඒ නමින් Movies හමු නොවූණා.*" },
                    { quoted: msg }
                );
            }

            const results = searchData.data.slice(0, 10);

            // ── 2. List message ──────────────────────────────────────
            let listText = `🎬 *CINESUBZ SEARCH*\n\n🔍 *Keywords:* ${query}\n\n`;
            results.forEach((mv, i) => {
                listText += `*${i + 1}.* ${mv.title} _(${mv.year || "?"})_\n`;
            });
            listText += `\n> *Reply with 1 - ${results.length} to select*`;

            const listMsg = await socket.sendMessage(
                sender,
                { text: listText },
                { quoted: makeQuote("CZ_SEARCH_LIST") }
            );

            // ── 3. Reply listener ────────────────────────────────────
            const listener = async ({ messages }) => {
                const reply = messages[0];
                if (!reply?.message) return;

                const ctx        = reply.message.extendedTextMessage?.contextInfo;
                const replyToBot = ctx?.stanzaId === listMsg.key.id;
                if (!replyToBot) return;

                const raw = reply.message.extendedTextMessage?.text?.trim();
                const idx = parseInt(raw) - 1;

                if (isNaN(idx) || idx < 0 || idx >= results.length) {
                    return socket.sendMessage(
                        sender,
                        { text: "❌ *වැරදි අංකයක්! නිවැරදි අංකයකින් Reply කරන්න.*" },
                        { quoted: reply }
                    );
                }

                // Stop listening
                socket.ev.off("messages.upsert", listener);

                const movie = results[idx];

                try {
                    await socket.sendMessage(sender, { react: { text: "🎬", key: reply.key } });

                    // ── 4. Extract direct links ──────────────────────
                    const extRes  = await fetch(
                        `https://cinesubz-api-cnw.vercel.app/api/extract?id=${movie.id}&type=mv`
                    );
                    const extData = await extRes.json();

                    if (!extData.status || !extData.data?.length) {
                        return socket.sendMessage(
                            sender,
                            { text: "❌ *Direct Links ලබා ගන්නට නොහැකිවිය.*" },
                            { quoted: reply }
                        );
                    }

                    // Prefer direct MP4
                    const direct = extData.data.find((v) => v.is_direct_mp4) || extData.data[0];
                    const baseLink = direct.link;

                    const shortTitle = movie.title
                        .substring(0, 20)
                        .replace(/[^a-zA-Z0-9 ]/g, "")
                        .trim();

                    const caption =
                        `🎬 *${movie.title}*\n\n` +
                        `📅 *Year:* ${movie.year || "N/A"}\n` +
                        `🎭 *Genres:* ${movie.genres || "N/A"}\n` +
                        `⭐ *IMDB:* ${movie.imdb || "N/A"}\n\n` +
                        `> *Quality එකක් select කරන්න* ⬇️`;

                    const buttons = [
                        {
                            buttonId : `.cz_dl ${shortTitle} || 480p || ${baseLink}`,
                            buttonText: { displayText: "🎥 480p (SD)" },
                            type: 1,
                        },
                        {
                            buttonId : `.cz_dl ${shortTitle} || 720p || ${baseLink}`,
                            buttonText: { displayText: "🎥 720p (HD)" },
                            type: 1,
                        },
                    ];

                    await socket.sendMessage(
                        sender,
                        {
                            image     : { url: movie.img },
                            caption,
                            footer    : "Whiteshadow MD | Cinesubz",
                            buttons,
                            headerType: 4,
                        },
                        { quoted: makeQuote("CZ_DETAIL") }
                    );

                } catch (e) {
                    console.error("[CZ] Detail fetch error:", e.message);
                    socket.sendMessage(
                        sender,
                        { text: "❌ *Movie details ලබා ගැනීමේ Error!*" },
                        { quoted: reply }
                    );
                }
            };

            socket.ev.on("messages.upsert", listener);
            // 60s timeout – listener remove
            setTimeout(() => socket.ev.off("messages.upsert", listener), 60_000);

        } catch (e) {
            console.error("[CZ] Search error:", e.message);
            await socket.sendMessage(
                sender,
                { text: "❌ *සෙවීමේ Error ඇතිවිය. පසුව නැවත උත්සාහ කරන්න.*" },
                { quoted: msg }
            );
        }
    }
);

// =============================================
// CINESUBZ DOWNLOAD HANDLER
// Command: .cz_dl (button callback)
// =============================================

Sparky(
    {
        pattern: /cz_dl ?(.*)/i,
        fromMe: isPublic,
        desc: "Cinesubz Download Handler (Button Callback)",
        type: "downloader",
    },
    async (msg, match) => {
        const socket = msg.client;
        const sender  = msg.jid;

        // Button callback හෝ text දෙකෙන්ම input ගන්නවා
        const raw =
            msg.message?.buttonsResponseMessage?.selectedButtonId ||
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            "";

        const inputData = raw.replace(/^[.\/!#]cz_dl\s*/i, "").trim();

        if (!inputData.includes("||")) {
            return await msg.reply("❌ *Invalid format.*");
        }

        const parts = inputData.split(" || ");
        if (parts.length < 3) return await msg.reply("❌ *Invalid format.*");

        const [title, quality, originalUrl] = parts;

        const BOT_NAME  = "WHITESHADOW-MD";
        const metaQuote = {
            key: {
                remoteJid  : "status@broadcast",
                participant: "0@s.whatsapp.net",
                fromMe     : false,
                id         : "CZ_DL_QUOTE",
            },
            message: {
                contactMessage: {
                    displayName: BOT_NAME,
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${BOT_NAME}\nORG:Cinesubz Downloader\nTEL;waid=13135550002:+1 313 555 0002\nEND:VCARD`,
                },
            },
        };

        try {
            await socket.sendMessage(sender, { react: { text: "⬇️", key: msg.key } });
            await socket.sendMessage(
                sender,
                {
                    text:
                        `⬇️ *Downloading ${title} (${quality})...*\n` +
                        `_විශාල file එකක් නිසා upload වෙන්න ටිකක් time යාවි._`,
                },
                { quoted: metaQuote }
            );

            // ── Quality-based URL adjustment ─────────────────────────
            let finalUrl = originalUrl;
            if (quality === "480p") {
                finalUrl = originalUrl.replace(/(1080p?|720p?)/i, "480p");
            } else if (quality === "720p") {
                finalUrl = originalUrl.replace(/(1080p?|480p?)/i, "720p");
            }

            // ── File size check (2 GB WhatsApp cap) ─────────────────
            try {
                const head = await axios.head(finalUrl, { timeout: 10_000 });
                const cl   = head.headers?.["content-length"];
                if (cl) {
                    const sizeMB = parseInt(cl) / (1024 * 1024);
                    if (sizeMB > 1950) {
                        await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                        return socket.sendMessage(
                            sender,
                            {
                                text:
                                    `❌ *File 2GB ට වඩා විශාලයි! (${sizeMB.toFixed(2)} MB)*\n` +
                                    `WhatsApp හරහා send කරන්නට බැහැ.`,
                            },
                            { quoted: msg }
                        );
                    }
                }
            } catch (_) {
                // size check fail – proceed anyway
                console.log("[CZ DL] Size check skipped, trying direct upload...");
            }

            // ── Send as document ─────────────────────────────────────
            const caption =
                `🎬 *${title}* [${quality}]\n\n` +
                `> **𝕨𝕙𝕚𝕥𝕖𝕤𝕙𝕒𝕕𝕠𝕨-𝕞𝕕 ✨**`;

            await socket.sendMessage(
                sender,
                {
                    document : { url: finalUrl },
                    mimetype : "video/mp4",
                    fileName : `${title} - ${quality}.mp4`,
                    caption,
                },
                { quoted: metaQuote }
            );

            await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });

        } catch (e) {
            console.error("[CZ DL] Error:", e.message);
            await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
            await socket.sendMessage(
                sender,
                { text: "❌ *Download Failed! Link expire වී ඇත හෝ දෝෂ සහිතයි.*" },
                { quoted: msg }
            );
        }
    }
);
