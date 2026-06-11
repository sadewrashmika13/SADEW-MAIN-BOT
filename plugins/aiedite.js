const { Sparky, isPublic } = require("../lib");
const axios = require("axios");
const FormData = require("form-data");

// API Config
const AI_EDIT_API_URL = "https://whiteshadow-x-api.onrender.com/api/ai/flatai-edit";
const API_TOKEN = "VK4fry"; // ඔයා දුන්න API Key එක

/**
 * ⚡ Multi-Server Image Uploader Wrapper
 * Catbox Fail වුණොත් ඔටෝ Tmpfiles එකට මාරු වී URL එක සාදයි.
 */
async function uploadImageToPublicServer(buffer) {
  const filename = `sparky_edit_${Date.now()}.jpg`;

  // --- ක්‍රමය 1: Catbox.moe (With Real Browser Headers) ---
  try {
    const formData = new FormData();
    formData.append("reqtype", "fileupload");
    formData.append("fileToUpload", buffer, { filename, contentType: "image/jpeg" });

    const response = await axios.post("https://catbox.moe/user/api.php", formData, {
      headers: {
        ...formData.getHeaders(),
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Origin": "https://catbox.moe",
        "Referer": "https://catbox.moe/"
      },
      timeout: 25000,
    });

    if (response.data && String(response.data).startsWith("https://")) {
      console.log("Uploaded successfully to Primary (Catbox):", response.data);
      return response.data;
    }
  } catch (error) {
    console.error("Primary Uploader (Catbox) Failed (Status 412 or Blocked). Trying Backup...");
  }

  // --- ක්‍රමය 2: Tmpfiles.org (Fail-Safe Backup) ---
  try {
    const formData = new FormData();
    formData.append("file", buffer, { filename, contentType: "image/jpeg" });

    const response = await axios.post("https://tmpfiles.org/api/v1/upload", formData, {
      headers: {
        ...formData.getHeaders(),
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      },
      timeout: 25000,
    });

    if (response.data?.data?.url) {
      // View URL එක Direct Download URL එකක් බවට පත් කිරීම
      const directUrl = response.data.data.url.replace("https://tmpfiles.org/", "https://tmpfiles.org/dl/");
      console.log("Uploaded successfully to Backup (Tmpfiles):", directUrl);
      return directUrl;
    }
  } catch (error) {
    console.error("Backup Uploader (Tmpfiles) also failed:", error.message);
  }

  return null;
}

// Bot Command එක define කිරීම
Sparky(
  {
    name: "editimg",
    alias: ["edit", "aiedit", "imgedit"],
    fromMe: isPublic,
    category: "ai",
    desc: "Reply to an image with a prompt to edit it using AI.",
  },
  async ({ m, client, args }) => {
    // Prompt එක check කිරීම
    const prompt = Array.isArray(args) ? args.join(" ").trim() : String(args || "").trim();

    if (!prompt) {
      return await m.reply(
        `❌ *Usage:* Reply to an image and type:\n.edit <your prompt>\n\nExample:\n.edit add neon cyberpunk glasses`
      );
    }

    // Image Check එක
    const isQuotedImage = m.quoted && (
        m.quoted.mtype === "imageMessage" || 
        m.quoted.type === "image" ||
        (m.quoted.mime && m.quoted.mime.startsWith("image/")) ||
        !!m.quoted.message?.imageMessage ||
        !!m.quoted.message?.viewOnceMessage?.message?.imageMessage
    );

    if (!isQuotedImage) {
      return await m.reply("❌ *Error:* Please reply to an *Image* to edit it.");
    }

    // React with Loading
    try { if (typeof m.react === "function") await m.react("⏳"); } catch {}

    // 1. WhatsApp image buffer එක download කරගැනීම
    await m.reply("⏳ _Downloading original image..._");
    let imageBuffer;
    try {
      if (typeof m.quoted.download === "function") {
          imageBuffer = await m.quoted.download();
      } else if (client.downloadMediaMessage) {
          imageBuffer = await client.downloadMediaMessage(m.quoted);
      } else {
          const msg = m.quoted.message?.imageMessage || m.quoted.message?.viewOnceMessage?.message?.imageMessage;
          if (msg) imageBuffer = await client.downloadMediaMessage(msg);
      }
      
      if (!imageBuffer) throw new Error("Buffer empty.");
    } catch (err) {
      console.error("Image Download Error:", err);
      try { if (typeof m.react === "function") await m.react("❌"); } catch {}
      return await m.reply("❌ *Error:* Failed to download the replied image.");
    }

    // 2. ෆොටෝ එක URL එකක් බවට පත් කිරීම (Multi-Server)
    await m.reply("📤 _Generating public URL..._");
    const publicImageUrl = await uploadImageToPublicServer(imageBuffer);

    if (!publicImageUrl) {
      try { if (typeof m.react === "function") await m.react("❌"); } catch {}
      return await m.reply("❌ *Error:* All upload servers failed to process this image. Cloudflare blocked the request.");
    }

    // 3. WhiteShadow AI Edit API එක call කිරීම
    await m.reply(`🤖 _AI Editing image: "${prompt}"..._`);
    
    const apiUrl = `${AI_EDIT_API_URL}?url=${encodeURIComponent(publicImageUrl)}&prompt=${encodeURIComponent(prompt)}&apitoken=${API_TOKEN}`;

    try {
      const response = await axios.get(apiUrl, { timeout: 120000 });
      const apiData = response.data;

      if (apiData.status !== "success" || !apiData.result?.edited_image_url) {
        throw new Error(apiData.msg || apiData.result?.message || "AI API Failure.");
      }

      const editedImageUrl = apiData.result.edited_image_url;

      // 4. Edit වුණු ෆොටෝ එක WhatsApp එකට එවන්න
      await m.reply("⬆️ _Downloading edited image and sending..._");

      const finalCaption = `✨ *ѕά𝓭є𝔀 ᵐ𝐃 AI Image Edit*\n\n📝 *Prompt:* ${prompt}\n🛡️ *Watermark:* removed\n\n*Downloaded by SADEW-MD*`;

      await client.sendMessage(
        m.jid,
        {
          image: { url: editedImageUrl },
          caption: finalCaption,
        },
        { quoted: m }
      );

      try { if (typeof m.react === "function") await m.react("✅"); } catch {}

    } catch (apiError) {
      console.error("AI API Error:", apiError.message);
      try { if (typeof m.react === "function") await m.react("❌"); } catch {}
      
      const errMsg = apiError.message.includes("timeout") 
          ? "❌ *Timeout:* The AI took too long to generate the image."
          : `❌ *Error:* ${apiError.message}`;
          
      await m.reply(errMsg);
    }
  }
);
