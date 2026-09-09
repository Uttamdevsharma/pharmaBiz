"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProductsQuerySchema = exports.branchPriceOverrideSchema = exports.updatePricingSchema = exports.bulkProductSchema = exports.updateProductSchema = exports.createProductSchema = exports.updateUnitSchema = exports.createUnitSchema = exports.updateBrandSchema = exports.createBrandSchema = exports.updateCategorySchema = exports.createCategorySchema = void 0;
const zod_1 = require("zod");
exports.createCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Category name must be at least 2 characters"),
    parentId: zod_1.z.string().optional().nullable(),
    productType: zod_1.z.enum(["MEDICINE", "SYRUP", "EQUIPMENT", "SALINE", "OTHER"]).optional().nullable(),
    defaultUnit: zod_1.z.string().optional().nullable(),
    description: zod_1.z.string().optional().nullable(),
    isActive: zod_1.z.boolean().optional().default(true),
    subcategories: zod_1.z.array(zod_1.z.string().min(1)).optional(),
});
exports.updateCategorySchema = exports.createCategorySchema.partial().extend({
    isActive: zod_1.z.boolean().optional(),
});
exports.createBrandSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Brand name must be at least 2 characters"),
    description: zod_1.z.string().optional().nullable(),
});
exports.updateBrandSchema = exports.createBrandSchema.partial().extend({
    isActive: zod_1.z.boolean().optional(),
});
exports.createUnitSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Unit name is required"),
    symbol: zod_1.z.string().min(1, "Unit symbol is required"),
    productType: zod_1.z.enum(["MEDICINE", "SYRUP", "EQUIPMENT", "SALINE", "OTHER"]).optional().nullable(),
});
exports.updateUnitSchema = exports.createUnitSchema.partial().extend({
    isActive: zod_1.z.boolean().optional(),
});
exports.createProductSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Product name must be at least 2 characters"),
    genericName: zod_1.z.string().optional().nullable(),
    sku: zod_1.z.string().optional().nullable(),
    barcode: zod_1.z.string().optional().nullable(),
    basePrice: zod_1.z.number().positive("Base price must be greater than 0"),
    category: zod_1.z.string().optional().nullable(),
    categoryId: zod_1.z.string().optional().nullable(),
    subcategory: zod_1.z.string().optional().nullable(),
    subcategoryId: zod_1.z.string().optional().nullable(),
    brandId: zod_1.z.string().optional().nullable(),
    unitId: zod_1.z.string().optional().nullable(),
    productType: zod_1.z.enum(["MEDICINE", "SYRUP", "EQUIPMENT", "SALINE", "OTHER"]).optional().nullable(),
    brandName: zod_1.z.string().optional().nullable(),
    manufacturer: zod_1.z.string().optional().nullable(),
    unit: zod_1.z.string().default("piece"),
    size: zod_1.z.string().optional().nullable(),
    defaultPackType: zod_1.z.string().default("BOX"),
    stripsPerBox: zod_1.z.number().int().positive().optional().nullable(),
    tabletsPerStrip: zod_1.z.number().int().positive().optional().nullable(),
    minStockAlert: zod_1.z.number().int().nonnegative().optional().default(10),
    description: zod_1.z.string().optional().nullable(),
    isControlled: zod_1.z.boolean().optional().default(false),
    requiresPrescription: zod_1.z.boolean().default(false),
});
exports.updateProductSchema = exports.createProductSchema.partial().extend({
    isActive: zod_1.z.boolean().optional(),
});
exports.bulkProductSchema = zod_1.z.object({
    products: zod_1.z.array(exports.createProductSchema).min(1, "Must provide at least one product"),
});
exports.updatePricingSchema = zod_1.z.object({
    basePrice: zod_1.z.number().positive("Base price must be greater than 0"),
});
exports.branchPriceOverrideSchema = zod_1.z.object({
    branchId: zod_1.z.string().min(1, "Branch ID is required"),
    price: zod_1.z.number().positive("Branch price must be greater than 0"),
});
exports.listProductsQuerySchema = zod_1.z.object({
    page: zod_1.z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
    limit: zod_1.z.string().optional().transform((v) => (v ? parseInt(v, 10) : 20)),
    search: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    categoryId: zod_1.z.string().optional(),
    subcategory: zod_1.z.string().optional(),
    subcategoryId: zod_1.z.string().optional(),
    brandId: zod_1.z.string().optional(),
    productType: zod_1.z.enum(["MEDICINE", "SYRUP", "EQUIPMENT", "SALINE", "OTHER"]).optional(),
    isControlled: zod_1.z.string().optional().transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
    requiresPrescription: zod_1.z.string().optional().transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
    isActive: zod_1.z.string().optional().transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
    branchId: zod_1.z.string().optional(),
});
