import { Router } from "express";
import { UploadController } from "./upload.controller";
import { authenticate } from "../../middleware/authenticate";

const router = Router();

// Image upload and deletion (authenticated)
router.post("/image", authenticate, UploadController.uploadImage);
router.delete("/image", authenticate, UploadController.deleteImage);

export { router as uploadRoutes };
