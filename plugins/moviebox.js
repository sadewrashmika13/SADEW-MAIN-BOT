const { cmd, commands } = require('../command')
const { fetchJson } = require('../lib/functions')

cmd({
    pattern: "moviebox",
    alias: ["mpro", "anime"],
    category: "download",
    desc: "Download movies and anime",
    filename: __filename
},
async(conn, mek, m, { from, quoted, body, isCreator, reply, args, q }) => {
    try {
        if (!q) return reply("❌ *කරුණාකර නම ලබා දෙන්න.*")

        await m.react('🔍')

        const apiUrl = `https://api.asith.md/moviepro?search=${encodeURIComponent(q)}`
        const data = await fetchJson(apiUrl)
        
        if (!data || data.length === 0 || !data[0]) {
            await m.react('❌')
            return reply("❌ ප්‍රතිඵල හමු වුණේ නැහැ.")
        }

        const movie = data[0]
        const caption = `✨ *MOVIEBOX PRO* ✨\n\n📜 *Title:* ${movie.title}\n📅 *Year:* ${movie.year}\n🎭 *Genre:* ${movie.genre}\n\n📥 *Download:* ${movie.download_link}\n\n*SADEW-MD*`

        if (movie.thumbnail) {
            await conn.sendMessage(from, { image: { url: movie.thumbnail }, caption: caption }, { quoted: mek })
        } else {
            await reply(caption)
        }

        await m.react('✅')

    } catch (e) {
        reply(`❌ Error: ${e.message}`)
    }
})
