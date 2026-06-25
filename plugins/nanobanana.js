const { Sparky, isPublic } = require("../lib");
const axios = require("axios");
const FormData = require("form-data");

// 🔄 NanoBanana API Endpoint
const NANO_BANANA_API = "https://apis.davidcyril.name.ng/nanobanana";

/**
 * ⚡ AI-Friendly Image Uploader (ඔයාගේ සාර්ථක කේතය)
 */
async function uploadImageToPublicServer(buffer) {
  console.log("[SADEW-MD UPLOADER] Uploading start...");
  const filename = `sparky_edit_${Date.now()}.jpg`;

  // --- Envs.sh ---
  try {
    const formData = new FormData();
    formData.append("file", buffer, { filename, contentType: "image/jpeg" });

    const response = await axios.post("https://envs.sh", formData, {
      headers: formData.getHeaders(),
      timeout: 20000,
    });

    if (response.data && String(response.data).includes("https://envs.sh/")) {
      let directUrl = String(response.data).trim();
      if (!directUrl.endsWith(".jpg") && !directUrl.endsWith(".jpeg")) {
         directUrl = directUrl + "?ext=.jpg";
      }
      console.log("[SADEW-MD UPLOADER] Envs.sh Success:", directUrl);
      return directUrl;
    }
  } catch (error) {
    console.error("[SADEW-MD UPLOADER] Envs.sh Failed:", error.message);
  }

  // --- Uguu.se ---
  try {
    const formData = new FormData();
    formData.append("files[]", buffer, { filename, contentType: "image/jpeg" });

    const response = await axios.post("https://uguu.se/upload.php", formData, {
      headers: formData.getHeaders(),
      timeout: 20000,
    });

    if (response.data?.success && response.data?.files?.[0]?.url) {
      const directUrl = response.data.files[0].url;
      console.log("[SADEW-MD UPLOADER] Uguu.se Success:", directUrl);
      return directUrl;
    }
  } catch (error) {
    console.error("[SADEW-MD UPLOADER] Uguu.se Failed:", error.message);
  }

  return null;
}

/**
 * 🔍 API Response එකෙන් අලුත් Image Link එක හොයාගන්නා Helper
 */
function extractImageUrl(obj, depth = 0) {
    if (depth > 5 || !obj) return null;
    if (typeof obj === 'string' && obj.startsWith('http')) return obj;
    
    if (typeof obj === 'object') {
        const keysToCheck = ['url', 'image', 'image_url', 'result', 'data', 'output', 'link'];
        for (let key of keysToCheck) {
            if (obj[key]) {
                if (typeof obj[key] === 'string' && obj[key].startsWith('http')) return obj[key];
                let nested = extractImageUrl(obj[key], depth + 1);
                if (nested) return nested;
            }
        }
        for (let key in obj) {
            let nested = extractImageUrl(obj[key], depth + 1);
            if (nested) return nested;
        }
    }
    return null;
}

// 🤖 Bot Command (.ai3)
Sparky(
  {
    name: "ai3",
    alias: ["nanoedit", "nanobanana"],
    fromMe: isPublic,
    category: "ai",
    desc: "Reply to an image with a prompt to edit it using NanoBanana AI.",
  },
  async ({ m, client, args }) => {

    // 🛡️ මුළු බොට් කමාන්ඩ් එකම බ්ලොක් නොවී මැසේජ් යවන Fail-Safe Function එක
    const sendMsg = async (text) => {
      try {
        if (typeof m.reply === "function") {
          await m.reply(text);
        } else {
          await client.sendMessage(m.jid, { text }, { quoted: m });
        }
      } catch (e) {
        console.error("[SADEW-MD BOT] Primary reply failed, trying backup send:", e.message);
        try {
          await client.sendMessage(m.jid, { text }); 
        } catch (err) {
          console.error("[SADEW-MD BOT] Totally unable to send message:", err.message);
        }
      }
    };

    // 🌟 GLOBAL TRY-CATCH SYSTEM
    try {
      console.log("[SADEW-MD BOT] .ai3 command execution started.");
      const prompt = Array.isArray(args) ? args.join(" ").trim() : String(args || "").trim();

      if (!prompt) {
        return await sendMsg(`❌ *Usage:* Reply to an image and type:\n.ai3 <your prompt>\n\nExample:\n.ai3 convert to real anime beautiful girl`);
      }

      const isQuotedImage = m.quoted && (
          m.quoted.mtype === "imageMessage" || 
          m.quoted.type === "image" ||
          (m.quoted.mime && m.quoted.mime.startsWith("image/")) ||
          !!m.quoted.message?.imageMessage ||
          !!m.quoted.message?.viewOnceMessage?.message?.imageMessage
      );

      if (!isQuotedImage) {
        return await sendMsg("❌ *Error:* Please reply to an *Image* to edit it.");
      }

      try { if (typeof m.react === "function") await m.react("⏳"); } catch {}

      // 1. Image Download
      console.log("[SADEW-MD BOT] Downloading media from WhatsApp...");
      await sendMsg("⏳ _Downloading original image..._");
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

        if (!imageBuffer) throw new Error("Downloaded buffer is empty.");
      } catch (err) {
        console.error("[SADEW-MD BOT] Image Download Failed:", err.message);
        try { if (typeof m.react === "function") await m.react("❌"); } catch {}
        return await sendMsg("❌ *Error:* Failed to download the replied image.");
      }

      // 2. Image Upload (Using your working function)
      console.log("[SADEW-MD BOT] Triggering public uploader...");
      await sendMsg("📤 _Generating public URL..._");
      const publicImageUrl = await uploadImageToPublicServer(imageBuffer);

      if (!publicImageUrl) {
        try { if (typeof m.react === "function") await m.react("❌"); } catch {}
        return await sendMsg("❌ *Error:* Failed to generate a clean public image link via envs.sh / uguu.se.");
      }

      // 3. NanoBanana API Request
      console.log("[SADEW-MD BOT] Sending request to NanoBanana URL:", publicImageUrl);
      await sendMsg(`🤖 _NanoBanana AI Editing image: "${prompt}"..._\n\n⚠️ _Note: This process may take up to 60 seconds._`);

      const apiUrl = `${NANO_BANANA_API}?image_url=${encodeURIComponent(publicImageUrl)}&prompt=${encodeURIComponent(prompt)}&maxTries=20`;

      try {
        const response = await axios.get(apiUrl, { timeout: 60000 });
        const apiData = response.data;
        console.log("[SADEW-MD BOT] API Data Received");

        // JSON එකෙන් අලුත් ෆොටෝ එකේ ලින්ක් එක හොයනවා
        const editedImageUrl = extractImageUrl(apiData);

        if (!editedImageUrl) {
          throw new Error("NanoBanana API did not return a valid image URL. Data: " + JSON.stringify(apiData).slice(0, 100));
        }

        // 4. Send Edited Image
        console.log("[SADEW-MD BOT] Sending final image to user...");
        await sendMsg("⬆️ _Downloading edited image and sending..._");

        const finalCaption = `✨ *ѕά𝓭є𝔀 ᵐ𝐃 NanoBanana Edit*\n\n📝 *Prompt:* ${prompt}\n\n*Downloaded by SADEW-MD*`;

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
        console.error("[SADEW-MD BOT] Inner API Error Caught:", apiError.message);
        try { if (typeof m.react === "function") await m.react("❌"); } catch {}

        let serverRawError = apiError.message;
        if (apiError.response?.data) {
            serverRawError = typeof apiError.response.data === "object" 
              ? JSON.stringify(apiError.response.data, null, 2) 
              : String(apiError.response.data).slice(0, 200);
        }

        const errMsg = apiError.message.includes("timeout") 
            ? "❌ *Timeout:* NanoBanana server took too long. Please try again now!"
            : `❌ *Error:* ${apiError.message}\n\n📊 *NanoBanana Server Response:* \`\`\`${serverRawError}\`\`\``;

        await sendMsg(errMsg);
      }

    } catch (globalError) {
      console.error("[SADEW-MD BOT] CRITICAL GLOBAL ERROR OCCURRED:", globalError);
      try { if (typeof m.react === "function") await m.react("❌"); } catch {}
      await sendMsg(`❌ *Sadew-MD Internal Error:* ${globalError.message}\n\nPlease check \`pm2 logs\` in your terminal.`);
    }
  }
);
