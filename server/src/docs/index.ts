import { Express, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import { baseSwaggerConfig } from "./swagger.config";

import { authSwagger } from "./modules/auth.swagger";
import { superAdminSwagger } from "./modules/super-admin.swagger";
import { subscriptionSwagger } from "./modules/subscription.swagger";
import { paymentSwagger } from "./modules/payment.swagger";
import { tenantSwagger } from "./modules/tenant.swagger";
import { branchSwagger } from "./modules/branch.swagger";
import { userSwagger } from "./modules/user.swagger";
import { productSwagger } from "./modules/product.swagger";
import { inventorySwagger } from "./modules/inventory.swagger";
import { transferSwagger } from "./modules/transfer.swagger";
import { salesSwagger } from "./modules/sales.swagger";
import { reportSwagger } from "./modules/report.swagger";
import { auditSwagger } from "./modules/audit.swagger";
import { notificationSwagger } from "./modules/notification.swagger";
import { syncSwagger } from "./modules/sync.swagger";
import { settingsSwagger } from "./modules/settings.swagger";
import { uploadSwagger } from "./modules/upload.swagger";
import { supplierSwagger } from "./modules/supplier.swagger";
import { accountingSwagger } from "./modules/accounting.swagger";
import { attendanceSwagger } from "./modules/attendance.swagger";
import { locationSwagger } from "./modules/location.swagger";
import { rootSwagger } from "./modules/root.swagger";

// Assemble all paths
const mergedPaths = {
  ...rootSwagger.paths,
  ...authSwagger.paths,
  ...superAdminSwagger.paths,
  ...subscriptionSwagger.paths,
  ...paymentSwagger.paths,
  ...tenantSwagger.paths,
  ...branchSwagger.paths,
  ...userSwagger.paths,
  ...productSwagger.paths,
  ...inventorySwagger.paths,
  ...transferSwagger.paths,
  ...salesSwagger.paths,
  ...reportSwagger.paths,
  ...auditSwagger.paths,
  ...notificationSwagger.paths,
  ...syncSwagger.paths,
  ...settingsSwagger.paths,
  ...uploadSwagger.paths,
  ...supplierSwagger.paths,
  ...accountingSwagger.paths,
  ...attendanceSwagger.paths,
  ...locationSwagger.paths,
};

// Assemble all schemas
const mergedSchemas = {
  ...baseSwaggerConfig.components.schemas,
  ...authSwagger.schemas,
  ...superAdminSwagger.schemas,
  ...subscriptionSwagger.schemas,
  ...paymentSwagger.schemas,
  ...tenantSwagger.schemas,
  ...branchSwagger.schemas,
  ...userSwagger.schemas,
  ...productSwagger.schemas,
  ...inventorySwagger.schemas,
  ...transferSwagger.schemas,
  ...salesSwagger.schemas,
  ...syncSwagger.schemas,
  ...settingsSwagger.schemas,
  ...supplierSwagger.schemas,
  ...accountingSwagger.schemas,
  ...attendanceSwagger.schemas,
  ...locationSwagger.schemas,
};

export const swaggerSpec = {
  ...baseSwaggerConfig,
  paths: mergedPaths,
  components: {
    ...baseSwaggerConfig.components,
    schemas: mergedSchemas,
  },
};

export const swaggerUiOptions: swaggerUi.SwaggerUiOptions = {
  explorer: true,
  customSiteTitle: "PharmaBiz API Documentation & Testing Sandbox",
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    docExpansion: "none",
    tagsSorter: "alpha",
    operationsSorter: "alpha",
    tryItOutEnabled: true,
  },
  customCss: `
    .swagger-ui .topbar { background-color: #0f172a; padding: 12px 0; border-bottom: 2px solid #10b981; }
    .swagger-ui .topbar .topbar-wrapper a { font-weight: 700; color: #fff; font-size: 1.1rem; }
    .swagger-ui .topbar .topbar-wrapper a span { color: #10b981; }
    .swagger-ui .info .title { color: #0f172a; font-size: 2.2rem; }
    .swagger-ui .btn.authorize { background-color: #059669; color: #fff; border-color: #059669; font-weight: 600; }
    .swagger-ui .btn.authorize svg { fill: #fff; }
    .swagger-ui .opblock.opblock-post { border-color: #10b981; background: rgba(16, 185, 129, 0.05); }
    .swagger-ui .opblock.opblock-get { border-color: #3b82f6; background: rgba(59, 130, 246, 0.05); }
    .swagger-ui .opblock.opblock-patch { border-color: #f59e0b; background: rgba(245, 158, 11, 0.05); }
    .swagger-ui .opblock.opblock-delete { border-color: #ef4444; background: rgba(239, 68, 68, 0.05); }
  `,
};

export function setupSwagger(app: Express): void {
  // Raw OpenAPI specification JSON endpoint for Postman/Insomnia imports
  app.get("/api-docs.json", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  // Interactive Swagger UI
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, swaggerUiOptions)
  );

  console.log("📘 Swagger UI interactive docs mounted at /api-docs and spec at /api-docs.json");
}
