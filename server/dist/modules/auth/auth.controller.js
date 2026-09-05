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
    /**
     * POST /api/auth/verify-otp
     */
    static async verifyOtp(req, res) {
        try {
            const parsedBody = auth_validation_1.verifyOtpSchema.parse(req.body);
            const result = await auth_service_1.AuthService.verifyOtp(parsedBody);
            res.status(200).json({
                success: true,
                message: result.message,
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
                message: error.message || "OTP verification failed",
            });
        }
    }
    /**
     * POST /api/auth/resend-otp
     */
    static async resendOtp(req, res) {
        try {
            const parsedBody = auth_validation_1.resendOtpSchema.parse(req.body);
            const result = await auth_service_1.AuthService.resendOtp(parsedBody);
            res.status(200).json({
                success: true,
                message: result.message,
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
                message: error.message || "Failed to resend OTP",
            });
        }
    }
    /**
     * GET /api/auth/verification-status
     */
    static async getVerificationStatus(req, res) {
        try {
            const identifier = (req.query.identifier || req.query.email || req.query.tenantId);
            if (!identifier) {
                res.status(400).json({
                    success: false,
                    message: "Email or tenantId is required as identifier",
                });
                return;
            }
            const result = await auth_service_1.AuthService.getVerificationStatus(identifier);
            res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message || "Could not retrieve verification status",
            });
        }
    }
    /**
     * GET /api/auth/me
     */
    static async getMe(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: "Not authenticated" });
                return;
            }
            const user = await auth_service_1.AuthService.getMe(req.user.id);
            res.status(200).json({ success: true, data: user });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
exports.AuthController = AuthController;
