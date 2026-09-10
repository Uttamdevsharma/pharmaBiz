"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const cloudinary_1 = require("../../app/lib/cloudinary");
class UploadService {
    /**
     * Upload image or document to Cloudinary
     */
    static async uploadImage(fileData, folder = "pharmacy_saas/general", oldPublicId) {
        // If an old asset exists, attempt cleanup
        if (oldPublicId) {
            if (oldPublicId.startsWith("local_")) {
                try {
                    const filename = oldPublicId.replace("local_", "");
                    const filePath = path_1.default.join(process.cwd(), "public", "uploads", filename);
                    if (fs_1.default.existsSync(filePath))
                        fs_1.default.unlinkSync(filePath);
                }
                catch (e) {
                    // ignore cleanup errors
                }
            }
            else if (!oldPublicId.startsWith("external_")) {
                try {
                    await cloudinary_1.CloudinaryService.deleteImage(oldPublicId);
                }
                catch (err) {
                    console.warn(`[Upload Service] Failed to remove previous Cloudinary asset (${oldPublicId}):`, err);
                }
            }
        }
        // Direct upload via Cloudinary SDK
        try {
            const result = await cloudinary_1.CloudinaryService.uploadImage(fileData, folder);
            return result;
        }
        catch (cloudinaryErr) {
            console.error("[Upload Service] Cloudinary upload failed:", cloudinaryErr.message);
            throw new Error(`Cloudinary upload failed: ${cloudinaryErr.message || "Unable to upload asset."}`);
        }
    }
    /**
     * Delete asset from Cloudinary or clean legacy local storage
     */
    static async deleteImage(publicId) {
        if (publicId.startsWith("local_")) {
            try {
                const filename = publicId.replace("local_", "");
                const filePath = path_1.default.join(process.cwd(), "public", "uploads", filename);
                if (fs_1.default.existsSync(filePath))
                    fs_1.default.unlinkSync(filePath);
                return { success: true, result: "deleted" };
            }
            catch (e) {
                return { success: false, result: "error" };
            }
        }
        return await cloudinary_1.CloudinaryService.deleteImage(publicId);
    }
}
exports.UploadService = UploadService;
