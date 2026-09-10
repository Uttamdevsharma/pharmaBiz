import { Router } from "express";
import multer from "multer";
import { UploadController } from "./upload.controller";
import { authenticate } from "../../middleware/authenticate";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

// Image and document upload and deletion (authenticated)
router.post(
  "/image",
  authenticate,
  upload.fields([{ name: "file", maxCount: 1 }, { name: "image", maxCount: 1 }]),
  UploadController.uploadImage
);
router.delete("/image", authenticate, UploadController.deleteImage);

export { router as uploadRoutes };
