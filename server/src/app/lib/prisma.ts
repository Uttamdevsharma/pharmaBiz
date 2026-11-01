import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Candidate paths to search for .env
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
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
  } catch {
    // Ignore read errors
  }
}

// Fallback database URL if environment variable is missing
const DEFAULT_DATABASE_URL =
  "postgresql://neondb_owner:npg_uFyoipQ7END0@ep-tiny-star-aywpbgfb-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";

let connectionString = (process.env.DATABASE_URL || DEFAULT_DATABASE_URL).trim();

// Strip channel_binding=require for node-postgres compatibility
connectionString = connectionString.replace(/[?&]channel_binding=require/g, "");
if (!connectionString.includes("?") && connectionString.includes("&")) {
  connectionString = connectionString.replace("&", "?");
}

const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
  console.error("[PrismaPg Pool Error]", err);
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({
  adapter,
  transactionOptions: {
    maxWait: 10000,
    timeout: 20000,
  },
});

export { prisma };
