import { prisma } from "../../app/lib/prisma";
import { AuditService } from "../../app/lib/audit";
import {
  PushSalesBatchInput,
  PushStockBatchInput,
  PullUpdatesQuery,
  ListSyncLogsQuery,
} from "./sync.validation";

export class SyncService {
  /**
   * Push Offline Sales from Edge (Idempotent & Additive)
   */
  static async pushSales(tenantId: string, data: PushSalesBatchInput) {
    const { branchId, sales } = data;

    // Verify branch belongs to tenant
    const branch = await (prisma as any).branch.findFirst({
      where: { id: branchId, tenantId },
    });

    if (!branch) {
      throw new Error("Branch not found or unauthorized");
    }

    const processed = [];
    const duplicates = [];
    const errors = [];

    for (const saleEvent of sales) {
      try {
        // Idempotency check: verify if receiptNo already exists
        const existingSale = await (prisma as any).sale.findUnique({
          where: { receiptNo: saleEvent.receiptNo },
        });

        if (existingSale) {
          duplicates.push({
            receiptNo: saleEvent.receiptNo,
            localId: saleEvent.localId,
            status: "ALREADY_SYNCED",
          });
          continue;
        }

        // Additive sync: insert sale and deduct stock
        const sale = await (prisma as any).$transaction(async (tx: any) => {
          const createdSale = await tx.sale.create({
            data: {
              tenantId,
              branchId,
              userId: saleEvent.userId,
              receiptNo: saleEvent.receiptNo,
              subTotal: saleEvent.subTotal,
              discount: saleEvent.discount,
              tax: saleEvent.tax,
              totalAmount: saleEvent.totalAmount,
              paymentMethod: saleEvent.paymentMethod,
              status: saleEvent.status,
              notes: saleEvent.notes || null,
              managerApprovedBy: saleEvent.managerApprovedBy || null,
              prescriptionRef: saleEvent.prescriptionRef || null,
              localCreatedAt: new Date(saleEvent.localCreatedAt),
              syncedAt: new Date(),
              items: {
                create: saleEvent.items.map(item => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  subTotal: item.subTotal,
                })),
              },
            },
          });

          // Adjust cloud inventory and log stock movements
          for (const item of saleEvent.items) {
            const inv = await tx.inventory.findFirst({
              where: { branchId, productId: item.productId },
            });

            if (inv) {
              await tx.inventory.update({
                where: { id: inv.id },
                data: { quantity: Math.max(0, inv.quantity - item.quantity) },
              });
            }

            await tx.stockMovement.create({
              data: {
                branchId,
                productId: item.productId,
                type: "SALE",
                quantity: -item.quantity,
                reason: `Offline Sync POS Sale #${saleEvent.receiptNo}`,
                referenceId: createdSale.id,
                performedBy: saleEvent.userId,
              },
            });
          }

          return createdSale;
        });

        processed.push({
          localId: saleEvent.localId,
          receiptNo: sale.receiptNo,
          cloudId: sale.id,
          status: "SYNCED",
        });
      } catch (err: any) {
        errors.push({
          receiptNo: saleEvent.receiptNo,
          localId: saleEvent.localId,
          error: err.message,
        });
      }
    }

    // Record Sync Log
    await (prisma as any).syncLog.create({
      data: {
        branchId,
        direction: "BRANCH_TO_CLOUD",
        status: errors.length === 0 ? "SUCCESS" : "FAILED",
        payloadType: "SALES_PUSH",
        payload: {
          total: sales.length,
          processed: processed.length,
          duplicates: duplicates.length,
          errors: errors.length,
        },
        error: errors.length > 0 ? JSON.stringify(errors) : null,
        processedAt: new Date(),
      },
    });

    if (errors.length > 0) {
      // Trigger notification for failed sync items
      await (prisma as any).notification.create({
        data: {
          tenantId,
          branchId,
          title: "Sync Warning: Offline Sales Push",
          message: `${errors.length} sale transactions failed during branch sync at ${branch.name}.`,
          type: "SYNC_FAILURE",
        },
      });
    }

    return {
      totalReceived: sales.length,
      syncedCount: processed.length,
      duplicateCount: duplicates.length,
      errorCount: errors.length,
      synced: processed,
      duplicates,
      errors,
    };
  }

  /**
   * Push Stock Adjustments from Edge
   */
  static async pushStockAdjustments(tenantId: string, data: PushStockBatchInput) {
    const { branchId, adjustments } = data;

    const branch = await (prisma as any).branch.findFirst({
      where: { id: branchId, tenantId },
    });

    if (!branch) {
      throw new Error("Branch not found or unauthorized");
    }

    const processed = [];
    const errors = [];

    for (const adj of adjustments) {
      try {
        await (prisma as any).$transaction(async (tx: any) => {
          let inv = await tx.inventory.findFirst({
            where: { branchId, productId: adj.productId },
          });

          if (inv) {
            await tx.inventory.update({
              where: { id: inv.id },
              data: {
                quantity: Math.max(0, inv.quantity + adj.quantityChange),
                ...(adj.batchNumber && { batchNumber: adj.batchNumber }),
                ...(adj.expiryDate && { expiryDate: new Date(adj.expiryDate) }),
              },
            });
          } else {
            await tx.inventory.create({
              data: {
                branchId,
                productId: adj.productId,
                quantity: Math.max(0, adj.quantityChange),
                batchNumber: adj.batchNumber || null,
                expiryDate: adj.expiryDate ? new Date(adj.expiryDate) : null,
              },
            });
          }

          await tx.stockMovement.create({
            data: {
              branchId,
              productId: adj.productId,
              type: adj.type,
              quantity: adj.quantityChange,
              reason: adj.reason || "Offline Stock Sync",
            },
          });
        });

        processed.push({ localId: adj.localId, status: "SYNCED" });
      } catch (err: any) {
        errors.push({ localId: adj.localId, error: err.message });
      }
    }

    await (prisma as any).syncLog.create({
      data: {
        branchId,
        direction: "BRANCH_TO_CLOUD",
        status: errors.length === 0 ? "SUCCESS" : "FAILED",
        payloadType: "STOCK_PUSH",
        payload: { total: adjustments.length, synced: processed.length, errors: errors.length },
        error: errors.length > 0 ? JSON.stringify(errors) : null,
        processedAt: new Date(),
      },
    });

    return {
      totalReceived: adjustments.length,
      syncedCount: processed.length,
      errorCount: errors.length,
      synced: processed,
      errors,
    };
  }

  /**
   * Pull Cloud Updates to Edge (Cloud catalog/pricing wins)
   */
  static async pullUpdates(tenantId: string, query: PullUpdatesQuery) {
    const { branchId, lastSyncedAt } = query;

    const branch = await (prisma as any).branch.findFirst({
      where: { id: branchId, tenantId },
      include: { tenant: true },
    });

    if (!branch) {
      throw new Error("Branch not found or unauthorized");
    }

    const sinceDate = lastSyncedAt ? new Date(lastSyncedAt) : new Date(0);

    const [products, priceOverrides, users, permissions] = await Promise.all([
      // Central Catalog
      (prisma as any).product.findMany({
        where: {
          tenantId,
          updatedAt: { gte: sinceDate },
        },
      }),
      // Branch Price Overrides
      (prisma as any).branchProduct.findMany({
        where: {
          branchId,
          updatedAt: { gte: sinceDate },
        },
      }),
      // Branch Staff
      (prisma as any).user.findMany({
        where: {
          tenantId,
          OR: [{ branchId }, { branchId: null }, { role: "COMPANY_OWNER" }, { role: "REGIONAL_ADMIN" }],
          updatedAt: { gte: sinceDate },
        },
        select: {
          id: true,
          tenantId: true,
          branchId: true,
          role: true,
          username: true,
          passwordHash: true, // required for offline auth proxy
          name: true,
          isActive: true,
          updatedAt: true,
        },
      }),
      // Role Permissions
      (prisma as any).rolePermission.findMany(),
    ]);

    const serverTimestamp = new Date();

    // Record pull sync log
    await (prisma as any).syncLog.create({
      data: {
        branchId,
        direction: "CLOUD_TO_BRANCH",
        status: "SUCCESS",
        payloadType: "PULL_UPDATES",
        payload: {
          productsCount: products.length,
          overridesCount: priceOverrides.length,
          usersCount: users.length,
        },
        processedAt: serverTimestamp,
      },
    });

    return {
      serverTimestamp,
      tenant: {
        id: branch.tenant.id,
        name: branch.tenant.name,
        tier: branch.tenant.tier,
      },
      branch: {
        id: branch.id,
        name: branch.name,
        location: branch.location,
      },
      catalog: products.map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        basePrice: Number(p.basePrice),
        category: p.category,
        unit: p.unit,
        isControlled: p.isControlled,
        requiresPrescription: p.requiresPrescription,
        isActive: p.isActive,
        updatedAt: p.updatedAt,
      })),
      priceOverrides: priceOverrides.map((o: any) => ({
        productId: o.productId,
        price: Number(o.price),
        updatedAt: o.updatedAt,
      })),
      staff: users,
      rolePermissions: permissions,
    };
  }

  /**
   * Get Sync Status for Branch
   */
  static async getSyncStatus(tenantId: string, branchId: string) {
    const branch = await (prisma as any).branch.findFirst({
      where: { id: branchId, tenantId },
    });

    if (!branch) {
      throw new Error("Branch not found");
    }

    const lastSyncLog = await (prisma as any).syncLog.findFirst({
      where: { branchId },
      orderBy: { createdAt: "desc" },
    });

    const failedCount = await (prisma as any).syncLog.count({
      where: { branchId, status: "FAILED" },
    });

    return {
      branchId,
      branchName: branch.name,
      lastSyncedAt: lastSyncLog ? lastSyncLog.createdAt : null,
      lastSyncStatus: lastSyncLog ? lastSyncLog.status : "NEVER_SYNCED",
      recentFailedSyncs: failedCount,
      isHealthy: failedCount === 0,
    };
  }

  /**
   * List Sync Logs
   */
  static async listSyncLogs(
    tenantId: string,
    query: ListSyncLogsQuery,
    userRole: string,
    userBranchId?: string | null
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      branch: { tenantId },
    };

    if (["BRANCH_MANAGER", "CASHIER"].includes(userRole) && userBranchId) {
      where.branchId = userBranchId;
    } else if (query.branchId) {
      where.branchId = query.branchId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.direction) {
      where.direction = query.direction;
    }

    const [total, logs] = await Promise.all([
      (prisma as any).syncLog.count({ where }),
      (prisma as any).syncLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          branch: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
