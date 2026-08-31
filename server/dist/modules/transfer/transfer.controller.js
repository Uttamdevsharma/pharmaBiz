"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferController = void 0;
const transfer_service_1 = require("./transfer.service");
class TransferController {
    static async createTransfer(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const transfer = await transfer_service_1.TransferService.createTransfer(tenantId, userId, req.body);
            res.status(201).json({
                success: true,
                message: "Inter-branch transfer request created successfully",
                data: transfer,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async listTransfers(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userRole = req.user.role;
            const userBranchId = req.user.branchId;
            const query = req.query;
            const result = await transfer_service_1.TransferService.listTransfers(tenantId, query, userRole, userBranchId);
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getTransferDetails(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const transfer = await transfer_service_1.TransferService.getTransferDetails(id, tenantId);
            res.status(200).json({ success: true, data: transfer });
        }
        catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }
    static async approveTransfer(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const approverId = req.user.id;
            const updated = await transfer_service_1.TransferService.approveTransfer(id, tenantId, approverId);
            res.status(200).json({
                success: true,
                message: "Transfer approved successfully",
                data: updated,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async rejectTransfer(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const { reason } = req.body;
            const updated = await transfer_service_1.TransferService.rejectTransfer(id, tenantId, userId, reason);
            res.status(200).json({
                success: true,
                message: "Transfer rejected",
                data: updated,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async completeTransfer(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const completed = await transfer_service_1.TransferService.completeTransfer(id, tenantId, userId);
            res.status(200).json({
                success: true,
                message: "Transfer completed and stock successfully adjusted in both branches",
                data: completed,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}
exports.TransferController = TransferController;
