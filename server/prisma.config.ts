
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

let dbUrl = (process.env.DATABASE_URL || process.env.DIRECT_URL || "").trim();
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
