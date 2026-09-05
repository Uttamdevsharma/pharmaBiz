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
     * Upload image to Cloudinary, with automatic fallback to local storage if Cloudinary is unavailable or forbidden
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
            else {
                try {
                    await cloudinary_1.CloudinaryService.deleteImage(oldPublicId);
                }
                catch (err) {
                    console.warn(`[Upload Service] Failed to remove previous Cloudinary image (${oldPublicId}):`, err);
                }
            }
        }
        // Attempt 1: Upload via Cloudinary
        try {
            const result = await cloudinary_1.CloudinaryService.uploadImage(fileData, folder);
            return result;
        }
        catch (cloudinaryErr) {
            console.warn(`[Upload Service] Cloudinary upload encountered error: "${cloudinaryErr.message}". Using local server storage as fallback.`);
            // Attempt 2: Local storage fallback so product creation never fails
            try {
                const uploadDir = path_1.default.join(process.cwd(), "public", "uploads");
                if (!fs_1.default.existsSync(uploadDir)) {
                    fs_1.default.mkdirSync(uploadDir, { recursive: true });
                }
                const timestamp = Date.now();
                const randomStr = Math.random().toString(36).substring(2, 9);
                let ext = "png";
                let buffer;
                if (Buffer.isBuffer(fileData)) {
                    buffer = fileData;
                }
                else if (typeof fileData === "string" && fileData.includes(";base64,")) {
                    if (fileData.includes("application/pdf"))
                        ext = "pdf";
                    else if (fileData.includes("image/jpeg") || fileData.includes("image/jpg"))
                        ext = "jpg";
                    else if (fileData.includes("image/webp"))
                        ext = "webp";
                    const base64Data = fileData.split(";base64,").pop() || "";
                    buffer = Buffer.from(base64Data, "base64");
                }
                else if (typeof fileData === "string" && (fileData.startsWith("http://") || fileData.startsWith("https://"))) {
                    return {
                        url: fileData,
                        secureUrl: fileData,
                        publicId: `external_${timestamp}`,
                    };
                }
                else if (typeof fileData === "string") {
                    buffer = Buffer.from(fileData, "base64");
                }
                else {
                    throw cloudinaryErr;
                }
                const filename = `doc_${timestamp}_${randomStr}.${ext}`;
                const filePath = path_1.default.join(uploadDir, filename);
                fs_1.default.writeFileSync(filePath, buffer);
                const serverPort = process.env.PORT || 3000;
                const host = process.env.SERVER_URL || `http://localhost:${serverPort}`;
                const fileUrl = `${host}/uploads/${filename}`;
                return {
                    url: fileUrl,
                    secureUrl: fileUrl,
                    publicId: `local_${filename}`,
                    format: ext,
                    bytes: buffer.length,
                };
            }
            catch (localErr) {
                console.error("[Upload Service] Local fallback also failed:", localErr);
                throw new Error(cloudinaryErr.message || "Failed to process and store image upload.");
            }
        }
    }
    /**
     * Delete asset from Cloudinary or local storage
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
