const { command, isPrivate, getJson } = require("../lib/");

command(
    {
        pattern: "csearch",
        fromMe: isPrivate,
        desc: "Search movies from Cinesubz",
        type: "download",
    },
    async (message, match) => {
        if (!match) return await message.reply("*Please provide a movie name!*\n_Example: .csearch Maharaja_");

        const API_KEY = "f8deeb99a26a9666731c6b5dede05914c64ab64ca9b4cfeee8859408a3f9ce30"; // අසිත අයියගේ ෆ්‍රී කී එක හෝ ඔයාගේ කී එක මෙතනට දාන්න
        const url = `https://back.asitha.top/api/cinesubz/search?apiKey=${API_KEY}&q=${encodeURIComponent(match)}`;

        try {
            await message.reply("_Searching for " + match + "..._");
            const response = await getJson(url);

            if (!response || !response.result || response.result.length === 0) {
                return await message.reply("_No results found for " + match + "_");
            }

            let msg = `*🎬 CINESUBZ MOVIE SEARCH*\n\n`;
            response.result.map((movie, index) => {
                msg += `*${index + 1}.* ${movie.title}\n*🔗 Link:* ${movie.link}\n\n`;
            });

            msg += `_SADEW-MD MOVIE SEARCH_`;
            
            // Thumbnail එකක් එක්ක යවන්න (Image එකක් තියෙනවා නම්)
            if (response.result[0].thumbnail) {
                await message.sendFromUrl(response.result[0].thumbnail, { caption: msg });
            } else {
                await message.reply(msg);
            }

        } catch (e) {
            await message.reply("_Error: API is busy or down. Try again later!_");
        }
    }
);
