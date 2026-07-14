"use strict";

/** PM2 config for the Kronos Next.js trading app (runs on this Mac mini). */
module.exports = {
  apps: [
    {
      name: "kronos-app",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000 -H 127.0.0.1",
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "30s",
      restart_delay: 5000,
      max_memory_restart: "800M",
      out_file: "./logs/app-out.log",
      error_file: "./logs/app-err.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DDTHH:mm:ssZ",
      env: {
        NODE_ENV: "production",
        // Server-side rewrites proxy /api/keeper/* to the local keeper.
        KEEPER_API_URL: "http://127.0.0.1:3001",
        PORT: "3000",
      },
    },
    {
      name: "kronos-app-tunnel",
      cwd: __dirname,
      script: "cloudflare-app-tunnel.sh",
      interpreter: "bash",
      autorestart: true,
      max_restarts: 20,
      min_uptime: "10s",
      restart_delay: 5000,
      out_file: "./logs/tunnel-out.log",
      error_file: "./logs/tunnel-err.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DDTHH:mm:ssZ",
    },
  ],
};
