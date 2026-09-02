import { Router } from "express";
import { SupplierController } from "./supplier.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { requirePermission } from "../../middleware/requirePermission";
import { validateRequest } from "../../middleware/validate";
import { requireActiveSubscription } from "../../middleware/planLimiter";
import {
  createSupplierSchema,
  updateSupplierSchema,
  listSuppliersQuerySchema,
  createPurchaseSchema,
  listPurchasesQuerySchema,
  recordSupplierPaymentSchema,
} from "./supplier.validation";

const router = Router();

router.use(authenticate, requireActiveSubscription);

// Supplier CRUD
router.get(
  "/",
  requirePermission("supplier.view"),
  validateRequest({ query: listSuppliersQuerySchema }),
  SupplierController.listSuppliers
);

router.get(
  "/:id",
  requirePermission("supplier.view"),
  SupplierController.getSupplierById
);

router.post(
  "/",
  requirePermission("supplier.manage"),
  validateRequest({ body: createSupplierSchema }),
  SupplierController.createSupplier
);

router.patch(
  "/:id",
  requirePermission("supplier.manage"),
  validateRequest({ body: updateSupplierSchema }),
  SupplierController.updateSupplier
);

router.delete(
  "/:id",
  authorize(["COMPANY_OWNER", "SUPER_ADMIN"]),
  SupplierController.deleteSupplier
);

// Purchases / Stock Inward
router.post(
  "/purchases",
  requirePermission("inventory.add_stock"),
  validateRequest({ body: createPurchaseSchema }),
  SupplierController.recordPurchase
);

router.get(
  "/purchases/list",
  requirePermission("supplier.view"),
  validateRequest({ query: listPurchasesQuerySchema }),
  SupplierController.listPurchases
);

// Settle due payment to supplier
router.post(
  "/:id/payments",
  requirePermission("accounts.manage"),
  validateRequest({ body: recordSupplierPaymentSchema }),
  SupplierController.recordSupplierPayment
);

export const supplierRoutes = router;
