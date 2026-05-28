// commands/ss.js
const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

Sparky({
    name: "ss",
    alias: ["screenshot", "webss"],
    category: "tools",
    fromMe: isPublic,
    desc: "📸 වෙබ් අඩවියක තිර රුවක් ගන්න"
}, async ({ client, m, args }) => {
    try {
        let url = args.join(" ").trim();
        
        if (!url) {
            return m.reply(`📸 *Website Screenshot*

*Usage:* ${m.prefix}ss <website_url>
*Example:* ${m.prefix}ss https://google.com

*Supports:* HTTP, HTTPS websites
`);
        }
        
        // Add https:// if no protocol specified
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
        }
        
        // Validate URL format
        const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        if (!urlPattern.test(url)) {
            return m.reply("❌ වලංගු URL එකක් නොවේ. කරුණාකර නිවැරදි වෙබ් ලිපිනයක් ඇතුළත් කරන්න.");
        }
        
        await m.react("⏳");
        await client.sendPresenceUpdate('composing', m.jid);
        
        // Free screenshot API (no key required)
        // Using thum.io - completely free, no API key needed
        const screenshotUrl = `https://image.thum.io/get/width/1280/crop/800/${encodeURIComponent(url)}`;
        
        // Try to fetch the screenshot to verify it works
        const response = await axios.get(screenshotUrl, { 
            responseType: 'arraybuffer',
            timeout: 15000
        });
        
        if (response.status !== 200) {
            throw new Error("Failed to capture screenshot");
        }
        
        const caption = `📸 *Website Screenshot*

🌐 URL: ${url}
🤖 Bot: SADEW-MINI
⏱️ Captured: ${new Date().toLocaleString("si-LK")}

> 💫 Powered by thum.io API`;

        await client.sendMessage(m.jid, {
            image: Buffer.from(response.data),
            caption: caption
        }, { quoted: m });
        
        await m.react("✅");
        
    } catch (error) {
        console.error("Screenshot error:", error);
        await m.react("❌");
        
        let errorMsg = "❌ *Screenshot Failed*\n\n";
        
        if (error.message.includes("timeout")) {
            errorMsg += "Website is taking too long to respond. Please try again later.";
        } else if (error.message.includes("Invalid URL")) {
            errorMsg += "The URL format is invalid. Please check the website address.";
        } else {
            errorMsg += `Could not capture screenshot of the website.\n\n📝 Error: ${error.message.substring(0, 100)}`;
        }
        
        await m.reply(errorMsg);
    }
});
