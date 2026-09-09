import { z } from "zod";

export const CreateRackSchema = z.object({
  name: z.string().min(1, "Rack name is required"),
  branchId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const UpdateRackSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").optional(),
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
  name: z.string().min(1, "Rack name/code is required").max(50, "Rack name is too long"),
  branchId: z.string().optional(),
  numberOfShelves: z.coerce.number().int().min(1, "At least 1 shelf is required").max(50, "Maximum 50 shelves allowed"),
  binsPerShelf: z.coerce.number().int().min(1, "At least 1 bin per shelf is required").max(50, "Maximum 50 bins per shelf allowed"),
  isActive: z.boolean().optional(),
});

export type CreateRackInput = z.infer<typeof CreateRackSchema>;
export type QuickCreateRackInput = z.infer<typeof QuickCreateRackSchema>;
export type UpdateRackInput = z.infer<typeof UpdateRackSchema>;
export type CreateShelfInput = z.infer<typeof CreateShelfSchema>;
export type UpdateShelfInput = z.infer<typeof UpdateShelfSchema>;
export type CreateBinInput = z.infer<typeof CreateBinSchema>;
export type UpdateBinInput = z.infer<typeof UpdateBinSchema>;
