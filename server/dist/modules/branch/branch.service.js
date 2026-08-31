"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BranchService = void 0;
const prisma_1 = require("../../app/lib/prisma");
const audit_1 = require("../../app/lib/audit");
const planLimits_1 = require("../../app/lib/planLimits");
class BranchService {
    static async createBranch(tenantId, userId, data) {
        // 1. Verify subscription and branch limit
        const branchCheck = await (0, planLimits_1.checkCanAddBranch)(tenantId);
        if (!branchCheck.allowed) {
            throw new Error(branchCheck.message || "Branch limit reached for current subscription plan");
        }
        // 2. Create branch
        const branch = await prisma_1.prisma.branch.create({
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
        await audit_1.AuditService.log({
            tenantId,
            branchId: branch.id,
            userId,
            action: "BRANCH_CREATE",
            details: { branchName: branch.name, location: branch.location },
        });
        return branch;
    }
    static async listBranches(tenantId, userRole, userBranchId) {
        const where = { tenantId, isActive: true };
        // Branch managers and cashiers only see their assigned branch
        if (["BRANCH_MANAGER", "CASHIER"].includes(userRole) && userBranchId) {
            where.id = userBranchId;
        }
        return await prisma_1.prisma.branch.findMany({
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
    static async getBranchDetails(branchId, tenantId) {
        const branch = await prisma_1.prisma.branch.findFirst({
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
    static async updateBranch(branchId, tenantId, userId, data) {
        const branch = await prisma_1.prisma.branch.findFirst({
            where: { id: branchId, tenantId },
        });
        if (!branch) {
            throw new Error("Branch not found");
        }
        const updated = await prisma_1.prisma.branch.update({
            where: { id: branchId },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.location !== undefined && { location: data.location }),
                ...(data.phone !== undefined && { phone: data.phone }),
                ...(data.email !== undefined && { email: data.email }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
            },
        });
        await audit_1.AuditService.log({
            tenantId,
            branchId,
            userId,
            action: "BRANCH_UPDATE",
            details: data,
        });
        return updated;
    }
    static async deleteBranch(branchId, tenantId, userId) {
        const branch = await prisma_1.prisma.branch.findFirst({
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
            const deactivated = await prisma_1.prisma.branch.update({
                where: { id: branchId },
                data: { isActive: false },
            });
            await audit_1.AuditService.log({
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
        await prisma_1.prisma.branch.delete({ where: { id: branchId } });
        await audit_1.AuditService.log({
            tenantId,
            userId,
            action: "BRANCH_DELETE",
            details: { branchId },
        });
        return { message: "Branch deleted permanently" };
    }
}
exports.BranchService = BranchService;
