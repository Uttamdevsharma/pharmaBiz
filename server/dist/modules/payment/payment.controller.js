"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentController = void 0;
const payment_service_1 = require("./payment.service");
class PaymentController {
    /**
     * Initiate SSLCOMMERZ Payment Session
     */
    static async initiate(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            const userRole = req.user?.role;
            const result = await payment_service_1.PaymentService.initiateSubscriptionPayment(tenantId, req.body, userRole);
            res.status(200).json({
                success: true,
                message: "Payment session initialized successfully",
                data: result,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    /**
     * SSLCOMMERZ Success Callback (POST & GET)
     */
    static async handleSuccess(req, res) {
        const callbackData = { ...req.query, ...req.body };
        const tranId = callbackData.tran_id || "";
        const clientUrl = process.env.CLIENT_URL || "http://localhost:3001";
        try {
            if (!tranId) {
                throw new Error("Transaction ID is missing from payment callback");
            }
            const result = await payment_service_1.PaymentService.processPaymentValidation(callbackData);
            // If requested via browser (HTML accept or redirect or form POST), redirect to frontend success page
            const isBrowser = req.headers.accept?.includes("text/html") || req.method === "POST" || !!req.query.tran_id;
            if (isBrowser) {
                res.redirect(`${clientUrl}/payment/success?tran_id=${encodeURIComponent(tranId)}`);
                return;
            }
            res.status(200).json(result);
        }
        catch (error) {
            console.error("[PaymentController] SSLCOMMERZ handleSuccess error:", error.message);
            const isBrowser = req.headers.accept?.includes("text/html") || req.method === "POST" || !!req.query.tran_id;
            if (isBrowser) {
                res.redirect(`${clientUrl}/payment/fail?tran_id=${encodeURIComponent(tranId)}&error=${encodeURIComponent(error.message)}`);
                return;
            }
            res.status(400).json({ success: false, message: error.message });
        }
    }
    /**
     * SSLCOMMERZ Fail Callback (POST & GET)
     */
    static async handleFail(req, res) {
        const callbackData = { ...req.query, ...req.body };
        const tranId = callbackData.tran_id || "";
        const clientUrl = process.env.CLIENT_URL || "http://localhost:3001";
        try {
            await payment_service_1.PaymentService.handleFailedPayment(callbackData);
            const isBrowser = req.headers.accept?.includes("text/html") || req.method === "POST" || !!req.query.tran_id;
            if (isBrowser) {
                res.redirect(`${clientUrl}/payment/fail?tran_id=${encodeURIComponent(tranId)}`);
                return;
            }
            res.status(400).json({ success: false, message: "Payment failed", tranId });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    /**
     * SSLCOMMERZ Cancel Callback (POST & GET)
     */
    static async handleCancel(req, res) {
        const callbackData = { ...req.query, ...req.body };
        const tranId = callbackData.tran_id || "";
        const clientUrl = process.env.CLIENT_URL || "http://localhost:3001";
        try {
            await payment_service_1.PaymentService.handleCancelledPayment(callbackData);
            const isBrowser = req.headers.accept?.includes("text/html") || req.method === "POST" || !!req.query.tran_id;
            if (isBrowser) {
                res.redirect(`${clientUrl}/payment/cancel?tran_id=${encodeURIComponent(tranId)}`);
                return;
            }
            res.status(200).json({ success: true, message: "Payment cancelled", tranId });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    /**
     * SSLCOMMERZ IPN Endpoint (POST & GET)
     */
    static async handleIPN(req, res) {
        try {
            const callbackData = { ...req.query, ...req.body };
            const result = await payment_service_1.PaymentService.processPaymentValidation(callbackData);
            res.status(200).json({ success: true, ipnStatus: "PROCESSED", data: result });
        }
        catch (error) {
            console.error("[PaymentController] IPN Error:", error);
            res.status(400).json({ success: false, message: error.message });
        }
    }
    /**
     * Get Tenant Payment History
     */
    static async getHistory(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const payments = await payment_service_1.PaymentService.getTenantPayments(tenantId);
            res.status(200).json({ success: true, data: payments });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    /**
     * Manual Payment Validation
     */
    static async validatePayment(req, res) {
        try {
            const id = req.params.id;
            const tenantId = req.user.tenantId;
            const result = await payment_service_1.PaymentService.validatePaymentById(id, tenantId);
            res.status(200).json(result);
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    /**
     * ================= BKASH TOKENIZED CHECKOUT =================
     */
    static async initiateBkash(req, res) {
        try {
            const tenantId = req.user?.tenantId || req.body.tenantId || req.body.pharmacyId;
            const result = await payment_service_1.PaymentService.initiateBkashCheckout({
                ...req.body,
                tenantId,
            });
            res.status(200).json({
                success: true,
                bkashURL: result.bkashURL,
                paymentID: result.paymentID,
            });
        }
        catch (error) {
            console.error("[PaymentController] initiateBkash error:", error.message);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    static async handleBkashCallback(req, res) {
        try {
            const params = { ...req.query, ...req.body };
            const { redirectUrl } = await payment_service_1.PaymentService.handleBkashCallback(params);
            res.redirect(redirectUrl);
        }
        catch (error) {
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
    static async initiateNagad(req, res) {
        try {
            const tenantId = req.user?.tenantId || req.body.tenantId || req.body.pharmacyId;
            const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
            const result = await payment_service_1.PaymentService.initiateNagadCheckout({
                ...req.body,
                tenantId,
                clientIp,
            });
            res.status(200).json({
                success: true,
                nagadURL: result.nagadURL,
                paymentReferenceId: result.paymentReferenceId,
            });
        }
        catch (error) {
            console.error("[PaymentController] initiateNagad error:", error.message);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    static async handleNagadCallback(req, res) {
        try {
            const params = { ...req.query, ...req.body };
            const { redirectUrl } = await payment_service_1.PaymentService.handleNagadCallback(params);
            res.redirect(redirectUrl);
        }
        catch (error) {
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
    static async initiateEps(req, res) {
        try {
            const tenantId = req.user?.tenantId || req.body.tenantId || req.body.pharmacyId;
            const result = await payment_service_1.PaymentService.initiateEpsCheckout({
                ...req.body,
                tenantId,
            });
            res.status(200).json({
                success: true,
                epsURL: result.epsURL,
                paymentID: result.paymentID,
            });
        }
        catch (error) {
            console.error("[PaymentController] initiateEps error:", error.message);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    static async handleEpsCallback(req, res) {
        try {
            const params = { ...req.query, ...req.body };
            const { redirectUrl } = await payment_service_1.PaymentService.handleEpsCallback(params);
            res.redirect(redirectUrl);
        }
        catch (error) {
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
exports.PaymentController = PaymentController;
