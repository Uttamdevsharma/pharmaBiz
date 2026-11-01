import dns from "dns";
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Search candidate .env paths
const candidateEnvPaths = [
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../../../.env"),
  path.resolve(process.cwd(), "server/.env"),
  path.resolve(process.cwd(), ".env"),
  "/var/www/bizpharma/server/.env",
  "/var/www/bizpharma/.env",
];

for (const envPath of candidateEnvPaths) {
  try {
    if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
  } catch {}
}

const raw = (process.env.DATABASE_URL || "").trim();
if (!raw) {
  throw new Error("DATABASE_URL environment variable is required.");
}

// Strip channel_binding for node-postgres compatibility
let connectionString = raw.replace(/[?&]channel_binding=require/g, "");
if (!connectionString.includes("?") && connectionString.includes("&")) {
  connectionString = connectionString.replace("&", "?");
}

const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on("error", (err) => {
  console.error("[PostgreSQL Pool Error]", err);
});

const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({
  adapter,
  transactionOptions: {
    maxWait: 15000,
    timeout: 30000,
  },
});

export { pool };
