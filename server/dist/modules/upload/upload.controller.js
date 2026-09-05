"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadController = void 0;
const upload_service_1 = require("./upload.service");
class UploadController {
    /**
     * POST /api/upload/image
     */
    static async uploadImage(req, res) {
        try {
            const fileData = req.file?.buffer || req.body.image || req.body.file;
            const folder = req.body.folder || "pharmacy_saas/general";
            const oldPublicId = req.body.oldPublicId;
            // if (!fileData) {
            //   res.status(400).json({
            //     success: false,
            //     message: "No image file provided. Send base64 data URI or multipart file.",
            //   });
            //   return;
            // }
            if (!fileData) {
                res.status(400).json({
                    success: false,
                    message: "No image file provided. Send base64 data URI or multipart file."
                });
                return;
            }
            const result = await upload_service_1.UploadService.uploadImage(fileData, folder, oldPublicId);
            res.status(200).json({
                success: true,
                message: "Image uploaded successfully to Cloudinary",
                data: {
                    url: result.secureUrl,
                    publicId: result.publicId,
                    format: result.format,
                    bytes: result.bytes,
                },
            });
        }
        catch (error) {
            console.error("[Upload Error]", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to upload image to Cloudinary",
            });
        }
    }
    /**
     * DELETE /api/upload/image
     */
    static async deleteImage(req, res) {
        try {
            const publicId = req.body.publicId || req.query.publicId;
            if (!publicId) {
                res.status(400).json({
                    success: false,
                    message: "publicId is required to delete Cloudinary asset",
                });
                return;
            }
            const result = await upload_service_1.UploadService.deleteImage(publicId);
            res.status(200).json({
                success: true,
                message: "Cloudinary asset deleted successfully",
                data: result,
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: error.message || "Failed to delete Cloudinary image",
            });
        }
    }
}
exports.UploadController = UploadController;
