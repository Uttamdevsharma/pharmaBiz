import { Request, Response } from "express";
import { SuperAdminService } from "./super-admin.service";
import { ListTenantsQuery } from "./super-admin.validation";

export class SuperAdminController {
  // Plans
  static async createPlan(req: Request, res: Response): Promise<void> {
    try {
      const plan = await SuperAdminService.createPlan(req.body);
      res.status(201).json({
        success: true,
        message: "Subscription plan created successfully",
        data: plan,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async listPlans(req: Request, res: Response): Promise<void> {
    try {
      const plans = await SuperAdminService.listPlans();
      res.status(200).json({ success: true, data: plans });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getPlanById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const plan = await SuperAdminService.getPlanById(id);
      res.status(200).json({ success: true, data: plan });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  static async updatePlan(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const updated = await SuperAdminService.updatePlan(id, req.body);
      res.status(200).json({
        success: true,
        message: "Subscription plan updated successfully",
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async deletePlan(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const result = await SuperAdminService.deletePlan(id);
      res.status(200).json({
        success: true,
        message: "Subscription plan deactivated or removed successfully",
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Tenants
  static async listTenants(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query as unknown as ListTenantsQuery;
      const result = await SuperAdminService.listTenants(query);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getTenantDetails(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const tenant = await SuperAdminService.getTenantDetails(id);
      res.status(200).json({ success: true, data: tenant });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  static async getTenantSubscription(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const subscriptions = await SuperAdminService.getTenantSubscription(id);
      res.status(200).json({ success: true, data: subscriptions });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  static async updateTenantStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const { isActive } = req.body;
      const updated = await SuperAdminService.updateTenantStatus(id, isActive);
      res.status(200).json({
        success: true,
        message: `Tenant has been ${isActive ? "activated" : "suspended"} successfully`,
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // Subscriptions
  static async listSubscriptions(req: Request, res: Response): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const status = req.query.status as string | undefined;
      const result = await SuperAdminService.listSubscriptions(page, limit, status);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Payments
  static async listPayments(req: Request, res: Response): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const result = await SuperAdminService.listPlatformPayments(page, limit);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Analytics
  static async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const analytics = await SuperAdminService.getPlatformAnalytics();
      res.status(200).json({ success: true, data: analytics });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
