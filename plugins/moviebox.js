const { cmd, commands } = require('../command')
const { fetchJson } = require('../lib/functions')

cmd({
    pattern: "moviebox",
    alias: ["mpro", "anime"],
    category: "download",
    desc: "Download movies and anime from MovieBoxPro",
    filename: __filename
},
async(conn, mek, m, { from, quoted, body, isCreator, reply, args, q }) => {
    try {
        if (!q) return reply("❌ *කරුණාකර නම ලබා දෙන්න.*")

        // React කරන්න බැරි වුණොත් Error එකක් නොවෙන්න try-catch එකක් ඇතුළේ දාමු
        try { await m.react('🔍') } catch (e) {}

        const apiUrl = `https://api.asith.md/moviepro?search=${encodeURIComponent(q)}`
        const data = await fetchJson(apiUrl)
        
        if (!data || data.length === 0 || !data[0]) {
            try { await m.react('❌') } catch (e) {}
            return reply("❌ ප්‍රතිඵල හමු වුණේ නැහැ.")
        }

        const movie = data[0]
        const caption = `✨ *MOVIEBOX PRO* ✨

📜 *Title:* ${movie.title}
📅 *Year:* ${movie.year}
🎭 *Genre:* ${movie.genre}

📥 *Download:* ${movie.download_link}

*SADEW-MD*`

        if (movie.thumbnail) {
            await conn.sendMessage(from, { image: { url: movie.thumbnail }, caption: caption }, { quoted: mek })
        } else {
            await reply(caption)
        }

        try { await m.react('✅') } catch (e) {}

    } catch (e) {
        console.log(e)
        reply(`❌ Error: ${e.message}`)
    }
})
