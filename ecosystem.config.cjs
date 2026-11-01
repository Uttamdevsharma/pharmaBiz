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

if (!parsedServerEnv.DATABASE_URL) {
  parsedServerEnv.DATABASE_URL = process.env.DATABASE_URL || "";
}

if (!parsedServerEnv.JWT_SECRET) {
  parsedServerEnv.JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key_pharmacy_2026";
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
        NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: "c0d8f58b87df6e982c7a52f4e0c451db432a9e871e98d9e2646b3f54cb29107a",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 4000,
        NEXT_PUBLIC_API_URL: "https://bizpharma-api.okobiz.com/api",
        SERVER_URL: "https://bizpharma-api.okobiz.com",
        NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: "c0d8f58b87df6e982c7a52f4e0c451db432a9e871e98d9e2646b3f54cb29107a",
      },
      error_file: path.join(__dirname, "logs", "client-error.log"),
      out_file: path.join(__dirname, "logs", "client-out.log"),
      merge_logs: true,
      time: true,
    },
  ],
};
