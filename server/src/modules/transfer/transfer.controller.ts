import { Request, Response } from "express";
import { TransferService } from "./transfer.service";
import { ListTransfersQuery } from "./transfer.validation";

export class TransferController {
  static async createTransfer(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const userBranchId = req.user!.branchId;

      // Enforce branch manager can only transfer from their assigned branch
      if (userRole === "BRANCH_MANAGER" && userBranchId && req.body.fromBranchId !== userBranchId) {
        res.status(403).json({
          success: false,
          message: "Branch Managers can only dispatch stock transfers from their assigned branch.",
        });
        return;
      }

      const transfer = await TransferService.createTransfer(tenantId, userId, req.body);
      res.status(201).json({
        success: true,
        message: "Inter-branch stock transfer dispatched successfully",
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

  static async receiveTransfer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;

      const result = await TransferService.receiveTransfer(id, tenantId, userId, req.body);
      res.status(200).json({
        success: true,
        message: "Stock shipment received and verified successfully",
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async settleTransfer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;

      const result = await TransferService.settleTransfer(id, tenantId, userId, req.body);
      res.status(200).json({
        success: true,
        message: "Inter-branch payment settlement recorded successfully",
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async cancelTransfer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;

      const result = await TransferService.cancelTransfer(id, tenantId, userId);
      res.status(200).json({
        success: true,
        message: "Transfer cancelled and stock returned to source branch",
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}
