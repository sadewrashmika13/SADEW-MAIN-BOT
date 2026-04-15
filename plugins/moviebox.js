const { cmd, commands } = require('../command')
const { fetchJson } = require('../lib/functions')
const axios = require('axios')

cmd({
    name: "moviebox",
    alias: ["anime", "mpro"],
    category: "download",
    desc: "Download movies and anime from MovieBoxPro source",
    filename: __filename
},
async(conn, mek, m, { from, quoted, body, isCreator, reply, args, q }) => {
    try {
        if (!q) return reply("❌ *කරුණාකර මූවී එකේ හෝ ඇනිමෙ එකේ නම ලබා දෙන්න.*\n\n*උදා:* .moviebox Naruto")

        await m.react('🔍')

        // Asith-MD API එක හරහා සෙවීම
        const apiUrl = `https://api.asith.md/moviepro?search=${encodeURIComponent(q)}`
        const response = await axios.get(apiUrl, { timeout: 20000 })
        
        const data = response.data
        if (!data || data.length === 0 || !data[0]) {
            await m.react('❌')
            return reply(`❌ "*${q}*" සඳහා කිසිදු ප්‍රතිඵලයක් හමු වුණේ නැහැ.`)
        }

        const movie = data[0]
        const caption = `✨ *MOVIEBOX PRO DOWNLOADER* ✨

📜 *නම:* ${movie.title}
📅 *වසර:* ${movie.year}
🎭 *වර්ගය:* ${movie.genre}
⭐ *Rating:* ${movie.rating}

📥 *බාගත කර ගැනීමට (Download) පහත ලින්ක් එක භාවිතා කරන්න:*
${movie.download_link}

*Powered by SADEW-MD*`

        // Thumbnail එකක් තිබේ නම් එය සමඟ caption එක යැවීම
        if (movie.thumbnail && movie.thumbnail.startsWith('http')) {
            await conn.sendMessage(from, { 
                image: { url: movie.thumbnail }, 
                caption: caption 
            }, { quoted: mek })
        } else {
            await conn.sendMessage(from, { text: caption }, { quoted: mek })
        }

        await m.react('✅')

    } catch (e) {
        console.log(e)
        await m.react('❌')
        reply(`❌ Error: ${e.message}`)
    }
})
