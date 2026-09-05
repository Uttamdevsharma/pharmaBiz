"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const prisma_1 = require("../../app/lib/prisma");
const sslcommerz_1 = require("../../app/lib/sslcommerz");
const audit_1 = require("../../app/lib/audit");
class PaymentService {
    /**
     * Initiate SSLCOMMERZ payment for a subscription
     */
    static async initiateSubscriptionPayment(tenantId, data) {
        const subscription = await prisma_1.prisma.subscription.findUnique({
            where: { id: data.subscriptionId },
            include: {
                plan: true,
                tenant: true,
            },
        });
        if (!subscription) {
            throw new Error("Subscription not found");
        }
        if (subscription.tenantId !== tenantId) {
            throw new Error("Unauthorized access to this subscription");
        }
        if (subscription.status === "ACTIVE") {
            throw new Error("This subscription is already active and paid for");
        }
        const tranId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const basePrice = Number(subscription.plan.price);
        const durationDays = (new Date(subscription.endDate).getTime() - new Date(subscription.startDate).getTime()) / (1000 * 60 * 60 * 24);
        const isYearly = durationDays > 45;
        const amount = isYearly ? Math.round(basePrice * 12 * 0.85) : basePrice;
        // Save pending payment record in DB
        const payment = await prisma_1.prisma.payment.create({
            data: {
                tenantId,
                subscriptionId: subscription.id,
                amount,
                currency: "BDT",
                tranId,
                status: "PENDING",
            },
        });
        // Call SSLCOMMERZ Gateway
        const sslcommerzResponse = await sslcommerz_1.SSLCommerzService.initPayment({
            totalAmount: amount,
            currency: "BDT",
            tranId,
            customerName: data.customerName || subscription.tenant.name,
            customerEmail: data.customerEmail || subscription.tenant.email || "billing@pharmacy.com",
            customerPhone: data.customerPhone || subscription.tenant.phone || "01700000000",
            customerAddress: data.customerAddress || subscription.tenant.address || "Bangladesh",
            customerCity: data.customerCity || "Dhaka",
            productName: `${subscription.plan.name} Subscription Plan`,
            productCategory: "SaaS Subscription",
            valueA: tenantId,
            valueB: subscription.id,
            valueC: "SUBSCRIBE",
        });
        if (sslcommerzResponse.status !== "SUCCESS" && !sslcommerzResponse.GatewayPageURL) {
            // Mark as failed if gateway rejected
            await prisma_1.prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: "FAILED",
                    rawResponse: sslcommerzResponse,
                },
            });
            throw new Error(sslcommerzResponse.failedreason || "Failed to initialize SSLCOMMERZ payment session");
        }
        return {
            paymentId: payment.id,
            tranId,
            amount,
            currency: "BDT",
            gatewayUrl: sslcommerzResponse.GatewayPageURL || sslcommerzResponse.redirectGatewayURL,
            sessionKey: sslcommerzResponse.sessionkey,
        };
    }
    /**
     * Process and validate payment callback (Idempotent)
     */
    static async processPaymentValidation(callbackData) {
        const { tran_id, val_id } = callbackData;
        if (!tran_id) {
            throw new Error("Transaction ID is required");
        }
        const payment = await prisma_1.prisma.payment.findUnique({
            where: { tranId: tran_id },
            include: {
                subscription: {
                    include: { plan: true },
                },
            },
        });
        if (!payment) {
            throw new Error(`Payment record not found for transaction: ${tran_id}`);
        }
        // Idempotency check: If already validated, return existing active state
        if (payment.status === "VALIDATED") {
            return {
                success: true,
                alreadyProcessed: true,
                message: "Payment was already validated and subscription is active.",
                payment,
            };
        }
        // If val_id is provided, validate directly with SSLCOMMERZ API
        let isValid = false;
        let validationResult = null;
        if (val_id) {
            try {
                validationResult = await sslcommerz_1.SSLCommerzService.validatePayment(val_id);
                if ((validationResult.status === "VALID" || validationResult.status === "VALIDATED") &&
                    (!validationResult.tran_id || validationResult.tran_id === payment.tranId)) {
                    isValid = true;
                }
            }
            catch (err) {
                console.error("[PaymentService] SSLCOMMERZ val_id validation error:", err);
            }
        }
        // If not validated via val_id, query SSLCOMMERZ by tran_id
        if (!isValid && tran_id) {
            try {
                const queryRes = await sslcommerz_1.SSLCommerzService.queryTransaction(tran_id);
                if (queryRes?.element && Array.isArray(queryRes.element)) {
                    const matching = queryRes.element.find((e) => e.tran_id === tran_id && (e.status === "VALID" || e.status === "VALIDATED"));
                    if (matching) {
                        validationResult = matching;
                        isValid = true;
                    }
                }
                else if (queryRes?.status === "VALID" || queryRes?.status === "VALIDATED") {
                    validationResult = queryRes;
                    isValid = true;
                }
            }
            catch (err) {
                console.error("[PaymentService] SSLCOMMERZ tran_id query error:", err);
            }
        }
        // Fallback: If gateway posted callback status VALID/VALIDATED directly
        if (!isValid && (callbackData.status === "VALID" || callbackData.status === "VALIDATED")) {
            isValid = true;
        }
        if (!isValid) {
            await prisma_1.prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: "FAILED",
                    valId: val_id || null,
                    rawResponse: (validationResult || callbackData),
                },
            });
            throw new Error("Payment validation failed with SSLCOMMERZ");
        }
        // Use Prisma Transaction to activate subscription and update tenant tier
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            // 1. Update Payment status
            const updatedPayment = await tx.payment.update({
                where: { id: payment.id },
                data: {
                    status: "VALIDATED",
                    valId: val_id || validationResult?.val_id || null,
                    bankTranId: callbackData.bank_tran_id || validationResult?.bank_tran_id || null,
                    cardType: callbackData.card_type || validationResult?.card_type || null,
                    cardBrand: callbackData.card_brand || validationResult?.card_brand || null,
                    paymentMethod: callbackData.card_type || "SSLCOMMERZ",
                    rawResponse: (validationResult || callbackData),
                },
            });
            // 2. Activate Subscription
            let updatedSubscription = null;
            if (payment.subscriptionId) {
                updatedSubscription = await tx.subscription.update({
                    where: { id: payment.subscriptionId },
                    data: {
                        status: "ACTIVE",
                    },
                    include: { plan: true },
                });
                // 3. Update Tenant Tier and activate verification status
                if (updatedSubscription.plan) {
                    await tx.tenant.update({
                        where: { id: payment.tenantId },
                        data: {
                            tier: updatedSubscription.plan.tier,
                            verificationStatus: "ACTIVE",
                            isActive: true,
                        },
                    });
                }
            }
            return { updatedPayment, updatedSubscription };
        });
        // Record audit log asynchronously
        await audit_1.AuditService.log({
            tenantId: payment.tenantId,
            action: "SUBSCRIPTION_PAYMENT_SUCCESS",
            details: {
                tranId: payment.tranId,
                amount: payment.amount,
                subscriptionId: payment.subscriptionId,
            },
        });
        return {
            success: true,
            message: "Payment successfully validated and subscription activated!",
            data: result,
        };
    }
    /**
     * Handle Failed Payment
     */
    static async handleFailedPayment(callbackData) {
        const { tran_id } = callbackData;
        if (!tran_id)
            return;
        await prisma_1.prisma.payment.updateMany({
            where: { tranId: tran_id, status: "PENDING" },
            data: {
                status: "FAILED",
                rawResponse: callbackData,
            },
        });
    }
    /**
     * Handle Cancelled Payment
     */
    static async handleCancelledPayment(callbackData) {
        const { tran_id } = callbackData;
        if (!tran_id)
            return;
        await prisma_1.prisma.payment.updateMany({
            where: { tranId: tran_id, status: "PENDING" },
            data: {
                status: "CANCELLED",
                rawResponse: callbackData,
            },
        });
    }
    /**
     * Get Tenant Payment History
     */
    static async getTenantPayments(tenantId) {
        return await prisma_1.prisma.payment.findMany({
            where: { tenantId },
            orderBy: { createdAt: "desc" },
            include: {
                subscription: {
                    include: { plan: true },
                },
            },
        });
    }
    /**
     * Validate payment manually by Payment ID
     */
    static async validatePaymentById(paymentId, tenantId) {
        const payment = await prisma_1.prisma.payment.findUnique({
            where: { id: paymentId },
        });
        if (!payment) {
            throw new Error("Payment not found");
        }
        if (payment.tenantId !== tenantId) {
            throw new Error("Unauthorized");
        }
        if (payment.status === "VALIDATED") {
            return { success: true, status: "VALIDATED", message: "Payment is already validated" };
        }
        if (payment.valId) {
            return await this.processPaymentValidation({
                tran_id: payment.tranId,
                val_id: payment.valId,
            });
        }
        // Query SSLCOMMERZ using tran_id
        const queryRes = await sslcommerz_1.SSLCommerzService.queryTransaction(payment.tranId);
        if (queryRes?.status === "VALID" || queryRes?.status === "VALIDATED") {
            return await this.processPaymentValidation({
                tran_id: payment.tranId,
                val_id: queryRes.val_id,
                ...queryRes,
            });
        }
        return {
            success: false,
            status: payment.status,
            message: "Payment could not be validated yet",
        };
    }
}
exports.PaymentService = PaymentService;
