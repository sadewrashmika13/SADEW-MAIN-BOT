const { Sparky } = require("../lib");

const SAFETY = {
  MAX_JIDS: 20,
  BASE_DELAY: 2000,  
  EXTRA_DELAY: 4000,  
};

Sparky({
  name: "forward",
  alias: ["fwd"],
  desc: "Bulk forward media to groups",
  category: "main", // Public කැටගරි එකකට මාරු කළා
  use: ".fwd <group_jids>"
}, async ({ client, m, args }) => {
  try {
    // Quoted message check (ෆිල්ම් එකට/මැසේජ් එකට රිප්ලයි කරලද බලනවා)
    if (!m.quoted) return await m.reply("*🍁 Please reply to a message*");

    let jidInput = "";
    
    if (typeof args === "string") {
      jidInput = args.trim();
    } else if (Array.isArray(args)) {
      jidInput = args.join(" ").trim();
    } else if (args && typeof args === "object") {
      jidInput = args.text || "";
    }
    
    const rawJids = jidInput.split(/[\s,]+/).filter(jid => jid.trim().length > 0);
    
    const validJids = rawJids
      .map(jid => {
        const cleanJid = jid.replace(/@g\.us$/i, "");
        return /^\d+$/.test(cleanJid) ? `${cleanJid}@g.us` : null;
      })
      .filter(jid => jid !== null)
      .slice(0, SAFETY.MAX_JIDS);

    if (validJids.length === 0) {
      return await m.reply(
        "❌ No valid group JIDs found\n" +
        "Examples:\n" +
        ".fwd 120363411055156472@g.us,120363333939099948@g.us\n" +
        ".fwd 120363411055156472 120363333939099948"
      );
    }

    let messageContent = {};
    const mtype = m.quoted.mtype;
    
    if (["imageMessage", "videoMessage", "audioMessage", "stickerMessage", "documentMessage"].includes(mtype)) {
      const buffer = await m.quoted.download();
      
      switch (mtype) {
        case "imageMessage":
          messageContent = {
            image: buffer,
            caption: m.quoted.text || '',
            mimetype: m.quoted.mimetype || "image/jpeg"
          };
          break;
        case "videoMessage":
          messageContent = {
            video: buffer,
            caption: m.quoted.text || '',
            mimetype: m.quoted.mimetype || "video/mp4"
          };
          break;
        case "audioMessage":
          messageContent = {
            audio: buffer,
            mimetype: m.quoted.mimetype || "audio/mp4",
            ptt: m.quoted.ptt || false
          };
          break;
        case "stickerMessage":
          messageContent = {
            sticker: buffer,
            mimetype: m.quoted.mimetype || "image/webp"
          };
          break;
        case "documentMessage":
          messageContent = {
            document: buffer,
            mimetype: m.quoted.mimetype || "application/octet-stream",
            fileName: m.quoted.fileName || "document"
          };
          break;
      }
    } 
    else if (mtype === "extendedTextMessage" || mtype === "conversation") {
      messageContent = {
        text: m.quoted.text
      };
    } 
    else {
      try {
        messageContent = m.quoted;
      } catch (e) {
        return await m.reply("❌ Unsupported message type");
      }
    }

    let successCount = 0;
    const failedJids = [];
    
    for (const [index, jid] of validJids.entries()) {
      try {
        await client.sendMessage(jid, messageContent);
        successCount++;
        
        if ((index + 1) % 10 === 0) {
          await m.reply(`🔄 Sent to ${index + 1}/${validJids.length} groups...`);
        }
        
        const delayTime = (index + 1) % 10 === 0 ? SAFETY.EXTRA_DELAY : SAFETY.BASE_DELAY;
        await new Promise(resolve => setTimeout(resolve, delayTime));
        
      } catch (error) {
        failedJids.push(jid.replace('@g.us', ''));
        await new Promise(resolve => setTimeout(resolve, SAFETY.BASE_DELAY));
      }
    }

    let report = `✅ *Forward Complete*\n\n` +
                 `📤 Success: ${successCount}/${validJids.length}\n` +
                 `📦 Content Type: ${mtype.replace('Message', '') || 'text'}\n`;
    
    if (failedJids.length > 0) {
      report += `\n❌ Failed (${failedJids.length}): ${failedJids.slice(0, 5).join(', ')}`;
      if (failedJids.length > 5) report += ` +${failedJids.length - 5} more`;
    }
    
    if (rawJids.length > SAFETY.MAX_JIDS) {
      report += `\n⚠️ Note: Limited to first ${SAFETY.MAX_JIDS} JIDs`;
    }

    await m.reply(report);

  } catch (error) {
    console.error("Forward Error:", error);
    await m.reply(
      `💢 Error: ${error.message.substring(0, 100)}\n\n` +
      `Please try again or check:\n` +
      `1. JID formatting\n` +
      `2. Media type support\n` +
      `3. Bot permissions`
    );
  }
});
