// commands/ai4.js
const { Sparky, isPublic } = require("../lib");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const config = require("../config");

// ==========================================
// 🔑 LOAD API KEY FROM MULTIPLE SOURCES
// ==========================================
function getApiKey() {
    // Try environment variable first (GitHub Secrets)
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "") {
        console.log("[Gemini] ✅ API key loaded from process.env");
        return process.env.GEMINI_API_KEY.trim();
    }
    // Fallback to config
    if (config.GEMINI_API_KEY && config.GEMINI_API_KEY.trim() !== "") {
        console.log("[Gemini] ✅ API key loaded from config");
        return config.GEMINI_API_KEY.trim();
    }
    console.log("[Gemini] ❌ No API key found!");
    return null;
}

// Get the API key
const API_KEY = getApiKey();

// Initialize Gemini client (only if key exists)
let genAI = null;
let model = null;

if (API_KEY) {
    try {
        genAI = new GoogleGenerativeAI(API_KEY);
        model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        console.log("[Gemini] ✅ Gemini client initialized successfully");
    } catch (err) {
        console.error("[Gemini] ❌ Failed to initialize:", err.message);
    }
}

// Helper function to get query from args
function getQuery(args) {
    if (!args) return "";
    if (Array.isArray(args)) return args.join(" ").trim();
    if (typeof args === "string") return args.trim();
    if (typeof args === "object") return Object.values(args).join(" ").trim();
    return "";
}

// ==========================================
// 📸 MAIN COMMAND
// ==========================================
Sparky({
    name: "ai4",
    alias: ["aimg", "geminiimg", "imgai"],
    category: "ai",
    fromMe: isPublic,
    desc: "🖼️ Gemini AI ඡායාරූප විශ්ලේෂණය"
}, async ({ client, m, args }) => {
    try {
        // Check API key
        if (!API_KEY) {
            return m.reply(`❌ *Gemini API key not found!*

Please add \`GEMINI_API_KEY\` to GitHub Secrets or config.js.

1. Go to: https://aistudio.google.com/app/apikey
2. Create a key starting with \`AIzaSy\`
3. Add to GitHub Secrets as \`GEMINI_API_KEY\``);
        }

        // Check if model initialized
        if (!model) {
            return m.reply(`❌ *Gemini model initialization failed!*

Please check your API key format. It should start with \`AIzaSy\``);
        }

        // ----- 1. Get question -----
        const question = getQuery(args);
        if (!question) {
            return m.reply(`🖼️ *Gemini Image Analyzer*

*Usage:* ${m.prefix}ai4 <question>
*Example:* ${m.prefix}ai4 මෙම පින්තූරයේ තියෙන්නේ මොනවාද?

*How to use:*
1. Send an image with the command, OR
2. Reply to an image with the command

*Aliases:* .aimg, .geminiimg, .imgai

🔑 API key loaded from: ${process.env.GEMINI_API_KEY ? "GitHub Secrets" : "config.js"}`);
        }

        // ----- 2. Get image -----
        let imageBuffer = null;
        let mimeType = "image/jpeg";

        // Check reply image
        if (m.quoted && m.quoted.message) {
            const msgType = Object.keys(m.quoted.message)[0];
            if (["imageMessage", "videoMessage", "stickerMessage"].includes(msgType)) {
                try {
                    imageBuffer = await m.quoted.download();
                    if (msgType === "imageMessage") {
                        mimeType = m.quoted.message[msgType].mimetype || "image/jpeg";
                    } else if (msgType === "videoMessage") {
                        mimeType = "video/mp4";
                    } else if (msgType === "stickerMessage") {
                        mimeType = "image/webp";
                    }
                    console.log("[Gemini] ✅ Downloaded quoted image");
                } catch (err) {
                    console.error("[Gemini] Download quoted image error:", err.message);
                }
            }
        }

        // Check own image
        if (!imageBuffer && m.message) {
            const msgType = Object.keys(m.message)[0];
            if (["imageMessage", "videoMessage", "stickerMessage"].includes(msgType)) {
                try {
                    imageBuffer = await m.download();
                    if (msgType === "imageMessage") {
                        mimeType = m.message[msgType].mimetype || "image/jpeg";
                    } else if (msgType === "videoMessage") {
                        mimeType = "video/mp4";
                    } else if (msgType === "stickerMessage") {
                        mimeType = "image/webp";
                    }
                    console.log("[Gemini] ✅ Downloaded own image");
                } catch (err) {
                    console.error("[Gemini] Download own image error:", err.message);
                }
            }
        }

        if (!imageBuffer) {
            return m.reply(`❌ *කරුණාකර පින්තූරයක් එවන්න හෝ පින්තූරයකට Reply කරන්න.*

*Examples:*
1. Send: \`.ai4 මෙය විස්තර කරන්න\` with an image
2. Reply to an image: \`.ai4 මෙය කුමක්ද?\``);
        }

        // ----- 3. Process with Gemini -----
        await m.react("⏳");
        await m.reply(`🧠 *Gemini AI විශ්ලේෂණය කරමින්...*\n_ඡායාරූපය විශ්ලේෂණය වෙමින් පවතී. කරුණාකර රැඳී සිටින්න._`);

        const base64Image = imageBuffer.toString('base64');
        const imageData = {
            inlineData: {
                data: base64Image,
                mimeType: mimeType
            }
        };

        try {
            console.log("[Gemini] 📤 Sending request to Gemini...");
            console.log(`[Gemini] Question: ${question.substring(0, 50)}...`);
            console.log(`[Gemini] Image size: ${imageBuffer.length} bytes`);
            console.log(`[Gemini] MIME type: ${mimeType}`);

            const result = await model.generateContent([question, imageData]);
            const response = result.response;
            const text = response.text();

            console.log(`[Gemini] ✅ Response received: ${text.substring(0, 100)}...`);

            const replyMsg = `🖼️ *Gemini Image Analysis*\n\n📝 *Question:* ${question}\n\n📌 *Response:*\n${text}\n\n> *Powered by Google Gemini*`;

            await m.reply(replyMsg);
            await m.react("✅");

        } catch (err) {
            console.error("[Gemini] ❌ API error:", err);
            let errorMsg = `❌ *Gemini API error*\n\n`;

            if (err.message?.includes("401") || err.message?.includes("Unauthorized")) {
                errorMsg += `🔑 *Authentication failed!*\n\nYour API key is invalid or expired.\n\n💡 Please check:\n1. GitHub Secrets has \`GEMINI_API_KEY\`\n2. The key starts with \`AIzaSy\`\n3. The key is active on Google AI Studio\n\n🔄 Update your key and restart the bot.`;
            } else if (err.message?.includes("429") || err.message?.includes("rate")) {
                errorMsg += `📊 *Rate limit exceeded!*\n\nPlease wait a minute and try again.`;
            } else if (err.message?.includes("safety")) {
                errorMsg += `⚠️ *Safety filter triggered!*\n\nThe image or question was blocked by Google's safety filters.`;
            } else {
                errorMsg += `📝 *Error:* ${err.message?.substring(0, 200) || "Unknown error"}`;
            }

            await m.reply(errorMsg);
            await m.react("❌");
        }

    } catch (error) {
        console.error("[Gemini] ❌ Command error:", error);
        await m.react("❌");
        m.reply(`❌ *Command error*\n\n${error.message?.substring(0, 150) || "Unknown error"}`);
    }
});
