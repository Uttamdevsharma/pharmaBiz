import { Router } from "express";
import { SmsController } from "./sms.controller";

const router = Router();

// Gateway Settings
router.get("/settings", SmsController.getSettings);
router.put("/settings", SmsController.updateSettings);

// Recipients
router.get("/recipients", SmsController.getRecipients);
router.get("/send/recipients", SmsController.getRecipients);

// Campaign Dispatch
router.post("/campaign", SmsController.sendCampaign);
router.post("/send/campaign", SmsController.sendCampaign);

// Delivery & Audit Logs
router.get("/logs", SmsController.getLogs);

export { router as smsRoutes };
