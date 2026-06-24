// commands/_banlistener.js
const { Sparky, isPublic } = require("../lib");

// Global ban list (shared with ban.js)
if (!global.banList) global.banList = new Map();

// This runs as an event listener inside the plugin
// Add this to your index.js or main file if possible
// If not, this is an alternative approach
