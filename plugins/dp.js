const axios = require("axios");

// Cache: store { url, timestamp } for each number
global.dpCache = global.dpCache || new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    name: "getdp",
    category: 5, // Tools & Edits
    description: "📸 Get WhatsApp profile picture and about",
    commands: ["getdp", "dp", "getprofile"],

    handler: async ({ socket, msg, sender, command, args, reply }) => {
        let targetJid = '';

        // 1. Reply කරපු කෙනෙක් ඉන්නවද කියලා බලනවා
        const qCtx = msg.message?.extendedTextMessage?.contextInfo;
        if (qCtx && qCtx.participant) {
            targetJid = qCtx.participant;
        } 
        // 2. මැසේජ් එකේ නම්බර් එකක් ගහලද බලනවා (.dp 947...)
        else if (args && args.length > 0) {
            let number = args.join('').replace(/[^0-9]/g, '');
            if (number.length >= 10) {
                targetJid = number + '@s.whatsapp.net';
            }
        } 
        // මුකුත්ම නැත්නම් Error එකක් දෙනවා
        else {
            return reply(`📸 *Profile Fetcher*\n\n*Usage:* .getdp <number>\n*Example:* .getdp 94753518443\n_(හෝ යම් අයෙකුගේ Message එකකට Reply කරන්න)_`);
        }

        let number = targetJid.split('@')[0];

        try { await socket.sendMessage(sender, { react: { text: '⏳', key: msg.key } }); } catch (_) {}
        await reply(`🔍 _Fetching profile for +${number}..._`);

        try {
            // WhatsApp එකේ නම්බර් එක තියෙනවද කියලා බලනවා
            const [exists] = await socket.onWhatsApp(targetJid);
            if (!exists || !exists.exists) {
                try { await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } }); } catch (_) {}
                return reply(`❌ *Number +${number} is not on WhatsApp.*`);
            }

            targetJid = exists.jid;

            // About එක ගන්නවා (Bio එක)
            let about = 'Not available';
            try {
                const status = await socket.fetchStatus(targetJid);
                if (status && status.status) about = status.status;
            } catch(e) { 
                about = 'Not available (Privacy Protected)'; 
            }

            // Profile Picture එක ගන්නවා (Cache එක පාවිච්චි කරලා)
            let ppUrl = null;
            let now = Date.now();
            let cached = global.dpCache.get(number);
            
            if (cached && (now - cached.timestamp) < CACHE_TTL) {
                ppUrl = cached.url;
            } else {
                for (let attempt = 0; attempt < 2; attempt++) {
                    try {
                        ppUrl = await socket.profilePictureUrl(targetJid, 'image'); // HD එක බලනවා
                        break;
                    } catch (err) {
                        try {
                            ppUrl = await socket.profilePictureUrl(targetJid, 'preview'); // SD එක බලනවා
                            break;
                        } catch (err2) {
                            if (attempt === 0) await delay(1500); 
                        }
                    }
                }
                global.dpCache.set(number, { url: ppUrl, timestamp: now });
            }

            // Cache එක විනාඩි 5කින් අයින් කරනවා
            setTimeout(() => global.dpCache.delete(number), CACHE_TTL);

            // ලස්සන Caption එකක් හදනවා
            let caption = `*↳ ❝ [📸 𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗣𝗿𝗼𝗳𝗶𝗹𝗲 📸] ¡! ❞*\n\n` +
                          `📞 *Number:* +${number}\n` +
                          `📝 *About:* ${about}\n\n` +
                          `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

            if (ppUrl) {
                try {
                    const imgRes = await axios.get(ppUrl, { responseType: 'arraybuffer', timeout: 10000 });
                    const buffer = Buffer.from(imgRes.data);
                    await socket.sendMessage(sender, { image: buffer, caption: caption }, { quoted: msg });
                } catch (imgErr) {
                    await socket.sendMessage(sender, { text: `${caption}\n\n🖼️ Profile picture URL:\n${ppUrl}` }, { quoted: msg });
                }
            } else {
                await socket.sendMessage(sender, { text: `🖼️ *No profile picture (or Privacy protected)*\n\n${caption}` }, { quoted: msg });
            }
            
            try { await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } }); } catch (_) {}

        } catch (error) {
            console.error("GetDP error:", error);
            try { await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } }); } catch (_) {}
            
            let errMsg = `❌ *Failed:* ${error.message.substring(0, 150)}`;
            if (error.message.includes('rate') || error.message.includes('too many')) {
                errMsg += `\n\n⏳ _WhatsApp is rate‑limiting. Please wait a minute and try again._`;
            }
            await reply(errMsg);
        }
    }
};
