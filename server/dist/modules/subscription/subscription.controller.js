"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionController = void 0;
const subscription_service_1 = require("./subscription.service");
const subscription_expiry_service_1 = require("./subscription-expiry.service");
class SubscriptionController {
    static async listPlans(req, res) {
        try {
            const plans = await subscription_service_1.SubscriptionService.listAvailablePlans();
            res.status(200).json({ success: true, data: plans });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getPlanDetails(req, res) {
        try {
            const { id } = req.params;
            const plan = await subscription_service_1.SubscriptionService.getPlanDetails(id);
            res.status(200).json({ success: true, data: plan });
        }
        catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }
    static async getCurrentSubscription(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const current = await subscription_service_1.SubscriptionService.getCurrentSubscription(tenantId);
            res.status(200).json({ success: true, data: current });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getSubscriptionHistory(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const history = await subscription_service_1.SubscriptionService.getSubscriptionHistory(tenantId);
            res.status(200).json({ success: true, data: history });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async subscribe(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const subscription = await subscription_service_1.SubscriptionService.createSubscription(tenantId, req.body);
            res.status(201).json({
                success: true,
                message: "Subscription created. Please proceed to payment to activate your plan.",
                data: subscription,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async changePlan(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const subscription = await subscription_service_1.SubscriptionService.changePlan(tenantId, req.body);
            res.status(200).json({
                success: true,
                message: "Plan change initiated. Complete payment to activate your new plan.",
                data: subscription,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async renew(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const subscription = await subscription_service_1.SubscriptionService.renewSubscription(tenantId);
            res.status(200).json({
                success: true,
                message: "Renewal initiated. Complete payment to extend your subscription.",
                data: subscription,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async cancel(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const result = await subscription_service_1.SubscriptionService.cancelSubscription(tenantId);
            res.status(200).json({
                success: true,
                message: "Subscription cancelled successfully",
                data: result,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async triggerExpiryCheck(req, res) {
        try {
            const summary = await subscription_expiry_service_1.SubscriptionExpiryService.checkAndSendExpiryReminders();
            res.status(200).json({
                success: true,
                message: `Automated expiry scan completed. Reminders sent: ${summary.sentCount}, Errors: ${summary.errorsCount}`,
                data: summary,
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
exports.SubscriptionController = SubscriptionController;
