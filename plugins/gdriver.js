// commands/gdrive.js
const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

const API_TOKEN = "VK4fry";
const API_BASE = "https://whiteshadow-x-api.onrender.com/api/download/gdrive";

function getQuery(args) {
    if (!args) return "";
    if (Array.isArray(args)) return args.join(" ").trim();
    if (typeof args === "string") return args.trim();
    if (typeof args === "object") return Object.values(args).join(" ").trim();
    return "";
}

function extractFileId(url) {
    let match = url.match(/\/file\/d\/([^\/]+)/);
    if (match) return match[1];
    match = url.match(/[?&]id=([^&]+)/);
    if (match) return match[1];
    match = url.match(/\/d\/([^\/]+)/);
    if (match) return match[1];
    return null;
}

async function getDirectDownloadLink(fileId) {
    // First try: WhiteShadow API
    try {
        const apiUrl = `${API_BASE}?url=https://drive.google.com/file/d/${fileId}/view&apitoken=${API_TOKEN}`;
        const response = await axios.get(apiUrl, { timeout: 15000 });
        if (response.data && response.data.success === true && response.data.download_url) {
            return { url: response.data.download_url, method: 'api' };
        }
    } catch (e) {
        console.log("[GDrive] API method failed, trying fallback...");
    }

    // Fallback: Generate direct download URL using file ID
    // This works for public files
    const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    return { url: directUrl, method: 'direct' };
}

Sparky({
    name: "gdrive",
    alias: ["gd", "googledrive"],
    category: "download",
    fromMe: isPublic,
    desc: "📁 Google Drive file එකක් ඩවුන්ලෝඩ් කරන්න"
}, async ({ client, m, args }) => {
    let url = getQuery(args);
    if (!url) {
        return m.reply(`📁 *Google Drive Downloader*

*Usage:* ${m.prefix}gdrive <google_drive_link>
*Example:* ${m.prefix}gdrive https://drive.google.com/file/d/xxxxx/view`);
    }

    if (!url.includes("drive.google.com")) {
        return m.reply(`❌ *Invalid URL*\n\nPlease provide a valid Google Drive link.`);
    }

    const fileId = extractFileId(url);
    if (!fileId) {
        return m.reply(`❌ *Invalid Google Drive URL*\n\nCould not extract file ID from the URL.`);
    }

    await m.react("⏳");
    await client.sendPresenceUpdate('composing', m.jid);
    await m.reply(`🔍 *Processing Google Drive file...*\n📎 File ID: ${fileId}`);

    try {
        // Get download link (with fallback)
        const downloadInfo = await getDirectDownloadLink(fileId);
        const downloadUrl = downloadInfo.url;

        await m.reply(`📥 *Downloading file...*\n⏳ Please wait...`);

        const fileRes = await axios.get(downloadUrl, {
            responseType: 'arraybuffer',
            timeout: 120000,
            headers: { 
                'User-Agent': 'Mozilla/5.0',
                'Accept': '*/*'
            },
            maxRedirects: 5
        });

        const buffer = Buffer.from(fileRes.data);
        const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);

        if (buffer.length < 5000) {
            throw new Error("Downloaded file is too small. The link might be invalid.");
        }

        // Try to get filename from Content-Disposition header
        let fileName = `gdrive_${fileId}`;
        const contentDisposition = fileRes.headers['content-disposition'];
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="(.+?)"/);
            if (match) fileName = match[1];
        }

        // Determine MIME type
        let mimetype = 'application/octet-stream';
        const contentType = fileRes.headers['content-type'] || '';
        if (contentType) mimetype = contentType;

        // Get extension
        let ext = '';
        const nameParts = fileName.split('.');
        ext = nameParts.length > 1 ? nameParts.pop() : 'file';
        if (!ext || ext === fileName) {
            if (mimetype.includes('pdf')) ext = 'pdf';
            else if (mimetype.includes('zip')) ext = 'zip';
            else if (mimetype.includes('image')) ext = mimetype.split('/')[1] || 'jpg';
            else if (mimetype.includes('video')) ext = mimetype.split('/')[1] || 'mp4';
            else ext = 'file';
            fileName = `${fileName}.${ext}`;
        }

        const caption = `📁 *Google Drive Download Complete*\n\n📄 *File:* ${fileName}\n📦 *Size:* ${fileSizeMB} MB\n🔗 *File ID:* ${fileId}\n${downloadInfo.method === 'direct' ? '⚠️ *Direct download (may have quota limits)*' : ''}\n\n> *Powered by SADEW-MINI*`;

        await client.sendMessage(m.jid, {
            document: buffer,
            mimetype: mimetype,
            fileName: fileName,
            caption: caption
        }, { quoted: m });

        await m.react("✅");
        await m.reply(`✅ *Download complete!* (${fileSizeMB} MB)`);

    } catch (error) {
        console.error("GDrive error:", error);
        await m.react("❌");
        
        let errorMsg = `❌ *Download failed*\n\n`;
        if (error.message.includes("Download limit") || error.message.includes("quota")) {
            errorMsg += `The file has reached its download limit or is not publicly accessible.\n\n💡 *Try these:*\n1. Make sure the file is shared with "Anyone with the link"\n2. Try again after a few hours (Google Drive quota resets)\n3. If you own the file, you can create a direct download link using:\n   \`https://drive.google.com/uc?export=download&id=${fileId}\``;
        } else if (error.message.includes("not found") || error.message.includes("404")) {
            errorMsg += `File not found. The link might be broken or the file has been removed.`;
        } else if (error.message.includes("timeout")) {
            errorMsg += `The download took too long. Please try again later.`;
        } else {
            errorMsg += `Error: ${error.message.substring(0, 150)}`;
        }
        await m.reply(errorMsg);
    }
});
