"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplierService = void 0;
const prisma_1 = require("../../app/lib/prisma");
const audit_1 = require("../../app/lib/audit");
class SupplierService {
    /**
     * List suppliers with search and pagination
     */
    static async listSuppliers(tenantId, query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.max(1, Math.min(100, query.limit || 20));
        const skip = (page - 1) * limit;
        const where = { tenantId };
        if (query.search) {
            where.OR = [
                { name: { contains: query.search, mode: "insensitive" } },
                { phone: { contains: query.search, mode: "insensitive" } },
                { company: { contains: query.search, mode: "insensitive" } },
                { contactPerson: { contains: query.search, mode: "insensitive" } },
            ];
        }
        const [suppliers, total] = await Promise.all([
            prisma_1.prisma.supplier.findMany({
                where,
                skip,
                take: limit,
                orderBy: { name: "asc" },
                include: {
                    _count: {
                        select: { purchases: true, inventories: true },
                    },
                },
            }),
            prisma_1.prisma.supplier.count({ where }),
        ]);
        return {
            data: suppliers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Get single supplier with purchase history and financial summary
     */
    static async getSupplierById(id, tenantId) {
        const supplier = await prisma_1.prisma.supplier.findFirst({
            where: { id, tenantId },
            include: {
                purchases: {
                    orderBy: { purchaseDate: "desc" },
                    take: 20,
                    include: {
                        branch: { select: { id: true, name: true } },
                        items: {
                            include: {
                                product: { select: { id: true, name: true, sku: true, unit: true } },
                            },
                        },
                    },
                },
            },
        });
        if (!supplier) {
            throw new Error("Supplier not found");
        }
        return supplier;
    }
    /**
     * Create new supplier
     */
    static async createSupplier(tenantId, userId, data) {
        const supplierName = data.name.trim();
        const supplier = await prisma_1.prisma.supplier.create({
            data: {
                tenantId,
                name: supplierName,
                phone: data.phone.trim(),
                email: data.email?.trim() || null,
                address: data.address?.trim() || null,
                company: data.company?.trim() || supplierName,
                contactPerson: data.contactPerson?.trim() || null,
                totalPurchased: 0,
                totalPaid: 0,
                totalDue: 0,
                isActive: true,
            },
        });
        await audit_1.AuditService.log({
            tenantId,
            userId,
            action: "CREATE_SUPPLIER",
            details: { name: supplier.name, phone: supplier.phone },
        });
        return supplier;
    }
    /**
     * Update supplier
     */
    static async updateSupplier(id, tenantId, userId, data) {
        const existing = await prisma_1.prisma.supplier.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            throw new Error("Supplier not found");
        }
        const updated = await prisma_1.prisma.supplier.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name.trim(), company: data.company?.trim() || data.name.trim() }),
                ...(data.phone && { phone: data.phone.trim() }),
                ...(data.email !== undefined && { email: data.email?.trim() || null }),
                ...(data.address !== undefined && { address: data.address?.trim() || null }),
                ...(data.company !== undefined && { company: data.company?.trim() || data.name?.trim() || existing.name }),
                ...(data.contactPerson !== undefined && { contactPerson: data.contactPerson?.trim() || null }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
            },
        });
        await audit_1.AuditService.log({
            tenantId,
            userId,
            action: "UPDATE_SUPPLIER",
            details: data,
        });
        return updated;
    }
    /**
     * Delete supplier (or soft delete)
     */
    static async deleteSupplier(id, tenantId, userId) {
        const existing = await prisma_1.prisma.supplier.findFirst({
            where: { id, tenantId },
            include: {
                _count: { select: { purchases: true } },
            },
        });
        if (!existing) {
            throw new Error("Supplier not found");
        }
        if (existing._count.purchases > 0) {
            // Soft-delete if purchases exist
            await prisma_1.prisma.supplier.update({
                where: { id },
                data: { isActive: false },
            });
            return { message: "Supplier marked as inactive as purchase history exists" };
        }
        await prisma_1.prisma.supplier.delete({
            where: { id },
        });
        await audit_1.AuditService.log({
            tenantId,
            userId,
            action: "DELETE_SUPPLIER",
            details: { name: existing.name },
        });
        return { message: "Supplier deleted successfully" };
    }
    /**
     * Record Stock Purchase (Inward) with Supplier Financials & Batch Inventory
     */
    static async recordPurchase(tenantId, userId, data) {
        // 1. Verify branch belongs to tenant
        const branch = await prisma_1.prisma.branch.findFirst({
            where: { id: data.branchId, tenantId, isActive: true },
        });
        if (!branch) {
            throw new Error("Branch not found or inactive");
        }
        // 2. Verify Supplier if provided
        let supplier = null;
        if (data.supplierId) {
            supplier = await prisma_1.prisma.supplier.findFirst({
                where: { id: data.supplierId, tenantId },
            });
            if (!supplier) {
                throw new Error("Supplier not found");
            }
        }
        // 3. Verify Products
        const productIds = data.items.map((i) => i.productId);
        const products = await prisma_1.prisma.product.findMany({
            where: { id: { in: productIds }, tenantId, isActive: true },
        });
        if (products.length !== productIds.length) {
            throw new Error("One or more selected products are invalid or inactive");
        }
        const productMap = new Map(products.map((p) => [p.id, p]));
        // Calculate total purchase amount
        let totalPurchaseAmount = 0;
        const preparedItems = data.items.map((item) => {
            const prod = productMap.get(item.productId);
            const itemTotal = Number(item.unitPurchasePrice) * item.quantity;
            totalPurchaseAmount += itemTotal;
            return {
                productId: item.productId,
                batchNumber: item.batchNumber || null,
                barcode: item.barcode || prod.barcode || null,
                mfgDate: item.mfgDate ? new Date(item.mfgDate) : null,
                expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
                packageType: item.packageType || "MEDICINE",
                cartonQuantity: item.cartonQuantity || null,
                boxQuantity: item.boxQuantity || null,
                stripsPerBox: item.stripsPerBox || prod.stripsPerBox || null,
                tabletsPerStrip: item.tabletsPerStrip || prod.tabletsPerStrip || null,
                quantity: item.quantity,
                unitPurchasePrice: item.unitPurchasePrice,
                unitSellingPrice: item.unitSellingPrice,
                totalAmount: itemTotal,
                shelfLocation: item.shelfLocation || prod.shelfLocation || null,
            };
        });
        const paidAmount = Number(data.paidAmount || 0);
        const dueAmount = Math.max(0, totalPurchaseAmount - paidAmount);
        const paymentStatus = dueAmount === 0 ? "PAID" : paidAmount > 0 ? "PARTIAL" : "DUE";
        const purchaseDate = data.purchaseDate ? new Date(data.purchaseDate) : new Date();
        // 4. Execute atomic transaction
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            // Create Purchase Record
            const purchase = await tx.purchase.create({
                data: {
                    tenantId,
                    branchId: data.branchId,
                    supplierId: data.supplierId || null,
                    invoiceNo: data.invoiceNo || `PUR-${Date.now().toString().slice(-6)}`,
                    purchaseDate,
                    totalAmount: totalPurchaseAmount,
                    paidAmount,
                    dueAmount,
                    paymentStatus,
                    paymentMethod: data.paymentMethod || "CASH",
                    notes: data.notes || null,
                    receivedBy: userId,
                    items: {
                        create: preparedItems,
                    },
                },
                include: {
                    items: {
                        include: {
                            product: { select: { id: true, name: true, sku: true, unit: true } },
                        },
                    },
                    supplier: true,
                    branch: { select: { id: true, name: true } },
                },
            });
            // Update Supplier Balance if supplier assigned
            if (data.supplierId && supplier) {
                await tx.supplier.update({
                    where: { id: data.supplierId },
                    data: {
                        totalPurchased: { increment: totalPurchaseAmount },
                        totalPaid: { increment: paidAmount },
                        totalDue: { increment: dueAmount },
                    },
                });
            }
            // Upsert Inventory Batches and Record Stock Movements
            for (const item of preparedItems) {
                let existingInventory = null;
                if (item.batchNumber) {
                    existingInventory = await tx.inventory.findFirst({
                        where: {
                            branchId: data.branchId,
                            productId: item.productId,
                            batchNumber: item.batchNumber,
                        },
                    });
                }
                let inventoryId;
                if (existingInventory) {
                    const updatedInv = await tx.inventory.update({
                        where: { id: existingInventory.id },
                        data: {
                            quantity: { increment: item.quantity },
                            purchasePrice: item.unitPurchasePrice,
                            sellingPrice: item.unitSellingPrice,
                            supplierId: data.supplierId || existingInventory.supplierId,
                            shelfLocation: item.shelfLocation || existingInventory.shelfLocation,
                        },
                    });
                    inventoryId = updatedInv.id;
                }
                else {
                    const newInv = await tx.inventory.create({
                        data: {
                            branchId: data.branchId,
                            productId: item.productId,
                            supplierId: data.supplierId || null,
                            quantity: item.quantity,
                            initialQuantity: item.quantity,
                            batchNumber: item.batchNumber,
                            barcode: item.barcode,
                            mfgDate: item.mfgDate,
                            expiryDate: item.expiryDate,
                            packageType: item.packageType,
                            boxQuantity: item.boxQuantity,
                            stripsPerBox: item.stripsPerBox,
                            tabletsPerStrip: item.tabletsPerStrip,
                            purchasePrice: item.unitPurchasePrice,
                            sellingPrice: item.unitSellingPrice,
                            shelfLocation: item.shelfLocation,
                        },
                    });
                    inventoryId = newInv.id;
                }
                // Record Stock Movement
                await tx.stockMovement.create({
                    data: {
                        branchId: data.branchId,
                        productId: item.productId,
                        inventoryId,
                        batchNumber: item.batchNumber,
                        type: "PURCHASE",
                        quantity: item.quantity,
                        unitPrice: item.unitPurchasePrice,
                        reason: `Purchase Invoice #${purchase.invoiceNo}`,
                        performedBy: userId,
                        referenceId: purchase.id,
                    },
                });
            }
            return purchase;
        });
        await audit_1.AuditService.log({
            tenantId,
            userId,
            branchId: data.branchId,
            action: "PURCHASE_STOCK",
            details: {
                invoiceNo: result.invoiceNo,
                totalAmount: totalPurchaseAmount,
                itemCount: preparedItems.length,
                supplierName: supplier?.name || "Direct / Unassigned",
            },
        });
        return result;
    }
    /**
     * List purchases with filters and pagination
     */
    static async listPurchases(tenantId, query, userRole, userBranchId) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.max(1, Math.min(100, query.limit || 20));
        const skip = (page - 1) * limit;
        const where = { tenantId };
        if (userRole === "BRANCH_MANAGER" || userRole === "CASHIER") {
            if (userBranchId)
                where.branchId = userBranchId;
        }
        else if (query.branchId) {
            where.branchId = query.branchId;
        }
        if (query.supplierId) {
            where.supplierId = query.supplierId;
        }
        if (query.paymentStatus) {
            where.paymentStatus = query.paymentStatus;
        }
        if (query.startDate || query.endDate) {
            where.purchaseDate = {};
            if (query.startDate)
                where.purchaseDate.gte = new Date(query.startDate);
            if (query.endDate) {
                const end = new Date(query.endDate);
                end.setHours(23, 59, 59, 999);
                where.purchaseDate.lte = end;
            }
        }
        if (query.search) {
            where.OR = [
                { invoiceNo: { contains: query.search, mode: "insensitive" } },
                { supplier: { name: { contains: query.search, mode: "insensitive" } } },
            ];
        }
        const [purchases, total] = await Promise.all([
            prisma_1.prisma.purchase.findMany({
                where,
                skip,
                take: limit,
                orderBy: { purchaseDate: "desc" },
                include: {
                    supplier: { select: { id: true, name: true, phone: true } },
                    branch: { select: { id: true, name: true } },
                    items: {
                        include: {
                            product: { select: { id: true, name: true, sku: true, unit: true } },
                        },
                    },
                },
            }),
            prisma_1.prisma.purchase.count({ where }),
        ]);
        return {
            data: purchases,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Record payment against a supplier's outstanding due
     */
    static async recordSupplierPayment(supplierId, tenantId, userId, data) {
        const supplier = await prisma_1.prisma.supplier.findFirst({
            where: { id: supplierId, tenantId },
        });
        if (!supplier) {
            throw new Error("Supplier not found");
        }
        const payAmount = Number(data.amount);
        const newDue = Math.max(0, Number(supplier.totalDue) - payAmount);
        const newPaid = Number(supplier.totalPaid) + payAmount;
        const updated = await prisma_1.prisma.supplier.update({
            where: { id: supplierId },
            data: {
                totalPaid: newPaid,
                totalDue: newDue,
            },
        });
        // Synchronize with Financial Accounts ledger
        try {
            const targetType = data.paymentMethod === "BANK"
                ? "BANK"
                : data.paymentMethod === "CARD"
                    ? "CARD_SETTLEMENT"
                    : data.paymentMethod === "MOBILE"
                        ? "MOBILE"
                        : "CASH";
            const financialAcc = await prisma_1.prisma.financialAccount.findFirst({
                where: { tenantId, type: targetType, isActive: true },
                orderBy: { createdAt: "asc" },
            });
            if (financialAcc) {
                await prisma_1.prisma.financialAccount.update({
                    where: { id: financialAcc.id },
                    data: { balance: { decrement: payAmount } },
                });
                await prisma_1.prisma.financialTransaction.create({
                    data: {
                        tenantId,
                        branchId: financialAcc.branchId,
                        sourceAccountId: financialAcc.id,
                        amount: payAmount,
                        type: "PURCHASE_PAYMENT",
                        reference: `PAY-${supplier.name.slice(0, 15)}`,
                        note: data.notes || `Supplier payment for ${supplier.name}`,
                        userId,
                    },
                });
            }
        }
        catch (finErr) {
            console.error("Failed to sync supplier payment with financial account", finErr);
        }
        await audit_1.AuditService.log({
            tenantId,
            userId,
            action: "SUPPLIER_PAYMENT",
            details: {
                supplierId,
                amountPaid: payAmount,
                previousDue: supplier.totalDue,
                remainingDue: newDue,
                notes: data.notes,
            },
        });
        return updated;
    }
}
exports.SupplierService = SupplierService;
