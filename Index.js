Here's the complete **PM2-ready** version of your LIZAMWOL-MD bot with all necessary configurations:

```javascript
/**
 * LIZAMWOL-MD WhatsApp Bot (PM2 Managed)
 * @author: hank!nd3 p4d4y41!
 * @version: 3.0.0
 */

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    Browsers
} = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const express = require("express");
const P = require('pino');

//===================CONFIGURATION=======================
const config = require('./config');
const app = express();
const prefix = config.PREFIX;
const ownerNumber = config.OWNER_NUMBER ? [config.OWNER_NUMBER] : [];
const sessionsDir = path.join(__dirname, 'sessions');

//===================EMOJI CONSTANTS=======================
const EMOJIS = {
    STATUS: {
        ONLINE: "🟢",
        OFFLINE: "🔴",
        TYPING: "✍️"
    },
    CONNECTION: {
        START: "🧬",
        SUCCESS: "✅",
        PLUGINS: "🪄",
        RECONNECT: "♻️"
    },
    REACTIONS: {
        GENERAL: ["😊", "👍", "😂", "💯", "🔥", "🙏", "🎉", "👏", "😎", "🤖"],
        HEARTS: ["❤️", "💝", "💖", "💗", "💓", "💞", "💕"],
        OWNER: ["👑", "💎", "🎖️", "🌟"]
    }
};

//===================PM2 HEALTH CHECK=======================
app.get("/pm2", (req, res) => {
    res.status(200).json({
        status: "online",
        memory: process.memoryUsage(),
        uptime: process.uptime()
    });
});

//===================SESSION SETUP=======================
function setupSessions() {
    if (!fs.existsSync(sessionsDir)) {
        fs.mkdirSync(sessionsDir, { recursive: true });
    }
}

//===================WHATSAPP CONNECTION=======================
async function connectToWA() {
    console.log(`${EMOJIS.CONNECTION.START} Initializing connection...`);
    
    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionsDir);
        const { version } = await fetchLatestBaileysVersion();

        const conn = makeWASocket({
            logger: P({ level: config.DEBUG ? 'debug' : 'silent' }),
            printQRInTerminal: true,
            browser: Browsers.macOS("Firefox"),
            auth: state,
            version,
            markOnlineOnConnect: true
        });

        // Connection Event Handler
        conn.ev.on('connection.update', (update) => {
            if (update.connection === 'open') {
                console.log(`${EMOJIS.CONNECTION.SUCCESS} Connected successfully!`);
                loadPlugins();
                sendWelcomeMessage(conn);
                
                // PM2 Ready Signal
                if (process.send) {
                    process.send('ready');
                }
            }
            
            if (update.connection === 'close') {
                const shouldReconnect = update.lastDisconnect?.error?.output?.statusCode 
                    !== DisconnectReason.loggedOut;
                
                console.log(`${shouldReconnect ? EMOJIS.CONNECTION.RECONNECT : EMOJIS.STATUS.OFFLINE} 
                    ${update.lastDisconnect.error?.message || 'Disconnected'}`);
                
                if (shouldReconnect) {
                    setTimeout(connectToWA, 5000);
                }
            }
        });

        // Credentials Update Handler
        conn.ev.on('creds.update', saveCreds);

        // Message Reaction System
        conn.ev.on('messages.upsert', async ({ messages }) => {
            try {
                const msg = messages[0];
                if (!msg.message || msg.key.fromMe) return;

                if (config.AUTO_REACT) {
                    const sender = msg.key.participant || msg.key.remoteJid;
                    const isOwner = ownerNumber.some(num => sender.includes(num));
                    
                    const emojiList = isOwner 
                        ? EMOJIS.REACTIONS.OWNER 
                        : EMOJIS.REACTIONS.GENERAL;
                    
                    const emoji = emojiList[Math.floor(Math.random() * emojiList.length)];
                    
                    await conn.sendMessage(msg.key.remoteJid, {
                        react: { 
                            text: emoji, 
                            key: msg.key 
                        }
                    });
                }
            } catch (error) {
                console.error('Reaction error:', error.message);
            }
        });

        return conn;

    } catch (error) {
        console.error(`${EMOJIS.STATUS.OFFLINE} Connection error:`, error.message);
        setTimeout(connectToWA, 10000);
    }
}

//===================PLUGIN LOADER=======================
function loadPlugins() {
    console.log(`${EMOJIS.CONNECTION.PLUGINS} Loading plugins...`);
    const pluginDir = path.join(__dirname, 'plugins');
    
    if (!fs.existsSync(pluginDir)) {
        fs.mkdirSync(pluginDir);
        return console.log(`${EMOJIS.CONNECTION.SUCCESS} Created plugins directory`);
    }

    fs.readdirSync(pluginDir)
        .filter(file => path.extname(file).toLowerCase() === '.js')
        .forEach(file => {
            try {
                require(path.join(pluginDir, file));
                console.log(`${EMOJIS.CONNECTION.SUCCESS} Loaded: ${file}`);
            } catch (e) {
                console.error(`Failed to load ${file}:`, e.message);
            }
        });
}

//===================WELCOME MESSAGE=======================
function sendWelcomeMessage(conn) {
    const welcomeMsg = `*╭──────────────●●►*
${EMOJIS.REACTIONS.HEARTS[3]} ${config.BOT_NAME || 'LIZAMWOL-MD'} Activated ${EMOJIS.REACTIONS.HEARTS[3]}
${EMOJIS.STATUS.ONLINE} Status: Operational
${EMOJIS.REACTIONS.GENERAL[8]} Version: 3.0.0
${EMOJIS.REACTIONS.GENERAL[5]} Prefix: ${prefix}

${config.CHANNEL_LINK ? `${EMOJIS.REACTIONS.GENERAL[6]} Channel: ${config.CHANNEL_LINK}` : ''}
*╰──────────────●●►*`;

    conn.sendMessage(conn.user.id, {
        text: welcomeMsg
    }).catch(() => {
        conn.sendMessage(conn.user.id, { 
            text: `${config.BOT_NAME || 'Bot'} started successfully! ${EMOJIS.REACTIONS.GENERAL[6]}`
        });
    });
}

//===================SERVER SETUP=======================
function startServer() {
    const port = config.PORT || 9090;
    app.get("/", (req, res) => res.send(`${EMOJIS.STATUS.ONLINE} ${config.BOT_NAME || 'Bot'} Active`));
    
    return app.listen(port, () => {
        console.log(`PM2-Managed server running on port ${port}`);
        console.log(`Health check: http://localhost:${port}/pm2`);
    });
}

//===================PM2 LIFECYCLE MANAGEMENT=======================
setupSessions();
const server = startServer();
let whatsappClient;

// Handle PM2 shutdown signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

async function gracefulShutdown() {
    console.log(`${EMOJIS.STATUS.OFFLINE} Shutting down gracefully...`);
    
    try {
        server.close();
        if (whatsappClient) {
            await whatsappClient.end();
        }
        process.exit(0);
    } catch (error) {
        console.error('Shutdown error:', error);
        process.exit(1);
    }
}

// Start WhatsApp connection
whatsappClient = connectToWA();
```

### Key PM2-Specific Enhancements:

1. **PM2 Health Check Endpoint**
   ```javascript
   app.get("/pm2", (req, res) => {
       res.status(200).json({
           status: "online",
           memory: process.memoryUsage(),
           uptime: process.uptime()
       });
   });
   ```

2. **Ready Signal for PM2**
   ```javascript
   if (process.send) {
       process.send('ready'); // Notify PM2 when bot is fully operational
   }
   ```

3. **Graceful Shutdown Handling**
   ```javascript
   process.on('SIGINT', gracefulShutdown);
   process.on('SIGTERM', gracefulShutdown);
   ```

4. **Memory Management**
   ```javascript
   markOnlineOnConnect: true // Optimized connection state
   ```

### Required `config.js`:

```javascript
module.exports = {
    PREFIX: ".",
    OWNER_NUMBER: "1234567890", // With country code
    BOT_NAME: "LIZAMWOL-MD",
    AUTO_REACT: true,
    PORT: 9090,
    DEBUG: false,
    CHANNEL_LINK: "" // Optional
};
```

### PM2 Deployment Guide:

1. **Install PM2 globally**
   ```bash
   npm install pm2 -g
   ```

2. **Create `ecosystem.config.js`**
   ```javascript
   module.exports = {
     apps: [{
       name: "LIZAMWOL-MD",
       script: "index.js",
       instances: 1,
       autorestart: true,
       watch: false,
       max_memory_restart: "500M",
       env: {
         NODE_ENV: "production"
       }
     }]
   };
   ```

3. **Start with PM2**
   ```bash
   pm2 start ecosystem.config.js
   ```

4. **Essential PM2 Commands**
   ```bash
   pm2 logs LIZAMWOL-MD       # View logs
   pm2 monit                 # Live monitoring
   pm2 restart LIZAMWOL-MD    # Graceful restart
   pm2 delete LIZAMWOL-MD     # Stop application
   ```

This version includes all necessary PM2 integrations while maintaining your original bot functionality with enhanced error handling and production-ready features.
