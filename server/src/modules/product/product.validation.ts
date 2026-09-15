import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters"),
  parentId: z.string().optional().nullable(),
  productType: z.enum(["MEDICINE", "SYRUP", "EQUIPMENT", "SALINE", "OTHER"]).optional().nullable(),
  defaultUnit: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  subcategories: z.array(z.string().min(1)).optional(),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const createBrandSchema = z.object({
  name: z.string().min(2, "Brand name must be at least 2 characters"),
  description: z.string().optional().nullable(),
});

export const updateBrandSchema = createBrandSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const createUnitSchema = z.object({
  name: z.string().min(1, "Unit name is required"),
  symbol: z.string().min(1, "Unit symbol is required"),
  productType: z.enum(["MEDICINE", "SYRUP", "EQUIPMENT", "SALINE", "OTHER"]).optional().nullable(),
});

export const updateUnitSchema = createUnitSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const createProductSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  genericName: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  basePrice: z.number().min(0, "Base price cannot be negative").optional().default(0),
  category: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  subcategory: z.string().optional().nullable(),
  subcategoryId: z.string().optional().nullable(),
  brandId: z.string().optional().nullable(),
  unitId: z.string().optional().nullable(),
  productType: z.enum(["MEDICINE", "SYRUP", "EQUIPMENT", "SALINE", "OTHER"]).optional().nullable(),
  brandName: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  unit: z.string().default("piece"),
  size: z.string().optional().nullable(),
  defaultPackType: z.string().default("BOX"),
  qtyPerLevel2: z.number().int().positive().optional().nullable(),
  qtyPerLevel3: z.number().int().positive().optional().nullable(),
  qtyPerLevel4: z.number().int().positive().optional().nullable(),
  stripsPerBox: z.number().int().positive().optional().nullable(),
  tabletsPerStrip: z.number().int().positive().optional().nullable(),

  minStockAlert: z.number().int().nonnegative().optional().default(10),
  description: z.string().optional().nullable(),
  isControlled: z.boolean().optional().default(false),
  requiresPrescription: z.boolean().default(false),
});

export const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const bulkProductSchema = z.object({
  products: z.array(createProductSchema).min(1, "Must provide at least one product"),
});

export const updatePricingSchema = z.object({
  basePrice: z.number().positive("Base price must be greater than 0"),
});

export const branchPriceOverrideSchema = z.object({
  branchId: z.string().min(1, "Branch ID is required"),
  price: z.number().positive("Branch price must be greater than 0"),
});

export const listProductsQuerySchema = z.object({
  page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 20)),
  search: z.string().optional(),
  category: z.string().optional(),
  categoryId: z.string().optional(),
  subcategory: z.string().optional(),
  subcategoryId: z.string().optional(),
  brandId: z.string().optional(),
  productType: z.enum(["MEDICINE", "SYRUP", "EQUIPMENT", "SALINE", "OTHER"]).optional(),
  isControlled: z.string().optional().transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
  requiresPrescription: z.string().optional().transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
  isActive: z.string().optional().transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
  branchId: z.string().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type BulkProductInput = z.infer<typeof bulkProductSchema>;
export type UpdatePricingInput = z.infer<typeof updatePricingSchema>;
export type BranchPriceOverrideInput = z.infer<typeof branchPriceOverrideSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
