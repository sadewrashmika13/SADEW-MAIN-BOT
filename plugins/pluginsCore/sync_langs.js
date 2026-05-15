const fs = require('fs');
const path = require('path');

const langDir = '/Users/aswin/X--BOT--MD/plugins/pluginsCore/language';
const englishPath = path.join(langDir, 'english.json');
const english = JSON.parse(fs.readFileSync(englishPath, 'utf8'));

const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json') && f !== 'english.json');

files.forEach(file => {
    const filePath = path.join(langDir, file);
    const lang = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    const synced = { STRINGS: {} };
    
    Object.keys(english.STRINGS).forEach(category => {
        synced.STRINGS[category] = {};
        Object.keys(english.STRINGS[category]).forEach(key => {
            if (lang.STRINGS[category] && lang.STRINGS[category][key]) {
                synced.STRINGS[category][key] = lang.STRINGS[category][key];
            } else {
                synced.STRINGS[category][key] = english.STRINGS[category][key];
            }
        });
    });
    
    fs.writeFileSync(filePath, JSON.stringify(synced, null, 4));
});

console.log('Synced all language files with english.json keys.');
