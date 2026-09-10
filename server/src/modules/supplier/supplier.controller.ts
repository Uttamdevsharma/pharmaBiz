import { Request, Response } from "express";
import { SupplierService } from "./supplier.service";
import { ListSuppliersQuery, ListPurchasesQuery } from "./supplier.validation";

export class SupplierController {
  static async listSuppliers(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const query = req.query as unknown as ListSuppliersQuery;
      const result = await SupplierService.listSuppliers(tenantId, query);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getSupplierById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      const supplier = await SupplierService.getSupplierById(id, tenantId, { startDate, endDate });
      res.status(200).json({ success: true, data: supplier });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  // --- Contact Person Handlers ---
  static async listContacts(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const contacts = await SupplierService.listContacts(id, tenantId);
      res.status(200).json({ success: true, data: contacts });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async createContact(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const contact = await SupplierService.createContact(id, tenantId, req.body);
      res.status(201).json({ success: true, message: "Contact person created successfully", data: contact });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async updateContact(req: Request, res: Response): Promise<void> {
    try {
      const { id, contactId } = req.params;
      const tenantId = req.user!.tenantId;
      const contact = await SupplierService.updateContact(contactId, id, tenantId, req.body);
      res.status(200).json({ success: true, message: "Contact person updated successfully", data: contact });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async deleteContact(req: Request, res: Response): Promise<void> {
    try {
      const { id, contactId } = req.params;
      const tenantId = req.user!.tenantId;
      const result = await SupplierService.deleteContact(contactId, id, tenantId);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async createSupplier(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const supplier = await SupplierService.createSupplier(tenantId, userId, req.body);
      res.status(201).json({
        success: true,
        message: "Supplier created successfully",
        data: supplier,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async updateSupplier(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const updated = await SupplierService.updateSupplier(id, tenantId, userId, req.body);
      res.status(200).json({
        success: true,
        message: "Supplier updated successfully",
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async deleteSupplier(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const result = await SupplierService.deleteSupplier(id, tenantId, userId);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async recordPurchase(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const purchase = await SupplierService.recordPurchase(tenantId, userId, req.body);
      res.status(201).json({
        success: true,
        message: "Purchase & stock inward recorded successfully",
        data: purchase,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async listPurchases(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userRole = req.user!.role;
      const userBranchId = req.user!.branchId;
      const query = { ...(req.query as unknown as ListPurchasesQuery) };

      if (!query.branchId && req.headers["x-branch-id"]) {
        const headerBranch = (req.headers["x-branch-id"] as string).trim();
        if (headerBranch && headerBranch !== "all" && headerBranch !== "all-branches") {
          query.branchId = headerBranch;
        }
      }

      const result = await SupplierService.listPurchases(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getSupplierPurchases(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const userRole = req.user!.role;
      const userBranchId = req.user!.branchId;
      const query = { ...(req.query as unknown as ListPurchasesQuery), supplierId: id };

      if (!query.branchId && req.headers["x-branch-id"]) {
        const headerBranch = (req.headers["x-branch-id"] as string).trim();
        if (headerBranch && headerBranch !== "all" && headerBranch !== "all-branches") {
          query.branchId = headerBranch;
        }
      }

      const result = await SupplierService.listPurchases(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async recordSupplierPayment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const updated = await SupplierService.recordSupplierPayment(id, tenantId, userId, req.body);
      res.status(200).json({
        success: true,
        message: "Payment recorded against supplier due",
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async listSupplierPayments(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const query = req.query as any;
      const result = await SupplierService.listSupplierPayments(tenantId, query);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getSupplierDueSummary(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const query = req.query as any;
      const result = await SupplierService.getSupplierDueSummary(tenantId, query);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
