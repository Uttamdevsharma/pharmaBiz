import { Request, Response } from "express";
import { UserService } from "./user.service";
import { ListUsersQuery } from "./user.validation";

export class UserController {
  /**
   * ==================== PHARMACY ROLE CONTROLLERS ====================
   */
  static async listRoles(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const roles = await UserService.listPharmacyRoles(tenantId);
      res.status(200).json({ success: true, data: roles });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async createRole(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const role = await UserService.createPharmacyRole(tenantId, userId, req.body);
      res.status(201).json({
        success: true,
        message: "Role created successfully",
        data: role,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async updateRole(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const role = await UserService.updatePharmacyRole(tenantId, id, userId, req.body);
      res.status(200).json({
        success: true,
        message: "Role updated successfully",
        data: role,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async deleteRole(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const result = await UserService.deletePharmacyRole(tenantId, id, userId);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getPermissionsHierarchy(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const permissions = await UserService.getPermissionsHierarchy(tenantId);
      res.status(200).json({ success: true, data: permissions });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateRolePermissions(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const { role, permissions } = req.body;

      // Find role by id or name
      const roles = await UserService.listPharmacyRoles(tenantId);
      const matched = roles.find((r: any) => r.id === role || r.name === role);

      if (matched) {
        const updated = await UserService.updatePharmacyRole(tenantId, matched.id, userId, { permissions });
        res.status(200).json({ success: true, message: `Permissions updated for role "${matched.name}"`, data: updated });
      } else {
        res.status(404).json({ success: false, message: "Role not found" });
      }
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * ==================== PHARMACY STAFF CONTROLLERS ====================
   */
  static async createUser(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const creatorId = req.user!.id;
      const creatorRole = req.user!.role;

      const user = await UserService.createUser(tenantId, creatorId, creatorRole, req.body);
      res.status(201).json({
        success: true,
        message: "Staff member created successfully",
        data: user,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async listUsers(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userRole = req.user!.role;
      const userBranchId = req.user!.branchId;
      const query = req.query as unknown as ListUsersQuery;

      const result = await UserService.listUsers(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getUserDetails(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const user = await UserService.getUserDetails(id, tenantId);
      res.status(200).json({ success: true, data: user });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  static async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const updaterId = req.user!.id;
      const updaterRole = req.user!.role;

      const updated = await UserService.updateUser(id, tenantId, updaterId, updaterRole, req.body);
      res.status(200).json({
        success: true,
        message: "Staff member updated successfully",
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async updateUserStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const tenantId = req.user!.tenantId;
      const updaterId = req.user!.id;
      const updaterRole = req.user!.role;

      const updated = await UserService.updateUserStatus(id, tenantId, updaterId, updaterRole, isActive);
      res.status(200).json({
        success: true,
        message: `Staff member ${isActive ? "activated" : "deactivated"} successfully`,
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const deleterId = req.user!.id;
      const deleterRole = req.user!.role;

      const result = await UserService.deleteUser(id, tenantId, deleterId, deleterRole);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}
