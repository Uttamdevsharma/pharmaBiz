"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dns_1 = __importDefault(require("dns"));
try {
    dns_1.default.setDefaultResultOrder("ipv4first");
}
catch { }
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Load .env from multiple candidate paths
[
    path_1.default.resolve(__dirname, "../.env"),
    path_1.default.resolve(__dirname, "../../.env"),
    path_1.default.resolve(process.cwd(), "server/.env"),
    path_1.default.resolve(process.cwd(), ".env"),
    "/var/www/bizpharma/server/.env",
].forEach((p) => {
    try {
        if (fs_1.default.existsSync(p))
            dotenv_1.default.config({ path: p });
    }
    catch { }
});
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const seedAdmin_1 = require("./app/lib/seedAdmin");
// Route imports
const auth_routes_1 = require("./modules/auth/auth.routes");
const super_admin_routes_1 = require("./modules/super-admin/super-admin.routes");
const subscription_routes_1 = require("./modules/subscription/subscription.routes");
const payment_routes_1 = require("./modules/payment/payment.routes");
const tenant_routes_1 = require("./modules/tenant/tenant.routes");
const branch_routes_1 = require("./modules/branch/branch.routes");
const user_routes_1 = require("./modules/user/user.routes");
const product_routes_1 = require("./modules/product/product.routes");
const inventory_routes_1 = require("./modules/inventory/inventory.routes");
const transfer_routes_1 = require("./modules/transfer/transfer.routes");
const sales_routes_1 = require("./modules/sales/sales.routes");
const report_routes_1 = require("./modules/report/report.routes");
const audit_routes_1 = require("./modules/audit/audit.routes");
const notification_routes_1 = require("./modules/notification/notification.routes");
const sync_routes_1 = require("./modules/sync/sync.routes");
const settings_routes_1 = require("./modules/settings/settings.routes");
const upload_routes_1 = require("./modules/upload/upload.routes");
const supplier_routes_1 = require("./modules/supplier/supplier.routes");
const accounting_routes_1 = require("./modules/accounting/accounting.routes");
const attendance_routes_1 = require("./modules/attendance/attendance.routes");
const location_routes_1 = __importDefault(require("./modules/location/location.routes"));
const payment_controller_1 = require("./modules/payment/payment.controller");
const live_chat_routes_1 = require("./modules/live-chat/live-chat.routes");
const support_ticket_routes_1 = require("./modules/support-ticket/support-ticket.routes");
const notices_routes_1 = require("./modules/notices/notices.routes");
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// CORS middleware
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Access-Control-Allow-Credentials", "true");
    }
    else {
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
app.use(express_1.default.json({ limit: "25mb" }));
app.use(express_1.default.urlencoded({ limit: "25mb", extended: true }));
// Serve uploaded images statically
app.use("/uploads", express_1.default.static(path_1.default.join(process.cwd(), "public", "uploads")));
// Mount Swagger Documentation & Testing UI
const docs_1 = require("./docs");
(0, docs_1.setupSwagger)(app);
// Health check
app.get("/", (req, res) => {
    res.json({
        success: true,
        name: "Multi-Tenant SaaS Pharmacy Management API",
        version: "1.0.0",
        status: "Healthy",
        timestamp: new Date(),
    });
});
const prisma_1 = require("./app/lib/prisma");
const serverless_1 = require("@neondatabase/serverless");
const net_1 = __importDefault(require("net"));
function serializeErr(err) {
    if (!err)
        return null;
    const out = {
        message: err.message || "",
        name: err.name || "Error",
        code: err.code || null,
        stack: err.stack || null,
    };
    for (const k of Object.getOwnPropertyNames(err)) {
        if (!(k in out))
            out[k] = err[k];
    }
    return out;
}
function probeTcpPort(host, port, timeoutMs = 2500) {
    return new Promise((resolve) => {
        const start = Date.now();
        const socket = new net_1.default.Socket();
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
        socket.once("error", (err) => {
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
app.get("/api/health/db", async (req, res) => {
    const diagnostic = {
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
        if (urlMatch && urlMatch[1])
            dbHost = urlMatch[1];
    }
    catch { }
    // Network Probes
    try {
        const dnsLookup = await dns_1.default.promises.lookup(dbHost, { all: true });
        diagnostic.dns = { host: dbHost, addresses: dnsLookup };
    }
    catch (dnsErr) {
        diagnostic.dns = { host: dbHost, error: serializeErr(dnsErr) };
    }
    diagnostic.port443 = await probeTcpPort(dbHost, 443);
    diagnostic.port5432 = await probeTcpPort(dbHost, 5432);
    let anySuccess = false;
    // Probe 1: Neon HTTP SQL (REST over HTTPS port 443)
    try {
        const sql = (0, serverless_1.neon)(rawUrl);
        const httpStart = Date.now();
        const httpRes = await sql `SELECT 1 AS connected, NOW() AS db_now, current_database() AS db_name`;
        diagnostic.neonHttp = {
            success: true,
            latencyMs: Date.now() - httpStart,
            result: httpRes[0],
        };
        anySuccess = true;
    }
    catch (httpErr) {
        diagnostic.neonHttp = {
            success: false,
            error: serializeErr(httpErr),
        };
    }
    // Probe 2: Direct Pool probe (WebSocket tunnel over port 443)
    try {
        const pgStart = Date.now();
        const pgRes = await prisma_1.pool.query("SELECT 1 AS connected, NOW() AS db_now, current_database() AS db_name");
        diagnostic.pool = {
            success: true,
            latencyMs: Date.now() - pgStart,
            result: pgRes.rows[0],
        };
        anySuccess = true;
    }
    catch (poolErr) {
        diagnostic.pool = {
            success: false,
            error: serializeErr(poolErr),
        };
    }
    // Probe 3: Prisma Raw Query
    try {
        const prismaRawStart = Date.now();
        await prisma_1.prisma.$queryRawUnsafe("SELECT 1 AS ok");
        diagnostic.prismaRaw = {
            success: true,
            latencyMs: Date.now() - prismaRawStart,
        };
        anySuccess = true;
    }
    catch (prismaRawErr) {
        diagnostic.prismaRaw = {
            success: false,
            error: serializeErr(prismaRawErr),
        };
    }
    // Probe 4: Prisma Model Query (User Count)
    try {
        const prismaModelStart = Date.now();
        const userCount = await prisma_1.prisma.user.count();
        diagnostic.prismaModel = {
            success: true,
            latencyMs: Date.now() - prismaModelStart,
            userCount,
        };
        anySuccess = true;
    }
    catch (prismaModelErr) {
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
    }
    else {
        res.status(500).json({
            success: false,
            message: "All database probes failed to connect",
            diagnostic,
        });
    }
});
// Mount Module Routes
app.use("/api/auth", auth_routes_1.authRoutes);
app.use("/api/super-admin", super_admin_routes_1.superAdminRoutes);
app.use("/api/subscriptions", subscription_routes_1.subscriptionRoutes);
app.use("/api/payments", payment_routes_1.paymentRoutes);
app.use("/api/tenant", tenant_routes_1.tenantRoutes);
app.use("/api/branches", branch_routes_1.branchRoutes);
app.use("/api/users", user_routes_1.userRoutes);
app.use("/api/products", product_routes_1.productRoutes);
app.use("/api/inventory", inventory_routes_1.inventoryRoutes);
app.use("/api/transfers", transfer_routes_1.transferRoutes);
app.use("/api/sales", sales_routes_1.salesRoutes);
app.use("/api/reports", report_routes_1.reportRoutes);
app.use("/api/report", report_routes_1.reportRoutes);
app.use("/api/audit", audit_routes_1.auditRoutes);
app.use("/api/notifications", notification_routes_1.notificationRoutes);
app.use("/api/sync", sync_routes_1.syncRoutes);
app.use("/api/settings", settings_routes_1.settingsRoutes);
app.use("/api/upload", upload_routes_1.uploadRoutes);
app.use("/api/suppliers", supplier_routes_1.supplierRoutes);
app.use("/api/accounting", accounting_routes_1.accountingRoutes);
app.use("/api/attendance", attendance_routes_1.attendanceRoutes);
app.use("/api/locations", location_routes_1.default);
app.use("/api/live-chat", live_chat_routes_1.liveChatRoutes);
app.use("/api/super-admin/live-chat", live_chat_routes_1.superAdminLiveChatRoutes);
app.use("/api/tenant/support-tickets", support_ticket_routes_1.tenantSupportTicketRoutes);
app.use("/api/super-admin/support-tickets", support_ticket_routes_1.superAdminSupportTicketRoutes);
app.use("/api/super-admin/notices", notices_routes_1.superAdminNoticeRoutes);
app.use("/api/tenant/notices", notices_routes_1.tenantNoticeRoutes);
const quotation_controller_1 = require("./modules/super-admin/quotation.controller");
const settings_controller_1 = require("./modules/settings/settings.controller");
app.get("/api/public/quotations/:id", quotation_controller_1.QuotationController.getById);
app.get("/api/public/platform-settings", settings_controller_1.SettingsController.getPublicPaymentGateways);
app.get("/api/public/payment-gateways", settings_controller_1.SettingsController.getPublicPaymentGateways);
// Fallback & direct gateway callbacks on root /payment/* (Supports both GET and POST)
app.all("/payment/success", payment_controller_1.PaymentController.handleSuccess);
app.all("/payment/fail", payment_controller_1.PaymentController.handleFail);
app.all("/payment/cancel", payment_controller_1.PaymentController.handleCancel);
// 404 Route Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Cannot ${req.method} ${req.originalUrl} - Route not found`,
    });
});
// Global Error Handler
app.use((err, req, res, next) => {
    console.error("[Unhandled API Error]", err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal server error",
    });
});
const subscription_expiry_service_1 = require("./modules/subscription/subscription-expiry.service");
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
            await (0, seedAdmin_1.seedSuperAdmin)();
        }
        catch (seedErr) {
            console.error("[Seed Startup Error]", seedErr?.message || seedErr);
        }
        subscription_expiry_service_1.SubscriptionExpiryService.initAutomatedScheduler();
    });
}
// Trigger backend reload with latest Prisma Client models
exports.default = app;
