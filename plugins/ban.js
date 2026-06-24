const { Sparky } = require("../lib");

// Global banned list එකක් මතකයේ තබා ගැනීමට හදාගන්නවා
if (!global.bannedList) {
    global.bannedList = [];
}

// ================= BAN COMMAND =================
Sparky({
    pattern: "ban",
    fromMe: true, // බොට්ගේ අයිතිකරුට (ඔයාට) පමණක් පාවිච්චි කළ හැක
    desc: "පරිශීලකයෙකු බෑන් කරයි",
    category: "owner"
}, async (chat) => {
    try {
        let userToBan = "";

        // 1. මැසේජ් එකකට රිප්ලයි කරලා නම්
        if (chat.reply_message && chat.reply_message.sender) {
            userToBan = chat.reply_message.sender;
        } 
        // 2. මැසේජ් එකේ කාවහරි ටැග් කරලා නම්
        else if (chat.mentionedJid && chat.mentionedJid.length > 0) {
            userToBan = chat.mentionedJid[0];
        } 
        // 3. Inbox එකේදී කෙලින්ම නම්
        else if (!chat.isGroup) {
            userToBan = chat.chat;
        }

        // බෑන් කරන්න කෙනෙක් හොයාගන්න බැරි වුනොත්
        if (!userToBan || userToBan === "") {
            return await chat.reply("❌ කරුණාකර බෑන් කිරීමට අවශ්‍ය කෙනාගේ මැසේජ් එකකට රිප්ලයි කරන්න හෝ @ කරලා ටැග් කරන්න.");
        }

        // දැනටමත් බෑන් කරලද බලනවා
        if (global.bannedList.includes(userToBan)) {
            return await chat.reply("ℹ️ මෙම පරිශීලකයා දැනටමත් බෑන් කර ඇත.");
        }

        // ලිස්ට් එකට එකතු කරනවා
        global.bannedList.push(userToBan);
        console.log(`[SADEW MD] Banned successfully: ${userToBan}`); // GitHub Actions logs වල බලාගන්න

        let jidNum = userToBan.split("@")[0];
        return await chat.reply(`🚫 @${jidNum} ව සාර්ථකව බෑන් කරන ලදී! දැන් ඔහුට බොට් වැඩ කරන්නේ නැත.`, { mentions: [userToBan] });

    } catch (error) {
        console.error(error);
        return await chat.reply("❌ Error එකක් වුණා: " + error.message);
    }
});

// ================= UNBAN COMMAND =================
Sparky({
    pattern: "unban",
    fromMe: true,
    desc: "බෑන් ඉවත් කරයි",
    category: "owner"
}, async (chat) => {
    try {
        let userToUnban = "";

        if (chat.reply_message && chat.reply_message.sender) {
            userToUnban = chat.reply_message.sender;
        } else if (chat.mentionedJid && chat.mentionedJid.length > 0) {
            userToUnban = chat.mentionedJid[0];
        } else if (!chat.isGroup) {
            userToUnban = chat.chat;
        }

        if (!userToUnban || userToUnban === "") {
            return await chat.reply("❌ කරුණාකර අන්බෑන් කිරීමට අවශ්‍ය කෙනාගේ මැසේජ් එකකට රිප්ලයි කරන්න.");
        }

        if (!global.bannedList.includes(userToUnban)) {
            return await chat.reply("ℹ️ මෙම පරිශීලකයා බෑන් කර නොමැත.");
        }

        // ලිස්ට් එකෙන් අයින් කරනවා
        global.bannedList = global.bannedList.filter(u => u !== userToUnban);
        console.log(`[SADEW MD] Unbanned successfully: ${userToUnban}`);

        let jidNum = userToUnban.split("@")[0];
        return await chat.reply(`✅ @${jidNum} ව සාර්ථකව අන්බෑන් කරන ලදී!`, { mentions: [userToUnban] });

    } catch (error) {
        return await chat.reply("❌ Error එකක් වුණා: " + error.message);
    }
});
