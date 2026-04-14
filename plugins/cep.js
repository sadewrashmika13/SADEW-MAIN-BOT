const { command, isPrivate, getJson } = require("../lib/");

command(
    {
        pattern: "cep",
        fromMe: isPrivate,
        desc: "Get download links for a specific Cinesubz episode",
        type: "download",
    },
    async (message, match) => {
        if (!match) return await message.reply("*Please provide a Cinesubz episode link!*\n_Example: .cep https://cinesubz.net/episodes/example-1x1/_");

        const API_KEY = "f8deeb99a26a9666731c6b5dede05914c64ab64ca9b4cfeee8859408a3f9ce30"; 
        const url = `https://back.asitha.top/api/cinesubz/episode-details?apiKey=${API_KEY}&url=${encodeURIComponent(match)}`;

        try {
            await message.reply("_Fetching episode details..._");
            const response = await getJson(url);

            if (!response || !response.result) {
                return await message.reply("_Error: Could not fetch episode details. Check the link!_");
            }

            const data = response.result;
            let msg = `*📺 ${data.title}*\n\n`;
            msg += `*📥 DOWNLOAD LINKS:*\n`;

            if (data.dl_links && data.dl_links.length > 0) {
                data.dl_links.forEach((dl) => {
                    msg += `\n*💿 ${dl.quality} (${dl.size})*\n🔗 ${dl.link}\n`;
                });
            } else {
                msg += `\n_No download links found for this episode._\n`;
            }

            msg += `\n_SADEW-MD EPISODE ENGINE_`;

            // Thumbnail එකක් තියෙනවා නම් ඒකත් එක්ක යවමු
            if (data.visual && data.visual.poster) {
                await message.sendFromUrl(data.visual.poster, { caption: msg });
            } else {
                await message.reply(msg);
            }

        } catch (e) {
            await message.reply("_Error: API is busy or server limit reached!_");
        }
    }
);
