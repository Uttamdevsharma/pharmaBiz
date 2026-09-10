import fs from "fs";
import path from "path";
import { CloudinaryService, CloudinaryUploadResult } from "../../app/lib/cloudinary";

export class UploadService {
  /**
   * Upload image or document to Cloudinary
   */
  static async uploadImage(
    fileData: string | Buffer,
    folder: string = "pharmacy_saas/general",
    oldPublicId?: string
  ): Promise<CloudinaryUploadResult> {
    // If an old asset exists, attempt cleanup
    if (oldPublicId) {
      if (oldPublicId.startsWith("local_")) {
        try {
          const filename = oldPublicId.replace("local_", "");
          const filePath = path.join(process.cwd(), "public", "uploads", filename);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (e) {
          // ignore cleanup errors
        }
      } else if (!oldPublicId.startsWith("external_")) {
        try {
          await CloudinaryService.deleteImage(oldPublicId);
        } catch (err) {
          console.warn(`[Upload Service] Failed to remove previous Cloudinary asset (${oldPublicId}):`, err);
        }
      }
    }

    // Direct upload via Cloudinary SDK
    try {
      const result = await CloudinaryService.uploadImage(fileData, folder);
      return result;
    } catch (cloudinaryErr: any) {
      console.error("[Upload Service] Cloudinary upload failed:", cloudinaryErr.message);
      throw new Error(`Cloudinary upload failed: ${cloudinaryErr.message || "Unable to upload asset."}`);
    }
  }

  /**
   * Delete asset from Cloudinary or clean legacy local storage
   */
  static async deleteImage(publicId: string): Promise<{ success: boolean; result: string }> {
    if (publicId.startsWith("local_")) {
      try {
        const filename = publicId.replace("local_", "");
        const filePath = path.join(process.cwd(), "public", "uploads", filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return { success: true, result: "deleted" };
      } catch (e) {
        return { success: false, result: "error" };
      }
    }
    return await CloudinaryService.deleteImage(publicId);
  }
}
