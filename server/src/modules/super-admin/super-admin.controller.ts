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
      const datePreset = req.query.datePreset as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const tier = req.query.tier as string | undefined;
      const search = req.query.search as string | undefined;
      const result = await SuperAdminService.listSubscriptions(page, limit, status, { datePreset, startDate, endDate, tier, search });
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
      const datePreset = req.query.datePreset as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const analytics = await SuperAdminService.getPlatformAnalytics({ datePreset, startDate, endDate });
      res.status(200).json({ success: true, data: analytics });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ==================== PLATFORM DYNAMIC ROLES ====================
  static async listRoles(req: Request, res: Response): Promise<void> {
    try {
      const roles = await SuperAdminService.listRoles();
      res.status(200).json({ success: true, data: roles });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async createRole(req: Request, res: Response): Promise<void> {
    try {
      const role = await SuperAdminService.createRole(req.body);
      res.status(201).json({
        success: true,
        message: `Custom role "${role.name}" created successfully`,
        data: role,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async updateRole(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const updated = await SuperAdminService.updateRole(id, req.body);
      res.status(200).json({
        success: true,
        message: `Role "${updated.name}" updated successfully`,
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async deleteRole(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const result = await SuperAdminService.deleteRole(id);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async batchUpdateRolePermissions(req: Request, res: Response): Promise<void> {
    try {
      const { matrix } = req.body;
      const result = await SuperAdminService.batchUpdateRolePermissions(matrix);
      res.status(200).json({
        success: true,
        message: "Platform role permissions saved successfully",
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // ==================== PLATFORM STAFF ====================
  static async listPlatformStaff(req: Request, res: Response): Promise<void> {
    try {
      const staff = await SuperAdminService.listPlatformStaff();
      res.status(200).json({ success: true, data: staff });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async createPlatformStaff(req: Request, res: Response): Promise<void> {
    try {
      const creatorId = req.user!.id;
      const creatorRole = req.user!.role;
      const staff = await SuperAdminService.createPlatformStaff(creatorId, creatorRole, req.body);
      res.status(201).json({
        success: true,
        message: `Platform staff member "${staff.name}" (${staff.customRoleName || staff.role}) created successfully`,
        data: staff,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async updatePlatformStaff(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const updaterId = req.user!.id;
      const updaterRole = req.user!.role;
      const updated = await SuperAdminService.updatePlatformStaff(id, updaterId, updaterRole, req.body);
      res.status(200).json({
        success: true,
        message: "Platform staff member updated successfully",
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async updatePlatformStaffStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const updaterId = req.user!.id;
      const updaterRole = req.user!.role;
      const { isActive } = req.body;
      const updated = await SuperAdminService.updatePlatformStaffStatus(id, updaterId, updaterRole, isActive);
      res.status(200).json({
        success: true,
        message: `Platform staff member ${isActive ? "activated" : "deactivated"} successfully`,
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async deletePlatformStaff(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const updaterId = req.user!.id;
      const updaterRole = req.user!.role;
      const result = await SuperAdminService.deletePlatformStaff(id, updaterId, updaterRole);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getPlatformPermissions(req: Request, res: Response): Promise<void> {
    try {
      const hierarchy = await SuperAdminService.getPlatformPermissionsHierarchy();
      res.status(200).json({ success: true, data: hierarchy });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updatePlatformPermissions(req: Request, res: Response): Promise<void> {
    try {
      const { role, permissions } = req.body;
      const result = await SuperAdminService.updatePlatformRolePermissions(role, permissions);
      res.status(200).json({
        success: true,
        message: `Platform permissions for ${role} updated successfully`,
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/super-admin/verifications
   */
  static async listPharmacyVerifications(req: Request, res: Response): Promise<void> {
    try {
      const { status, search, page, limit, datePreset, startDate, endDate } = req.query;
      const result = await SuperAdminService.listPharmacyVerifications({
        status: status as string,
        search: search as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        datePreset: datePreset as string,
        startDate: startDate as string,
        endDate: endDate as string,
      });

      res.status(200).json({
        success: true,
        data: result.data,
        metrics: result.metrics,
        pagination: result.pagination,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/super-admin/verifications/:id
   */
  static async getPharmacyVerification(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const result = await SuperAdminService.getPharmacyVerification(id);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/super-admin/verifications/:id/approve
   */
  static async approvePharmacyVerification(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const adminUserId = req.user!.id;
      const result = await SuperAdminService.approvePharmacyVerification(id, adminUserId, req.body);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/super-admin/verifications/:id/reject
   */
  static async rejectPharmacyVerification(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const adminUserId = req.user!.id;
      const result = await SuperAdminService.rejectPharmacyVerification(id, adminUserId, req.body);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

