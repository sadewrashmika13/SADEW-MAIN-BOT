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

function buildQuotedMessage(m) {
    const q = m.quoted;

    if (!q) return null;

    if (q.key && q.message) {
        return q;
    }

    if (!q.message) return null;

    return {
        key: {
            remoteJid: m.jid,
            id: q.stanzaId || q.key?.id || q.id,
            fromMe: q.fromMe || false,
            participant: q.sender || q.participant || m.sender
        },
        message: q.message
    };
}

async function forwardHandler({ client, m, args }) {
    try {
        const input = getArgsText(args, m);
        const targetJid = toJid(input);

        if (!targetJid) {
            return await m.reply(
                "📤 Forward කරන්න number/JID එක දෙන්න මචං.\n\n" +
                "උදා:\n" +
                ".forward 94712345678\n" +
                ".foward 94712345678\n" +
                ".forward 94712345678@s.whatsapp.net"
            );
        }

        if (!m.quoted) {
            return await m.reply(
                "📌 Forward කරන්න ඕන message/media/document එකට reply කරලා command එක දෙන්න.\n\n" +
                "උදා:\n" +
                "Video එකකට reply → .forward 94712345678"
            );
        }

        await m.react?.("📤");

        const quotedMessage = buildQuotedMessage(m);

        if (!quotedMessage) {
            await m.react?.("❌");
            return await m.reply("❌ Quoted message එක read කරන්න බැරි වුණා.");
        }

        if (typeof m.forwardMessage === "function") {
            await m.forwardMessage(targetJid, quotedMessage, {});
        } else {
            await client.sendMessage(targetJid, {
                forward: quotedMessage
            });
        }

        await m.react?.("✅");

        await m.reply(
            `✅ Forward කළා මචං.\n\n` +
            `📍 Target: ${targetJid}`
        );
    } catch (err) {
        console.log("Forward command error:", err);
        await m.react?.("❌");

        await m.reply(
            "❌ Forward කරන්න බැරි වුණා.\n\n" +
            "හේතුව: " + err.message
        );
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
