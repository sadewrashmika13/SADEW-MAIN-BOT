const { Sparky } = require("../lib");

if (!global.bannedList) {
    global.bannedList = [];
}

// ================= BAN COMMAND =================
Sparky({
    pattern: "ban",
    fromMe: true,
    desc: "පරිශීලකයෙකුට බොට් පාවිච්චි කිරීම තහනම් කරයි.",
    category: "owner"
}, async (chat) => {
    try {
        let userToBan;

        if (chat.reply_message && chat.reply_message.sender) {
            userToBan = chat.reply_message.sender;
        } else if (chat.mentionedJid && chat.mentionedJid.length > 0) {
            userToBan = chat.mentionedJid[0];
        } else if (!chat.isGroup) {
            userToBan = chat.chat;
        }

        if (!userToBan) {
            return await chat.reply("❌ කරුණාකර බෑන් කිරීමට අවශ්‍ය කෙනාගේ මැසේජ් එකකට රිප්ලයි කරන්න, ටැග් කරන්න හෝ Inbox එකේදී මෙම command එක භාවිතා කරන්න.");
        }

        if (global.bannedList.includes(userToBan)) {
            return await chat.reply("ℹ️ මෙම පරිශීලකයා දැනටමත් බෑන් කර ඇත.");
        }

        global.bannedList.push(userToBan);
        let username = userToBan.split("@")[0];
        await chat.reply(`🚫 @${username} ව සාර්ථකව බෑන් කරන ලදී!`, { mentions: [userToBan] });

    } catch (error) {
        await chat.reply("❌ Error: " + error.message);
    }
});

// ================= UNBAN COMMAND =================
Sparky({
    pattern: "unban",
    fromMe: true,
    desc: "බෑන් කල පරිශීලකයෙකු නැවත යථා තත්ත්වයට පත් කරයි.",
    category: "owner"
}, async (chat) => {
    try {
        let userToUnban;

        if (chat.reply_message && chat.reply_message.sender) {
            userToUnban = chat.reply_message.sender;
        } else if (chat.mentionedJid && chat.mentionedJid.length > 0) {
            userToUnban = chat.mentionedJid[0];
        } else if (!chat.isGroup) {
            userToUnban = chat.chat;
        }

        if (!userToUnban) {
            return await chat.reply("❌ කරුණාකර අන්බෑන් කිරීමට අවශ්‍ය කෙනාගේ මැසේජ් එකකට රිප්ලයි කරන්න.");
        }

        if (!global.bannedList.includes(userToUnban)) {
            return await chat.reply("ℹ️ මෙම පරිශීලකයා බෑන් කර නොමැත.");
        }

        global.bannedList = global.bannedList.filter(user => user !== userToUnban);
        let username = userToUnban.split("@")[0];
        await chat.reply(`✅ @${username} ව සාර්ථකව අන්බෑන් කරන ලදී!`, { mentions: [userToUnban] });

    } catch (error) {
        await chat.reply("❌ Error: " + error.message);
    }
});
