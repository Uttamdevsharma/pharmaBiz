import { Router } from "express";
import { LocationController } from "./location.controller";
import { authenticate } from "../../middleware/authenticate";
import { requirePermission } from "../../middleware/requirePermission";

const router = Router();

router.use(authenticate);

router.get("/", requirePermission("location.rack_list"), LocationController.getLocations);

// Batch-specific location breakdown
router.get("/batch/:inventoryId", requirePermission("location.rack_list"), LocationController.getBatchLocations);

router.post("/quick-rack", requirePermission("location.create_rack"), LocationController.quickCreateRack);
router.post("/racks", requirePermission("location.create_rack"), LocationController.createRack);
router.patch("/racks/:id", requirePermission("location.create_rack"), LocationController.updateRack);
router.delete("/racks/:id", requirePermission("location.create_rack"), LocationController.deleteRack);

router.post("/shelves", requirePermission("location.create_rack"), LocationController.createShelf);
router.patch("/shelves/:id", requirePermission("location.create_rack"), LocationController.updateShelf);
router.delete("/shelves/:id", requirePermission("location.create_rack"), LocationController.deleteShelf);

router.post("/bins", requirePermission("location.create_rack"), LocationController.createBin);
router.patch("/bins/:id", requirePermission("location.create_rack"), LocationController.updateBin);
router.delete("/bins/:id", requirePermission("location.create_rack"), LocationController.deleteBin);

export default router;
