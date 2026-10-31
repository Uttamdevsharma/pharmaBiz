const path = require("path");

module.exports = {
  apps: [
    {
      name: "bizpharma-server",
      cwd: path.join(__dirname, "server"),
      script: "dist/app.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: path.join(__dirname, "logs", "server-error.log"),
      out_file: path.join(__dirname, "logs", "server-out.log"),
      merge_logs: true,
      time: true,
    },
    {
      name: "bizpharma-client",
      cwd: path.join(__dirname, "client"),
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3001",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      error_file: path.join(__dirname, "logs", "client-error.log"),
      out_file: path.join(__dirname, "logs", "client-out.log"),
      merge_logs: true,
      time: true,
    },
  ],
};

