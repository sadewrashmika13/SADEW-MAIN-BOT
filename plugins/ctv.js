const { command, isPrivate, getJson } = require("../lib/");

command(
    {
        pattern: "ctv",
        fromMe: isPrivate,
        desc: "Get all episodes list for a Cinesubz TV series",
        type: "download",
    },
    async (message, match) => {
        // ලින්ක් එකක් දීලා නැත්නම් මැසේජ් එකක් දෙනවා
        if (!match) return await message.reply("*Please provide a Cinesubz TV Show link!*\n_Example: .ctv https://cinesubz.net/tvshows/example-series/_");

        const API_KEY = "f8deeb99a26a9666731c6b5dede05914c64ab64ca9b4cfeee8859408a3f9ce30"; 
        const url = `https://back.asitha.top/api/cinesubz/tvshow-details?apiKey=${API_KEY}&url=${encodeURIComponent(match)}`;

        try {
            await message.reply("_Fetching TV series details and episodes..._");
            const response = await getJson(url);

            if (!response || !response.result) {
                return await message.reply("_Error: Could not fetch TV show details. Check the link!_");
            }

            const data = response.result;
            let msg = `*📺 ${data.title}*\n\n`;
            msg += `*📅 Year:* ${data.date || 'N/A'}\n`;
            msg += `*⭐ Rating:* ${data.rating || 'N/A'}\n\n`;
            msg += `*📁 EPISODES LIST:*\n`;

            // එපිසෝඩ් ලිස්ට් එක එකින් එක මැසේජ් එකට එකතු කරනවා
            if (data.episodes && data.episodes.length > 0) {
                data.episodes.forEach((ep) => {
                    msg += `\n*📌 ${ep.title}*\n🔗 ${ep.link}\n`;
                });
            } else {
                msg += `\n_No episodes found for this series._\n`;
            }

            msg += `\n_SADEW-MD TV ENGINE_`;

            // පෝස්ටර් එක එක්ක යවමු
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
