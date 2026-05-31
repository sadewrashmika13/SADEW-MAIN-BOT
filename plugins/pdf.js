const { Sparky, isPublic } = require("../lib");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

// 🧠 ෆොටෝ එකතු කරලා තියාගන්නා සර්වර් සෙෂන් එක
global.pdfSessions = global.pdfSessions || {};

Sparky({
    name: "pdf",
    category: "misc",
    fromMe: isPublic,
    desc: "Combine multiple images or a single image into a PDF"
}, async ({ client, m, text }) => {
    const userId = m.sender;
    const cmd = text ? text.trim().toLowerCase() : "";

    // 📄 1. PDF එක නිපදවා බාගත කිරීම (.pdf export)
    if (cmd === "export" || cmd === "done" || cmd === "download") {
        if (!global.pdfSessions[userId] || global.pdfSessions[userId].length === 0) {
            await m.react("❌");
            return await m.reply("_❌ ඔයා තවම කිසිම ෆොටෝ එකක් එකතු කරලා නැහැ මචං!_");
        }

        await m.react("⏳");
        let tempPdf = path.join(__dirname, `temp_pdf_out_${Date.now()}.pdf`);
        let tempImages = [];

        try {
            const doc = new PDFDocument({ size: "A4", margin: 0 });
            const writeStream = fs.createWriteStream(tempPdf);
            doc.pipe(writeStream);

            const sessionImages = global.pdfSessions[userId];

            for (let i = 0; i < sessionImages.length; i++) {
                let imgBuffer = sessionImages[i];
                let tempImgPath = path.join(__dirname, `temp_pdf_page_${Date.now()}_${i}.jpg`);
                fs.writeFileSync(tempImgPath, imgBuffer);
                tempImages.push(tempImgPath);

                if (i > 0) doc.addPage({ size: "A4", margin: 0 });

                doc.image(tempImgPath, 0, 0, {
                    fit: [595.28, 841.89],
                    align: "center",
                    valign: "center"
                });
            }

            doc.end();

            writeStream.on("finish", async () => {
                try {
                    const pdfBuffer = fs.readFileSync(tempPdf);
                    
                    if (fs.existsSync(tempPdf)) fs.unlinkSync(tempPdf);
                    tempImages.forEach(img => { if (fs.existsSync(img)) fs.unlinkSync(img); });
                    
                    delete global.pdfSessions[userId]; // සෙෂන් එක ක්ලීන් කරනවා

                    await m.react("✅");
                    return await client.sendMessage(m.jid, {
                        document: pdfBuffer,
                        mimetype: "application/pdf",
                        fileName: `SADEW-MD_${Date.now()}.pdf`
                    }, { quoted: m });
                } catch (err) { console.error(err); }
            });

        } catch (error) {
            console.error(error);
            await m.react("❌");
            return await m.reply(`_❌ PDF Export Error: ${error.message}_`);
        }
        return;
    }

    // 🧹 2. ලිස්ට් එක Clear කිරීම (.pdf clear)
    if (cmd === "clear" || cmd === "reset") {
        if (global.pdfSessions[userId]) {
            delete global.pdfSessions[userId];
            await m.react("🧹");
            return await m.reply("_🧹 එකතු කරපු ෆොටෝ ලිස්ට් එක සාර්ථකව අයින් කරා මචං!_");
        }
        return await m.reply("_❌ ඔයාගේ ඇක්ටිව් ලිස්ට් එකක් නැහැ._");
    }

    // 📥 3. ෆොටෝ එකින් එක එකතු කරගැනීම (.pdf)
    if (!m.quoted) {
        return await m.reply("_💡 ෆොටෝ එකකට රිප්ලයි කරලා .pdf ගහන්න. ෆොටෝ ඔක්කොම එකතු කරලා ඉවර වුණාම .pdf export ගහන්න මචං._");
    }

    // 🔥 BULLETPROOF IMAGE DETECTION (හැම තැනම පීරලා ෆොටෝ එක අල්ලනවා)
    const mime = m.quoted.mimetype || m.quoted.msg?.mimetype || "";
    const type = m.quoted.type || "";
    const isImage = mime.startsWith("image/") || 
                    type.includes("image") || 
                    m.quoted.msg?.imageMessage || 
                    m.quoted.message?.imageMessage;

    if (!isImage) {
        return await m.reply("_❌ කරුණාකර නිවැරදි ෆොටෝ එකකට Reply කරලා .pdf ගහන්න මචං!_");
    }

    await m.react("📥");
    const media = await m.quoted.download().catch(() => null);
    
    if (!media) {
        await m.react("❌");
        return await m.reply("_❌ ෆොටෝ එක ඩවුන්ලෝඩ් කරගැනීමේ ගැටලුවක් ඇතිවුණා!_");
    }

    if (!global.pdfSessions[userId]) global.pdfSessions[userId] = [];
    global.pdfSessions[userId].push(media);
    await m.react("➕");

    return await m.reply(`*✅ ෆොටෝ එක සාර්ථකව එකතු කරගත්තා! (මුළු ගණන: ${global.pdfSessions[userId].length})*\n\n💡 _ඊළඟ ෆොටෝ එකටත් රිප්ලයි කරලා \`.pdf\` ගහන්න. ඔක්කොම එකතු කරලා ඉවර වුණාම_ \`*.pdf export*\` _කියලා මැසේජ් එකක් දාන්න මචං._`);
});