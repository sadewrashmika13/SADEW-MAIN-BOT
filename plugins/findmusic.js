const { Sparky } = require("../lib");
const axios = require("axios");
const FormData = require("form-data");

Sparky({
    pattern: "find",
    alias: ["shazam", "whatsong"],
    category: "tools",
    desc: "Finds the song name from a replied video or audio clip.",
    async start(client, message, { quoted, mime, download }) {
        try {
            // 1. වීඩියෝවකට හෝ ඕඩියෝවකට රිප්ලයි කරලාද බලනවා
            if (!quoted || (!mime.includes("video") && !mime.includes("audio"))) {
                return await client.sendMessage(message.chat, { 
                    text: "❌ කරුණාකර සින්දුව සෙවීමට අවශ්‍ය වීඩියෝවකට (Video) හෝ ඕඩියෝවකට (Audio) රිප්ලයි කර `.find` ලෙස ටයිප් කරන්න." 
                });
            }

            // වැඩේ පටන් ගත්තා කියලා පණිවිඩයක් දානවා
            await client.sendMessage(message.chat, { 
                text: "🔍 `sadew md` වීඩියෝවේ සින්දුව පරීක්ෂා කරමින් පවතී... කරුණාකර රැඳී සිටින්න..." 
            });

            // 2. මීඩියා එක බෆර් එකකට ඩවුන්ලෝඩ් කරගන්නවා
            const mediaBuffer = await download();

            // 3. AudD API එකට අවශ්‍ය ෆෝම් ඩේටා ටික
            const form = new FormData();
            // ඔයා ලබා දුන් API Key එක මෙතැන ඇතුළත් කර ඇත
            const apiKey = "8d48a5d0f1c1f94d56cde6edf1b2bf00"; 
            
            form.append("api_token", apiKey);
            form.append("file", mediaBuffer, { filename: "media.mp4", contentType: mime });
            form.append("return", "apple_music,spotify"); // අමතර විස්තර සඳහා

            // 4. API රික්වෙස්ට් එක යැවීම
            const response = await axios.post("https://api.audd.io/", form, {
                headers: {
                    ...form.getHeaders(),
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            const resData = response.data;

            // 5. ප්‍රතිඵල පෙන්වීම
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

                // Spotify හෝ Apple Music ලින්ක් එකක් තිබේ නම් එය පෙන්වීමට
                const link = song.spotify ? song.spotify.external_urls.spotify : (song.song_link || "");
                if (link) {
                    resultMsg += `\n*🎧 Listen Now:* ${link}`;
                }

                return await client.sendMessage(message.chat, { text: resultMsg });
            } else {
                return await client.sendMessage(message.chat, { 
                    text: "❌ කණගාටුයි, මේ වීඩියෝවේ ඇති සින්දුව හොයාගන්න බැරි වුණා. සින්දුවේ ශබ්දය පැහැදිලිදැයි නැවත බලන්න." 
                });
            }

        } catch (error) {
            console.error("Error in .find command:", error);
            return await client.sendMessage(message.chat, { 
                text: "⚠️ සින්දුව සෙවීමේදී දෝෂයක් සිදු වුණා. කරුණාකර පසුව උත්සාහ කරන්න." 
            });
        }
    }
});
