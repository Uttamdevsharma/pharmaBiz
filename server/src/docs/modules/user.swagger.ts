export const userSwagger = {
  paths: {
    "/api/users": {
      get: {
        tags: ["Users & Roles"],
        summary: "List pharmacy staff members",
        description: "Returns paginated staff users under the tenant with role, branch, and active status filters.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
          { name: "search", in: "query", schema: { type: "string" }, description: "Search by name, email, or username" },
          { name: "role", in: "query", schema: { type: "string" } },
          { name: "branchId", in: "query", schema: { type: "string" }, description: "Filter staff by specific branch UUID" },
          { name: "isActive", in: "query", schema: { type: "boolean" } },
        ],
        responses: {
          200: { description: "List of staff members" },
        },
      },
      post: {
        tags: ["Users & Roles"],
        summary: "Create a new staff user",
        description: "Checks plan staff quota and registers a new cashier, manager, auditor, or executive.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateStaffDto" },
              example: {
                name: "Kamal Hossain",
                username: "kamal_cashier",
                email: "kamal@greencare.com",
                phone: "01855443322",
                password: "StaffPass123!",
                role: "CASHIER",
                branchId: "b3f0e75a-4cb7-4c31-b0db-6e6ad95ff091",
              },
            },
          },
        },
        responses: {
          201: { description: "Staff created successfully" },
          403: { description: "Staff limit reached or insufficient permissions" },
        },
      },
    },
    "/api/users/{id}": {
      get: {
        tags: ["Users & Roles"],
        summary: "Get staff user details",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Staff details" } },
      },
      patch: {
        tags: ["Users & Roles"],
        summary: "Update staff member profile & assignment",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateStaffDto" },
              example: {
                name: "Kamal Hossain Senior",
                phone: "01855443399",
                role: "BRANCH_MANAGER",
              },
            },
          },
        },
        responses: { 200: { description: "Staff updated" } },
      },
      delete: {
        tags: ["Users & Roles"],
        summary: "Delete staff user",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Staff deleted" } },
      },
    },
    "/api/users/{id}/status": {
      patch: {
        tags: ["Users & Roles"],
        summary: "Toggle staff active/inactive status",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Status updated" } },
      },
    },
    "/api/users/change-password": {
      post: {
        tags: ["Users & Roles"],
        summary: "Change own account password",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ChangePasswordDto" },
              example: {
                currentPassword: "OldPassword123!",
                newPassword: "NewSecretPassword123!",
              },
            },
          },
        },
        responses: { 200: { description: "Password updated successfully" } },
      },
    },
    "/api/users/profile": {
      patch: {
        tags: ["Users & Roles"],
        summary: "Update own user profile",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateUserProfileDto" },
              example: {
                name: "Kamal Hossain",
                phone: "01855443322",
              },
            },
          },
        },
        responses: { 200: { description: "Profile updated" } },
      },
    },
    "/api/users/roles": {
      get: {
        tags: ["Users & Roles"],
        summary: "List dynamic pharmacy custom roles",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "List of roles" } },
      },
      post: {
        tags: ["Users & Roles"],
        summary: "Create custom pharmacy role with permissions",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreatePharmacyRoleDto" },
              example: {
                name: "Senior Pharmacist",
                description: "Prescription verification and inventory adjustments",
                permissions: ["inventory.manage", "pos.manage", "reports.view"],
              },
            },
          },
        },
        responses: { 201: { description: "Role created" } },
      },
    },
    "/api/users/roles/{id}": {
      patch: {
        tags: ["Users & Roles"],
        summary: "Update custom pharmacy role",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreatePharmacyRoleDto" },
            },
          },
        },
        responses: { 200: { description: "Role updated" } },
      },
      delete: {
        tags: ["Users & Roles"],
        summary: "Delete custom role",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Role deleted" } },
      },
    },
    "/api/users/roles/matrix": {
      post: {
        tags: ["Users & Roles"],
        summary: "Batch update pharmacy role permissions matrix",
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
        responses: { 200: { description: "Matrix updated" } },
      },
    },
    "/api/users/roles/permissions": {
      get: {
        tags: ["Users & Roles"],
        summary: "Get RBAC permissions catalog & hierarchy",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Available permissions list" } },
      },
      post: {
        tags: ["Users & Roles"],
        summary: "Update role permissions mapping",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  role: { type: "string", example: "CASHIER" },
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
    CreateStaffDto: {
      type: "object",
      required: ["password", "role"],
      properties: {
        username: { type: "string", minLength: 3, example: "kamal_cashier" },
        name: { type: "string", minLength: 2, example: "Kamal Hossain" },
        email: { type: "string", format: "email", example: "kamal@greencare.com" },
        phone: { type: "string", example: "01855443322" },
        password: { type: "string", format: "password", minLength: 6, example: "StaffPass123!" },
        role: { type: "string", example: "CASHIER" },
        branchId: { type: "string", format: "uuid", nullable: true, example: "b3f0e75a-4cb7-4c31-b0db-6e6ad95ff091" },
      },
    },
    UpdateStaffDto: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string", format: "email" },
        phone: { type: "string" },
        role: { type: "string" },
        branchId: { type: "string", format: "uuid", nullable: true },
        password: { type: "string", format: "password" },
        isActive: { type: "boolean" },
      },
    },
    ChangePasswordDto: {
      type: "object",
      required: ["currentPassword", "newPassword"],
      properties: {
        currentPassword: { type: "string", format: "password", example: "OldPassword123!" },
        newPassword: { type: "string", format: "password", minLength: 6, example: "NewPassword123!" },
      },
    },
    UpdateUserProfileDto: {
      type: "object",
      properties: {
        name: { type: "string", example: "Kamal Hossain" },
        phone: { type: "string", example: "01855443322" },
        email: { type: "string", format: "email" },
        avatarUrl: { type: "string", format: "uri" },
      },
    },
    CreatePharmacyRoleDto: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", example: "Senior Pharmacist" },
        description: { type: "string", example: "Prescription verification and inventory adjustments" },
        permissions: {
          type: "array",
          items: { type: "string" },
          example: ["inventory.manage", "pos.manage", "reports.view"],
        },
        isActive: { type: "boolean", default: true },
      },
    },
  },
};
