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
        const limit = Math.max(1, Math.min(100, query.limit || 50));
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
                    contacts: {
                        where: { isActive: true },
                        take: 10,
                        orderBy: { createdAt: "desc" },
                    },
                    _count: {
                        select: { purchases: true, inventories: true, contacts: true },
                    },
                },
            }),
            prisma_1.prisma.supplier.count({ where }),
        ]);
        // If branchId or date filter is supplied, compute per-supplier purchase & due stats for that scope
        const isFiltered = Boolean(query.startDate || query.endDate || (query.branchId && query.branchId !== "all"));
        if (isFiltered && suppliers.length > 0) {
            const supplierIds = suppliers.map((s) => s.id);
            const purchaseWhere = { tenantId, supplierId: { in: supplierIds } };
            if (query.branchId && query.branchId !== "all") {
                purchaseWhere.branchId = query.branchId;
            }
            if (query.startDate || query.endDate) {
                purchaseWhere.purchaseDate = {};
                if (query.startDate)
                    purchaseWhere.purchaseDate.gte = new Date(query.startDate);
                if (query.endDate) {
                    const end = new Date(query.endDate);
                    end.setHours(23, 59, 59, 999);
                    purchaseWhere.purchaseDate.lte = end;
                }
            }
            const purchases = await prisma_1.prisma.purchase.findMany({
                where: purchaseWhere,
                select: { supplierId: true, totalAmount: true, paidAmount: true, dueAmount: true },
            });
            const statsMap = new Map();
            for (const p of purchases) {
                if (!p.supplierId)
                    continue;
                const curr = statsMap.get(p.supplierId) || { totalPurchased: 0, totalPaid: 0, totalDue: 0 };
                curr.totalPurchased += Number(p.totalAmount || 0);
                curr.totalPaid += Number(p.paidAmount || 0);
                curr.totalDue += Number(p.dueAmount || 0);
                statsMap.set(p.supplierId, curr);
            }
            const formattedSuppliers = suppliers.map((s) => {
                const stats = statsMap.get(s.id) || { totalPurchased: 0, totalPaid: 0, totalDue: 0 };
                return {
                    ...s,
                    periodPurchased: stats.totalPurchased,
                    periodPaid: stats.totalPaid,
                    periodDue: stats.totalDue,
                    totalPurchased: stats.totalPurchased > 0 ? stats.totalPurchased : Number(s.totalPurchased || 0),
                    totalPaid: stats.totalPaid > 0 ? stats.totalPaid : Number(s.totalPaid || 0),
                };
            });
            return {
                data: formattedSuppliers,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            };
        }
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
     * Get single supplier with contacts, purchase history, and payments
     */
    static async getSupplierById(id, tenantId, options) {
        const purchaseWhere = {};
        const paymentWhere = {};
        if (options?.startDate || options?.endDate) {
            const dateFilter = {};
            if (options.startDate) {
                dateFilter.gte = new Date(options.startDate);
            }
            if (options.endDate) {
                const end = new Date(options.endDate);
                end.setHours(23, 59, 59, 999);
                dateFilter.lte = end;
            }
            purchaseWhere.purchaseDate = dateFilter;
            paymentWhere.paymentDate = dateFilter;
        }
        const [supplier, purchaseAgg, paymentAgg] = await Promise.all([
            prisma_1.prisma.supplier.findFirst({
                where: { id, tenantId },
                include: {
                    contacts: {
                        orderBy: { createdAt: "desc" },
                    },
                    purchases: {
                        where: purchaseWhere,
                        orderBy: { purchaseDate: "desc" },
                        take: 100,
                        include: {
                            branch: { select: { id: true, name: true } },
                            contactPerson: { select: { id: true, name: true, phone: true, designation: true } },
                            items: {
                                include: {
                                    product: { select: { id: true, name: true, sku: true, unit: true } },
                                },
                            },
                        },
                    },
                    payments: {
                        where: paymentWhere,
                        orderBy: { paymentDate: "desc" },
                        take: 50,
                        include: {
                            branch: { select: { id: true, name: true } },
                            financialAccount: { select: { id: true, name: true, type: true } },
                        },
                    },
                    _count: {
                        select: { purchases: true, contacts: true, inventories: true },
                    },
                },
            }),
            prisma_1.prisma.purchase.aggregate({
                where: { supplierId: id, tenantId, ...purchaseWhere },
                _sum: { totalAmount: true, paidAmount: true, dueAmount: true },
                _count: { id: true },
            }),
            prisma_1.prisma.supplierPayment.aggregate({
                where: { supplierId: id, tenantId, ...paymentWhere },
                _sum: { amount: true },
                _count: { id: true },
            }),
        ]);
        if (!supplier) {
            throw new Error("Supplier not found");
        }
        const isFiltered = Boolean(options?.startDate || options?.endDate);
        const periodStats = {
            totalPurchased: isFiltered
                ? Number(purchaseAgg._sum?.totalAmount || 0)
                : Number(supplier.totalPurchased || 0),
            totalPaid: isFiltered
                ? Number(paymentAgg._sum?.amount || 0)
                : Number(supplier.totalPaid || 0),
            totalDue: isFiltered
                ? Number(purchaseAgg._sum?.dueAmount || 0)
                : Number(supplier.totalDue || 0),
            purchasesCount: isFiltered
                ? (purchaseAgg._count?.id || 0)
                : (supplier._count?.purchases || 0),
            paymentsCount: paymentAgg._count?.id || 0,
            lifetimeTotalPurchased: Number(supplier.totalPurchased || 0),
            lifetimeTotalPaid: Number(supplier.totalPaid || 0),
            lifetimeTotalDue: Number(supplier.totalDue || 0),
            isFiltered,
        };
        return {
            ...supplier,
            periodStats,
            stats: periodStats,
        };
    }
    /**
     * Create new supplier and optional initial contacts
     */
    static async createSupplier(tenantId, userId, data) {
        const supplierName = data.name.trim();
        const primaryPhone = data.phone?.trim() ||
            (data.contacts && data.contacts.length > 0 ? data.contacts[0].phone.trim() : "—");
        const primaryContact = data.contactPerson?.trim() ||
            (data.contacts && data.contacts.length > 0 ? data.contacts[0].name.trim() : null);
        const supplier = await prisma_1.prisma.$transaction(async (tx) => {
            const sup = await tx.supplier.create({
                data: {
                    tenantId,
                    name: supplierName,
                    phone: primaryPhone,
                    email: data.email?.trim() || null,
                    address: data.address?.trim() || null,
                    company: data.company?.trim() || supplierName,
                    contactPerson: primaryContact,
                    totalPurchased: 0,
                    totalPaid: 0,
                    totalDue: 0,
                    isActive: true,
                },
            });
            if (data.contacts && data.contacts.length > 0) {
                for (const c of data.contacts) {
                    if (c.name && c.phone) {
                        await tx.supplierContact.create({
                            data: {
                                tenantId,
                                supplierId: sup.id,
                                name: c.name.trim(),
                                phone: c.phone.trim(),
                                email: c.email?.trim() || null,
                                designation: c.designation?.trim() || null,
                                isActive: c.isActive !== undefined ? c.isActive : true,
                            },
                        });
                    }
                }
            }
            return sup;
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
     * Contact Person management methods
     */
    static async listContacts(supplierId, tenantId) {
        const supplier = await prisma_1.prisma.supplier.findFirst({
            where: { id: supplierId, tenantId },
        });
        if (!supplier)
            throw new Error("Supplier not found");
        return prisma_1.prisma.supplierContact.findMany({
            where: { supplierId, tenantId },
            orderBy: { createdAt: "desc" },
        });
    }
    static async createContact(supplierId, tenantId, data) {
        const supplier = await prisma_1.prisma.supplier.findFirst({
            where: { id: supplierId, tenantId },
        });
        if (!supplier)
            throw new Error("Supplier not found");
        const contact = await prisma_1.prisma.supplierContact.create({
            data: {
                tenantId,
                supplierId,
                name: data.name.trim(),
                phone: data.phone.trim(),
                email: data.email?.trim() || null,
                designation: data.designation?.trim() || null,
                isActive: data.isActive !== undefined ? data.isActive : true,
            },
        });
        // If supplier doesn't have a contactPerson or phone set, update it as default
        if (!supplier.contactPerson || supplier.phone === "—") {
            await prisma_1.prisma.supplier.update({
                where: { id: supplierId },
                data: {
                    contactPerson: supplier.contactPerson || contact.name,
                    phone: supplier.phone === "—" ? contact.phone : supplier.phone,
                },
            });
        }
        return contact;
    }
    static async updateContact(contactId, supplierId, tenantId, data) {
        const contact = await prisma_1.prisma.supplierContact.findFirst({
            where: { id: contactId, supplierId, tenantId },
        });
        if (!contact)
            throw new Error("Contact person not found");
        const updated = await prisma_1.prisma.supplierContact.update({
            where: { id: contactId },
            data: {
                ...(data.name && { name: data.name.trim() }),
                ...(data.phone && { phone: data.phone.trim() }),
                ...(data.email !== undefined && { email: data.email?.trim() || null }),
                ...(data.designation !== undefined && { designation: data.designation?.trim() || null }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
            },
        });
        return updated;
    }
    static async deleteContact(contactId, supplierId, tenantId) {
        const contact = await prisma_1.prisma.supplierContact.findFirst({
            where: { id: contactId, supplierId, tenantId },
        });
        if (!contact)
            throw new Error("Contact person not found");
        // Toggle/set inactive status
        const updated = await prisma_1.prisma.supplierContact.update({
            where: { id: contactId },
            data: { isActive: false },
        });
        return { message: "Contact deactivated successfully", contact: updated };
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
        let subtotalAmount = 0;
        const preparedItems = data.items.map((item) => {
            const prod = productMap.get(item.productId);
            const itemTotal = item.lineTotal !== undefined && item.lineTotal !== null
                ? Number(item.lineTotal)
                : Number(item.unitPurchasePrice) * item.quantity;
            subtotalAmount += itemTotal;
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
        let invoiceDiscount = 0;
        if (data.discountType === "PERCENT") {
            invoiceDiscount = (subtotalAmount * (Number(data.discountAmount) || 0)) / 100;
        }
        else if (data.discountType === "FIXED") {
            invoiceDiscount = Number(data.discountAmount) || 0;
        }
        const invoiceTax = Number(data.taxAmount) || 0;
        const computedTotal = Math.max(0, Math.round((subtotalAmount - invoiceDiscount + invoiceTax) * 100) / 100);
        const totalPurchaseAmount = data.totalAmount !== undefined && data.totalAmount !== null
            ? Number(data.totalAmount)
            : computedTotal;
        const paidAmount = Number(data.paidAmount || 0);
        const dueAmount = Math.max(0, Math.round((totalPurchaseAmount - paidAmount) * 100) / 100);
        const paymentStatus = dueAmount === 0 ? "PAID" : paidAmount > 0 ? "PARTIAL" : "DUE";
        const noteParts = [];
        if (data.notes)
            noteParts.push(data.notes);
        if (invoiceDiscount > 0)
            noteParts.push(`Discount: -৳${invoiceDiscount.toFixed(2)} (${data.discountType})`);
        if (invoiceTax > 0)
            noteParts.push(`Tax: +৳${invoiceTax.toFixed(2)}`);
        const finalNotes = noteParts.length > 0 ? noteParts.join(" | ") : null;
        const purchaseDate = data.purchaseDate ? new Date(data.purchaseDate) : new Date();
        // 4. Execute atomic transaction
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            // Resolve contact person if ID provided
            let contactPersonName = data.contactPersonName || null;
            if (data.contactPersonId) {
                const cp = await prisma_1.prisma.supplierContact.findFirst({
                    where: { id: data.contactPersonId, tenantId },
                });
                if (cp) {
                    contactPersonName = cp.name;
                }
            }
            else if (supplier && supplier.contactPerson) {
                contactPersonName = supplier.contactPerson;
            }
            // Create Purchase Record
            const purchase = await tx.purchase.create({
                data: {
                    tenantId,
                    branchId: data.branchId,
                    supplierId: data.supplierId || null,
                    contactPersonId: data.contactPersonId || null,
                    contactPersonName,
                    invoiceNo: data.invoiceNo || `PUR-${Date.now().toString().slice(-6)}`,
                    purchaseDate,
                    totalAmount: totalPurchaseAmount,
                    paidAmount,
                    dueAmount,
                    paymentStatus,
                    paymentMethod: data.paymentMethod || "CASH",
                    notes: finalNotes,
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
                    contactPerson: true,
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
            // Update Financial Account Balance if paidAmount > 0
            if (paidAmount > 0) {
                if (!data.financialAccountId) {
                    throw new Error("A valid financial account for the selected branch is required when paying a purchase invoice.");
                }
                const finAcc = await tx.financialAccount.findFirst({
                    where: { id: data.financialAccountId, tenantId, branchId: data.branchId, isActive: true },
                });
                if (!finAcc) {
                    throw new Error("Selected financial account does not exist or does not belong to this branch.");
                }
                await tx.financialAccount.update({
                    where: { id: finAcc.id },
                    data: { balance: { decrement: paidAmount } },
                });
                await tx.financialTransaction.create({
                    data: {
                        tenantId,
                        branchId: data.branchId,
                        sourceAccountId: finAcc.id,
                        amount: paidAmount,
                        type: "PURCHASE_PAYMENT",
                        reference: purchase.invoiceNo,
                        note: `Purchase invoice #${purchase.invoiceNo} via ${finAcc.name}`,
                        userId,
                    },
                });
                // Record SupplierPayment history
                if (data.supplierId) {
                    await tx.supplierPayment.create({
                        data: {
                            tenantId,
                            supplierId: data.supplierId,
                            branchId: data.branchId,
                            purchaseId: purchase.id,
                            financialAccountId: finAcc.id,
                            amount: paidAmount,
                            previousDue: Number(supplier ? supplier.totalDue : 0),
                            remainingDue: Math.max(0, Number(supplier ? supplier.totalDue : 0) + dueAmount),
                            paymentMethod: data.paymentMethod || finAcc.type || "CASH",
                            reference: purchase.invoiceNo,
                            notes: `Initial payment at purchase for invoice #${purchase.invoiceNo}`,
                            paidBy: userId,
                            paymentDate: purchaseDate,
                        },
                    });
                }
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
                            receivedDate: data.purchaseDate ? new Date(data.purchaseDate) : existingInventory.receivedDate || new Date(),
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
                            receivedDate: data.purchaseDate ? new Date(data.purchaseDate) : new Date(),
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
                // Record Batch Receiving Record
                await tx.batchReceivingRecord.create({
                    data: {
                        inventoryId,
                        branchId: data.branchId,
                        productId: item.productId,
                        supplierId: data.supplierId || null,
                        contactPersonId: data.contactPersonId || null,
                        contactPersonName: purchase.contactPersonName || null,
                        batchNumber: item.batchNumber || null,
                        receivingUnit: item.cartonQuantity && item.cartonQuantity > 0 ? "CARTON" : "BOX",
                        cartonsReceived: item.cartonQuantity || 0,
                        boxesPerCarton: item.cartonQuantity && item.cartonQuantity > 0 ? Math.round((item.boxQuantity || 0) / item.cartonQuantity) || 10 : 10,
                        boxesReceived: item.boxQuantity || 0,
                        stripsPerBox: item.stripsPerBox || 10,
                        tabletsPerStrip: item.tabletsPerStrip || 10,
                        totalQuantity: item.quantity,
                        purchasePrice: item.unitPurchasePrice,
                        sellingPrice: item.unitSellingPrice,
                        receivedDate: data.purchaseDate ? new Date(data.purchaseDate) : new Date(),
                        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
                        mfgDate: item.mfgDate ? new Date(item.mfgDate) : null,
                        invoiceNo: purchase.invoiceNo || null,
                        notes: data.notes || null,
                        receivedBy: userId,
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
        const limit = Math.max(1, Math.min(100, query.limit || 50));
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
        if (query.contactPersonId) {
            where.contactPersonId = query.contactPersonId;
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
                { contactPersonName: { contains: query.search, mode: "insensitive" } },
                { supplier: { name: { contains: query.search, mode: "insensitive" } } },
                { contactPerson: { name: { contains: query.search, mode: "insensitive" } } },
            ];
        }
        const [purchases, total] = await Promise.all([
            prisma_1.prisma.purchase.findMany({
                where,
                skip,
                take: limit,
                orderBy: { purchaseDate: "desc" },
                include: {
                    supplier: { select: { id: true, name: true, phone: true, company: true } },
                    contactPerson: { select: { id: true, name: true, phone: true, designation: true } },
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
        if (!data.financialAccountId) {
            throw new Error("Financial account is required for recording supplier payment.");
        }
        const financialAcc = await prisma_1.prisma.financialAccount.findFirst({
            where: { id: data.financialAccountId, tenantId, isActive: true },
        });
        if (!financialAcc) {
            throw new Error("Selected financial account does not exist or is inactive.");
        }
        const payAmount = Number(data.amount);
        const newDue = Math.max(0, Number(supplier.totalDue) - payAmount);
        const newPaid = Number(supplier.totalPaid) + payAmount;
        const paymentDate = data.paymentDate ? new Date(data.paymentDate) : new Date();
        // Reduce due amounts on open purchases for this supplier
        const openPurchases = await prisma_1.prisma.purchase.findMany({
            where: { tenantId, supplierId, dueAmount: { gt: 0 } },
            orderBy: { purchaseDate: "asc" },
        });
        let remainingPay = payAmount;
        for (const p of openPurchases) {
            if (remainingPay <= 0)
                break;
            const pDue = Number(p.dueAmount || 0);
            const pPaid = Number(p.paidAmount || 0);
            const chunk = Math.min(pDue, remainingPay);
            const nextDue = pDue - chunk;
            const nextPaid = pPaid + chunk;
            const status = nextDue === 0 ? "PAID" : "PARTIAL";
            await prisma_1.prisma.purchase.update({
                where: { id: p.id },
                data: {
                    dueAmount: nextDue,
                    paidAmount: nextPaid,
                    paymentStatus: status,
                },
            });
            remainingPay -= chunk;
        }
        // Atomic update of supplier dues, supplierPayment record & financial account balance
        const [updated, paymentRecord] = await prisma_1.prisma.$transaction(async (tx) => {
            const sup = await tx.supplier.update({
                where: { id: supplierId },
                data: {
                    totalPaid: newPaid,
                    totalDue: newDue,
                },
            });
            const pRecord = await tx.supplierPayment.create({
                data: {
                    tenantId,
                    supplierId,
                    branchId: data.branchId || financialAcc.branchId,
                    purchaseId: data.purchaseId || null,
                    financialAccountId: financialAcc.id,
                    amount: payAmount,
                    previousDue: Number(supplier.totalDue || 0),
                    remainingDue: newDue,
                    paymentMethod: data.paymentMethod || financialAcc.type || "CASH",
                    reference: data.reference || `PAY-${supplier.name.slice(0, 12)}-${Date.now().toString().slice(-4)}`,
                    notes: data.notes || `Supplier payment for ${supplier.name} via ${financialAcc.name}`,
                    paidBy: userId,
                    paymentDate,
                },
            });
            await tx.financialAccount.update({
                where: { id: financialAcc.id },
                data: { balance: { decrement: payAmount } },
            });
            await tx.financialTransaction.create({
                data: {
                    tenantId,
                    branchId: data.branchId || financialAcc.branchId,
                    sourceAccountId: financialAcc.id,
                    amount: payAmount,
                    type: "PURCHASE_PAYMENT",
                    reference: pRecord.reference,
                    note: pRecord.notes,
                    userId,
                },
            });
            return [sup, pRecord];
        });
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
        return { ...updated, payment: paymentRecord };
    }
    /**
     * List recorded supplier settlement payments
     */
    static async listSupplierPayments(tenantId, query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.max(1, Math.min(100, query.limit || 50));
        const skip = (page - 1) * limit;
        const where = { tenantId };
        if (query.supplierId)
            where.supplierId = query.supplierId;
        if (query.branchId)
            where.branchId = query.branchId;
        if (query.startDate || query.endDate) {
            where.paymentDate = {};
            if (query.startDate)
                where.paymentDate.gte = new Date(query.startDate);
            if (query.endDate) {
                const end = new Date(query.endDate);
                end.setHours(23, 59, 59, 999);
                where.paymentDate.lte = end;
            }
        }
        if (query.search) {
            where.OR = [
                { reference: { contains: query.search, mode: "insensitive" } },
                { notes: { contains: query.search, mode: "insensitive" } },
                { supplier: { name: { contains: query.search, mode: "insensitive" } } },
            ];
        }
        const [payments, total] = await Promise.all([
            prisma_1.prisma.supplierPayment.findMany({
                where,
                skip,
                take: limit,
                orderBy: { paymentDate: "desc" },
                include: {
                    supplier: { select: { id: true, name: true, phone: true, company: true } },
                    branch: { select: { id: true, name: true } },
                    purchase: { select: { id: true, invoiceNo: true, totalAmount: true } },
                    financialAccount: { select: { id: true, name: true, type: true } },
                },
            }),
            prisma_1.prisma.supplierPayment.count({ where }),
        ]);
        return {
            data: payments,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Summary metrics for supplier dues and purchases across filters
     */
    static async getSupplierDueSummary(tenantId, query) {
        const purchaseWhere = { tenantId };
        const paymentWhere = { tenantId };
        const supplierWhere = { tenantId, isActive: true };
        if (query.supplierId) {
            purchaseWhere.supplierId = query.supplierId;
            paymentWhere.supplierId = query.supplierId;
            supplierWhere.id = query.supplierId;
        }
        if (query.branchId && query.branchId !== "all") {
            purchaseWhere.branchId = query.branchId;
            paymentWhere.branchId = query.branchId;
        }
        if (query.startDate || query.endDate) {
            purchaseWhere.purchaseDate = {};
            paymentWhere.paymentDate = {};
            if (query.startDate) {
                const start = new Date(query.startDate);
                purchaseWhere.purchaseDate.gte = start;
                paymentWhere.paymentDate.gte = start;
            }
            if (query.endDate) {
                const end = new Date(query.endDate);
                end.setHours(23, 59, 59, 999);
                purchaseWhere.purchaseDate.lte = end;
                paymentWhere.paymentDate.lte = end;
            }
        }
        const [purchases, payments, suppliers] = await Promise.all([
            prisma_1.prisma.purchase.findMany({
                where: purchaseWhere,
                select: { totalAmount: true, paidAmount: true, dueAmount: true },
            }),
            prisma_1.prisma.supplierPayment.findMany({
                where: paymentWhere,
                select: { amount: true },
            }),
            prisma_1.prisma.supplier.findMany({
                where: supplierWhere,
                select: { id: true, totalPurchased: true, totalPaid: true, totalDue: true },
            }),
        ]);
        const totalPurchase = purchases.reduce((acc, p) => acc + Number(p.totalAmount || 0), 0);
        const paymentsSum = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
        const purchasePaidSum = purchases.reduce((acc, p) => acc + Number(p.paidAmount || 0), 0);
        const totalPaidInPeriod = Math.max(paymentsSum, purchasePaidSum);
        const totalDueInPeriod = purchases.reduce((acc, p) => acc + Number(p.dueAmount || 0), 0);
        const lifetimePurchases = suppliers.reduce((acc, s) => acc + Number(s.totalPurchased || 0), 0);
        const lifetimePaid = suppliers.reduce((acc, s) => acc + Number(s.totalPaid || 0), 0);
        const lifetimeDue = suppliers.reduce((acc, s) => acc + Number(s.totalDue || 0), 0);
        return {
            totalPurchases: totalPurchase,
            totalPaid: totalPaidInPeriod,
            totalDue: totalDueInPeriod,
            dueCount: purchases.filter((p) => Number(p.dueAmount || 0) > 0).length,
            filtered: {
                totalPurchase,
                totalPurchases: totalPurchase,
                totalPaid: totalPaidInPeriod,
                totalDue: totalDueInPeriod,
                count: purchases.length,
            },
            overall: {
                totalPurchase: lifetimePurchases,
                totalPaid: lifetimePaid,
                totalDue: lifetimeDue,
                supplierCount: suppliers.length,
            },
        };
    }
}
exports.SupplierService = SupplierService;
