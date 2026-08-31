import bcrypt from "bcryptjs";
import { prisma } from "../../app/lib/prisma";
import { AuditService } from "../../app/lib/audit";
import { CreateUserInput, UpdateUserInput, ListUsersQuery } from "./user.validation";
import { checkCanAddStaff } from "../../app/lib/planLimits";

export class UserService {
  static async createUser(
    tenantId: string,
    creatorId: string,
    creatorRole: string,
    data: CreateUserInput
  ) {
    // 1. Verify tenant tier allows this role
    const tenant = await (prisma as any).tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    if (data.role === "REGIONAL_ADMIN" && (tenant.tier === "STARTER" || tenant.tier === "TRIAL")) {
      throw new Error("Regional Admin role requires a Growth or Enterprise plan");
    }

    if (data.role === "AUDITOR" && tenant.tier !== "ENTERPRISE") {
      throw new Error("Auditor role requires an Enterprise plan");
    }

    // 2. Plan staff capacity verification
    const staffCheck = await checkCanAddStaff(tenantId, data.branchId);
    if (!staffCheck.allowed) {
      throw new Error(staffCheck.message || "Staff limit reached for current subscription plan");
    }

    // 3. Check if username is already registered
    const existing = await (prisma as any).user.findUnique({
      where: { username: data.username },
    });

    if (existing) {
      throw new Error("Username is already taken");
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

    // 5. Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await (prisma as any).user.create({
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

    await AuditService.log({
      tenantId,
      branchId: data.branchId || null,
      userId: creatorId,
      action: "USER_CREATE",
      details: { createdUserId: user.id, username: user.username, role: user.role },
    });

    return user;
  }

  static async listUsers(
    tenantId: string,
    query: ListUsersQuery,
    userRole: string,
    userBranchId?: string | null
  ) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    // Branch managers only see staff in their branch
    if (userRole === "BRANCH_MANAGER" && userBranchId) {
      where.branchId = userBranchId;
    } else if (query.branchId) {
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
      (prisma as any).user.count({ where }),
      (prisma as any).user.findMany({
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

  static async getUserDetails(userId: string, tenantId: string) {
    const user = await (prisma as any).user.findFirst({
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

  static async updateUser(
    userId: string,
    tenantId: string,
    updaterId: string,
    data: UpdateUserInput
  ) {
    const user = await (prisma as any).user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const updateData: any = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.role !== undefined && { role: data.role }),
      ...(data.branchId !== undefined && { branchId: data.branchId }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    };

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    const updated = await (prisma as any).user.update({
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

    await AuditService.log({
      tenantId,
      branchId: updated.branchId,
      userId: updaterId,
      action: "USER_UPDATE",
      details: { updatedUserId: userId, changes: Object.keys(data) },
    });

    return updated;
  }

  static async updateUserStatus(
    userId: string,
    tenantId: string,
    updaterId: string,
    isActive: boolean
  ) {
    const user = await (prisma as any).user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new Error("User not found");
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

  static async getPermissionsHierarchy() {
    return [
      {
        role: "SUPER_ADMIN",
        level: "Platform",
        scope: "All Tenants",
        permissions: ["tenants:manage", "plans:manage", "analytics:view_platform", "payments:view_platform"],
      },
      {
        role: "COMPANY_OWNER",
        level: "Tenant",
        scope: "All Branches",
        permissions: ["catalog:manage", "pricing:manage", "branches:manage", "staff:manage", "reports:company_wide", "transfers:manage"],
      },
      {
        role: "REGIONAL_ADMIN",
        level: "Tenant",
        scope: "Regional Branches",
        permissions: ["transfers:approve", "reports:regional", "staff:view", "branches:view"],
      },
      {
        role: "BRANCH_MANAGER",
        level: "Branch",
        scope: "Single Branch",
        permissions: ["inventory:adjust", "sales:refund", "sales:void", "controlled_medicine:approve", "reports:branch"],
      },
      {
        role: "CASHIER",
        level: "Branch",
        scope: "Single Branch POS",
        permissions: ["sales:create", "inventory:view", "receipts:print"],
      },
      {
        role: "AUDITOR",
        level: "Tenant",
        scope: "Tenant (Read-only)",
        permissions: ["audit:view", "compliance:view", "sales:read_only", "inventory:read_only"],
      },
    ];
  }
}
