"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = exports.ALLOWED_PHARMACY_STAFF_ROLES = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../../app/lib/prisma");
const audit_1 = require("../../app/lib/audit");
const planLimits_1 = require("../../app/lib/planLimits");
// Allowed pharmacy staff roles that Shop Owners can create and manage
exports.ALLOWED_PHARMACY_STAFF_ROLES = [
    "BRANCH_MANAGER",
    "INVENTORY_EXECUTIVE",
    "CASHIER",
    "ACCOUNTS",
];
class UserService {
    static async createUser(tenantId, creatorId, creatorRole, data) {
        // 1. Verify creator authority
        if (creatorRole === "COMPANY_OWNER") {
            if (!exports.ALLOWED_PHARMACY_STAFF_ROLES.includes(data.role)) {
                throw new Error("Shop Owners can only create Branch Manager, Inventory Executive, Cashier, and Accounts staff roles.");
            }
        }
        else if (!["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"].includes(creatorRole)) {
            throw new Error("You do not have permission to create staff members.");
        }
        if (creatorRole !== "SUPER_ADMIN" && data.role === "SUPER_ADMIN") {
            throw new Error("Delegated platform staff cannot create a Super Admin account.");
        }
        const tenant = await prisma_1.prisma.tenant.findUnique({
            where: { id: tenantId },
        });
        if (!tenant) {
            throw new Error("Tenant not found");
        }
        // 2. Plan staff capacity verification
        const staffCheck = await (0, planLimits_1.checkCanAddStaff)(tenantId, data.branchId);
        if (!staffCheck.allowed) {
            throw new Error(staffCheck.message || "Staff limit reached for current subscription plan");
        }
        // 3. Check if username is already registered
        const existing = await prisma_1.prisma.user.findUnique({
            where: { username: data.username },
        });
        if (existing) {
            throw new Error("Username is already taken");
        }
        // 4. Verify branch belongs to tenant if branchId provided
        if (data.branchId) {
            const branch = await prisma_1.prisma.branch.findFirst({
                where: { id: data.branchId, tenantId },
            });
            if (!branch) {
                throw new Error("Invalid branch ID for this tenant");
            }
        }
        // 5. Hash password
        const passwordHash = await bcryptjs_1.default.hash(data.password, 10);
        const user = await prisma_1.prisma.user.create({
            data: {
                tenantId,
                username: data.username,
                passwordHash,
                name: data.name || null,
                email: data.email || null,
                phone: data.phone || null,
                role: data.role,
                branchId: data.branchId || null,
                isActive: true,
            },
            select: {
                id: true,
                tenantId: true,
                branchId: true,
                role: true,
                username: true,
                name: true,
                email: true,
                phone: true,
                isActive: true,
                createdAt: true,
            },
        });
        await audit_1.AuditService.log({
            tenantId,
            branchId: data.branchId || null,
            userId: creatorId,
            action: "USER_CREATE",
            details: { createdUserId: user.id, username: user.username, role: user.role },
        });
        return user;
    }
    static async listUsers(tenantId, query, userRole, userBranchId) {
        const page = query.page || 1;
        const limit = query.limit || 50;
        const skip = (page - 1) * limit;
        const where = { tenantId };
        // Branch managers only see staff in their assigned branch
        if (userRole === "BRANCH_MANAGER" && userBranchId) {
            where.branchId = userBranchId;
        }
        else if (query.branchId) {
            where.branchId = query.branchId;
        }
        if (query.role) {
            where.role = query.role;
        }
        if (query.isActive !== undefined) {
            where.isActive = query.isActive;
        }
        if (query.search) {
            where.OR = [
                { name: { contains: query.search, mode: "insensitive" } },
                { username: { contains: query.search, mode: "insensitive" } },
                { email: { contains: query.search, mode: "insensitive" } },
            ];
        }
        const [total, users] = await Promise.all([
            prisma_1.prisma.user.count({ where }),
            prisma_1.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    tenantId: true,
                    branchId: true,
                    role: true,
                    username: true,
                    name: true,
                    email: true,
                    phone: true,
                    isActive: true,
                    createdAt: true,
                    branch: { select: { id: true, name: true } },
                },
            }),
        ]);
        return {
            data: users,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    static async getUserDetails(userId, tenantId) {
        const user = await prisma_1.prisma.user.findFirst({
            where: { id: userId, tenantId },
            select: {
                id: true,
                tenantId: true,
                branchId: true,
                role: true,
                username: true,
                name: true,
                email: true,
                phone: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                branch: { select: { id: true, name: true, location: true } },
            },
        });
        if (!user) {
            throw new Error("User not found");
        }
        return user;
    }
    static async updateUser(userId, tenantId, updaterId, updaterRole, data) {
        const user = await prisma_1.prisma.user.findFirst({
            where: { id: userId, tenantId },
        });
        if (!user) {
            throw new Error("User not found");
        }
        // Security Rule: Super Admin can never be compromised by subordinate or delegated roles
        if (user.role === "SUPER_ADMIN" && updaterRole !== "SUPER_ADMIN") {
            throw new Error("Super Admin account cannot be modified by any subordinate or delegated role.");
        }
        if (updaterRole !== "SUPER_ADMIN" && data.role === "SUPER_ADMIN") {
            throw new Error("Delegated platform staff cannot elevate an account to Super Admin.");
        }
        // Shop Owner boundary
        if (updaterRole === "COMPANY_OWNER" && data.role) {
            if (!exports.ALLOWED_PHARMACY_STAFF_ROLES.includes(data.role)) {
                throw new Error("Shop Owners can only assign Branch Manager, Inventory Executive, Cashier, or Accounts roles.");
            }
        }
        const updateData = {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.email !== undefined && { email: data.email }),
            ...(data.phone !== undefined && { phone: data.phone }),
            ...(data.role !== undefined && { role: data.role }),
            ...(data.branchId !== undefined && { branchId: data.branchId }),
            ...(data.isActive !== undefined && { isActive: data.isActive }),
        };
        if (data.password) {
            const bcrypt = require("bcryptjs");
            updateData.passwordHash = await bcrypt.hash(data.password, 10);
        }
        const updated = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                tenantId: true,
                branchId: true,
                role: true,
                username: true,
                name: true,
                email: true,
                phone: true,
                isActive: true,
                updatedAt: true,
            },
        });
        await audit_1.AuditService.log({
            tenantId,
            branchId: updated.branchId,
            userId: updaterId,
            action: "USER_UPDATE",
            details: { updatedUserId: userId, changes: Object.keys(data) },
        });
        return updated;
    }
    static async updateUserStatus(userId, tenantId, updaterId, updaterRole, isActive) {
        const user = await prisma_1.prisma.user.findFirst({
            where: { id: userId, tenantId },
        });
        if (!user) {
            throw new Error("User not found");
        }
        // Security Rule: Super Admin cannot be deactivated
        if (user.role === "SUPER_ADMIN") {
            throw new Error("Super Admin account cannot be disabled or deactivated.");
        }
        if (user.role === "COMPANY_OWNER" &&
            !["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"].includes(updaterRole) &&
            updaterId !== userId) {
            throw new Error("Only Super Admin or delegated platform staff can change a Pharmacy Owner account status.");
        }
        const updated = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { isActive },
            select: {
                id: true,
                username: true,
                role: true,
                isActive: true,
            },
        });
        await audit_1.AuditService.log({
            tenantId,
            branchId: user.branchId,
            userId: updaterId,
            action: isActive ? "USER_ACTIVATE" : "USER_DEACTIVATE",
            details: { targetUserId: userId, username: user.username },
        });
        return updated;
    }
    static async getPermissionsHierarchy() {
        // The exact 4 staff roles for each Pharmacy / Shop Owner
        const roles = [
            {
                role: "BRANCH_MANAGER",
                name: "Branch Manager",
                level: "Operational Oversight",
                description: "Manages local branch inventory, stock adjustments, supplier interaction, POS oversight, and staff.",
            },
            {
                role: "INVENTORY_EXECUTIVE",
                name: "Inventory Executive",
                level: "Stock & Batches",
                description: "Specialized in product catalog, batches, expiry dates, rack locations, and stock receiving without financial access.",
            },
            {
                role: "CASHIER",
                name: "Cashier",
                level: "Counter POS",
                description: "Handles POS checkout, FEFO batch selection, invoice printing, and personal shift sales history.",
            },
            {
                role: "ACCOUNTS",
                name: "Accounts Manager",
                level: "Finance & Accounts",
                description: "Manages cash drawers, bank accounts, digital mobile wallets (bKash/Nagad), supplier dues, and financial ledgers.",
            },
        ];
        const dbPermissions = await prisma_1.prisma.rolePermission.findMany({
            where: {
                role: { in: ["BRANCH_MANAGER", "INVENTORY_EXECUTIVE", "CASHIER", "ACCOUNTS"] },
            },
        });
        const permissionMap = {};
        dbPermissions.forEach((p) => {
            if (!permissionMap[p.role])
                permissionMap[p.role] = [];
            permissionMap[p.role].push(p.permission);
        });
        const ALL_AVAILABLE_PERMISSIONS = [
            { id: "product.view", label: "View Products & Categories", category: "Products" },
            { id: "product.create", label: "Create Products & Categories", category: "Products" },
            { id: "product.update", label: "Update Products & Prices", category: "Products" },
            { id: "inventory.view", label: "View Inventory & Stock Alerts", category: "Inventory" },
            { id: "inventory.add_stock", label: "Add Stock & Inward Batches", category: "Inventory" },
            { id: "inventory.adjust", label: "Adjust Stock Quantities", category: "Inventory" },
            { id: "inventory.batch", label: "Manage Batches & Expiry Dates", category: "Inventory" },
            { id: "inventory.transfer", label: "Transfer Stock Between Branches", category: "Inventory" },
            { id: "supplier.view", label: "View Suppliers & Purchase History", category: "Suppliers" },
            { id: "supplier.manage", label: "Create & Manage Suppliers", category: "Suppliers" },
            { id: "sales.pos", label: "Access POS & Sell Items", category: "POS & Sales" },
            { id: "sales.create", label: "Create Sales Invoices", category: "POS & Sales" },
            { id: "sales.view_own", label: "View Own Sales History", category: "POS & Sales" },
            { id: "sales.view", label: "View All Branch/Tenant Sales", category: "POS & Sales" },
            { id: "sales.refund", label: "Process Sales Refunds", category: "POS & Sales" },
            { id: "sales.void", label: "Void Invoices", category: "POS & Sales" },
            { id: "accounts.view", label: "View Financial Accounts & Balances", category: "Accounting" },
            { id: "accounts.manage", label: "Manage Accounts & Record Income/Expense", category: "Accounting" },
            { id: "accounts.transfer", label: "Execute Account-to-Account Transfers", category: "Accounting" },
            { id: "accounts.reconciliation", label: "Perform Cash & Payment Reconciliation", category: "Accounting" },
            { id: "supplier.payment", label: "Record Supplier Due Settlements", category: "Accounting" },
            { id: "reports.view", label: "Access Management Dashboard", category: "Reports" },
            { id: "reports.sales", label: "View Sales & Revenue Reports", category: "Reports" },
            { id: "reports.stock", label: "View Inventory Valuation Reports", category: "Reports" },
            { id: "reports.financial", label: "View Financial & Profit Analytics", category: "Reports" },
            { id: "staff.manage", label: "Manage Staff & Permissions", category: "Administration" },
        ];
        return {
            roles,
            activePermissions: permissionMap,
            allPermissions: ALL_AVAILABLE_PERMISSIONS,
        };
    }
    static async updateRolePermissions(tenantId, updaterId, role, permissions) {
        if (!exports.ALLOWED_PHARMACY_STAFF_ROLES.includes(role)) {
            throw new Error(`Can only customize permissions for: ${exports.ALLOWED_PHARMACY_STAFF_ROLES.join(", ")}`);
        }
        await prisma_1.prisma.$transaction(async (tx) => {
            // Clear existing
            await tx.rolePermission.deleteMany({
                where: { role: role },
            });
            // Insert new
            if (permissions.length > 0) {
                await tx.rolePermission.createMany({
                    data: permissions.map((p) => ({
                        role: role,
                        permission: p,
                    })),
                });
            }
        });
        await audit_1.AuditService.log({
            tenantId,
            userId: updaterId,
            action: "ROLE_PERMISSIONS_UPDATED",
            details: { role, permissionsCount: permissions.length, permissions },
        });
        return { success: true, role, permissions };
    }
}
exports.UserService = UserService;
