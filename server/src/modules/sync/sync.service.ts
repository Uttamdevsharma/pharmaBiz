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

        // Additive sync: insert sale, record payments, accounting, and deduct stock
        const sale = await (prisma as any).$transaction(async (tx: any) => {
          const totalAmt = Number(saleEvent.totalAmount);
          const paidAmt = saleEvent.paidAmount !== undefined ? Number(saleEvent.paidAmount) : totalAmt;
          const actualPaid = Math.min(paidAmt, totalAmt);
          const dueAmt = saleEvent.dueAmount !== undefined ? Number(saleEvent.dueAmount) : Math.max(0, totalAmt - paidAmt);
          const changeAmt = saleEvent.changeAmount !== undefined ? Number(saleEvent.changeAmount) : Math.max(0, paidAmt - totalAmt);

          // Find products and inventory batches for purchase price / COGS fallback
          const productIds = saleEvent.items.map((it) => it.productId);
          const [productsInDb, inventoriesInDb] = await Promise.all([
            tx.product.findMany({
              where: { id: { in: productIds } },
              select: { id: true, basePrice: true },
            }),
            tx.inventory.findMany({
              where: { branchId, productId: { in: productIds } },
              select: { id: true, productId: true, purchasePrice: true, sellingPrice: true },
              orderBy: { createdAt: "desc" },
            }),
          ]);

          const productPriceMap = new Map(productsInDb.map((p: any) => [p.id, Number(p.basePrice || 0)]));
          const inventoryPriceMap = new Map(
            inventoriesInDb.map((inv: any) => [inv.productId, Number(inv.purchasePrice || 0)])
          );

          const preparedSaleItems = saleEvent.items.map((item) => {
            const mult = Number(item.unitMultiplier) || 1;
            const itemQty = Number(item.quantity) || 1;
            const lowestUnits = Number(item.lowestUnitQuantity) || itemQty * mult;
            const pPrice =
              item.purchasePrice !== undefined && item.purchasePrice !== null && Number(item.purchasePrice) > 0
                ? Number(item.purchasePrice)
                : inventoryPriceMap.get(item.productId) || productPriceMap.get(item.productId) || 0;

            return {
              productId: item.productId,
              inventoryId: item.inventoryId || null,
              inventoryLocationId: item.inventoryLocationId || null,
              batchNumber: item.batchNumber || null,
              unitType: item.unitType || "PIECE",
              unitMultiplier: mult,
              quantity: itemQty,
              lowestUnitQuantity: lowestUnits,
              unitPrice: Number(item.unitPrice),
              purchasePrice: pPrice,
              subTotal: Number(item.subTotal),
            };
          });

          // Resolve financial account
          let financialAccount: any = null;
          if (saleEvent.financialAccountId) {
            financialAccount = await tx.financialAccount.findFirst({
              where: { id: saleEvent.financialAccountId, tenantId, isActive: true },
            });
          }

          if (!financialAccount) {
            const pMethod = String(saleEvent.paymentMethod).toUpperCase();
            const notesLower = (saleEvent.notes || "").toLowerCase();

            if (pMethod === "BKASH" || (pMethod === "MOBILE" && notesLower.includes("bkash"))) {
              financialAccount = await tx.financialAccount.findFirst({
                where: {
                  tenantId,
                  branchId,
                  isActive: true,
                  OR: [{ type: "BKASH" }, { name: { contains: "bkash", mode: "insensitive" } }],
                },
              });
            } else if (pMethod === "NAGAD" || (pMethod === "MOBILE" && notesLower.includes("nagad"))) {
              financialAccount = await tx.financialAccount.findFirst({
                where: {
                  tenantId,
                  branchId,
                  isActive: true,
                  OR: [{ type: "NAGAD" }, { name: { contains: "nagad", mode: "insensitive" } }],
                },
              });
            } else if (pMethod === "BANK" || pMethod === "CARD") {
              financialAccount = await tx.financialAccount.findFirst({
                where: {
                  tenantId,
                  branchId,
                  type: "BANK",
                  isActive: true,
                },
                orderBy: { isDefault: "desc" },
              });
            }

            if (!financialAccount) {
              financialAccount = await tx.financialAccount.findFirst({
                where: {
                  tenantId,
                  branchId,
                  type: "CASH",
                  isActive: true,
                },
                orderBy: { isDefault: "desc" },
              });
            }

            if (!financialAccount) {
              financialAccount = await tx.financialAccount.findFirst({
                where: { tenantId, branchId, isActive: true },
              });
            }
          }

          let resolvedPaymentMethod = saleEvent.paymentMethod;
          const pMethodUpper = String(saleEvent.paymentMethod || "").toUpperCase();
          const notesText = `${saleEvent.notes || ""} ${financialAccount?.name || ""}`.toLowerCase();
          if (pMethodUpper === "MOBILE") {
            if (notesText.includes("bkash") || financialAccount?.type === "BKASH") {
              resolvedPaymentMethod = "BKASH";
            } else if (notesText.includes("nagad") || financialAccount?.type === "NAGAD") {
              resolvedPaymentMethod = "NAGAD";
            }
          }

          const createdSale = await tx.sale.create({
            data: {
              tenantId,
              branchId,
              userId: saleEvent.userId,
              receiptNo: saleEvent.receiptNo,
              financialAccountId: financialAccount ? financialAccount.id : saleEvent.financialAccountId || null,
              customerName: saleEvent.customerName || "Walk-in Customer",
              customerPhone: saleEvent.customerPhone || null,
              subTotal: saleEvent.subTotal,
              discount: saleEvent.discount,
              tax: saleEvent.tax,
              totalAmount: totalAmt,
              paidAmount: actualPaid,
              dueAmount: dueAmt,
              changeAmount: changeAmt,
              paymentMethod: resolvedPaymentMethod as any,
              status: saleEvent.status,
              notes: saleEvent.notes || null,
              managerApprovedBy: saleEvent.managerApprovedBy || null,
              prescriptionRef: saleEvent.prescriptionRef || null,
              localCreatedAt: new Date(saleEvent.localCreatedAt),
              syncedAt: new Date(),
              items: {
                create: preparedSaleItems,
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

            const itemPurchasePrice =
              preparedSaleItems.find((i: any) => i.productId === item.productId)?.purchasePrice || 0;

            await tx.stockMovement.create({
              data: {
                branchId,
                productId: item.productId,
                type: "SALE",
                quantity: -item.quantity,
                unitPrice: itemPurchasePrice,
                reason: `Offline Sync POS Sale #${saleEvent.receiptNo}`,
                referenceId: createdSale.id,
                performedBy: saleEvent.userId,
              },
            });
          }

          // Update financial account balance and add transaction ledger
          if (financialAccount && actualPaid > 0) {
            await tx.financialAccount.update({
              where: { id: financialAccount.id },
              data: { balance: { increment: actualPaid } },
            });

            await tx.financialTransaction.create({
              data: {
                tenantId,
                branchId,
                destinationAccountId: financialAccount.id,
                amount: actualPaid,
                type: "SALE_PAYMENT",
                reference: saleEvent.receiptNo,
                note: `Offline Sync POS Sale Receipt #${saleEvent.receiptNo} via ${financialAccount.name}`,
                userId: saleEvent.userId,
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
