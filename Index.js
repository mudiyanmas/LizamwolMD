/**
 * LIZAMWOL-MD WhatsApp Bot (PM2 Optimized)
 * @author: hank!nd3 p4d4y41!
 * @version: 3.0.1
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

//===================PM2 FIXES=======================
// 1. Added process title for PM2 identification
process.title = "whatsapp-bot";

// 2. Added exit code constants
const EXIT_CODES = {
    SUCCESS: 0,
    ERROR: 1,
    RESTART: 2
};

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

//===================CRASH HANDLER=======================
process.on('uncaughtException', (err) => {
    console.error(`${EMOJIS.STATUS.OFFLINE} Uncaught Exception:`, err);
    process.exit(EXIT_CODES.ERROR);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(`${EMOJIS.STATUS.OFFLINE} Unhandled Rejection at:`, promise, 'Reason:', reason);
    process.exit(EXIT_CODES.RESTART);
});

//===================PM2 HEALTH CHECK=======================
app.get("/pm2", (req, res) => {
    res.status(200).json({
        status: "online",
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        pid: process.pid,
        pm_id: process.env.pm_id || 'N/A'
    });
});

//===================SESSION SETUP=======================
function setupSessions() {
    try {
        if (!fs.existsSync(sessionsDir)) {
            fs.mkdirSync(sessionsDir, { recursive: true });
            console.log(`${EMOJIS.CONNECTION.SUCCESS} Created sessions directory`);
        }
    } catch (e) {
        console.error(`${EMOJIS.STATUS.OFFLINE} Session setup failed:`, e.message);
        process.exit(EXIT_CODES.ERROR);
    }
}

//===================WHATSAPP CONNECTION=======================
let retryCount = 0;
const MAX_RETRIES = 5;
const RECONNECT_DELAYS = [5000, 10000, 15000, 30000, 60000]; // Progressive backoff

async function connectToWA() {
    console.log(`${EMOJIS.CONNECTION.START} Initializing connection (Attempt ${retryCount + 1}/${MAX_RETRIES})...`);
    
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
                retryCount = 0; // Reset retry counter on success
                
                // PM2 Ready Signal (critical fix)
                if (process.send) {
                    process.send('ready');
                    console.log(`${EMOJIS.CONNECTION.SUCCESS} PM2 ready signal sent`);
                }
            }
            
            if (update.connection === 'close') {
                const shouldReconnect = update.lastDisconnect?.error?.output?.statusCode 
                    !== DisconnectReason.loggedOut;
                
                console.log(`${shouldReconnect ? EMOJIS.CONNECTION.RECONNECT : EMOJIS.STATUS.OFFLINE} 
                    ${update.lastDisconnect.error?.message || 'Disconnected'}`);
                
                if (shouldReconnect && retryCount < MAX_RETRIES) {
                    const delay = RECONNECT_DELAYS[retryCount];
                    console.log(`Reconnecting in ${delay/1000} seconds...`);
                    setTimeout(connectToWA, delay);
                    retryCount++;
                } else {
                    console.error(`${EMOJIS.STATUS.OFFLINE} Max reconnection attempts reached`);
                    process.exit(EXIT_CODES.RESTART);
                }
            }
        });

        // Credentials Update Handler
        conn.ev.on('creds.update', saveCreds);

        return conn;

    } catch (error) {
        console.error(`${EMOJIS.STATUS.OFFLINE} Connection error:`, error.message);
        
        if (retryCount < MAX_RETRIES) {
            const delay = RECONNECT_DELAYS[retryCount];
            setTimeout(connectToWA, delay);
            retryCount++;
        } else {
            process.exit(EXIT_CODES.RESTART);
        }
    }
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

//===================MAIN PROCESS=======================
setupSessions();
const server = startServer();
let whatsappClient;

// Graceful shutdown handler
function gracefulShutdown() {
    console.log(`${EMOJIS.STATUS.OFFLINE} Shutting down gracefully...`);
    
    const shutdownPromises = [];
    
    if (server) {
        shutdownPromises.push(new Promise(res => server.close(res)));
    }
    
    if (whatsappClient) {
        shutdownPromises.push(whatsappClient.end());
    }
    
    Promise.all(shutdownPromises)
        .then(() => process.exit(EXIT_CODES.SUCCESS))
        .catch(() => process.exit(EXIT_CODES.ERROR));
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Start WhatsApp connection
whatsappClient = connectToWA();
