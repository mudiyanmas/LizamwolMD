/**
 * Copyright (C) 2025.
 * Licensed under the GPL-3.0 License;
 * You may not sell this script.
 * It is supplied in the hope that it may be useful.
 * @project_name: LIZAMWOL-MD
 * @author: Malvin King <https://github.com/kingmalvn>
 * @description: Advanced WhatsApp Bot
 * @version: 3.0.0
 **/

//===================REQUIRED DEPENDENCIES=======================
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    Browsers
} = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { File } = require('megajs');
const express = require("express");
const P = require('pino');

//===================CONFIGURATION CONSTANTS=======================
const config = require('./config');
const app = express();
const prefix = config.PREFIX;
const ownerNumber = ['918137829228'];
const sessionsDir = path.join(__dirname, 'sessions');

//===================EMOJI CONFIGURATION=======================
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
        NATURE: ["🌿", "🌸", "🌺", "🌻", "🌹"],
        OWNER: ["👑", "💎", "🎖️", "🌟", "💌"]
    }
};

//===================SESSION SETUP=======================
if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
}

if (!fs.existsSync(path.join(sessionsDir, 'creds.json'))) {
    if (!config.SESSION_ID) {
        console.log(`${EMOJIS.STATUS.OFFLINE} Please add SESSION_ID in config!`);
        process.exit(1);
    }

    try {
        const sessdata = config.SESSION_ID.replace("LIZAMWOL-MD~", '');
        const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);
        
        filer.download(async (err, data) => {
            if (err) throw err;
            
            fs.writeFileSync(path.join(sessionsDir, 'creds.json'), data);
            console.log(`${EMOJIS.CONNECTION.SUCCESS} Session downloaded!`);
            setTimeout(connectToWA, 3000);
        });
    } catch (error) {
        console.error(`${EMOJIS.STATUS.OFFLINE} Session error:`, error.message);
        process.exit(1);
    }
} else {
    connectToWA();
}

//===================WHATSAPP CONNECTION MANAGER=======================
async function connectToWA() {
    console.log(`${EMOJIS.CONNECTION.START} Initializing connection...`);
    
    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionsDir);
        const { version } = await fetchLatestBaileysVersion();

        const conn = makeWASocket({
            logger: P({ level: 'silent' }),
            printQRInTerminal: false,
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

            // Auto-reaction System
            if (config.AUTO_REACT) {
                const allEmojis = [
                    ...EMOJIS.REACTIONS.GENERAL,
                    ...EMOJIS.REACTIONS.HEARTS,
                    ...EMOJIS.REACTIONS.NATURE
                ];
                
                const reactEmoji = msg.key.participant && ownerNumber.includes(msg.key.participant.split('@')[0])
                    ? EMOJIS.REACTIONS.OWNER[Math.floor(Math.random() * EMOJIS.REACTIONS.OWNER.length)]
                    : allEmojis[Math.floor(Math.random() * allEmojis.length)];

                await conn.sendMessage(msg.key.remoteJid, {
                    react: {
                        text: reactEmoji,
                        key: msg.key
                    }
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
${EMOJIS.REACTIONS.NATURE[0]} Prefix: ${prefix}
${EMOJIS.REACTIONS.GENERAL[8]} Version: 3.0.0

${EMOJIS.REACTIONS.GENERAL[5]} *Official Channel:*
${config.CHANNEL_LINK}
*╰──────────────●●►*`;

    conn.sendMessage(conn.user.id, {
        image: { url: config.MENU_IMG },
        caption: welcomeMsg
    });
}

//===================SERVER SETUP=======================
const port = process.env.PORT || 9090;
app.get("/", (req, res) => res.send(`${EMOJIS.STATUS.ONLINE} Bot Active`));
app.listen(port, () => console.log(`Server running on port ${port}`));
