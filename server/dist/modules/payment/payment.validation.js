"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sslcommerzCallbackSchema = exports.initiatePaymentSchema = void 0;
const zod_1 = require("zod");
exports.initiatePaymentSchema = zod_1.z.object({
    subscriptionId: zod_1.z.string().uuid("Invalid subscription ID format"),
    customerName: zod_1.z.string().min(1).optional(),
    customerEmail: zod_1.z.string().email().optional(),
    customerPhone: zod_1.z.string().optional(),
    customerAddress: zod_1.z.string().optional(),
    customerCity: zod_1.z.string().optional(),
});
exports.sslcommerzCallbackSchema = zod_1.z.object({
    tran_id: zod_1.z.string(),
    val_id: zod_1.z.string().optional(),
    amount: zod_1.z.string().optional(),
    card_type: zod_1.z.string().optional(),
    store_amount: zod_1.z.string().optional(),
    bank_tran_id: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
    tran_date: zod_1.z.string().optional(),
    currency: zod_1.z.string().optional(),
    card_issuer: zod_1.z.string().optional(),
    card_brand: zod_1.z.string().optional(),
    card_sub_brand: zod_1.z.string().optional(),
    card_issuer_country: zod_1.z.string().optional(),
    error: zod_1.z.string().optional(),
    value_a: zod_1.z.string().optional(), // tenantId
    value_b: zod_1.z.string().optional(), // subscriptionId
    value_c: zod_1.z.string().optional(), // action
});
