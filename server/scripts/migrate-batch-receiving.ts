import "dotenv/config";
import { Pool } from "pg";

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log("Connected to database, applying schema updates...");

    await client.query(`
      -- 1. Add carton and loose box tracking columns to Inventory
      ALTER TABLE "Inventory" ADD COLUMN IF NOT EXISTS "cartonsReceived" INTEGER DEFAULT 0;
      ALTER TABLE "Inventory" ADD COLUMN IF NOT EXISTS "looseBoxesReceived" INTEGER DEFAULT 0;
      ALTER TABLE "Inventory" ADD COLUMN IF NOT EXISTS "allocatedCartons" INTEGER DEFAULT 0;
      ALTER TABLE "Inventory" ADD COLUMN IF NOT EXISTS "allocatedLooseBoxes" INTEGER DEFAULT 0;

      -- 2. Create BatchReceivingRecord table
      CREATE TABLE IF NOT EXISTS "BatchReceivingRecord" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "inventoryId" TEXT NOT NULL,
        "branchId" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "supplierId" TEXT,
        "batchNumber" TEXT,
        "receivingUnit" TEXT NOT NULL DEFAULT 'CARTON',
        "cartonsReceived" INTEGER DEFAULT 0,
        "boxesPerCarton" INTEGER DEFAULT 10,
        "boxesReceived" INTEGER NOT NULL DEFAULT 0,
        "stripsPerBox" INTEGER DEFAULT 10,
        "tabletsPerStrip" INTEGER DEFAULT 10,
        "totalQuantity" INTEGER NOT NULL DEFAULT 0,
        "purchasePrice" DECIMAL(10, 2),
        "sellingPrice" DECIMAL(10, 2),
        "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiryDate" TIMESTAMP(3),
        "mfgDate" TIMESTAMP(3),
        "invoiceNo" TEXT,
        "notes" TEXT,
        "receivedBy" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "BatchReceivingRecord_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "BatchReceivingRecord_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );

      -- 3. Create indexes
      CREATE INDEX IF NOT EXISTS "BatchReceivingRecord_inventoryId_idx" ON "BatchReceivingRecord"("inventoryId");
      CREATE INDEX IF NOT EXISTS "BatchReceivingRecord_branchId_idx" ON "BatchReceivingRecord"("branchId");
      CREATE INDEX IF NOT EXISTS "BatchReceivingRecord_productId_idx" ON "BatchReceivingRecord"("productId");
      CREATE INDEX IF NOT EXISTS "BatchReceivingRecord_batchNumber_idx" ON "BatchReceivingRecord"("batchNumber");
      CREATE INDEX IF NOT EXISTS "BatchReceivingRecord_receivedDate_idx" ON "BatchReceivingRecord"("receivedDate");
    `);

    console.log("Migration executed successfully!");
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
