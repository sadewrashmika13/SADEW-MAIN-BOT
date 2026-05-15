const {Sparky, isPublic} = require("../lib");
const {getString, getJson} = require('./pluginsCore');
const PDFDocument = require("pdfkit");
const lang = getString('pdf');
let fs = require('fs');

let pdfStore = {};

Sparky({
    name: "pdf",
    fromMe: isPublic,
    category: "pdf converters",
    desc: lang.PDF_DESC,
}, async ({ m, client }) => {

    try {
        if (!pdfStore[m.jid] || pdfStore[m.jid].length === 0) {
            return m.reply(lang.ADDIMG_ALERT);
        }

        await m.react("⏳");

        const filePath = `./temp_${Date.now()}.pdf`;
        const doc = new PDFDocument();

        doc.pipe(fs.createWriteStream(filePath));

        pdfStore[m.jid].forEach((item, index) => {

            if (index !== 0) doc.addPage();

            if (item.type === "image") {
                doc.image(item.content, {
                    fit: [500, 700],
                    align: "center",
                    valign: "center"
                });
            }

            if (item.type === "text") {
                doc
                    .fontSize(16)
                    .text(item.content, {
                        align: "left"
                    });
            }
        });


        doc.end();

        setTimeout(async () => {
            await client.sendMessage(m.jid, {
                document: fs.readFileSync(filePath),
                mimetype: "application/pdf",
                fileName: "xbotmd.pdf"
            }, { quoted: m });

            fs.unlinkSync(filePath);
            pdfStore[m.jid] = [];

            await m.react("✅");
        }, 2000);

    } catch (err) {
        console.log(err);
        await m.react("❌");
        m.reply(lang.PDF_ALERT);
    }
});

Sparky({
    name: "addimg",
    fromMe: isPublic,
    category: "pdf converters",
    desc: lang.ADDIMG_DESC,
}, async ({ m }) => {

    if (!m.quoted || !m.quoted.message.imageMessage) {
        return m.reply(lang.ADDIMG_ALERT);
    }

    await m.react("⏳");

    const buffer = await m.quoted.download();

    if (!pdfStore[m.jid]) pdfStore[m.jid] = [];

    pdfStore[m.jid].push({
        type: "image",
        content: buffer
    });

    await m.react("🍻");
    m.reply(`${lang.ADDIMG_SUCCESS}\n${pdfStore[m.jid].length}`);
});

Sparky({
    name: "addtext",
    fromMe: isPublic,
    category: "pdf converters",
    desc: lang.ADDTEXT_DESC,
}, async ({ m }) => {

    const text = m.quoted?.text || m.text.split(" ").slice(1).join(" ");

    if (!text) return m.reply(lang.ADDTEXT_ALERT);

    if (!pdfStore[m.jid]) pdfStore[m.jid] = [];

    pdfStore[m.jid].push({
        type: "text",
        content: text
    });

    m.reply(`${lang.ADDTEXT_SUCCESS}\n${pdfStore[m.jid].length}`);
});

Sparky({
    name: "clear",
    fromMe: isPublic,
    category: "pdf converters",
    desc: lang.CLEAR_DESC,
}, async ({ m }) => {
    pdfStore[m.jid] = [];
    m.reply(lang.CLEAR_SUCCESS);
});