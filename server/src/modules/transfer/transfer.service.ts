import { prisma } from "../../app/lib/prisma";
import { AuditService } from "../../app/lib/audit";
import { CreateTransferInput, ListTransfersQuery } from "./transfer.validation";

export class TransferService {
  /**
   * Create Inter-Branch Transfer Request
   */
  static async createTransfer(
    tenantId: string,
    userId: string,
    data: CreateTransferInput
  ) {
    // 1. Verify tenant tier allows transfers
    const tenant = await (prisma as any).tenant.findUnique({
      where: { id: tenantId },
    });

    if (tenant.tier === "STARTER") {
      throw new Error("Inter-branch stock transfers require a Growth or Enterprise plan");
    }

    if (data.fromBranchId === data.toBranchId) {
      throw new Error("Source and destination branches cannot be the same");
    }

    // 2. Verify branches belong to tenant
    const [fromBranch, toBranch] = await Promise.all([
      (prisma as any).branch.findFirst({ where: { id: data.fromBranchId, tenantId, isActive: true } }),
      (prisma as any).branch.findFirst({ where: { id: data.toBranchId, tenantId, isActive: true } }),
    ]);

    if (!fromBranch || !toBranch) {
      throw new Error("One or both branches are invalid or inactive");
    }

    // 3. Verify stock availability at source branch
    for (const item of data.items) {
      const inv = await (prisma as any).inventory.findFirst({
        where: {
          branchId: data.fromBranchId,
          productId: item.productId,
        },
      });

      if (!inv || inv.quantity < item.quantity) {
        const product = await (prisma as any).product.findUnique({
          where: { id: item.productId },
        });
        throw new Error(
          `Insufficient stock at ${fromBranch.name} for product "${product?.name || item.productId}". Available: ${inv?.quantity || 0}, requested: ${item.quantity}`
        );
      }
    }

    // 4. Create Transfer record
    const transfer = await (prisma as any).stockTransfer.create({
      data: {
        fromBranchId: data.fromBranchId,
        toBranchId: data.toBranchId,
        requestedBy: userId,
        status: "PENDING",
        notes: data.notes || null,
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: {
          include: {
            transfer: false,
          },
        },
        fromBranch: { select: { id: true, name: true } },
        toBranch: { select: { id: true, name: true } },
      },
    });

    // Notify Destination Branch and Tenant Admins
    await (prisma as any).notification.create({
      data: {
        tenantId,
        branchId: data.toBranchId,
        title: "New Transfer Request",
        message: `Transfer request #${transfer.id.substring(0, 8)} created from ${fromBranch.name} to ${toBranch.name}.`,
        type: "SYSTEM",
      },
    });

    await AuditService.log({
      tenantId,
      branchId: data.fromBranchId,
      userId,
      action: "STOCK_TRANSFER_REQUESTED",
      details: { transferId: transfer.id, fromBranch: fromBranch.name, toBranch: toBranch.name },
    });

    return transfer;
  }

  /**
   * List Transfers
   */
  static async listTransfers(
    tenantId: string,
    query: ListTransfersQuery,
    userRole: string,
    userBranchId?: string | null
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      fromBranch: { tenantId },
    };

    if (["BRANCH_MANAGER", "CASHIER"].includes(userRole) && userBranchId) {
      where.OR = [
        { fromBranchId: userBranchId },
        { toBranchId: userBranchId },
      ];
    } else if (query.branchId) {
      where.OR = [
        { fromBranchId: query.branchId },
        { toBranchId: query.branchId },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    const [total, transfers] = await Promise.all([
      (prisma as any).stockTransfer.count({ where }),
      (prisma as any).stockTransfer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          fromBranch: { select: { id: true, name: true } },
          toBranch: { select: { id: true, name: true } },
          items: true,
        },
      }),
    ]);

    return {
      data: transfers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get Transfer Details
   */
  static async getTransferDetails(transferId: string, tenantId: string) {
    const transfer = await (prisma as any).stockTransfer.findFirst({
      where: {
        id: transferId,
        fromBranch: { tenantId },
      },
      include: {
        fromBranch: true,
        toBranch: true,
        items: true,
      },
    });

    if (!transfer) {
      throw new Error("Transfer not found");
    }

    // Populate product details for items
    const productIds = transfer.items.map((i: any) => i.productId);
    const products = await (prisma as any).product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true, unit: true, basePrice: true },
    });

    const productMap = new Map(products.map((p: any) => [p.id, p]));

    const enrichedItems = transfer.items.map((i: any) => ({
      ...i,
      product: productMap.get(i.productId) || null,
    }));

    return {
      ...transfer,
      items: enrichedItems,
    };
  }

  /**
   * Approve Transfer Request (Regional Admin or Company Owner)
   */
  static async approveTransfer(
    transferId: string,
    tenantId: string,
    approverId: string
  ) {
    const transfer = await (prisma as any).stockTransfer.findFirst({
      where: {
        id: transferId,
        fromBranch: { tenantId },
      },
    });

    if (!transfer) {
      throw new Error("Transfer not found");
    }

    if (transfer.status !== "PENDING") {
      throw new Error(`Cannot approve a transfer with status ${transfer.status}`);
    }

    const updated = await (prisma as any).stockTransfer.update({
      where: { id: transferId },
      data: {
        status: "APPROVED",
        approvedBy: approverId,
      },
    });

    await AuditService.log({
      tenantId,
      userId: approverId,
      action: "STOCK_TRANSFER_APPROVED",
      details: { transferId },
    });

    return updated;
  }

  /**
   * Reject Transfer Request
   */
  static async rejectTransfer(
    transferId: string,
    tenantId: string,
    userId: string,
    reason: string
  ) {
    const transfer = await (prisma as any).stockTransfer.findFirst({
      where: {
        id: transferId,
        fromBranch: { tenantId },
      },
    });

    if (!transfer) {
      throw new Error("Transfer not found");
    }

    if (transfer.status !== "PENDING") {
      throw new Error(`Cannot reject a transfer with status ${transfer.status}`);
    }

    const updated = await (prisma as any).stockTransfer.update({
      where: { id: transferId },
      data: {
        status: "REJECTED",
        rejectionReason: reason,
        approvedBy: userId,
      },
    });

    await AuditService.log({
      tenantId,
      userId,
      action: "STOCK_TRANSFER_REJECTED",
      details: { transferId, reason },
    });

    return updated;
  }

  /**
   * Complete Transfer (Atomic stock deduction & addition)
   */
  static async completeTransfer(
    transferId: string,
    tenantId: string,
    userId: string
  ) {
    const transfer = await (prisma as any).stockTransfer.findFirst({
      where: {
        id: transferId,
        fromBranch: { tenantId },
      },
      include: {
        items: true,
        fromBranch: true,
        toBranch: true,
      },
    });

    if (!transfer) {
      throw new Error("Transfer not found");
    }

    if (transfer.status !== "APPROVED" && transfer.status !== "PENDING") {
      throw new Error(`Transfer cannot be completed from status "${transfer.status}"`);
    }

    // Execute atomic transfer transaction
    const completed = await (prisma as any).$transaction(async (tx: any) => {
      for (const item of transfer.items) {
        // 1. Deduct from source branch
        const fromInv = await tx.inventory.findFirst({
          where: {
            branchId: transfer.fromBranchId,
            productId: item.productId,
          },
        });

        if (!fromInv || fromInv.quantity < item.quantity) {
          throw new Error(
            `Insufficient stock at source branch ${transfer.fromBranch.name} to complete transfer.`
          );
        }

        await tx.inventory.update({
          where: { id: fromInv.id },
          data: { quantity: fromInv.quantity - item.quantity },
        });

        // 2. Add to destination branch
        const toInv = await tx.inventory.findFirst({
          where: {
            branchId: transfer.toBranchId,
            productId: item.productId,
          },
        });

        if (toInv) {
          await tx.inventory.update({
            where: { id: toInv.id },
            data: { quantity: toInv.quantity + item.quantity },
          });
        } else {
          await tx.inventory.create({
            data: {
              branchId: transfer.toBranchId,
              productId: item.productId,
              quantity: item.quantity,
              minStockLevel: fromInv.minStockLevel || 10,
              lowStockThreshold: fromInv.lowStockThreshold || 5,
            },
          });
        }

        // 3. Log stock movements for both branches
        await tx.stockMovement.create({
          data: {
            branchId: transfer.fromBranchId,
            productId: item.productId,
            type: "TRANSFER_OUT",
            quantity: -item.quantity,
            reason: `Transfer to ${transfer.toBranch.name}`,
            referenceId: transfer.id,
            performedBy: userId,
          },
        });

        await tx.stockMovement.create({
          data: {
            branchId: transfer.toBranchId,
            productId: item.productId,
            type: "TRANSFER_IN",
            quantity: item.quantity,
            reason: `Transfer from ${transfer.fromBranch.name}`,
            referenceId: transfer.id,
            performedBy: userId,
          },
        });
      }

      // 4. Mark transfer as COMPLETED
      const updatedTransfer = await tx.stockTransfer.update({
        where: { id: transfer.id },
        data: {
          status: "COMPLETED",
        },
      });

      return updatedTransfer;
    });

    await AuditService.log({
      tenantId,
      branchId: transfer.fromBranchId,
      userId,
      action: "STOCK_TRANSFER_COMPLETED",
      details: { transferId: transfer.id, itemsCount: transfer.items.length },
    });

    return completed;
  }
}
