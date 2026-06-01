const { Sparky } = require("../lib");

function getArgsText(args, m) {
    if (Array.isArray(args)) return args.join(" ").trim();
    if (typeof args === "string") return args.trim();

    return (
        m.text?.replace(/^[./!#](forward|foward)\s*/i, "") ||
        m.body?.replace(/^[./!#](forward|foward)\s*/i, "") ||
        ""
    ).trim();
}

function toJid(input) {
    const text = String(input || "").trim();

    if (!text) return "";

    if (text.endsWith("@s.whatsapp.net") || text.endsWith("@g.us")) {
        return text;
    }

    const number = text.replace(/[^0-9]/g, "");
    if (!number) return "";

    return `${number}@s.whatsapp.net`;
}

function normalizeQuotedMessage(m) {
    const q = m.quoted;
    if (!q) return null;

    const message = q.message || q?.quotedMessage;
    if (!message) return null;

    return {
        key: {
            remoteJid: q.key?.remoteJid || m.jid,
            id: q.key?.id || q.stanzaId || q.id,
            fromMe: q.key?.fromMe ?? q.fromMe ?? false,
            participant: q.key?.participant || q.sender || q.participant || m.sender
        },
        message
    };
}

function extractTextFallback(quoted) {
    const msg = quoted?.message || {};

    return (
        msg.conversation ||
        msg.extendedTextMessage?.text ||
        msg.imageMessage?.caption ||
        msg.videoMessage?.caption ||
        msg.documentMessage?.caption ||
        ""
    );
}

function loadBaileys() {
    try {
        return require("baileys");
    } catch {
        throw new Error("baileys package එක හමු වුණේ නෑ. package.json එකේ baileys තියෙනවද බලන්න.");
    }
}

async function safeForward(client, targetJid, quoted) {
    const {
        generateForwardMessageContent,
        generateWAMessageFromContent,
        getContentType
    } = loadBaileys();

    const content = await generateForwardMessageContent(quoted, false);
    const type = getContentType(content);

    if (!type || !content[type]) {
        throw new Error("Forward content එක generate කරන්න බැරි වුණා.");
    }

    if (typeof content[type] === "object") {
        content[type].contextInfo = {
            ...(content[type].contextInfo || {}),
            forwardingScore: 999,
            isForwarded: true
        };
    }

    const waMessage = await generateWAMessageFromContent(targetJid, content, {
        userJid: client.user?.id || client.user?.jid
    });

    await client.relayMessage(targetJid, waMessage.message, {
        messageId: waMessage.key.id
    });
}

async function forwardHandler({ client, m, args }) {
    try {
        const input = getArgsText(args, m);
        const targetJid = toJid(input);

        if (!targetJid) {
            return await m.reply(
                "📤 Forward කරන්න number/JID එක දෙන්න.\n\n" +
                "උදා:\n.forward 94712345678\n" +
                ".forward 120363xxxx@g.us"
            );
        }

        if (!m.quoted) {
            return await m.reply(
                "📌 Forward කරන්න ඕන text/photo/video/document එකට reply කරලා command එක දෙන්න.\n\n" +
                "උදා:\n.forward 94712345678"
            );
        }

        await m.react?.("📤");

        const quoted = normalizeQuotedMessage(m);

        if (!quoted) {
            await m.react?.("❌");
            return await m.reply("❌ Quoted message එක read කරන්න බැරි වුණා.");
        }

        try {
            await safeForward(client, targetJid, quoted);
        } catch (forwardErr) {
            const text = extractTextFallback(quoted);

            if (!text) throw forwardErr;

            await client.sendMessage(targetJid, {
                text,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true
                }
            });
        }

        await m.react?.("✅");
        await m.reply(`✅ Forward කළා.\n\n📍 Target: ${targetJid}`);
    } catch (err) {
        console.log("Forward command error:", err);
        await m.react?.("❌");
        await m.reply("❌ Forward කරන්න බැරි වුණා.\n\nහේතුව: " + err.message);
    }
}

Sparky({
    name: "forward",
    category: "tools",
    fromMe: true,
    desc: "Reply message/media/document එක number/JID එකකට forward කරන්න"
}, forwardHandler);

Sparky({
    name: "foward",
    category: "tools",
    fromMe: true,
    desc: "Reply message/media/document එක number/JID එකකට forward කරන්න"
}, forwardHandler);
