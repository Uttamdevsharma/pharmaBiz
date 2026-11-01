import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { defineConfig } from "prisma/config";

[
  path.resolve(__dirname, ".env"),
  path.resolve(__dirname, "../.env"),
  path.resolve(process.cwd(), "server/.env"),
  path.resolve(process.cwd(), ".env"),
  "/var/www/bizpharma/server/.env",
].forEach((p) => {
  try {
    if (fs.existsSync(p)) dotenv.config({ path: p });
  } catch {}
});
dotenv.config();

const DEFAULT_DATABASE_URL =
  "postgresql://neondb_owner:npg_uFyoipQ7END0@ep-tiny-star-aywpbgfb-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";

let dbUrl = (process.env.DATABASE_URL || DEFAULT_DATABASE_URL).trim();
dbUrl = dbUrl.replace(/[?&]channel_binding=require/g, "");
if (!dbUrl.includes("?") && dbUrl.includes("&")) {
  dbUrl = dbUrl.replace("&", "?");
}

export default defineConfig({
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: dbUrl,
  },
});
