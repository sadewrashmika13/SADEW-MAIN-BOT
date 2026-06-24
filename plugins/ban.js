const { Sparky } = require("../lib");

// බෑන් කරපු අයගේ ලැයිස්තුව මතකයේ තබා ගැනීමට Global Array එකක් සාදයි
if (!global.bannedList) {
    global.bannedList = [];
}

// 🔥 [මධ්‍යගත පාලනය] - ඕනෑම කෙනෙක් මැසේජ් එකක් එවද්දී මුලින්ම මේක ක්‍රියාත්මක වේ
Sparky({
    on: "message", // හැම මැසේජ් එකක්ම බලනවා
    dontTriggerList: true // මේක වෙනම කමාන්ඩ් එකක් විදිහට ලිස්ට් වෙන්නේ නෑ
}, async (chat) => {
    // මැසේජ් එක එවපු කෙනා බෑන් ලිස්ට් එකේ ඉන්නවා නම් සහ එයා බොට්ගේ අයිතිකරු නෙවෙයි නම්
    if (global.bannedList.includes(chat.sender) && !chat.fromMe) {
        // බොට් කිසිම ප්‍රතිචාරයක් දක්වන්නේ නැත, කමාන්ඩ් එක එතනින්ම නවතී
        chat.stop(); // Sparky framework එකේ ඊළඟ ප්ලගින්ස් වලට යන එක නවත්වන කමාන්ඩ් එක
        return false;
    }
});

// ================= BAN COMMAND =================
Sparky({
    pattern: "ban",
    fromMe: true, // බොට්ගේ අයිතිකරුට පමණි
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
            return await chat.reply("❌ කරුණාකර බෑන් කිරීමට අවශ්‍ය කෙනාගේ මැසේජ් එකකට රිප්ලයි කරන්න හෝ ටැග් කරන්න.");
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
    fromMe: true, // බොට්ගේ අයිතිකරුට පමණි
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
