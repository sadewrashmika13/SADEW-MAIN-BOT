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
*Example:* ${m.prefix}gdrive https://drive.google.com/file/d/xxxxx/view

*Note:* Large files (>100MB) may fail due to WhatsApp limits.`);
    }

    if (!url.includes("drive.google.com")) {
        return m.reply(`❌ *Invalid URL*\n\nPlease provide a valid Google Drive link.`);
    }

    const fileId = extractFileId(url);
    if (!fileId) {
        return m.reply(`❌ *Invalid Google Drive URL*\n\nCould not extract file ID.`);
    }

    await m.react("⏳");
    await client.sendPresenceUpdate('composing', m.jid);
    await m.reply(`🔍 *Processing Google Drive file...*\n📎 File ID: ${fileId}`);

    try {
        // Call the WhiteShadow API
        const apiUrl = `${API_BASE}?url=${encodeURIComponent(url)}&apitoken=${API_TOKEN}`;
        const response = await axios.get(apiUrl, { timeout: 20000 });
        const data = response.data;

        // Log full response for debugging
        console.log("[GDrive] API Response:", JSON.stringify(data, null, 2));

        // Check if API returned an error
        if (!data || data.success !== true) {
            const errorMsg = data?.error || data?.message || "Unknown API error";
            
            // Provide specific user-friendly messages
            if (errorMsg.includes("limit") || errorMsg.includes("quota")) {
                throw new Error("Download limit reached. The file has been downloaded too many times or is too large.");
            } else if (errorMsg.includes("permission") || errorMsg.includes("access")) {
                throw new Error("File is not publicly accessible. Please check sharing settings.");
            } else {
                throw new Error(errorMsg);
            }
        }

        // Extract download URL (try different possible field names)
        let downloadUrl = data.download_url || 
                          data.result?.download_url || 
                          data.url || 
                          data.result?.url;
        
        const fileName = data.file_name || 
                        data.result?.file_name || 
                        data.filename || 
                        `gdrive_${fileId}`;
        
        const fileSize = data.file_size || 
                        data.result?.file_size || 
                        data.size || 
                        null;

        if (!downloadUrl) {
            // Check if there's a direct link in the result
            if (data.result && typeof data.result === 'string') {
                downloadUrl = data.result;
            } else {
                throw new Error("No download URL received from API");
            }
        }

        // Validate URL
        if (!downloadUrl.startsWith("http")) {
            console.warn("[GDrive] Invalid download URL format:", downloadUrl);
            throw new Error("Invalid download URL format");
        }

        await m.reply(`📥 *Downloading file...*\n📄 File: ${fileName}${fileSize ? `\n📦 Size: ${fileSize}` : ''}\n⏳ Please wait...`);

        // Download the actual file with better error handling
        const fileRes = await axios.get(downloadUrl, {
            responseType: 'arraybuffer',
            timeout: 120000,
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': '*/*'
            },
            maxRedirects: 5,
            validateStatus: (status) => status < 400 // Accept any status < 400
        });

        // Check if we got an HTML page instead of a file
        const contentType = fileRes.headers['content-type'] || '';
        if (contentType.includes('text/html')) {
            // Check if it's a Google Drive quota page
            const htmlPreview = fileRes.data.slice(0, 1000).toString();
            if (htmlPreview.includes('quota') || htmlPreview.includes('limit')) {
                throw new Error("Download quota exceeded. The file has been downloaded too many times recently.");
            }
            throw new Error("Received HTML instead of file. The link might require authentication.");
        }

        const buffer = Buffer.from(fileRes.data);
        const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);

        // Check if file is too small (likely an error page)
        if (buffer.length < 10000) { // Less than 10KB
            const preview = buffer.toString('utf8').substring(0, 500);
            if (preview.includes('error') || preview.includes('quota') || preview.includes('limit')) {
                throw new Error("Download quota exceeded or file not accessible.");
            }
            throw new Error("Downloaded file is too small. The link might be invalid.");
        }

        // Check WhatsApp file size limit (~100MB for documents)
        if (buffer.length > 100 * 1024 * 1024) {
            await m.reply(`⚠️ *File is large (${fileSizeMB} MB)*\nWhatsApp may not accept files larger than 100MB.\nSending as document (may fail).`);
        }

        // Determine MIME type and extension
        let ext = 'file';
        let mimetype = 'application/octet-stream';
        
        if (contentType.includes('application/vnd.android.package-archive') || fileName.endsWith('.apk')) {
            mimetype = 'application/vnd.android.package-archive';
            ext = 'apk';
        } else if (contentType.includes('image')) {
            mimetype = contentType.split(';')[0];
            ext = contentType.split('/')[1] || 'jpg';
        } else if (contentType.includes('video')) {
            mimetype = contentType.split(';')[0];
            ext = contentType.split('/')[1] || 'mp4';
        } else if (contentType.includes('pdf')) {
            mimetype = 'application/pdf';
            ext = 'pdf';
        } else if (contentType.includes('zip')) {
            mimetype = 'application/zip';
            ext = 'zip';
        } else {
            // Try to get extension from filename
            const nameParts = fileName.split('.');
            if (nameParts.length > 1) {
                ext = nameParts.pop();
                mimetype = `application/${ext}`;
            }
        }

        const finalFileName = `${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

        const caption = `📁 *Google Drive Download Complete*\n\n📄 *File:* ${fileName}\n📦 *Size:* ${fileSizeMB} MB\n🔗 *File ID:* ${fileId}\n\n> *Powered by WhiteShadow API*`;

        // Send as document
        await client.sendMessage(m.jid, {
            document: buffer,
            mimetype: mimetype,
            fileName: finalFileName,
            caption: caption
        }, { quoted: m });

        await m.react("✅");
        await m.reply(`✅ *Download complete!* (${fileSizeMB} MB)`);

    } catch (error) {
        console.error("GDrive error:", error);
        await m.react("❌");
        
        let errorMsg = `❌ *Download failed*\n\n`;
        if (error.message.includes("quota") || error.message.includes("limit") || error.message.includes("too many")) {
            errorMsg += `Google Drive download limit reached.\n\n💡 *Solutions:*\n1. Try again after a few minutes\n2. Use a different Google Drive link\n3. Download the file directly from the browser`;
        } else if (error.message.includes("permission") || error.message.includes("publicly accessible")) {
            errorMsg += `File is not publicly accessible.\n\n💡 Make sure the file is shared with "Anyone with the link".`;
        } else if (error.message.includes("large") || error.message.includes("100MB")) {
            errorMsg += `File is too large for WhatsApp.\n\n💡 WhatsApp document limit is ~100MB.\nTry downloading from browser instead.`;
        } else if (error.message.includes("HTML")) {
            errorMsg += `The link requires login or verification.\n\n💡 Make sure the file is publicly shared.`;
        } else {
            errorMsg += `Error: ${error.message.substring(0, 150)}`;
        }
        await m.reply(errorMsg);
    }
});
