// commands/getdp.js
const { Sparky, isPublic } = require("../lib");

// Helper to wait a bit
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Sparky({
    name: "getdp",
    alias: ["dp", "getprofile"],
    category: "tools",
    fromMe: isPublic,
    desc: "📸 Get WhatsApp profile picture, name, and about of any number"
}, async ({ client, m, args }) => {
    let fullInput = (args && Array.isArray(args)) ? args.join('') : (args || '');
    if (!fullInput && m.text) {
        let withoutCmd = m.text.replace(/^[.\/#!]?getdp/i, '').trim();
        fullInput = withoutCmd.replace(/\s/g, '');
    }
    let number = fullInput.replace(/\D/g, '');
    
    if (!number || number.length < 10) {
        return m.reply(`📸 *Profile Picture Fetcher*

*Usage:* .getdp94712345678
*Example:* .getdp94753518443

*Note:* Include country code (e.g., 94 for Sri Lanka)`);
    }

    let jid = number + '@s.whatsapp.net';
    await m.react("⏳");
    await client.sendPresenceUpdate('composing', m.jid);
    await m.reply(`🔍 Fetching profile for ${number}...`);

    try {
        // 1. Check if number exists
        const [exists] = await client.onWhatsApp(jid);
        if (!exists || !exists.exists) {
            await m.react("❌");
            return m.reply(`❌ Number ${number} is not registered on WhatsApp.`);
        }

        // 2. Get contact name
        let name = number;
        try {
            const contact = await client.contact[jid];
            if (contact && contact.name) name = contact.name;
            else if (contact && contact.notify) name = contact.notify;
        } catch(e) { /* ignore */ }

        // 3. Get about status
        let about = 'Not available';
        try {
            const status = await client.fetchStatus(jid);
            if (status && status.status) about = status.status;
        } catch(e) { about = 'Not available (Privacy)'; }

        // 4. Get profile picture (with retry & delay)
        let ppUrl = null;
        let attempt = 0;
        while (attempt < 2 && !ppUrl) {
            try {
                // Try HD first
                ppUrl = await client.profilePictureUrl(jid, 'image');
            } catch (err) {
                // If HD fails, try preview
                try {
                    ppUrl = await client.profilePictureUrl(jid, 'preview');
                } catch (err2) {
                    // Wait a bit before retry (rate limit avoidance)
                    if (attempt === 0) await delay(1000);
                }
            }
            attempt++;
        }

        let caption = `📸 *WhatsApp Profile*\n\n`;
        caption += `📞 *Number:* ${number}\n`;
        caption += `👤 *Name:* ${name}\n`;
        caption += `📝 *About:* ${about}\n`;
        caption += `\n> *Powered by SADEW-MINI*`;

        if (ppUrl) {
            await client.sendMessage(m.jid, { image: { url: ppUrl }, caption: caption }, { quoted: m });
        } else {
            await client.sendMessage(m.jid, { text: `🖼️ *No profile picture set*\n\n${caption}` }, { quoted: m });
        }
        await m.react("✅");
    } catch (error) {
        console.error("GetDP error:", error);
        await m.react("❌");
        let errMsg = `❌ Failed to fetch profile.\n\n`;
        if (error.message.includes('timeout') || error.message.includes('rate')) {
            errMsg += `WhatsApp is rate‑limiting requests. Please wait a minute and try again.`;
        } else {
            errMsg += `Error: ${error.message.substring(0, 100)}`;
        }
        await m.reply(errMsg);
    }
});
