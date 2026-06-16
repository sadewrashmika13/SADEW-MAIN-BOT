// lib/gdriveDownloader.js
const axios = require("axios");

async function downloadGoogleDriveFile(driveUrl) {
    console.log("[GDrive] Processing URL:", driveUrl);

    // 1. File ID extract කරන්න
    let fileId = null;
    let match = driveUrl.match(/\/file\/d\/([^\/]+)/);
    if (match) fileId = match[1];
    else {
        match = driveUrl.match(/[?&]id=([^&]+)/);
        if (match) fileId = match[1];
    }
    // URL එකේ තියෙන 25+ character string එක fileId එක වෙන්න පුළුවන්
    if (!fileId) {
        const idMatch = driveUrl.match(/[a-zA-Z0-9_-]{25,}/);
        if (idMatch) fileId = idMatch[0];
    }
    if (!fileId) throw new Error("Could not extract file ID from URL");

    console.log("[GDrive] File ID:", fileId);

    // 2. Google Drive වෙතින් HTML page එක fetch කරමු
    const pageUrl = `https://drive.google.com/file/d/${fileId}/view`;
    console.log("[GDrive] Fetching page:", pageUrl);

    const pageResponse = await axios.get(pageUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 15000,
        maxRedirects: 5
    });

    const html = pageResponse.data;

    // 3. HTML එකෙන් direct download URL එක extract කරමු
    // උදා: https://drive.usercontent.google.com/download?id=FILE_ID&export=download&confirm=t&uuid=...
    let downloadUrl = null;

    // Method 1: window.playerConfig හෝ window.videoData වලින් URL එක හොයමු
    const configMatch = html.match(/playerConfig\s*:\s*\{[^}]*"url"\s*:\s*"([^"]+)"/);
    if (configMatch) {
        downloadUrl = configMatch[1];
        console.log("[GDrive] Found URL in playerConfig:", downloadUrl);
    }

    // Method 2: <video> tag එකේ src
    if (!downloadUrl) {
        const videoSrcMatch = html.match(/<video[^>]*src="([^"]+)"/);
        if (videoSrcMatch) {
            downloadUrl = videoSrcMatch[1];
            console.log("[GDrive] Found URL in video tag:", downloadUrl);
        }
    }

    // Method 3: direct download link pattern
    if (!downloadUrl) {
        // HTML එකේ direct download link pattern එක හොයමු
        const dlMatch = html.match(/https:\/\/drive\.usercontent\.google\.com\/download\?id=[^&"']+/);
        if (dlMatch) {
            downloadUrl = dlMatch[0] + '&export=download&confirm=t';
            console.log("[GDrive] Found direct download URL:", downloadUrl);
        }
    }

    // 4. තවමත් URL එකක් නැත්නම්, file ID එකෙන් direct URL එක හදමු
    if (!downloadUrl) {
        // First try: confirm=t with export=download
        downloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
        console.log("[GDrive] Using constructed URL:", downloadUrl);
    }

    // 5. URL එක හරිද?
    if (!downloadUrl || !downloadUrl.startsWith('http')) {
        throw new Error("Could not extract download URL from Google Drive page");
    }

    // 6. ගොනුව download කරමු (retries සමඟ)
    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
        try {
            console.log(`[GDrive] Download attempt ${attempt + 1}/${maxAttempts}`);
            const response = await axios.get(downloadUrl, {
                responseType: 'arraybuffer',
                timeout: 180000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': '*/*'
                },
                maxRedirects: 5
            });

            const buffer = Buffer.from(response.data);
            const contentType = response.headers['content-type'] || '';

            // HTML response එකක්ද?
            if (contentType.includes('text/html')) {
                const htmlPreview = buffer.slice(0, 1000).toString();

                // confirm token එකක් තියෙනවද?
                const confirmMatch = htmlPreview.match(/confirm=([^&"'\s]+)/);
                if (confirmMatch) {
                    const token = confirmMatch[1];
                    downloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=${token}`;
                    console.log(`[GDrive] Found confirm token, retrying: ${downloadUrl}`);
                    attempt++;
                    continue;
                }

                // quota exceeded?
                if (htmlPreview.includes('quota') || htmlPreview.includes('limit')) {
                    throw new Error("Download quota exceeded. Try again later.");
                }

                throw new Error(`Received HTML (${buffer.length} bytes). File may require manual download.`);
            }

            // හරි file එකක්ද?
            if (buffer.length < 10000) {
                console.warn(`[GDrive] File too small (${buffer.length} bytes), retrying...`);
                attempt++;
                continue;
            }

            console.log(`[GDrive] Success! Downloaded ${buffer.length} bytes`);
            return {
                buffer: buffer,
                fileName: `gdrive_${fileId}.mp4`,
                fileSize: (buffer.length / (1024 * 1024)).toFixed(2)
            };

        } catch (err) {
            console.error(`[GDrive] Attempt ${attempt + 1} error:`, err.message);
            attempt++;
            if (attempt >= maxAttempts) {
                throw new Error(`Download failed: ${err.message}`);
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    throw new Error("Download failed after multiple attempts");
}

module.exports = { downloadGoogleDriveFile };
