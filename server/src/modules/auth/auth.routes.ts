import { Router } from "express";
import { AuthController } from "./auth.controller";
import { authenticate } from "../../middleware/authenticate";

const router = Router();

router.post("/login", AuthController.login);
router.post("/register-owner", AuthController.registerOwner);
router.get("/me", authenticate, AuthController.getMe);

export { router as authRoutes };

