import dns from "dns";
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Load .env from multiple candidate paths
[
  path.resolve(__dirname, "../.env"),
  path.resolve(__dirname, "../../.env"),
  path.resolve(process.cwd(), "server/.env"),
  path.resolve(process.cwd(), ".env"),
  "/var/www/bizpharma/server/.env",
].forEach((p) => {
  try {
    if (fs.existsSync(p)) dotenv.config({ path: p });
  } catch {}
});
dotenv.config();
import express, { Request, Response, NextFunction, response } from "express";
import { seedSuperAdmin } from "./app/lib/seedAdmin";

// Route imports
import { authRoutes } from "./modules/auth/auth.routes";
import { superAdminRoutes } from "./modules/super-admin/super-admin.routes";
import { subscriptionRoutes } from "./modules/subscription/subscription.routes";
import { paymentRoutes } from "./modules/payment/payment.routes";
import { tenantRoutes } from "./modules/tenant/tenant.routes";
import { branchRoutes } from "./modules/branch/branch.routes";
import { userRoutes } from "./modules/user/user.routes";
import { productRoutes } from "./modules/product/product.routes";
import { inventoryRoutes } from "./modules/inventory/inventory.routes";
import { transferRoutes } from "./modules/transfer/transfer.routes";
import { salesRoutes } from "./modules/sales/sales.routes";
import { reportRoutes } from "./modules/report/report.routes";
import { auditRoutes } from "./modules/audit/audit.routes";
import { notificationRoutes } from "./modules/notification/notification.routes";
import { syncRoutes } from "./modules/sync/sync.routes";
import { settingsRoutes } from "./modules/settings/settings.routes";
import { uploadRoutes } from "./modules/upload/upload.routes";
import { supplierRoutes } from "./modules/supplier/supplier.routes";
import { accountingRoutes } from "./modules/accounting/accounting.routes";
import { attendanceRoutes } from "./modules/attendance/attendance.routes";
import locationRoutes from "./modules/location/location.routes";
import { PaymentController } from "./modules/payment/payment.controller";
import { liveChatRoutes, superAdminLiveChatRoutes } from "./modules/live-chat/live-chat.routes";
import { tenantSupportTicketRoutes, superAdminSupportTicketRoutes } from "./modules/support-ticket/support-ticket.routes";
import { superAdminNoticeRoutes, tenantNoticeRoutes } from "./modules/notices/notices.routes";

const app = express();
const port = process.env.PORT || 3000;

// CORS middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  } else {
    res.header("Access-Control-Allow-Origin", "*");
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-branch-id, X-Branch-Id");
  
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

// Body parsing middleware (supporting up to 25MB for image payloads)
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb", extended: true }));

// Serve uploaded images statically
app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

// Mount Swagger Documentation & Testing UI
import { setupSwagger } from "./docs";
setupSwagger(app);

// Health check
app.get("/", (req: Request, res: Response) => {
  res.json({
    success: true,
    name: "Multi-Tenant SaaS Pharmacy Management API",
    version: "1.0.0",
    status: "Healthy",
    timestamp: new Date(),
  });
});

import { prisma, pool } from "./app/lib/prisma";
import { neon } from "@neondatabase/serverless";
import net from "net";

function serializeErr(err: any) {
  if (!err) return null;
  const out: Record<string, any> = {
    message: err.message || "",
    name: err.name || "Error",
    code: err.code || null,
    stack: err.stack || null,
  };
  for (const k of Object.getOwnPropertyNames(err)) {
    if (!(k in out)) out[k] = err[k];
  }
  return out;
}

function probeTcpPort(host: string, port: number, timeoutMs = 2500): Promise<{ open: boolean; latencyMs?: number; error?: string }> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    let settled = false;

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      if (!settled) {
        settled = true;
        const latencyMs = Date.now() - start;
        socket.destroy();
        resolve({ open: true, latencyMs });
      }
    });

    socket.once("timeout", () => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve({ open: false, error: "Connection timed out" });
      }
    });

    socket.once("error", (err: any) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve({ open: false, error: err?.message || "TCP connection error" });
      }
    });

    socket.connect(port, host);
  });
}

// Comprehensive Multi-Probe Database Health & Diagnostic Check
app.get("/api/health/db", async (req: Request, res: Response) => {
  const diagnostic: any = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    nodeVersion: process.version,
    platform: process.platform,
    port: process.env.PORT,
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    jwtSecretConfigured: Boolean(process.env.JWT_SECRET),
  };

  const rawUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_uFyoipQ7END0@ep-tiny-star-aywpbgfb-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";
  diagnostic.databaseHostMasked = rawUrl.replace(/:([^:@]+)@/, ":****@");

  // Extract hostname for network probes
  let dbHost = "ep-tiny-star-aywpbgfb-pooler.c-5.us-east-2.aws.neon.tech";
  try {
    const urlMatch = rawUrl.match(/@([^:\/?#]+)/);
    if (urlMatch && urlMatch[1]) dbHost = urlMatch[1];
  } catch {}

  // Network Probes
  try {
    const dnsLookup = await dns.promises.lookup(dbHost, { all: true });
    diagnostic.dns = { host: dbHost, addresses: dnsLookup };
  } catch (dnsErr: any) {
    diagnostic.dns = { host: dbHost, error: serializeErr(dnsErr) };
  }

  diagnostic.port443 = await probeTcpPort(dbHost, 443);
  diagnostic.port5432 = await probeTcpPort(dbHost, 5432);

  let anySuccess = false;

  // Probe 1: Neon HTTP SQL (REST over HTTPS port 443)
  try {
    const sql = neon(rawUrl);
    const httpStart = Date.now();
    const httpRes = await sql`SELECT 1 AS connected, NOW() AS db_now, current_database() AS db_name`;
    diagnostic.neonHttp = {
      success: true,
      latencyMs: Date.now() - httpStart,
      result: httpRes[0],
    };
    anySuccess = true;
  } catch (httpErr: any) {
    diagnostic.neonHttp = {
      success: false,
      error: serializeErr(httpErr),
    };
  }

  // Probe 2: Direct Pool probe (WebSocket tunnel over port 443)
  try {
    const pgStart = Date.now();
    const pgRes = await pool.query("SELECT 1 AS connected, NOW() AS db_now, current_database() AS db_name");
    diagnostic.pool = {
      success: true,
      latencyMs: Date.now() - pgStart,
      result: pgRes.rows[0],
    };
    anySuccess = true;
  } catch (poolErr: any) {
    diagnostic.pool = {
      success: false,
      error: serializeErr(poolErr),
    };
  }

  // Probe 3: Prisma Raw Query
  try {
    const prismaRawStart = Date.now();
    await (prisma as any).$queryRawUnsafe("SELECT 1 AS ok");
    diagnostic.prismaRaw = {
      success: true,
      latencyMs: Date.now() - prismaRawStart,
    };
    anySuccess = true;
  } catch (prismaRawErr: any) {
    diagnostic.prismaRaw = {
      success: false,
      error: serializeErr(prismaRawErr),
    };
  }

  // Probe 4: Prisma Model Query (User Count)
  try {
    const prismaModelStart = Date.now();
    const userCount = await (prisma as any).user.count();
    diagnostic.prismaModel = {
      success: true,
      latencyMs: Date.now() - prismaModelStart,
      userCount,
    };
    anySuccess = true;
  } catch (prismaModelErr: any) {
    diagnostic.prismaModel = {
      success: false,
      error: serializeErr(prismaModelErr),
    };
  }

  if (anySuccess) {
    res.status(200).json({
      success: true,
      message: "Database connectivity verified",
      diagnostic,
    });
  } else {
    res.status(500).json({
      success: false,
      message: "All database probes failed to connect",
      diagnostic,
    });
  }
});

// Mount Module Routes
app.use("/api/auth", authRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/tenant", tenantRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/sync", syncRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/accounting", accountingRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/live-chat", liveChatRoutes);
app.use("/api/super-admin/live-chat", superAdminLiveChatRoutes);
app.use("/api/tenant/support-tickets", tenantSupportTicketRoutes);
app.use("/api/super-admin/support-tickets", superAdminSupportTicketRoutes);
app.use("/api/super-admin/notices", superAdminNoticeRoutes);
app.use("/api/tenant/notices", tenantNoticeRoutes);

import { QuotationController } from "./modules/super-admin/quotation.controller";
import { SettingsController } from "./modules/settings/settings.controller";
app.get("/api/public/quotations/:id", QuotationController.getById);
app.get("/api/public/platform-settings", SettingsController.getPublicPaymentGateways);
app.get("/api/public/payment-gateways", SettingsController.getPublicPaymentGateways);

// Fallback & direct gateway callbacks on root /payment/* (Supports both GET and POST)
app.all("/payment/success", PaymentController.handleSuccess);
app.all("/payment/fail", PaymentController.handleFail);
app.all("/payment/cancel", PaymentController.handleCancel);

// 404 Route Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`,
  });
});



// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("[Unhandled API Error]", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

import { SubscriptionExpiryService } from "./modules/subscription/subscription-expiry.service";

// Start Server and trigger Admin seeding & automated subscription expiry scheduler (skip in Vercel serverless)
if (!process.env.VERCEL) {
  app.listen(port, async () => {
    console.log(`\n======================================================`);
    console.log(` Pharmacy Management SaaS API listening on port ${port}`);
    console.log(` Node Version: ${process.version} | Platform: ${process.platform}`);
    console.log(` DATABASE_URL configured: ${Boolean(process.env.DATABASE_URL)}`);
    console.log(` JWT_SECRET configured: ${Boolean(process.env.JWT_SECRET)}`);
    console.log(`======================================================\n`);
    try {
      await seedSuperAdmin();
    } catch (seedErr: any) {
      console.error("[Seed Startup Error]", seedErr?.message || seedErr);
    }
    SubscriptionExpiryService.initAutomatedScheduler();
  });
}

// Trigger backend reload with latest Prisma Client models
export default app;