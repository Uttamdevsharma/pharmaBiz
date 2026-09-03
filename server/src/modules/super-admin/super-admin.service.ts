import { prisma } from "../../app/lib/prisma";
import { CreatePlanInput, UpdatePlanInput, ListTenantsQuery } from "./super-admin.validation";
import { PlatformAnalyticsResponse } from "./super-admin.types";

export class SuperAdminService {
  /**
   * Plans Management
   */
  static async createPlan(data: CreatePlanInput) {
    const existing = await (prisma as any).subscriptionPlan.findUnique({
      where: { tier: data.tier },
    });

    if (existing) {
      throw new Error(`A subscription plan already exists for tier ${data.tier}. Please update the existing plan.`);
    }

    return await (prisma as any).subscriptionPlan.create({
      data: {
        name: data.name,
        tier: data.tier,
        price: data.price,
        billingCycle: data.billingCycle,
        maxBranches: data.maxBranches,
        features: data.features || {},
        isActive: data.isActive,
      },
    });
  }

  static async listPlans() {
    return await (prisma as any).subscriptionPlan.findMany({
      orderBy: { price: "asc" },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });
  }

  static async getPlanById(id: string) {
    const plan = await (prisma as any).subscriptionPlan.findUnique({
      where: { id },
      include: {
        subscriptions: {
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            tenant: {
              select: { id: true, name: true, tier: true, isActive: true },
            },
          },
        },
      },
    });

    if (!plan) {
      throw new Error("Subscription plan not found");
    }

    return plan;
  }

  static async updatePlan(id: string, data: UpdatePlanInput) {
    const plan = await (prisma as any).subscriptionPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new Error("Subscription plan not found");
    }

    return await (prisma as any).subscriptionPlan.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.billingCycle && { billingCycle: data.billingCycle }),
        ...(data.maxBranches !== undefined && { maxBranches: data.maxBranches }),
        ...(data.features && { features: data.features }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  static async deletePlan(id: string) {
    const plan = await (prisma as any).subscriptionPlan.findUnique({
      where: { id },
      include: { _count: { select: { subscriptions: true } } },
    });

    if (!plan) {
      throw new Error("Subscription plan not found");
    }

    if (plan._count.subscriptions > 0) {
      // Soft-deactivate if active subscriptions exist
      return await (prisma as any).subscriptionPlan.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return await (prisma as any).subscriptionPlan.delete({ where: { id } });
  }

  /**
   * Tenant Administration
   */
  static async listTenants(query: ListTenantsQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { name: { not: "Platform HQ" } };

    if (query.search) {
      where.AND = [
        {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { email: { contains: query.search, mode: "insensitive" } },
          ],
        },
      ];
    }

    if (query.tier) {
      where.tier = query.tier;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [total, tenants] = await Promise.all([
      (prisma as any).tenant.count({ where }),
      (prisma as any).tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { branches: true, users: true },
          },
          subscriptions: {
            orderBy: { createdAt: "desc" },
            include: { plan: true },
            take: 1,
          },
        },
      }),
    ]);

    // Format output without any tenant sales/POS data
    const formattedTenants = tenants.map((t: any) => ({
      id: t.id,
      name: t.name,
      tier: t.tier,
      isActive: t.isActive,
      email: t.email,
      phone: t.phone,
      address: t.address,
      createdAt: t.createdAt,
      branchCount: t._count.branches,
      userCount: t._count.users,
      activeSubscription: t.subscriptions[0] || null,
      subscriptions: t.subscriptions || [],
    }));

    return {
      data: formattedTenants,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getTenantDetails(id: string) {
    const tenant = await (prisma as any).tenant.findUnique({
      where: { id },
      include: {
        branches: {
          select: {
            id: true,
            name: true,
            location: true,
            isActive: true,
            createdAt: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        subscriptions: {
          orderBy: { createdAt: "desc" },
          include: { plan: true },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    return tenant;
  }

  static async getTenantSubscription(tenantId: string) {
    const subscriptions = await (prisma as any).subscription.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: { plan: true, payments: true },
    });

    return subscriptions;
  }

  static async updateTenantStatus(id: string, isActive: boolean) {
    const tenant = await (prisma as any).tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    if (tenant.name === "Platform HQ") {
      throw new Error("Platform HQ system tenant status cannot be modified or suspended.");
    }

    return await (prisma as any).tenant.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        tier: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Platform Subscriptions List
   */
  static async listSubscriptions(page = 1, limit = 50, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = { tenant: { name: { not: "Platform HQ" } } };

    if (status) {
      where.status = status;
    }

    const [total, subscriptions] = await Promise.all([
      (prisma as any).subscription.count({ where }),
      (prisma as any).subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          tenant: {
            select: { id: true, name: true, tier: true, email: true, phone: true, isActive: true },
          },
          plan: true,
          payments: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
    ]);

    return {
      data: subscriptions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Platform Payments & Transactions
   */
  static async listPlatformPayments(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where: any = { tenant: { name: { not: "Platform HQ" } } };

    const [total, payments] = await Promise.all([
      (prisma as any).payment.count({ where }),
      (prisma as any).payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          tenant: {
            select: { id: true, name: true, tier: true },
          },
          subscription: {
            include: { plan: true },
          },
        },
      }),
    ]);

    return {
      data: payments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Platform Analytics (No tenant sales data)
   */
  static async getPlatformAnalytics(): Promise<PlatformAnalyticsResponse> {
    const tenantFilter = { name: { not: "Platform HQ" } };

    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalSubscriptions,
      activeSubscriptions,
      successfulPayments,
      activeSubsWithPlans,
      recentTenants,
    ] = await Promise.all([
      (prisma as any).tenant.count({ where: tenantFilter }),
      (prisma as any).tenant.count({ where: { ...tenantFilter, isActive: true } }),
      (prisma as any).tenant.count({ where: { ...tenantFilter, isActive: false } }),
      (prisma as any).subscription.count({ where: { tenant: tenantFilter } }),
      (prisma as any).subscription.count({ where: { status: "ACTIVE", tenant: tenantFilter } }),
      (prisma as any).payment.findMany({
        where: { status: "VALIDATED", tenant: tenantFilter },
        select: { amount: true, createdAt: true },
      }),
      (prisma as any).subscription.findMany({
        where: { status: "ACTIVE", tenant: tenantFilter },
        include: { plan: true, tenant: { select: { tier: true } } },
      }),
      (prisma as any).tenant.findMany({
        where: tenantFilter,
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { branches: true, users: true } } },
      }),
    ]);

    const totalPlatformRevenue = successfulPayments.reduce(
      (sum: number, p: any) => sum + Number(p.amount),
      0
    );

    // Calculate MRR from active subscriptions of client tenants
    const monthlyRecurringRevenue = activeSubsWithPlans.reduce((sum: number, s: any) => {
      const price = Number(s.plan?.price || 0);
      const isYearly = s.plan?.billingCycle === "YEARLY" ||
        ((new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) > 45 * 24 * 60 * 60 * 1000);
      return isYearly ? sum + (price / 12) : sum + price;
    }, 0);

    // Plan distribution from active subscriptions
    let trialCount = 0;
    let starterCount = 0;
    let growthCount = 0;
    let enterpriseCount = 0;

    for (const sub of activeSubsWithPlans) {
      const tier = sub.plan?.tier || sub.tenant?.tier;
      if (tier === "TRIAL") trialCount++;
      else if (tier === "STARTER") starterCount++;
      else if (tier === "GROWTH") growthCount++;
      else if (tier === "ENTERPRISE") enterpriseCount++;
    }

    return {
      totalTenants,
      activeTenants,
      suspendedTenants,
      tierBreakdown: {
        trial: trialCount,
        starter: starterCount,
        growth: growthCount,
        enterprise: enterpriseCount,
      },
      totalSubscriptions,
      activeSubscriptions,
      totalPlatformRevenue: Math.round(totalPlatformRevenue * 100) / 100,
      monthlyRecurringRevenue: Math.round(monthlyRecurringRevenue * 100) / 100,
      recentTenants: recentTenants.map((t: any) => ({
        id: t.id,
        name: t.name,
        tier: t.tier,
        isActive: t.isActive,
        createdAt: t.createdAt,
        branchCount: t._count?.branches || 0,
        userCount: t._count?.users || 0,
      })),
    };
  }

  /**
   * ==================== PLATFORM DYNAMIC ROLES & PERMISSIONS ====================
   */
  static async listRoles() {
    const roles = await (prisma as any).platformRole.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    return roles.map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      permissions: r.permissions || [],
      isSystem: r.isSystem,
      userCount: r._count?.users || 0,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  static async createRole(data: { name: string; description?: string; permissions?: string[] }) {
    const nameTrimmed = data.name.trim();
    if (!nameTrimmed) {
      throw new Error("Role name is required");
    }

    if (nameTrimmed.toUpperCase() === "SUPER_ADMIN" || nameTrimmed.toUpperCase() === "SUPER ADMIN") {
      throw new Error("Cannot create a role with Super Admin name. Super Admin is root protected.");
    }

    const existing = await (prisma as any).platformRole.findFirst({
      where: { name: { equals: nameTrimmed, mode: "insensitive" } },
    });

    if (existing) {
      throw new Error(`Role "${nameTrimmed}" already exists`);
    }

    const id = nameTrimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    return await (prisma as any).platformRole.create({
      data: {
        id,
        name: nameTrimmed,
        description: data.description || null,
        permissions: data.permissions || [],
        isSystem: false,
      },
    });
  }

  static async updateRole(id: string, data: { name?: string; description?: string; permissions?: string[] }) {
    const role = await (prisma as any).platformRole.findUnique({ where: { id } });
    if (!role) {
      throw new Error("Role not found");
    }

    const updateData: any = {};
    if (data.name !== undefined) {
      const nameTrimmed = data.name.trim();
      if (nameTrimmed.toUpperCase() === "SUPER_ADMIN") {
        throw new Error("Cannot rename role to Super Admin.");
      }
      updateData.name = nameTrimmed;
    }

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    if (data.permissions !== undefined) {
      updateData.permissions = data.permissions;
    }

    return await (prisma as any).platformRole.update({
      where: { id },
      data: updateData,
    });
  }

  static async deleteRole(id: string) {
    const role = await (prisma as any).platformRole.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!role) {
      throw new Error("Role not found");
    }

    if (role.isSystem) {
      throw new Error("Protected system roles cannot be deleted.");
    }

    if (role._count?.users > 0) {
      throw new Error(`Cannot delete role "${role.name}" because ${role._count.users} staff member(s) are currently assigned to it. Please reassign their roles first.`);
    }

    await (prisma as any).platformRole.delete({ where: { id } });
    return { success: true, message: `Role "${role.name}" removed successfully` };
  }

  /**
   * ==================== PLATFORM STAFF MANAGEMENT ====================
   */
  static async listPlatformStaff() {
    // Return all platform staff (Super Admin + any staff under Platform HQ tenant or with custom roles)
    let systemTenant = await (prisma as any).tenant.findFirst({
      where: { name: "Platform HQ" },
    });

    const whereClause: any = systemTenant
      ? {
          OR: [
            { tenantId: systemTenant.id },
            { role: "SUPER_ADMIN" },
            { customRoleId: { not: null } },
            { role: { in: ["CTO", "PROJECT_MANAGER"] } },
          ],
        }
      : {
          OR: [
            { role: "SUPER_ADMIN" },
            { customRoleId: { not: null } },
            { role: { in: ["CTO", "PROJECT_MANAGER"] } },
          ],
        };

    const users = await (prisma as any).user.findMany({
      where: whereClause,
      orderBy: { createdAt: "asc" },
      include: {
        customRole: true,
      },
    });

    return users.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      username: u.username,
      phone: u.phone,
      role: u.role,
      customRoleId: u.customRoleId,
      customRoleName: u.customRole?.name || u.customRoleName || (u.role === "SUPER_ADMIN" ? "Super Admin" : u.role),
      customRole: u.customRole,
      permissions: u.role === "SUPER_ADMIN" ? ["*"] : (u.permissions?.length ? u.permissions : u.customRole?.permissions || []),
      isActive: u.isActive,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
  }

  static async createPlatformStaff(creatorId: string, creatorRole: string, data: any) {
    if (creatorRole !== "SUPER_ADMIN") {
      throw new Error("Only Super Admin can create new platform staff members.");
    }

    if (data.role === "SUPER_ADMIN" || data.role?.toUpperCase() === "SUPER_ADMIN") {
      throw new Error("Cannot create additional Super Admin root accounts. Please assign a custom role.");
    }

    // Find or create Platform HQ System Tenant
    let systemTenant = await (prisma as any).tenant.findFirst({
      where: { name: "Platform HQ" },
    });

    if (!systemTenant) {
      systemTenant = await (prisma as any).tenant.create({
        data: {
          name: "Platform HQ",
          tier: "ENTERPRISE",
          email: "admin@platform.system",
          phone: "01700000000",
          address: "Platform Control Center",
          isActive: true,
        },
      });
    }

    const identifier = (data.username || data.email || "").trim();
    if (!identifier) {
      throw new Error("Email or username is required");
    }

    const existingUser = await (prisma as any).user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { username: data.username || data.email },
        ],
      },
    });

    if (existingUser) {
      throw new Error("A user with this email or username already exists");
    }

    // Resolve Custom Role if provided by id or name
    let matchedRole: any = null;
    if (data.role) {
      matchedRole = await (prisma as any).platformRole.findFirst({
        where: {
          OR: [
            { id: data.role },
            { name: { equals: data.role, mode: "insensitive" } },
          ],
        },
      });
    }

    // If role doesn't exist yet in PlatformRole table, create it dynamically
    if (!matchedRole && data.role) {
      const roleName = data.role.trim();
      const roleId = roleName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      matchedRole = await (prisma as any).platformRole.create({
        data: {
          id: roleId,
          name: roleName,
          description: `Custom ${roleName} platform role`,
          permissions: data.permissions || [],
          isSystem: false,
        },
      });
    }

    // Resolve permissions: either custom passed in, or role's permissions
    const assignedPermissions: string[] = Array.isArray(data.permissions) && data.permissions.length > 0
      ? data.permissions
      : matchedRole?.permissions || [];

    const bcrypt = require("bcryptjs");
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Map Prisma enum role
    const enumRole = matchedRole?.name === "CTO" ? "CTO" : matchedRole?.name === "Project Manager" ? "PROJECT_MANAGER" : "PROJECT_MANAGER";

    const staff = await (prisma as any).user.create({
      data: {
        tenantId: systemTenant.id,
        name: data.name,
        email: data.email,
        username: data.username || data.email,
        phone: data.phone || null,
        passwordHash,
        role: enumRole,
        customRoleId: matchedRole?.id || null,
        customRoleName: matchedRole?.name || data.role,
        permissions: assignedPermissions,
        isActive: true,
      },
      include: {
        customRole: true,
      },
    });

    return {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      username: staff.username,
      phone: staff.phone,
      role: staff.role,
      customRoleId: staff.customRoleId,
      customRoleName: staff.customRole?.name || staff.customRoleName,
      permissions: staff.permissions,
      isActive: staff.isActive,
      createdAt: staff.createdAt,
    };
  }

  static async updatePlatformStaff(id: string, updaterId: string, updaterRole: string, data: any) {
    const targetUser = await (prisma as any).user.findUnique({
      where: { id },
      include: { customRole: true },
    });

    if (!targetUser) {
      throw new Error("Platform staff member not found");
    }

    // Security Invariant: Super Admin master account cannot be modified, downgraded, or re-assigned by delegated staff
    if (targetUser.role === "SUPER_ADMIN") {
      if (updaterRole !== "SUPER_ADMIN") {
        throw new Error("Delegated staff cannot modify or alter the Super Admin master account.");
      }
      if (data.role && data.role !== "SUPER_ADMIN") {
        throw new Error("Cannot change Super Admin role.");
      }
      if (data.isActive === false) {
        throw new Error("Super Admin master account cannot be deactivated.");
      }
    }

    // Delegates cannot elevate any account to Super Admin
    if (updaterRole !== "SUPER_ADMIN" && (data.role === "SUPER_ADMIN" || data.customRoleName === "SUPER_ADMIN")) {
      throw new Error("Delegated platform staff cannot promote accounts to Super Admin.");
    }

    let customRoleId = targetUser.customRoleId;
    let customRoleName = targetUser.customRoleName;

    if (data.role && targetUser.role !== "SUPER_ADMIN") {
      let matchedRole = await (prisma as any).platformRole.findFirst({
        where: {
          OR: [
            { id: data.role },
            { name: { equals: data.role, mode: "insensitive" } },
          ],
        },
      });

      if (matchedRole) {
        customRoleId = matchedRole.id;
        customRoleName = matchedRole.name;
      } else {
        customRoleName = data.role;
      }
    }

    const updateData: any = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.permissions !== undefined && { permissions: data.permissions }),
      ...(customRoleId !== undefined && { customRoleId }),
      ...(customRoleName !== undefined && { customRoleName }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    };

    if (data.password) {
      const bcrypt = require("bcryptjs");
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    const updated = await (prisma as any).user.update({
      where: { id },
      data: updateData,
      include: {
        customRole: true,
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      username: updated.username,
      phone: updated.phone,
      role: updated.role,
      customRoleId: updated.customRoleId,
      customRoleName: updated.customRole?.name || updated.customRoleName,
      permissions: updated.role === "SUPER_ADMIN" ? ["*"] : updated.permissions,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt,
    };
  }

  static async updatePlatformStaffStatus(id: string, updaterId: string, updaterRole: string, isActive: boolean) {
    const targetUser = await (prisma as any).user.findUnique({ where: { id } });
    if (!targetUser) {
      throw new Error("Platform staff member not found");
    }

    if (targetUser.role === "SUPER_ADMIN") {
      throw new Error("Super Admin master account cannot be deactivated or disabled.");
    }

    if (targetUser.id === updaterId && !isActive) {
      throw new Error("You cannot deactivate your own staff account.");
    }

    return await (prisma as any).user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
      },
    });
  }

  static async deletePlatformStaff(id: string, updaterId: string, updaterRole: string) {
    const targetUser = await (prisma as any).user.findUnique({ where: { id } });
    if (!targetUser) {
      throw new Error("Platform staff member not found");
    }

    if (targetUser.role === "SUPER_ADMIN") {
      throw new Error("Super Admin master account cannot be deleted or removed under any circumstance.");
    }

    if (targetUser.id === updaterId) {
      throw new Error("You cannot delete your own staff account.");
    }

    await (prisma as any).user.delete({ where: { id } });
    return { success: true, message: `Platform staff account ${targetUser.username} removed.` };
  }

  static async getPlatformPermissionsHierarchy() {
    const roles = await this.listRoles();

    const availablePermissions = [
      {
        id: "pharmacies.manage",
        name: "Manage Pharmacies",
        category: "Pharmacies & Tenants",
        description: "View, inspect, activate, and suspend pharmacy tenant accounts.",
      },
      {
        id: "subscriptions.manage",
        name: "Manage Subscriptions",
        category: "Subscriptions & Billing",
        description: "Manage tenant subscription lifecycle, renewals, and statuses.",
      },
      {
        id: "plans.manage",
        name: "Manage Plans",
        category: "Subscriptions & Billing",
        description: "Create, configure, update, and manage pricing tiers and feature limits.",
      },
      {
        id: "payments.view",
        name: "View Payments",
        category: "Subscriptions & Billing",
        description: "Inspect revenue transactions, payment statuses, and invoice records.",
      },
      {
        id: "reports.view",
        name: "View Reports",
        category: "Analytics & Telemetry",
        description: "Access platform MRR, revenue growth analytics, and tenant reports.",
      },
      {
        id: "staff.create",
        name: "Create Staff",
        category: "Staff & Access Control",
        description: "Create new platform staff members and assign roles and permissions.",
      },
      {
        id: "staff.manage",
        name: "Manage Staff",
        category: "Staff & Access Control",
        description: "Edit staff profiles, update permission matrix, toggle status, and delete staff.",
      },
      {
        id: "roles.manage",
        name: "Manage Roles & Permissions",
        category: "Staff & Access Control",
        description: "Create dynamic custom roles, edit permissions, and manage role assignments.",
      },
      {
        id: "settings.manage",
        name: "Manage System Settings",
        category: "Platform Administration",
        description: "Configure platform branding, landing page content, and global settings.",
      },
      {
        id: "platform.data",
        name: "Manage Platform Data",
        category: "Platform Administration",
        description: "Access system telemetry, audit logs, and platform diagnostic data.",
      },
    ];

    return {
      roles,
      availablePermissions,
    };
  }

  static async updatePlatformRolePermissions(roleIdentifier: string, permissions: string[]) {
    // Find role by id or name
    let role = await (prisma as any).platformRole.findFirst({
      where: {
        OR: [
          { id: roleIdentifier },
          { name: { equals: roleIdentifier, mode: "insensitive" } },
        ],
      },
    });

    if (!role) {
      throw new Error(`Role "${roleIdentifier}" not found.`);
    }

    const updated = await (prisma as any).platformRole.update({
      where: { id: role.id },
      data: { permissions },
    });

    return { success: true, role: updated.name, permissions: updated.permissions };
  }
}


