import { Router } from "express";
import { ProductController } from "./product.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validateRequest } from "../../middleware/validate";
import { requireActiveSubscription } from "../../middleware/planLimiter";
import {
  createProductSchema,
  updateProductSchema,
  bulkProductSchema,
  updatePricingSchema,
  branchPriceOverrideSchema,
  listProductsQuerySchema,
  createCategorySchema,
  updateCategorySchema,
  createBrandSchema,
  updateBrandSchema,
  createUnitSchema,
} from "./product.validation";

const router = Router();

router.use(authenticate, requireActiveSubscription);

// ==================== CATEGORIES ====================
router.get(
  ["/categories", "/variants/categories"],
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "CASHIER", "AUDITOR"]),
  ProductController.listCategories
);

router.post(
  ["/categories", "/variants/categories"],
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER"]),
  validateRequest({ body: createCategorySchema }),
  ProductController.createCategory
);

router.patch(
  ["/categories/:id", "/variants/categories/:id"],
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER"]),
  validateRequest({ body: updateCategorySchema }),
  ProductController.updateCategory
);

router.delete(
  ["/categories/:id", "/variants/categories/:id"],
  authorize(["COMPANY_OWNER"]),
  ProductController.deleteCategory
);

// ==================== BRANDS ====================
router.get(
  ["/brands", "/variants/brands"],
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "CASHIER", "AUDITOR"]),
  ProductController.listBrands
);

router.post(
  ["/brands", "/variants/brands"],
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER"]),
  validateRequest({ body: createBrandSchema }),
  ProductController.createBrand
);

router.patch(
  ["/brands/:id", "/variants/brands/:id"],
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER"]),
  validateRequest({ body: updateBrandSchema }),
  ProductController.updateBrand
);

router.delete(
  ["/brands/:id", "/variants/brands/:id"],
  authorize(["COMPANY_OWNER"]),
  ProductController.deleteBrand
);

// ==================== UNITS ====================
router.get(
  "/units",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "CASHIER", "AUDITOR"]),
  ProductController.listUnits
);

router.post(
  "/units",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER"]),
  validateRequest({ body: createUnitSchema }),
  ProductController.createUnit
);

// ==================== PRODUCTS ====================
router.get(
  "/",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "CASHIER", "AUDITOR"]),
  validateRequest({ query: listProductsQuerySchema }),
  ProductController.listProducts
);

router.get(
  "/barcode/:barcode",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "CASHIER", "AUDITOR"]),
  ProductController.getProductByBarcode
);

router.get(
  "/:id",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "CASHIER", "AUDITOR"]),
  ProductController.getProductById
);

router.post(
  "/",
  authorize(["COMPANY_OWNER"]),
  validateRequest({ body: createProductSchema }),
  ProductController.createProduct
);

router.post(
  "/bulk",
  authorize(["COMPANY_OWNER"]),
  validateRequest({ body: bulkProductSchema }),
  ProductController.bulkImport
);

router.patch(
  "/:id",
  authorize(["COMPANY_OWNER"]),
  validateRequest({ body: updateProductSchema }),
  ProductController.updateProduct
);

router.delete(
  "/:id",
  authorize(["COMPANY_OWNER"]),
  ProductController.deleteProduct
);

router.patch(
  "/:id/price",
  authorize(["COMPANY_OWNER"]),
  validateRequest({ body: updatePricingSchema }),
  ProductController.updatePricing
);

router.post(
  "/:id/branch-price",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN"]),
  validateRequest({ body: branchPriceOverrideSchema }),
  ProductController.setBranchPriceOverride
);

router.delete(
  "/:id/branch-price/:branchId",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN"]),
  ProductController.removeBranchPriceOverride
);

export const productRoutes = router;
