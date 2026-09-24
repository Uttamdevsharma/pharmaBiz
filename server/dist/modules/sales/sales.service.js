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
        // 3. Check for Doctor Prescription (Rx) requirement
        const prescriptionItems = products.filter((p) => p.requiresPrescription);
        if (prescriptionItems.length > 0 && !data.prescriptionRef?.trim() && !data.managerApprovedBy?.trim()) {
            const names = prescriptionItems.map((p) => p.name).join(", ");
            throw new Error(`Prescription Required: The item(s) "${names}" require a doctor prescription. Please provide the doctor prescription reference or confirmation details.`);
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
            include: { locations: true },
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
            const effectiveUnitPrice = item.unitPrice !== undefined ? Number(item.unitPrice) : baseUnitPrice * multiplier;
            const itemSubTotal = effectiveUnitPrice * item.quantity;
            calculatedSubTotal += itemSubTotal;
            const batches = batchMap.get(item.productId) || [];
            const totalStockAvailable = batches.reduce((acc, b) => acc + b.quantity, 0);
            if (totalStockAvailable < totalBaseUnitsNeeded) {
                throw new Error(`Insufficient non-expired stock for "${prod.name}". Available: ${totalStockAvailable} base units, requested: ${totalBaseUnitsNeeded} (${item.quantity} ${item.unitType || "units"})`);
            }
            let targetBatch = null;
            let targetLocation = null;
            // If a specific batch inventoryId was specified and has enough stock
            if (item.inventoryId) {
                targetBatch = batches.find((b) => b.id === item.inventoryId);
                if (!targetBatch) {
                    throw new Error(`Selected batch not found or expired for "${prod.name}"`);
                }
                // Validate expiry at sale time
                if (targetBatch.expiryDate && targetBatch.expiryDate <= now) {
                    throw new Error(`Batch ${targetBatch.batchNumber} for "${prod.name}" has expired and cannot be sold.`);
                }
                if (!targetBatch.locations || targetBatch.locations.length === 0) {
                    targetBatch.locations = [];
                }
                if (item.inventoryLocationId) {
                    targetLocation = (targetBatch.locations || []).find((l) => l.id === item.inventoryLocationId);
                    if (!targetLocation || targetLocation.quantity < totalBaseUnitsNeeded) {
                        throw new Error(`Selected physical location for "${prod.name}" has insufficient stock (${targetLocation?.quantity || 0} available, ${totalBaseUnitsNeeded} needed).`);
                    }
                }
                else {
                    // Find first location with enough stock (FEFO within batch)
                    const sortedLocations = (targetBatch.locations || []).sort((a, b) => a.quantity - b.quantity);
                    targetLocation = sortedLocations.find((l) => l.quantity >= totalBaseUnitsNeeded);
                    if (!targetLocation && (targetBatch.locations || []).length > 0) {
                        // Try to combine from locations
                        targetLocation = (targetBatch.locations || [])[0];
                        if (targetLocation && targetLocation.quantity < totalBaseUnitsNeeded) {
                            throw new Error(`No single physical location has enough stock for "${prod.name}". Please select a specific location with sufficient quantity.`);
                        }
                    }
                }
            }
            else {
                // Apply FEFO allocation across batches
                let unitsRemainingToDeduct = totalBaseUnitsNeeded;
                let primaryBatch = null;
                let primaryLocation = null;
                for (const batch of batches) {
                    if (unitsRemainingToDeduct <= 0)
                        break;
                    if (batch.quantity <= 0)
                        continue;
                    // Validate expiry
                    if (batch.expiryDate && batch.expiryDate <= now)
                        continue;
                    const deductFromThisBatch = Math.min(batch.quantity, unitsRemainingToDeduct);
                    batch.quantity -= deductFromThisBatch;
                    unitsRemainingToDeduct -= deductFromThisBatch;
                    if (!primaryBatch) {
                        primaryBatch = batch;
                        // Find a location in this batch with stock
                        const sortedLocs = (batch.locations || []).sort((a, b) => a.quantity - b.quantity);
                        primaryLocation = sortedLocs.length > 0 ? sortedLocs[0] : null;
                    }
                }
                if (unitsRemainingToDeduct > 0) {
                    throw new Error(`Insufficient non-expired stock for "${prod.name}". Need ${totalBaseUnitsNeeded} base units.`);
                }
                targetBatch = primaryBatch;
                targetLocation = primaryLocation;
            }
            // Build stock deduction record
            stockDeductions.push({
                inventoryId: targetBatch.id,
                inventoryLocationId: targetLocation ? targetLocation.id : null,
                quantityToDeduct: totalBaseUnitsNeeded,
                productId: item.productId,
                inventoryLocationData: targetLocation || null,
            });
            preparedSaleItems.push({
                productId: item.productId,
                inventoryId: targetBatch.id,
                inventoryLocationId: targetLocation ? targetLocation.id : null,
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
        // Validate all locations have enough stock before proceeding
        for (const deduction of stockDeductions) {
            if (deduction.inventoryLocationId && deduction.inventoryLocationData) {
                const loc = deduction.inventoryLocationData;
                if (loc.quantity < deduction.quantityToDeduct) {
                    throw new Error(`Insufficient stock at physical location for this sale. Location has ${loc.quantity}, need ${deduction.quantityToDeduct}.`);
                }
            }
        }
        // 6. Discount & Tax calculations (Auto-rounded to integer)
        let discountAmount = 0;
        if (data.discount && data.discount > 0) {
            if (data.discountType === "PERCENT") {
                discountAmount = Math.round(calculatedSubTotal * (data.discount / 100));
            }
            else {
                discountAmount = Math.round(Number(data.discount));
            }
        }
        const taxAmount = Math.round(Number(data.tax || 0));
        const rawTotal = Math.max(0, calculatedSubTotal - discountAmount + taxAmount);
        const totalAmount = data.totalAmount !== undefined ? Math.round(Number(data.totalAmount)) : Math.round(rawTotal);
        const paidAmount = data.paidAmount !== undefined ? Math.round(Number(data.paidAmount)) : totalAmount;
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
                    financialAccountId: data.financialAccountId || null,
                    customerName: data.customerName || "Walk-in Customer",
                    customerPhone: data.customerPhone || null,
                    customerEmail: data.customerEmail || null,
                    subTotal: data.subTotal !== undefined ? Math.round(Number(data.subTotal)) : Math.round(calculatedSubTotal),
                    discount: discountAmount,
                    discountType: data.discountType || "FIXED",
                    tax: taxAmount,
                    totalAmount,
                    paidAmount: Math.min(paidAmount, totalAmount),
                    dueAmount,
                    changeAmount,
                    paymentMethod: data.paymentMethod,
                    bankName: data.bankName || null,
                    transactionRef: data.transactionRef || null,
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
                const locData = deduction.inventoryLocationData;
                const locLabel = locData
                    ? `${locData.rack?.name || locData.rackName || "?"} → ${locData.shelf?.name || locData.shelfName || "?"} → ${locData.bin?.name || locData.binName || "?"}`
                    : "Bulk Storage";
                await tx.inventory.update({
                    where: { id: deduction.inventoryId },
                    data: { quantity: { decrement: deduction.quantityToDeduct } },
                });
                if (deduction.inventoryLocationId && locData) {
                    await tx.inventoryLocation.update({
                        where: { id: deduction.inventoryLocationId },
                        data: { quantity: { decrement: deduction.quantityToDeduct } },
                    });
                }
                await tx.stockMovement.create({
                    data: {
                        branchId: data.branchId,
                        productId: deduction.productId,
                        inventoryId: deduction.inventoryId,
                        fromLocationId: deduction.inventoryLocationId || null,
                        type: "SALE",
                        quantity: -deduction.quantityToDeduct,
                        unitPrice: preparedSaleItems.find((i) => i.productId === deduction.productId)?.purchasePrice || 0,
                        reason: `POS Sale Receipt #${receiptNo} [${locLabel}]`,
                        referenceId: createdSale.id,
                        performedBy: userId,
                    },
                });
            }
            // Record Financial Transaction in accounting ledger and update account balance
            const actualPaid = Math.min(paidAmount, totalAmount);
            if (actualPaid > 0) {
                let financialAccount = null;
                // 1. If explicit financialAccountId passed, validate it directly against tenant and branch
                if (data.financialAccountId) {
                    financialAccount = await tx.financialAccount.findFirst({
                        where: { id: data.financialAccountId, tenantId, isActive: true },
                    });
                    if (!financialAccount) {
                        throw new Error("Selected financial account is invalid or inactive.");
                    }
                    if (financialAccount.branchId && financialAccount.branchId !== data.branchId) {
                        throw new Error("Selected financial account does not belong to the active branch.");
                    }
                }
                else {
                    // 2. If not explicitly passed, resolve matching account for this specific branch
                    const pMethod = String(data.paymentMethod).toUpperCase();
                    const notesLower = (data.notes || "").toLowerCase();
                    if (pMethod === "BKASH" || (pMethod === "MOBILE" && notesLower.includes("bkash"))) {
                        financialAccount = await tx.financialAccount.findFirst({
                            where: {
                                tenantId,
                                branchId: data.branchId,
                                isActive: true,
                                OR: [
                                    { type: "BKASH" },
                                    { name: { contains: "bkash", mode: "insensitive" } },
                                ],
                            },
                        });
                    }
                    else if (pMethod === "NAGAD" || (pMethod === "MOBILE" && notesLower.includes("nagad"))) {
                        financialAccount = await tx.financialAccount.findFirst({
                            where: {
                                tenantId,
                                branchId: data.branchId,
                                isActive: true,
                                OR: [
                                    { type: "NAGAD" },
                                    { name: { contains: "nagad", mode: "insensitive" } },
                                ],
                            },
                        });
                    }
                    else if (pMethod === "BANK" || pMethod === "CARD") {
                        if (data.bankName) {
                            financialAccount = await tx.financialAccount.findFirst({
                                where: {
                                    tenantId,
                                    branchId: data.branchId,
                                    type: "BANK",
                                    isActive: true,
                                    OR: [
                                        { name: { contains: data.bankName, mode: "insensitive" } },
                                        { bankName: { contains: data.bankName, mode: "insensitive" } },
                                    ],
                                },
                            });
                        }
                        if (!financialAccount) {
                            financialAccount = await tx.financialAccount.findFirst({
                                where: {
                                    tenantId,
                                    branchId: data.branchId,
                                    type: "BANK",
                                    isActive: true,
                                },
                                orderBy: { isDefault: "desc" },
                            });
                        }
                    }
                    // Fallback to cash drawer of current branch if still not resolved
                    if (!financialAccount) {
                        financialAccount = await tx.financialAccount.findFirst({
                            where: {
                                tenantId,
                                branchId: data.branchId,
                                type: "CASH",
                                isActive: true,
                            },
                            orderBy: { isDefault: "desc" },
                        });
                    }
                    // Ultimate branch fallback: any active account in this branch
                    if (!financialAccount) {
                        financialAccount = await tx.financialAccount.findFirst({
                            where: { tenantId, branchId: data.branchId, isActive: true },
                        });
                    }
                }
                if (!financialAccount) {
                    throw new Error("No active financial account exists for this branch. Please create a financial account for this branch in Accounts & Finance first.");
                }
                // Increment account balance atomically
                await tx.financialAccount.update({
                    where: { id: financialAccount.id },
                    data: { balance: { increment: actualPaid } },
                });
                // Link financialAccountId in sale record
                await tx.sale.update({
                    where: { id: createdSale.id },
                    data: { financialAccountId: financialAccount.id },
                });
                // Create Double-Entry Ledger Entry
                await tx.financialTransaction.create({
                    data: {
                        tenantId,
                        branchId: data.branchId,
                        destinationAccountId: financialAccount.id,
                        amount: actualPaid,
                        type: "SALE_PAYMENT",
                        reference: receiptNo,
                        note: `POS Sale Receipt #${receiptNo} via ${financialAccount.name}${data.transactionRef ? ` (Ref: ${data.transactionRef})` : ""}`,
                        userId,
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
        if (query.paymentStatus === "DUE" || query.hasDue === true) {
            where.dueAmount = { gt: 0 };
        }
        else if (query.paymentStatus === "PAID" || query.hasDue === false) {
            where.dueAmount = { lte: 0 };
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
     * Get Distinct Recent Customers with Phone, Name, Address
     */
    static async getCustomers(tenantId, search) {
        const where = {
            tenantId,
            customerPhone: { not: null },
        };
        if (search && search.trim()) {
            const q = search.trim();
            where.OR = [
                { customerPhone: { contains: q, mode: "insensitive" } },
                { customerName: { contains: q, mode: "insensitive" } },
            ];
        }
        const sales = await prisma_1.prisma.sale.findMany({
            where,
            select: {
                customerPhone: true,
                customerName: true,
                customerEmail: true,
                notes: true,
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 200,
        });
        const customerMap = new Map();
        for (const s of sales) {
            const phone = s.customerPhone?.trim();
            if (!phone || customerMap.has(phone))
                continue;
            let address = "";
            if (s.notes) {
                const match = s.notes.match(/address:\s*([^\n\r|]+)/i);
                if (match && match[1]) {
                    address = match[1].trim();
                }
                else if (!s.notes.includes(":") && s.notes.length < 120 && !s.notes.toLowerCase().includes("via")) {
                    address = s.notes.trim();
                }
            }
            customerMap.set(phone, {
                phone,
                name: s.customerName?.trim() || "Customer",
                email: s.customerEmail?.trim() || undefined,
                address: address || undefined,
            });
        }
        return Array.from(customerMap.values());
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
            // Adjust accounting ledger on refund
            const refundAmount = Number(sale.paidAmount || sale.totalAmount);
            if (refundAmount > 0) {
                const accountType = sale.paymentMethod === "CARD"
                    ? "CARD_SETTLEMENT"
                    : sale.paymentMethod === "MOBILE"
                        ? "MOBILE"
                        : "CASH";
                const financialAccount = await tx.financialAccount.findFirst({
                    where: { tenantId, branchId: sale.branchId, type: accountType, isActive: true },
                });
                if (financialAccount) {
                    await tx.financialAccount.update({
                        where: { id: financialAccount.id },
                        data: { balance: { decrement: refundAmount } },
                    });
                    await tx.financialTransaction.create({
                        data: {
                            tenantId,
                            branchId: sale.branchId,
                            sourceAccountId: financialAccount.id,
                            amount: refundAmount,
                            type: "REFUND",
                            reference: `REFUND-${sale.receiptNo}`,
                            note: `Refund for POS Receipt #${sale.receiptNo}: ${data.reason}`,
                            userId,
                        },
                    });
                }
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
    /**
     * Collect Outstanding Due Payment on an existing sale
     */
    static async collectDue(tenantId, userId, saleId, data) {
        const sale = await prisma_1.prisma.sale.findFirst({
            where: { id: saleId, tenantId },
            include: { branch: true },
        });
        if (!sale) {
            throw new Error("Sale record not found.");
        }
        if (sale.status !== "COMPLETED") {
            throw new Error(`Cannot collect due on a ${sale.status} sale.`);
        }
        const currentDue = Number(sale.dueAmount || 0);
        if (currentDue <= 0) {
            throw new Error("This sale has no outstanding due balance.");
        }
        if (data.amount <= 0) {
            throw new Error("Collected amount must be greater than 0.");
        }
        if (data.amount > currentDue + 0.01) {
            throw new Error(`Collected amount (৳${data.amount}) cannot exceed outstanding due (৳${currentDue}).`);
        }
        const updatedSale = await prisma_1.prisma.$transaction(async (tx) => {
            // Find financial account
            let financialAccount = null;
            if (data.financialAccountId) {
                financialAccount = await tx.financialAccount.findFirst({
                    where: { id: data.financialAccountId, tenantId, isActive: true },
                });
            }
            if (!financialAccount && sale.branchId) {
                const method = (data.paymentMethod || "CASH").toUpperCase();
                financialAccount = await tx.financialAccount.findFirst({
                    where: {
                        tenantId,
                        branchId: sale.branchId,
                        isActive: true,
                        accountType: method === "BANK" || method === "CARD"
                            ? "BANK"
                            : method === "BKASH" || method === "NAGAD" || method === "MOBILE"
                                ? "MOBILE_BANKING"
                                : "CASH",
                    },
                });
                if (!financialAccount) {
                    financialAccount = await tx.financialAccount.findFirst({
                        where: { tenantId, branchId: sale.branchId, isActive: true },
                    });
                }
            }
            if (financialAccount) {
                // Increment account balance atomically
                await tx.financialAccount.update({
                    where: { id: financialAccount.id },
                    data: { balance: { increment: data.amount } },
                });
                // Create transaction entry
                await tx.financialTransaction.create({
                    data: {
                        tenantId,
                        branchId: sale.branchId,
                        destinationAccountId: financialAccount.id,
                        amount: data.amount,
                        type: "SALE_PAYMENT",
                        reference: sale.receiptNo,
                        note: `Due payment collected for Receipt #${sale.receiptNo}${data.notes ? ` (${data.notes})` : ""}${data.transactionRef ? ` Ref: ${data.transactionRef}` : ""}`,
                        userId,
                    },
                });
            }
            const newPaid = Number(sale.paidAmount || 0) + data.amount;
            const newDue = Math.max(0, currentDue - data.amount);
            const noteAddition = `[Due Payment: ৳${data.amount} via ${data.paymentMethod || "CASH"} on ${new Date().toISOString().split("T")[0]}]`;
            const updatedNotes = sale.notes ? `${sale.notes} | ${noteAddition}` : noteAddition;
            const updated = await tx.sale.update({
                where: { id: sale.id },
                data: {
                    paidAmount: newPaid,
                    dueAmount: newDue,
                    notes: updatedNotes,
                },
                include: {
                    branch: { select: { id: true, name: true, location: true } },
                    user: { select: { id: true, name: true, username: true } },
                    items: {
                        include: {
                            product: { select: { id: true, name: true, sku: true, unit: true, size: true } },
                        },
                    },
                },
            });
            return updated;
        });
        await audit_1.AuditService.log({
            tenantId,
            branchId: sale.branchId,
            userId,
            action: "POS_DUE_COLLECTED",
            details: {
                saleId: sale.id,
                receiptNo: sale.receiptNo,
                collectedAmount: data.amount,
                remainingDue: Number(updatedSale.dueAmount),
                customerName: sale.customerName,
                customerPhone: sale.customerPhone,
            },
        });
        return updatedSale;
    }
    /**
     * Get Due Sales aggregate summary statistics
     */
    static async getDueStats(tenantId, branchId) {
        const where = { tenantId, status: "COMPLETED", dueAmount: { gt: 0 } };
        if (branchId && branchId !== "all" && branchId !== "all-branches") {
            where.branchId = branchId;
        }
        const aggregate = await prisma_1.prisma.sale.aggregate({
            where,
            _sum: {
                dueAmount: true,
                totalAmount: true,
                paidAmount: true,
            },
            _count: {
                id: true,
            },
        });
        return {
            totalDue: Number(aggregate._sum?.dueAmount || 0),
            totalDueSalesCount: aggregate._count?.id || 0,
            totalSalesWithDueAmount: Number(aggregate._sum?.totalAmount || 0),
        };
    }
}
exports.SalesService = SalesService;
