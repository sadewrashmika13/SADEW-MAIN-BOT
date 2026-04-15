/**
 * ╔══════════════════════════════════════════════╗
 * ║     SADEW-MD — MovieBoxPro Downloader       ║
 * ║     X-BOT-MD v3.7.0 | Node.js              ║
 * ╚══════════════════════════════════════════════╝
 *
 * Command : .moviebox <movie/anime name>
 * API     : https://api.asith.md/moviepro
 *
 * FIXES (from DeepSeek review):
 *   ✅ require path  : '../lib/command'  (not '../command')
 *   ✅ cmd signature : (conn, mek, m, { from, quoted, reply, args, q })
 *   ✅ API parsing   : data is a direct array, not { status, result }
 */

const { cmd, commands } = require('../lib/command');   // ✅ FIXED PATH
const { fetchJson }     = require('../lib/functions');
const axios             = require('axios');

// ─── Helper: safely react without crashing ──────────────────────────────────
async function safeReact(m, emoji) {
  try {
    await m.react(emoji);
  } catch (_) {
    // session unstable — silently ignore
  }
}

// ─── Helper: fetch thumbnail as buffer (no broken image links) ───────────────
async function fetchImageBuffer(url) {
  try {
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });
    return Buffer.from(res.data, 'binary');
  } catch (_) {
    return null;  // thumbnail fail වුණත් crash වෙන්නේ නෑ
  }
}

// ─── PLUGIN ─────────────────────────────────────────────────────────────────
cmd(
  {
    pattern: 'moviebox',
    alias: ['mbox', 'moviepro', 'mbpro'],
    desc: 'MovieBoxPro eke movie/anime search karala download link ganna.',
    category: 'downloader',
    filename: __filename,
    use: '<movie or anime name>',
  },
  async (conn, mek, m, { from, quoted, reply, args, q }) => {  // ✅ FIXED SIGNATURE

    // ── 1. Validate input ──────────────────────────────────────────────────
    const query = (args || []).join(' ').trim() || (q || '').trim();

    if (!query) {
      await safeReact(m, '❌');
      return reply(
        `🎬 *SADEW-MD MOVIE DOWNLOADER*\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Usage: *.moviebox <movie/anime name>*\n\n` +
        `Examples:\n` +
        `  .moviebox Avengers\n` +
        `  .moviebox One Piece\n` +
        `  .moviebox Spider Man No Way Home`
      );
    }

    await safeReact(m, '🔍');

    // ── 2. Call API ────────────────────────────────────────────────────────
    let data;
    try {
      const apiUrl = `https://api.asith.md/moviepro?search=${encodeURIComponent(query)}`;
      data = await fetchJson(apiUrl);
    } catch (err) {
      await safeReact(m, '❌');
      return reply(
        `❌ *API Error*\n\n` +
        `Could not reach MovieBoxPro API.\n` +
        `Error: _${err.message}_\n\n` +
        `💡 Try again in a moment.`
      );
    }

    // ── 3. Validate API response ✅ FIXED: API returns array directly ──────
    if (!data || !Array.isArray(data) || data.length === 0) {
      await safeReact(m, '🚫');
      return reply(
        `🚫 *No results found for:* _${query}_\n\n` +
        `💡 Tips:\n` +
        `• Use the English title\n` +
        `• Try shorter keywords\n` +
        `• Example: *.moviebox Avatar*`
      );
    }

    await safeReact(m, '✅');

    const results = data.slice(0, 5);   // max 5
    const total   = data.length;

    // ── 4. Build message ───────────────────────────────────────────────────
    let listMsg =
      `🎬 *SADEW-MD MOVIE DOWNLOADER*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `🔎 Query: *${query}*\n` +
      `📋 Found: *${total}* result${total !== 1 ? 's' : ''}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    results.forEach((item, i) => {
      const title   = item.title    || item.name     || 'Unknown Title';
      const year    = item.year     || item.release  || 'N/A';
      const type    = item.type     || item.category || 'Movie';
      const rating  = item.rating   || item.imdb     || 'N/A';
      const quality = item.quality  || item.res      || 'HD';
      const dlLink  = item.download || item.link     || item.url || null;

      listMsg +=
        `*${i + 1}. ${title}*\n` +
        `   📅 Year    : ${year}\n` +
        `   🎭 Type    : ${type}\n` +
        `   ⭐ Rating  : ${rating}\n` +
        `   📊 Quality : ${quality}\n` +
        `   📥 Download: ${dlLink || '_Not available_'}\n\n`;
    });

    listMsg +=
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `🤖 *SADEW-MD* | Powered by MovieBoxPro`;

    // ── 5. Send with thumbnail if available ───────────────────────────────
    const firstItem = results[0];
    const thumbUrl  =
      firstItem?.thumbnail ||
      firstItem?.poster    ||
      firstItem?.image     ||
      firstItem?.cover     ||
      null;

    if (thumbUrl) {
      const imgBuffer = await fetchImageBuffer(thumbUrl);
      if (imgBuffer) {
        try {
          await conn.sendMessage(from, {
            image: imgBuffer,
            caption: listMsg,
          }, { quoted: m });
          return;
        } catch (_) {
          // image send failed — fallback to text
        }
      }
    }

    // Fallback: plain text reply
    await reply(listMsg);
  }
);
