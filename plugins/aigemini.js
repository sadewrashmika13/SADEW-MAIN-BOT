// commands/ai4.js
const { Sparky, isPublic } = require("../lib");
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const config = require("../config");

// Get API key from environment (GitHub Secrets)
const API_KEY = process.env.GEMINI_API_KEY || config.GEMINI_API_KEY;

if (!API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY not found in environment or config!");
} else {
    console.log(`✅ Gemini API Key loaded: ${API_KEY.substring(0, 15)}...`);
}

// Check if API key has correct format
if (API_KEY && !API_KEY.startsWith("AIzaSy")) {
    console.warn("⚠️ Invalid Gemini API key format! It should start with 'AIzaSy'");
}

// Initialize Gemini with safety settings
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    safetySettings: [
        {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
    ],
});

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
        // ---------- 1. Check API key ----------
        if (!API_KEY || API_KEY === "") {
            return m.reply(`❌ *Gemini API key not configured!*

කරුණාකර GitHub Secrets එකට \`GEMINI_API_KEY\` එකතු කරන්න.

💡 *How to get API key:*
1. Visit https://aistudio.google.com/app/apikey
2. Create a new API key (starts with \`AIzaSy\`)
3. Add it to GitHub Secrets as \`GEMINI_API_KEY\``);
        }

        if (!API_KEY.startsWith("AIzaSy")) {
            return m.reply(`❌ *Invalid API key format!*

Your API key should start with \`AIzaSy\`

💡 Please get a valid key from:
https://aistudio.google.com/app/apikey`);
        }

        // ---------- 2. Get query ----------
        const question = getQuery(args);
        if (!question) {
            return m.reply(`🖼️ *Gemini Image Analyzer*

*Usage:* ${m.prefix}ai4 <question>
*Example:* ${m.prefix}ai4 මෙම පින්තූරයේ තියෙන්නේ මොනවාද?

*How to use:*
1. Send an image with the command, OR
2. Reply to an image with the command

*Note:* Requires valid Gemini API key (AIzaSy...)`);
        }

        // ---------- 3. Get the image ----------
        let imageBuffer = null;
        let mimeType = "image/jpeg";

        // Check if there's a quoted image (reply to an image)
        if (m.quoted && m.quoted.message) {
            const msgType = Object.keys(m.quoted.message)[0];
            if (["imageMessage", "videoMessage", "stickerMessage"].includes(msgType)) {
                try {
                    imageBuffer = await m.quoted.download();
                    if (msgType === "videoMessage") {
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

        // ---------- 4. Prepare for Gemini ----------
        await m.react("⏳");
        await client.sendPresenceUpdate('composing', m.jid);
        await m.reply(`🧠 *Gemini AI සිතමින්...*\n_ඡායාරූපය විශ්ලේෂණය වෙමින් පවතී. කරුණාකර රැඳී සිටින්න._`);

        // ---------- 5. Convert image to base64 ----------
        const base64Image = imageBuffer.toString('base64');
        const imageData = {
            inlineData: {
                data: base64Image,
                mimeType: mimeType
            }
        };

        // ---------- 6. Call Gemini ----------
        try {
            const result = await model.generateContent([
                question,
                imageData
            ]);
            const response = result.response;
            const text = response.text();

            if (!text || text.trim() === "") {
                throw new Error("Empty response from Gemini");
            }

            // ---------- 7. Send response ----------
            const replyMsg = `🖼️ *Gemini Image Analysis*\n\n📝 *Question:* ${question}\n\n📌 *Response:*\n${text}\n\n> *Powered by Google Gemini*`;

            // Check if message is too long
            if (replyMsg.length > 4000) {
                // Split into chunks
                const chunks = replyMsg.match(/[\s\S]{1,4000}/g) || [replyMsg];
                for (const chunk of chunks) {
                    await m.reply(chunk);
                }
            } else {
                await m.reply(replyMsg);
            }

            await m.react("✅");

        } catch (err) {
            console.error("Gemini API error:", err);
            let errorMsg = `❌ *Gemini API error*\n\n`;
            
            if (err.message.includes("API key") || err.message.includes("401") || err.message.includes("Unauthorized")) {
                errorMsg += `API key එක වලංගු නැහැ.\n\n💡 *විසඳුම:*\n1. https://aistudio.google.com/app/apikey වෙත යන්න\n2. නව API key එකක් හදාගන්න (AIzaSy...)\n3. GitHub Secrets එකට \`GEMINI_API_KEY\` ලෙස එකතු කරන්න`;
            } else if (err.message.includes("safety")) {
                errorMsg += `ආරක්ෂක හේතූන් මත මෙම ඡායාරූපය විශ්ලේෂණය කළ නොහැක.`;
            } else if (err.message.includes("rate") || err.message.includes("quota")) {
                errorMsg += `API rate limit එක ඉක්මවා ගියා.\n⏳ විනාඩි 1-2කින් නැවත උත්සාහ කරන්න.`;
            } else if (err.message.includes("timeout")) {
                errorMsg += `Request timeout. ඡායාරූපය ඉතා විශාල විය හැකියි.\n💡 කුඩා ඡායාරූපයක් උත්සාහ කරන්න.`;
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
