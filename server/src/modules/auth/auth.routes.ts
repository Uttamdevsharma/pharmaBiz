import { Router } from "express";
import { AuthController } from "./auth.controller";
import { authenticate } from "../../middleware/authenticate";

const router = Router();

router.post("/login", AuthController.login);
router.post("/register-owner", AuthController.registerOwner);
router.post("/verify-otp", AuthController.verifyOtp);
router.post("/resend-otp", AuthController.resendOtp);
router.get("/verification-status", AuthController.getVerificationStatus);
router.get("/me", authenticate, AuthController.getMe);

export { router as authRoutes };

