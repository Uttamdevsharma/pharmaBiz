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
// Search candidate .env paths
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
        if (fs_1.default.existsSync(envPath))
            dotenv_1.default.config({ path: envPath });
    }
    catch { }
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
const pool = new pg_1.Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: {
        rejectUnauthorized: false,
    },
});
exports.pool = pool;
pool.on("error", (err) => {
    console.error("[PostgreSQL Pool Error]", err);
});
const adapter = new adapter_pg_1.PrismaPg(pool);
exports.prisma = new client_1.PrismaClient({
    adapter,
    transactionOptions: {
        maxWait: 15000,
        timeout: 30000,
    },
});
