const { cmd, commands } = require('../lib/command')  // ✅ Fixed: added /lib/
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
        if (!q) return reply("❌ *Please provide a movie/anime name.*\nExample: .moviebox Naruto")

        // Safe reactions (won't crash bot if reaction fails)
        try { await m.react('🔍') } catch (e) {}

        const apiUrl = `https://api.asith.md/moviepro?search=${encodeURIComponent(q)}`
        const data = await fetchJson(apiUrl)
        
        if (!data || data.length === 0 || !data[0]) {
            try { await m.react('❌') } catch (e) {}
            return reply(`❌ No results found for "*${q}*".`)
        }

        const movie = data[0]
        const caption = `✨ *MOVIEBOX PRO* ✨\n\n📜 *Title:* ${movie.title}\n📅 *Year:* ${movie.year}\n\n📥 *Download:* ${movie.download_link}\n\n*SADEW-MD*`

        if (movie.thumbnail && movie.thumbnail.startsWith('http')) {
            await conn.sendMessage(from, { image: { url: movie.thumbnail }, caption: caption }, { quoted: mek })
        } else {
            await reply(caption)
        }

        try { await m.react('✅') } catch (e) {}
    } catch (e) {
        console.error(e)
        reply(`❌ Error: ${e.message}`)
    }
})
