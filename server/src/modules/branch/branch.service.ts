import { prisma } from "../../app/lib/prisma";
import { AuditService } from "../../app/lib/audit";
import { CreateBranchInput, UpdateBranchInput } from "./branch.validation";
import { checkCanAddBranch } from "../../app/lib/planLimits";

export class BranchService {
  static async createBranch(tenantId: string, userId: string, data: CreateBranchInput) {
    // 1. Verify subscription and branch limit
    const branchCheck = await checkCanAddBranch(tenantId);
    if (!branchCheck.allowed) {
      throw new Error(branchCheck.message || "Branch limit reached for current subscription plan");
    }

    // 2. Create branch
    const branch = await (prisma as any).branch.create({
      data: {
        tenantId,
        name: data.name,
        location: data.location || null,
        phone: data.phone || null,
        email: data.email || null,
        isActive: true,
      },
    });

    // 3. Log audit
    await AuditService.log({
      tenantId,
      branchId: branch.id,
      userId,
      action: "BRANCH_CREATE",
      details: { branchName: branch.name, location: branch.location },
    });

    return branch;
  }

  static async listBranches(
    tenantId: string,
    userRole?: string,
    userBranchId?: string | null
  ) {
    const where: any = { tenantId, isActive: true };

    return await (prisma as any).branch.findMany({
      where,
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: {
            users: { where: { isActive: true } },
            inventories: true,
            sales: true,
          },
        },
      },
    });
  }

  static async getBranchDetails(branchId: string, tenantId: string) {
    const branch = await (prisma as any).branch.findFirst({
      where: { id: branchId, tenantId },
      include: {
        users: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            role: true,
          },
        },
        _count: {
          select: {
            inventories: true,
            sales: true,
          },
        },
      },
    });

    if (!branch) {
      throw new Error("Branch not found");
    }

    return branch;
  }

  static async updateBranch(
    branchId: string,
    tenantId: string,
    userId: string,
    data: UpdateBranchInput
  ) {
    const branch = await (prisma as any).branch.findFirst({
      where: { id: branchId, tenantId },
    });

    if (!branch) {
      throw new Error("Branch not found");
    }

    const updated = await (prisma as any).branch.update({
      where: { id: branchId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    await AuditService.log({
      tenantId,
      branchId,
      userId,
      action: "BRANCH_UPDATE",
      details: data,
    });

    return updated;
  }

  static async deleteBranch(branchId: string, tenantId: string, userId: string) {
    const branch = await (prisma as any).branch.findFirst({
      where: { id: branchId, tenantId },
      include: {
        _count: { select: { sales: true, inventories: true } },
      },
    });

    if (!branch) {
      throw new Error("Branch not found");
    }

    // If branch has sales or inventories, soft-deactivate
    if (branch._count.sales > 0 || branch._count.inventories > 0) {
      const deactivated = await (prisma as any).branch.update({
        where: { id: branchId },
        data: { isActive: false },
      });

      await AuditService.log({
        tenantId,
        branchId,
        userId,
        action: "BRANCH_DEACTIVATE",
        details: { reason: "Soft deleted due to existing records" },
      });

      return {
        message: "Branch has historical records and was deactivated instead of permanently deleted.",
        branch: deactivated,
      };
    }

    await (prisma as any).branch.delete({ where: { id: branchId } });

    await AuditService.log({
      tenantId,
      userId,
      action: "BRANCH_DELETE",
      details: { branchId },
    });

    return { message: "Branch deleted permanently" };
  }
}
