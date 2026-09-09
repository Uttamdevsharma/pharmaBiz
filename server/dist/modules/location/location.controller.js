"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationController = void 0;
const location_service_1 = require("./location.service");
const location_validation_1 = require("./location.validation");
const prisma_1 = require("../../app/lib/prisma");
class LocationController {
    static async getLocations(req, res) {
        try {
            let branchId = req.query.branchId || req.user?.branchId;
            if (!branchId && req.user?.tenantId) {
                const firstBranch = await prisma_1.prisma.branch.findFirst({
                    where: { tenantId: req.user.tenantId, isActive: true },
                    select: { id: true },
                    orderBy: { createdAt: "asc" },
                });
                branchId = firstBranch?.id;
            }
            if (!branchId) {
                return res.json({ success: true, data: [] });
            }
            const includeInactive = req.query.includeInactive === "true" || req.query.includeInactive === "1";
            const racks = await location_service_1.LocationService.getRacks(branchId, includeInactive);
            return res.json({ success: true, data: racks });
        }
        catch (error) {
            console.error("[LocationController.getLocations]", error);
            return res.status(500).json({
                success: false,
                error: error.message,
                message: error.message,
                data: [],
            });
        }
    }
    static async getBatchLocations(req, res) {
        try {
            const { inventoryId } = req.params;
            const tenantId = req.user?.tenantId;
            const branchId = req.query.branchId || req.user?.branchId;
            if (!inventoryId) {
                return res.status(400).json({
                    success: false,
                    error: "inventoryId required",
                    message: "inventoryId required",
                    data: [],
                });
            }
            const locations = await location_service_1.LocationService.getBatchLocations(inventoryId, tenantId, branchId);
            return res.json({ success: true, data: locations });
        }
        catch (error) {
            console.error("[LocationController.getBatchLocations]", error);
            return res.status(500).json({
                success: false,
                error: error.message,
                message: error.message,
                data: [],
            });
        }
    }
    static async quickCreateRack(req, res) {
        try {
            const data = location_validation_1.QuickCreateRackSchema.parse(req.body);
            const tenantId = req.user?.tenantId;
            let branchId = data.branchId || req.query.branchId || req.user?.branchId;
            if (!branchId && tenantId) {
                const firstBranch = await prisma_1.prisma.branch.findFirst({
                    where: { tenantId, isActive: true },
                    select: { id: true },
                    orderBy: { createdAt: "asc" },
                });
                branchId = firstBranch?.id;
            }
            if (!branchId) {
                return res.status(400).json({
                    success: false,
                    error: "Branch ID required. Please select an active branch.",
                    message: "Branch ID required. Please select an active branch.",
                });
            }
            // Verify branch belongs to user's tenant
            if (tenantId) {
                const validBranch = await prisma_1.prisma.branch.findFirst({
                    where: { id: branchId, tenantId, isActive: true },
                });
                if (!validBranch) {
                    return res.status(403).json({
                        success: false,
                        error: "Access denied: Branch does not belong to your organization or is inactive.",
                        message: "Access denied: Branch does not belong to your organization or is inactive.",
                    });
                }
            }
            const rack = await location_service_1.LocationService.quickCreateRack(branchId, data);
            return res.status(201).json({
                success: true,
                message: `Rack "${rack.name}" created with ${rack.numberOfShelves} shelves and ${rack.numberOfBins} bins.`,
                data: rack,
            });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                error: error.message,
                message: error.message,
            });
        }
    }
    static async createRack(req, res) {
        try {
            const data = location_validation_1.CreateRackSchema.parse(req.body);
            const tenantId = req.user?.tenantId;
            let branchId = data.branchId || req.query.branchId || req.user?.branchId;
            if (!branchId && tenantId) {
                const firstBranch = await prisma_1.prisma.branch.findFirst({
                    where: { tenantId, isActive: true },
                    select: { id: true },
                    orderBy: { createdAt: "asc" },
                });
                branchId = firstBranch?.id;
            }
            if (!branchId) {
                return res.status(400).json({
                    success: false,
                    error: "Branch ID required. Please select an active branch.",
                    message: "Branch ID required. Please select an active branch.",
                });
            }
            if (tenantId) {
                const validBranch = await prisma_1.prisma.branch.findFirst({
                    where: { id: branchId, tenantId, isActive: true },
                });
                if (!validBranch) {
                    return res.status(403).json({
                        success: false,
                        error: "Access denied: Branch does not belong to your organization or is inactive.",
                        message: "Access denied: Branch does not belong to your organization or is inactive.",
                    });
                }
            }
            const rack = await location_service_1.LocationService.createRack(branchId, data);
            return res.status(201).json({ success: true, data: rack });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                error: error.message,
                message: error.message,
            });
        }
    }
    static async updateRack(req, res) {
        try {
            const { id } = req.params;
            const data = location_validation_1.UpdateRackSchema.parse(req.body);
            const rack = await location_service_1.LocationService.updateRack(id, data);
            return res.json({ success: true, data: rack });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                error: error.message,
                message: error.message,
            });
        }
    }
    static async deleteRack(req, res) {
        try {
            const { id } = req.params;
            await location_service_1.LocationService.deleteRack(id);
            return res.json({ success: true, message: "Rack deleted successfully" });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                error: error.message,
                message: error.message,
            });
        }
    }
    static async createShelf(req, res) {
        try {
            const data = location_validation_1.CreateShelfSchema.parse(req.body);
            const shelf = await location_service_1.LocationService.createShelf(data);
            return res.status(201).json({ success: true, data: shelf });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                error: error.message,
                message: error.message,
            });
        }
    }
    static async updateShelf(req, res) {
        try {
            const { id } = req.params;
            const data = location_validation_1.UpdateShelfSchema.parse(req.body);
            const shelf = await location_service_1.LocationService.updateShelf(id, data);
            return res.json({ success: true, data: shelf });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                error: error.message,
                message: error.message,
            });
        }
    }
    static async deleteShelf(req, res) {
        try {
            const { id } = req.params;
            await location_service_1.LocationService.deleteShelf(id);
            return res.json({ success: true, message: "Shelf deleted successfully" });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                error: error.message,
                message: error.message,
            });
        }
    }
    static async createBin(req, res) {
        try {
            const data = location_validation_1.CreateBinSchema.parse(req.body);
            const bin = await location_service_1.LocationService.createBin(data);
            return res.status(201).json({ success: true, data: bin });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                error: error.message,
                message: error.message,
            });
        }
    }
    static async updateBin(req, res) {
        try {
            const { id } = req.params;
            const data = location_validation_1.UpdateBinSchema.parse(req.body);
            const bin = await location_service_1.LocationService.updateBin(id, data);
            return res.json({ success: true, data: bin });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                error: error.message,
                message: error.message,
            });
        }
    }
    static async deleteBin(req, res) {
        try {
            const { id } = req.params;
            await location_service_1.LocationService.deleteBin(id);
            return res.json({ success: true, message: "Bin deleted successfully" });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                error: error.message,
                message: error.message,
            });
        }
    }
}
exports.LocationController = LocationController;
