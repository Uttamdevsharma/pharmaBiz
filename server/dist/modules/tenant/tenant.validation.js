"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTenantProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateTenantProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Company name must be at least 2 characters").optional(),
    email: zod_1.z.string().email("Invalid email format").optional(),
    phone: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
});
