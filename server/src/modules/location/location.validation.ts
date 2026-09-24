import { z } from "zod";

export const CreateRackSchema = z.object({
  name: z.string().min(1, "Rack name is required"),
  branchId: z.string().optional(),
  type: z.string().optional().default("RACK"),
  isActive: z.boolean().optional(),
});

export const UpdateRackSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").optional(),
  type: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const CreateShelfSchema = z.object({
  rackId: z.string().min(1, "Rack ID is required"),
  name: z.string().min(1, "Shelf name is required"),
  isActive: z.boolean().optional(),
});

export const UpdateShelfSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").optional(),
  isActive: z.boolean().optional(),
});

export const CreateBinSchema = z.object({
  shelfId: z.string().min(1, "Shelf ID is required"),
  name: z.string().min(1, "Bin name is required"),
  isActive: z.boolean().optional(),
});

export const UpdateBinSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").optional(),
  isActive: z.boolean().optional(),
});

export const QuickCreateRackSchema = z.object({
  name: z.string().min(1, "Storage unit name/code is required").max(60, "Name is too long"),
  branchId: z.string().optional(),
  type: z.string().optional().default("RACK"),
  shelfPrefix: z.string().max(30).optional().default("Shelf"),
  numberOfShelves: z.coerce.number().int().min(0, "Shelves cannot be negative").max(50, "Maximum 50 shelves allowed").default(0),
  binPrefix: z.string().max(30).optional().default("Bin"),
  binsPerShelf: z.coerce.number().int().min(0, "Bins cannot be negative").max(50, "Maximum 50 bins per shelf allowed").default(0),
  isActive: z.boolean().optional(),
});

export type CreateRackInput = z.infer<typeof CreateRackSchema>;
export type QuickCreateRackInput = z.infer<typeof QuickCreateRackSchema>;
export type UpdateRackInput = z.infer<typeof UpdateRackSchema>;
export type CreateShelfInput = z.infer<typeof CreateShelfSchema>;
export type UpdateShelfInput = z.infer<typeof UpdateShelfSchema>;
export type CreateBinInput = z.infer<typeof CreateBinSchema>;
export type UpdateBinInput = z.infer<typeof UpdateBinSchema>;
