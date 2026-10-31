import { prisma } from "../../app/lib/prisma";
import { SSLCommerzService } from "../../app/lib/sslcommerz";
import { AuditService } from "../../app/lib/audit";
import { InitiatePaymentInput, SSLCommerzCallbackInput } from "./payment.validation";
import { createBkashPayment, executeBkashPayment } from "../../app/lib/bkash";
import { createNagadPayment, verifyNagadPayment } from "../../app/lib/nagad";
import { createEpsPayment, verifyEpsPayment } from "../../app/lib/eps";

export class PaymentService {
  /**
   * Initiate SSLCOMMERZ payment for a subscription
   */
  static async initiateSubscriptionPayment(
    tenantId: string | undefined,
    data: InitiatePaymentInput,
    userRole?: string
  ) {
    const subscription = await (prisma as any).subscription.findUnique({
      where: { id: data.subscriptionId },
      include: {
        plan: true,
        tenant: true,
      },
    });

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    if (subscription.status === "ACTIVE") {
      throw new Error("This subscription is already active and paid for");
    }

    // Permission checks:
    // 1. Super Admin is always authorized to initiate checkout for any subscription
    // 2. The tenant owner whose tenantId matches subscription.tenantId is authorized
    // 3. Initial subscription payment for an approved registration (verificationStatus === "APPROVED_PENDING_PAYMENT" & subscription.status === "PENDING")
    const isSuperAdmin = userRole === "SUPER_ADMIN";
    const isMatchingTenant = Boolean(tenantId && subscription.tenantId === tenantId);
    const isApprovedPendingRegistration =
      subscription.tenant?.verificationStatus === "APPROVED_PENDING_PAYMENT" &&
      subscription.status === "PENDING";

    if (!isSuperAdmin && !isMatchingTenant && !isApprovedPendingRegistration) {
      throw new Error("Unauthorized access to this subscription");
    }

    const tranId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const basePrice = Number(subscription.plan.price);
    const durationDays = (new Date(subscription.endDate).getTime() - new Date(subscription.startDate).getTime()) / (1000 * 60 * 60 * 24);
    const isYearly = durationDays > 45;
    const planPrice = isYearly ? Math.round(basePrice * 12 * 0.85) : basePrice;

    // Determine License & Data Retention Fees based on lifecycle
    const validatedPaymentsCount = await (prisma as any).payment.count({
      where: {
        tenantId: subscription.tenantId,
        status: "VALIDATED",
      },
    });

    const isInitialRegistration =
      validatedPaymentsCount === 0 ||
      subscription.tenant?.verificationStatus === "APPROVED_PENDING_PAYMENT";

    let extraFee = 0;
    let feeLabel = "";
    let productName = `${subscription.plan.name} Subscription Plan`;

    if (isInitialRegistration) {
      // Rule 1: Initial pharmacy registration requires ৳5,000 Software License Fee + Plan Price
      extraFee = 5000;
      feeLabel = "One-Time Software License Fee (৳5,000)";
      productName = `${subscription.plan.name} + License Fee (৳5,000)`;
    } else {
      // Existing subscriber: check expiration status on their most recent active/expired subscription
      const priorSub = await (prisma as any).subscription.findFirst({
        where: {
          tenantId: subscription.tenantId,
          id: { not: subscription.id },
          status: { in: ["ACTIVE", "EXPIRED"] },
        },
        orderBy: { endDate: "desc" },
      });

      const now = new Date();
      if (priorSub && new Date(priorSub.endDate).getTime() < now.getTime()) {
        const msExpired = now.getTime() - new Date(priorSub.endDate).getTime();
        const daysExpired = Math.floor(msExpired / (1000 * 60 * 60 * 24));

        if (daysExpired > 90) {
          // Rule: Past 90 days (3 months) - Historical data cannot be restored. Must register anew.
          throw new Error(
            `Your previous subscription expired ${daysExpired} days ago (exceeding the 90-day / 3-month data retention grace period). Under the terms of service, historical data cannot be restored. Please register a new pharmacy account with the initial ৳5,000 license fee.`
          );
        } else if (daysExpired > 30) {
          // Rule: Between day 31 and day 90 - Data preserved on server; ৳2,000 Data Retention & Reactivation Fee applies
          extraFee = 2000;
          feeLabel = `Server Data Retention & Reactivation Fee (৳2,000 - expired ${daysExpired} day(s) ago)`;
          productName = `${subscription.plan.name} + Data Retention Fee (৳2,000)`;
        } else {
          // Rule: Within 30 days of expiration (Day 1 - 30) - Standard renewal with zero extra fee
          extraFee = 0;
          feeLabel = `Subscription Renewal (Within 30-Day Grace Period - expired ${daysExpired} day(s) ago)`;
          productName = `${subscription.plan.name} Subscription Renewal`;
        }
      }
    }

    const amount = planPrice + extraFee;

    // Save pending payment record in DB (ALWAYS linked to subscription.tenantId)
    const payment = await (prisma as any).payment.create({
      data: {
        tenantId: subscription.tenantId,
        subscriptionId: subscription.id,
        amount,
        currency: "BDT",
        tranId,
        status: "PENDING",
      },
    });

    // Call SSLCOMMERZ Gateway
    const sslcommerzResponse = await SSLCommerzService.initPayment({
      totalAmount: amount,
      currency: "BDT",
      tranId,
      customerName: data.customerName || subscription.tenant.name,
      customerEmail: data.customerEmail || subscription.tenant.email || "billing@pharmacy.com",
      customerPhone: data.customerPhone || subscription.tenant.phone || "01700000000",
      customerAddress: data.customerAddress || subscription.tenant.address || "Bangladesh",
      customerCity: data.customerCity || "Dhaka",
      productName: productName,
      productCategory: "SaaS Subscription",
      valueA: subscription.tenantId,
      valueB: subscription.id,
      valueC: feeLabel || "SUBSCRIBE",
    });

    if (sslcommerzResponse.status !== "SUCCESS" && !sslcommerzResponse.GatewayPageURL) {
      // Mark as failed if gateway rejected
      await (prisma as any).payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          rawResponse: sslcommerzResponse as any,
        },
      });

      throw new Error(
        sslcommerzResponse.failedreason || "Failed to initialize SSLCOMMERZ payment session"
      );
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
  static async processPaymentValidation(callbackData: SSLCommerzCallbackInput) {
    const { tran_id, val_id } = callbackData;

    if (!tran_id) {
      throw new Error("Transaction ID is required");
    }

    const payment = await (prisma as any).payment.findUnique({
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
    let validationResult: any = null;

    if (val_id) {
      try {
        validationResult = await SSLCommerzService.validatePayment(val_id);
        if (
          (validationResult.status === "VALID" || validationResult.status === "VALIDATED") &&
          (!validationResult.tran_id || validationResult.tran_id === payment.tranId)
        ) {
          isValid = true;
        }
      } catch (err) {
        console.error("[PaymentService] SSLCOMMERZ val_id validation error:", err);
      }
    }

    // If not validated via val_id, query SSLCOMMERZ by tran_id
    if (!isValid && tran_id) {
      try {
        const queryRes = await SSLCommerzService.queryTransaction(tran_id);
        if (queryRes?.element && Array.isArray(queryRes.element)) {
          const matching = queryRes.element.find(
            (e: any) =>
              e.tran_id === tran_id && (e.status === "VALID" || e.status === "VALIDATED")
          );
          if (matching) {
            validationResult = matching;
            isValid = true;
          }
        } else if (queryRes?.status === "VALID" || queryRes?.status === "VALIDATED") {
          validationResult = queryRes;
          isValid = true;
        }
      } catch (err) {
        console.error("[PaymentService] SSLCOMMERZ tran_id query error:", err);
      }
    }

    // Fallback: If gateway posted callback status VALID/VALIDATED directly
    if (!isValid && (callbackData.status === "VALID" || callbackData.status === "VALIDATED")) {
      isValid = true;
    }

    if (!isValid) {
      await (prisma as any).payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          valId: val_id || null,
          rawResponse: (validationResult || callbackData) as any,
        },
      });

      throw new Error("Payment validation failed with SSLCOMMERZ");
    }

    // Use Prisma Transaction to activate subscription and update tenant tier
    const result = await (prisma as any).$transaction(async (tx: any) => {
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
          rawResponse: (validationResult || callbackData) as any,
        },
      });

      // 2. Activate Subscription
      let updatedSubscription = null;
      if (payment.subscriptionId) {
        const subRecord = await tx.subscription.findUnique({
          where: { id: payment.subscriptionId },
          include: { plan: true },
        });

        const billingCycle = subRecord?.plan?.billingCycle || "MONTHLY";
        const durationDays = billingCycle === "YEARLY" ? 365 : 30;
        const now = new Date();
        const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

        // Mark any older subscriptions for this tenant as EXPIRED
        await tx.subscription.updateMany({
          where: {
            tenantId: payment.tenantId,
            id: { not: payment.subscriptionId },
            status: "ACTIVE",
          },
          data: { status: "EXPIRED" },
        });

        updatedSubscription = await tx.subscription.update({
          where: { id: payment.subscriptionId },
          data: {
            status: "ACTIVE",
            startDate: now,
            endDate: endDate,
            expiryReminderSentAt: null,
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
    await AuditService.log({
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
  static async handleFailedPayment(callbackData: SSLCommerzCallbackInput) {
    const { tran_id } = callbackData;
    if (!tran_id) return;

    await (prisma as any).payment.updateMany({
      where: { tranId: tran_id, status: "PENDING" },
      data: {
        status: "FAILED",
        rawResponse: callbackData as any,
      },
    });
  }

  /**
   * Handle Cancelled Payment
   */
  static async handleCancelledPayment(callbackData: SSLCommerzCallbackInput) {
    const { tran_id } = callbackData;
    if (!tran_id) return;

    await (prisma as any).payment.updateMany({
      where: { tranId: tran_id, status: "PENDING" },
      data: {
        status: "CANCELLED",
        rawResponse: callbackData as any,
      },
    });
  }

  /**
   * Get Tenant Payment History (Only successful, completed subscription payments)
   */
  static async getTenantPayments(tenantId: string) {
    return await (prisma as any).payment.findMany({
      where: {
        tenantId,
        status: "VALIDATED",
      },
      orderBy: { createdAt: "desc" },
      include: {
        tenant: true,
        subscription: {
          include: { plan: true },
        },
      },
    });
  }

  /**
   * Validate payment manually by Payment ID
   */
  static async validatePaymentById(paymentId: string, tenantId: string) {
    const payment = await (prisma as any).payment.findUnique({
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
    const queryRes = await SSLCommerzService.queryTransaction(payment.tranId);
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

  /**
   * ================= BKASH TOKENIZED CHECKOUT =================
   */
  static async initiateBkashCheckout(data: {
    pharmacyId?: string;
    tenantId?: string;
    planId: string;
    billingCycle?: string;
    isUpgrade?: boolean;
    payerReference?: string;
  }) {
    const tenantIdentifier = data.tenantId || data.pharmacyId;
    if (!tenantIdentifier) {
      throw new Error("Pharmacy ID or Tenant ID is required");
    }

    const tenant = await (prisma as any).tenant.findUnique({
      where: { id: tenantIdentifier },
    });

    if (!tenant) {
      throw new Error("Pharmacy record not found");
    }

    const plan = await (prisma as any).subscriptionPlan.findUnique({
      where: { id: data.planId },
    });

    if (!plan) {
      throw new Error("Subscription plan not found");
    }

    const isAnnual = data.billingCycle === "ANNUAL" || data.billingCycle === "YEARLY";
    const basePrice = Number(plan.price);
    const planPrice = isAnnual ? Math.round(basePrice * 12 * 0.85) : basePrice;
    const isTrial = plan.tier === "TRIAL" || !!plan.features?.isTrial;
    const initialLicenseFee = data.isUpgrade || isTrial ? 0 : 5000;
    const totalAmount = isTrial ? 0 : planPrice + initialLicenseFee;

    const host = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
    const invoiceNumber = `PHARM-${tenant.id.slice(0, 8)}-P${plan.id.slice(0, 6)}-${Date.now().toString().slice(-6)}`;
    const callbackURL = `${host}/api/payments/bkash/callback?pharmacy_id=${tenant.id}&plan_id=${plan.id}${data.isUpgrade ? "&is_upgrade=true" : ""}&cycle=${data.billingCycle || "MONTHLY"}`;

    const bkashRes = await createBkashPayment({
      amount: totalAmount,
      invoiceNumber,
      callbackURL,
      payerReference: data.payerReference || tenant.phone || "01700000000",
    });

    if (bkashRes && bkashRes.bkashURL) {
      await (prisma as any).payment.create({
        data: {
          tenantId: tenant.id,
          amount: totalAmount,
          currency: "BDT",
          tranId: bkashRes.paymentID || invoiceNumber,
          status: "PENDING",
          paymentMethod: "BKASH_DIRECT",
          type: data.isUpgrade ? "UPGRADE" : "INITIAL_REGISTRATION",
        },
      });

      return {
        success: true,
        bkashURL: bkashRes.bkashURL,
        paymentID: bkashRes.paymentID,
      };
    }

    throw new Error(bkashRes?.statusMessage || "Could not initiate bKash payment");
  }

  static async handleBkashCallback(params: {
    paymentID?: string;
    status?: string;
    pharmacy_id?: string;
    plan_id?: string;
    is_upgrade?: string;
    cycle?: string;
  }) {
    const host = process.env.CLIENT_URL || "http://localhost:3001";
    const { paymentID, status, pharmacy_id, plan_id, is_upgrade, cycle } = params;
    const isUpgrade = is_upgrade === "true";

    if (status === "cancel" || status === "failure") {
      const returnUrl = isUpgrade
        ? `${host}/dashboard?payment=cancelled`
        : `${host}/register?error=Payment+cancelled`;
      return { redirectUrl: returnUrl };
    }

    if (!paymentID || status !== "success") {
      throw new Error("Invalid payment status from bKash");
    }

    const execRes = await executeBkashPayment(paymentID);
    if (execRes?.statusCode !== "0000" && execRes?.transactionStatus !== "Completed") {
      throw new Error(execRes?.statusMessage || "bKash verification failed");
    }

    const trxId = execRes.trxID || paymentID;
    const amount = parseFloat(execRes.amount || "0");
    const durationDays = cycle === "ANNUAL" || cycle === "YEARLY" ? 365 : 30;

    if (isUpgrade && pharmacy_id && plan_id) {
      const now = new Date();
      const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

      const plan = await (prisma as any).subscriptionPlan.findUnique({
        where: { id: plan_id },
      });

      await (prisma as any).subscription.updateMany({
        where: {
          tenantId: pharmacy_id,
          status: "ACTIVE",
        },
        data: { status: "EXPIRED" },
      });

      const newSub = await (prisma as any).subscription.create({
        data: {
          tenantId: pharmacy_id,
          planId: plan_id,
          status: "ACTIVE",
          startDate: now,
          endDate: endDate,
        },
      });

      await (prisma as any).tenant.update({
        where: { id: pharmacy_id },
        data: {
          tier: plan ? plan.tier : "STARTER",
          verificationStatus: "ACTIVE",
          isActive: true,
        },
      });

      await (prisma as any).payment.upsert({
        where: { tranId: paymentID },
        create: {
          tenantId: pharmacy_id,
          subscriptionId: newSub.id,
          amount,
          currency: "BDT",
          tranId: trxId,
          status: "VALIDATED",
          paymentMethod: "BKASH_DIRECT",
          type: "UPGRADE",
        },
        update: {
          status: "VALIDATED",
          subscriptionId: newSub.id,
          tranId: trxId,
          paymentMethod: "BKASH_DIRECT",
          rawResponse: execRes,
        },
      });

      return {
        redirectUrl: `${host}/payment/success?tran_id=${encodeURIComponent(trxId)}`,
      };
    } else if (pharmacy_id) {
      await (prisma as any).tenant.update({
        where: { id: pharmacy_id },
        data: {
          verificationStatus: "PENDING_APPROVAL",
          paymentMethod: "BKASH_DIRECT",
          manualPaymentTrxId: trxId,
          manualPaymentAmount: amount,
        },
      });

      await (prisma as any).payment.upsert({
        where: { tranId: paymentID },
        create: {
          tenantId: pharmacy_id,
          amount,
          currency: "BDT",
          tranId: trxId,
          status: "VALIDATED",
          paymentMethod: "BKASH_DIRECT",
          type: "INITIAL_REGISTRATION",
        },
        update: {
          status: "VALIDATED",
          tranId: trxId,
          paymentMethod: "BKASH_DIRECT",
          rawResponse: execRes,
        },
      });

      return {
        redirectUrl: `${host}/register?success=true&trxId=${encodeURIComponent(trxId)}&tenantId=${pharmacy_id}`,
      };
    }

    return {
      redirectUrl: `${host}/payment/success?tran_id=${encodeURIComponent(trxId)}`,
    };
  }

  /**
   * ================= NAGAD MERCHANT CHECKOUT =================
   */
  static async initiateNagadCheckout(data: {
    pharmacyId?: string;
    tenantId?: string;
    planId: string;
    billingCycle?: string;
    isUpgrade?: boolean;
    clientIp?: string;
  }) {
    const tenantIdentifier = data.tenantId || data.pharmacyId;
    if (!tenantIdentifier) {
      throw new Error("Pharmacy ID or Tenant ID is required");
    }

    const tenant = await (prisma as any).tenant.findUnique({
      where: { id: tenantIdentifier },
    });

    if (!tenant) throw new Error("Pharmacy record not found");

    const plan = await (prisma as any).subscriptionPlan.findUnique({
      where: { id: data.planId },
    });

    if (!plan) throw new Error("Subscription plan not found");

    const isAnnual = data.billingCycle === "ANNUAL" || data.billingCycle === "YEARLY";
    const basePrice = Number(plan.price);
    const planPrice = isAnnual ? Math.round(basePrice * 12 * 0.85) : basePrice;
    const isTrial = plan.tier === "TRIAL" || !!plan.features?.isTrial;
    const initialLicenseFee = data.isUpgrade || isTrial ? 0 : 5000;
    const totalAmount = isTrial ? 0 : planPrice + initialLicenseFee;

    const host = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
    const orderId = `NGD_${tenant.id.slice(0, 6)}_${Date.now().toString().slice(-6)}`;
    const callbackURL = `${host}/api/payments/nagad/callback?pharmacy_id=${tenant.id}&plan_id=${plan.id}${data.isUpgrade ? "&is_upgrade=true" : ""}&cycle=${data.billingCycle || "MONTHLY"}`;

    const nagadRes = await createNagadPayment({
      amount: totalAmount,
      orderId,
      callbackURL,
      clientIp: data.clientIp,
    });

    if (nagadRes && nagadRes.nagadURL) {
      await (prisma as any).payment.create({
        data: {
          tenantId: tenant.id,
          amount: totalAmount,
          currency: "BDT",
          tranId: nagadRes.paymentReferenceId || orderId,
          status: "PENDING",
          paymentMethod: "NAGAD_DIRECT",
          type: data.isUpgrade ? "UPGRADE" : "INITIAL_REGISTRATION",
        },
      });

      return {
        success: true,
        nagadURL: nagadRes.nagadURL,
        paymentReferenceId: nagadRes.paymentReferenceId,
      };
    }

    throw new Error("Failed to initialize Nagad checkout session");
  }

  static async handleNagadCallback(params: {
    payment_ref_id?: string;
    status?: string;
    pharmacy_id?: string;
    plan_id?: string;
    is_upgrade?: string;
    cycle?: string;
  }) {
    const host = process.env.CLIENT_URL || "http://localhost:3001";
    const { payment_ref_id, status, pharmacy_id, plan_id, is_upgrade, cycle } = params;
    const isUpgrade = is_upgrade === "true";

    if (status === "cancel" || status === "failure") {
      const returnUrl = isUpgrade
        ? `${host}/dashboard?payment=cancelled`
        : `${host}/register?error=Payment+cancelled`;
      return { redirectUrl: returnUrl };
    }

    if (!payment_ref_id) {
      throw new Error("Nagad payment reference is missing");
    }

    const verifyRes = await verifyNagadPayment(payment_ref_id);
    if (!verifyRes.success) {
      throw new Error("Nagad payment verification failed");
    }

    const trxId = verifyRes.trxId || payment_ref_id;
    const amount = verifyRes.amount || 0;
    const durationDays = cycle === "ANNUAL" || cycle === "YEARLY" ? 365 : 30;

    if (isUpgrade && pharmacy_id && plan_id) {
      const now = new Date();
      const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
      const plan = await (prisma as any).subscriptionPlan.findUnique({ where: { id: plan_id } });

      await (prisma as any).subscription.updateMany({
        where: { tenantId: pharmacy_id, status: "ACTIVE" },
        data: { status: "EXPIRED" },
      });

      const newSub = await (prisma as any).subscription.create({
        data: {
          tenantId: pharmacy_id,
          planId: plan_id,
          status: "ACTIVE",
          startDate: now,
          endDate: endDate,
        },
      });

      await (prisma as any).tenant.update({
        where: { id: pharmacy_id },
        data: {
          tier: plan ? plan.tier : "STARTER",
          verificationStatus: "ACTIVE",
          isActive: true,
        },
      });

      await (prisma as any).payment.upsert({
        where: { tranId: payment_ref_id },
        create: {
          tenantId: pharmacy_id,
          subscriptionId: newSub.id,
          amount,
          currency: "BDT",
          tranId: trxId,
          status: "VALIDATED",
          paymentMethod: "NAGAD_DIRECT",
          type: "UPGRADE",
        },
        update: {
          status: "VALIDATED",
          subscriptionId: newSub.id,
          tranId: trxId,
          paymentMethod: "NAGAD_DIRECT",
          rawResponse: verifyRes.raw,
        },
      });

      return {
        redirectUrl: `${host}/payment/success?tran_id=${encodeURIComponent(trxId)}`,
      };
    } else if (pharmacy_id) {
      await (prisma as any).tenant.update({
        where: { id: pharmacy_id },
        data: {
          verificationStatus: "PENDING_APPROVAL",
          paymentMethod: "NAGAD_DIRECT",
          manualPaymentTrxId: trxId,
          manualPaymentAmount: amount,
        },
      });

      await (prisma as any).payment.upsert({
        where: { tranId: payment_ref_id },
        create: {
          tenantId: pharmacy_id,
          amount,
          currency: "BDT",
          tranId: trxId,
          status: "VALIDATED",
          paymentMethod: "NAGAD_DIRECT",
          type: "INITIAL_REGISTRATION",
        },
        update: {
          status: "VALIDATED",
          tranId: trxId,
          paymentMethod: "NAGAD_DIRECT",
          rawResponse: verifyRes.raw,
        },
      });

      return {
        redirectUrl: `${host}/register?success=true&trxId=${encodeURIComponent(trxId)}&tenantId=${pharmacy_id}`,
      };
    }

    return {
      redirectUrl: `${host}/payment/success?tran_id=${encodeURIComponent(trxId)}`,
    };
  }

  /**
   * ================= EPS GATEWAY CHECKOUT =================
   */
  static async initiateEpsCheckout(data: {
    pharmacyId?: string;
    tenantId?: string;
    planId: string;
    billingCycle?: string;
    isUpgrade?: boolean;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
  }) {
    const tenantIdentifier = data.tenantId || data.pharmacyId;
    if (!tenantIdentifier) throw new Error("Pharmacy ID or Tenant ID is required");

    const tenant = await (prisma as any).tenant.findUnique({
      where: { id: tenantIdentifier },
    });
    if (!tenant) throw new Error("Pharmacy record not found");

    const plan = await (prisma as any).subscriptionPlan.findUnique({
      where: { id: data.planId },
    });
    if (!plan) throw new Error("Subscription plan not found");

    const isAnnual = data.billingCycle === "ANNUAL" || data.billingCycle === "YEARLY";
    const basePrice = Number(plan.price);
    const planPrice = isAnnual ? Math.round(basePrice * 12 * 0.85) : basePrice;
    const isTrial = plan.tier === "TRIAL" || !!plan.features?.isTrial;
    const initialLicenseFee = data.isUpgrade || isTrial ? 0 : 5000;
    const totalAmount = isTrial ? 0 : planPrice + initialLicenseFee;

    const host = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
    const invoiceNumber = `EPS-${tenant.id.slice(0, 8)}-${Date.now().toString().slice(-6)}`;
    const callbackURL = `${host}/api/payments/eps/callback?pharmacy_id=${tenant.id}&plan_id=${plan.id}${data.isUpgrade ? "&is_upgrade=true" : ""}&cycle=${data.billingCycle || "MONTHLY"}`;

    const epsRes = await createEpsPayment({
      amount: totalAmount,
      invoiceNumber,
      callbackURL,
      customerName: data.customerName || tenant.name,
      customerEmail: data.customerEmail || tenant.email,
      customerPhone: data.customerPhone || tenant.phone,
    });

    if (epsRes && epsRes.epsURL) {
      await (prisma as any).payment.create({
        data: {
          tenantId: tenant.id,
          amount: totalAmount,
          currency: "BDT",
          tranId: epsRes.paymentID || invoiceNumber,
          status: "PENDING",
          paymentMethod: "EPS",
          type: data.isUpgrade ? "UPGRADE" : "INITIAL_REGISTRATION",
        },
      });

      return {
        success: true,
        epsURL: epsRes.epsURL,
        paymentID: epsRes.paymentID,
      };
    }

    throw new Error("Failed to initialize EPS checkout session");
  }

  static async handleEpsCallback(params: {
    paymentID?: string;
    status?: string;
    pharmacy_id?: string;
    plan_id?: string;
    is_upgrade?: string;
    cycle?: string;
  }) {
    const host = process.env.CLIENT_URL || "http://localhost:3001";
    const { paymentID, status, pharmacy_id, plan_id, is_upgrade, cycle } = params;
    const isUpgrade = is_upgrade === "true";

    if (status === "cancel" || status === "failure") {
      const returnUrl = isUpgrade
        ? `${host}/dashboard?payment=cancelled`
        : `${host}/register?error=Payment+cancelled`;
      return { redirectUrl: returnUrl };
    }

    if (!paymentID) throw new Error("EPS payment ID is missing");

    const verifyRes = await verifyEpsPayment(paymentID);
    if (!verifyRes.success) throw new Error("EPS verification failed");

    const trxId = verifyRes.trxId || paymentID;
    const amount = verifyRes.amount || 0;
    const durationDays = cycle === "ANNUAL" || cycle === "YEARLY" ? 365 : 30;

    if (isUpgrade && pharmacy_id && plan_id) {
      const now = new Date();
      const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
      const plan = await (prisma as any).subscriptionPlan.findUnique({ where: { id: plan_id } });

      await (prisma as any).subscription.updateMany({
        where: { tenantId: pharmacy_id, status: "ACTIVE" },
        data: { status: "EXPIRED" },
      });

      const newSub = await (prisma as any).subscription.create({
        data: {
          tenantId: pharmacy_id,
          planId: plan_id,
          status: "ACTIVE",
          startDate: now,
          endDate: endDate,
        },
      });

      await (prisma as any).tenant.update({
        where: { id: pharmacy_id },
        data: {
          tier: plan ? plan.tier : "STARTER",
          verificationStatus: "ACTIVE",
          isActive: true,
        },
      });

      await (prisma as any).payment.upsert({
        where: { tranId: paymentID },
        create: {
          tenantId: pharmacy_id,
          subscriptionId: newSub.id,
          amount,
          currency: "BDT",
          tranId: trxId,
          status: "VALIDATED",
          paymentMethod: "EPS",
          type: "UPGRADE",
        },
        update: {
          status: "VALIDATED",
          subscriptionId: newSub.id,
          tranId: trxId,
          paymentMethod: "EPS",
          rawResponse: verifyRes.raw,
        },
      });

      return {
        redirectUrl: `${host}/payment/success?tran_id=${encodeURIComponent(trxId)}`,
      };
    } else if (pharmacy_id) {
      await (prisma as any).tenant.update({
        where: { id: pharmacy_id },
        data: {
          verificationStatus: "PENDING_APPROVAL",
          paymentMethod: "EPS",
          manualPaymentTrxId: trxId,
          manualPaymentAmount: amount,
        },
      });

      await (prisma as any).payment.upsert({
        where: { tranId: paymentID },
        create: {
          tenantId: pharmacy_id,
          amount,
          currency: "BDT",
          tranId: trxId,
          status: "VALIDATED",
          paymentMethod: "EPS",
          type: "INITIAL_REGISTRATION",
        },
        update: {
          status: "VALIDATED",
          tranId: trxId,
          paymentMethod: "EPS",
          rawResponse: verifyRes.raw,
        },
      });

      return {
        redirectUrl: `${host}/register?success=true&trxId=${encodeURIComponent(trxId)}&tenantId=${pharmacy_id}`,
      };
    }

    return {
      redirectUrl: `${host}/payment/success?tran_id=${encodeURIComponent(trxId)}`,
    };
  }
}
