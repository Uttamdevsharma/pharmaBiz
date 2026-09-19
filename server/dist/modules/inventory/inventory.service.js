"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const prisma_1 = require("../../app/lib/prisma");
const audit_1 = require("../../app/lib/audit");
class InventoryService {
    /**
     * Complete hierarchical packaging derivation with 4-tier cascade:
     * Tier 1: Inward Receiving records
     * Tier 2: Explicit batch columns (cartonsReceived, looseBoxesReceived)
     * Tier 3: Batch carton & box quantities (cartonQuantity, boxQuantity)
     * Tier 4: Base units fallback (quantity / initialQuantity)
     * Guarantees zero double-counting, isolates cartons vs loose boxes,
     * handles physical location allocations cleanly.
     */
    static calculateBatchPackagingMetrics(inv) {
        const isBottle = inv.packageType === "BOTTLE" ||
            inv.packageType === "SYRUP" ||
            inv.product?.unit === "bottle" ||
            inv.product?.defaultPackType === "BOTTLE" ||
            inv.product?.productType === "SYRUP" ||
            inv.product?.category === "Syrup";
        const isMedicine = !isBottle && (inv.packageType === "MEDICINE" ||
            inv.product?.productType === "MEDICINE" ||
            inv.product?.category === "Medicine" ||
            !inv.product?.productType ||
            Boolean(inv.stripsPerBox && inv.tabletsPerStrip));
        const stripsPerBox = isBottle ? 1 : Math.max(1, inv.stripsPerBox || inv.product?.stripsPerBox || 10);
        const tabletsPerStrip = isBottle ? 1 : Math.max(1, inv.tabletsPerStrip || inv.product?.tabletsPerStrip || 10);
        const tabletsPerBox = isMedicine ? stripsPerBox * tabletsPerStrip : 1;
        const boxesPerCarton = Math.max(1, inv.boxesPerCarton || inv.product?.qtyPerLevel2 || (isBottle ? (inv.product?.stripsPerBox || 12) : 10));
        const tabletsPerCarton = boxesPerCarton * tabletsPerBox;
        // 1. Tier 1: Aggregate receiving records if available
        let recCartons = 0;
        let recLooseBoxes = 0;
        let hasReceivingRecords = false;
        if (Array.isArray(inv.receivingRecords) && inv.receivingRecords.length > 0) {
            hasReceivingRecords = true;
            for (const rec of inv.receivingRecords) {
                if (rec.receivingUnit === "BOX") {
                    recLooseBoxes += Number(rec.boxesReceived) || 0;
                }
                else {
                    recCartons += Number(rec.cartonsReceived) || 0;
                }
            }
        }
        // 2. Determine inward received cartons & loose boxes
        let cartonsReceived = 0;
        let looseBoxesReceived = 0;
        if (hasReceivingRecords && (recCartons > 0 || recLooseBoxes > 0)) {
            cartonsReceived = recCartons;
            looseBoxesReceived = recLooseBoxes;
        }
        else if (Number(inv.cartonsReceived) > 0 || Number(inv.looseBoxesReceived) > 0) {
            cartonsReceived = Number(inv.cartonsReceived) || 0;
            looseBoxesReceived = Number(inv.looseBoxesReceived) || 0;
        }
        else if (Number(inv.cartonQuantity) > 0 || Number(inv.boxQuantity) > 0) {
            if (Number(inv.cartonQuantity) > 0) {
                cartonsReceived = Number(inv.cartonQuantity) + (Number(inv.allocatedCartons) || 0);
                looseBoxesReceived = Math.max(0, (Number(inv.boxQuantity) || 0) - (Number(inv.cartonQuantity) * boxesPerCarton)) + (Number(inv.allocatedLooseBoxes) || 0);
            }
            else {
                cartonsReceived = 0;
                looseBoxesReceived = (Number(inv.boxQuantity) || 0) + (Number(inv.allocatedLooseBoxes) || 0);
            }
        }
        else {
            // Tier 4: Base units fallback
            const totalUnits = Math.max(0, Number(inv.initialQuantity) || Number(inv.quantity) || 0);
            const totalBoxes = Math.floor(totalUnits / tabletsPerBox);
            cartonsReceived = Math.floor(totalBoxes / boxesPerCarton);
            looseBoxesReceived = totalBoxes % boxesPerCarton;
        }
        // 3. Allocations to physical locations
        const totalAllocated = (inv.locations || []).reduce((sum, loc) => sum + (Number(loc.quantity) || 0), 0);
        const totalAllocatedBoxes = Math.floor(totalAllocated / tabletsPerBox);
        let allocatedLooseBoxes = Math.max(0, Number(inv.allocatedLooseBoxes) || 0);
        let boxesAllocatedFromCarton = Math.max(0, Number(inv.boxesAllocatedFromCarton) || 0);
        let allocatedCartons = Math.max(0, Number(inv.allocatedCartons) || 0);
        if (boxesAllocatedFromCarton === 0 && allocatedCartons > 0) {
            boxesAllocatedFromCarton = allocatedCartons * boxesPerCarton;
        }
        if (allocatedCartons === 0 && allocatedLooseBoxes === 0 && boxesAllocatedFromCarton === 0 && totalAllocated > 0) {
            allocatedLooseBoxes = Math.min(looseBoxesReceived, totalAllocatedBoxes);
            const remainingAllocatedBoxes = totalAllocatedBoxes - allocatedLooseBoxes;
            boxesAllocatedFromCarton = Math.min(cartonsReceived * boxesPerCarton, remainingAllocatedBoxes);
            allocatedCartons = Math.min(cartonsReceived, Math.ceil(boxesAllocatedFromCarton / boxesPerCarton));
        }
        // 4. Current Bulk stock Not in Rack
        const currentQuantity = Math.max(0, Number(inv.quantity) || 0);
        const unallocatedBulk = Math.max(0, currentQuantity - totalAllocated);
        const cartonsOpened = Math.ceil(boxesAllocatedFromCarton / boxesPerCarton);
        let fullCartons = Math.max(0, cartonsReceived - cartonsOpened);
        if (inv.cartonQuantity !== undefined && inv.cartonQuantity !== null && Number(inv.cartonQuantity) >= 0) {
            fullCartons = Math.min(fullCartons, Number(inv.cartonQuantity));
        }
        // Cap full cartons by remaining bulk units
        fullCartons = Math.min(fullCartons, Math.floor(unallocatedBulk / tabletsPerCarton));
        const boxesInsideCartons = fullCartons * boxesPerCarton;
        const boxesRemovedFromCarton = boxesAllocatedFromCarton;
        const boxesInOpenCarton = cartonsOpened > 0 ? Math.max(0, (cartonsOpened * boxesPerCarton) - boxesAllocatedFromCarton) : 0;
        const totalCartonBoxesAvailable = boxesInsideCartons + boxesInOpenCarton;
        // Remaining loose boxes received separately from supplier
        let remainingLooseBoxes = Math.max(0, looseBoxesReceived - allocatedLooseBoxes);
        remainingLooseBoxes = Math.min(remainingLooseBoxes, Math.floor(unallocatedBulk / tabletsPerBox));
        if (cartonsReceived === 0 && looseBoxesReceived === 0) {
            remainingLooseBoxes = Math.floor(unallocatedBulk / tabletsPerBox);
        }
        // Total equivalent boxes (zero double-counting)
        const totalEquivalentBoxes = totalCartonBoxesAvailable + remainingLooseBoxes;
        // Remaining loose strips & tablets in bulk
        const bulkUnitsAfterBoxes = Math.max(0, unallocatedBulk - (totalEquivalentBoxes * tabletsPerBox));
        const unboxedStrips = Math.floor(bulkUnitsAfterBoxes / tabletsPerStrip);
        const unboxedTablets = bulkUnitsAfterBoxes % tabletsPerStrip;
        const totalStrips = (totalEquivalentBoxes * stripsPerBox) + unboxedStrips;
        const totalTablets = (totalEquivalentBoxes * tabletsPerBox) + bulkUnitsAfterBoxes;
        const formulaText = isBottle
            ? `${fullCartons} Full Carton${fullCartons !== 1 ? "s" : ""} × ${boxesPerCarton} Bottles = ${boxesInsideCartons} Bottles Inside Cartons + ${remainingLooseBoxes} Loose Bottle${remainingLooseBoxes !== 1 ? "s" : ""} = ${totalEquivalentBoxes} Total Bottles`
            : `${fullCartons} Full Carton${fullCartons !== 1 ? "s" : ""} × ${boxesPerCarton} Boxes = ${boxesInsideCartons} Boxes Inside Cartons + ${remainingLooseBoxes} Loose Box${remainingLooseBoxes !== 1 ? "es" : ""} = ${totalEquivalentBoxes} Total Boxes`;
        return {
            stripsPerBox,
            tabletsPerStrip,
            tabletsPerBox,
            boxesPerCarton,
            tabletsPerCarton,
            cartonsReceived,
            looseBoxesReceived,
            allocatedCartons,
            allocatedLooseBoxes,
            boxesAllocatedFromCarton,
            boxesRemovedFromCarton,
            boxesInOpenCarton,
            totalCartonBoxesAvailable,
            fullCartons,
            boxesInsideCartons,
            remainingLooseBoxes,
            totalEquivalentBoxes,
            totalStrips,
            totalTablets,
            unboxedStrips,
            unboxedTablets,
            remainingStrips: unboxedStrips,
            remainingTablets: unboxedTablets,
            formulaText,
            totalAllocated,
            unallocatedBulk,
            isMedicine,
        };
    }
    /**
     * List Batch Inventory for a Branch with Supplier & Expiry data
     */
    static async getBranchInventory(tenantId, branchId, query) {
        const isAll = !branchId || branchId === "all" || branchId === "all-branches";
        let branch = null;
        if (!isAll) {
            branch = await prisma_1.prisma.branch.findFirst({
                where: { id: branchId, tenantId, isActive: true },
            });
            if (!branch) {
                throw new Error("Branch not found");
            }
        }
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;
        const where = {
            product: { tenantId, isActive: true },
        };
        if (!isAll && branchId) {
            where.branchId = branchId;
        }
        else {
            where.branch = { tenantId, isActive: true };
        }
        if (query.category) {
            where.product.category = { equals: query.category, mode: "insensitive" };
        }
        if (query.search) {
            where.OR = [
                { batchNumber: { contains: query.search, mode: "insensitive" } },
                { barcode: { contains: query.search, mode: "insensitive" } },
                { product: { name: { contains: query.search, mode: "insensitive" } } },
                { product: { genericName: { contains: query.search, mode: "insensitive" } } },
                { product: { sku: { contains: query.search, mode: "insensitive" } } },
                { product: { barcode: { contains: query.search, mode: "insensitive" } } },
                { product: { brandName: { contains: query.search, mode: "insensitive" } } },
                { product: { manufacturer: { contains: query.search, mode: "insensitive" } } },
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
                    branch: {
                        select: { id: true, name: true, location: true },
                    },
                    product: {
                        include: {
                            ...(!isAll && branchId ? { branchOverrides: { where: { branchId } } } : {}),
                            categoryRef: true,
                            brandRef: true,
                            unitRef: true,
                        },
                    },
                    supplier: {
                        select: { id: true, name: true, phone: true },
                    },
                    locations: {
                        where: { quantity: { gt: 0 } },
                        include: {
                            rack: true,
                            shelf: true,
                            bin: true,
                        },
                    },
                    receivingRecords: {
                        orderBy: { receivedDate: "desc" },
                        include: {
                            supplier: {
                                select: { id: true, name: true, phone: true },
                            },
                        },
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
            const metrics = InventoryService.calculateBatchPackagingMetrics(inv);
            const { stripsPerBox, tabletsPerStrip, tabletsPerBox, boxesPerCarton, fullCartons, boxesInsideCartons, remainingLooseBoxes, totalEquivalentBoxes, } = metrics;
            const formattedLocations = (inv.locations || []).map((loc) => {
                const rackName = loc.rack?.name || "—";
                const shelfName = loc.shelf?.name || "—";
                const binName = loc.bin?.name || "—";
                const qty = loc.quantity || 0;
                const fullBoxes = Math.floor(qty / tabletsPerBox);
                const looseTablets = qty % tabletsPerBox;
                const openBoxes = looseTablets > 0 ? 1 : 0;
                const openBoxRemainingStrips = Math.floor(looseTablets / tabletsPerStrip);
                const openBoxRemainingTablets = looseTablets % tabletsPerStrip;
                const parts = [loc.rack?.name, loc.shelf?.name, loc.bin?.name].filter(Boolean);
                const locationLabel = parts.length > 0 ? parts.join(" → ") : "General Shelf";
                const stockParts = [];
                if (fullBoxes > 0)
                    stockParts.push(`${fullBoxes} Box${fullBoxes > 1 ? "es" : ""}`);
                if (openBoxRemainingStrips > 0)
                    stockParts.push(`${openBoxRemainingStrips} Strip${openBoxRemainingStrips > 1 ? "s" : ""}`);
                if (openBoxRemainingTablets > 0)
                    stockParts.push(`${openBoxRemainingTablets} Tab${openBoxRemainingTablets !== 1 ? "s" : ""}`);
                if (stockParts.length === 0)
                    stockParts.push(`${qty} ${inv.product.unit || "units"}`);
                const displayText = stockParts.join(", ");
                return {
                    ...loc,
                    rackName,
                    shelfName,
                    binName,
                    locationLabel,
                    fullBoxes,
                    looseTablets,
                    openBoxes,
                    strips: openBoxRemainingStrips,
                    tablets: openBoxRemainingTablets,
                    openBoxRemainingStrips,
                    openBoxRemainingTablets,
                    displayText,
                    stripsPerBox,
                    tabletsPerStrip,
                    tabletsPerBox,
                    unit: inv.product.unit || "tablet",
                };
            });
            return {
                id: inv.id,
                branchId: inv.branchId,
                branch: inv.branch || (branch ? { id: branch.id, name: branch.name, location: branch.location } : undefined),
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
                sellingPrice: inv.sellingPrice
                    ? Number(inv.sellingPrice)
                    : override
                        ? Number(override.price)
                        : Number(inv.product.basePrice),
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
                cartonQuantity: fullCartons,
                ...metrics,
                boxQuantity: totalEquivalentBoxes,
                packLevel1: inv.product.packLevel1,
                packLevel2: inv.product.packLevel2,
                packLevel3: inv.product.packLevel3,
                packLevel4: inv.product.packLevel4,
                qtyPerLevel2: inv.product.qtyPerLevel2,
                qtyPerLevel3: inv.product.qtyPerLevel3,
                qtyPerLevel4: inv.product.qtyPerLevel4,
                shelfLocation: inv.shelfLocation || inv.product.shelfLocation,
                minStockLevel: inv.minStockLevel,
                lowStockThreshold: inv.lowStockThreshold,
                isLowStock,
                isExpired,
                daysUntilExpiry,
                isNearExpiry: daysUntilExpiry !== null && daysUntilExpiry <= 90 && daysUntilExpiry >= 0,
                supplier: inv.supplier,
                receivedDate: inv.receivedDate || inv.createdAt,
                createdAt: inv.createdAt,
                updatedAt: inv.updatedAt,
                locations: formattedLocations,
                receivingRecords: inv.receivingRecords || [],
                product: inv.product,
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
        let contactPersonName = data.contactPersonName || null;
        if (data.supplierId) {
            supplier = await prisma_1.prisma.supplier.findFirst({
                where: { id: data.supplierId, tenantId },
            });
            if (!supplier)
                throw new Error("Supplier not found");
            if (data.contactPersonId) {
                const cp = await prisma_1.prisma.supplierContact.findFirst({
                    where: { id: data.contactPersonId, tenantId },
                });
                if (cp) {
                    contactPersonName = cp.name;
                }
            }
            else if (supplier.contactPerson) {
                contactPersonName = supplier.contactPerson;
            }
        }
        const mfgDate = data.mfgDate ? new Date(data.mfgDate) : null;
        const expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;
        const receivedDate = data.receivedDate ? new Date(data.receivedDate) : new Date();
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            // 1. Determine receiving unit breakdown using saved product packaging model
            const unit = (product.unit || "").toLowerCase();
            const defaultPack = (product.defaultPackType || "").toUpperCase();
            const pType = (product.productType || "").toUpperCase();
            const cat = (product.category || "").toLowerCase();
            const reqPack = (data.packageType || "").toUpperCase();
            const name = (product.name || "").toLowerCase();
            const generic = (product.genericName || "").toLowerCase();
            let packagingModel = "TABLET";
            if (defaultPack === "BOTTLE" ||
                reqPack === "BOTTLE" ||
                unit === "bottle" ||
                pType === "SYRUP" ||
                cat.includes("syrup") ||
                cat.includes("liquid") ||
                cat.includes("suspension") ||
                cat.includes("drop") ||
                cat.includes("tonic")) {
                packagingModel = "BOTTLE";
            }
            else if (defaultPack === "VIAL" ||
                reqPack === "VIAL" ||
                unit === "vial" ||
                unit === "ampoule" ||
                pType === "SALINE" ||
                cat.includes("inject") ||
                cat.includes("vial") ||
                cat.includes("ampoule") ||
                cat.includes("saline") ||
                cat.includes("infusion") ||
                name.includes("injection") ||
                name.includes("vial") ||
                name.includes("ampoule") ||
                generic.includes("injection") ||
                generic.includes("vial")) {
                packagingModel = "VIAL";
            }
            else if (defaultPack === "PIECE" ||
                reqPack === "PIECE" ||
                unit === "piece" ||
                unit === "pack" ||
                unit === "unit" ||
                unit === "pcs" ||
                pType === "EQUIPMENT" ||
                cat.includes("diaper") ||
                cat.includes("equip") ||
                cat.includes("device") ||
                cat.includes("care") ||
                cat.includes("surgical") ||
                cat.includes("hygiene") ||
                name.includes("diaper") ||
                generic.includes("diaper") ||
                name.includes("syringe") ||
                generic.includes("syringe")) {
                packagingModel = "PIECE";
            }
            const isBottle = packagingModel === "BOTTLE";
            const isPiece = packagingModel === "PIECE";
            const isVial = packagingModel === "VIAL";
            const isTablet = packagingModel === "TABLET";
            const isBoxReceiving = data.receivingUnit === "BOX";
            const boxesPerCarton = data.boxesPerCarton || product.qtyPerLevel2 || (isBottle ? (product.stripsPerBox || 12) : 10);
            const piecesOrVialsPerBox = product.stripsPerBox || data.stripsPerBox || 1;
            const stripsPerBox = isTablet ? (product.stripsPerBox || data.stripsPerBox || 10) : (isPiece || isVial ? piecesOrVialsPerBox : 1);
            const tabletsPerStrip = isTablet ? (product.tabletsPerStrip || data.tabletsPerStrip || 10) : 1;
            const unitsPerBox = isBottle ? 1 : (isTablet ? (stripsPerBox * tabletsPerStrip) : piecesOrVialsPerBox);
            let cartonsReceived = 0;
            let boxesReceived = 0;
            let looseBoxesReceived = 0;
            if (isBoxReceiving) {
                boxesReceived = data.boxesReceived ?? data.boxQuantity ?? Math.max(1, Math.round(data.quantity / unitsPerBox));
                looseBoxesReceived = boxesReceived;
            }
            else {
                cartonsReceived = data.cartonsReceived ?? data.cartonQuantity ?? Math.max(1, Math.round(data.quantity / (boxesPerCarton * unitsPerBox)));
                boxesReceived = cartonsReceived * boxesPerCarton;
            }
            // Price Derivation: Box Price -> Strip Price -> Tablet Price (or per Bottle / Piece / Vial)
            let boxPurchasePrice = data.boxPurchasePrice !== undefined && data.boxPurchasePrice !== null ? Number(data.boxPurchasePrice) : null;
            let purchasePrice = data.purchasePrice !== undefined && data.purchasePrice !== null ? Number(data.purchasePrice) : null;
            if (isBottle) {
                if (purchasePrice === null && boxPurchasePrice !== null)
                    purchasePrice = boxPurchasePrice;
                if (boxPurchasePrice === null && purchasePrice !== null)
                    boxPurchasePrice = purchasePrice;
            }
            else {
                if (boxPurchasePrice !== null && purchasePrice === null) {
                    purchasePrice = unitsPerBox > 0 ? Math.round((boxPurchasePrice / unitsPerBox) * 100) / 100 : 0;
                }
                else if (purchasePrice !== null && boxPurchasePrice === null) {
                    boxPurchasePrice = Math.round((purchasePrice * unitsPerBox) * 100) / 100;
                }
            }
            let boxSellingPrice = data.boxSellingPrice !== undefined && data.boxSellingPrice !== null ? Number(data.boxSellingPrice) : null;
            let sellingPrice = data.sellingPrice !== undefined && data.sellingPrice !== null ? Number(data.sellingPrice) : null;
            if (isBottle) {
                if (sellingPrice === null && boxSellingPrice !== null)
                    sellingPrice = boxSellingPrice;
                if (boxSellingPrice === null && sellingPrice !== null)
                    boxSellingPrice = sellingPrice;
            }
            else {
                if (boxSellingPrice !== null && sellingPrice === null) {
                    sellingPrice = unitsPerBox > 0 ? Math.round((boxSellingPrice / unitsPerBox) * 100) / 100 : 0;
                }
                else if (sellingPrice !== null && boxSellingPrice === null) {
                    boxSellingPrice = Math.round((sellingPrice * unitsPerBox) * 100) / 100;
                }
            }
            // 2. Look for existing batch
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
                        cartonQuantity: isBoxReceiving ? undefined : { increment: cartonsReceived },
                        cartonsReceived: isBoxReceiving ? undefined : { increment: cartonsReceived },
                        looseBoxesReceived: isBoxReceiving ? { increment: looseBoxesReceived } : undefined,
                        boxQuantity: { increment: boxesReceived },
                        purchasePrice: purchasePrice !== null ? purchasePrice : existingInv.purchasePrice,
                        sellingPrice: sellingPrice !== null ? sellingPrice : existingInv.sellingPrice,
                        boxPurchasePrice: boxPurchasePrice !== null ? boxPurchasePrice : existingInv.boxPurchasePrice,
                        boxSellingPrice: boxSellingPrice !== null ? boxSellingPrice : existingInv.boxSellingPrice,
                        supplierId: data.supplierId || existingInv.supplierId,
                        shelfLocation: data.shelfLocation || existingInv.shelfLocation,
                        expiryDate: expiryDate || existingInv.expiryDate,
                        receivedDate: data.receivedDate ? receivedDate : existingInv.receivedDate || receivedDate,
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
                        receivedDate,
                        packageType: packagingModel,
                        cartonQuantity: isBoxReceiving ? 0 : cartonsReceived,
                        cartonsReceived: isBoxReceiving ? 0 : cartonsReceived,
                        looseBoxesReceived: isBoxReceiving ? looseBoxesReceived : 0,
                        allocatedCartons: 0,
                        allocatedLooseBoxes: 0,
                        boxesPerCarton,
                        boxQuantity: boxesReceived,
                        stripsPerBox,
                        tabletsPerStrip,
                        purchasePrice,
                        sellingPrice: sellingPrice !== null ? sellingPrice : product.basePrice,
                        boxPurchasePrice,
                        boxSellingPrice,
                        shelfLocation: data.shelfLocation || product.shelfLocation || null,
                        minStockLevel: product.minStockAlert || 10,
                        lowStockThreshold: 5,
                    },
                });
            }
            // 3. Create individual BatchReceivingRecord
            await tx.batchReceivingRecord.create({
                data: {
                    inventoryId: inventory.id,
                    branchId: data.branchId,
                    productId: data.productId,
                    supplierId: data.supplierId || null,
                    contactPersonId: data.contactPersonId || null,
                    contactPersonName,
                    batchNumber: data.batchNumber || null,
                    receivingUnit: isBoxReceiving ? "BOX" : "CARTON",
                    cartonsReceived: isBoxReceiving ? 0 : cartonsReceived,
                    boxesPerCarton,
                    boxesReceived,
                    stripsPerBox,
                    tabletsPerStrip,
                    totalQuantity: data.quantity,
                    purchasePrice,
                    sellingPrice,
                    boxPurchasePrice,
                    boxSellingPrice,
                    receivedDate,
                    expiryDate,
                    mfgDate,
                    invoiceNo: data.invoiceNo || null,
                    notes: data.notes || null,
                    receivedBy: userId,
                },
            });
            // 4. Record Stock Movement
            const movement = await tx.stockMovement.create({
                data: {
                    branchId: data.branchId,
                    productId: data.productId,
                    inventoryId: inventory.id,
                    batchNumber: data.batchNumber || null,
                    type: "PURCHASE",
                    quantity: data.quantity,
                    unitPrice: purchasePrice || 0,
                    reason: data.notes || "Stock Inward (Direct Batch Entry)",
                    performedBy: userId,
                },
            });
            // 5. Update Financial Account & Supplier Financials
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
            // 6. Create official Purchase & PurchaseItem records so Purchase History and Supplier Ledger reflect stock intake
            const effectiveUnitCost = purchasePrice || 0;
            const totalPurchaseValue = effectiveUnitCost * data.quantity;
            const due = Math.max(0, totalPurchaseValue - paid);
            const purchaseStatus = due === 0 ? "PAID" : paid > 0 ? "PARTIAL" : "DUE";
            const invoiceNo = data.invoiceNo || `PUR-${inventory.batchNumber || Date.now().toString().slice(-6)}`;
            const purchaseRecord = await tx.purchase.create({
                data: {
                    tenantId,
                    branchId: data.branchId,
                    supplierId: data.supplierId || null,
                    contactPersonId: data.contactPersonId || null,
                    contactPersonName,
                    invoiceNo,
                    purchaseDate: receivedDate,
                    totalAmount: totalPurchaseValue,
                    paidAmount: paid,
                    dueAmount: due,
                    paymentStatus: purchaseStatus,
                    paymentMethod: paid > 0 && financialAccount ? (financialAccount.type || "CASH") : "CASH",
                    notes: data.notes || `Stock Inward Batch ${inventory.batchNumber || ""}`,
                    receivedBy: userId,
                    items: {
                        create: [
                            {
                                productId: data.productId,
                                inventoryId: inventory.id,
                                batchNumber: data.batchNumber || null,
                                barcode: data.barcode || product.barcode || null,
                                mfgDate,
                                expiryDate,
                                packageType: data.packageType || product.category || "Medicine",
                                cartonQuantity: isBoxReceiving ? 0 : cartonsReceived,
                                boxQuantity: boxesReceived,
                                stripsPerBox,
                                tabletsPerStrip,
                                quantity: data.quantity,
                                unitPurchasePrice: effectiveUnitCost,
                                unitSellingPrice: sellingPrice || 0,
                                totalAmount: totalPurchaseValue,
                                shelfLocation: data.shelfLocation || null,
                            },
                        ],
                    },
                },
            });
            if (data.supplierId && supplier) {
                await tx.supplier.update({
                    where: { id: data.supplierId },
                    data: {
                        totalPurchased: { increment: totalPurchaseValue },
                        totalPaid: { increment: paid },
                        totalDue: { increment: due },
                    },
                });
                // Record SupplierPayment history if paid > 0
                if (paid > 0) {
                    await tx.supplierPayment.create({
                        data: {
                            tenantId,
                            supplierId: data.supplierId,
                            branchId: data.branchId,
                            purchaseId: purchaseRecord.id,
                            financialAccountId: financialAccount ? financialAccount.id : null,
                            amount: paid,
                            previousDue: Number(supplier.totalDue || 0),
                            remainingDue: Math.max(0, Number(supplier.totalDue || 0) + due),
                            paymentMethod: financialAccount ? financialAccount.type : "CASH",
                            reference: invoiceNo,
                            notes: `Paid at stock intake for invoice #${invoiceNo}`,
                            paidBy: userId,
                            paymentDate: receivedDate,
                        },
                    });
                }
            }
            return { inventory, movement, purchase: purchaseRecord };
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
                        receivedDate: new Date(),
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
     * Allocate Stock from Bulk to Physical Location
     */
    static async allocateStock(tenantId, userId, data) {
        const inventory = await prisma_1.prisma.inventory.findFirst({
            where: { id: data.inventoryId, branch: { tenantId } },
            include: {
                locations: {
                    include: { rack: true, shelf: true, bin: true },
                },
            },
        });
        if (!inventory)
            throw new Error("Inventory/Batch not found");
        const totalAllocated = (inventory.locations || []).reduce((sum, loc) => sum + loc.quantity, 0);
        const unallocatedBulk = inventory.quantity - totalAllocated;
        if (data.quantity > unallocatedBulk) {
            throw new Error(`Cannot allocate more than bulk quantity. Available bulk: ${unallocatedBulk}`);
        }
        // Resolve rack/shelf/bin names to IDs
        let rackId = data.rackId || null;
        let shelfId = data.shelfId || null;
        let binId = data.binId || null;
        // Resolve parent IDs if partial child ID was provided
        if (binId && (!shelfId || !rackId)) {
            const b = await prisma_1.prisma.bin.findUnique({
                where: { id: binId },
                include: { shelf: true },
            });
            if (b) {
                shelfId = shelfId || b.shelfId;
                rackId = rackId || b.shelf?.rackId;
            }
        }
        if (shelfId && !rackId) {
            const s = await prisma_1.prisma.shelf.findUnique({
                where: { id: shelfId },
            });
            if (s) {
                rackId = rackId || s.rackId;
            }
        }
        // Resolve or auto-create rack/shelf/bin names to IDs
        if (data.rack && !rackId) {
            const trimmed = data.rack.trim();
            let rack = await prisma_1.prisma.rack.findFirst({
                where: { branchId: inventory.branchId, name: trimmed },
            });
            if (!rack) {
                rack = await prisma_1.prisma.rack.create({
                    data: { branchId: inventory.branchId, name: trimmed },
                });
            }
            rackId = rack.id;
        }
        if (data.shelf && !shelfId && rackId) {
            const trimmed = data.shelf.trim();
            let shelf = await prisma_1.prisma.shelf.findFirst({
                where: { rackId, name: trimmed },
            });
            if (!shelf) {
                shelf = await prisma_1.prisma.shelf.create({
                    data: { rackId, name: trimmed },
                });
            }
            shelfId = shelf.id;
        }
        if (data.bin && !binId && shelfId) {
            const trimmed = data.bin.trim();
            let bin = await prisma_1.prisma.bin.findFirst({
                where: { shelfId, name: trimmed },
            });
            if (!bin) {
                bin = await prisma_1.prisma.bin.create({
                    data: { shelfId, name: trimmed },
                });
            }
            binId = bin.id;
        }
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            // Check if same location already exists for this batch
            let location = await tx.inventoryLocation.findFirst({
                where: {
                    inventoryId: inventory.id,
                    rackId,
                    shelfId,
                    binId,
                },
            });
            if (location) {
                location = await tx.inventoryLocation.update({
                    where: { id: location.id },
                    data: { quantity: { increment: data.quantity } },
                });
            }
            else {
                location = await tx.inventoryLocation.create({
                    data: {
                        inventoryId: inventory.id,
                        rackId,
                        shelfId,
                        binId,
                        quantity: data.quantity,
                    },
                });
            }
            // 2. Determine carton vs loose box allocation deduction
            const stripsPerBox = inventory.stripsPerBox || 10;
            const tabletsPerStrip = inventory.tabletsPerStrip || 10;
            const tabletsPerBox = Math.max(1, stripsPerBox * tabletsPerStrip);
            const boxesPerCarton = inventory.boxesPerCarton || 10;
            const totalLoose = Number(inventory.looseBoxesReceived) || 0;
            const currAllocatedLoose = Number(inventory.allocatedLooseBoxes) || 0;
            const remainingLoose = Math.max(0, totalLoose - currAllocatedLoose);
            const cartonsReceived = Number(inventory.cartonsReceived) || Number(inventory.cartonQuantity) || 0;
            const totalCartonBoxes = cartonsReceived * boxesPerCarton;
            const currBoxesFromCarton = Number(inventory.boxesAllocatedFromCarton) || (Number(inventory.allocatedCartons) || 0) * boxesPerCarton;
            const remainingCartonBoxes = Math.max(0, totalCartonBoxes - currBoxesFromCarton);
            const boxesToAllocate = data.boxesAllocated ?? Math.ceil(data.quantity / tabletsPerBox);
            let looseToAllocate = 0;
            let cartonBoxesToAllocate = 0;
            let defaultReason = "Stock Placed in Rack";
            let movementReferenceId = "ALLOCATION";
            if (data.allocationSource === "FROM_CARTON" || data.allocationSource === "CARTON") {
                cartonBoxesToAllocate = boxesToAllocate;
                looseToAllocate = 0;
                if (cartonBoxesToAllocate > remainingCartonBoxes && totalCartonBoxes > 0) {
                    throw new Error(`Cannot allocate ${cartonBoxesToAllocate} boxes from carton. Only ${remainingCartonBoxes} boxes available in cartons.`);
                }
                movementReferenceId = "FROM_CARTON";
                defaultReason = `Stock Placed in Rack (From Carton): ${cartonBoxesToAllocate} Box${cartonBoxesToAllocate > 1 ? "es" : ""} (${data.quantity} units)`;
            }
            else if (data.allocationSource === "LOOSE_BOX") {
                looseToAllocate = boxesToAllocate;
                cartonBoxesToAllocate = 0;
                if (looseToAllocate > remainingLoose && totalLoose > 0) {
                    throw new Error(`Cannot allocate ${looseToAllocate} loose boxes. Only ${remainingLoose} loose boxes available.`);
                }
                movementReferenceId = "LOOSE_BOX";
                defaultReason = `Stock Placed in Rack (Loose Box): ${looseToAllocate} Loose Box${looseToAllocate > 1 ? "es" : ""} (${data.quantity} units)`;
            }
            else if (data.allocationSource === "LOOSE_STRIP") {
                looseToAllocate = 0;
                cartonBoxesToAllocate = 0;
                movementReferenceId = "LOOSE_STRIP";
                defaultReason = `Stock Placed in Rack (Loose Strip): ${data.stripsAllocated || Math.ceil(data.quantity / tabletsPerStrip)} Loose Strip(s) (${data.quantity} units)`;
            }
            else if (data.allocationSource === "LOOSE_TABLET") {
                looseToAllocate = 0;
                cartonBoxesToAllocate = 0;
                movementReferenceId = "LOOSE_TABLET";
                defaultReason = `Stock Placed in Rack (Loose Tablet): ${data.quantity} Loose Tablet(s)`;
            }
            else {
                // AUTO: prioritize loose boxes first, then allocate from cartons if needed
                if (remainingLoose >= boxesToAllocate) {
                    looseToAllocate = boxesToAllocate;
                    movementReferenceId = "LOOSE_BOX";
                    defaultReason = `Stock Placed in Rack (Loose Box): ${looseToAllocate} Loose Box${looseToAllocate > 1 ? "es" : ""} (${data.quantity} units)`;
                }
                else {
                    looseToAllocate = remainingLoose;
                    const remainingNeeded = boxesToAllocate - looseToAllocate;
                    cartonBoxesToAllocate = remainingNeeded;
                    movementReferenceId = "FROM_CARTON";
                    defaultReason = `Stock Placed in Rack: ${cartonBoxesToAllocate} Box(es) from carton, ${looseToAllocate} loose box(es) (${data.quantity} units)`;
                }
            }
            if (looseToAllocate > 0 || cartonBoxesToAllocate > 0) {
                const newTotalBoxesFromCarton = currBoxesFromCarton + cartonBoxesToAllocate;
                const newCartonsOpened = Math.ceil(newTotalBoxesFromCarton / boxesPerCarton);
                const newRemainingCartons = Math.max(0, cartonsReceived - newCartonsOpened);
                await tx.inventory.update({
                    where: { id: inventory.id },
                    data: {
                        allocatedLooseBoxes: looseToAllocate > 0 ? { increment: looseToAllocate } : undefined,
                        boxesAllocatedFromCarton: cartonBoxesToAllocate > 0 ? { increment: cartonBoxesToAllocate } : undefined,
                        allocatedCartons: cartonBoxesToAllocate > 0 ? newCartonsOpened : undefined,
                        cartonQuantity: cartonBoxesToAllocate > 0 ? newRemainingCartons : undefined,
                    },
                });
            }
            const movement = await tx.stockMovement.create({
                data: {
                    branchId: inventory.branchId,
                    productId: inventory.productId,
                    inventoryId: inventory.id,
                    batchNumber: inventory.batchNumber,
                    type: "ALLOCATION",
                    quantity: data.quantity,
                    referenceId: movementReferenceId,
                    toLocationId: location.id,
                    reason: data.notes || defaultReason,
                    performedBy: userId,
                },
            });
            return { location, movement };
        });
        return result;
    }
    /**
     * Get single batch stock details with full receiving records and locations
     */
    static async getBatchDetails(tenantId, inventoryId) {
        const inv = await prisma_1.prisma.inventory.findFirst({
            where: { id: inventoryId, branch: { tenantId } },
            include: {
                product: {
                    include: {
                        categoryRef: true,
                        brandRef: true,
                        unitRef: true,
                    },
                },
                supplier: {
                    select: { id: true, name: true, phone: true, email: true },
                },
                locations: {
                    include: {
                        rack: true,
                        shelf: true,
                        bin: true,
                    },
                },
                receivingRecords: {
                    orderBy: { receivedDate: "desc" },
                    include: {
                        supplier: {
                            select: { id: true, name: true, phone: true },
                        },
                    },
                },
            },
        });
        if (!inv)
            throw new Error("Batch not found");
        const metrics = InventoryService.calculateBatchPackagingMetrics(inv);
        const { stripsPerBox, tabletsPerStrip, tabletsPerBox, boxesPerCarton, fullCartons, boxesInsideCartons, remainingLooseBoxes, totalEquivalentBoxes, totalStrips, totalTablets, unboxedStrips, unboxedTablets, formulaText, totalAllocated, unallocatedBulk, } = metrics;
        const formattedLocations = (inv.locations || []).map((loc) => {
            const rackName = loc.rack?.name || "—";
            const shelfName = loc.shelf?.name || "—";
            const binName = loc.bin?.name || "—";
            const qty = loc.quantity || 0;
            const fullBoxes = Math.floor(qty / tabletsPerBox);
            const looseTablets = qty % tabletsPerBox;
            const openBoxes = looseTablets > 0 ? 1 : 0;
            const openBoxRemainingStrips = Math.floor(looseTablets / tabletsPerStrip);
            const openBoxRemainingTablets = looseTablets % tabletsPerStrip;
            const parts = [loc.rack?.name, loc.shelf?.name, loc.bin?.name].filter(Boolean);
            const locationLabel = parts.length > 0 ? parts.join(" → ") : "General Shelf";
            const stockParts = [];
            if (fullBoxes > 0)
                stockParts.push(`${fullBoxes} Box${fullBoxes > 1 ? "es" : ""}`);
            if (openBoxRemainingStrips > 0)
                stockParts.push(`${openBoxRemainingStrips} Strip${openBoxRemainingStrips > 1 ? "s" : ""}`);
            if (openBoxRemainingTablets > 0)
                stockParts.push(`${openBoxRemainingTablets} Tab${openBoxRemainingTablets !== 1 ? "s" : ""}`);
            if (stockParts.length === 0)
                stockParts.push(`${qty} ${inv.product.unit || "units"}`);
            const displayText = stockParts.join(", ");
            return {
                ...loc,
                rackName,
                shelfName,
                binName,
                locationLabel,
                fullBoxes,
                looseTablets,
                openBoxes,
                strips: openBoxRemainingStrips,
                tablets: openBoxRemainingTablets,
                openBoxRemainingStrips,
                openBoxRemainingTablets,
                displayText,
                stripsPerBox,
                tabletsPerStrip,
                tabletsPerBox,
                unit: inv.product.unit || "tablet",
            };
        });
        return {
            ...inv,
            ...metrics,
            cartonQuantity: fullCartons,
            boxQuantity: totalEquivalentBoxes,
            locations: formattedLocations,
            receivingRecords: inv.receivingRecords || [],
        };
    }
    /**
     * Move Stock from one Location to another Location or back to Bulk
     */
    static async moveStock(tenantId, userId, data) {
        const fromLocation = await prisma_1.prisma.inventoryLocation.findFirst({
            where: { id: data.fromLocationId, inventory: { branch: { tenantId } } },
            include: { inventory: true },
        });
        if (!fromLocation)
            throw new Error("Source location not found");
        if (data.quantity > fromLocation.quantity) {
            throw new Error(`Cannot move more than location quantity. Available: ${fromLocation.quantity}`);
        }
        // Resolve rack/shelf/bin names to IDs for destination
        let rackId = data.rackId || null;
        let shelfId = data.shelfId || null;
        let binId = data.binId || null;
        // Resolve parent IDs if partial child ID was provided
        if (binId && (!shelfId || !rackId)) {
            const b = await prisma_1.prisma.bin.findUnique({
                where: { id: binId },
                include: { shelf: true },
            });
            if (b) {
                shelfId = shelfId || b.shelfId;
                rackId = rackId || b.shelf?.rackId;
            }
        }
        if (shelfId && !rackId) {
            const s = await prisma_1.prisma.shelf.findUnique({
                where: { id: shelfId },
            });
            if (s) {
                rackId = rackId || s.rackId;
            }
        }
        // Resolve or auto-create rack/shelf/bin names to IDs
        if (data.rack && !rackId) {
            const trimmed = data.rack.trim();
            let rack = await prisma_1.prisma.rack.findFirst({
                where: { branchId: fromLocation.inventory.branchId, name: trimmed },
            });
            if (!rack) {
                rack = await prisma_1.prisma.rack.create({
                    data: { branchId: fromLocation.inventory.branchId, name: trimmed },
                });
            }
            rackId = rack.id;
        }
        if (data.shelf && !shelfId && rackId) {
            const trimmed = data.shelf.trim();
            let shelf = await prisma_1.prisma.shelf.findFirst({
                where: { rackId, name: trimmed },
            });
            if (!shelf) {
                shelf = await prisma_1.prisma.shelf.create({
                    data: { rackId, name: trimmed },
                });
            }
            shelfId = shelf.id;
        }
        if (data.bin && !binId && shelfId) {
            const trimmed = data.bin.trim();
            let bin = await prisma_1.prisma.bin.findFirst({
                where: { shelfId, name: trimmed },
            });
            if (!bin) {
                bin = await prisma_1.prisma.bin.create({
                    data: { shelfId, name: trimmed },
                });
            }
            binId = bin.id;
        }
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            // Deduct from source location
            const updatedFromLocation = await tx.inventoryLocation.update({
                where: { id: fromLocation.id },
                data: { quantity: { decrement: data.quantity } },
            });
            // Add to destination location
            let toLocation = await tx.inventoryLocation.findFirst({
                where: {
                    inventoryId: fromLocation.inventoryId,
                    rackId,
                    shelfId,
                    binId,
                },
            });
            if (toLocation) {
                toLocation = await tx.inventoryLocation.update({
                    where: { id: toLocation.id },
                    data: { quantity: { increment: data.quantity } },
                });
            }
            else {
                toLocation = await tx.inventoryLocation.create({
                    data: {
                        inventoryId: fromLocation.inventoryId,
                        rackId,
                        shelfId,
                        binId,
                        quantity: data.quantity,
                    },
                });
            }
            const movement = await tx.stockMovement.create({
                data: {
                    branchId: fromLocation.inventory.branchId,
                    productId: fromLocation.inventory.productId,
                    inventoryId: fromLocation.inventoryId,
                    batchNumber: fromLocation.inventory.batchNumber,
                    type: "LOCATION_TRANSFER",
                    quantity: data.quantity,
                    fromLocationId: fromLocation.id,
                    toLocationId: toLocation.id,
                    reason: data.notes || "Location Transfer",
                    performedBy: userId,
                },
            });
            return { fromLocation: updatedFromLocation, toLocation, movement };
        });
        return result;
    }
    /**
     * Remove Expired Stock with Source Isolation (Bulk Carton vs Rack/Shelf/Bin)
     */
    static async removeExpiredStock(tenantId, userId, data) {
        const inventory = await prisma_1.prisma.inventory.findFirst({
            where: { id: data.inventoryId, branchId: data.branchId, branch: { tenantId } },
            include: {
                locations: { include: { rack: true, shelf: true, bin: true } },
                product: true,
            },
        });
        if (!inventory)
            throw new Error("Inventory batch record not found in this branch");
        const totalAllocated = (inventory.locations || []).reduce((sum, loc) => sum + loc.quantity, 0);
        const unallocatedBulk = inventory.quantity - totalAllocated;
        let targetLocation = null;
        if (data.source === "BULK") {
            if (data.quantity > unallocatedBulk) {
                throw new Error(`Cannot remove more than available bulk stock. Available bulk: ${unallocatedBulk} units`);
            }
        }
        else {
            if (!data.locationId) {
                throw new Error("Physical Location ID is required when removing physical shelf stock");
            }
            targetLocation = (inventory.locations || []).find((l) => l.id === data.locationId);
            if (!targetLocation) {
                throw new Error("Specified physical location does not exist for this batch");
            }
            if (data.quantity > targetLocation.quantity) {
                throw new Error(`Cannot remove more than location quantity. Available at location: ${targetLocation.quantity} units`);
            }
        }
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            // 1. If physical location, decrement location quantity
            if (data.source === "LOCATION" && targetLocation) {
                await tx.inventoryLocation.update({
                    where: { id: targetLocation.id },
                    data: { quantity: { decrement: data.quantity } },
                });
            }
            // 2. Decrement batch overall quantity
            const updatedInventory = await tx.inventory.update({
                where: { id: inventory.id },
                data: { quantity: { decrement: data.quantity } },
            });
            // 3. Create permanent immutable StockMovement ledger entry
            const locationLabel = data.source === "LOCATION" && targetLocation
                ? `Rack: ${targetLocation.rack?.name || targetLocation.rack || "-"} / Shelf: ${targetLocation.shelf?.name || targetLocation.shelf || "-"} / Bin: ${targetLocation.bin?.name || targetLocation.bin || "-"}`
                : "Bulk / Carton Storage";
            const movement = await tx.stockMovement.create({
                data: {
                    branchId: inventory.branchId,
                    productId: inventory.productId,
                    inventoryId: inventory.id,
                    batchNumber: inventory.batchNumber,
                    type: "DAMAGE",
                    quantity: -data.quantity,
                    fromLocationId: data.source === "LOCATION" ? targetLocation?.id : null,
                    unitPrice: inventory.purchasePrice || 0,
                    reason: `[EXPIRED REMOVAL] ${data.reason || "Expired stock removed from pharmacy"} (${locationLabel})`,
                    performedBy: userId,
                },
            });
            return { inventory: updatedInventory, movement };
        });
        await audit_1.AuditService.log({
            tenantId,
            branchId: data.branchId,
            userId,
            action: "EXPIRED_STOCK_REMOVAL",
            details: {
                inventoryId: inventory.id,
                productId: inventory.productId,
                productName: inventory.product?.name,
                batchNumber: inventory.batchNumber,
                source: data.source,
                quantityRemoved: data.quantity,
                reason: data.reason,
            },
        });
        return result;
    }
    /**
     * Stock Movement / History Ledger with Date Range & Filters
     */
    static async listMovements(tenantId, query, userRole, userBranchId) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.max(1, Math.min(100, query.limit || 20));
        const skip = (page - 1) * limit;
        const where = {};
        if (["BRANCH_MANAGER", "CASHIER"].includes(userRole) && userBranchId) {
            where.branchId = userBranchId;
        }
        else if (query.branchId) {
            where.branchId = query.branchId;
        }
        else {
            const tenantBranches = await prisma_1.prisma.branch.findMany({
                where: { tenantId },
                select: { id: true },
            });
            where.branchId = { in: tenantBranches.map((b) => b.id) };
        }
        if (query.productId) {
            where.productId = query.productId;
        }
        // Filter by specific batch/inventory record
        if (query.inventoryId) {
            where.inventoryId = query.inventoryId;
        }
        // Filter by specific physical location (from OR to)
        if (query.locationId) {
            where.OR = [
                { fromLocationId: query.locationId },
                { toLocationId: query.locationId },
            ];
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
        // Search — only if locationId is not already setting OR
        if (typeof query.search === "string" && query.search.trim() && !query.locationId) {
            where.OR = [
                { reason: { contains: query.search.trim(), mode: "insensitive" } },
                { batchNumber: { contains: query.search.trim(), mode: "insensitive" } },
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
                    inventory: {
                        include: {
                            product: {
                                select: { id: true, name: true, genericName: true, unit: true, size: true, manufacturer: true },
                            },
                        },
                    },
                    fromLocation: {
                        select: {
                            id: true,
                            rack: { select: { id: true, name: true } },
                            shelf: { select: { id: true, name: true } },
                            bin: { select: { id: true, name: true } },
                        },
                    },
                    toLocation: {
                        select: {
                            id: true,
                            rack: { select: { id: true, name: true } },
                            shelf: { select: { id: true, name: true } },
                            bin: { select: { id: true, name: true } },
                        },
                    },
                },
            }),
        ]);
        // Gather product info for movements where inventory may be decoupled
        const missingProductIds = movements
            .filter((m) => !m.inventory?.product && m.productId)
            .map((m) => m.productId);
        let productMap = new Map();
        if (missingProductIds.length > 0) {
            const prods = await prisma_1.prisma.product.findMany({
                where: { id: { in: missingProductIds } },
                select: { id: true, name: true, genericName: true, unit: true, size: true, manufacturer: true, stripsPerBox: true, tabletsPerStrip: true },
            });
            productMap = new Map(prods.map((p) => [p.id, p]));
        }
        // Gather user info for performedBy
        const userIds = Array.from(new Set(movements.map((m) => m.performedBy).filter(Boolean)));
        let userMap = new Map();
        if (userIds.length > 0) {
            const users = await prisma_1.prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, name: true, role: true },
            });
            userMap = new Map(users.map((u) => [u.id, u.name || u.role || "Staff"]));
        }
        const formattedMovements = movements.map((m) => {
            const prod = m.inventory?.product || productMap.get(m.productId) || {
                name: "Unknown Product",
                genericName: null,
                unit: "unit",
            };
            const formatLoc = (loc) => {
                if (!loc)
                    return null;
                const rackName = loc.rack?.name || "-";
                const shelfName = loc.shelf?.name || "-";
                const binName = loc.bin?.name || "-";
                return `${rackName} → ${shelfName} → ${binName}`;
            };
            const fromLabel = formatLoc(m.fromLocation) || (m.type === "ALLOCATION" ? "Stock Not in Rack" : m.type === "PURCHASE" ? "Supplier Intake" : "Stock Not in Rack");
            const toLabel = formatLoc(m.toLocation) || (m.type === "SALE" ? "Customer POS Sale" : m.type === "DAMAGE" ? "Damaged/Expired Removal" : m.type === "PURCHASE" ? "Stock Not in Rack" : "—");
            let sourceDestination = "";
            if (m.type === "ALLOCATION") {
                sourceDestination = `Stock Not in Rack → ${formatLoc(m.toLocation) || "Rack / Shelf / Bin"}`;
            }
            else if (m.type === "LOCATION_TRANSFER") {
                sourceDestination = `${formatLoc(m.fromLocation) || "Shelf"} → ${formatLoc(m.toLocation) || "Shelf"}`;
            }
            else if (m.type === "PURCHASE") {
                sourceDestination = `Supplier Intake → Stock Not in Rack`;
            }
            else if (m.type === "SALE") {
                sourceDestination = m.fromLocation ? `${formatLoc(m.fromLocation)} → Customer POS Sale` : "Stock Not in Rack → Customer POS Sale";
            }
            else if (m.type === "DAMAGE") {
                sourceDestination = m.fromLocation ? `${formatLoc(m.fromLocation)} → Expired/Damaged Removal` : "Stock Not in Rack → Expired/Damaged Removal";
            }
            else {
                sourceDestination = `${fromLabel} → ${toLabel}`;
            }
            // Action label mapping
            let actionLabel = "Stock Movement";
            switch (m.type) {
                case "PURCHASE":
                    actionLabel = "Stock Received";
                    break;
                case "ALLOCATION":
                    actionLabel = "Stock Placed in Rack";
                    break;
                case "LOCATION_TRANSFER":
                    actionLabel = "Stock Moved";
                    break;
                case "SALE":
                    actionLabel = "POS Sale";
                    break;
                case "DAMAGE":
                    actionLabel = "Damaged";
                    break;
                case "RETURN":
                    actionLabel = "Stock Returned";
                    break;
                case "ADJUSTMENT":
                    actionLabel = "Stock Adjustment";
                    break;
                case "TRANSFER_OUT":
                    actionLabel = "Transfer Out";
                    break;
                case "TRANSFER_IN":
                    actionLabel = "Transfer Received";
                    break;
            }
            // Packaging unit display
            const stripsPerBox = m.inventory?.stripsPerBox || prod?.stripsPerBox || 10;
            const tabletsPerStrip = m.inventory?.tabletsPerStrip || prod?.tabletsPerStrip || 10;
            const tabletsPerBox = stripsPerBox * tabletsPerStrip;
            const boxesPerCarton = m.inventory?.boxesPerCarton || 10;
            const tabletsPerCarton = boxesPerCarton * tabletsPerBox;
            const absQty = Math.abs(m.quantity || 0);
            let packagingUnit = "Tablets";
            let packagingDisplay = "";
            if (absQty >= tabletsPerCarton && absQty % tabletsPerCarton === 0) {
                const c = absQty / tabletsPerCarton;
                packagingUnit = "Carton";
                packagingDisplay = `${c} Carton${c > 1 ? "s" : ""}`;
            }
            else if (absQty >= tabletsPerBox && absQty % tabletsPerBox === 0) {
                const b = absQty / tabletsPerBox;
                packagingUnit = "Box";
                packagingDisplay = `${b} Box${b > 1 ? "es" : ""}`;
            }
            else if (absQty >= tabletsPerStrip && absQty % tabletsPerStrip === 0) {
                const s = absQty / tabletsPerStrip;
                packagingUnit = "Strip";
                packagingDisplay = `${s} Strip${s > 1 ? "s" : ""}`;
            }
            else {
                packagingUnit = prod.unit || "Tablet";
                packagingDisplay = `${absQty} ${prod.unit || "unit"}${absQty !== 1 ? "s" : ""}`;
            }
            let sourceType = "—";
            if (m.type === "ALLOCATION") {
                if (m.referenceId === "FROM_CARTON" || (m.reason && m.reason.includes("From Carton"))) {
                    sourceType = "From Carton";
                }
                else if (m.referenceId === "LOOSE_BOX" || (m.reason && m.reason.includes("Loose Box"))) {
                    sourceType = "Loose Box";
                }
                else if (m.referenceId === "LOOSE_STRIP" || (m.reason && m.reason.includes("Loose Strip"))) {
                    sourceType = "Loose Strip";
                }
                else if (m.referenceId === "LOOSE_TABLET" || (m.reason && m.reason.includes("Loose Tablet"))) {
                    sourceType = "Loose Tablet";
                }
            }
            const performedByName = userMap.get(m.performedBy) || "Staff";
            return {
                ...m,
                product: prod,
                sourceDestination,
                fromLocationLabel: fromLabel,
                toLocationLabel: toLabel,
                performedByName,
                actionLabel,
                packagingUnit,
                packagingDisplay,
                sourceType,
            };
        });
        return {
            data: formattedMovements,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Dedicated Stock Receiving History Query
     * Pulls real inward receiving records (BatchReceivingRecord & StockMovement of type PURCHASE)
     */
    static async listReceivingHistory(tenantId, query, userRole, userBranchId) {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
        const skip = (page - 1) * limit;
        const branchWhere = {};
        if (["BRANCH_MANAGER", "CASHIER"].includes(userRole) && userBranchId) {
            branchWhere.branchId = userBranchId;
        }
        else if (query.branchId && query.branchId !== "all") {
            branchWhere.branchId = query.branchId;
        }
        else {
            const tenantBranches = await prisma_1.prisma.branch.findMany({
                where: { tenantId },
                select: { id: true },
            });
            branchWhere.branchId = { in: tenantBranches.map((b) => b.id) };
        }
        const dateFilter = {};
        if (query.startDate || query.endDate) {
            if (query.startDate) {
                const start = new Date(query.startDate);
                start.setHours(0, 0, 0, 0);
                dateFilter.gte = start;
            }
            if (query.endDate) {
                const end = new Date(query.endDate);
                end.setHours(23, 59, 59, 999);
                dateFilter.lte = end;
            }
        }
        // Try BatchReceivingRecord first
        const recWhere = { ...branchWhere };
        if (Object.keys(dateFilter).length > 0) {
            recWhere.receivedDate = dateFilter;
        }
        if (query.search && query.search.trim()) {
            const q = query.search.trim();
            recWhere.OR = [
                { batchNumber: { contains: q, mode: "insensitive" } },
                { invoiceNo: { contains: q, mode: "insensitive" } },
                { supplier: { name: { contains: q, mode: "insensitive" } } },
                { inventory: { product: { name: { contains: q, mode: "insensitive" } } } },
            ];
        }
        const batchCount = await prisma_1.prisma.batchReceivingRecord.count({ where: recWhere });
        if (batchCount > 0) {
            const records = await prisma_1.prisma.batchReceivingRecord.findMany({
                where: recWhere,
                skip,
                take: limit,
                orderBy: { receivedDate: "desc" },
                include: {
                    supplier: { select: { id: true, name: true } },
                    inventory: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    genericName: true,
                                    unit: true,
                                    category: true,
                                    stripsPerBox: true,
                                    tabletsPerStrip: true,
                                    qtyPerLevel2: true,
                                },
                            },
                            supplier: { select: { id: true, name: true } },
                        },
                    },
                },
            });
            // Product fallback lookup
            const missingProductIds = records
                .filter((r) => !r.inventory?.product && r.productId)
                .map((r) => r.productId);
            let productMap = new Map();
            if (missingProductIds.length > 0) {
                const prods = await prisma_1.prisma.product.findMany({
                    where: { id: { in: missingProductIds } },
                    select: { id: true, name: true, genericName: true, unit: true, stripsPerBox: true, tabletsPerStrip: true },
                });
                productMap = new Map(prods.map((p) => [p.id, p]));
            }
            const formatted = records.map((rec) => {
                const prod = rec.inventory?.product || productMap.get(rec.productId) || {
                    name: "Unknown Product",
                    genericName: null,
                    unit: "Unit",
                };
                const supplierName = rec.supplier?.name || rec.inventory?.supplier?.name || rec.contactPersonName || "Direct Intake";
                const cartonsReceived = rec.cartonsReceived || 0;
                const boxesReceived = rec.boxesReceived || 0;
                const totalQuantity = rec.totalQuantity || 0;
                const stripsPerBox = rec.stripsPerBox || prod.stripsPerBox || 10;
                const tabletsPerStrip = rec.tabletsPerStrip || prod.tabletsPerStrip || 10;
                const tabletsPerBox = stripsPerBox * tabletsPerStrip;
                const boxesPerCarton = rec.boxesPerCarton || 10;
                let receivingUnit = rec.receivingUnit || "CARTON";
                let receivedQuantityLabel = "";
                let receivingUnitDisplay = "";
                let totalEquivalentLabel = "";
                if (receivingUnit === "CARTON" && cartonsReceived > 0) {
                    receivingUnitDisplay = "Carton";
                    receivedQuantityLabel = `${cartonsReceived} Carton${cartonsReceived > 1 ? "s" : ""}`;
                    const calcBoxes = boxesReceived > 0 ? boxesReceived : cartonsReceived * boxesPerCarton;
                    totalEquivalentLabel = `${calcBoxes} Boxes (${totalQuantity.toLocaleString()} ${prod.unit || "Units"})`;
                }
                else if (receivingUnit === "BOX" && boxesReceived > 0) {
                    receivingUnitDisplay = "Box";
                    receivedQuantityLabel = `${boxesReceived} Box${boxesReceived > 1 ? "es" : ""}`;
                    totalEquivalentLabel = `${totalQuantity.toLocaleString()} ${prod.unit || "Units"}`;
                }
                else {
                    receivingUnitDisplay = prod.unit || "Unit";
                    receivedQuantityLabel = `${totalQuantity.toLocaleString()} ${prod.unit || "Units"}`;
                    totalEquivalentLabel = boxesReceived > 0 ? `${boxesReceived} Boxes` : `${totalQuantity.toLocaleString()} ${prod.unit || "Units"}`;
                }
                const unitPurchasePrice = rec.purchasePrice ? Number(rec.purchasePrice) : 0;
                const boxPurchasePrice = rec.boxPurchasePrice ? Number(rec.boxPurchasePrice) : 0;
                let totalPurchaseValue = 0;
                if (boxPurchasePrice > 0 && boxesReceived > 0) {
                    totalPurchaseValue = boxesReceived * boxPurchasePrice;
                }
                else if (unitPurchasePrice > 0 && totalQuantity > 0) {
                    totalPurchaseValue = totalQuantity * unitPurchasePrice;
                }
                return {
                    id: rec.id,
                    receivedDate: rec.receivedDate || rec.createdAt,
                    product: {
                        id: prod.id,
                        name: prod.name,
                        genericName: prod.genericName,
                        unit: prod.unit || "Unit",
                    },
                    supplierName,
                    batchNumber: rec.batchNumber || "No Batch",
                    invoiceNo: rec.invoiceNo || null,
                    receivedQuantity: cartonsReceived > 0 ? cartonsReceived : boxesReceived > 0 ? boxesReceived : totalQuantity,
                    receivingUnit: receivingUnitDisplay,
                    receivedQuantityLabel,
                    totalEquivalentLabel,
                    totalQuantityUnits: totalQuantity,
                    unitPurchasePrice,
                    boxPurchasePrice,
                    totalPurchaseValue,
                };
            });
            return {
                data: formatted,
                pagination: {
                    page,
                    limit,
                    total: batchCount,
                    totalPages: Math.ceil(batchCount / limit),
                },
            };
        }
        // Fallback to StockMovement where type = PURCHASE
        const movWhere = { ...branchWhere, type: "PURCHASE" };
        if (Object.keys(dateFilter).length > 0) {
            movWhere.createdAt = dateFilter;
        }
        if (query.search && query.search.trim()) {
            const q = query.search.trim();
            movWhere.OR = [
                { batchNumber: { contains: q, mode: "insensitive" } },
                { reason: { contains: q, mode: "insensitive" } },
            ];
        }
        const [movCount, movements] = await Promise.all([
            prisma_1.prisma.stockMovement.count({ where: movWhere }),
            prisma_1.prisma.stockMovement.findMany({
                where: movWhere,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    inventory: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    genericName: true,
                                    unit: true,
                                    stripsPerBox: true,
                                    tabletsPerStrip: true,
                                    qtyPerLevel2: true,
                                },
                            },
                            supplier: { select: { id: true, name: true } },
                        },
                    },
                },
            }),
        ]);
        const missingProdIds = movements
            .filter((m) => !m.inventory?.product && m.productId)
            .map((m) => m.productId);
        let prodMap = new Map();
        if (missingProdIds.length > 0) {
            const prods = await prisma_1.prisma.product.findMany({
                where: { id: { in: missingProdIds } },
                select: { id: true, name: true, genericName: true, unit: true, stripsPerBox: true, tabletsPerStrip: true },
            });
            prodMap = new Map(prods.map((p) => [p.id, p]));
        }
        const formattedMovs = movements.map((m) => {
            const prod = m.inventory?.product || prodMap.get(m.productId) || {
                name: "Product",
                genericName: null,
                unit: "Unit",
            };
            const supplierName = m.inventory?.supplier?.name || "Direct Intake";
            const totalQuantity = Math.abs(m.quantity || 0);
            const stripsPerBox = m.inventory?.stripsPerBox || prod.stripsPerBox || 10;
            const tabletsPerStrip = m.inventory?.tabletsPerStrip || prod.tabletsPerStrip || 10;
            const tabletsPerBox = stripsPerBox * tabletsPerStrip;
            const boxesPerCarton = m.inventory?.boxesPerCarton || 10;
            const tabletsPerCarton = boxesPerCarton * tabletsPerBox;
            let receivingUnitDisplay = "Unit";
            let receivedQuantityLabel = `${totalQuantity.toLocaleString()} ${prod.unit || "Units"}`;
            let totalEquivalentLabel = `${totalQuantity.toLocaleString()} ${prod.unit || "Units"}`;
            let receivedQuantity = totalQuantity;
            if (totalQuantity >= tabletsPerCarton && totalQuantity % tabletsPerCarton === 0) {
                const cartons = totalQuantity / tabletsPerCarton;
                const boxes = cartons * boxesPerCarton;
                receivingUnitDisplay = "Carton";
                receivedQuantity = cartons;
                receivedQuantityLabel = `${cartons} Carton${cartons > 1 ? "s" : ""}`;
                totalEquivalentLabel = `${boxes} Boxes (${totalQuantity.toLocaleString()} ${prod.unit || "Units"})`;
            }
            else if (totalQuantity >= tabletsPerBox && totalQuantity % tabletsPerBox === 0) {
                const boxes = totalQuantity / tabletsPerBox;
                receivingUnitDisplay = "Box";
                receivedQuantity = boxes;
                receivedQuantityLabel = `${boxes} Box${boxes > 1 ? "es" : ""}`;
                totalEquivalentLabel = `${totalQuantity.toLocaleString()} ${prod.unit || "Units"}`;
            }
            const unitPurchasePrice = m.unitPrice ? Number(m.unitPrice) : m.inventory?.purchasePrice ? Number(m.inventory.purchasePrice) : 0;
            const totalPurchaseValue = totalQuantity * unitPurchasePrice;
            return {
                id: m.id,
                receivedDate: m.createdAt,
                product: {
                    id: prod.id,
                    name: prod.name,
                    genericName: prod.genericName,
                    unit: prod.unit || "Unit",
                },
                supplierName,
                batchNumber: m.batchNumber || "No Batch",
                invoiceNo: null,
                receivedQuantity,
                receivingUnit: receivingUnitDisplay,
                receivedQuantityLabel,
                totalEquivalentLabel,
                totalQuantityUnits: totalQuantity,
                unitPurchasePrice,
                boxPurchasePrice: null,
                totalPurchaseValue,
            };
        });
        return {
            data: formattedMovs,
            pagination: {
                page,
                limit,
                total: movCount,
                totalPages: Math.ceil(movCount / limit),
            },
        };
    }
    /**
     * POS: Get FEFO-sorted batches with physical locations for a product
     */
    static async getPosAvailableBatches(tenantId, branchId, productId) {
        const branch = await prisma_1.prisma.branch.findFirst({
            where: { id: branchId, tenantId, isActive: true },
        });
        if (!branch)
            throw new Error("Branch not found");
        const inventories = await prisma_1.prisma.inventory.findMany({
            where: {
                branchId,
                productId,
                quantity: { gt: 0 },
            },
            include: {
                product: true,
                locations: {
                    where: { quantity: { gt: 0 } },
                    include: {
                        rack: { select: { id: true, name: true } },
                        shelf: { select: { id: true, name: true } },
                        bin: { select: { id: true, name: true } },
                    },
                },
                receivingRecords: true,
            },
            orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }],
        });
        const now = new Date();
        return inventories
            .filter((inv) => {
            const isExpired = inv.expiryDate ? new Date(inv.expiryDate) < now : false;
            return !isExpired;
        })
            .map((inv) => {
            const prod = inv.product;
            const metrics = InventoryService.calculateBatchPackagingMetrics(inv);
            const { stripsPerBox, tabletsPerStrip, tabletsPerBox, boxesPerCarton, tabletsPerCarton, fullCartons, remainingLooseBoxes, totalEquivalentBoxes, unallocatedBulk, totalAllocated, unboxedStrips, unboxedTablets, isMedicine, } = metrics;
            const physicalLocations = (inv.locations || []).map((loc) => {
                const rackName = loc.rack?.name || "—";
                const shelfName = loc.shelf?.name || "—";
                const binName = loc.bin?.name || "—";
                const qty = loc.quantity || 0;
                const fullBoxes = Math.floor(qty / tabletsPerBox);
                const looseTablets = qty % tabletsPerBox;
                const openBoxes = looseTablets > 0 ? 1 : 0;
                const openBoxRemainingStrips = Math.floor(looseTablets / tabletsPerStrip);
                const openBoxRemainingTablets = looseTablets % tabletsPerStrip;
                const parts = [loc.rack?.name, loc.shelf?.name, loc.bin?.name].filter(Boolean);
                const locationLabel = parts.length > 0 ? parts.join(" → ") : "General Shelf";
                const stockParts = [];
                if (fullBoxes > 0)
                    stockParts.push(`${fullBoxes} Box${fullBoxes > 1 ? "es" : ""}`);
                if (openBoxRemainingStrips > 0)
                    stockParts.push(`${openBoxRemainingStrips} Strip${openBoxRemainingStrips > 1 ? "s" : ""}`);
                if (openBoxRemainingTablets > 0)
                    stockParts.push(`${openBoxRemainingTablets} Tab${openBoxRemainingTablets !== 1 ? "s" : ""}`);
                if (stockParts.length === 0)
                    stockParts.push(`${qty} ${prod.unit || "units"}`);
                const displayText = stockParts.join(", ");
                return {
                    id: loc.id,
                    inventoryId: loc.inventoryId,
                    rackId: loc.rackId,
                    shelfId: loc.shelfId,
                    binId: loc.binId,
                    quantity: qty,
                    rack: loc.rack,
                    shelf: loc.shelf,
                    bin: loc.bin,
                    rackName,
                    shelfName,
                    binName,
                    locationLabel,
                    fullBoxes,
                    looseTablets,
                    openBoxes,
                    openBoxRemainingStrips,
                    openBoxRemainingTablets,
                    stripsPerBox,
                    tabletsPerStrip,
                    tabletsPerBox,
                    unit: prod.unit || "tablet",
                    displayText,
                };
            });
            return {
                id: inv.id,
                batchNumber: inv.batchNumber || "—",
                expiryDate: inv.expiryDate,
                purchasePrice: inv.purchasePrice,
                sellingPrice: inv.sellingPrice,
                quantity: inv.quantity,
                unallocatedBulk,
                totalAllocated,
                physicalLocations,
                hasPhysicalStock: physicalLocations.length > 0,
                packLevel1: prod.packLevel1,
                packLevel2: prod.packLevel2,
                packLevel3: prod.packLevel3,
                packLevel4: prod.packLevel4,
                qtyPerLevel2: prod.qtyPerLevel2,
                qtyPerLevel3: prod.qtyPerLevel3,
                qtyPerLevel4: prod.qtyPerLevel4,
                stripsPerBox,
                tabletsPerStrip,
                tabletsPerBox,
                tabletsPerCarton,
                fullCartons,
                remainingLooseBoxes,
                looseBoxes: remainingLooseBoxes,
                totalEquivalentBoxes,
                fullBulkBoxes: totalEquivalentBoxes,
                bulkOpenBoxRemainingStrips: unboxedStrips,
                bulkOpenBoxRemainingTablets: unboxedTablets,
                ...metrics,
                isMedicine,
                isExpired: inv.expiryDate ? new Date(inv.expiryDate) < now : false,
                daysUntilExpiry: inv.expiryDate
                    ? Math.ceil((new Date(inv.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                    : null,
            };
        });
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
