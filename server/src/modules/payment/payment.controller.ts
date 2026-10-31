import { Request, Response } from "express";
import { PaymentService } from "./payment.service";

export class PaymentController {
  /**
   * Initiate SSLCOMMERZ Payment Session
   */
  static async initiate(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const userRole = req.user?.role;
      const result = await PaymentService.initiateSubscriptionPayment(tenantId, req.body, userRole);
      res.status(200).json({
        success: true,
        message: "Payment session initialized successfully",
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * SSLCOMMERZ Success Callback (POST & GET)
   */
  static async handleSuccess(req: Request, res: Response): Promise<void> {
    const callbackData = { ...req.query, ...req.body };
    const tranId = (callbackData.tran_id as string) || "";
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3001";

    try {
      if (!tranId) {
        throw new Error("Transaction ID is missing from payment callback");
      }

      const result = await PaymentService.processPaymentValidation(callbackData);

      // If requested via browser (HTML accept or redirect or form POST), redirect to frontend success page
      const isBrowser = req.headers.accept?.includes("text/html") || req.method === "POST" || !!req.query.tran_id;
      if (isBrowser) {
        res.redirect(`${clientUrl}/payment/success?tran_id=${encodeURIComponent(tranId)}`);
        return;
      }

      res.status(200).json(result);
    } catch (error: any) {
      console.error("[PaymentController] SSLCOMMERZ handleSuccess error:", error.message);
      const isBrowser = req.headers.accept?.includes("text/html") || req.method === "POST" || !!req.query.tran_id;
      if (isBrowser) {
        res.redirect(
          `${clientUrl}/payment/fail?tran_id=${encodeURIComponent(tranId)}&error=${encodeURIComponent(error.message)}`
        );
        return;
      }
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * SSLCOMMERZ Fail Callback (POST & GET)
   */
  static async handleFail(req: Request, res: Response): Promise<void> {
    const callbackData = { ...req.query, ...req.body };
    const tranId = (callbackData.tran_id as string) || "";
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3001";

    try {
      await PaymentService.handleFailedPayment(callbackData);

      const isBrowser = req.headers.accept?.includes("text/html") || req.method === "POST" || !!req.query.tran_id;
      if (isBrowser) {
        res.redirect(`${clientUrl}/payment/fail?tran_id=${encodeURIComponent(tranId)}`);
        return;
      }

      res.status(400).json({ success: false, message: "Payment failed", tranId });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * SSLCOMMERZ Cancel Callback (POST & GET)
   */
  static async handleCancel(req: Request, res: Response): Promise<void> {
    const callbackData = { ...req.query, ...req.body };
    const tranId = (callbackData.tran_id as string) || "";
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3001";

    try {
      await PaymentService.handleCancelledPayment(callbackData);

      const isBrowser = req.headers.accept?.includes("text/html") || req.method === "POST" || !!req.query.tran_id;
      if (isBrowser) {
        res.redirect(`${clientUrl}/payment/cancel?tran_id=${encodeURIComponent(tranId)}`);
        return;
      }

      res.status(200).json({ success: true, message: "Payment cancelled", tranId });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * SSLCOMMERZ IPN Endpoint (POST & GET)
   */
  static async handleIPN(req: Request, res: Response): Promise<void> {
    try {
      const callbackData = { ...req.query, ...req.body };
      const result = await PaymentService.processPaymentValidation(callbackData);
      res.status(200).json({ success: true, ipnStatus: "PROCESSED", data: result });
    } catch (error: any) {
      console.error("[PaymentController] IPN Error:", error);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Get Tenant Payment History
   */
  static async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const payments = await PaymentService.getTenantPayments(tenantId);
      res.status(200).json({ success: true, data: payments });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Manual Payment Validation
   */
  static async validatePayment(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const tenantId = req.user!.tenantId;
      const result = await PaymentService.validatePaymentById(id, tenantId);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * ================= BKASH TOKENIZED CHECKOUT =================
   */
  static async initiateBkash(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).user?.tenantId || req.body.tenantId || req.body.pharmacyId;
      const result = await PaymentService.initiateBkashCheckout({
        ...req.body,
        tenantId,
      });
      res.status(200).json({
        success: true,
        bkashURL: result.bkashURL,
        paymentID: result.paymentID,
      });
    } catch (error: any) {
      console.error("[PaymentController] initiateBkash error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async handleBkashCallback(req: Request, res: Response): Promise<void> {
    try {
      const params = { ...req.query, ...req.body };
      const { redirectUrl } = await PaymentService.handleBkashCallback(params);
      res.redirect(redirectUrl);
    } catch (error: any) {
      console.error("[PaymentController] handleBkashCallback error:", error.message);
      const host = process.env.CLIENT_URL || "http://localhost:3001";
      const isUpgrade = req.query.is_upgrade === "true";
      const errorUrl = isUpgrade
        ? `${host}/dashboard?payment=fail&error=${encodeURIComponent(error.message)}`
        : `${host}/register?error=${encodeURIComponent(error.message)}`;
      res.redirect(errorUrl);
    }
  }

  /**
   * ================= NAGAD MERCHANT CHECKOUT =================
   */
  static async initiateNagad(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).user?.tenantId || req.body.tenantId || req.body.pharmacyId;
      const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
      const result = await PaymentService.initiateNagadCheckout({
        ...req.body,
        tenantId,
        clientIp,
      });
      res.status(200).json({
        success: true,
        nagadURL: result.nagadURL,
        paymentReferenceId: result.paymentReferenceId,
      });
    } catch (error: any) {
      console.error("[PaymentController] initiateNagad error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async handleNagadCallback(req: Request, res: Response): Promise<void> {
    try {
      const params = { ...req.query, ...req.body };
      const { redirectUrl } = await PaymentService.handleNagadCallback(params);
      res.redirect(redirectUrl);
    } catch (error: any) {
      console.error("[PaymentController] handleNagadCallback error:", error.message);
      const host = process.env.CLIENT_URL || "http://localhost:3001";
      const isUpgrade = req.query.is_upgrade === "true";
      const errorUrl = isUpgrade
        ? `${host}/dashboard?payment=fail&error=${encodeURIComponent(error.message)}`
        : `${host}/register?error=${encodeURIComponent(error.message)}`;
      res.redirect(errorUrl);
    }
  }

  /**
   * ================= EPS GATEWAY CHECKOUT =================
   */
  static async initiateEps(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).user?.tenantId || req.body.tenantId || req.body.pharmacyId;
      const result = await PaymentService.initiateEpsCheckout({
        ...req.body,
        tenantId,
      });
      res.status(200).json({
        success: true,
        epsURL: result.epsURL,
        paymentID: result.paymentID,
      });
    } catch (error: any) {
      console.error("[PaymentController] initiateEps error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async handleEpsCallback(req: Request, res: Response): Promise<void> {
    try {
      const params = { ...req.query, ...req.body };
      const { redirectUrl } = await PaymentService.handleEpsCallback(params);
      res.redirect(redirectUrl);
    } catch (error: any) {
      console.error("[PaymentController] handleEpsCallback error:", error.message);
      const host = process.env.CLIENT_URL || "http://localhost:3001";
      const isUpgrade = req.query.is_upgrade === "true";
      const errorUrl = isUpgrade
        ? `${host}/dashboard?payment=fail&error=${encodeURIComponent(error.message)}`
        : `${host}/register?error=${encodeURIComponent(error.message)}`;
      res.redirect(errorUrl);
    }
  }
}
