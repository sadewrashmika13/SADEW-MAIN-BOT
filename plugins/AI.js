const { Sparky } = require("../lib");
const axios = require("axios");

Sparky({
    name: "ai",
    alias: ["ask", "groq"],
    category: "ai",
    desc: "Chat with Ultra-Fast Dedicated GROQ AI Engine"
}, async ({ client, m, args }) => {
    if (!args) return m.reply("_මචං අහන්න ඕන ප්‍රශ්නයක් දාපන්! Example: .ai Who is Tony Stark?_");

    await m.react("⏳");
    await client.sendPresenceUpdate('composing', m.jid);

    // ==========================================
    // ⚡ ඩෙඩිකේටඩ් GROQ API පද්ධතිය
    // ==========================================
    try {
        console.log(`\n[AI LOG] ⚡ Dedicated .ai command triggered. Using GROQ Engine...`);
        
        // GitHub Secrets හෝ Env Variables වල නැත්නම් ඩිරෙක්ට් කී එක වැඩ කරනවා
        const groqKey = process.env.GROQ_API_KEY || "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";
        
        const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
            model: "deepseek-r1-distill-llama-70b", // GROQ එකේ තියෙන පට්ටම ස්පීඩ් DeepSeek මොඩල් එක
            messages: [
                {
                    role: "user",
                    content: args
                }
            ]
        }, {
            headers: {
                "Authorization": `Bearer ${groqKey}`,
                "Content-Type": "application/json"
            },
            timeout: 9000 // තත්පර 9ක උපරිම කාලයක් දෙනවා GROQ එකට
        });

        const groqReply = response.data?.choices?.[0]?.message?.content;

        if (groqReply) {
            console.log(`[AI LOG] ✅ GROQ Responded successfully via .ai`);
            await m.react("✅");
            
            // DeepSeek-R1 එකෙන් එන දිග <think> ටැග්ස් (Reasoning) වට්සැප් මැසේජ් එකෙන් අයින් කරනවා
            const cleanedReply = groqReply.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
            
            return m.reply(cleanedReply);
        } else {
            throw new Error("Empty response from GROQ Engine");
        }

    } catch (error) {
        // GROQ එකේ ලිමිට් ඉවර වුණොත් හෝ කී එක බ්ලොක් වුණොත් බොටා නොනැවතී බැකප් එකට යනවා
        console.log(`[AI LOG] ❌ GROQ Failed: ${error.message}. Switching to Backup API for .ai command...`);
        
        try {
            console.log(`[AI LOG] 🔍 Trying Whiteshadow Backup API...`);
            const token = process.env.DEEPSEEK_TOKEN || "VK4fry";
            const urlBackup = `https://whiteshadow-x-api.vercel.app/api/ai/deepseekv4?q=${encodeURIComponent(args)}&apitoken=${token}`;
            
            const resBackup = await axios.get(urlBackup, { timeout: 7000 });
            
            if (resBackup.data && resBackup.data.success && resBackup.data.response) {
                console.log(`[AI LOG] ✅ Backup Success for .ai command!`);
                await m.react("✅");
                return m.reply(resBackup.data.response);
            } else {
                throw new Error("Backup API returned invalid response");
            }
        } catch (backupError) {
            console.log(`[AI LOG] 🚨 Both GROQ and Backup systems failed for .ai`);
            await m.react("❌");
            return m.reply(`❌ *මචං GROQ සර්වර් එක වගේම බැකප් සර්වර්ස් සියල්ලම මේ වෙලාවේ ඩවුන්!*`);
        }
    }
});
