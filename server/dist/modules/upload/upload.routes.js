"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRoutes = void 0;
const express_1 = require("express");
const upload_controller_1 = require("./upload.controller");
const authenticate_1 = require("../../middleware/authenticate");
const router = (0, express_1.Router)();
exports.uploadRoutes = router;
// Image upload and deletion (authenticated)
router.post("/image", authenticate_1.authenticate, upload_controller_1.UploadController.uploadImage);
router.delete("/image", authenticate_1.authenticate, upload_controller_1.UploadController.deleteImage);
