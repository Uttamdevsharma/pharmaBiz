"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationService = void 0;
const prisma_1 = require("../../app/lib/prisma");
class LocationService {
    /**
     * Get all racks with nested shelves and bins for a branch.
     * If includeInactive is false, only active items are returned.
     * Also computes usedLocations, emptyLocations, and active stock counts.
     */
    static async getRacks(branchId, includeInactive = false) {
        const where = { branchId };
        if (!includeInactive) {
            where.isActive = true;
        }
        const shelfWhere = {};
        if (!includeInactive) {
            shelfWhere.isActive = true;
        }
        const binWhere = {};
        if (!includeInactive) {
            binWhere.isActive = true;
        }
        const racks = await prisma_1.prisma.rack.findMany({
            where,
            include: {
                shelves: {
                    where: shelfWhere,
                    include: {
                        bins: {
                            where: binWhere,
                            orderBy: { name: "asc" },
                        },
                    },
                    orderBy: { name: "asc" },
                },
                inventoryLocations: {
                    where: { quantity: { gt: 0 } },
                    include: {
                        inventory: {
                            include: {
                                product: {
                                    select: { id: true, name: true, sku: true, unit: true, stripsPerBox: true, tabletsPerStrip: true },
                                },
                            },
                        },
                        rack: { select: { id: true, name: true } },
                        shelf: { select: { id: true, name: true } },
                        bin: { select: { id: true, name: true } },
                    },
                },
            },
            orderBy: { name: "asc" },
        });
        return racks.map((rack) => {
            const numberOfShelves = rack.shelves ? rack.shelves.length : 0;
            let numberOfBins = 0;
            for (const s of rack.shelves || []) {
                numberOfBins += s.bins ? s.bins.length : 0;
            }
            // Collect distinct locations that have active stock
            const usedLocationKeys = new Set();
            let totalStockUnits = 0;
            for (const loc of rack.inventoryLocations || []) {
                if (loc.binId) {
                    usedLocationKeys.add(`bin:${loc.binId}`);
                }
                else if (loc.shelfId) {
                    usedLocationKeys.add(`shelf:${loc.shelfId}`);
                }
                else if (loc.rackId) {
                    usedLocationKeys.add(`rack:${loc.rackId}`);
                }
                totalStockUnits += loc.quantity || 0;
            }
            const usedLocations = usedLocationKeys.size;
            const totalCapacitySlots = numberOfBins > 0 ? numberOfBins : (numberOfShelves > 0 ? numberOfShelves : 1);
            const emptyLocations = Math.max(0, totalCapacitySlots - usedLocations);
            return {
                ...rack,
                numberOfShelves,
                numberOfBins,
                usedLocations,
                emptyLocations,
                totalStockUnits,
            };
        });
    }
    static async quickCreateRack(branchId, data) {
        const rackName = data.name.trim();
        const numberOfShelves = Math.max(0, Math.min(50, data.numberOfShelves ?? 0));
        const binsPerShelf = Math.max(0, Math.min(50, data.binsPerShelf ?? 0));
        const shelfPrefix = (data.shelfPrefix || "Shelf").trim();
        const binPrefix = (data.binPrefix || "Bin").trim();
        const isActive = data.isActive ?? true;
        // 1. Check for duplicate rack name in this branch
        const existing = await prisma_1.prisma.rack.findFirst({
            where: {
                branchId,
                name: { equals: rackName, mode: "insensitive" },
            },
        });
        if (existing) {
            throw new Error(`A storage unit with name "${rackName}" already exists in this branch. Please choose a different name.`);
        }
        // Helper for naming items
        const formatName = (prefix, index) => {
            if (prefix.length <= 2 && /^[a-zA-Z]+$/.test(prefix)) {
                return index < 10 ? `${prefix}0${index}` : `${prefix}${index}`;
            }
            return `${prefix} ${index}`;
        };
        // 2. Prepare atomic nested structure: Unit -> Shelves -> Bins
        let shelvesData = undefined;
        if (numberOfShelves > 0) {
            shelvesData = Array.from({ length: numberOfShelves }, (_, s) => {
                const sIdx = s + 1;
                const shelfName = formatName(shelfPrefix, sIdx);
                const shelfObj = {
                    name: shelfName,
                    isActive,
                };
                if (binsPerShelf > 0) {
                    shelfObj.bins = {
                        create: Array.from({ length: binsPerShelf }, (_, b) => {
                            const bIdx = b + 1;
                            const binName = formatName(binPrefix, bIdx);
                            return {
                                name: binName,
                                isActive,
                            };
                        }),
                    };
                }
                return shelfObj;
            });
        }
        // 3. Atomically create the entire hierarchy in a single relational query
        const rackCreateData = {
            branchId,
            name: rackName,
            isActive,
        };
        if (shelvesData && shelvesData.length > 0) {
            rackCreateData.shelves = {
                create: shelvesData,
            };
        }
        const rack = await prisma_1.prisma.rack.create({
            data: rackCreateData,
            include: {
                shelves: {
                    include: {
                        bins: {
                            orderBy: { name: "asc" },
                        },
                    },
                    orderBy: { name: "asc" },
                },
            },
        });
        const totalBins = rack.shelves.reduce((acc, s) => acc + (s.bins ? s.bins.length : 0), 0);
        return {
            ...rack,
            numberOfShelves: rack.shelves.length,
            numberOfBins: totalBins,
            usedLocations: 0,
            emptyLocations: totalBins,
            totalStockUnits: 0,
        };
    }
    static async createRack(branchId, data) {
        const rackName = data.name.trim();
        const existing = await prisma_1.prisma.rack.findFirst({
            where: {
                branchId,
                name: { equals: rackName, mode: "insensitive" },
            },
        });
        if (existing) {
            throw new Error(`A rack with name "${rackName}" already exists in this branch. Please choose a different name.`);
        }
        return prisma_1.prisma.rack.create({
            data: {
                branchId,
                name: rackName,
                isActive: data.isActive ?? true,
            },
            include: {
                shelves: {
                    include: { bins: true },
                },
            },
        });
    }
    static async updateRack(id, data) {
        const updateData = {};
        if (data.name !== undefined)
            updateData.name = data.name.trim();
        if (data.isActive !== undefined)
            updateData.isActive = data.isActive;
        return prisma_1.prisma.rack.update({
            where: { id },
            data: updateData,
            include: {
                shelves: {
                    include: { bins: true },
                },
            },
        });
    }
    static async deleteRack(id) {
        // 1. Check if rack contains active stock
        const activeStock = await prisma_1.prisma.inventoryLocation.findFirst({
            where: {
                rackId: id,
                quantity: { gt: 0 },
            },
            include: {
                inventory: {
                    include: { product: { select: { name: true } } },
                },
            },
        });
        if (activeStock) {
            throw new Error(`Cannot delete Rack: Active stock (${activeStock.quantity} units of ${activeStock.inventory?.product?.name || "medicine"}) is still stored in this rack. Please move the stock to another location first.`);
        }
        // 2. Check if rack locations have historical movement records
        const rackLocs = await prisma_1.prisma.inventoryLocation.findMany({
            where: { rackId: id },
            select: { id: true },
        });
        const locIds = rackLocs.map((l) => l.id);
        if (locIds.length > 0) {
            const movementHistory = await prisma_1.prisma.stockMovement.findFirst({
                where: {
                    OR: [
                        { fromLocationId: { in: locIds } },
                        { toLocationId: { in: locIds } },
                    ],
                },
            });
            if (movementHistory) {
                throw new Error("Cannot delete Rack: This rack has stock movement audit records. Please deactivate it instead of deleting to preserve inventory history.");
            }
        }
        return prisma_1.prisma.$transaction(async (tx) => {
            // Clean up empty locations if any
            await tx.inventoryLocation.deleteMany({
                where: { rackId: id },
            });
            const shelves = await tx.shelf.findMany({ where: { rackId: id }, select: { id: true } });
            const shelfIds = shelves.map((s) => s.id);
            if (shelfIds.length > 0) {
                await tx.inventoryLocation.deleteMany({
                    where: { shelfId: { in: shelfIds } },
                });
                const bins = await tx.bin.findMany({ where: { shelfId: { in: shelfIds } }, select: { id: true } });
                const binIds = bins.map((b) => b.id);
                if (binIds.length > 0) {
                    await tx.inventoryLocation.deleteMany({
                        where: { binId: { in: binIds } },
                    });
                    await tx.bin.deleteMany({ where: { id: { in: binIds } } });
                }
                await tx.shelf.deleteMany({ where: { id: { in: shelfIds } } });
            }
            return tx.rack.delete({ where: { id } });
        });
    }
    static async createShelf(data) {
        return prisma_1.prisma.shelf.create({
            data: {
                rackId: data.rackId,
                name: data.name.trim(),
                isActive: data.isActive ?? true,
            },
            include: { bins: true },
        });
    }
    static async updateShelf(id, data) {
        const updateData = {};
        if (data.name !== undefined)
            updateData.name = data.name.trim();
        if (data.isActive !== undefined)
            updateData.isActive = data.isActive;
        return prisma_1.prisma.shelf.update({
            where: { id },
            data: updateData,
            include: { bins: true },
        });
    }
    static async deleteShelf(id) {
        // 1. Check active stock
        const activeStock = await prisma_1.prisma.inventoryLocation.findFirst({
            where: {
                shelfId: id,
                quantity: { gt: 0 },
            },
            include: {
                inventory: {
                    include: { product: { select: { name: true } } },
                },
            },
        });
        if (activeStock) {
            throw new Error(`Cannot delete Shelf: Active stock (${activeStock.quantity} units of ${activeStock.inventory?.product?.name || "medicine"}) is still stored on this shelf. Please move the stock first.`);
        }
        // 2. Check movement history
        const shelfLocs = await prisma_1.prisma.inventoryLocation.findMany({
            where: { shelfId: id },
            select: { id: true },
        });
        const locIds = shelfLocs.map((l) => l.id);
        if (locIds.length > 0) {
            const movementHistory = await prisma_1.prisma.stockMovement.findFirst({
                where: {
                    OR: [
                        { fromLocationId: { in: locIds } },
                        { toLocationId: { in: locIds } },
                    ],
                },
            });
            if (movementHistory) {
                throw new Error("Cannot delete Shelf: This shelf has stock movement audit records. Please deactivate it instead of deleting.");
            }
        }
        return prisma_1.prisma.$transaction(async (tx) => {
            await tx.inventoryLocation.deleteMany({
                where: { shelfId: id },
            });
            const bins = await tx.bin.findMany({ where: { shelfId: id }, select: { id: true } });
            const binIds = bins.map((b) => b.id);
            if (binIds.length > 0) {
                await tx.inventoryLocation.deleteMany({
                    where: { binId: { in: binIds } },
                });
                await tx.bin.deleteMany({ where: { id: { in: binIds } } });
            }
            return tx.shelf.delete({ where: { id } });
        });
    }
    static async createBin(data) {
        return prisma_1.prisma.bin.create({
            data: {
                shelfId: data.shelfId,
                name: data.name.trim(),
                isActive: data.isActive ?? true,
            },
        });
    }
    static async updateBin(id, data) {
        const updateData = {};
        if (data.name !== undefined)
            updateData.name = data.name.trim();
        if (data.isActive !== undefined)
            updateData.isActive = data.isActive;
        return prisma_1.prisma.bin.update({
            where: { id },
            data: updateData,
        });
    }
    static async deleteBin(id) {
        // 1. Check active stock
        const activeStock = await prisma_1.prisma.inventoryLocation.findFirst({
            where: {
                binId: id,
                quantity: { gt: 0 },
            },
            include: {
                inventory: {
                    include: { product: { select: { name: true } } },
                },
            },
        });
        if (activeStock) {
            throw new Error(`Cannot delete Bin: Active stock (${activeStock.quantity} units of ${activeStock.inventory?.product?.name || "medicine"}) is still stored in this bin. Please move the stock first.`);
        }
        // 2. Check movement history
        const binLocs = await prisma_1.prisma.inventoryLocation.findMany({
            where: { binId: id },
            select: { id: true },
        });
        const locIds = binLocs.map((l) => l.id);
        if (locIds.length > 0) {
            const movementHistory = await prisma_1.prisma.stockMovement.findFirst({
                where: {
                    OR: [
                        { fromLocationId: { in: locIds } },
                        { toLocationId: { in: locIds } },
                    ],
                },
            });
            if (movementHistory) {
                throw new Error("Cannot delete Bin: This bin has stock movement audit records. Please deactivate it instead of deleting.");
            }
        }
        return prisma_1.prisma.$transaction(async (tx) => {
            await tx.inventoryLocation.deleteMany({
                where: { binId: id },
            });
            return tx.bin.delete({ where: { id } });
        });
    }
    /**
     * Get all physical locations with available stock for a specific batch/inventory
     * with per-location quantities, rack/shelf/bin names, labels, and packaging breakdowns.
     */
    static async getBatchLocations(inventoryId, tenantId, branchId) {
        const where = {
            inventoryId,
            quantity: { gt: 0 },
        };
        if (branchId) {
            where.inventory = { branchId };
        }
        else if (tenantId) {
            where.inventory = { branch: { tenantId } };
        }
        const locations = await prisma_1.prisma.inventoryLocation.findMany({
            where,
            include: {
                inventory: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                genericName: true,
                                sku: true,
                                unit: true,
                                productType: true,
                                category: true,
                                stripsPerBox: true,
                                tabletsPerStrip: true,
                                qtyPerLevel2: true,
                                basePrice: true,
                            },
                        },
                    },
                },
                rack: { select: { id: true, name: true, isActive: true } },
                shelf: { select: { id: true, name: true, isActive: true } },
                bin: { select: { id: true, name: true, isActive: true } },
            },
            orderBy: { createdAt: "asc" },
        });
        return locations.map((loc) => {
            const prod = loc.inventory?.product;
            const stripsPerBox = prod?.stripsPerBox || loc.inventory?.stripsPerBox || 10;
            const tabletsPerStrip = prod?.tabletsPerStrip || loc.inventory?.tabletsPerStrip || 10;
            const isMedicine = prod?.productType === "MEDICINE" ||
                !prod?.productType ||
                Boolean(stripsPerBox && tabletsPerStrip);
            const tabletsPerBox = isMedicine ? stripsPerBox * tabletsPerStrip : 1;
            const qty = loc.quantity || 0;
            const fullBoxes = Math.floor(qty / tabletsPerBox);
            const looseTablets = qty % tabletsPerBox;
            const openBoxes = looseTablets > 0 ? 1 : 0;
            const openBoxRemainingStrips = Math.floor(looseTablets / tabletsPerStrip);
            const openBoxRemainingTablets = looseTablets % tabletsPerStrip;
            const rackName = loc.rack?.name || "—";
            const shelfName = loc.shelf?.name || "—";
            const binName = loc.bin?.name || "—";
            const parts = [loc.rack?.name, loc.shelf?.name, loc.bin?.name].filter(Boolean);
            const locationLabel = parts.length > 0 ? parts.join(" → ") : "General Shelf";
            // Formatted stock display, e.g. "5 Boxes" or "5 Boxes, 2 Strips, 4 Tablets"
            const stockParts = [];
            if (fullBoxes > 0)
                stockParts.push(`${fullBoxes} Box${fullBoxes > 1 ? "es" : ""}`);
            if (openBoxRemainingStrips > 0)
                stockParts.push(`${openBoxRemainingStrips} Strip${openBoxRemainingStrips > 1 ? "s" : ""}`);
            if (openBoxRemainingTablets > 0)
                stockParts.push(`${openBoxRemainingTablets} Tab${openBoxRemainingTablets !== 1 ? "s" : ""}`);
            if (stockParts.length === 0)
                stockParts.push(`${qty} ${prod?.unit || "units"}`);
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
                strips: openBoxRemainingStrips,
                tablets: openBoxRemainingTablets,
                openBoxRemainingStrips,
                openBoxRemainingTablets,
                stripsPerBox,
                tabletsPerStrip,
                tabletsPerBox,
                unit: prod?.unit || loc.inventory?.unit || "tablet",
                displayText,
            };
        });
    }
}
exports.LocationService = LocationService;
