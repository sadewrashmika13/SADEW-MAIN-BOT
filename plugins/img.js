const axios = require('axios');
const { prepareWAMessageMedia, generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const { Sparky } = require('../lib');

Sparky(
    {
        // 🛠️ .img හෝ .image කමාන්ඩ් එක ඩොට් ප්‍රීෆික්ස් එකත් එක්කම වැඩ කරනවා
        name: /^\.(img|image)\s+(.+)$/i,
        fromMe: false,
        category: 'search',
        desc: 'Search images on Google using WhiteShadow API in Carousel look.',
        use: '.img Sri Lanka'
    },
    async ({ m, client, match }) => {
        const query = match[2]; // යූසර් සර්ච් කරපු දේ ගන්නවා
        const jid = m.chat;

        try {
            // 1. Loading Reaction එක දානවා
            await m.react('🔍');

            // 2. WhiteShadow ලොක්කාගේ API එකට රික්වෙස්ට් එක යැවීම
            const apiUrl = `https://whiteshadow-x-api.onrender.com/api/search/google-image?q=${encodeURIComponent(query)}&format=png&limit=5&apitoken=VK4fry`;
            const response = await axios.get(apiUrl);

            // API එක සාර්ථක නැත්නම් හෝ රිසල්ට් නැත්නම්
            if (!response.data.success || !response.data.results || response.data.results.length === 0) {
                await m.react('❌');
                return await client.sendMessage(jid, { text: '❌ කිසිදු පින්තූරයක් සොයාගත නොහැකි විය.' }, { quoted: m });
            }

            const results = response.data.results;
            let cards = [];

            // 3. ✨ පින්තූර ටික හොරයිසන්ටල් කාඩ්ස් විදිහට ලූප් එකෙන් සකස් කරගැනීම
            for (let img of results) {
                // Baileys සර්වර් එකට ඉමේජ් එක අප්ලෝඩ් කරලා හෙඩර් එක හදාගන්නවා
                let imageHeader = await prepareWAMessageMedia(
                    { image: { url: img.image } },
                    { upload: client.waUploadToServer }
                );

                cards.push({
                    header: {
                        imageMessage: imageHeader.imageMessage,
                        hasMediaAttachment: true
                    },
                    body: { 
                        text: `📌 *Title:* ${img.title}\n📏 *Size:* ${img.width}x${img.height}` 
                    },
                    nativeFlowMessage: {
                        buttons: [
                            {
                                // 🌐 පින්තූරේ ඔරිජිනල් සයිට් එකට යන්න cta_url බටන් එකක් දානවා
                                name: "cta_url",
                                buttonParamsJson: JSON.stringify({
                                    display_text: "🌐 View Source",
                                    url: img.source
                                })
                            }
                        ]
                    }
                });
            }

            // 4. සම්පූර්ණ කැරොසල් මැසේජ් එක එකතු කිරීම
            const responseMessage = {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            body: { text: `🔍 *Google Image Search Results for:* ${query.toUpperCase()}` },
                            carouselMessage: {
                                cards: cards
                            }
                        }
                    }
                }
            };

            // 5. චැට් එකට මැසේජ් එක රිලේ (Relay) කිරීම
            await m.react('✅');
            let msg = generateWAMessageFromContent(jid, responseMessage, { quoted: m });
            await client.relayMessage(jid, msg.message, { messageId: msg.key.id });

        } catch (error) {
            console.error('Google Img Search Error:', error);
            await m.react('❌');
            return await client.sendMessage(jid, { text: '❌ සර්වර් දෝෂයකි! පසුව උත්සාහ කරන්න.' }, { quoted: m });
        }
    }
);
