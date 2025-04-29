module.exports = {
    apps: [{
        name: "LIZAMWOL-MD",
        script: "index.js",
        instances: PM2_CONFIG.INSTANCES,
        exec_mode: PM2_CONFIG.CLUSTER_MODE ? "cluster" : "fork",
        autorestart: PM2_CONFIG.AUTORESTART,
        watch: false,
        max_memory_restart: PM2_CONFIG.MAX_MEMORY,
        cron_restart: PM2_CONFIG.CRON_RESTART,
        env: {
            NODE_ENV: "development",
            PM2_CLUSTER: PM2_CONFIG.CLUSTER_MODE
        },
        env_production: {
            NODE_ENV: "production",
            PM2_SILENT: true
        },
        error_file: "./logs/pm2-error.log",
        out_file: "./logs/pm2-out.log",
        pid_file: "./logs/pm2.pid",
        merge_logs: true,
        log_date_format: "YYYY-MM-DD HH:mm:ss"
    }]
};
