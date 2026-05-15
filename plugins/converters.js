const {Sparky, isPublic,uploadMedia,handleMediaUpload} = require("../lib");
const {getString, appendMp3Data, convertToMp3, addExifToWebP, getBuffer, getJson} = require('./pluginsCore');
const googleTTS = require('google-tts-api');
const config = require('../config.js');
const lang = getString('converters');

Sparky({
    name: "url",
    fromMe: true,
    desc: "",
    category: "converters",
  }, async ({ args, m }) => {
    if (!m.quoted) {
      return m.reply(lang.REPLY_MEDIA || 'Reply to an Image/Video/Audio');
    }
    try {
        await m.react('⏫');
      const mediaBuffer = await m.quoted.download();
      const mediaUrl = await handleMediaUpload(mediaBuffer);
      await m.react('✅');
      m.reply(mediaUrl);
    } catch (error) {
        await m.react('❌');
      m.reply(lang.ERROR || 'An error occurred while uploading the media.');
    }
  });

Sparky(
  {
    name: "trt",
    fromMe: true,
    desc: lang.TRT_DESC,
    category: "converters",
  },
  async ({ client, m, args }) => {
    try {
      if (!args) return await m.reply(lang.TRT_ALERT);
      const trtxt = m.quoted?.text;
      const trtlang = args;
      const trt = await getJson(`${config.API}/api/search/translate?text=${trtxt}&lang=${trtlang}`)
      return m.reply(`${trt.result}`);
    } catch (e) {
      console.error(e);
    }
  }
);

Sparky(
    {
        name: "vv",
        fromMe: true,
        category: "converters",
        desc: lang.VV_DESC
    },
    async ({
        m, client 
    }) => {
        if (!m.quoted) {
            return m.reply(lang.VV_ALERT);
        }
        try {
            m.react("⏫");
		let buff = await m.quoted.download();
		return await m.sendFile(buff);
        } catch (e) {
            return m.react("❌");
        } 
    });

Sparky({
		name: "sticker",
		fromMe: isPublic,
		category: "converters",
		desc: lang.STICKER_DESC
	},
	async ({
		m,
		args
	}) => {
		if (!m.quoted || !(m.quoted.message.imageMessage || m.quoted.message.videoMessage)) {
			return await m.reply(lang.STICKER_ALERT);
		}
		await m.react('⏫');
		await m.sendMsg(m.jid, await m.quoted.download(), {
			packName: args.split(';')[0] || config.STICKER_DATA.split(';')[0],
			authorName: args.split(';')[1] || config.STICKER_DATA.split(';')[1],
			quoted: m
		}, "sticker");
		return await m.react('✅');
	});


Sparky({
		name: "mp3",
		fromMe: isPublic,
		category: "converters",
		desc: lang.MP3_DESC
	},
	async ({
		m,
		args
	}) => {
		if (!m.quoted || !(m.quoted.message.audioMessage || m.quoted.message.videoMessage || (m.quoted.message.documentMessage && m.quoted.message.documentMessage.mimetype === 'video/mp4'))) {
			return await m.reply(lang.MP3_ALERT);
		}
		await m.react('⏫');
		await m.sendMsg(m.jid, await convertToMp3(await m.quoted.download()), { mimetype: "audio/mpeg", quoted: m }, 'audio');
		return await m.react('✅');
	});


Sparky({
		name: "take",
		fromMe: isPublic,
		category: "converters",
		desc: lang.TAKE_DESC
	},
	async ({
		m,
		args,
		client
	}) => {
		if (!m.quoted || !(m.quoted.message.stickerMessage || m.quoted.message.audioMessage || m.quoted.message.imageMessage || m.quoted.message.videoMessage)) return m.reply(lang.TAKE_ALERT);
		await m.react('⏫');
        if (m.quoted.message.stickerMessage || m.quoted.message.imageMessage || m.quoted.message.videoMessage) {
            args = args || config.STICKER_DATA;
            return await m.sendMsg(m.jid, await m.quoted.download(), {
			packName: `${args.split(';')[0]}` || `${config.STICKER_DATA.split(';')[0]}`,
			authorName: `${args.split(';')[1]}` || `${config.STICKER_DATA.split(';')[1]}`,
			quoted: m
		}, "sticker");
        } else if (m.quoted.message.audioMessage) {
            const opt = {
                title: args ? args.split(/[|,;]/) ? args.split(/[|,;]/)[0] : args : config.AUDIO_DATA.split(/[|,;]/)[0] ? config.AUDIO_DATA.split(/[|,;]/)[0] : config.AUDIO_DATA,
                body: args ? args.split(/[|,;]/)[1] : config.AUDIO_DATA.split(/[|,;]/)[1],
                image: (args && args.split(/[|,;]/)[2]) ? args.split(/[|,;]/)[2] : config.AUDIO_DATA.split(/[|,;]/)[2]
            }
            const Data = await AudioData(await convertToMp3(await m.quoted.download()), opt);
            return await m.sendMsg(m.jid ,Data,{
                mimetype: 'audio/mpeg'
            },'audio');
        }
		await m.react('✅');
	});


Sparky({
		name: "photo",
		fromMe: isPublic,
		category: "converters",
		desc: lang.PHOTO_DESC
	},
	async ({
		m
	}) => {
		if (!m.quoted || !m.quoted.message.stickerMessage || m.quoted.message.stickerMessage.isAnimated) {
			return await m.reply(lang.PHOTO_ALERT);
		}
		await m.react('⏫');
		await m.sendMsg(m.jid, await m.quoted.download(), {
			quoted: m
		}, "image");
		return await m.react('✅');
	});

	Sparky(
		{
			name: "tts",
			fromMe: isPublic,
			category: "converters",
			desc: lang.TTS_DESC
		},
		async ({
			m, client, args
		}) => {
			if (!args) {
				m.reply(lang.NEED_QUERY)
			} else {
				let [txt,
					langCode] = args.split`:`
				const audio = googleTTS.getAudioUrl(`${txt}`, {
					lang: langCode || "ml",
					slow: false,
					host: "https://translate.google.com",
				})
				client.sendMessage(m.jid, {
					audio: {
						url: audio,
					},
					mimetype: 'audio/mpeg',
					ptt: false,
					fileName: `${'tts'}.mp3`,
				}, {
					quoted: m,
				})
	
			}
		});


Sparky(
		{
			name: "say",
			fromMe: isPublic,
			category: "converters",
			desc: lang.SAY_DESC
		},
		async ({
			m, client, args
		}) => {
			if (!args) {
				m.reply(lang.NEED_QUERY)
			} else {
				let [txt,
					langCode] = args.split`:`
				const audio = googleTTS.getAudioUrl(`${txt}`, {
					lang: langCode || "en",
					slow: false,
					host: "https://translate.google.com",
				})
				client.sendMessage(m.jid, {
					audio: {
						url: audio,
					},
					mimetype: 'audio/mpeg',
					ptt: true,
					fileName: `${'tts'}.mp3`,
				}, {
					quoted: m,
				})
	
			}
		});

Sparky(
  {
    name: "doc",
    fromMe: isPublic,
    category: "converters",
    desc: lang.DOC_DESC,
  },
  async ({ m, client, args }) => {
    try {
      if (
        !m.quoted ||
        !(
          m.quoted.message.imageMessage ||
          m.quoted.message.videoMessage ||
          m.quoted.message.audioMessage ||
          m.quoted.message.documentMessage ||
          m.quoted.message.stickerMessage
        )
      ) {
        return await m.reply(lang.REPLY_MEDIA);
      }
      await m.react("⏳");
      const buffer = await m.quoted.download();
      const mimetype =
        m.quoted.message.imageMessage?.mimetype ||
        m.quoted.message.videoMessage?.mimetype ||
        m.quoted.message.audioMessage?.mimetype ||
        m.quoted.message.documentMessage?.mimetype ||
        "application/octet-stream";

      let filename = args || "file";

      if (!filename.includes(".")) {
        const ext = mimetype.split("/")[1] || "bin";
        filename += `.${ext}`;
      }

      await client.sendMessage(
        m.jid,
        {
          document: buffer,
          mimetype,
          fileName: filename,
        },
        { quoted: m }
      );

      await m.react("✅");

    } catch (err) {
      console.log(err);
      await m.react("❌");
      m.reply(lang.ERROR);
    }
  }
);
Sparky(
  {
    name: "nondoc",
    fromMe: isPublic,
    category: "converters",
    desc: lang.NONDOC_DESC,
  },
  async ({ m, client }) => {
    try {
      const quoted = m.quoted;
      if (!quoted || !quoted.message?.documentMessage)
        return m.reply(lang.REPLY_DOC);
      const mime = quoted.message.documentMessage.mimetype;
	  await m.react("⏳");
      const buffer = await quoted.download();
      let type = "document";
      if (mime.startsWith("image")) type = "image";
      else if (mime.startsWith("video")) type = "video";
      else if (mime.startsWith("audio")) type = "audio";
      await m.sendMsg(
        m.jid,
        buffer,
        { mimetype: mime, quoted: m },
        type
      );
	  await m.react("✅");

    } catch (err) {
      console.log(err);
	  await m.react("❌");
      m.reply(lang.ERROR);
    }
  }
);