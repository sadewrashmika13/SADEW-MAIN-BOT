const { command, isPrivate, getJson } = require("../lib/");

command(
    {
        pattern: "cinfo",
        fromMe: isPrivate,
        desc: "Get full details and download links for Cinesubz movie",
        type: "download",
    },
    async (message, match) => {
        // ලින්ක් එකක් දීලා නැත්නම් මැසේජ් එකක් දෙනවා
        if (!match) return await message.reply("*Please provide a valid Cinesubz movie link!*\n_Example: .cinfo https://cinesubz.net/movies/example/_");

        // ඔයාගේ API Key එක සහ URL එක සෙට් කරනවා
        const API_KEY = "f8deeb99a26a9666731c6b5dede05914c64ab64ca9b4cfeee8859408a3f9ce30"; 
        const url = `https://back.asitha.top/api/cinesubz/movie-details?apiKey=${API_KEY}&url=${encodeURIComponent(match)}`;

        try {
            await message.reply("_Fetching movie details... Please wait._");
            const response = await getJson(url);

            if (!response || !response.result) {
                return await message.reply("_Error: Could not fetch details. Make sure the link is correct!_");
            }

            const data = response.result;
            
            // මැසේජ් එක ලස්සනට පිළිවෙළට හදනවා
            let msg = `*🎬 ${data.title}*\n\n`;
            msg += `*📅 Release:* ${data.date || 'N/A'}\n`;
            msg += `*⭐ Rating:* ${data.rating || 'N/A'}\n`;
            msg += `*🎭 Genre:* ${data.category || 'N/A'}\n\n`;
            
            msg += `*📥 DOWNLOAD LINKS:*\n`;

            // ලින්ක්ස් ටික එකින් එක මැසේජ් එකට එකතු කරනවා
            if (data.dl_links && data.dl_links.length > 0) {
                data.dl_links.forEach((dl) => {
                    msg += `\n*💿 ${dl.quality} (${dl.size})*\n🔗 ${dl.link}\n`;
                });
            } else {
                msg += `\n_No download links found for this movie._\n`;
            }

            msg += `\n_SADEW-MD MOVIE ENGINE_`;

            // ෆිල්ම් එකේ පෝස්ටර් එක තියෙනවා නම් ඒකත් එක්කම මැසේජ් එක යවනවා
            if (data.visual && data.visual.poster) {
                await message.sendFromUrl(data.visual.poster, { caption: msg });
            } else {
                await message.reply(msg);
            }

        } catch (e) {
            await message.reply("_Error: API limit reached or the server is not responding!_");
        }
    }
);
