export const baseSwaggerConfig = {
  openapi: "3.0.3",
  info: {
    title: "PharmaBiz - Enterprise Multi-Tenant SaaS Pharmacy Management API",
    version: "1.0.0",
    description: `
## Overview
PharmaBiz is an enterprise-grade, multi-tenant pharmacy SaaS platform engineered for multi-branch retail & wholesale pharmaceutical chains.

### Core Features
- **Multi-Tenancy & RBAC**: Tenant isolation with granular role-based permissions (Super Admin, Company Owner, Branch Manager, Cashier, Auditor, etc.)
- **Multi-Branch Control**: Centralized management with branch context switching via \`x-branch-id\` header.
- **Inventory & FEFO Batches**: First-Expiry-First-Out batch tracking, barcode scanning, stock inwarding, stock adjustments, and shelf/rack location management.
- **POS & Billing**: High-speed offline-tolerant point of sale, receipts, returns, and refunds.
- **Inter-Branch Stock Transfers**: Formal transfer requisition, dispatch, discrepancy tracking, and branch-to-branch settlement.
- **Comprehensive Accounting & Payroll**: Chart of accounts, daily register, recurring overheads, payroll disbursement, and salary deduction rules.
- **Payments**: SSLCommerz & Stripe gateway integration, subscription billing, and IPN webhooks.
- **Bangladesh Localization**: Ready-to-use Divisions, Districts, Upazilas, and Union-level geo hierarchies.

### Authentication
Protected endpoints require a standard JSON Web Token passed in the \`Authorization\` header:
\`\`\`http
Authorization: Bearer <your-jwt-token>
\`\`\`
Use the **Authorize** button on the top right to authenticate your Swagger session.
    `,
    contact: {
      name: "PharmaBiz Engineering & API Support",
      email: "support@pharmabiz.com",
    },
    license: {
      name: "Proprietary",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local Development Server",
    },
    {
      url: "/",
      description: "Current Host / Serverless Domain",
    },
  ],
  tags: [
    { name: "Authentication", description: "Login, Registration, OTP Verification, and User Session" },
    { name: "Super Admin", description: "Platform Administration, Plans, Pharmacy Approvals, and System Analytics" },
    { name: "Subscriptions", description: "SaaS Subscription Plans, Upgrades, Renewals, and Invoices" },
    { name: "Payments", description: "Payment Gateway Checkouts, Status Validation, IPN, and Webhooks" },
    { name: "Tenant", description: "Tenant Profile, Quotas, Limits, and Organization Info" },
    { name: "Branches", description: "Pharmacy Branch Creation, Configuration, and Listing" },
    { name: "Users & Roles", description: "Staff Management, Custom Pharmacy Roles, and RBAC Permissions" },
    { name: "Products & Catalog", description: "Medicines, Generics, Brands, Categories, Units, and Pricing" },
    { name: "Inventory & Batches", description: "Stock Batches, FEFO Allocation, Expiry Alerts, and Low Stock" },
    { name: "Stock Transfers", description: "Inter-Branch Stock Requests, Dispatch, Receiving, and Settlement" },
    { name: "Sales & POS", description: "Point of Sale Transactions, Invoices, Customer Tracking, and Refunds" },
    { name: "Reports & Analytics", description: "Daily/Weekly/Monthly Sales, Branch Reports, VAT MIS, and Dashboard" },
    { name: "Audit Logs", description: "System Audit Trail, Operational Activity, and Security Logs" },
    { name: "Notifications", description: "Stock Alerts, Expiry Warnings, System Announcements, and Sync Logs" },
    { name: "Offline Sync", description: "Offline POS Sync, Batch Uploads, and Conflict Resolution" },
    { name: "Settings", description: "Global Platform Settings, Tenant VAT Rates, and Receipt Configuration" },
    { name: "Uploads", description: "Document and Image Upload to Cloudinary / Local Storage" },
    { name: "Suppliers & Purchases", description: "Supplier Directory, Purchase Orders, Ledger, and Dues Settle" },
    { name: "Accounting & Payroll", description: "Chart of Accounts, Ledger, Expenses, and Staff Salary Disbursement" },
    { name: "Attendance & HR", description: "Employee Shifts, Daily Attendance, Leaves, and Salary Deductions" },
    { name: "Location & Rack Management", description: "Racks, Shelves, Bins, and Bangladesh Geographic Divisions" },
    { name: "Root & Health", description: "API Health Check and Public Payment Callbacks" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Standard JWT Bearer Token. Format: Bearer <token>",
      },
      branchHeader: {
        type: "apiKey",
        in: "header",
        name: "x-branch-id",
        description: "Pharmacy Branch ID (UUID) to scope the request to a specific branch.",
      },
    },
    schemas: {
      ApiResponseSuccess: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Operation completed successfully" },
          data: { type: "object" },
        },
      },
      ApiResponseError: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Detailed error message" },
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: { type: "string", example: "email" },
                message: { type: "string", example: "Invalid email format" },
              },
            },
          },
        },
      },
    },
  },
};
