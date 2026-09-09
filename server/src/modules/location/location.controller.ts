import { Request, Response } from "express";
import { LocationService } from "./location.service";
import {
  CreateRackSchema,
  QuickCreateRackSchema,
  UpdateRackSchema,
  CreateShelfSchema,
  UpdateShelfSchema,
  CreateBinSchema,
  UpdateBinSchema,
} from "./location.validation";
import { prisma } from "../../app/lib/prisma";

export class LocationController {
  static async getLocations(req: Request, res: Response) {
    try {
      let branchId = (req.query.branchId as string) || req.user?.branchId;
      if (!branchId && req.user?.tenantId) {
        const firstBranch = await (prisma as any).branch.findFirst({
          where: { tenantId: req.user.tenantId, isActive: true },
          select: { id: true },
          orderBy: { createdAt: "asc" },
        });
        branchId = firstBranch?.id;
      }

      if (!branchId) {
        return res.json({ success: true, data: [] });
      }

      const includeInactive =
        req.query.includeInactive === "true" || req.query.includeInactive === "1";
      const racks = await LocationService.getRacks(branchId, includeInactive);
      return res.json({ success: true, data: racks });
    } catch (error: any) {
      console.error("[LocationController.getLocations]", error);
      return res.status(500).json({
        success: false,
        error: error.message,
        message: error.message,
        data: [],
      });
    }
  }

  static async getBatchLocations(req: Request, res: Response) {
    try {
      const { inventoryId } = req.params;
      const tenantId = req.user?.tenantId;
      const branchId = (req.query.branchId as string) || req.user?.branchId;
      if (!inventoryId) {
        return res.status(400).json({
          success: false,
          error: "inventoryId required",
          message: "inventoryId required",
          data: [],
        });
      }
      const locations = await LocationService.getBatchLocations(inventoryId, tenantId, branchId);
      return res.json({ success: true, data: locations });
    } catch (error: any) {
      console.error("[LocationController.getBatchLocations]", error);
      return res.status(500).json({
        success: false,
        error: error.message,
        message: error.message,
        data: [],
      });
    }
  }

  static async quickCreateRack(req: Request, res: Response) {
    try {
      const data = QuickCreateRackSchema.parse(req.body);
      const tenantId = req.user?.tenantId;

      let branchId = data.branchId || (req.query.branchId as string) || req.user?.branchId;
      if (!branchId && tenantId) {
        const firstBranch = await (prisma as any).branch.findFirst({
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
        const validBranch = await (prisma as any).branch.findFirst({
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

      const rack = await LocationService.quickCreateRack(branchId, data);
      return res.status(201).json({
        success: true,
        message: `Rack "${rack.name}" created with ${rack.numberOfShelves} shelves and ${rack.numberOfBins} bins.`,
        data: rack,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message,
        message: error.message,
      });
    }
  }

  static async createRack(req: Request, res: Response) {
    try {
      const data = CreateRackSchema.parse(req.body);
      const tenantId = req.user?.tenantId;

      let branchId = data.branchId || (req.query.branchId as string) || req.user?.branchId;
      if (!branchId && tenantId) {
        const firstBranch = await (prisma as any).branch.findFirst({
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
        const validBranch = await (prisma as any).branch.findFirst({
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

      const rack = await LocationService.createRack(branchId, data);
      return res.status(201).json({ success: true, data: rack });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message,
        message: error.message,
      });
    }
  }

  static async updateRack(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = UpdateRackSchema.parse(req.body);
      const rack = await LocationService.updateRack(id, data);
      return res.json({ success: true, data: rack });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message,
        message: error.message,
      });
    }
  }

  static async deleteRack(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await LocationService.deleteRack(id);
      return res.json({ success: true, message: "Rack deleted successfully" });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message,
        message: error.message,
      });
    }
  }

  static async createShelf(req: Request, res: Response) {
    try {
      const data = CreateShelfSchema.parse(req.body);
      const shelf = await LocationService.createShelf(data);
      return res.status(201).json({ success: true, data: shelf });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message,
        message: error.message,
      });
    }
  }

  static async updateShelf(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = UpdateShelfSchema.parse(req.body);
      const shelf = await LocationService.updateShelf(id, data);
      return res.json({ success: true, data: shelf });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message,
        message: error.message,
      });
    }
  }

  static async deleteShelf(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await LocationService.deleteShelf(id);
      return res.json({ success: true, message: "Shelf deleted successfully" });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message,
        message: error.message,
      });
    }
  }

  static async createBin(req: Request, res: Response) {
    try {
      const data = CreateBinSchema.parse(req.body);
      const bin = await LocationService.createBin(data);
      return res.status(201).json({ success: true, data: bin });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message,
        message: error.message,
      });
    }
  }

  static async updateBin(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = UpdateBinSchema.parse(req.body);
      const bin = await LocationService.updateBin(id, data);
      return res.json({ success: true, data: bin });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message,
        message: error.message,
      });
    }
  }

  static async deleteBin(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await LocationService.deleteBin(id);
      return res.json({ success: true, message: "Bin deleted successfully" });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message,
        message: error.message,
      });
    }
  }
}
