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
      // Attempt explicit dotenv reloading from root or server directory
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
   * Uploads an image (base64 data URI, remote URL, or buffer) to Cloudinary using the official SDK
   */
  static async uploadImage(
    file: string | Buffer,
    folder: string = "pharmacy_saas/general"
  ): Promise<CloudinaryUploadResult> {
    this.configure();

    let filePayload: string;
    if (Buffer.isBuffer(file)) {
      filePayload = `data:image/png;base64,${file.toString("base64")}`;
    } else {
      filePayload = file;
    }

    try {
      const result: UploadApiResponse = await cloudinary.uploader.upload(filePayload, {
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
    } catch (error: any) {
      console.error("[Cloudinary Upload Error]", error);
      throw new Error(
        error.message || "Failed to upload image to Cloudinary. Verify Cloudinary API Key permissions."
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
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
      });

      return {
        success: result.result === "ok",
        result: result.result,
      };
    } catch (error: any) {
      console.warn(`[Cloudinary Warning] Could not delete image with publicId "${publicId}":`, error);
      return { success: false, result: error?.message || "delete_failed" };
    }
  }
}
