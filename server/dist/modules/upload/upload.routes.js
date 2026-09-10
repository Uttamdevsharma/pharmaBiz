"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRoutes = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const upload_controller_1 = require("./upload.controller");
const authenticate_1 = require("../../middleware/authenticate");
const router = (0, express_1.Router)();
exports.uploadRoutes = router;
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
});
// Image and document upload and deletion (authenticated)
router.post("/image", authenticate_1.authenticate, upload.fields([{ name: "file", maxCount: 1 }, { name: "image", maxCount: 1 }]), upload_controller_1.UploadController.uploadImage);
router.delete("/image", authenticate_1.authenticate, upload_controller_1.UploadController.deleteImage);
