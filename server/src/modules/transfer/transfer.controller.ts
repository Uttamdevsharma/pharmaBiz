import { Request, Response } from "express";
import { TransferService } from "./transfer.service";
import { ListTransfersQuery } from "./transfer.validation";

export class TransferController {
  static async createTransfer(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const transfer = await TransferService.createTransfer(tenantId, userId, req.body);
      res.status(201).json({
        success: true,
        message: "Inter-branch transfer request created successfully",
        data: transfer,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async listTransfers(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userRole = req.user!.role;
      const userBranchId = req.user!.branchId;
      const query = req.query as unknown as ListTransfersQuery;

      const result = await TransferService.listTransfers(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getTransferDetails(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const transfer = await TransferService.getTransferDetails(id, tenantId);
      res.status(200).json({ success: true, data: transfer });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  static async approveTransfer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const approverId = req.user!.id;

      const updated = await TransferService.approveTransfer(id, tenantId, approverId);
      res.status(200).json({
        success: true,
        message: "Transfer approved successfully",
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async rejectTransfer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const { reason } = req.body;

      const updated = await TransferService.rejectTransfer(id, tenantId, userId, reason);
      res.status(200).json({
        success: true,
        message: "Transfer rejected",
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async completeTransfer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;

      const completed = await TransferService.completeTransfer(id, tenantId, userId);
      res.status(200).json({
        success: true,
        message: "Transfer completed and stock successfully adjusted in both branches",
        data: completed,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}
