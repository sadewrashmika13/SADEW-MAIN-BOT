// commands/apk.js
const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

// Helper function to get query from args
function getQuery(args) {
    if (!args) return "";
    if (Array.isArray(args)) return args.join(" ").trim();
    if (typeof args === "string") return args.trim();
    if (typeof args === "object") return Object.values(args).join(" ").trim();
    return "";
}

Sparky({
    name: "apk",
    alias: ["apkdl", "downloadapk"],
    category: "download",
    fromMe: isPublic,
    desc: "📲 Search and download APK files from APKPure"
}, async ({ client, m, args }) => {
    try {
        let query = getQuery(args);
        if (!query) {
            return m.reply(`📲 *APK Downloader*

*Usage:* ${m.prefix}apk <app name>
*Example:* ${m.prefix}apk whatsapp

*Supported:* Search and download apps from APKPure`);
        }

        await m.react("🔍");
        await client.sendPresenceUpdate('composing', m.jid);

        // Step 1: Search for the app on APKPure to get the package name
        console.log(`[APK] Searching for: ${query}`);
        
        // Use a direct search API (unofficial) or scrape. 
        // We'll use a free API that returns app info.
        // Note: This is a third-party API, which might change or be unreliable.
        // Consider using a self-hosted solution for production.
        const searchUrl = `https://apkpure.net/search?q=${encodeURIComponent(query)}`;
        
        // Since we can't directly scrape here due to complexity, we'll use a different approach.
        // We'll ask the user to provide the package name if search fails.
        // Alternatively, we can use an existing package list.

        // For simplicity, we'll use a direct download link pattern for known apps.
        // But for a dynamic solution, we'll try to fetch the package name from a search result.
        
        // Let's try a free API that returns package name.
        const apiUrl = `https://api.apkpure.com/v1/search?q=${encodeURIComponent(query)}&region=us&lang=en`;
        let packageName = null;
        let appName = query;

        try {
            const response = await axios.get(apiUrl, { timeout: 10000 });
            if (response.data && response.data.data && response.data.data.length > 0) {
                packageName = response.data.data[0].packageName;
                appName = response.data.data[0].title || query;
            } else {
                throw new Error("No results found");
            }
        } catch (searchError) {
            console.log("[APK] Search API failed, using fallback");
            // If API fails, fallback to a known pattern (e.g., for WhatsApp)
            if (query.toLowerCase().includes("whatsapp")) {
                packageName = "com.whatsapp";
            } else {
                // If we can't find package name, ask the user to provide it directly.
                // We'll also provide a link to find the package name.
                return m.reply(`❌ *App not found in search.*

🔍 *Try providing the package name directly:*
*Example:* ${m.prefix}apk com.whatsapp

ℹ️ *How to find package name?*
1. Go to APKPure website and search for the app.
2. Look at the URL (e.g., https://apkpure.com/whatsapp-messenger/com.whatsapp)
3. The package name is the part after the last '/'.

*Or use this direct link:* https://apkpure.com/search?q=${encodeURIComponent(query)}`);
            }
        }

        // Step 2: Construct the download URL
        // The download link pattern for APKPure: https://d.apkpure.com/b/APK/{PACKAGE_NAME}?version=latest
        const downloadUrl = `https://d.apkpure.com/b/APK/${packageName}?version=latest`;
        
        console.log(`[APK] Package: ${packageName}, Download URL: ${downloadUrl}`);

        await m.reply(`⏳ *Downloading ${appName}...*\n_This may take a few moments._`);

        // Step 3: Download the APK file as a buffer
        const response = await axios.get(downloadUrl, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 60000, // 60 seconds timeout
            maxRedirects: 5
        });

        const buffer = Buffer.from(response.data);
        const fileName = `${appName.replace(/[^a-zA-Z0-9]/g, '_')}.apk`;
        const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);

        // Step 4: Send the APK file as a document
        const caption = `📲 *${appName}*\n\n📦 *Size:* ${fileSizeMB} MB\n📥 *Downloaded from APKPure*\n\n> *Powered by SADEW-MINI*`;

        await client.sendMessage(m.jid, {
            document: buffer,
            mimetype: "application/vnd.android.package-archive",
            fileName: fileName,
            caption: caption
        }, { quoted: m });

        await m.react("✅");

    } catch (error) {
        console.error("[APK Error]", error);
        await m.react("❌");
        
        let errorMsg = "❌ *APK Download Failed*\n\n";
        if (error.message.includes("timeout")) {
            errorMsg += "The download took too long. Please try again later.";
        } else if (error.message.includes("404")) {
            errorMsg += "The app was not found. Please check the app name or provide the package name directly.";
        } else {
            errorMsg += `*Error:* ${error.message.substring(0, 100)}`;
        }
        await m.reply(errorMsg);
    }
});
