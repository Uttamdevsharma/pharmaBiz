"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
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
const payment_controller_1 = require("./modules/payment/payment.controller");
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// CORS middleware
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
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
const path_1 = __importDefault(require("path"));
app.use("/uploads", express_1.default.static(path_1.default.join(process.cwd(), "public", "uploads")));
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
app.use("/api/audit", audit_routes_1.auditRoutes);
app.use("/api/notifications", notification_routes_1.notificationRoutes);
app.use("/api/sync", sync_routes_1.syncRoutes);
app.use("/api/settings", settings_routes_1.settingsRoutes);
app.use("/api/upload", upload_routes_1.uploadRoutes);
app.use("/api/suppliers", supplier_routes_1.supplierRoutes);
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
// Start Server and trigger Admin seeding
app.listen(port, async () => {
    console.log(`Pharmacy Management SaaS API listening on port ${port}`);
    await (0, seedAdmin_1.seedSuperAdmin)();
});
exports.default = app;
