"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsRoutes = void 0;
const express_1 = require("express");
const settings_controller_1 = require("./settings.controller");
const authenticate_1 = require("../../middleware/authenticate");
const authorize_1 = require("../../middleware/authorize");
const validate_1 = require("../../middleware/validate");
const settings_validation_1 = require("./settings.validation");
const router = (0, express_1.Router)();
exports.settingsRoutes = router;
// Public route for public landing page
router.get("/public", settings_controller_1.SettingsController.getPublicSettings);
// Super Admin & Platform Delegate protected routes
router.get("/admin", authenticate_1.authenticate, (0, authorize_1.authorize)(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), settings_controller_1.SettingsController.getAdminSettings);
router.patch("/admin", authenticate_1.authenticate, (0, authorize_1.authorize)(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), (0, validate_1.validateRequest)({ body: settings_validation_1.updatePlatformSettingsSchema }), settings_controller_1.SettingsController.updateSettings);
