"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesService = void 0;
const prisma_1 = require("../../app/lib/prisma");
const audit_1 = require("../../app/lib/audit");
class SalesService {
    /**
     * Process POS Sale with FEFO Batch Deduction, Multi-Unit conversions, and Invoice details
     */
    static async createSale(tenantId, userId, data) {
        // 1. Verify Branch belongs to tenant
        const branch = await prisma_1.prisma.branch.findFirst({
            where: { id: data.branchId, tenantId, isActive: true },
        });
        if (!branch) {
            throw new Error("Branch not found or inactive");
        }
        // 2. Fetch all products in the cart
        const productIds = data.items.map((i) => i.productId);
        const products = await prisma_1.prisma.product.findMany({
            where: { id: { in: productIds }, tenantId, isActive: true },
            include: {
                branchOverrides: { where: { branchId: data.branchId } },
            },
        });
        if (products.length !== productIds.length) {
            throw new Error("One or more items in the cart are invalid or inactive");
        }
        const productMap = new Map(products.map((p) => [p.id, p]));
        // 3. Check for Controlled or Prescription Drugs requirement
        const controlledOrPrescriptionItems = products.filter((p) => p.isControlled || p.requiresPrescription);
        if (controlledOrPrescriptionItems.length > 0 && !data.managerApprovedBy) {
            const names = controlledOrPrescriptionItems.map((p) => p.name).join(", ");
            throw new Error(`Sale contains controlled or prescription medication (${names}). Manager authorization or prescription reference is required.`);
        }
        // 4. Fetch all available unexpired batches in this branch for these products (FEFO sorted)
        const now = new Date();
        const availableBatches = await prisma_1.prisma.inventory.findMany({
            where: {
                branchId: data.branchId,
                productId: { in: productIds },
                quantity: { gt: 0 },
                OR: [{ expiryDate: null }, { expiryDate: { gt: now } }],
            },
            orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }],
        });
        // Group batches by productId
        const batchMap = new Map();
        for (const b of availableBatches) {
            if (!batchMap.has(b.productId)) {
                batchMap.set(b.productId, []);
            }
            batchMap.get(b.productId).push(b);
        }
        // 5. Verify total stock per product and prepare FEFO deduction plan
        let calculatedSubTotal = 0;
        const preparedSaleItems = [];
        const stockDeductions = [];
        for (const item of data.items) {
            const prod = productMap.get(item.productId);
            const multiplier = item.unitMultiplier || 1;
            const totalBaseUnitsNeeded = item.quantity * multiplier;
            const override = prod.branchOverrides && prod.branchOverrides[0];
            const baseUnitPrice = override ? Number(override.price) : Number(prod.basePrice);
            // If client provided custom unitPrice, use it, else calculate from baseUnitPrice * multiplier
            const effectiveUnitPrice = item.unitPrice !== undefined ? Number(item.unitPrice) : baseUnitPrice * multiplier;
            const itemSubTotal = effectiveUnitPrice * item.quantity;
            calculatedSubTotal += itemSubTotal;
            const batches = batchMap.get(item.productId) || [];
            const totalStockAvailable = batches.reduce((acc, b) => acc + b.quantity, 0);
            if (totalStockAvailable < totalBaseUnitsNeeded) {
                throw new Error(`Insufficient non-expired stock for "${prod.name}". Available: ${totalStockAvailable} base units, requested: ${totalBaseUnitsNeeded} (${item.quantity} ${item.unitType || "units"})`);
            }
            // If a specific batch inventoryId was specified and has enough stock
            if (item.inventoryId) {
                const targetBatch = batches.find((b) => b.id === item.inventoryId);
                if (!targetBatch || targetBatch.quantity < totalBaseUnitsNeeded) {
                    throw new Error(`Selected batch for "${prod.name}" has insufficient stock (${targetBatch?.quantity || 0} available).`);
                }
                stockDeductions.push({
                    inventoryId: targetBatch.id,
                    quantityToDeduct: totalBaseUnitsNeeded,
                    productId: item.productId,
                });
                preparedSaleItems.push({
                    productId: item.productId,
                    inventoryId: targetBatch.id,
                    batchNumber: targetBatch.batchNumber || item.batchNumber || null,
                    expiryDate: targetBatch.expiryDate || null,
                    unitType: item.unitType || prod.defaultPackType || "PIECE",
                    unitMultiplier: multiplier,
                    quantity: item.quantity,
                    lowestUnitQuantity: totalBaseUnitsNeeded,
                    unitPrice: effectiveUnitPrice,
                    purchasePrice: targetBatch.purchasePrice || null,
                    subTotal: itemSubTotal,
                });
            }
            else {
                // Apply FEFO allocation across batches
                let unitsRemainingToDeduct = totalBaseUnitsNeeded;
                let primaryBatch = null;
                for (const batch of batches) {
                    if (unitsRemainingToDeduct <= 0)
                        break;
                    if (batch.quantity <= 0)
                        continue;
                    const deductFromThisBatch = Math.min(batch.quantity, unitsRemainingToDeduct);
                    batch.quantity -= deductFromThisBatch;
                    unitsRemainingToDeduct -= deductFromThisBatch;
                    if (!primaryBatch)
                        primaryBatch = batch;
                    stockDeductions.push({
                        inventoryId: batch.id,
                        quantityToDeduct: deductFromThisBatch,
                        productId: item.productId,
                    });
                }
                preparedSaleItems.push({
                    productId: item.productId,
                    inventoryId: primaryBatch?.id || null,
                    batchNumber: primaryBatch?.batchNumber || item.batchNumber || null,
                    expiryDate: primaryBatch?.expiryDate || null,
                    unitType: item.unitType || prod.defaultPackType || "PIECE",
                    unitMultiplier: multiplier,
                    quantity: item.quantity,
                    lowestUnitQuantity: totalBaseUnitsNeeded,
                    unitPrice: effectiveUnitPrice,
                    purchasePrice: primaryBatch?.purchasePrice || null,
                    subTotal: itemSubTotal,
                });
            }
        }
        // 6. Discount & Tax calculations
        let discountAmount = 0;
        if (data.discount && data.discount > 0) {
            if (data.discountType === "PERCENT") {
                discountAmount = Math.round((calculatedSubTotal * (data.discount / 100)) * 100) / 100;
            }
            else {
                discountAmount = Number(data.discount);
            }
        }
        const taxAmount = Number(data.tax || 0);
        const totalAmount = Math.max(0, calculatedSubTotal - discountAmount + taxAmount);
        const paidAmount = data.paidAmount !== undefined ? Number(data.paidAmount) : totalAmount;
        const dueAmount = Math.max(0, totalAmount - paidAmount);
        const changeAmount = Math.max(0, paidAmount - totalAmount);
        // Generate unique professional receipt number
        const rand = Math.floor(1000 + Math.random() * 9000);
        const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
        const receiptNo = `INV-${branch.name.substring(0, 3).toUpperCase()}-${dateStr}-${rand}`;
        const localCreatedAt = data.localCreatedAt ? new Date(data.localCreatedAt) : new Date();
        // 7. Execute Atomic Sale Transaction
        const sale = await prisma_1.prisma.$transaction(async (tx) => {
            // Create Sale Record
            const createdSale = await tx.sale.create({
                data: {
                    tenantId,
                    branchId: data.branchId,
                    userId,
                    receiptNo,
                    customerName: data.customerName || "Walk-in Customer",
                    customerPhone: data.customerPhone || null,
                    customerEmail: data.customerEmail || null,
                    subTotal: calculatedSubTotal,
                    discount: discountAmount,
                    discountType: data.discountType || "FIXED",
                    tax: taxAmount,
                    totalAmount,
                    paidAmount: Math.min(paidAmount, totalAmount),
                    dueAmount,
                    changeAmount,
                    paymentMethod: data.paymentMethod,
                    status: "COMPLETED",
                    notes: data.notes || null,
                    managerApprovedBy: data.managerApprovedBy || null,
                    prescriptionRef: data.prescriptionRef || null,
                    localCreatedAt,
                    items: {
                        create: preparedSaleItems,
                    },
                },
                include: {
                    items: {
                        include: {
                            product: {
                                select: { id: true, name: true, sku: true, unit: true, size: true, brandName: true },
                            },
                        },
                    },
                    branch: { select: { id: true, name: true, location: true, phone: true, email: true } },
                    user: { select: { id: true, name: true, username: true } },
                },
            });
            // Deduct Inventory batches & record stock movements
            for (const deduction of stockDeductions) {
                await tx.inventory.update({
                    where: { id: deduction.inventoryId },
                    data: { quantity: { decrement: deduction.quantityToDeduct } },
                });
                await tx.stockMovement.create({
                    data: {
                        branchId: data.branchId,
                        productId: deduction.productId,
                        inventoryId: deduction.inventoryId,
                        type: "SALE",
                        quantity: -deduction.quantityToDeduct,
                        reason: `POS Sale Receipt #${receiptNo}`,
                        referenceId: createdSale.id,
                        performedBy: userId,
                    },
                });
            }
            return createdSale;
        });
        await audit_1.AuditService.log({
            tenantId,
            branchId: data.branchId,
            userId,
            action: "POS_SALE_COMPLETED",
            details: {
                saleId: sale.id,
                receiptNo,
                totalAmount,
                itemCount: preparedSaleItems.length,
                customerName: sale.customerName,
            },
        });
        return sale;
    }
    /**
     * List Sales with Search, Customer, Date Range, Status Filters & Pagination
     */
    static async listSales(tenantId, query, userRole, userBranchId) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.max(1, Math.min(100, query.limit || 20));
        const skip = (page - 1) * limit;
        const where = { tenantId };
        if (["BRANCH_MANAGER", "CASHIER"].includes(userRole) && userBranchId) {
            where.branchId = userBranchId;
        }
        else if (query.branchId) {
            where.branchId = query.branchId;
        }
        if (query.userId) {
            where.userId = query.userId;
        }
        if (query.status) {
            where.status = query.status;
        }
        if (query.paymentMethod) {
            where.paymentMethod = query.paymentMethod;
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
                { receiptNo: { contains: query.search, mode: "insensitive" } },
                { customerName: { contains: query.search, mode: "insensitive" } },
                { customerPhone: { contains: query.search, mode: "insensitive" } },
            ];
        }
        const [total, sales] = await Promise.all([
            prisma_1.prisma.sale.count({ where }),
            prisma_1.prisma.sale.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    branch: { select: { id: true, name: true, location: true } },
                    user: { select: { id: true, name: true, username: true } },
                    items: {
                        include: {
                            product: { select: { id: true, name: true, sku: true, unit: true, size: true } },
                        },
                    },
                },
            }),
        ]);
        return {
            data: sales,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Get Single Sale with Itemized Batches
     */
    static async getSaleById(saleId, tenantId) {
        const sale = await prisma_1.prisma.sale.findFirst({
            where: { id: saleId, tenantId },
            include: {
                branch: true,
                user: { select: { id: true, name: true, username: true } },
                items: {
                    include: {
                        product: true,
                    },
                },
            },
        });
        if (!sale) {
            throw new Error("Sale record not found");
        }
        return sale;
    }
    /**
     * Get Printable / PDF-Ready Receipt Data
     */
    static async getReceiptData(saleId, tenantId) {
        const [sale, tenant] = await Promise.all([
            prisma_1.prisma.sale.findFirst({
                where: { id: saleId, tenantId },
                include: {
                    branch: true,
                    user: { select: { id: true, name: true, username: true } },
                    items: {
                        include: {
                            product: { select: { id: true, name: true, sku: true, unit: true, size: true, brandName: true } },
                        },
                    },
                },
            }),
            prisma_1.prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { id: true, name: true, phone: true, email: true, address: true, logoUrl: true },
            }),
        ]);
        if (!sale) {
            throw new Error("Sale not found");
        }
        return {
            pharmacy: {
                name: tenant?.name || "Pharmacy Chain",
                address: sale.branch.location || tenant?.address || "Main Branch",
                phone: sale.branch.phone || tenant?.phone || "—",
                email: sale.branch.email || tenant?.email || "—",
                logoUrl: tenant?.logoUrl || null,
            },
            invoice: {
                id: sale.id,
                receiptNo: sale.receiptNo,
                date: sale.createdAt,
                cashier: sale.user.name || sale.user.username,
                branch: sale.branch.name,
                customerName: sale.customerName || "Walk-in Customer",
                customerPhone: sale.customerPhone || "—",
                customerEmail: sale.customerEmail || "—",
                paymentMethod: sale.paymentMethod,
                subTotal: Number(sale.subTotal),
                discount: Number(sale.discount),
                discountType: sale.discountType,
                tax: Number(sale.tax),
                totalAmount: Number(sale.totalAmount),
                paidAmount: Number(sale.paidAmount),
                dueAmount: Number(sale.dueAmount),
                changeAmount: Number(sale.changeAmount),
                status: sale.status,
                notes: sale.notes,
                items: sale.items.map((item) => ({
                    name: item.product.name,
                    brandName: item.product.brandName || "—",
                    size: item.product.size || "—",
                    sku: item.product.sku,
                    batchNumber: item.batchNumber || "—",
                    expiryDate: item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "—",
                    unitType: item.unitType || "PIECE",
                    quantity: item.quantity,
                    unitPrice: Number(item.unitPrice),
                    subTotal: Number(item.subTotal),
                })),
            },
        };
    }
    /**
     * Refund Sale & Return Stock to Batches
     */
    static async refundSale(saleId, tenantId, userId, userRole, data) {
        if (!["COMPANY_OWNER", "BRANCH_MANAGER"].includes(userRole)) {
            throw new Error("Only a Company Owner or Branch Manager can authorize a refund");
        }
        const sale = await prisma_1.prisma.sale.findFirst({
            where: { id: saleId, tenantId },
            include: { items: true, branch: true },
        });
        if (!sale)
            throw new Error("Sale not found");
        if (sale.status === "REFUNDED")
            throw new Error("Sale has already been refunded");
        if (sale.status === "VOIDED")
            throw new Error("Cannot refund a voided sale");
        const refunded = await prisma_1.prisma.$transaction(async (tx) => {
            // 1. Mark sale as REFUNDED
            const updatedSale = await tx.sale.update({
                where: { id: saleId },
                data: {
                    status: "REFUNDED",
                    refundReason: data.reason,
                    managerApprovedBy: data.managerId,
                },
            });
            // 2. Restock batches and record movement
            for (const item of sale.items) {
                const qtyToReturn = item.lowestUnitQuantity || item.quantity;
                if (item.inventoryId) {
                    await tx.inventory.update({
                        where: { id: item.inventoryId },
                        data: { quantity: { increment: qtyToReturn } },
                    });
                }
                await tx.stockMovement.create({
                    data: {
                        branchId: sale.branchId,
                        productId: item.productId,
                        inventoryId: item.inventoryId || null,
                        type: "RETURN",
                        quantity: qtyToReturn,
                        reason: `Refund for receipt #${sale.receiptNo}: ${data.reason}`,
                        performedBy: userId,
                        referenceId: sale.id,
                    },
                });
            }
            return updatedSale;
        });
        await audit_1.AuditService.log({
            tenantId,
            branchId: sale.branchId,
            userId,
            action: "POS_SALE_REFUNDED",
            details: { saleId, receiptNo: sale.receiptNo, reason: data.reason },
        });
        return refunded;
    }
    /**
     * Void Sale & Return Stock
     */
    static async voidSale(saleId, tenantId, userId, userRole, data) {
        if (!["COMPANY_OWNER", "BRANCH_MANAGER"].includes(userRole)) {
            throw new Error("Only a Company Owner or Branch Manager can void a sale");
        }
        const sale = await prisma_1.prisma.sale.findFirst({
            where: { id: saleId, tenantId },
            include: { items: true, branch: true },
        });
        if (!sale)
            throw new Error("Sale not found");
        if (sale.status !== "COMPLETED")
            throw new Error(`Cannot void a sale with status "${sale.status}"`);
        const voided = await prisma_1.prisma.$transaction(async (tx) => {
            const updatedSale = await tx.sale.update({
                where: { id: saleId },
                data: {
                    status: "VOIDED",
                    voidReason: data.reason,
                    managerApprovedBy: data.managerId,
                },
            });
            for (const item of sale.items) {
                const qtyToReturn = item.lowestUnitQuantity || item.quantity;
                if (item.inventoryId) {
                    await tx.inventory.update({
                        where: { id: item.inventoryId },
                        data: { quantity: { increment: qtyToReturn } },
                    });
                }
                await tx.stockMovement.create({
                    data: {
                        branchId: sale.branchId,
                        productId: item.productId,
                        inventoryId: item.inventoryId || null,
                        type: "ADJUSTMENT",
                        quantity: qtyToReturn,
                        reason: `Void of receipt #${sale.receiptNo}: ${data.reason}`,
                        performedBy: userId,
                        referenceId: sale.id,
                    },
                });
            }
            return updatedSale;
        });
        await audit_1.AuditService.log({
            tenantId,
            branchId: sale.branchId,
            userId,
            action: "POS_SALE_VOIDED",
            details: { saleId, receiptNo: sale.receiptNo, reason: data.reason },
        });
        return voided;
    }
}
exports.SalesService = SalesService;
