"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_validation_1 = require("./auth.validation");
const auth_service_1 = require("./auth.service");
class AuthController {
    /**
     * POST /api/auth/login
     */
    static async login(req, res) {
        try {
            const parsedBody = auth_validation_1.loginSchema.parse(req.body);
            const result = await auth_service_1.AuthService.login(parsedBody);
            res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
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
    static async registerOwner(req, res) {
        try {
            const parsedBody = auth_validation_1.registerOwnerSchema.parse(req.body);
            const result = await auth_service_1.AuthService.registerOwner(parsedBody);
            res.status(201).json({
                success: true,
                message: "Pharmacy owner registered successfully. Proceeding to subscription payment.",
                data: result,
            });
        }
        catch (error) {
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
exports.AuthController = AuthController;
