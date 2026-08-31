import { Request, Response } from "express";
import { BranchService } from "./branch.service";

export class BranchController {
  static async createBranch(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const branch = await BranchService.createBranch(tenantId, userId, req.body);
      res.status(201).json({
        success: true,
        message: "Branch created successfully",
        data: branch,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async listBranches(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userRole = req.user!.role;
      const userBranchId = req.user!.branchId;

      const branches = await BranchService.listBranches(tenantId, userRole, userBranchId);
      res.status(200).json({ success: true, data: branches });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getBranchDetails(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const branch = await BranchService.getBranchDetails(id, tenantId);
      res.status(200).json({ success: true, data: branch });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  static async updateBranch(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const updated = await BranchService.updateBranch(id, tenantId, userId, req.body);
      res.status(200).json({
        success: true,
        message: "Branch updated successfully",
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async deleteBranch(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const result = await BranchService.deleteBranch(id, tenantId, userId);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}
