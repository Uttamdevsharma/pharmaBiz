"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
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
// Fallback database URL if environment variable is missing
const DEFAULT_DATABASE_URL = "postgresql://neondb_owner:npg_uFyoipQ7END0@ep-tiny-star-aywpbgfb-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";
let connectionString = (process.env.DATABASE_URL || DEFAULT_DATABASE_URL).trim();
// Strip channel_binding=require for node-postgres compatibility
connectionString = connectionString.replace(/[?&]channel_binding=require/g, "");
if (!connectionString.includes("?") && connectionString.includes("&")) {
    connectionString = connectionString.replace("&", "?");
}
const pool = new pg_1.Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});
pool.on("error", (err) => {
    console.error("[PrismaPg Pool Error]", err);
});
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({
    adapter,
    transactionOptions: {
        maxWait: 10000,
        timeout: 20000,
    },
});
exports.prisma = prisma;
