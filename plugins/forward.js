const { cmd, commands } = require('../lib/command');
const { fetchJson } = require('../lib/functions');

cmd({
    pattern: "forward",
    alias: ["fwd", "sendto"],
    desc: "Forward a message to another chat",
    category: "tools",
    filename: __filename,
    use: '.forward <jid or number>'
},
async(conn, mek, m, { from, quoted, reply, args }) => {
    try {
        // Target check
        if (!args[0]) {
            return reply(
                `❌ *Usage:* .forward <target>\n\n` +
                `*Examples:*\n` +
                `• .forward 94712345678@s.whatsapp.net\n` +
                `• .forward 94712345678\n\n` +
                `*Note:* Reply to a message you want to forward.`
            );
        }

        // No quoted message
        if (!m.quoted) {
            return reply("❌ *Please reply to a message you want to forward.*");
        }

        let target = args[0];
        if (!target.includes('@')) {
            target = target + '@s.whatsapp.net';
        }

        await m.react('📤');

        // Get the quoted message
        const quotedMsg = m.quoted;
        const messageType = Object.keys(quotedMsg.message)[0];

        // Text message forward
        if (messageType === 'conversation' || messageType === 'extendedTextMessage') {
            const text = quotedMsg.message.conversation || 
                        quotedMsg.message.extendedTextMessage?.text || 
                        "No content";
            
            await conn.sendMessage(target, {
                text: `📨 *Forwarded Message*\n\n${text}`
            });
            
            await m.react('✅');
            return reply(`✅ Message forwarded to ${target}`);
        }

        // Media forward (image, video, document, audio)
        const mediaTypes = ['imageMessage', 'videoMessage', 'documentMessage', 'audioMessage'];
        
        if (mediaTypes.includes(messageType)) {
            const media = quotedMsg.message[messageType];
            const caption = media.caption || `📨 Forwarded from ${from.split('@')[0]}`;
            
            // Download the media
            const mediaBuffer = await m.quoted.download();
            
            // Send based on type
            switch(messageType) {
                case 'imageMessage':
                    await conn.sendMessage(target, {
                        image: mediaBuffer,
                        caption: caption
                    });
                    break;
                case 'videoMessage':
                    await conn.sendMessage(target, {
                        video: mediaBuffer,
                        caption: caption
                    });
                    break;
                case 'documentMessage':
                    await conn.sendMessage(target, {
                        document: mediaBuffer,
                        fileName: media.fileName || 'document',
                        mimetype: media.mimetype,
                        caption: caption
                    });
                    break;
                case 'audioMessage':
                    await conn.sendMessage(target, {
                        audio: mediaBuffer,
                        mimetype: media.mimetype,
                        ptt: false
                    });
                    break;
            }
            
            await m.react('✅');
            return reply(`✅ Media forwarded to ${target}`);
        }

        // Sticker forward
        if (messageType === 'stickerMessage') {
            const stickerBuffer = await m.quoted.download();
            await conn.sendMessage(target, {
                sticker: stickerBuffer
            });
            await m.react('✅');
            return reply(`✅ Sticker forwarded to ${target}`);
        }

        // Contact forward
        if (messageType === 'contactMessage') {
            const contact = quotedMsg.message.contactMessage;
            await conn.sendMessage(target, {
                contacts: {
                    displayName: contact.displayName,
                    contacts: [{ vcard: contact.vcard }]
                }
            });
            await m.react('✅');
            return reply(`✅ Contact forwarded to ${target}`);
        }

        // Other types - try to forward as is
        try {
            await conn.sendMessage(target, {
                forward: quotedMsg
            });
            await m.react('✅');
            return reply(`✅ Message forwarded to ${target}`);
        } catch (e) {
            return reply(`❌ Cannot forward this type of message: ${e.message}`);
        }

    } catch (error) {
        console.error('Forward error:', error);
        await m.react('❌');
        reply(`❌ *Error:* ${error.message}`);
    }
});
