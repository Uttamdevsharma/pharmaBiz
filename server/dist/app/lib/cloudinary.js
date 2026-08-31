"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudinaryService = void 0;
const cloudinary_1 = require("cloudinary");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
class CloudinaryService {
    static isConfigured = false;
    static configure() {
        let cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
        let apiKey = process.env.CLOUDINARY_API_KEY?.trim();
        let apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
        if (!cloudName || !apiKey || !apiSecret) {
            // Attempt explicit dotenv reloading from root or server directory
            dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), ".env") });
            cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
            apiKey = process.env.CLOUDINARY_API_KEY?.trim();
            apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
        }
        if (!cloudName || !apiKey || !apiSecret) {
            throw new Error("Cloudinary credentials missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.");
        }
        cloudinary_1.v2.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
            secure: true,
        });
        this.isConfigured = true;
        return { cloudName, apiKey, apiSecret };
    }
    /**
     * Uploads an image (base64 data URI, remote URL, or buffer) to Cloudinary using the official SDK
     */
    static async uploadImage(file, folder = "pharmacy_saas/general") {
        this.configure();
        let filePayload;
        if (Buffer.isBuffer(file)) {
            filePayload = `data:image/png;base64,${file.toString("base64")}`;
        }
        else {
            filePayload = file;
        }
        try {
            const result = await cloudinary_1.v2.uploader.upload(filePayload, {
                folder,
                resource_type: "image",
            });
            return {
                url: result.url,
                secureUrl: result.secure_url,
                publicId: result.public_id,
                format: result.format,
                width: result.width,
                height: result.height,
                bytes: result.bytes,
            };
        }
        catch (error) {
            console.error("[Cloudinary Upload Error]", error);
            throw new Error(error.message || "Failed to upload image to Cloudinary. Verify Cloudinary API Key permissions.");
        }
    }
    /**
     * Deletes an asset from Cloudinary using its public_id
     */
    static async deleteImage(publicId) {
        if (!publicId)
            return { success: true, result: "not_found" };
        this.configure();
        try {
            const result = await cloudinary_1.v2.uploader.destroy(publicId, {
                resource_type: "image",
            });
            return {
                success: result.result === "ok",
                result: result.result,
            };
        }
        catch (error) {
            console.warn(`[Cloudinary Warning] Could not delete image with publicId "${publicId}":`, error);
            return { success: false, result: error?.message || "delete_failed" };
        }
    }
}
exports.CloudinaryService = CloudinaryService;
