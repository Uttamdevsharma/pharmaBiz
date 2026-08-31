"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const router = (0, express_1.Router)();
exports.authRoutes = router;
router.post("/login", auth_controller_1.AuthController.login);
router.post("/register-owner", auth_controller_1.AuthController.registerOwner);
