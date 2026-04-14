const { command, isPrivate, getJson } = require("../lib/");

command(
    {
        pattern: "cdl",
        fromMe: isPrivate,
        desc: "Get direct download link for Cinesubz content",
        type: "download",
    },
    async (message, match) => {
        // ලින්ක් එකක් දීලා නැත්නම් මැසේජ් එකක් දෙනවා
        if (!match) return await message.reply("*Please provide a Cinesubz movie or episode link!*\n_Example: .cdl https://cinesubz.net/episodes/example-1x1/_");

        const API_KEY = "f8deeb99a26a9666731c6b5dede05914c64ab64ca9b4cfeee8859408a3f9ce30"; 
        const url = `https://back.asitha.top/api/cinesubz/downloadurl?apiKey=${API_KEY}&url=${encodeURIComponent(match)}`;

        try {
            await message.reply("_Generating direct download link..._");
            const response = await getJson(url);

            if (!response || !response.result) {
                return await message.reply("_Error: Failed to fetch the link. Make sure the URL is valid!_");
            }

            const data = response.result;
            let msg = `*🚀 CINESUBZ DIRECT DOWNLOAD*\n\n`;
            msg += `*🎬 Title:* ${data.title || "Cinesubz Content"}\n`;
            msg += `*📊 Quality:* ${data.quality || "N/A"}\n`;
            msg += `*📦 Size:* ${data.size || "N/A"}\n\n`;
            msg += `*🔗 Download Link:* \n${data.url}\n\n`;
            msg += `_SADEW-MD DOWNLOADER_`;

            // ලින්ක් එක රිප්ලයි එකක් විදිහට යවනවා
            await message.reply(msg);

        } catch (e) {
            await message.reply("_Error: API is busy or the link has expired!_");
        }
    }
);
