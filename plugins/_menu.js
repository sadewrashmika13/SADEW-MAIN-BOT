const {
    Sparky,
    commands,
    isPublic
} = require("../lib");
const {
    getBuffer
} = require("./pluginsCore");
const plugins = require("../lib");
const config = require("../config.js");
const font = require("@viper-x/fancytext");
const menust = config.MENU_FONT;
const style = font[menust];
const more = String.fromCharCode(8206);
const readMore = more.repeat(4001);

// --- Server Environment Detection (Obfuscated Core) ---
const _0x3471ce=_0x4c73;function _0x5149(){const _0x99704b=['HEROKU','PITCHER_API_BASE_URL','PWD','codesandbox','1460490jcYrnC','DIGITALOCEAN','REPLIT','13089848qhFTfM','CLOUDFLARE','GITHUB','TERMUX_VERSION','REPLIT_USER','env','32199750KLjfkJ','18wOomgQ','5701444PXyScu','AZURE','7366gnnTKS','846315zOxTke','RAILWAY','NETLIFY','VPS','AWS','GITHUB_SERVER_URL','DYNO','1131GsaKWJ','SPACE_ID','HUGGINGFACE','KOYEB','CODESANDBOX','RENDER','FLY_IO','5671732abHOue','AZURE_HTTP_FUNCTIONS','DIGITALOCEAN_APP_NAME','CF_PAGES','VERCEL','LINUX','userland'];_0x5149=function(){return _0x99704b;};return _0x5149();}(function(_0x14bc52,_0x9e047e){const _0x5ac994=_0x4c73,_0x256c17=_0x14bc52();while(!![]){try{const _0x1155d4=parseInt(_0x5ac994(0x14a))/0x1+parseInt(_0x5ac994(0x130))/0x2*(-parseInt(_0x5ac994(0x138))/0x3)+parseInt(_0x5ac994(0x13f))/0x4+parseInt(_0x5ac994(0x131))/0x5*(parseInt(_0x5ac994(0x12d))/0x6)+parseInt(_0x5ac994(0x12e))/0x7+parseInt(_0x5ac994(0x126))/0x8+-parseInt(_0x5ac994(0x12c))/0x9;if(_0x1155d4===_0x9e047e)break;else _0x256c17['push'](_0x256c17['shift']());}catch(_0x5dbaeb){_0x256c17['push'](_0x256c17['shift']());}}}(_0x5149,0xd4926));function _0x4c73(_0x3c6eb7,_0x511653){const _0x514924=_0x5149();return _0x4c73=function(_0x4c737c,_0x3e9250){_0x4c737c=_0x4c737c-0x125;let _0x40d9b6=_0x514924[_0x4c737c];return _0x40d9b6;},_0x4c73(_0x3c6eb7,_0x511653);}let SERVER=process[_0x3471ce(0x12b)][_0x3471ce(0x148)]?.['includes'](_0x3471ce(0x145))?_0x3471ce(0x144):process[_0x3471ce(0x12b)][_0x3471ce(0x147)]?.['includes'](_0x3471ce(0x149))?_0x3471ce(0x13c):process['env'][_0x3471ce(0x12a)]?_0x3471ce(0x125):process[_0x3471ce(0x12b)]['AWS_REGION']?_0x3471ce(0x135):process['env'][_0x3471ce(0x129)]?'TERMUX':process['env'][_0x3471ce(0x137)]?_0x3471ce(0x146):process[_0x3471ce(0x12b)]['KOYEB_APP_ID']?_0x3471ce(0x13b):process[_0x3471ce(0x12b)][_0x3471ce(0x136)]?_0x3471ce(0x128):process['env']['RENDER']?_0x3471ce(0x13d):process[_0x3471ce(0x12b)]['RAILWAY_SERVICE_NAME']?_0x3471ce(0x132):process[_0x3471ce(0x12b)][_0x3471ce(0x143)]?_0x3471ce(0x143):process[_0x3471ce(0x12b)][_0x3471ce(0x141)]?_0x3471ce(0x14b):process['env'][_0x3471ce(0x140)]?_0x3471ce(0x12f):process[_0x3471ce(0x12b)][_0x3471ce(0x133)]?_0x3471ce(0x133):process[_0x3471ce(0x12b)]['FLY_IO']?_0x3471ce(0x13e):process['env'][_0x3471ce(0x142)]?_0x3471ce(0x127):process[_0x3471ce(0x12b)][_0x3471ce(0x139)]?_0x3471ce(0x13a):_0x3471ce(0x134);

Sparky({
    name: "menu",
    category: "misc",
    fromMe: isPublic,
    desc: "List all available commands"
}, async ({
    client,
    m,
    args
}) => {
    try {
        if (args) {
            for (let i of plugins.commands) {
                if (i.name.test(args)) {
                    return m.reply(style(`*Command : ${args.trim()}*\n*Description : ${i.desc.toLowerCase()}*`));
                }
            }
            return m.reply(style("_oops command not found_"))
        } else {
            let [date, time] = new Date().toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata"
            }).split(",");
            
            // 🎨 NEW LOOK: Beautiful Header Setup
            let botName = config.BOT_INFO.split(";")[0].toUpperCase();
            let ownerName = config.BOT_INFO.split(";")[1];

            let menu = `╭───────────────────────────❖\n`;
            menu += `│ 🧠 *${botName}* 🧠\n`;
            menu += `╰───────────────────────────❖\n\n`;

            menu += `╭─────────── [ 👤 PROFILE ] ──────────❖\n`;
            menu += `│ ⚙️ *Owner:* ${ownerName}\n`;
            menu += `│ 📊 *Mode:* ${config.WORK_TYPE.toUpperCase()}\n`;
            menu += `│ 🛠️ *Prefix:* [ ${m.prefix} ]\n`;
            menu += `│ 🚀 *Platform:* ${SERVER}\n`;
            menu += `│ 📅 *Date:* ${date}\n`;
            menu += `│ ⏰ *Time:* ${time}\n`;
            menu += `│ ⏳ *Uptime:* ${await m.uptime()}\n`;
            menu += `│ 📦 *Plugins:* ${commands.length}\n`;
            menu += `╰───────────────────────────❖\n\n${readMore}\n`;

            let cmnd = [];
            let SparkyName;
            let type = [];

            // Sorting commands based on category
            commands.map((command, num) => {
                if (command.name) {
                    let rawName = command.name;
                    SparkyName = rawName.source.split('\\s*')[1].toString().match(/(\W*)([A-Za-züşiğ öç1234567890]*)/)[2];
                }
                if (command.dontAddCommandList || SparkyName === undefined) return;
                if (!command.dontAddCommandList && SparkyName !== undefined) {
                    let category = command.category ? command.category.toLowerCase() : "misc";
                    cmnd.push({
                        Sparky: SparkyName,
                        category: category
                    });
                    if (!type.includes(category)) type.push(category);
                }
            });

            cmnd.sort();
            
            // 🔮 Emoji Map for Categories
            const categoryEmojis = {
                downloader: "📥",
                youtube: "🎥",
                misc: "⚙️",
                owner: "🔒",
                group: "👥",
                logo: "🎨",
                tools: "🛠️",
                main: "👑"
            };

            // 🎨 NEW LOOK: Beautiful Loop for Categories
            type.sort().forEach((cmmd) => {
                let emoji = categoryEmojis[cmmd] || "✨";
                menu += `╭────────── [ ${emoji} *${cmmd.toUpperCase()}* ] ──────────❖\n`;
                let comad = cmnd.filter(({ category }) => category == cmmd);
                comad.sort();
                comad.forEach(({ Sparky }) => {
                    menu += `│ 📍 \`.${Sparky.trim()}\`\n`;
                });
                menu += `╰───────────────────────────❖\n\n`;
            });

            menu += `*💻 Created By Sadew Rashmika*`;

            let sperky = {
                "key": {
                    "participants": "0@s.whatsapp.net",
                    "remoteJid": "status@broadcast",
                    "fromMe": false,
                    "id": "Hey!"
                },
                "message": {
                    "contactMessage": {
                        "displayName": `${config.BOT_INFO.split(";")[0]}`,
                        "vcard": `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
                    }
                },
                "participant": "0@s.whatsapp.net"
            }

            switch (config.MENU_TYPE.toLowerCase()) {
                case 'big': {
                    return await client.sendMessage(m.jid, {
                        text: style(menu),
                        contextInfo: {
                            externalAdReply: {
                                title: style(`Hey ${m.pushName}!`),
                                body: style(`${config.BOT_INFO.split(";")[0]}`),
                                sourceUrl: "https://aswinsparky.qzz.io",
                                mediaType: 1,
                                showAdAttribution: true,
                                renderLargerThumbnail: true,
                                thumbnailUrl: `${config.BOT_INFO.split(";")[2]}`
                            }
                        }
                    }, { quoted: m });
                }
                case 'image': {
                    return await m.sendFromUrl(config.BOT_INFO.split(";")[2], { caption: style(menu) });
                }
                case 'small': {
                    return await client.sendMessage(m.jid, {
                        text: style(menu),
                        contextInfo: {
                            externalAdReply: {
                                title: style(`Hey ${m.pushName}!`),
                                body: style(`${config.BOT_INFO.split(";")[0]}`),
                                sourceUrl: "https://aswinsparky.qzz.io",
                                mediaUrl: "https://aswinsparky.qzz.io",
                                mediaType: 1,
                                showAdAttribution: true,
                                renderLargerThumbnail: false,
                                thumbnailUrl: `${config.BOT_INFO.split(";")[2]}`
                            }
                        }
                    }, { quoted: sperky });
                }
                case 'document': {
                    return await client.sendMessage(m.jid, {
                        document: {
                            url: 'https://i.ibb.co/pnPNhMZ/2843ad26fd25.jpg'
                        },
                        caption: menu,
                        mimetype: 'application/zip',
                        fileName: style(config.BOT_INFO.split(";")[0]),
                        fileLength: "99999999999",
                        contextInfo: {
                            externalAdReply: {
                                title: style(`Hey ${m.pushName}!`),
                                body: style(`${config.BOT_INFO.split(";")[0]}`),
                                sourceUrl: "https://aswinsparky.qzz.io",
                                mediaType: 1,
                                showAdAttribution: true,
                                renderLargerThumbnail: true,
                                thumbnailUrl: `${config.BOT_INFO.split(";")[2]}`
                            }
                        }
                    }, { quoted: sperky });
                }
                case 'text': {
                    return await client.sendMessage(m.jid, {
                        text: style(menu)
                    }, { quoted: sperky });
                }
                case 'video': {
                    return await client.sendMessage(
                        m.jid,
                        {
                            video: { url: config.BOT_INFO.split(";")[2] },
                            caption: style(menu),
                            gifPlayback: true
                        },
                        { quoted: sperky }
                    );
                }
                case 'payment': {
                    return await client.relayMessage(m.jid, {
                        requestPaymentMessage: {
                            currencyCodeIso4217: 'INR',
                            amount1000: '99000',
                            requestFrom: m.sender.jid,
                            noteMessage: {
                                extendedTextMessage: {
                                    text: style(menu)
                                }
                              },
                            expiryTimestamp: '0',
                            amount: {
                                value: '99000',
                                offset:
