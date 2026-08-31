import { Request, Response } from "express";
import { loginSchema, registerOwnerSchema } from "./auth.validation";
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
}
