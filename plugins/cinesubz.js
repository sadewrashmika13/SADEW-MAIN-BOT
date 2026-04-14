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

        // Selection Logic
        if (message.reply_message && message.reply_message.text && match && !isNaN(match)) {
            const rows = message.reply_message.text.split('\n');
            const selection = rows.find(r => r.includes(`${match}.`));

            if (!selection) return;

            if (message.reply_message.text.includes("CINESUBZ MOVIE SEARCH")) {
                const link = selection.split('🔗 Link: ')[1]?.trim();
                if (!link) return;

                await message.reply("_Fetching details..._");
                try {
                    const res = await getJson(`https://back.asitha.top/api/cinesubz/movie-details?apiKey=${API_KEY}&url=${encodeURIComponent(link)}`);
                    if (!res || !res.result) return await message.reply("_Details not found!_");
                    
                    let info = `*🎬 ${res.result.title}*\n\n*⭐ Rating:* ${res.result.rating}\n\n*Reply with the number to get link:*`;
                    res.result.dl_links.forEach((dl, i) => {
                        info += `\n\n*${i + 1}.* ${dl.quality} (${dl.size})\n🔗 Link: ${dl.link}`;
                    });

                    return await message.sendFromUrl(res.result.visual.poster, { caption: info });
                } catch (e) {
                    return await message.reply("_Error fetching details!_");
                }
            }

            if (message.reply_message.text.includes("Reply with the number to get link")) {
                const dlUrl = selection.split('🔗 Link: ')[1]?.trim();
                if (!dlUrl) return;

                await message.reply("_Generating direct download URL..._");
                try {
                    const res = await getJson(`https://back.asitha.top/api/cinesubz/downloadurl?apiKey=${API_KEY}&url=${encodeURIComponent(dlUrl)}`);
                    if (!res || !res.result) return await message.reply("_Error generating link!_");
                    return await message.reply(`*🚀 DIRECT DOWNLOAD LINK*\n\n*🎬 ${res.result.title}*\n*📊 Quality:* ${res.result.quality}\n\n*🔗 URL:* ${res.result.url}`);
                } catch (e) {
                    return await message.reply("_Error!_");
                }
            }
        }

        // Initial Search
        if (!match) return await message.reply("*Please provide a movie name!*\n_Example: .cine Maharaja_");

        try {
            const res = await getJson(`https://back.asitha.top/api/cinesubz/search?apiKey=${API_KEY}&q=${encodeURIComponent(match)}`);
            if (!res || !res.result || res.result.length === 0) return await message.reply("_No results found!_");

            let list = `*🎬 CINESUBZ MOVIE SEARCH*\n\n_Reply to this message with a number:_\n\n`;
            res.result.map((m, i) => {
                list += `*${i + 1}.* ${m.title}\n🔗 Link: ${m.link}\n\n`;
            });

            return await message.reply(list);
        } catch (e) {
            await message.reply("_API connection failed!_");
        }
    }
);
