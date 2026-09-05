import { prisma } from "../../app/lib/prisma";
import { AuditService } from "../../app/lib/audit";
import {
  CreateTransferInput,
  ReceiveTransferInput,
  SettleTransferInput,
  ListTransfersQuery,
} from "./transfer.validation";

export class TransferService {
  /**
   * 1. Create & Dispatch Inter-Branch Stock Transfer
   * Stock is immediately deducted from source branch inventory upon dispatch.
   */
  static async createTransfer(
    tenantId: string,
    userId: string,
    data: CreateTransferInput
  ) {
    if (data.fromBranchId === data.toBranchId) {
      throw new Error("Source and destination branches cannot be the same.");
    }

    // 1. Verify branches belong to tenant
    const [fromBranch, toBranch] = await Promise.all([
      (prisma as any).branch.findFirst({ where: { id: data.fromBranchId, tenantId, isActive: true } }),
      (prisma as any).branch.findFirst({ where: { id: data.toBranchId, tenantId, isActive: true } }),
    ]);

    if (!fromBranch || !toBranch) {
      throw new Error("One or both branches are invalid or inactive.");
    }

    // 2. Validate items and compute sent valuation based strictly on cost price
    let sentTotalValue = 0;
    const validatedItems: any[] = [];

    for (const item of data.items) {
      let inv: any = null;

      if (item.inventoryId) {
        inv = await (prisma as any).inventory.findFirst({
          where: {
            id: item.inventoryId,
            branchId: data.fromBranchId,
          },
        });
      }

      if (!inv) {
        inv = await (prisma as any).inventory.findFirst({
          where: {
            branchId: data.fromBranchId,
            productId: item.productId,
            ...(item.batchNumber ? { batchNumber: item.batchNumber } : {}),
          },
        });
      }

      const product = await (prisma as any).product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new Error(`Product ID ${item.productId} not found.`);
      }

      const availableQty = inv?.quantity || 0;
      if (availableQty < item.sentQuantity) {
        throw new Error(
          `Insufficient stock at ${fromBranch.name} for "${product.name}"${
            item.batchNumber ? ` (Batch: ${item.batchNumber})` : ""
          }. Available: ${availableQty}, Requested: ${item.sentQuantity}`
        );
      }

      // Use specified purchase/cost price or fallback to inventory purchase price
      const effectiveCostPrice = Number(item.costPrice ?? inv?.purchasePrice ?? product.basePrice ?? 0);
      const sentValue = Number(item.sentQuantity) * effectiveCostPrice;
      sentTotalValue += sentValue;

      validatedItems.push({
        ...item,
        inventory: inv,
        product,
        costPrice: effectiveCostPrice,
        sentValue,
        batchNumber: item.batchNumber || inv?.batchNumber || "DEFAULT",
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : inv?.expiryDate || null,
        packageType: item.packageType || inv?.packageType || product.defaultPackType || "PIECE",
      });
    }

    // 3. Execute atomic dispatch transaction
    const transfer = await (prisma as any).$transaction(async (tx: any) => {
      // A. Create StockTransfer record in IN_TRANSIT status
      const createdTransfer = await tx.stockTransfer.create({
        data: {
          fromBranchId: data.fromBranchId,
          toBranchId: data.toBranchId,
          status: "IN_TRANSIT",
          requestedBy: userId,
          sentTotalValue,
          receivedTotalValue: 0,
          damagedTotalValue: 0,
          missingTotalValue: 0,
          payableAmount: 0,
          paidAmount: 0,
          remainingDue: 0,
          settlementStatus: "UNPAID",
          notes: data.notes || null,
          // Professional Courier Logistics & Delivery Details
          courierName: data.courierName || null,
          courierHub: data.courierHub || null,
          trackingId: data.trackingId || null,
          deliveryPersonName: data.deliveryPersonName || null,
          deliveryPersonContact: data.deliveryPersonContact || null,
          dispatchDate: data.dispatchDate ? new Date(data.dispatchDate) : new Date(),
          deliveryNote: data.deliveryNote || null,
          items: {
            create: validatedItems.map((item) => ({
              productId: item.productId,
              inventoryId: item.inventory?.id || null,
              batchNumber: item.batchNumber,
              expiryDate: item.expiryDate,
              packageType: item.packageType,
              packageQuantity: item.packageQuantity || null,
              conversionFactor: item.conversionFactor || 1,
              sentQuantity: item.sentQuantity,
              receivedQuantity: 0,
              damagedQuantity: 0,
              missingQuantity: 0,
              costPrice: item.costPrice,
              sentValue: item.sentValue,
              receivedValue: 0,
              damagedValue: 0,
              missingValue: 0,
              itemStatus: "PENDING",
            })),
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, genericName: true, sku: true, unit: true },
              },
            },
          },
          fromBranch: { select: { id: true, name: true, location: true } },
          toBranch: { select: { id: true, name: true, location: true } },
        },
      });

      // B. Deduct stock from source branch immediately
      for (const item of validatedItems) {
        if (item.inventory) {
          await tx.inventory.update({
            where: { id: item.inventory.id },
            data: {
              quantity: { decrement: item.sentQuantity },
            },
          });
        }

        // C. Record StockMovement for audit
        await tx.stockMovement.create({
          data: {
            branchId: data.fromBranchId,
            productId: item.productId,
            inventoryId: item.inventory?.id || null,
            batchNumber: item.batchNumber,
            type: "TRANSFER_OUT",
            quantity: -item.sentQuantity,
            unitPrice: item.costPrice,
            reason: `Dispatched to ${toBranch.name} (Transfer #${createdTransfer.id.substring(0, 8)})`,
            referenceId: createdTransfer.id,
            performedBy: userId,
          },
        });
      }

      return createdTransfer;
    });

    // 4. Create Notification for Destination Branch
    await (prisma as any).notification.create({
      data: {
        tenantId,
        branchId: data.toBranchId,
        title: "Incoming Stock Shipment",
        message: `Transfer #${transfer.id.substring(0, 8)} sent from ${fromBranch.name}. Total cost valuation: ৳${sentTotalValue.toFixed(2)}.`,
        type: "SYSTEM",
      },
    });

    await AuditService.log({
      tenantId,
      branchId: data.fromBranchId,
      userId,
      action: "STOCK_TRANSFER_DISPATCHED",
      details: {
        transferId: transfer.id,
        fromBranch: fromBranch.name,
        toBranch: toBranch.name,
        itemsCount: transfer.items.length,
        sentTotalValue,
      },
    });

    return transfer;
  }

  /**
   * 2. Receive Stock at Destination Branch
   * Detailed breakdown: Received, Damaged, and Missing quantities.
   * Only successfully received items are added to destination usable stock.
   * Automatically calculates cost-based payable amount.
   */
  static async receiveTransfer(
    transferId: string,
    tenantId: string,
    userId: string,
    data: ReceiveTransferInput
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
      throw new Error("Transfer record not found.");
    }

    if (transfer.status === "COMPLETED" || transfer.status === "RECEIVED") {
      throw new Error(`This transfer has already been received and finalized.`);
    }

    if (transfer.status === "CANCELLED" || transfer.status === "REJECTED") {
      throw new Error(`Cannot receive a transfer with status ${transfer.status}.`);
    }

    // Map item receipts
    const receiptMap = new Map(data.items.map((i) => [i.itemId, i]));

    let receivedTotalValue = 0;
    let damagedTotalValue = 0;
    let missingTotalValue = 0;

    const itemUpdates: any[] = [];

    for (const item of transfer.items) {
      const receipt = receiptMap.get(item.id);
      if (!receipt) {
        throw new Error(`Missing receiving entry for transfer item ${item.id}.`);
      }

      const receivedQty = Number(receipt.receivedQuantity || 0);
      const damagedQty = Number(receipt.damagedQuantity || 0);
      const missingQty = Number(receipt.missingQuantity || 0);

      const totalAccounted = receivedQty + damagedQty + missingQty;
      if (totalAccounted !== item.sentQuantity) {
        throw new Error(
          `Quantities for product item mismatch sent amount. Sent: ${item.sentQuantity}, Received + Damaged + Missing: ${totalAccounted}.`
        );
      }

      const costPrice = Number(item.costPrice || 0);
      const receivedValue = receivedQty * costPrice;
      const damagedValue = damagedQty * costPrice;
      const missingValue = missingQty * costPrice;

      receivedTotalValue += receivedValue;
      damagedTotalValue += damagedValue;
      missingTotalValue += missingValue;

      let itemStatus = "RECEIVED";
      if (receivedQty === 0 && damagedQty > 0) itemStatus = "DAMAGED";
      else if (receivedQty === 0 && missingQty > 0) itemStatus = "MISSING";
      else if (damagedQty > 0 || missingQty > 0) itemStatus = "PARTIALLY_RECEIVED";

      itemUpdates.push({
        id: item.id,
        productId: item.productId,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        packageType: item.packageType,
        conversionFactor: item.conversionFactor,
        costPrice,
        receivedQuantity: receivedQty,
        damagedQuantity: damagedQty,
        missingQuantity: missingQty,
        receivedValue,
        damagedValue,
        missingValue,
        itemStatus,
        notes: receipt.notes || null,
      });
    }

    const payableAmount = receivedTotalValue;
    const remainingDue = payableAmount;

    // Execute atomic receive transaction
    const finalized = await (prisma as any).$transaction(async (tx: any) => {
      // A. Update each transfer item with inspection metrics
      for (const iu of itemUpdates) {
        await tx.transferItem.update({
          where: { id: iu.id },
          data: {
            receivedQuantity: iu.receivedQuantity,
            damagedQuantity: iu.damagedQuantity,
            missingQuantity: iu.missingQuantity,
            receivedValue: iu.receivedValue,
            damagedValue: iu.damagedValue,
            missingValue: iu.missingValue,
            itemStatus: iu.itemStatus,
            notes: iu.notes,
          },
        });

        // B. Add ONLY received/usable quantity to destination branch inventory
        if (iu.receivedQuantity > 0) {
          // Find or create matching batch inventory at destination branch
          const existingDestInv = await tx.inventory.findFirst({
            where: {
              branchId: transfer.toBranchId,
              productId: iu.productId,
              ...(iu.batchNumber ? { batchNumber: iu.batchNumber } : {}),
            },
          });

          if (existingDestInv) {
            await tx.inventory.update({
              where: { id: existingDestInv.id },
              data: {
                quantity: { increment: iu.receivedQuantity },
                purchasePrice: iu.costPrice,
              },
            });
          } else {
            await tx.inventory.create({
              data: {
                branchId: transfer.toBranchId,
                productId: iu.productId,
                quantity: iu.receivedQuantity,
                initialQuantity: iu.receivedQuantity,
                batchNumber: iu.batchNumber,
                expiryDate: iu.expiryDate,
                packageType: iu.packageType,
                purchasePrice: iu.costPrice,
                minStockLevel: 10,
                lowStockThreshold: 5,
              },
            });
          }

          // Log TRANSFER_IN stock movement
          await tx.stockMovement.create({
            data: {
              branchId: transfer.toBranchId,
              productId: iu.productId,
              batchNumber: iu.batchNumber,
              type: "TRANSFER_IN",
              quantity: iu.receivedQuantity,
              unitPrice: iu.costPrice,
              reason: `Received from ${transfer.fromBranch.name} (Transfer #${transfer.id.substring(0, 8)})`,
              referenceId: transfer.id,
              performedBy: userId,
            },
          });
        }

        // C. Record transit damage stock loss if any
        if (iu.damagedQuantity > 0) {
          await tx.stockMovement.create({
            data: {
              branchId: transfer.toBranchId,
              productId: iu.productId,
              batchNumber: iu.batchNumber,
              type: "DAMAGE",
              quantity: -iu.damagedQuantity,
              unitPrice: iu.costPrice,
              reason: `Transit Damage on Transfer #${transfer.id.substring(0, 8)} from ${transfer.fromBranch.name}`,
              referenceId: transfer.id,
              performedBy: userId,
            },
          });
        }
      }

      // D. Update StockTransfer status and internal metrics
      const updatedTransfer = await tx.stockTransfer.update({
        where: { id: transfer.id },
        data: {
          status: "RECEIVED",
          receivedBy: userId,
          receivedDate: new Date(),
          receivedTotalValue,
          damagedTotalValue,
          missingTotalValue,
          payableAmount: 0,
          paidAmount: 0,
          remainingDue: 0,
          settlementStatus: "PAID",
          notes: data.notes ? `${transfer.notes || ""}\n${data.notes}`.trim() : transfer.notes,
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, genericName: true, sku: true, unit: true },
              },
            },
          },
          fromBranch: { select: { id: true, name: true, location: true } },
          toBranch: { select: { id: true, name: true, location: true } },
        },
      });

      return updatedTransfer;
    });

    await AuditService.log({
      tenantId,
      branchId: transfer.toBranchId,
      userId,
      action: "STOCK_TRANSFER_RECEIVED",
      details: {
        transferId: transfer.id,
        receivedTotalValue,
        damagedTotalValue,
        missingTotalValue,
      },
    });

    return this.getTransferDetails(transferId, tenantId);
  }

  /**
   * 3. Settle Inter-Branch Transfer Payable
   * Debits destination branch account, credits source branch account, updates due & status.
   */
  static async settleTransfer(
    transferId: string,
    tenantId: string,
    userId: string,
    data: SettleTransferInput
  ) {
    const transfer = await (prisma as any).stockTransfer.findFirst({
      where: {
        id: transferId,
        fromBranch: { tenantId },
      },
      include: {
        fromBranch: true,
        toBranch: true,
        settlements: true,
      },
    });

    if (!transfer) {
      throw new Error("Transfer record not found.");
    }

    if (transfer.status !== "RECEIVED" && transfer.status !== "COMPLETED") {
      throw new Error(`Transfer must be received before settlement can be recorded.`);
    }

    const currentRemainingDue = Number(transfer.remainingDue || 0);
    if (currentRemainingDue <= 0) {
      throw new Error("This transfer is already fully settled.");
    }

    const settlementAmount = Number(data.amount);
    if (settlementAmount <= 0) {
      throw new Error("Settlement amount must be greater than zero.");
    }

    if (settlementAmount > currentRemainingDue + 0.05) {
      throw new Error(
        `Settlement amount (৳${settlementAmount.toFixed(2)}) exceeds remaining due (৳${currentRemainingDue.toFixed(2)}).`
      );
    }

    // Validate paying account belongs to Destination Branch
    const sourceAccount = await (prisma as any).financialAccount.findFirst({
      where: {
        id: data.sourceAccountId,
        tenantId,
        branchId: transfer.toBranchId,
        isActive: true,
      },
    });

    if (!sourceAccount) {
      throw new Error(`Paying financial account not found at ${transfer.toBranch.name}.`);
    }

    // Validate receiving account belongs to Source Branch
    const destAccount = await (prisma as any).financialAccount.findFirst({
      where: {
        id: data.destinationAccountId,
        tenantId,
        branchId: transfer.fromBranchId,
        isActive: true,
      },
    });

    if (!destAccount) {
      throw new Error(`Receiving financial account not found at ${transfer.fromBranch.name}.`);
    }

    // Execute atomic settlement transaction
    const result = await (prisma as any).$transaction(async (tx: any) => {
      // 1. Deduct from paying account (Destination branch)
      await tx.financialAccount.update({
        where: { id: sourceAccount.id },
        data: {
          balance: { decrement: settlementAmount },
        },
      });

      // 2. Add to receiving account (Source branch)
      await tx.financialAccount.update({
        where: { id: destAccount.id },
        data: {
          balance: { increment: settlementAmount },
        },
      });

      // 3. Log Financial Transactions for both accounts
      await tx.financialTransaction.create({
        data: {
          tenantId,
          branchId: transfer.toBranchId,
          sourceAccountId: sourceAccount.id,
          amount: settlementAmount,
          type: "TRANSFER",
          reference: data.reference || `Transfer #${transfer.id.substring(0, 8)} Settlement`,
          note: `Inter-branch payment to ${transfer.fromBranch.name} (${destAccount.name})`,
          userId,
        },
      });

      await tx.financialTransaction.create({
        data: {
          tenantId,
          branchId: transfer.fromBranchId,
          destinationAccountId: destAccount.id,
          amount: settlementAmount,
          type: "TRANSFER",
          reference: data.reference || `Transfer #${transfer.id.substring(0, 8)} Settlement`,
          note: `Inter-branch payment received from ${transfer.toBranch.name} (${sourceAccount.name})`,
          userId,
        },
      });

      // 4. Create TransferSettlement record
      const settlement = await tx.transferSettlement.create({
        data: {
          transferId: transfer.id,
          tenantId,
          fromBranchId: transfer.fromBranchId,
          toBranchId: transfer.toBranchId,
          sourceAccountId: sourceAccount.id,
          destinationAccountId: destAccount.id,
          amount: settlementAmount,
          paymentMethod: data.paymentMethod || sourceAccount.type || "CASH",
          reference: data.reference || null,
          notes: data.notes || null,
          paidBy: userId,
        },
      });

      // 5. Update StockTransfer payable & status
      const newPaidAmount = Number(transfer.paidAmount || 0) + settlementAmount;
      const newRemainingDue = Math.max(0, Number(transfer.payableAmount || 0) - newPaidAmount);
      const newSettlementStatus = newRemainingDue <= 0.01 ? "PAID" : "PARTIALLY_PAID";

      const updated = await tx.stockTransfer.update({
        where: { id: transfer.id },
        data: {
          paidAmount: newPaidAmount,
          remainingDue: newRemainingDue,
          settlementStatus: newSettlementStatus,
          settlementDate: new Date(),
          status: newSettlementStatus === "PAID" ? "COMPLETED" : transfer.status,
        },
      });

      return { settlement, updated };
    });

    await AuditService.log({
      tenantId,
      branchId: transfer.toBranchId,
      userId,
      action: "STOCK_TRANSFER_SETTLED",
      details: {
        transferId: transfer.id,
        amount: settlementAmount,
        payingAccount: sourceAccount.name,
        receivingAccount: destAccount.name,
        settlementStatus: result.updated.settlementStatus,
      },
    });

    return this.getTransferDetails(transferId, tenantId);
  }

  /**
   * 4. List Transfers with Filtering
   */
  static async listTransfers(
    tenantId: string,
    query: ListTransfersQuery,
    userRole: string,
    userBranchId?: string | null
  ) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
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

    if (query.settlementStatus) {
      where.settlementStatus = query.settlementStatus;
    }

    const [total, transfers] = await Promise.all([
      (prisma as any).stockTransfer.count({ where }),
      (prisma as any).stockTransfer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          fromBranch: { select: { id: true, name: true, location: true } },
          toBranch: { select: { id: true, name: true, location: true } },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  genericName: true,
                  sku: true,
                  unit: true,
                  category: true,
                  defaultPackType: true,
                  stripsPerBox: true,
                  tabletsPerStrip: true,
                },
              },
            },
          },
          settlements: {
            include: {
              sourceAccount: { select: { id: true, name: true, type: true } },
              destinationAccount: { select: { id: true, name: true, type: true } },
            },
          },
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
   * 5. Get Transfer Details
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
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                genericName: true,
                sku: true,
                unit: true,
                basePrice: true,
                category: true,
                defaultPackType: true,
                stripsPerBox: true,
                tabletsPerStrip: true,
              },
            },
          },
        },
        settlements: {
          include: {
            sourceAccount: { select: { id: true, name: true, type: true, accountNumber: true } },
            destinationAccount: { select: { id: true, name: true, type: true, accountNumber: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!transfer) {
      throw new Error("Transfer not found.");
    }

    return transfer;
  }

  /**
   * 6. Cancel Pending Transfer
   */
  static async cancelTransfer(transferId: string, tenantId: string, userId: string) {
    const transfer = await (prisma as any).stockTransfer.findFirst({
      where: {
        id: transferId,
        fromBranch: { tenantId },
      },
      include: {
        items: true,
        fromBranch: true,
      },
    });

    if (!transfer) {
      throw new Error("Transfer not found.");
    }

    if (transfer.status !== "IN_TRANSIT" && transfer.status !== "PENDING") {
      throw new Error(`Cannot cancel a transfer with status ${transfer.status}.`);
    }

    // Refund deducted stock back to source branch
    const cancelled = await (prisma as any).$transaction(async (tx: any) => {
      for (const item of transfer.items) {
        if (item.inventoryId) {
          await tx.inventory.update({
            where: { id: item.inventoryId },
            data: {
              quantity: { increment: item.sentQuantity },
            },
          });
        }

        await tx.stockMovement.create({
          data: {
            branchId: transfer.fromBranchId,
            productId: item.productId,
            batchNumber: item.batchNumber,
            type: "ADJUSTMENT",
            quantity: item.sentQuantity,
            unitPrice: item.costPrice,
            reason: `Cancelled transfer #${transfer.id.substring(0, 8)} refund`,
            referenceId: transfer.id,
            performedBy: userId,
          },
        });
      }

      return tx.stockTransfer.update({
        where: { id: transfer.id },
        data: {
          status: "CANCELLED",
        },
      });
    });

    await AuditService.log({
      tenantId,
      branchId: transfer.fromBranchId,
      userId,
      action: "STOCK_TRANSFER_CANCELLED",
      details: { transferId: transfer.id },
    });

    return cancelled;
  }

  /**
   * 6. List Damaged Products & Losses from Inter-Branch Transfers
   */
  static async getDamagedProducts(
    tenantId: string,
    userRole?: string,
    userBranchId?: string | null,
    query?: { branchId?: string; search?: string }
  ) {
    const where: any = {
      product: {
        tenantId,
      },
      OR: [
        { damagedQuantity: { gt: 0 } },
        { missingQuantity: { gt: 0 } },
      ],
    };

    if (query?.branchId) {
      where.transfer = {
        OR: [
          { fromBranchId: query.branchId },
          { toBranchId: query.branchId },
        ],
      };
    } else if (userRole === "BRANCH_MANAGER" && userBranchId) {
      where.transfer = {
        OR: [
          { fromBranchId: userBranchId },
          { toBranchId: userBranchId },
        ],
      };
    }

    if (query?.search) {
      where.product = {
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { genericName: { contains: query.search, mode: "insensitive" } },
        ],
      };
    }

    const items = await (prisma as any).transferItem.findMany({
      where,
      orderBy: { transfer: { transferDate: "desc" } },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            genericName: true,
            sku: true,
            unit: true,
            category: true,
            defaultPackType: true,
            stripsPerBox: true,
            tabletsPerStrip: true,
          },
        },
        transfer: {
          select: {
            id: true,
            status: true,
            settlementStatus: true,
            transferDate: true,
            receivedDate: true,
            notes: true,
            fromBranch: { select: { id: true, name: true, location: true } },
            toBranch: { select: { id: true, name: true, location: true } },
          },
        },
      },
    });

    const totalDamagedUnits = items.reduce((acc: number, item: any) => acc + (item.damagedQuantity || 0), 0);
    const totalMissingUnits = items.reduce((acc: number, item: any) => acc + (item.missingQuantity || 0), 0);
    const totalDamagedValue = items.reduce((acc: number, item: any) => acc + Number(item.damagedValue || 0), 0);
    const totalMissingValue = items.reduce((acc: number, item: any) => acc + Number(item.missingValue || 0), 0);
    const totalLossValue = totalDamagedValue + totalMissingValue;

    return {
      summary: {
        totalDamagedUnits,
        totalMissingUnits,
        totalDamagedValue,
        totalMissingValue,
        totalLossValue,
        incidentCount: items.length,
      },
      data: items,
    };
  }
}
