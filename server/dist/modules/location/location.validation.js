"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuickCreateRackSchema = exports.UpdateBinSchema = exports.CreateBinSchema = exports.UpdateShelfSchema = exports.CreateShelfSchema = exports.UpdateRackSchema = exports.CreateRackSchema = void 0;
const zod_1 = require("zod");
exports.CreateRackSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Rack name is required"),
    branchId: zod_1.z.string().optional(),
    type: zod_1.z.string().optional().default("RACK"),
    isActive: zod_1.z.boolean().optional(),
});
exports.UpdateRackSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name cannot be empty").optional(),
    type: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.CreateShelfSchema = zod_1.z.object({
    rackId: zod_1.z.string().min(1, "Rack ID is required"),
    name: zod_1.z.string().min(1, "Shelf name is required"),
    isActive: zod_1.z.boolean().optional(),
});
exports.UpdateShelfSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name cannot be empty").optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.CreateBinSchema = zod_1.z.object({
    shelfId: zod_1.z.string().min(1, "Shelf ID is required"),
    name: zod_1.z.string().min(1, "Bin name is required"),
    isActive: zod_1.z.boolean().optional(),
});
exports.UpdateBinSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name cannot be empty").optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.QuickCreateRackSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Storage unit name/code is required").max(60, "Name is too long"),
    branchId: zod_1.z.string().optional(),
    type: zod_1.z.string().optional().default("RACK"),
    shelfPrefix: zod_1.z.string().max(30).optional().default("Shelf"),
    numberOfShelves: zod_1.z.coerce.number().int().min(0, "Shelves cannot be negative").max(50, "Maximum 50 shelves allowed").default(0),
    binPrefix: zod_1.z.string().max(30).optional().default("Bin"),
    binsPerShelf: zod_1.z.coerce.number().int().min(0, "Bins cannot be negative").max(50, "Maximum 50 bins per shelf allowed").default(0),
    isActive: zod_1.z.boolean().optional(),
});
