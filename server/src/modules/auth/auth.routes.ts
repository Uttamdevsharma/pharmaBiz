import { Router } from "express";
import { AuthController } from "./auth.controller";

const router = Router();

router.post("/login", AuthController.login);
router.post("/register-owner", AuthController.registerOwner);

export { router as authRoutes };
