/**
 * LIZAMWOL-MD Configuration File
 * Edit these values to customize your bot
 Copyright (C) 2025.
  Licensed under the  GPL-3.0 License;
  You may not sell this script.
  It is supplied in the hope that it may be useful.
  * @project_name : Free Bot script
  * @author : @(hunk!nd3 p4d4y41!
  * @description : A Multi-functional whatsapp bot script.
  * @version 3.0.0
 */

module.exports = {
    //═══════ Base Settings ═══════//
    PREFIX: ".", // Bot command prefix (e.g., .menu)
    BOT_NAME: "LIZAMWOL-MD", // Display name for your bot
    OWNER_NAME: "Malvin King", // Bot owner's name
    OWNER_NUMBER: "918137829228", // Your WhatsApp number with country code
    
    //═══════ Bot Behavior ═══════//
    AUTO_READ_STATUS: true, // Auto-read status updates
    AUTO_REACT: true, // Enable automatic message reactions
    AUTO_TYPING: false, // Show typing indicators
    SAFE_MODE: false, // Restrict bot to owner-only
    
    //═══════ Media Settings ═══════//
    MENU_IMG: "https://i.imgur.com/example.jpg", // Header image for menu
    WELCOME_VIDEO: "", // Welcome video URL (leave empty to disable)
    STICKER_PACKNAME: "LIZAMWOL-MD", // For sticker commands
    
    //═══════ API Keys (Optional) ═══════//
    OPENAI_KEY: "", // For AI features
    WEATHER_API: "", // For weather command
    
    //═══════ Social Links ═══════//
    CHANNEL_LINK: "https://whatsapp.com/channel/example",
    GROUP_LINK: "https://chat.whatsapp.com/example",
    INSTAGRAM_LINK: "https://instagram.com/example",
    
    //═══════ Database (Choose one) ═══════//
    DATABASE: "json", // Options: "json", "mongodb", "sqlite"
    
    //═══════ MongoDB Config (If used) ═══════//
    MONGO_URI: "mongodb+srv://user:pass@cluster.example.net/dbname?retryWrites=true&w=majority",
    
    //═══════ Server Settings ═══════//
    PORT: 9090, // Server port
    HEROKU_APP_NAME: "", // For Heroku deployment
    
    //═══════ Advanced ═══════//
    MAX_UPLOAD_SIZE: 100, // MB
    SESSION_TIMEOUT: 60, // Minutes
    DEBUG_MODE: false // Enable for troubleshooting
};

//===================PM2 LIFECYCLE HANDLERS=======================
process.on('message', (msg) => {
    if (msg === 'shutdown') {
        gracefulShutdown();
    }
});

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// PM2 Status Reporter
setInterval(() => {
    if (process.send) {
        process.send({
            type: 'pm2:status',
            data: {
                memory: process.memoryUsage().rss,
                status: 'online'
            }
        });
    }
}, 15000);

//═══════ Explanation of Key Options ═══════//
/*
1. PREFIX:
   - The character that triggers bot commands
   - Example: ".menu" (if PREFIX = ".")

2. SAFE_MODE:
   - When true, only the owner can use commands
   - When false, everyone can use public commands

3. DATABASE Options:
   - "json": Stores data in JSON files (default)
   - "mongodb": For MongoDB Atlas (requires MONGO_URI)
   - "sqlite": Lightweight SQL database

4. AUTO_REACT:
   - true: Bot will react to messages with random emojis
   - false: Disables automatic reactions

5. API Keys:
   - Get OPENAI_KEY from platform.openai.com
   - Get WEATHER_API from weatherapi.com
*/
