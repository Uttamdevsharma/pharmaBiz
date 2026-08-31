"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsController = void 0;
const settings_service_1 = require("./settings.service");
class SettingsController {
    static async getPublicSettings(req, res) {
        try {
            const data = await settings_service_1.SettingsService.getPublicSettings();
            res.status(200).json({ success: true, data });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getAdminSettings(req, res) {
        try {
            const data = await settings_service_1.SettingsService.getAdminSettings();
            res.status(200).json({ success: true, data });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async updateSettings(req, res) {
        try {
            const updated = await settings_service_1.SettingsService.updateSettings(req.body);
            res.status(200).json({
                success: true,
                message: "Platform settings updated successfully",
                data: updated,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}
exports.SettingsController = SettingsController;
