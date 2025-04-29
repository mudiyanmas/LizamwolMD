/**
 * Copyright (C) 2025.
 * Licensed under the GPL-3.0 License;
 * You may not sell this script.
 * @project_name: LIZAMWOL-MD
 * @author: Malvin King
 * @version: 3.0.0
 **/

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
const ownerNumber = ['918137829228']; // Replace with your number
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

//===================SESSION SETUP=======================
if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
}

//===================WHATSAPP CONNECTION=======================
async function connectToWA() {
    console.log(`${EMOJIS.CONNECTION.START} Initializing connection...`);
    
    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionsDir);
        const { version } = await fetchLatestBaileysVersion();

        const conn = makeWASocket({
            logger: P({ level: 'silent' }),
            printQRInTerminal: true,
            browser: Browsers.macOS("Firefox"),
            auth: state,
            version
        });

        // Connection Event Handler
        conn.ev.on('connection.update', (update) => {
            if (update.connection === 'open') {
                console.log(`${EMOJIS.CONNECTION.SUCCESS} Connected successfully!`);
                loadPlugins();
                sendWelcomeMessage(conn);
            }
            
            if (update.connection === 'close') {
                if (update.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                    console.log(`${EMOJIS.CONNECTION.RECONNECT} Reconnecting...`);
                    setTimeout(connectToWA, 5000);
                }
            }
        });

        // Credentials Update Handler
        conn.ev.on('creds.update', saveCreds);

        // Message Reaction System
        conn.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;

            if (config.AUTO_REACT) {
                const isOwner = msg.key.participant && 
                              ownerNumber.includes(msg.key.participant.split('@')[0]);
                
                const emoji = isOwner 
                    ? EMOJIS.REACTIONS.OWNER[Math.floor(Math.random() * EMOJIS.REACTIONS.OWNER.length)]
                    : EMOJIS.REACTIONS.GENERAL[Math.floor(Math.random() * EMOJIS.REACTIONS.GENERAL.length)];

                await conn.sendMessage(msg.key.remoteJid, {
                    react: { text: emoji, key: msg.key }
                });
            }
        });

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
        console.log(`${EMOJIS.CONNECTION.SUCCESS} Created plugins directory`);
        return;
    }

    fs.readdirSync(pluginDir).forEach(file => {
        if (path.extname(file).toLowerCase() === '.js') {
            require(path.join(pluginDir, file));
            console.log(`${EMOJIS.CONNECTION.SUCCESS} Loaded: ${file}`);
        }
    });
}

//===================WELCOME MESSAGE=======================
function sendWelcomeMessage(conn) {
    const welcomeMsg = `*╭──────────────●●►*
${EMOJIS.REACTIONS.HEARTS[3]} *LIZAMWOL-MD Activated* ${EMOJIS.REACTIONS.HEARTS[3]}
${EMOJIS.STATUS.ONLINE} Status: Operational
${EMOJIS.REACTIONS.GENERAL[8]} Version: 3.0.0

${EMOJIS.REACTIONS.GENERAL[5]} *Official Channel:*
${config.CHANNEL_LINK || 'Not configured'}
*╰──────────────●●►*`;

    conn.sendMessage(conn.user.id, {
        text: welcomeMsg
    }).catch(() => {
        conn.sendMessage(conn.user.id, { 
            text: "Bot started successfully! 🎉"
        });
    });
}

//===================SERVER SETUP=======================
const port = process.env.PORT || 9090;
app.get("/", (req, res) => res.send(`${EMOJIS.STATUS.ONLINE} Bot Active`));
app.listen(port, () => console.log(`Server running on port ${port}`));

// Start connection
connectToWA();
