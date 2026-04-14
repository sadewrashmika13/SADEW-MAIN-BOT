const { command, isPrivate, getJson } = require("../lib/");

command(
    {
        pattern: "cine",
        fromMe: isPrivate,
        desc: "Search and download movies from Cinesubz",
        type: "cinesubz",
    },
    async (message, match) => {
        const API_KEY = "f8deeb99a26a9666731c6b5dede05914c64ab64ca9b4cfeee8859408a3f9ce30";

        // --- පියවර 02 & 03: රිප්ලයි එකක් (Selection) ආවම වැඩ කරන කොටස ---
        if (message.reply_message && message.reply_message.text && match && !isNaN(match)) {
            const lines = message.reply_message.text.split('\n');
            const selection = lines.find(l => l.includes(`${match}.`));
            
            if (!selection) return;

            // පියවර 02: සර්ච් ලිස්ට් එකෙන් ෆිල්ම් එක තෝරාගත් විට
            if (message.reply_message.text.includes("CINESUBZ MOVIE SEARCH")) {
                const movieLink = selection.split('🔗 Link: ')[1]?.trim();
                if (!movieLink) return await message.reply("_Link not found!_");

                await message.reply("_Fetching details..._");
                const res = await getJson(`https://back.asitha.top/api/cinesubz/movie-details?apiKey=${API_KEY}&url=${encodeURIComponent(movieLink)}`);
                
                if (!res || !res.result) return await message.reply("_Error fetching details!_");
                
                let detailMsg = `*🎬 ${res.result.title}*\n\n`;
                detailMsg += `*⭐ Rating:* ${res.result.rating}\n\n*Reply with the number to get the direct link:*\n`;
                
                res.result.dl_links.forEach((dl, i) => {
                    detailMsg += `\n*${i + 1}.* ${dl.quality} (${dl.size})\n🔗 Link: ${dl.link}\n`;
                });

                return await message.sendFromUrl(res.result.visual.poster, { caption: detailMsg });
            }

            // පියවර 03: කොලිටි ලිස්ට් එකෙන් ලින්ක් එක තෝරාගත් විට
            if (message.reply_message.text.includes("Reply with the number to get the direct link")) {
                const dlLink = selection.split('🔗 Link: ')[1]?.trim();
                if (!dlLink) return;

                await message.reply("_Generating direct link..._");
                const res = await getJson(`https://back.asitha.top/api/cinesubz/downloadurl?apiKey=${API_KEY}&url=${encodeURIComponent(dlLink)}`);
                
                if (!res || !res.result) return await message.reply("_Error!_");

                return await message.reply(`*🚀 DIRECT LINK FOUND*\n\n*🎬 ${res.result.title}*\n*📊 Quality:* ${res.result.quality}\n\n*🔗 URL:* ${res.result.url}`);
            }
        }

        // --- පියවර 01: මුලින්ම .cine [නම] කියලා ගැහුවම සර්ච් කරන කොටස ---
        if (!match) return await message.reply("*Please provide a movie name!*\n_Example: .cine Maharaja_");

        try {
            const res = await getJson(`https://back.asitha.top/api/cinesubz/search?apiKey=${API_KEY}&q=${encodeURIComponent(match)}`);
            if (!res || !res.result || res.result.length === 0) return await message.reply("_No results found!_");

            let msg = `*🎬 CINESUBZ MOVIE SEARCH*\n\n_Reply to this message with the number you want_\n\n`;
            res.result.map((m, i) => {
                msg += `*${i + 1}.* ${m.title}\n🔗 Link: ${m.link}\n\n`;
            });

            return await message.reply(msg);
        } catch (e) {
            await message.reply("_API Error!_");
        }
    }
);
