"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = exports.prisma = void 0;
const dns_1 = __importDefault(require("dns"));
try {
    dns_1.default.setDefaultResultOrder("ipv4first");
}
catch { }
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("@prisma/client");
// Candidate paths to search for .env
const candidateEnvPaths = [
    path_1.default.resolve(__dirname, "../../.env"),
    path_1.default.resolve(__dirname, "../../../.env"),
    path_1.default.resolve(process.cwd(), "server/.env"),
    path_1.default.resolve(process.cwd(), ".env"),
    "/var/www/bizpharma/server/.env",
    "/var/www/bizpharma/.env",
];
for (const envPath of candidateEnvPaths) {
    try {
        if (fs_1.default.existsSync(envPath)) {
            dotenv_1.default.config({ path: envPath });
        }
    }
    catch {
        // Ignore read errors
    }
}
// Fallback database URL if environment variable is missing or invalid
const DEFAULT_DATABASE_URL = "postgresql://neondb_owner:npg_uFyoipQ7END0@ep-tiny-star-aywpbgfb-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";
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
const pool = new pg_1.Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false,
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 20000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
});
exports.pool = pool;
pool.on("error", (err) => {
    console.error("[PrismaPg Pool Error]", err);
});
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({
    adapter,
    transactionOptions: {
        maxWait: 15000,
        timeout: 30000,
    },
});
exports.prisma = prisma;
