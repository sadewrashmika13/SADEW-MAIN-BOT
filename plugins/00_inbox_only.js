// plugins/00_inbox_only.js
const lib = require("../lib");

// බොට්ගේ Main Command Function එක (Sparky) අල්ලගන්නවා
if (lib.Sparky) {
    const originalSparky = lib.Sparky;
    
    // Sparky ෆන්ක්ෂන් එක අපිට ඕන විදිහට වෙනස් කරනවා (Override / Monkey-patch)
    lib.Sparky = function (options, executeFunc) {
        
        // අලුත් රූල් එක හදනවා
        const newExecuteFunc = async (context) => {
            
            // මැසේජ් එක ආවේ Group එකකින්ද කියලා චෙක් කරනවා
            if (context.m && context.m.jid && context.m.jid.endsWith('@g.us')) {
                // Group එකක් නම් කිසිම දෙයක් නොකර අතාරිනවා (කමාන්ඩ් එක වැඩ කරන්නේ නෑ)
                return; 
            }
            
            // Group එකක් නෙමෙයි නම් (Inbox නම්), කමාන්ඩ් එක සාමාන්‍ය විදිහට රන් කරනවා
            return await executeFunc(context);
        };
        
        // වෙනස් කරපු රූල් එක ආයෙත් ඔරිජිනල් සිස්ටම් එකටම දෙනවා
        return originalSparky(options, newExecuteFunc);
    };
    
    console.log("🛡️ GLOBAL INBOX-ONLY MODE ACTIVATED! (Groups Blocked)");
}
