module.exports = {
    apps: [{
        name: "whatsapp-bot",
        script: "index.js",
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: "500M",
        wait_ready: true, // Critical for PM2 integration
        listen_timeout: 10000,
        kill_timeout: 30000,
        env: {
            NODE_ENV: "production",
            PM2: "true" // Helps identify PM2 environment
        }
    }]
};
