"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const prisma_1 = require("../../app/lib/prisma");
const audit_1 = require("../../app/lib/audit");
class InventoryService {
    /**
     * List Batch Inventory for a Branch with Supplier & Expiry data
     */
    static async getBranchInventory(tenantId, branchId, query) {
        const branch = await prisma_1.prisma.branch.findFirst({
            where: { id: branchId, tenantId },
        });
        if (!branch) {
            throw new Error("Branch not found");
        }
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;
        const where = {
            branchId,
            product: { tenantId, isActive: true },
        };
        if (query.category) {
            where.product.category = { equals: query.category, mode: "insensitive" };
        }
        if (query.search) {
            where.product.OR = [
                { name: { contains: query.search, mode: "insensitive" } },
                { genericName: { contains: query.search, mode: "insensitive" } },
                { sku: { contains: query.search, mode: "insensitive" } },
                { barcode: { contains: query.search, mode: "insensitive" } },
                { batchNumber: { contains: query.search, mode: "insensitive" } },
            ];
        }
        const [total, inventories] = await Promise.all([
            prisma_1.prisma.inventory.count({ where }),
            prisma_1.prisma.inventory.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ expiryDate: "asc" }, { updatedAt: "desc" }],
                include: {
                    product: {
                        include: {
                            branchOverrides: { where: { branchId } },
                            categoryRef: true,
                            brandRef: true,
                            unitRef: true,
                        },
                    },
                    supplier: {
                        select: { id: true, name: true, phone: true },
                    },
                },
            }),
        ]);
        const now = new Date();
        const formatted = inventories.map((inv) => {
            const override = inv.product.branchOverrides && inv.product.branchOverrides[0];
            const isLowStock = inv.quantity <= (inv.lowStockThreshold || inv.minStockLevel || 5);
            const isExpired = inv.expiryDate ? new Date(inv.expiryDate) < now : false;
            const daysUntilExpiry = inv.expiryDate
                ? Math.ceil((new Date(inv.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                : null;
            return {
                id: inv.id,
                productId: inv.productId,
                productName: inv.product.name,
                genericName: inv.product.genericName,
                sku: inv.product.sku,
                barcode: inv.barcode || inv.product.barcode,
                category: inv.product.category,
                subcategory: inv.product.subcategory,
                brandName: inv.product.brandName || inv.product.manufacturer,
                unit: inv.product.unit,
                size: inv.product.size,
                basePrice: Number(inv.product.basePrice),
                sellingPrice: inv.sellingPrice ? Number(inv.sellingPrice) : override ? Number(override.price) : Number(inv.product.basePrice),
                purchasePrice: inv.purchasePrice ? Number(inv.purchasePrice) : null,
                hasPriceOverride: !!override,
                isControlled: inv.product.isControlled,
                requiresPrescription: inv.product.requiresPrescription,
                quantity: inv.quantity,
                initialQuantity: inv.initialQuantity,
                batchNumber: inv.batchNumber,
                mfgDate: inv.mfgDate,
                expiryDate: inv.expiryDate,
                packageType: inv.packageType || inv.product.category || "Medicine",
                boxQuantity: inv.boxQuantity,
                stripsPerBox: inv.stripsPerBox || inv.product.stripsPerBox,
                tabletsPerStrip: inv.tabletsPerStrip || inv.product.tabletsPerStrip,
                shelfLocation: inv.shelfLocation || inv.product.shelfLocation,
                minStockLevel: inv.minStockLevel,
                lowStockThreshold: inv.lowStockThreshold,
                isLowStock,
                isExpired,
                daysUntilExpiry,
                supplier: inv.supplier,
                updatedAt: inv.updatedAt,
            };
        });
        return {
            data: formatted,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Inward Stock / Add Batch for a Product
     */
    static async inwardStock(tenantId, userId, data) {
        const [branch, product] = await Promise.all([
            prisma_1.prisma.branch.findFirst({ where: { id: data.branchId, tenantId, isActive: true } }),
            prisma_1.prisma.product.findFirst({ where: { id: data.productId, tenantId, isActive: true } }),
        ]);
        if (!branch)
            throw new Error("Branch not found or inactive");
        if (!product)
            throw new Error("Product not found or inactive");
        let supplier = null;
        if (data.supplierId) {
            supplier = await prisma_1.prisma.supplier.findFirst({
                where: { id: data.supplierId, tenantId },
            });
            if (!supplier)
                throw new Error("Supplier not found");
        }
        const mfgDate = data.mfgDate ? new Date(data.mfgDate) : null;
        const expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            // 1. Look for existing batch
            let existingInv = null;
            if (data.batchNumber) {
                existingInv = await tx.inventory.findFirst({
                    where: {
                        branchId: data.branchId,
                        productId: data.productId,
                        batchNumber: data.batchNumber,
                    },
                });
            }
            let inventory;
            if (existingInv) {
                inventory = await tx.inventory.update({
                    where: { id: existingInv.id },
                    data: {
                        quantity: { increment: data.quantity },
                        purchasePrice: data.purchasePrice ? data.purchasePrice : existingInv.purchasePrice,
                        sellingPrice: data.sellingPrice ? data.sellingPrice : existingInv.sellingPrice,
                        supplierId: data.supplierId || existingInv.supplierId,
                        shelfLocation: data.shelfLocation || existingInv.shelfLocation,
                        expiryDate: expiryDate || existingInv.expiryDate,
                    },
                });
            }
            else {
                inventory = await tx.inventory.create({
                    data: {
                        branchId: data.branchId,
                        productId: data.productId,
                        supplierId: data.supplierId || null,
                        quantity: data.quantity,
                        initialQuantity: data.quantity,
                        batchNumber: data.batchNumber || null,
                        barcode: data.barcode || product.barcode || null,
                        mfgDate,
                        expiryDate,
                        packageType: data.packageType || product.category || "Medicine",
                        boxQuantity: data.boxQuantity || null,
                        stripsPerBox: data.stripsPerBox || product.stripsPerBox || null,
                        tabletsPerStrip: data.tabletsPerStrip || product.tabletsPerStrip || null,
                        purchasePrice: data.purchasePrice || null,
                        sellingPrice: data.sellingPrice || product.basePrice,
                        shelfLocation: data.shelfLocation || product.shelfLocation || null,
                        minStockLevel: product.minStockAlert || 10,
                        lowStockThreshold: 5,
                    },
                });
            }
            // 2. Record Stock Movement
            const movement = await tx.stockMovement.create({
                data: {
                    branchId: data.branchId,
                    productId: data.productId,
                    inventoryId: inventory.id,
                    batchNumber: data.batchNumber || null,
                    type: "PURCHASE",
                    quantity: data.quantity,
                    unitPrice: data.purchasePrice || 0,
                    reason: data.notes || "Stock Inward (Direct Batch Entry)",
                    performedBy: userId,
                },
            });
            // 3. Update Financial Account & Supplier Financials
            const paid = Number(data.paidAmount || 0);
            let financialAccount = null;
            if (paid > 0) {
                if (!data.financialAccountId) {
                    throw new Error("A valid financial account for the selected branch is required when paying a supplier.");
                }
                financialAccount = await tx.financialAccount.findFirst({
                    where: {
                        id: data.financialAccountId,
                        tenantId,
                        branchId: data.branchId,
                        isActive: true,
                    },
                });
                if (!financialAccount) {
                    throw new Error("Selected financial account does not exist or does not belong to this branch.");
                }
                // Debit the selected financial account
                await tx.financialAccount.update({
                    where: { id: financialAccount.id },
                    data: { balance: { decrement: paid } },
                });
                // Record Financial Transaction
                await tx.financialTransaction.create({
                    data: {
                        tenantId,
                        branchId: data.branchId,
                        sourceAccountId: financialAccount.id,
                        amount: paid,
                        type: "PURCHASE_PAYMENT",
                        reference: `INWARD-${inventory.batchNumber || inventory.id.substring(0, 8)}`,
                        note: data.notes || `Stock Inward supplier payment via ${financialAccount.name}`,
                        userId,
                    },
                });
            }
            if (data.supplierId && supplier && data.purchasePrice) {
                const totalPurchaseValue = Number(data.purchasePrice) * data.quantity;
                const due = Math.max(0, totalPurchaseValue - paid);
                await tx.supplier.update({
                    where: { id: data.supplierId },
                    data: {
                        totalPurchased: { increment: totalPurchaseValue },
                        totalPaid: { increment: paid },
                        totalDue: { increment: due },
                    },
                });
            }
            return { inventory, movement };
        });
        await audit_1.AuditService.log({
            tenantId,
            branchId: data.branchId,
            userId,
            action: "STOCK_INWARD",
            details: {
                productId: data.productId,
                productName: product.name,
                quantity: data.quantity,
                batchNumber: data.batchNumber,
            },
        });
        return result;
    }
    /**
     * Adjust Stock (Manual correction, Damage, Adjustment, Return)
     */
    static async adjustStock(tenantId, userId, data) {
        const [branch, product] = await Promise.all([
            prisma_1.prisma.branch.findFirst({ where: { id: data.branchId, tenantId } }),
            prisma_1.prisma.product.findFirst({ where: { id: data.productId, tenantId } }),
        ]);
        if (!branch)
            throw new Error("Branch not found in your company");
        if (!product)
            throw new Error("Product not found in your catalog");
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            let inventory = null;
            if (data.inventoryId) {
                inventory = await tx.inventory.findUnique({ where: { id: data.inventoryId } });
            }
            else if (data.batchNumber) {
                inventory = await tx.inventory.findFirst({
                    where: { branchId: data.branchId, productId: data.productId, batchNumber: data.batchNumber },
                });
            }
            else {
                inventory = await tx.inventory.findFirst({
                    where: { branchId: data.branchId, productId: data.productId },
                });
            }
            let newQuantity = data.quantity;
            if (inventory) {
                newQuantity = inventory.quantity + data.quantity;
                if (newQuantity < 0) {
                    throw new Error(`Cannot reduce stock below 0. Current batch stock is ${inventory.quantity}`);
                }
                inventory = await tx.inventory.update({
                    where: { id: inventory.id },
                    data: {
                        quantity: newQuantity,
                        ...(data.expiryDate && { expiryDate: new Date(data.expiryDate) }),
                        ...(data.minStockLevel !== undefined && { minStockLevel: data.minStockLevel }),
                        ...(data.lowStockThreshold !== undefined && { lowStockThreshold: data.lowStockThreshold }),
                    },
                });
            }
            else {
                if (data.quantity < 0)
                    throw new Error("Cannot create inventory with negative stock");
                inventory = await tx.inventory.create({
                    data: {
                        branchId: data.branchId,
                        productId: data.productId,
                        quantity: data.quantity,
                        initialQuantity: data.quantity,
                        batchNumber: data.batchNumber || null,
                        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
                        minStockLevel: data.minStockLevel || product.minStockAlert || 10,
                        lowStockThreshold: data.lowStockThreshold || 5,
                    },
                });
            }
            const movement = await tx.stockMovement.create({
                data: {
                    branchId: data.branchId,
                    productId: data.productId,
                    inventoryId: inventory.id,
                    batchNumber: inventory.batchNumber,
                    type: data.type || "ADJUSTMENT",
                    quantity: data.quantity,
                    reason: data.reason || "Manual Stock Adjustment",
                    performedBy: userId,
                },
            });
            return { inventory, movement };
        });
        await audit_1.AuditService.log({
            tenantId,
            branchId: data.branchId,
            userId,
            action: "STOCK_ADJUSTMENT",
            details: {
                productId: data.productId,
                quantityChange: data.quantity,
                type: data.type,
                reason: data.reason,
            },
        });
        return result;
    }
    /**
     * Update Inventory Item metadata
     */
    static async updateInventoryItem(inventoryId, tenantId, userId, data) {
        const item = await prisma_1.prisma.inventory.findUnique({
            where: { id: inventoryId },
            include: { branch: true, product: true },
        });
        if (!item || item.branch.tenantId !== tenantId) {
            throw new Error("Inventory item not found");
        }
        const updated = await prisma_1.prisma.inventory.update({
            where: { id: inventoryId },
            data: {
                ...(data.quantity !== undefined && { quantity: data.quantity }),
                ...(data.batchNumber !== undefined && { batchNumber: data.batchNumber }),
                ...(data.barcode !== undefined && { barcode: data.barcode }),
                ...(data.expiryDate && { expiryDate: new Date(data.expiryDate) }),
                ...(data.shelfLocation !== undefined && { shelfLocation: data.shelfLocation }),
                ...(data.purchasePrice !== undefined && { purchasePrice: data.purchasePrice }),
                ...(data.sellingPrice !== undefined && { sellingPrice: data.sellingPrice }),
                ...(data.minStockLevel !== undefined && { minStockLevel: data.minStockLevel }),
                ...(data.lowStockThreshold !== undefined && { lowStockThreshold: data.lowStockThreshold }),
            },
        });
        await audit_1.AuditService.log({
            tenantId,
            branchId: item.branchId,
            userId,
            action: "INVENTORY_ITEM_UPDATE",
            details: { inventoryId, changes: data },
        });
        return updated;
    }
    /**
     * Stock Movement / History Ledger with Date Range & Filters
     */
    static async listMovements(tenantId, query, userRole, userBranchId) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.max(1, Math.min(100, query.limit || 20));
        const skip = (page - 1) * limit;
        const where = {
            branch: { tenantId },
        };
        if (["BRANCH_MANAGER", "CASHIER"].includes(userRole) && userBranchId) {
            where.branchId = userBranchId;
        }
        else if (query.branchId) {
            where.branchId = query.branchId;
        }
        if (query.productId) {
            where.productId = query.productId;
        }
        if (query.type) {
            where.type = query.type;
        }
        if (query.startDate || query.endDate) {
            where.createdAt = {};
            if (query.startDate)
                where.createdAt.gte = new Date(query.startDate);
            if (query.endDate) {
                const end = new Date(query.endDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }
        if (query.search) {
            where.OR = [
                { reason: { contains: query.search, mode: "insensitive" } },
                { batchNumber: { contains: query.search, mode: "insensitive" } },
            ];
        }
        const [total, movements] = await Promise.all([
            prisma_1.prisma.stockMovement.count({ where }),
            prisma_1.prisma.stockMovement.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    inventory: { select: { id: true, batchNumber: true, shelfLocation: true } },
                },
            }),
        ]);
        return {
            data: movements,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Low Stock Items Alert
     */
    static async getLowStockItems(tenantId, query, userRole, userBranchId) {
        const where = {
            product: { tenantId, isActive: true },
            branch: { tenantId, isActive: true },
        };
        if (["BRANCH_MANAGER", "CASHIER"].includes(userRole) && userBranchId) {
            where.branchId = userBranchId;
        }
        else if (query.branchId) {
            where.branchId = query.branchId;
        }
        const inventories = await prisma_1.prisma.inventory.findMany({
            where,
            include: {
                product: true,
                branch: { select: { id: true, name: true } },
                supplier: { select: { id: true, name: true } },
            },
            orderBy: { quantity: "asc" },
        });
        const lowStockItems = inventories
            .filter((inv) => inv.quantity <= (inv.lowStockThreshold || inv.minStockLevel || 5))
            .map((inv) => ({
            id: inv.id,
            branchId: inv.branchId,
            branchName: inv.branch.name,
            productId: inv.productId,
            productName: inv.product.name,
            sku: inv.product.sku,
            batchNumber: inv.batchNumber,
            unit: inv.product.unit,
            currentQuantity: inv.quantity,
            lowStockThreshold: inv.lowStockThreshold,
            minStockLevel: inv.minStockLevel,
            shelfLocation: inv.shelfLocation,
            supplierName: inv.supplier?.name || "—",
        }));
        return {
            totalAlerts: lowStockItems.length,
            items: lowStockItems,
        };
    }
    /**
     * Near Expiry / Expired Items Alert
     */
    static async getNearExpiryItems(tenantId, query, userRole, userBranchId) {
        const days = query.daysThreshold || 90;
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() + days);
        const where = {
            product: { tenantId, isActive: true },
            branch: { tenantId, isActive: true },
            expiryDate: { lte: thresholdDate, not: null },
            quantity: { gt: 0 },
        };
        if (["BRANCH_MANAGER", "CASHIER"].includes(userRole) && userBranchId) {
            where.branchId = userBranchId;
        }
        else if (query.branchId) {
            where.branchId = query.branchId;
        }
        const inventories = await prisma_1.prisma.inventory.findMany({
            where,
            include: {
                product: true,
                branch: { select: { id: true, name: true } },
                supplier: { select: { id: true, name: true } },
            },
            orderBy: { expiryDate: "asc" },
        });
        const now = new Date();
        const formatted = inventories.map((inv) => {
            const expDate = new Date(inv.expiryDate);
            const isExpired = expDate < now;
            const daysRemaining = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return {
                id: inv.id,
                branchId: inv.branchId,
                branchName: inv.branch.name,
                productId: inv.productId,
                productName: inv.product.name,
                sku: inv.product.sku,
                batchNumber: inv.batchNumber,
                quantity: inv.quantity,
                expiryDate: inv.expiryDate,
                shelfLocation: inv.shelfLocation,
                isExpired,
                daysRemaining: isExpired ? 0 : daysRemaining,
                supplierName: inv.supplier?.name || "—",
            };
        });
        return {
            totalAlerts: formatted.length,
            expiredCount: formatted.filter((i) => i.isExpired).length,
            nearExpiryCount: formatted.filter((i) => !i.isExpired).length,
            items: formatted,
        };
    }
}
exports.InventoryService = InventoryService;
