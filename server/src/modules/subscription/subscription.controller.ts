import { Request, Response } from "express";
import { SubscriptionService } from "./subscription.service";
import { SubscriptionExpiryService } from "./subscription-expiry.service";

export class SubscriptionController {
  static async listPlans(req: Request, res: Response): Promise<void> {
    try {
      const plans = await SubscriptionService.listAvailablePlans();
      res.status(200).json({ success: true, data: plans });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getPlanDetails(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const plan = await SubscriptionService.getPlanDetails(id);
      res.status(200).json({ success: true, data: plan });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  static async getCurrentSubscription(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const current = await SubscriptionService.getCurrentSubscription(tenantId);
      res.status(200).json({ success: true, data: current });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getSubscriptionHistory(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const history = await SubscriptionService.getSubscriptionHistory(tenantId);
      res.status(200).json({ success: true, data: history });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async subscribe(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const subscription = await SubscriptionService.createSubscription(tenantId, req.body);
      res.status(201).json({
        success: true,
        message: "Subscription created. Please proceed to payment to activate your plan.",
        data: subscription,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async changePlan(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const subscription = await SubscriptionService.changePlan(tenantId, req.body);
      res.status(200).json({
        success: true,
        message: "Plan change initiated. Complete payment to activate your new plan.",
        data: subscription,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async renew(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const subscription = await SubscriptionService.renewSubscription(tenantId);
      res.status(200).json({
        success: true,
        message: "Renewal initiated. Complete payment to extend your subscription.",
        data: subscription,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async cancel(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const result = await SubscriptionService.cancelSubscription(tenantId);
      res.status(200).json({
        success: true,
        message: "Subscription cancelled successfully",
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async triggerExpiryCheck(req: Request, res: Response): Promise<void> {
    try {
      const summary = await SubscriptionExpiryService.checkAndSendExpiryReminders();
      res.status(200).json({
        success: true,
        message: `Automated expiry scan completed. Reminders sent: ${summary.sentCount}, Errors: ${summary.errorsCount}`,
        data: summary,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
