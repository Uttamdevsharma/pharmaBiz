"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferController = void 0;
const transfer_service_1 = require("./transfer.service");
class TransferController {
    static async createTransfer(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const userRole = req.user.role;
            const userBranchId = req.user.branchId;
            // Enforce branch manager can only transfer from their assigned branch
            if (userRole === "BRANCH_MANAGER" && userBranchId && req.body.fromBranchId !== userBranchId) {
                res.status(403).json({
                    success: false,
                    message: "Branch Managers can only dispatch stock transfers from their assigned branch.",
                });
                return;
            }
            const transfer = await transfer_service_1.TransferService.createTransfer(tenantId, userId, req.body);
            res.status(201).json({
                success: true,
                message: "Inter-branch stock transfer dispatched successfully",
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
    static async receiveTransfer(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const result = await transfer_service_1.TransferService.receiveTransfer(id, tenantId, userId, req.body);
            res.status(200).json({
                success: true,
                message: "Stock shipment received and verified successfully",
                data: result,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async settleTransfer(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const result = await transfer_service_1.TransferService.settleTransfer(id, tenantId, userId, req.body);
            res.status(200).json({
                success: true,
                message: "Inter-branch payment settlement recorded successfully",
                data: result,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async cancelTransfer(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const result = await transfer_service_1.TransferService.cancelTransfer(id, tenantId, userId);
            res.status(200).json({
                success: true,
                message: "Transfer cancelled and stock returned to source branch",
                data: result,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async getDamagedProducts(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userRole = req.user.role;
            const userBranchId = req.user.branchId;
            const query = {
                branchId: req.query.branchId,
                search: req.query.search,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
            };
            const result = await transfer_service_1.TransferService.getDamagedProducts(tenantId, userRole, userBranchId, query);
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
exports.TransferController = TransferController;
