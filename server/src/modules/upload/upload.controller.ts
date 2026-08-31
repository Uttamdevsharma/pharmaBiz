import { Request, Response } from "express";
import { UploadService } from "./upload.service";

export class UploadController {
  /**
   * POST /api/upload/image
   */
  static async uploadImage(req: Request, res: Response): Promise<void> {
    try {
      const fileData = (req as any).file?.buffer || req.body.image || req.body.file;
      const folder = req.body.folder || "pharmacy_saas/general";
      const oldPublicId = req.body.oldPublicId;

      if (!fileData) {
        res.status(400).json({
          success: false,
          message: "No image file provided. Send base64 data URI or multipart file.",
        });
        return;
      }

      const result = await UploadService.uploadImage(fileData, folder, oldPublicId);

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
    } catch (error: any) {
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
  static async deleteImage(req: Request, res: Response): Promise<void> {
    try {
      const publicId = req.body.publicId || (req.query.publicId as string);

      if (!publicId) {
        res.status(400).json({
          success: false,
          message: "publicId is required to delete Cloudinary asset",
        });
        return;
      }

      const result = await UploadService.deleteImage(publicId);

      res.status(200).json({
        success: true,
        message: "Cloudinary asset deleted successfully",
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to delete Cloudinary image",
      });
    }
  }
}
