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
  createContactSchema,
  updateContactSchema,
  listSupplierPaymentsQuerySchema,
  supplierDueSummaryQuerySchema,
} from "./supplier.validation";

const router = Router();

router.use(authenticate, requireActiveSubscription);

// 1. Literal path endpoints (must precede /:id)
router.get(
  "/",
  requirePermission("supplier.view"),
  validateRequest({ query: listSuppliersQuerySchema }),
  SupplierController.listSuppliers
);

router.post(
  "/",
  requirePermission("supplier.manage"),
  validateRequest({ body: createSupplierSchema }),
  SupplierController.createSupplier
);

router.get(
  "/purchases/list",
  requirePermission("supplier.purchase_history"),
  validateRequest({ query: listPurchasesQuerySchema }),
  SupplierController.listPurchases
);

router.post(
  "/purchases",
  requirePermission("stock.add_stock"),
  validateRequest({ body: createPurchaseSchema }),
  SupplierController.recordPurchase
);

router.get(
  "/payments/list",
  requirePermission("supplier.payments_due"),
  validateRequest({ query: listSupplierPaymentsQuerySchema }),
  SupplierController.listSupplierPayments
);

router.get(
  "/due-summary",
  requirePermission("supplier.payments_due"),
  validateRequest({ query: supplierDueSummaryQuerySchema }),
  SupplierController.getSupplierDueSummary
);

// 2. Specific supplier parameter routes
router.get(
  "/:id",
  requirePermission("supplier.view"),
  SupplierController.getSupplierById
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

// Supplier-specific purchases
router.get(
  "/:id/purchases",
  requirePermission("supplier.purchase_history"),
  SupplierController.getSupplierPurchases
);

// Contact Persons under Supplier
router.get(
  "/:id/contacts",
  requirePermission("supplier.contacts"),
  SupplierController.listContacts
);

router.post(
  "/:id/contacts",
  requirePermission("supplier.contacts"),
  validateRequest({ body: createContactSchema }),
  SupplierController.createContact
);

router.patch(
  "/:id/contacts/:contactId",
  requirePermission("supplier.contacts"),
  validateRequest({ body: updateContactSchema }),
  SupplierController.updateContact
);

router.delete(
  "/:id/contacts/:contactId",
  requirePermission("supplier.contacts"),
  SupplierController.deleteContact
);

// Settle due payment to supplier
router.post(
  "/:id/payments",
  requirePermission("supplier.payments_due"),
  validateRequest({ body: recordSupplierPaymentSchema }),
  SupplierController.recordSupplierPayment
);

export const supplierRoutes = router;
