import { Router } from "express";
import { QuotationController } from "./quotation.controller";

const router = Router();

router.get("/", QuotationController.list);
router.post("/", QuotationController.create);
router.get("/:id", QuotationController.getById);
router.put("/:id", QuotationController.update);
router.delete("/:id", QuotationController.delete);
router.post("/:id/send-email", QuotationController.sendEmail);

export { router as quotationRoutes };
