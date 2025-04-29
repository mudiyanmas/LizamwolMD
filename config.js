/**
 * LIZAMWOL-MD Configuration File
 * Licensed under GPL-3.0 License
 * @project_name: LIZAMWOL-MD
 * @author: @hunk!nd3 p4d4y41!
 * @version: 3.0.0
 */

module.exports = {
    //═══════ Base Settings ═══════//
    PREFIX: ".",
    BOT_NAME: "LIZAMWOL-MD",
    OWNER_NAME: "Malvin King",
    OWNER_NUMBER: "918137829228",
    
    //═══════ Bot Behavior ═══════//
    AUTO_READ_STATUS: true,
    AUTO_REACT: true,
    AUTO_TYPING: false,
    SAFE_MODE: false,
    
    //═══════ Media Settings ═══════//
    MENU_IMG: "https://i.imgur.com/example.jpg",
    WELCOME_VIDEO: "",
    STICKER_PACKNAME: "LIZAMWOL-MD",
    
    //═══════ API Keys ═══════//
    OPENAI_KEY: "",
    WEATHER_API: "",
    
    //═══════ Social Links ═══════//
    CHANNEL_LINK: "https://whatsapp.com/channel/example",
    GROUP_LINK: "https://chat.whatsapp.com/example",
    INSTAGRAM_LINK: "https://instagram.com/example",
    
    //═══════ Database ═══════//
    DATABASE: "json",
    MONGO_URI: "mongodb+srv://user:pass@cluster.example.net/dbname?retryWrites=true&w=majority",
    
    //═══════ Server Settings ═══════//
    PORT: 9090,
    HEROKU_APP_NAME: "",
    
    //═══════ Advanced ═══════//
    MAX_UPLOAD_SIZE: 100,
    SESSION_TIMEOUT: 60,
    DEBUG_MODE: false
};
// Add this PM2-specific configuration at the top
const PM2_CONFIG = {
    CLUSTER_MODE: true,
    INSTANCES: "max",
    MAX_MEMORY: "750M",
    AUTORESTART: true,
    CRON_RESTART: "0 3 * * *" // Daily restart at 3AM
};

//===================PM2 SPECIFIC IMPROVEMENTS=======================
// Enhanced PM2 Status Reporter
function startPM2StatusReporter() {
    if (process.env.NODE_ENV === 'production') {
        setInterval(() => {
            if (process.send) {
                process.send({
                    type: 'pm2:status',
                    data: {
                        memory: process.memoryUsage().rss,
                        cpu: process.cpuUsage(),
                        uptime: process.uptime(),
                        status: 'online',
                        connections: {
                            whatsapp: !!whatsappClient,
                            http: server.listening
                        }
                    }
                });
            }
        }, 10000);
    }
}

// Enhanced Graceful Shutdown
async function gracefulShutdown() {
    console.log(`${EMOJIS.STATUS.OFFLINE} Initiating advanced shutdown sequence...`);
    
    try {
        // Step 1: Close HTTP server
        if (server) {
            await new Promise(resolve => {
                server.close(err => {
                    if (err) console.error('HTTP close error:', err);
                    resolve();
                });
            });
        }

        // Step 2: Close WhatsApp connection
        if (whatsappClient) {
            await whatsappClient.end();
            await new Promise(resolve => setTimeout(resolve, 2000)); // Allow cleanup
        }

        // Step 3: Close database connections (add your DB cleanup here)
        
        console.log(`${EMOJIS.STATUS.OFFLINE} Clean shutdown complete`);
        process.exit(0);
    } catch (error) {
        console.error('Shutdown failure:', error);
        process.exit(1);
    }
}

// Add this to your connection.open handler
if (update.connection === 'open') {
    // ... existing code ...
    startPM2StatusReporter(); // Start PM2 monitoring after connection
}

// Add this to your server setup
function startServer() {
    // ... existing code ...
    
    // Add health check endpoints
    app.get('/health', (req, res) => {
        res.json({
            status: 'OK',
            timestamp: Date.now(),
            services: {
                whatsapp: !!whatsappClient,
                database: checkDatabaseStatus() // Implement your DB check
            }
        });
    });

    // Add PM2 cluster awareness
    app.use((req, res, next) => {
        res.set('X-PM2-Instance', process.env.NODE_APP_INSTANCE || '0');
        next();
    });
}
