import { Router } from "express";
import { SupplierController } from "./supplier.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
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
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "AUDITOR"]),
  validateRequest({ query: listSuppliersQuerySchema }),
  SupplierController.listSuppliers
);

router.get(
  "/:id",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "AUDITOR"]),
  SupplierController.getSupplierById
);

router.post(
  "/",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER"]),
  validateRequest({ body: createSupplierSchema }),
  SupplierController.createSupplier
);

router.patch(
  "/:id",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER"]),
  validateRequest({ body: updateSupplierSchema }),
  SupplierController.updateSupplier
);

router.delete(
  "/:id",
  authorize(["COMPANY_OWNER"]),
  SupplierController.deleteSupplier
);

// Purchases / Stock Inward
router.post(
  "/purchases",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER"]),
  validateRequest({ body: createPurchaseSchema }),
  SupplierController.recordPurchase
);

router.get(
  "/purchases/list",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "AUDITOR"]),
  validateRequest({ query: listPurchasesQuerySchema }),
  SupplierController.listPurchases
);

// Settle due payment to supplier
router.post(
  "/:id/payments",
  authorize(["COMPANY_OWNER", "BRANCH_MANAGER"]),
  validateRequest({ body: recordSupplierPaymentSchema }),
  SupplierController.recordSupplierPayment
);

export const supplierRoutes = router;
