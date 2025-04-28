/**
 * Copyright (C) 2025.
 * Licensed under the GPL-3.0 License;
 * You may not sell this script.
 * It is supplied in the hope that it may be useful.
 * @project_name: Free Bot script
 * @author: Malvin King <https://github.com/kingmalvn>
 * @description: A Multi-functional whatsapp bot script.
 * @version: 3.0.0
 **/

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    jidNormalizedUser,
    getContentType,
    fetchLatestBaileysVersion,
    Browsers
} = require('@whiskeysockets/baileys');

const l = console.log;
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson } = require('./lib/functions');
const fs = require('fs');
const ff = require('fluent-ffmpeg');
const P = require('pino');
const config = require('./config');
const qrcode = require('qrcode-terminal');
const { sms, downloadMediaMessage } = require('./lib/msg');
const axios = require('axios');
const { File } = require('megajs');
const { tmpdir } = require('os');
const path = require('path');
const express = require("express");
const app = express();
const prefix = config.PREFIX;
const ownerNumber = ['918137829228'];

//===================SESSION-AUTH============================
const sessionsDir = path.join(__dirname, 'sessions');
if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
}

if (!fs.existsSync(path.join(sessionsDir, 'creds.json'))) {
    if (!config.SESSION_ID) {
        console.log('Please add your session to SESSION_ID env !!');
        process.exit(1);
    }

    const sessdata = config.SESSION_ID.replace("LIZAMWOL-MD~", '');
    const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);

    filer.download(async (err, data) => {
        if (err) {
            console.error('Download failed:', err.message);
            process.exit(1);
        }

        try {
            fs.writeFileSync(path.join(sessionsDir, 'creds.json'), data);
            console.log('Session file downloaded successfully ✅');
            setTimeout(connectToWA, 3000); // Wait for file system to stabilize
        } catch (writeErr) {
            console.error('Error writing file:', writeErr.message);
            process.exit(1);
        }
    });
} else {
    connectToWA();
}

//===================WHATSAPP CONNECTION=======================
async function connectToWA() {
    console.log("Connecting LIZAMWOL-MD 🧬...");
    
    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionsDir);
        const { version } = await fetchLatestBaileysVersion();

        const conn = makeWASocket({
            logger: P({ level: 'silent' }),
            printQRInTerminal: false,
            browser: Browsers.macOS("Firefox"),
            syncFullHistory: true,
            auth: state,
            version
        });

        conn.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'close') {
                if (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                    console.log('Reconnecting...');
                    setTimeout(connectToWA, 5000);
                }
            } else if (connection === 'open') {
                console.log('♻️ Installing plugin files...');
                loadPlugins();
                console.log('LIZAMWOL-MD connected successfully ✅');
                
                const welcomeMsg = `*╭──────────────●●►*
> *➺ LIZAMWOL-MD connected successfully*
> *❁ Join our WhatsApp channel for updates:*
> *${config.CHANNEL_LINK}*
> *Your bot is now active! Enjoy! ♥️🪄*
> *Prefix: ${prefix}*
*╰──────────────●●►*`;

                conn.sendMessage(conn.user.id, { 
                    image: { url: config.MENU_IMG },
                    caption: welcomeMsg
                });
            }
        });

        conn.ev.on('creds.update', saveCreds);

        //===================MESSAGE HANDLING=======================
        conn.ev.on('messages.upsert', async ({ messages }) => {
            const mek = messages[0];
            if (!mek.message) return;

            // Message processing logic here
            // ... (keep your existing message handling logic)
        });

    } catch (error) {
        console.error('Connection error:', error);
        setTimeout(connectToWA, 10000);
    }
}

//===================PLUGIN LOADER=======================
function loadPlugins() {
    const pluginPath = path.join(__dirname, 'plugins');
    fs.readdirSync(pluginPath).forEach(file => {
        if (path.extname(file).toLowerCase() === '.js') {
            require(path.join(pluginPath, file));
            console.log(`Loaded plugin: ${file}`);
        }
    });
}

//===================EXPRESS SERVER=======================
const port = process.env.PORT || 9090;
app.get("/", (req, res) => {
    res.send("LIZAMWOL-MD is running ✅");
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
