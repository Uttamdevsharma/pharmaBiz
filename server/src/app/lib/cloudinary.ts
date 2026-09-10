import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import dotenv from "dotenv";
import path from "path";

export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
}

export class CloudinaryService {
  private static isConfigured = false;

  private static configure() {
    let cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    let apiKey = process.env.CLOUDINARY_API_KEY?.trim();
    let apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

    if (!cloudName || !apiKey || !apiSecret) {
      // Attemp explicitly have point
      dotenv.config({ path: path.resolve(process.cwd(), ".env") });
      cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
      apiKey = process.env.CLOUDINARY_API_KEY?.trim();
      apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
    }

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        "Cloudinary credentials missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env."
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    this.isConfigured = true;
    return { cloudName, apiKey, apiSecret };
  }

  /**
   * Uploads an image or document (PDF, PNG, JPG, WEBP, base64 data URI, remote URL, or buffer) to Cloudinary
   */
  static async uploadImage(
    file: string | Buffer,
    folder: string = "pharmacy_saas/general"
  ): Promise<CloudinaryUploadResult> {
    this.configure();

    let filePayload: string;
    if (Buffer.isBuffer(file)) {
      // Check if buffer is PDF by checking magic bytes %PDF (0x25 0x50 0x44 0x46)
      const isPdf =
        file.length >= 4 &&
        file[0] === 0x25 &&
        file[1] === 0x50 &&
        file[2] === 0x44 &&
        file[3] === 0x46;

      if (isPdf) {
        filePayload = `data:application/pdf;base64,${file.toString("base64")}`;
      } else {
        filePayload = `data:image/png;base64,${file.toString("base64")}`;
      }
    } else if (typeof file === "string") {
      const trimmed = file.trim();
      if (trimmed.startsWith("data:") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        filePayload = trimmed;
      } else if (trimmed.startsWith("JVBERi0")) {
        // PDF base64 without prefix (%PDF)
        filePayload = `data:application/pdf;base64,${trimmed}`;
      } else if (trimmed.startsWith("/9j/")) {
        // JPEG base64 without prefix
        filePayload = `data:image/jpeg;base64,${trimmed}`;
      } else if (trimmed.startsWith("iVBORw0KGgo")) {
        // PNG base64 without prefix
        filePayload = `data:image/png;base64,${trimmed}`;
      } else if (trimmed.length > 50 && !trimmed.includes(" ") && !trimmed.includes("\n")) {
        // Default base64 fallback
        filePayload = `data:image/png;base64,${trimmed}`;
      } else {
        filePayload = trimmed;
      }
    } else {
      throw new Error("Invalid file payload provided to Cloudinary uploader");
    }

    try {
      const result: UploadApiResponse = await cloudinary.uploader.upload(filePayload, {
        folder,
        resource_type: "auto",
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
    } catch (error: any) {
      console.error("[Cloudinary Upload Error]", error);
      throw new Error(
        error.message || "Failed to upload asset to Cloudinary. Please verify Cloudinary API permissions."
      );
    }
  }

  /**
   * Deletes an asset from Cloudinary using its public_id
   */
  static async deleteImage(publicId: string): Promise<{ success: boolean; result: string }> {
    if (!publicId) return { success: true, result: "not_found" };
    this.configure();

    try {
      let result = await cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
      });

      if (result.result !== "ok") {
        result = await cloudinary.uploader.destroy(publicId, {
          resource_type: "raw",
        });
      }

      return {
        success: result.result === "ok",
        result: result.result,
      };
    } catch (error: any) {
      console.warn(`[Cloudinary Warning] Could not delete asset with publicId "${publicId}":`, error);
      return { success: false, result: error?.message || "delete_failed" };
    }
  }
}
