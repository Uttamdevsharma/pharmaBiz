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

// Fallback database URL if environment variable is missing or invalid
const DEFAULT_DATABASE_URL =
  "postgresql://neondb_owner:npg_uFyoipQ7END0@ep-tiny-star-aywpbgfb-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";

let raw = (process.env.DATABASE_URL || "").trim();
if (!raw || raw.includes("localhost") || raw.includes("127.0.0.1") || !raw.startsWith("postgres")) {
  raw = DEFAULT_DATABASE_URL;
}

let connectionString = raw;

// Strip channel_binding=require for node-postgres compatibility
connectionString = connectionString.replace(/[?&]channel_binding=require/g, "");
if (!connectionString.includes("?") && connectionString.includes("&")) {
  connectionString = connectionString.replace("&", "?");
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

pool.on("error", (err) => {
  console.error("[PrismaPg Pool Error]", err);
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({
  adapter,
  transactionOptions: {
    maxWait: 15000,
    timeout: 30000,
  },
});

export { prisma, pool };
