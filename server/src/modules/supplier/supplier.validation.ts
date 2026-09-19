import { z } from "zod";

export const contactPersonInputSchema = z.object({
  name: z.string().min(2, "Contact person name is required"),
  phone: z.string().min(5, "Contact phone number is required"),
  email: z.string().email("Invalid email format").optional().nullable(),
  designation: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const createSupplierSchema = z.object({
  name: z.string().min(2, "Company / Supplier name is required"),
  phone: z.string().min(5, "Contact phone number is required").optional().nullable(),
  email: z.string().email("Invalid email format").optional().nullable(),
  address: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  contacts: z.array(contactPersonInputSchema).optional().default([]),
});

export const updateSupplierSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const listSuppliersQuerySchema = z.object({
  search: z.string().optional(),
  branchId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(50),
});

export const createContactSchema = contactPersonInputSchema;
export const updateContactSchema = contactPersonInputSchema.partial();

export const purchaseItemInputSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  batchNumber: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  mfgDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  packageType: z.string().optional().nullable().default("Medicine"),
  receivingUnit: z.enum(["CARTON", "BOX", "STRIP", "PIECE"]).optional().default("BOX"),
  cartonQuantity: z.number().int().nonnegative().optional().nullable(),
  boxQuantity: z.number().int().nonnegative().optional().nullable(),
  stripsPerBox: z.number().int().nonnegative().optional().nullable(),
  tabletsPerStrip: z.number().int().nonnegative().optional().nullable(),
  quantity: z.number().int().positive("Quantity must be at least 1"),
  unitPurchasePrice: z.number().nonnegative("Purchase price must be positive"),
  unitSellingPrice: z.number().nonnegative("Selling price must be positive"),
  unitCostBeforeDiscount: z.number().nonnegative().optional().nullable(),
  discountPercent: z.number().nonnegative().optional().default(0),
  profitMarginPercent: z.number().optional().nullable(),
  lineTotal: z.number().nonnegative().optional().nullable(),
  shelfLocation: z.string().optional().nullable(),
});

export const createPurchaseSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  supplierId: z.string().optional().nullable(),
  contactPersonId: z.string().optional().nullable(),
  contactPersonName: z.string().optional().nullable(),
  invoiceNo: z.string().optional().nullable(),
  purchaseDate: z.string().optional(),
  items: z.array(purchaseItemInputSchema).min(1, "At least one item is required in purchase"),
  discountType: z.enum(["NONE", "FIXED", "PERCENT"]).optional().default("NONE"),
  discountAmount: z.number().nonnegative().optional().default(0),
  taxAmount: z.number().nonnegative().optional().default(0),
  subtotal: z.number().nonnegative().optional().nullable(),
  totalAmount: z.number().nonnegative().optional().nullable(),
  paidAmount: z.number().nonnegative().default(0),
  paymentMethod: z.string().default("CASH"),
  financialAccountId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const listPurchasesQuerySchema = z.object({
  branchId: z.string().optional(),
  supplierId: z.string().optional(),
  contactPersonId: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  paymentStatus: z.enum(["PAID", "PARTIAL", "DUE"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(50),
});

export const recordSupplierPaymentSchema = z.object({
  amount: z.number().positive("Payment amount must be greater than 0"),
  branchId: z.string().optional().nullable(),
  purchaseId: z.string().optional().nullable(),
  financialAccountId: z.string().min(1, "Financial account is required"),
  paymentMethod: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  paymentDate: z.string().optional().nullable(),
});

export const listSupplierPaymentsQuerySchema = z.object({
  branchId: z.string().optional(),
  supplierId: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(50),
});

export const supplierDueSummaryQuerySchema = z.object({
  branchId: z.string().optional(),
  supplierId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type ContactPersonInput = z.infer<typeof contactPersonInputSchema>;
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type ListSuppliersQuery = z.infer<typeof listSuppliersQuerySchema>;
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type ListPurchasesQuery = z.infer<typeof listPurchasesQuerySchema>;
export type RecordSupplierPaymentInput = z.infer<typeof recordSupplierPaymentSchema>;
export type ListSupplierPaymentsQuery = z.infer<typeof listSupplierPaymentsQuerySchema>;
export type SupplierDueSummaryQuery = z.infer<typeof supplierDueSummaryQuerySchema>;
