const {
	Sparky,
	isPublic
} = require("../lib/");
const {getString} = require('./pluginsCore');
const lang = getString('misc');
const config = require("../config.js");


Sparky({
		name: "jid",
		fromMe: isPublic,
		category: "misc",
		desc: lang.JID_DESC
	},
	async ({
		m
	}) => {
		return await m.reply(`${m?.quoted ? m?.quoted?.sender : m.jid}`);
	});


Sparky({
		name: "runtime",
		fromMe: isPublic,
		category: "misc",
		desc: lang.RUNTIME_DESC
	},
	async ({
		m
	}) => {
		return await m.reply(`_Runtime : ${await m.runtime()}_`);
	});


Sparky({
		name: "ping",
		fromMe: isPublic,
		category: "misc",
		desc: lang.PING_DESC
	},
	async ({
		m
	}) => {
		const start = new Date().getTime();
		let pong = await m.sendMsg(m.jid, "_Checking Ping..._", {
			quoted: m
		});
		const end = new Date().getTime();
		return await m.sendMsg(m.jid, `_${config.PING} : ${end - start} ms_`, {
			edit: pong.key
		});
	});


Sparky({
		name: "wame",
		fromMe: isPublic,
		category: "misc",
		desc: lang.WAME_DESC
	},
	async ({
		m,
		args
	}) => {
		return await m.reply(`https://wa.me/${m?.quoted ? m?.quoted?.sender?.split("@")[0] : m?.sender?.split("@")[0]}${args ? `?text=${args}` : ''}`);
	});

