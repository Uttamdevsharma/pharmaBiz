export const superAdminSwagger = {
  paths: {
    "/api/super-admin/plans": {
      get: {
        tags: ["Super Admin"],
        summary: "List all subscription plans",
        description: "Returns all SaaS subscription plans including inactive and tier metadata.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "List of subscription plans" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - Requires plans.manage permission" },
        },
      },
      post: {
        tags: ["Super Admin"],
        summary: "Create a subscription plan",
        description: "Creates a new SaaS billing plan with branch and staff quotas.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreatePlanDto" },
              example: {
                name: "Growth Multi-Branch",
                tier: "GROWTH",
                price: 4999,
                billingCycle: "MONTHLY",
                maxBranches: 5,
                maxStaffPerBranch: 10,
                maxTotalStaff: 50,
                trialDays: 14,
                features: { pos: true, accounting: true, interBranchTransfers: true },
                isActive: true,
              },
            },
          },
        },
        responses: {
          201: { description: "Plan created successfully" },
          400: { description: "Validation error" },
        },
      },
    },
    "/api/super-admin/plans/{id}": {
      get: {
        tags: ["Super Admin"],
        summary: "Get plan details by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Plan UUID" },
        ],
        responses: {
          200: { description: "Plan details" },
          404: { description: "Plan not found" },
        },
      },
      patch: {
        tags: ["Super Admin"],
        summary: "Update subscription plan",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Plan UUID" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdatePlanDto" },
              example: {
                price: 5499,
                maxBranches: 6,
              },
            },
          },
        },
        responses: {
          200: { description: "Plan updated successfully" },
          404: { description: "Plan not found" },
        },
      },
      delete: {
        tags: ["Super Admin"],
        summary: "Delete subscription plan",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Plan UUID" },
        ],
        responses: {
          200: { description: "Plan removed" },
          400: { description: "Cannot delete plan with active subscribers" },
        },
      },
    },
    "/api/super-admin/tenants": {
      get: {
        tags: ["Super Admin"],
        summary: "List all pharmacy tenants",
        description: "Returns paginated list of pharmacies, active subscriptions, branches count, and verification stages.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 }, description: "Page number" },
          { name: "limit", in: "query", schema: { type: "integer", default: 100 }, description: "Page limit" },
          { name: "search", in: "query", schema: { type: "string" }, description: "Search by pharmacy name, email, or owner name" },
          { name: "tier", in: "query", schema: { type: "string", enum: ["TRIAL", "STARTER", "GROWTH", "ENTERPRISE"] } },
          { name: "isActive", in: "query", schema: { type: "boolean" }, description: "Filter active or suspended tenants" },
          { name: "subscriptionStatus", in: "query", schema: { type: "string", enum: ["ACTIVE", "PENDING", "EXPIRED", "CANCELLED"] } },
        ],
        responses: {
          200: { description: "Paginated list of tenants" },
        },
      },
    },
    "/api/super-admin/tenants/{id}": {
      get: {
        tags: ["Super Admin"],
        summary: "Get tenant full profile & branches",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Tenant UUID" },
        ],
        responses: {
          200: { description: "Tenant full profile details" },
          404: { description: "Tenant not found" },
        },
      },
    },
    "/api/super-admin/tenants/{id}/subscription": {
      get: {
        tags: ["Super Admin"],
        summary: "Get tenant subscription details",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Tenant UUID" },
        ],
        responses: {
          200: { description: "Tenant subscription and billing status" },
        },
      },
    },
    "/api/super-admin/tenants/{id}/status": {
      patch: {
        tags: ["Super Admin"],
        summary: "Suspend or reactivate a tenant pharmacy",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Tenant UUID" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateTenantStatusDto" },
              example: {
                isActive: false,
                reason: "Pending compliance verification",
              },
            },
          },
        },
        responses: {
          200: { description: "Tenant status updated" },
        },
      },
    },
    "/api/super-admin/verifications": {
      get: {
        tags: ["Super Admin"],
        summary: "List pharmacy verification requests",
        description: "Returns pharmacies waiting for license and NID document verification.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "List of pending and reviewed verifications" },
        },
      },
    },
    "/api/super-admin/verifications/{id}": {
      get: {
        tags: ["Super Admin"],
        summary: "Get verification document details for a pharmacy",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Verification or Tenant ID" },
        ],
        responses: {
          200: { description: "Document verification details" },
        },
      },
    },
    "/api/super-admin/verifications/{id}/approve": {
      post: {
        tags: ["Super Admin"],
        summary: "Approve pharmacy verification",
        description: "Changes status to APPROVED_PENDING_PAYMENT, enabling the owner to choose plan and pay.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Verification or Tenant ID" },
        ],
        responses: {
          200: { description: "Pharmacy approved successfully" },
        },
      },
    },
    "/api/super-admin/verifications/{id}/reject": {
      post: {
        tags: ["Super Admin"],
        summary: "Reject pharmacy verification",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Verification or Tenant ID" },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  reason: { type: "string", example: "Drug license document is expired or blurry." },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Verification rejected" },
        },
      },
    },
    "/api/super-admin/subscriptions": {
      get: {
        tags: ["Super Admin"],
        summary: "List all tenant subscriptions across platform",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "All subscriptions" },
        },
      },
    },
    "/api/super-admin/payments": {
      get: {
        tags: ["Super Admin"],
        summary: "List all platform gateway payment transactions",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "List of payment transactions" },
        },
      },
    },
    "/api/super-admin/analytics": {
      get: {
        tags: ["Super Admin"],
        summary: "Platform-wide SaaS analytics & MRR",
        description: "Returns total pharmacies, active branches, MRR, churn rate, and system health.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Platform analytics metrics" },
        },
      },
    },
    "/api/super-admin/roles": {
      get: {
        tags: ["Super Admin"],
        summary: "List platform roles and permissions",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "List of platform roles" } },
      },
      post: {
        tags: ["Super Admin"],
        summary: "Create a platform role",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreatePlatformRoleDto" },
              example: {
                name: "PLATFORM_SUPPORT",
                description: "Customer support delegate with read-only rights",
                permissions: ["pharmacies.manage", "reports.view"],
                isActive: true,
              },
            },
          },
        },
        responses: { 201: { description: "Role created successfully" } },
      },
    },
    "/api/super-admin/roles/matrix": {
      post: {
        tags: ["Super Admin"],
        summary: "Batch update platform role permissions matrix",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  matrix: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        roleId: { type: "string" },
                        permissions: { type: "array", items: { type: "string" } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Matrix updated successfully" } },
      },
    },
    "/api/super-admin/roles/{id}": {
      patch: {
        tags: ["Super Admin"],
        summary: "Update platform role",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreatePlatformRoleDto" },
            },
          },
        },
        responses: { 200: { description: "Role updated" } },
      },
      delete: {
        tags: ["Super Admin"],
        summary: "Delete platform role",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Role deleted" } },
      },
    },
    "/api/super-admin/staff": {
      get: {
        tags: ["Super Admin"],
        summary: "List platform staff users",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Platform staff list" } },
      },
      post: {
        tags: ["Super Admin"],
        summary: "Create platform staff user",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreatePlatformStaffDto" },
              example: {
                name: "Tariqul Hasan",
                email: "tariq@pharmabiz.internal",
                username: "tariq_support",
                password: "StaffPassword123!",
                role: "PROJECT_MANAGER",
                permissions: ["pharmacies.manage", "reports.view"],
              },
            },
          },
        },
        responses: { 201: { description: "Staff created" } },
      },
    },
    "/api/super-admin/staff/{id}": {
      patch: {
        tags: ["Super Admin"],
        summary: "Update platform staff user",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdatePlatformStaffDto" },
            },
          },
        },
        responses: { 200: { description: "Staff updated" } },
      },
      delete: {
        tags: ["Super Admin"],
        summary: "Delete platform staff user",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Staff deleted" } },
      },
    },
    "/api/super-admin/staff/{id}/status": {
      patch: {
        tags: ["Super Admin"],
        summary: "Toggle platform staff active status",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Staff status toggled" } },
      },
    },
    "/api/super-admin/staff/permissions": {
      get: {
        tags: ["Super Admin"],
        summary: "Get platform permissions metadata & hierarchy",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Platform permissions list" } },
      },
      post: {
        tags: ["Super Admin"],
        summary: "Update platform role permissions",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  role: { type: "string", example: "CTO" },
                  permissions: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Permissions updated" } },
      },
    },
  },
  schemas: {
    CreatePlanDto: {
      type: "object",
      required: ["name", "tier", "price", "maxBranches"],
      properties: {
        name: { type: "string", example: "Growth Multi-Branch" },
        tier: { type: "string", enum: ["TRIAL", "STARTER", "GROWTH", "ENTERPRISE"] },
        price: { type: "number", minimum: 0, example: 4999 },
        billingCycle: { type: "string", enum: ["MONTHLY", "YEARLY"], default: "MONTHLY" },
        maxBranches: { type: "integer", minimum: 1, example: 5 },
        maxStaffPerBranch: { type: "integer", minimum: 1, example: 10 },
        maxTotalStaff: { type: "integer", minimum: 1, example: 50 },
        trialDays: { type: "integer", example: 14 },
        features: { type: "object", additionalProperties: true },
        isActive: { type: "boolean", default: true },
      },
    },
    UpdatePlanDto: {
      type: "object",
      properties: {
        name: { type: "string" },
        price: { type: "number" },
        billingCycle: { type: "string", enum: ["MONTHLY", "YEARLY"] },
        maxBranches: { type: "integer" },
        maxStaffPerBranch: { type: "integer" },
        maxTotalStaff: { type: "integer" },
        trialDays: { type: "integer" },
        features: { type: "object", additionalProperties: true },
        isActive: { type: "boolean" },
      },
    },
    UpdateTenantStatusDto: {
      type: "object",
      required: ["isActive"],
      properties: {
        isActive: { type: "boolean", example: false },
        reason: { type: "string", example: "Subscription overdue" },
      },
    },
    CreatePlatformRoleDto: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", example: "PLATFORM_AUDITOR" },
        description: { type: "string", example: "Audits platform compliance" },
        permissions: { type: "array", items: { type: "string" } },
        isActive: { type: "boolean", default: true },
      },
    },
    CreatePlatformStaffDto: {
      type: "object",
      required: ["name", "email", "password", "role"],
      properties: {
        name: { type: "string", example: "Tariqul Hasan" },
        email: { type: "string", format: "email", example: "tariq@pharmabiz.internal" },
        username: { type: "string", example: "tariq_admin" },
        phone: { type: "string", example: "01812345678" },
        password: { type: "string", format: "password", example: "Pass123!" },
        role: { type: "string", example: "PROJECT_MANAGER" },
        permissions: { type: "array", items: { type: "string" } },
      },
    },
    UpdatePlatformStaffDto: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string", format: "email" },
        phone: { type: "string" },
        password: { type: "string", format: "password" },
        role: { type: "string" },
        permissions: { type: "array", items: { type: "string" } },
        isActive: { type: "boolean" },
      },
    },
  },
};
