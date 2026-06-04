// commands/getdp.js
const { Sparky, isPublic } = require("../lib");

Sparky({
    name: "getdp",
    alias: ["dp", "getprofile"],
    category: "tools",
    fromMe: isPublic,
    desc: "📸 Get WhatsApp profile picture, name, and about of any number"
}, async ({ client, m, args }) => {
    // Combine all args in case of spaces
    let fullInput = (args && Array.isArray(args)) ? args.join('') : (args || '');
    // If that fails, get from m.text
    if (!fullInput && m.text) {
        // Remove command prefix (like .getdp) from the message
        let withoutCmd = m.text.replace(/^[.\/#!]?getdp/i, '').trim();
        fullInput = withoutCmd.replace(/\s/g, '');
    }
    // Extract digits only
    let number = fullInput.replace(/\D/g, '');
    
    if (!number || number.length < 10) {
        return m.reply(`📸 *Profile Picture Fetcher*

*Usage:* .getdp94712345678
*Example:* .getdp94753518443

*Note:* Include country code (e.g., 94 for Sri Lanka)
No spaces needed.`);
    }

    let jid = number + '@s.whatsapp.net';
    await m.react("⏳");
    await client.sendPresenceUpdate('composing', m.jid);
    await m.reply(`🔍 Fetching profile for ${number}...`);

    try {
        // Check if number exists on WhatsApp
        const [exists] = await client.onWhatsApp(jid);
        if (!exists || !exists.exists) {
            await m.react("❌");
            return m.reply(`❌ Number ${number} is not registered on WhatsApp.`);
        }

        // Get profile picture URL (try HD, then preview)
        let ppUrl = null;
        try { ppUrl = await client.profilePictureUrl(jid, 'image'); } catch(e) {}
        if (!ppUrl) {
            try { ppUrl = await client.profilePictureUrl(jid, 'preview'); } catch(e) {}
        }

        // Get contact name (push name)
        let name = number;
        try {
            const contact = await client.contact[jid];
            if (contact && contact.name) name = contact.name;
            else if (contact && contact.notify) name = contact.notify;
        } catch(e) {}

        // Get about status
        let about = 'Not available';
        try {
            const status = await client.fetchStatus(jid);
            if (status && status.status) about = status.status;
        } catch(e) { about = 'Not available (Privacy)'; }

        let caption = `📸 *WhatsApp Profile*\n\n`;
        caption += `📞 *Number:* ${number}\n`;
        caption += `👤 *Name:* ${name}\n`;
        caption += `📝 *About:* ${about}\n\n`;
        caption += `> *Powered by SADEW-MINI*`;

        if (ppUrl) {
            await client.sendMessage(m.jid, { image: { url: ppUrl }, caption: caption }, { quoted: m });
        } else {
            await client.sendMessage(m.jid, { text: `🖼️ *No profile picture*\n\n${caption}` }, { quoted: m });
        }
        await m.react("✅");
    } catch (error) {
        console.error("GetDP error:", error);
        await m.react("❌");
        let errMsg = `❌ Failed to fetch profile.\n\nError: ${error.message.substring(0, 100)}`;
        await m.reply(errMsg);
    }
});
