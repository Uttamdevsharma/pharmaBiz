import bcrypt from "bcryptjs";
import { prisma } from "../../app/lib/prisma";
import { AuditService } from "../../app/lib/audit";
import {
  CreateUserInput,
  UpdateUserInput,
  ListUsersQuery,
  CreatePharmacyRoleInput,
  UpdatePharmacyRoleInput,
  ChangePasswordInput,
  UpdateProfileInput,
} from "./user.validation";
import { checkCanAddStaff } from "../../app/lib/planLimits";

export const ALL_PHARMACY_PERMISSIONS = [
  // 1. Dashboard
  {
    id: "dashboard.view",
    name: "View Dashboard",
    category: "Dashboard",
    description: "Access main dashboard metrics, financial KPI summaries, and branch status.",
  },

  // 2. Sales & POS
  {
    id: "pos.manage",
    name: "Sales / POS",
    category: "Sales & POS",
    description: "Process live checkout, scan barcodes, dispense medicines, and generate customer invoices.",
  },
  {
    id: "pos.history",
    name: "Sales History",
    category: "Sales & POS",
    description: "Inspect customer receipts, transaction history, invoice details, and register sales.",
  },
  {
    id: "accounts.payment_sales",
    name: "Payment Method Sales",
    category: "Sales & POS",
    description: "Analyze revenue breakdowns by cash, card, mobile banking, and digital payment methods.",
  },
  {
    id: "accounts.product_sales",
    name: "Product-Wise Sales",
    category: "Sales & POS",
    description: "Inspect sales velocity, units sold, and revenue contributions by items and categories.",
  },
  {
    id: "accounts.reports",
    name: "Sales Reports",
    category: "Sales & POS",
    description: "Generate sales reports, profit/loss summaries, and financial performance analytics.",
  },
  {
    id: "pos.vat",
    name: "VAT Settings",
    category: "Sales & POS",
    description: "Configure tax rules, branch VAT percentages, and receipt print options.",
  },

  // 3. Category Management
  {
    id: "category.manage",
    name: "Manage Categories",
    category: "Category Management",
    description: "Create, view, update, and manage product categories.",
  },
  {
    id: "category.subcategories",
    name: "Manage Subcategories",
    category: "Category Management",
    description: "Create, update, and manage subcategories and product classifications.",
  },

  // 4. Inventory
  {
    id: "inventory.add_product",
    name: "Add Product",
    category: "Inventory",
    description: "Register new products, dosage forms, manufacturers, and initial catalog entries.",
  },
  {
    id: "inventory.product_list",
    name: "Product List",
    category: "Inventory",
    description: "Browse, search, edit product details, update prices, and view catalog status.",
  },

  // 5. Stock Management
  {
    id: "stock.add_stock",
    name: "Add Stock",
    category: "Stock Management",
    description: "Record inward stock shipments, batch numbers, expiry dates, and purchase costs.",
  },
  {
    id: "stock.stock_list",
    name: "Stock List",
    category: "Stock Management",
    description: "Inspect branch inventory stock levels, low-stock warnings, and expiring batches.",
  },
  {
    id: "stock.stock_history",
    name: "Stock History",
    category: "Stock Management",
    description: "Review audit ledger of stock movements, batch arrivals, sales deductions, and adjustments.",
  },
  {
    id: "stock.allocation",
    name: "Stock Allocation",
    category: "Stock Management",
    description: "Allocate inventory items and batches to physical racks, shelves, and storage bins.",
  },
  {
    id: "stock.allocation_history",
    name: "Allocation History",
    category: "Stock Management",
    description: "Track physical allocation history, bin movements, and rack placement records.",
  },
  {
    id: "stock.transfer",
    name: "Transfer Stock",
    category: "Stock Management",
    description: "Initiate and dispatch stock transfers from this branch to other branch locations.",
  },
  {
    id: "stock.transfer_history",
    name: "Transfer History",
    category: "Stock Management",
    description: "Track dispatch records, in-transit status, and inter-branch transfer logs.",
  },
  {
    id: "stock.receive",
    name: "Stock Receive",
    category: "Stock Management",
    description: "Inspect and accept incoming inter-branch shipments and record damaged/missing counts.",
  },
  {
    id: "stock.damaged",
    name: "Damaged Products",
    category: "Stock Management",
    description: "Review transit damaged reports, quarantine damaged stock, and dispose of expired items.",
  },

  // 6. Location Management
  {
    id: "location.create_rack",
    name: "Create Rack",
    category: "Location Management",
    description: "Set up and configure warehouse racks, shelves, and storage bin identifiers.",
  },
  {
    id: "location.rack_list",
    name: "Rack List",
    category: "Location Management",
    description: "Browse branch storage layouts, inspect bin contents, and manage location capacities.",
  },

  // 7. Supplier Management
  {
    id: "supplier.view",
    name: "Suppliers",
    category: "Supplier Management",
    description: "Browse supplier directories, company profiles, and supply partner contacts.",
  },
  {
    id: "supplier.manage",
    name: "Create / Manage Supplier",
    category: "Supplier Management",
    description: "Add new suppliers, edit vendor terms, and manage supplier profiles.",
  },
  {
    id: "supplier.purchase_history",
    name: "Purchase History",
    category: "Supplier Management",
    description: "Review supplier purchase orders, invoice amounts, batch receipts, and dates.",
  },
  {
    id: "supplier.payments_due",
    name: "Payments / Due",
    category: "Supplier Management",
    description: "Track unpaid vendor balances, record purchase dues, and settle supplier invoices.",
  },
  {
    id: "supplier.contacts",
    name: "Supplier & Contact Management",
    category: "Supplier Management",
    description: "Manage sales reps, medical representatives, and vendor contact persons.",
  },

  // 8. Accounts & Finance
  {
    id: "accounts.overview",
    name: "Overview",
    category: "Accounts & Finance",
    description: "View branch financial overview, total cash in hand, receivables, and payables.",
  },
  {
    id: "accounts.financial_accounts",
    name: "Financial Accounts",
    category: "Accounts & Finance",
    description: "Create and manage cash registers, petty cash, bank accounts, and mobile wallets.",
  },
  {
    id: "accounts.fund_transfer",
    name: "Fund Transfer",
    category: "Accounts & Finance",
    description: "Execute internal double-entry fund transfers between pharmacy accounts with audit logs.",
  },
  {
    id: "accounts.supplier_due",
    name: "Supplier Payments / Due",
    category: "Accounts & Finance",
    description: "Financial settlement and disbursement of supplier dues and vendor payables.",
  },
  {
    id: "accounts.transaction_history",
    name: "Transaction History",
    category: "Accounts & Finance",
    description: "Inspect the complete financial ledger, credits, debits, and balance statements.",
  },

  // 9. Expenses & Bills
  {
    id: "expenses.list",
    name: "Bill List",
    category: "Expenses & Bills",
    description: "Manage recurring bills (Rent, Electricity, Internet, Maintenance) and billing schedules.",
  },
  {
    id: "expenses.pay",
    name: "Pay Bill",
    category: "Expenses & Bills",
    description: "Record and disburse branch expense payments directly from selected financial accounts.",
  },
  {
    id: "expenses.history",
    name: "Bill History",
    category: "Expenses & Bills",
    description: "Review monthly expense breakdown logs, payment vouchers, and utility bills.",
  },

  // 10. Employee & Salary
  {
    id: "employee.view",
    name: "Employee List",
    category: "Employee & Salary",
    description: "View branch employee roster, contact info, join dates, and employment statuses.",
  },
  {
    id: "attendance.manage",
    name: "Attendance Management",
    category: "Employee & Salary",
    description: "Record daily staff attendance (Present, Absent, Late, Half Day) and monthly summaries.",
  },
  {
    id: "attendance.offdays",
    name: "Off-Day Settings",
    category: "Employee & Salary",
    description: "Configure weekly off-days, monthly holiday calendars, and branch working days.",
  },
  {
    id: "salary.deductions",
    name: "Salary Deduction Rules",
    category: "Employee & Salary",
    description: "Configure rules for late penalties, unexcused absence deductions, and salary cut policies.",
  },
  {
    id: "salary.manage",
    name: "Salary Management",
    category: "Employee & Salary",
    description: "Calculate monthly payroll, manage dynamic allowances, and disburse staff salaries.",
  },
  {
    id: "salary.history",
    name: "Salary History",
    category: "Employee & Salary",
    description: "Review monthly payroll disbursement archives, pay slips, and staff compensation logs.",
  },
  {
    id: "salaries.base_salary.edit",
    name: "Configure Base Salary",
    category: "Employee & Salary",
    description: "Set and update employee Base Salary packages and contractual compensation.",
  },

  // 11. Staff Management
  {
    id: "staff.view",
    name: "Staff List",
    category: "Staff Management",
    description: "View pharmacy staff accounts, active statuses, and assigned operational roles.",
  },
  {
    id: "staff.create",
    name: "Create Staff",
    category: "Staff Management",
    description: "Create new pharmacy staff credentials, assign branch, and configure access roles.",
  },
  {
    id: "roles.manage",
    name: "Roles & Permissions",
    category: "Staff Management",
    description: "Create custom roles, edit role permissions, and customize operational staff privileges.",
  },

  // 12. Branch Network & Settings
  {
    id: "branches.manage",
    name: "Branch Network",
    category: "Branch Network & Settings",
    description: "View and configure branch network locations, contact information, and branch settings.",
  },
  {
    id: "settings.manage",
    name: "Pharmacy Settings & Profile",
    category: "Branch Network & Settings",
    description: "Update pharmacy business profile, company information, and organizational preferences.",
  },
];

export const DEFAULT_PHARMACY_ROLES: any[] = [];

export class UserService {
  /**
   * Ensure default pharmacy roles are seeded for a tenant
   */
  static async ensureDefaultRoles(tenantId: string) {
    const existing = await (prisma as any).pharmacyRole.findMany({
      where: { tenantId },
    });

    if (existing.length === 0) {
      for (const def of DEFAULT_PHARMACY_ROLES) {
        await (prisma as any).pharmacyRole.create({
          data: {
            tenantId,
            name: def.name,
            description: def.description,
            permissions: def.permissions,
            isSystem: def.isSystem,
          },
        });
      }
    }
  }

  /**
   * ==================== PHARMACY ROLE CRUD ====================
   */
  static async listPharmacyRoles(tenantId: string) {
    await this.ensureDefaultRoles(tenantId);

    const roles = await (prisma as any).pharmacyRole.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    return roles.map((r: any) => ({
      id: r.id,
      tenantId: r.tenantId,
      name: r.name,
      description: r.description,
      permissions: r.permissions || [],
      isSystem: r.isSystem,
      isActive: r.isActive ?? true,
      userCount: r._count?.users || 0,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  static async createPharmacyRole(tenantId: string, userId: string, data: CreatePharmacyRoleInput) {
    const nameTrimmed = data.name.trim();

    if (nameTrimmed.toUpperCase() === "COMPANY_OWNER" || nameTrimmed.toUpperCase() === "SUPER_ADMIN") {
      throw new Error("Cannot create role with reserved system name.");
    }

    const existing = await (prisma as any).pharmacyRole.findFirst({
      where: {
        tenantId,
        name: { equals: nameTrimmed, mode: "insensitive" },
      },
    });

    if (existing) {
      throw new Error(`A role named "${nameTrimmed}" already exists in your pharmacy.`);
    }

    const role = await (prisma as any).pharmacyRole.create({
      data: {
        tenantId,
        name: nameTrimmed,
        description: data.description?.trim() || null,
        permissions: data.permissions || [],
        isSystem: false,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    await AuditService.log({
      tenantId,
      userId,
      action: "PHARMACY_ROLE_CREATE",
      details: { roleId: role.id, name: role.name, permissionsCount: role.permissions.length },
    });

    return role;
  }

  static async updatePharmacyRole(tenantId: string, roleId: string, userId: string, data: UpdatePharmacyRoleInput) {
    const role = await (prisma as any).pharmacyRole.findFirst({
      where: { id: roleId, tenantId },
    });

    if (!role) {
      throw new Error("Pharmacy role not found");
    }

    const updateData: any = {};

    if (data.name) {
      const nameTrimmed = data.name.trim();
      if (nameTrimmed.toUpperCase() === "COMPANY_OWNER" || nameTrimmed.toUpperCase() === "SUPER_ADMIN") {
        throw new Error("Cannot rename role to reserved system name.");
      }

      const duplicate = await (prisma as any).pharmacyRole.findFirst({
        where: {
          tenantId,
          name: { equals: nameTrimmed, mode: "insensitive" },
          id: { not: roleId },
        },
      });

      if (duplicate) {
        throw new Error(`A role named "${nameTrimmed}" already exists in your pharmacy.`);
      }

      updateData.name = nameTrimmed;
    }

    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null;
    }

    if (data.permissions !== undefined) {
      updateData.permissions = data.permissions;
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    const updated = await (prisma as any).pharmacyRole.update({
      where: { id: roleId },
      data: updateData,
    });

    await AuditService.log({
      tenantId,
      userId,
      action: "PHARMACY_ROLE_UPDATE",
      details: { roleId, changes: Object.keys(data) },
    });

    return updated;
  }

  static async batchUpdateRolePermissions(
    tenantId: string,
    userId: string,
    matrix: { roleId: string; permissions: string[] }[]
  ) {
    const updatedRoles = [];
    for (const item of matrix) {
      const role = await (prisma as any).pharmacyRole.findFirst({
        where: { id: item.roleId, tenantId },
      });
      if (role) {
        const updated = await (prisma as any).pharmacyRole.update({
          where: { id: item.roleId },
          data: { permissions: item.permissions },
        });
        updatedRoles.push(updated);
      }
    }

    await AuditService.log({
      tenantId,
      userId,
      action: "PHARMACY_ROLE_MATRIX_UPDATE",
      details: { count: matrix.length },
    });

    return updatedRoles;
  }

  static async deletePharmacyRole(tenantId: string, roleId: string, userId: string) {
    const role = await (prisma as any).pharmacyRole.findFirst({
      where: { id: roleId, tenantId },
      include: {
        _count: { select: { users: true } },
      },
    });

    if (!role) {
      throw new Error("Pharmacy role not found");
    }

    if (role.isSystem) {
      throw new Error("Default system roles cannot be deleted.");
    }

    if (role._count?.users > 0) {
      throw new Error(
        `Cannot delete role "${role.name}" because ${role._count.users} staff member(s) are currently assigned to it. Please reassign their roles first.`
      );
    }

    await (prisma as any).pharmacyRole.delete({ where: { id: roleId } });

    await AuditService.log({
      tenantId,
      userId,
      action: "PHARMACY_ROLE_DELETE",
      details: { roleId, name: role.name },
    });

    return { success: true, message: `Role "${role.name}" deleted successfully.` };
  }

  /**
   * ==================== PHARMACY STAFF CRUD ====================
   */
  static async createUser(
    tenantId: string,
    creatorId: string,
    creatorRole: string,
    data: CreateUserInput
  ) {
    // 1. Verify creator authority
    if (creatorRole !== "COMPANY_OWNER" && creatorRole !== "SUPER_ADMIN") {
      throw new Error("Only the Pharmacy Owner can create new staff members.");
    }

    const tenant = await (prisma as any).tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    // 2. Plan staff capacity verification
    const staffCheck = await checkCanAddStaff(tenantId, data.branchId);
    if (!staffCheck.allowed) {
      throw new Error(staffCheck.message || "Staff limit reached for current subscription plan");
    }

    // 3. Check if email or username is already taken
    const identifier = (data.username || data.email || "").trim();
    if (!identifier) {
      throw new Error("Email is required");
    }

    const existing = await (prisma as any).user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { username: data.username || data.email },
        ],
      },
    });

    if (existing) {
      throw new Error("A user with this email or username already exists");
    }

    // 4. Verify branch belongs to tenant if branchId provided
    if (data.branchId) {
      const branch = await (prisma as any).branch.findFirst({
        where: { id: data.branchId, tenantId },
      });
      if (!branch) {
        throw new Error("Invalid branch ID for this tenant");
      }
    }

    // 5. Resolve Pharmacy Role from tenantId
    await this.ensureDefaultRoles(tenantId);

    let matchedRole = await (prisma as any).pharmacyRole.findFirst({
      where: {
        tenantId,
        OR: [
          { id: data.role },
          { name: { equals: data.role, mode: "insensitive" } },
        ],
      },
    });

    if (!matchedRole) {
      // Fallback: match by enum name or create
      matchedRole = await (prisma as any).pharmacyRole.findFirst({
        where: { tenantId },
      });
    }

    const assignedPermissions = matchedRole?.permissions || [];

    // Map Prisma enum role for database compatibility
    const roleNameUpper = (matchedRole?.name || data.role).toUpperCase().replace(/\s+/g, "_");
    let enumRole: any = "CASHIER";
    if (roleNameUpper.includes("MANAGER") || roleNameUpper.includes("BRANCH")) {
      enumRole = "BRANCH_MANAGER";
    } else if (roleNameUpper.includes("INVENTORY")) {
      enumRole = "INVENTORY_EXECUTIVE";
    } else if (roleNameUpper.includes("ACCOUNT")) {
      enumRole = "ACCOUNTS";
    } else if (roleNameUpper.includes("AUDIT")) {
      enumRole = "AUDITOR";
    } else {
      enumRole = "CASHIER";
    }

    // 6. Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await (prisma as any).user.create({
      data: {
        tenantId,
        username: data.username || data.email,
        email: data.email || null,
        name: data.name || null,
        phone: data.phone || null,
        passwordHash,
        role: enumRole,
        pharmacyRoleId: matchedRole?.id || null,
        pharmacyRoleName: matchedRole?.name || data.role,
        permissions: assignedPermissions,
        branchId: data.branchId || null,
        isActive: true,
      },
      include: {
        pharmacyRole: true,
        branch: { select: { id: true, name: true } },
      },
    });

    await AuditService.log({
      tenantId,
      branchId: data.branchId || null,
      userId: creatorId,
      action: "USER_CREATE",
      details: { createdUserId: user.id, username: user.username, role: user.pharmacyRoleName || user.role },
    });

    return {
      id: user.id,
      tenantId: user.tenantId,
      branchId: user.branchId,
      role: user.role,
      pharmacyRoleId: user.pharmacyRoleId,
      pharmacyRoleName: user.pharmacyRole?.name || user.pharmacyRoleName,
      permissions: user.permissions,
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone,
      isActive: user.isActive,
      branch: user.branch,
      createdAt: user.createdAt,
    };
  }

  static async listUsers(
    tenantId: string,
    query: ListUsersQuery,
    userRole: string,
    userBranchId?: string | null
  ) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    // Branch managers only see staff in their assigned branch
    if (userRole === "BRANCH_MANAGER" && userBranchId) {
      where.branchId = userBranchId;
    } else if (query.branchId) {
      where.branchId = query.branchId;
    }

    if (query.role) {
      where.OR = [
        { role: query.role },
        { pharmacyRoleName: { contains: query.role, mode: "insensitive" } },
      ];
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { username: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
        { pharmacyRoleName: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [total, users] = await Promise.all([
      (prisma as any).user.count({ where }),
      (prisma as any).user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          pharmacyRole: true,
          branch: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      data: users.map((u: any) => ({
        id: u.id,
        tenantId: u.tenantId,
        branchId: u.branchId,
        role: u.role,
        pharmacyRoleId: u.pharmacyRoleId,
        pharmacyRoleName: u.role === "COMPANY_OWNER" ? "Pharmacy Owner" : u.pharmacyRole?.name || u.pharmacyRoleName || u.role,
        permissions: u.role === "COMPANY_OWNER" ? ["*"] : (u.pharmacyRole?.permissions?.length ? u.pharmacyRole.permissions : u.permissions || []),
        username: u.username,
        name: u.name,
        email: u.email,
        phone: u.phone,
        isActive: u.isActive,
        createdAt: u.createdAt,
        branch: u.branch,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getUserDetails(userId: string, tenantId: string) {
    const user = await (prisma as any).user.findFirst({
      where: { id: userId, tenantId },
      include: {
        pharmacyRole: true,
        branch: { select: { id: true, name: true, location: true } },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return {
      id: user.id,
      tenantId: user.tenantId,
      branchId: user.branchId,
      role: user.role,
      pharmacyRoleId: user.pharmacyRoleId,
      pharmacyRoleName: user.role === "COMPANY_OWNER" ? "Pharmacy Owner" : user.pharmacyRole?.name || user.pharmacyRoleName || user.role,
      permissions: user.role === "COMPANY_OWNER" ? ["*"] : (user.pharmacyRole?.permissions?.length ? user.pharmacyRole.permissions : user.permissions || []),
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      branch: user.branch,
    };
  }

  static async updateUser(
    userId: string,
    tenantId: string,
    updaterId: string,
    updaterRole: string,
    data: UpdateUserInput
  ) {
    const user = await (prisma as any).user.findFirst({
      where: { id: userId, tenantId },
      include: { pharmacyRole: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Owner protection
    if (user.role === "COMPANY_OWNER" && updaterRole !== "SUPER_ADMIN" && updaterId !== userId) {
      throw new Error("Pharmacy Owner account cannot be altered by delegates.");
    }

    let pharmacyRoleId = user.pharmacyRoleId;
    let pharmacyRoleName = user.pharmacyRoleName;
    let permissions = user.permissions;

    if (data.role && user.role !== "COMPANY_OWNER") {
      const matchedRole = await (prisma as any).pharmacyRole.findFirst({
        where: {
          tenantId,
          OR: [
            { id: data.role },
            { name: { equals: data.role, mode: "insensitive" } },
          ],
        },
      });

      if (matchedRole) {
        pharmacyRoleId = matchedRole.id;
        pharmacyRoleName = matchedRole.name;
        permissions = matchedRole.permissions || [];
      } else {
        pharmacyRoleName = data.role;
      }
    }

    const updateData: any = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.branchId !== undefined && { branchId: data.branchId }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      pharmacyRoleId,
      pharmacyRoleName,
      permissions,
    };

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    const updated = await (prisma as any).user.update({
      where: { id: userId },
      data: updateData,
      include: {
        pharmacyRole: true,
        branch: { select: { id: true, name: true } },
      },
    });

    await AuditService.log({
      tenantId,
      branchId: updated.branchId,
      userId: updaterId,
      action: "USER_UPDATE",
      details: { updatedUserId: userId, changes: Object.keys(data) },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      branchId: updated.branchId,
      role: updated.role,
      pharmacyRoleId: updated.pharmacyRoleId,
      pharmacyRoleName: updated.role === "COMPANY_OWNER" ? "Pharmacy Owner" : updated.pharmacyRole?.name || updated.pharmacyRoleName,
      permissions: updated.role === "COMPANY_OWNER" ? ["*"] : (updated.pharmacyRole?.permissions?.length ? updated.pharmacyRole.permissions : updated.permissions || []),
      username: updated.username,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt,
      branch: updated.branch,
    };
  }

  static async updateUserStatus(
    userId: string,
    tenantId: string,
    updaterId: string,
    updaterRole: string,
    isActive: boolean
  ) {
    const user = await (prisma as any).user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.role === "COMPANY_OWNER") {
      throw new Error("Pharmacy Owner account cannot be deactivated.");
    }

    if (user.id === updaterId && !isActive) {
      throw new Error("You cannot deactivate your own account.");
    }

    const updated = await (prisma as any).user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
      },
    });

    await AuditService.log({
      tenantId,
      branchId: user.branchId,
      userId: updaterId,
      action: isActive ? "USER_ACTIVATE" : "USER_DEACTIVATE",
      details: { targetUserId: userId, username: user.username },
    });

    return updated;
  }

  static async deleteUser(
    userId: string,
    tenantId: string,
    deleterId: string,
    deleterRole: string
  ) {
    const user = await (prisma as any).user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new Error("Staff member not found in your pharmacy.");
    }

    if (user.role === "COMPANY_OWNER") {
      throw new Error("Pharmacy Owner account cannot be deleted.");
    }

    if (user.id === deleterId) {
      throw new Error("You cannot delete your own account.");
    }

    await (prisma as any).user.delete({
      where: { id: userId },
    });

    await AuditService.log({
      tenantId,
      branchId: user.branchId,
      userId: deleterId,
      action: "USER_DELETE",
      details: { deletedUserId: userId, username: user.username, name: user.name, role: user.pharmacyRoleName || user.role },
    });

    return {
      success: true,
      message: `Staff member "${user.name || user.username}" deleted successfully.`,
    };
  }

  static async getPermissionsHierarchy(tenantId: string) {
    await this.ensureDefaultRoles(tenantId);

    const roles = await this.listPharmacyRoles(tenantId);

    const permissionMap: Record<string, string[]> = {};
    roles.forEach((r: any) => {
      permissionMap[r.id] = r.permissions || [];
      permissionMap[r.name] = r.permissions || [];
    });

    return {
      roles,
      activePermissions: permissionMap,
      allPermissions: ALL_PHARMACY_PERMISSIONS,
    };
  }

  static async changePassword(userId: string, data: ChangePasswordInput) {
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found.");
    }

    const isValid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new Error("Current password does not match.");
    }

    const newHash = await bcrypt.hash(data.newPassword, 10);
    await (prisma as any).user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { success: true, message: "Password updated successfully." };
  }

  static async updateProfile(userId: string, data: UpdateProfileInput) {
    const updated = await (prisma as any).user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        avatarUrl: true,
        role: true,
        customRoleName: true,
        pharmacyRoleName: true,
      },
    });

    return updated;
  }
}
