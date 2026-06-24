// commands/ai4.js
const { Sparky, isPublic } = require("../lib");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const config = require("../config");

// Get API key from environment (GitHub Secrets)
const API_KEY = process.env.GEMINI_API_KEY || config.GEMINI_API_KEY;

if (!API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY not found in environment or config!");
}

// Initialize Gemini
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // or "gemini-1.5-pro"

function getQuery(args) {
    if (!args) return "";
    if (Array.isArray(args)) return args.join(" ").trim();
    if (typeof args === "string") return args.trim();
    if (typeof args === "object") return Object.values(args).join(" ").trim();
    return "";
}

Sparky({
    name: "ai4",
    alias: ["aimg", "geminiimg", "imgai"],
    category: "ai",
    fromMe: isPublic,
    desc: "🖼️ Gemini AI වෙත ඡායාරූපයක් යවා විස්තර හෝ ප්‍රශ්න අසන්න"
}, async ({ client, m, args }) => {
    try {
        // ---------- 1. Get query text ----------
        const question = getQuery(args);
        if (!question) {
            return m.reply(`🖼️ *Gemini Image Analyzer*

*Usage:* ${m.prefix}ai4 <question>
*Example:* ${m.prefix}ai4 මෙම පින්තූරයේ තියෙන්නේ මොනවාද?

*How to use:*
1. Send an image with the command, OR
2. Reply to an image with the command

*Aliases:* .aimg, .geminiimg, .imgai

*Note:* API key is loaded from GitHub Secrets (GEMINI_API_KEY)`);
        }

        // ---------- 2. Get the image ----------
        let imageBuffer = null;
        let mimeType = "image/jpeg";

        // Check if there's a quoted image (reply to an image)
        if (m.quoted && m.quoted.message) {
            const msgType = Object.keys(m.quoted.message)[0];
            if (["imageMessage", "videoMessage", "stickerMessage"].includes(msgType)) {
                try {
                    imageBuffer = await m.quoted.download();
                    if (msgType === "videoMessage") {
                        // Extract first frame? For now, treat as image.
                        mimeType = "video/mp4";
                    } else if (msgType === "stickerMessage") {
                        mimeType = "image/webp";
                    } else {
                        mimeType = m.quoted.message[msgType].mimetype || "image/jpeg";
                    }
                } catch (err) {
                    console.error("Download quoted image error:", err);
                }
            }
        }

        // If no quoted image, check if the message itself has an image
        if (!imageBuffer && m.message) {
            const msgType = Object.keys(m.message)[0];
            if (["imageMessage", "videoMessage", "stickerMessage"].includes(msgType)) {
                try {
                    imageBuffer = await m.download();
                    if (msgType === "videoMessage") {
                        mimeType = "video/mp4";
                    } else if (msgType === "stickerMessage") {
                        mimeType = "image/webp";
                    } else {
                        mimeType = m.message[msgType].mimetype || "image/jpeg";
                    }
                } catch (err) {
                    console.error("Download own image error:", err);
                }
            }
        }

        if (!imageBuffer) {
            return m.reply(`❌ *කරුණාකර පින්තූරයක් එවන්න හෝ පින්තූරයකට Reply කරන්න.*

*Examples:*
1. Send: \`.ai4 මෙය විස්තර කරන්න\` with an image
2. Reply to an image: \`.ai4 මෙය කුමක්ද?\``);
        }

        // ---------- 3. Prepare for Gemini ----------
        await m.react("⏳");
        await client.sendPresenceUpdate('composing', m.jid);
        await m.reply(`🧠 *Gemini AI සිතමින්...*\n_ඡායාරූපය විශ්ලේෂණය වෙමින් පවතී. කරුණාකර රැඳී සිටින්න._`);

        // ---------- 4. Convert image to base64 ----------
        const base64Image = imageBuffer.toString('base64');
        const imageData = {
            inlineData: {
                data: base64Image,
                mimeType: mimeType
            }
        };

        // ---------- 5. Call Gemini ----------
        try {
            const result = await model.generateContent([
                question,
                imageData
            ]);
            const response = result.response;
            const text = response.text();

            // ---------- 6. Send response ----------
            const replyMsg = `🖼️ *Gemini Image Analysis*\n\n📝 *Question:* ${question}\n\n📌 *Response:*\n${text}\n\n> *Powered by Google Gemini*`;

            // Send the image back with caption? Optional, but we already have the image.
            // If we want to send the image again with caption:
            // await client.sendMessage(m.jid, { image: imageBuffer, caption: replyMsg }, { quoted: m });
            // But to avoid duplication, just send text:
            await m.reply(replyMsg);

            await m.react("✅");

        } catch (err) {
            console.error("Gemini API error:", err);
            let errorMsg = `❌ *Gemini API error*\n\n`;
            if (err.message.includes("API key")) {
                errorMsg += `API key එක වලංගු නැහැ. කරුණාකර GEMINI_API_KEY GitHub Secrets එකේ හරිද පරීක්ෂා කරන්න.`;
            } else if (err.message.includes("safety")) {
                errorMsg += `ආරක්ෂක හේතූන් මත මෙම ඡායාරූපය විශ්ලේෂණය කළ නොහැක.`;
            } else if (err.message.includes("rate")) {
                errorMsg += `API rate limit එක ඉක්මවා ගියා. ටික වෙලාවකින් නැවත උත්සාහ කරන්න.`;
            } else {
                errorMsg += `Error: ${err.message.substring(0, 200)}`;
            }
            await m.reply(errorMsg);
            await m.react("❌");
        }

    } catch (error) {
        console.error("AI4 command error:", error);
        await m.react("❌");
        m.reply(`❌ *Command error*\n\n${error.message.substring(0, 150)}`);
    }
});
