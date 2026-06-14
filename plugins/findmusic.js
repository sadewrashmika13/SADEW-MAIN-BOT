const { Sparky } = require("../lib");
const axios = require("axios");
const FormData = require("form-data");

Sparky({
    pattern: "find",
    alias: ["shazam", "whatsong"],
    category: "tools",
    desc: "Finds the song name from a replied video or audio clip.",
    async start(client, message, res) {
        // Sparky Framework එකේ Chat JID එක නිවැරදිව හඳුනා ගැනීම
        const jid = message.jid || message.from || message.chat || (message.key && message.key.remoteJid);
        
        console.log("=== FIND COMMAND TRIGGERED ===");
        console.log("Target JID:", jid);
        
        try {
            // Framework එක අනුව quoted, mime සහ download ක්‍රම කිහිපයකට ආරක්ෂිතව ලබා ගැනීම
            const quoted = res?.quoted || message.quoted || message.reply_message;
            const mimetype = res?.mime || message.mime || (quoted && (quoted.mime || quoted.mimetype || quoted.msg?.mimetype)) || "";
            const downloadFunc = res?.download || message.download || (quoted && quoted.download);

            console.log("Detected Mimetype:", mimetype);
            console.log("Quoted message found:", !!quoted);

            // 1. වීඩියෝවකට හෝ ඕඩියෝවකට ਰිප්ලයි කරලාද බලනවා
            if (!quoted || !mimetype || (!mimetype.includes("video") && !mimetype.includes("audio"))) {
                return await client.sendMessage(jid, { 
                    text: "❌ කරුණාකර සින්දුව සෙවීමට අවශ්‍ය වීඩියෝවකට (Video) හෝ ඕඩියෝවකට (Audio) රිප්ලයි කර `.find` ලෙස ටයිප් කරන්න." 
                });
            }

            // වැඩේ පටන් ගත්තා කියලා චැට් එකට මැසේජ් එකක් යවනවා
            await client.sendMessage(jid, { 
                text: "🔍 `sadew md` වීඩියෝවේ සින්දුව පරීක්ෂා කරමින් පවතී... කරුණාකර රැඳී සිටින්න..." 
            });

            // 2. මීඩියා එක බෆර් එකට ඩවුන්ලෝඩ් කරගන්නවා
            if (!downloadFunc) {
                return await client.sendMessage(jid, { text: "❌ මීඩියා බෆර් එක ලබා ගැනීමට නොහැකි විය. (Download function error)" });
            }
            
            // Function එකක්ද නැද්ද යන්න පරික්ෂා කර ඩවුන්ලෝඩ් කිරීම
            const mediaBuffer = typeof downloadFunc === 'function' ? await downloadFunc() : await res.download();
            console.log("Media Buffer Downloaded. Size:", mediaBuffer.length, "bytes");

            // 3. AudD API එකට අවශ්‍ය ෆෝම් ඩේටා ලෑස්ති කිරීම
            const form = new FormData();
            const apiKey = "8d48a5d0f1c1f94d56cde6edf1b2bf00"; // ඔයාගේ API Key එක
            
            form.append("api_token", apiKey);
            form.append("file", mediaBuffer, { filename: "media.mp4", contentType: mimetype });
            form.append("return", "apple_music,spotify"); 

            console.log("Sending data to AudD API...");
            
            // 4. API රික්වෙස්ට් එක යැවීම
            const response = await axios.post("https://api.audd.io/", form, {
                headers: {
                    ...form.getHeaders(),
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            const resData = response.data;
            console.log("AudD API Response Status:", resData.status);

            // 5. ප්‍රතිඵල පරිශීලකයාට යැවීම
            if (resData.status === "success" && resData.result) {
                const song = resData.result;
                
                let resultMsg = `*🎵 සින්දුව හඳුනාගත්තා (Sadew MD) 🎵*\n\n`;
                resultMsg += `*📌 නම:* ${song.title}\n`;
                resultMsg += `*👤 ගායකයා:* ${song.artist}\n`;
                
                if (song.album) {
                    resultMsg += `*💿 ඇල්බමය:* ${song.album}\n`;
                }
                
                if (song.release_date) {
                    resultMsg += `*📅 නිකුත් වූ දිනය:* ${song.release_date}\n`;
                }

                // Spotify හෝ Apple Music ලින්ක් එකක් තිබේ නම් ලබා ගැනීම
                const link = song.spotify ? song.spotify.external_urls.spotify : (song.song_link || "");
                if (link) {
                    resultMsg += `\n*🎧 Listen Now:* ${link}`;
                }

                return await client.sendMessage(jid, { text: resultMsg });
            } else {
                return await client.sendMessage(jid, { 
                    text: "❌ කණගාටුයි, මේ වීඩියෝවේ ඇති සින්දුව හොයාගන්න බැරි වුණා. සින්දුවේ ශබ්දය පැහැදිලිදැයි නැවත බලන්න." 
                });
            }

        } catch (error) {
            console.error("CRITICAL ERROR IN .FIND COMMAND:", error);
            // එරර් එකක් ආවොත් ඒකත් චැට් එකට මැසේජ් එකක් විදිහට දානවා බලාගන්න
            try {
                await client.sendMessage(jid, { 
                    text: `⚠️ සින්දුව සෙවීමේදී දෝෂයක් සිදු වුණා:\n\`\`\`${error.message}\`\`\`` 
                });
            } catch (sendErr) {
                console.error("Failed to send error message to WhatsApp:", sendErr);
            }
        }
    }
});
