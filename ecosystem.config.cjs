const path = require("path");
const fs = require("fs");

let dotenv;
try {
  dotenv = require("./server/node_modules/dotenv");
} catch {
  try {
    dotenv = require("dotenv");
  } catch {}
}

const serverEnvFile = path.join(__dirname, "server", ".env");
let parsedServerEnv = {};
if (fs.existsSync(serverEnvFile) && dotenv) {
  try {
    parsedServerEnv = dotenv.parse(fs.readFileSync(serverEnvFile, "utf8"));
  } catch (e) {
    console.error("Failed to parse server .env in ecosystem config:", e);
  }
}

const NEON_DB_URL =
  "postgresql://neondb_owner:npg_uFyoipQ7END0@ep-tiny-star-aywpbgfb-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";

if (
  !parsedServerEnv.DATABASE_URL ||
  parsedServerEnv.DATABASE_URL.includes("localhost") ||
  parsedServerEnv.DATABASE_URL.includes("127.0.0.1") ||
  !parsedServerEnv.DATABASE_URL.startsWith("postgres")
) {
  parsedServerEnv.DATABASE_URL = NEON_DB_URL;
}

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
      node_args: "--dns-result-order=ipv4first --max-old-space-size=2048",
      env: {
        NODE_ENV: "production",
        PORT: 4001,
        ...parsedServerEnv,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 4001,
        ...parsedServerEnv,
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
      args: "start -p 4000",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      node_args: "--dns-result-order=ipv4first --max-old-space-size=2048",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
        NEXT_PUBLIC_API_URL: "https://bizpharma-api.okobiz.com/api",
        SERVER_URL: "https://bizpharma-api.okobiz.com",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 4000,
        NEXT_PUBLIC_API_URL: "https://bizpharma-api.okobiz.com/api",
        SERVER_URL: "https://bizpharma-api.okobiz.com",
      },
      error_file: path.join(__dirname, "logs", "client-error.log"),
      out_file: path.join(__dirname, "logs", "client-out.log"),
      merge_logs: true,
      time: true,
    },
  ],
};
