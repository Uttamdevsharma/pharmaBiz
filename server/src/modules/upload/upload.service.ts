import fs from "fs";
import path from "path";
import { CloudinaryService, CloudinaryUploadResult } from "../../app/lib/cloudinary";

export class UploadService {
  /**
   * Upload image to Cloudinary, with automatic fallback to local storage if Cloudinary is unavailable or forbidden
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
      } else {
        try {
          await CloudinaryService.deleteImage(oldPublicId);
        } catch (err) {
          console.warn(`[Upload Service] Failed to remove previous Cloudinary image (${oldPublicId}):`, err);
        }
      }
    }

    // Attempt 1: Upload via Cloudinary
    try {
      const result = await CloudinaryService.uploadImage(fileData, folder);
      return result;
    } catch (cloudinaryErr: any) {
      console.warn(
        `[Upload Service] Cloudinary upload encountered error: "${cloudinaryErr.message}". Using local server storage as fallback.`
      );

      // Attempt 2: Local storage fallback so product creation never fails
      try {
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 9);
        let ext = "png";

        let buffer: Buffer;
        if (Buffer.isBuffer(fileData)) {
          buffer = fileData;
        } else if (typeof fileData === "string" && fileData.includes(";base64,")) {
          if (fileData.includes("application/pdf")) ext = "pdf";
          else if (fileData.includes("image/jpeg") || fileData.includes("image/jpg")) ext = "jpg";
          else if (fileData.includes("image/webp")) ext = "webp";
          const base64Data = fileData.split(";base64,").pop() || "";
          buffer = Buffer.from(base64Data, "base64");
        } else if (typeof fileData === "string" && (fileData.startsWith("http://") || fileData.startsWith("https://"))) {
          return {
            url: fileData,
            secureUrl: fileData,
            publicId: `external_${timestamp}`,
          };
        } else if (typeof fileData === "string") {
          buffer = Buffer.from(fileData, "base64");
        } else {
          throw cloudinaryErr;
        }

        const filename = `doc_${timestamp}_${randomStr}.${ext}`;
        const filePath = path.join(uploadDir, filename);

        fs.writeFileSync(filePath, buffer);

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
      } catch (localErr: any) {
        console.error("[Upload Service] Local fallback also failed:", localErr);
        throw new Error(cloudinaryErr.message || "Failed to process and store image upload.");
      }
    }
  }

  /**
   * Delete asset from Cloudinary or local storage
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
