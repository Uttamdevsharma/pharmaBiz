import "dotenv/config";
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

const app = express();
const port = process.env.PORT || 3000;

// CORS middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
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
import path from "path";
app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

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
app.use("/api/audit", auditRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/sync", syncRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/accounting", accountingRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/locations", locationRoutes);

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
    console.log(`Pharmacy Management SaaS API listening on port ${port}`);
    await seedSuperAdmin();
    SubscriptionExpiryService.initAutomatedScheduler();
  });
}

// Trigger backend restart for Prisma Client update

export default app;