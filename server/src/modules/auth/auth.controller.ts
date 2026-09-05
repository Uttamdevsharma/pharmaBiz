import { Request, Response } from "express";
import { loginSchema, registerOwnerSchema, verifyOtpSchema, resendOtpSchema } from "./auth.validation";
import { AuthService } from "./auth.service";

export class AuthController {
  /**
   * POST /api/auth/login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const parsedBody = loginSchema.parse(req.body);
      const result = await AuthService.login(parsedBody);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error.errors,
        });
        return;
      }
      
      res.status(401).json({
        success: false,
        message: error.message || "Authentication failed",
      });
    }
  }

  /**
   * POST /api/auth/register-owner
   */
  static async registerOwner(req: Request, res: Response): Promise<void> {
    try {
      const parsedBody = registerOwnerSchema.parse(req.body);
      const result = await AuthService.registerOwner(parsedBody);

      res.status(201).json({
        success: true,
        message: "Pharmacy owner registered successfully. Proceeding to subscription payment.",
        data: result,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error.errors,
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: error.message || "Registration failed",
      });
    }
  }

  /**
   * POST /api/auth/verify-otp
   */
  static async verifyOtp(req: Request, res: Response): Promise<void> {
    try {
      const parsedBody = verifyOtpSchema.parse(req.body);
      const result = await AuthService.verifyOtp(parsedBody);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error.errors,
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: error.message || "OTP verification failed",
      });
    }
  }

  /**
   * POST /api/auth/resend-otp
   */
  static async resendOtp(req: Request, res: Response): Promise<void> {
    try {
      const parsedBody = resendOtpSchema.parse(req.body);
      const result = await AuthService.resendOtp(parsedBody);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error.errors,
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: error.message || "Failed to resend OTP",
      });
    }
  }

  /**
   * GET /api/auth/verification-status
   */
  static async getVerificationStatus(req: Request, res: Response): Promise<void> {
    try {
      const identifier = (req.query.identifier || req.query.email || req.query.tenantId) as string;
      if (!identifier) {
        res.status(400).json({
          success: false,
          message: "Email or tenantId is required as identifier",
        });
        return;
      }

      const result = await AuthService.getVerificationStatus(identifier);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Could not retrieve verification status",
      });
    }
  }

  /**
   * GET /api/auth/me
   */
  static async getMe(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Not authenticated" });
        return;
      }
      const user = await AuthService.getMe(req.user.id);
      res.status(200).json({ success: true, data: user });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
