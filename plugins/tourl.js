const { Sparky, isPublic } = require("../lib");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");

Sparky({
    name: "tourl",
    category: "misc",
    fromMe: isPublic,
    desc: "Converts replied media into a permanent URL link"
}, async ({ client, m }) => {
    let tempFile = null;
    try {
        if (!m.quoted) {
            return await m.reply("_❌ කරුණාකර ෆොටෝ එකකට, වීඩියෝ එකකට හෝ ඕඩියෝ එකකට Reply කරලා .tourl ගහන්න!_");
        }

        await m.react("🔗");

        const media = await m.quoted.download().catch(() => null);
        
        if (!media) {
            await m.react("❌");
            return await m.reply("_❌ මීඩියා එක ඩවුන්ලෝඩ් කරගැනීමේ ගැටලුවක් ඇතිවුණා!_");
        }

        const mime = m.quoted.mimetype || m.quoted.msg?.mimetype || "image/jpeg";
        const ext = mime.split("/")[1] || "jpeg";
        const filename = `file_${Date.now()}.${ext}`;
        tempFile = path.join(__dirname, filename);
        
        fs.writeFileSync(tempFile, media);

        // 🌐 FormData එකට ෆයිල් එක දාද්දීම නම සහ වර්ගය (Filename & ContentType) අනිවාර්යයෙන්ම දෙනවා
        const bodyForm = new FormData();
        bodyForm.append("reqtype", "fileupload");
        bodyForm.append("fileToUpload", fs.createReadStream(tempFile), {
            filename: filename,
            contentType: mime
        });

        // 🚀 Cloudflare බ්ලොක් නොවෙන්න Real Browser User-Agent එකක් එක්ක පෝස්ට් කරනවා
        const response = await axios.post("https://catbox.moe/user/api.php", bodyForm, {
            headers: {
                ...bodyForm.getHeaders(),
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
        });

        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);

        if (response.data && response.data.includes("http")) {
            await m.react("✅");
            let successMsg = `*🔗 YOUR URL IS READY!* \n\n`;
            successMsg += `• *Link:* ${response.data.trim()}\n`;
            successMsg += `• *Size:* ${(media.length / (1024 * 1024)).toFixed(2)} MB`;
            return await m.reply(successMsg);
        } else {
            throw new Error("Invalid response from hosting server: " + response.data);
        }

    } catch (error) {
        console.error("Tourl Error:", error);
        await m.react("❌");
        
        if (tempFile && fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        
        // 📝 තවමත් අවුලක් ආවොත් එරර් එක වට්ස්ඇප් එකටම එනවා
        let errorMsg = `_❌ Tourl System Error:_\n\`\`\`${error.message || error}\`\`\`\n\n`;
        errorMsg += `*📊 Debug Info:*\n`;
        errorMsg += `• Error Code: \`${error.code || "UNKNOWN"}\`\n`;
        errorMsg += `• Response Data: \`${error.response?.data || "No Data"}\`\n`;
        
        return await m.reply(errorMsg);
    }
});
