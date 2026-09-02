import { Router } from "express";
import { ProductController } from "./product.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { requirePermission } from "../../middleware/requirePermission";
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
  requirePermission("product.view"),
  ProductController.listCategories
);

router.post(
  ["/categories", "/variants/categories"],
  requirePermission("product.create"),
  validateRequest({ body: createCategorySchema }),
  ProductController.createCategory
);

router.patch(
  ["/categories/:id", "/variants/categories/:id"],
  requirePermission("product.update"),
  validateRequest({ body: updateCategorySchema }),
  ProductController.updateCategory
);

router.delete(
  ["/categories/:id", "/variants/categories/:id"],
  authorize(["COMPANY_OWNER", "SUPER_ADMIN"]),
  ProductController.deleteCategory
);

// ==================== BRANDS ====================
router.get(
  ["/brands", "/variants/brands"],
  requirePermission("product.view"),
  ProductController.listBrands
);

router.post(
  ["/brands", "/variants/brands"],
  requirePermission("product.create"),
  validateRequest({ body: createBrandSchema }),
  ProductController.createBrand
);

router.patch(
  ["/brands/:id", "/variants/brands/:id"],
  requirePermission("product.update"),
  validateRequest({ body: updateBrandSchema }),
  ProductController.updateBrand
);

router.delete(
  ["/brands/:id", "/variants/brands/:id"],
  authorize(["COMPANY_OWNER", "SUPER_ADMIN"]),
  ProductController.deleteBrand
);

// ==================== UNITS ====================
router.get(
  "/units",
  requirePermission("product.view"),
  ProductController.listUnits
);

router.post(
  "/units",
  requirePermission("product.create"),
  validateRequest({ body: createUnitSchema }),
  ProductController.createUnit
);

// ==================== PRODUCTS ====================
router.get(
  "/",
  requirePermission("product.view"),
  validateRequest({ query: listProductsQuerySchema }),
  ProductController.listProducts
);

router.get(
  "/barcode/:barcode",
  requirePermission("product.view"),
  ProductController.getProductByBarcode
);

router.get(
  "/:id",
  requirePermission("product.view"),
  ProductController.getProductById
);

router.post(
  "/",
  requirePermission("product.create"),
  validateRequest({ body: createProductSchema }),
  ProductController.createProduct
);

router.post(
  "/bulk",
  requirePermission("product.create"),
  validateRequest({ body: bulkProductSchema }),
  ProductController.bulkImport
);

router.patch(
  "/:id",
  requirePermission("product.update"),
  validateRequest({ body: updateProductSchema }),
  ProductController.updateProduct
);

router.delete(
  "/:id",
  authorize(["COMPANY_OWNER", "SUPER_ADMIN"]),
  ProductController.deleteProduct
);

router.patch(
  "/:id/price",
  requirePermission("product.update"),
  validateRequest({ body: updatePricingSchema }),
  ProductController.updatePricing
);

router.post(
  "/:id/branch-price",
  requirePermission("product.update"),
  validateRequest({ body: branchPriceOverrideSchema }),
  ProductController.setBranchPriceOverride
);

router.delete(
  "/:id/branch-price/:branchId",
  authorize(["COMPANY_OWNER", "SUPER_ADMIN"]),
  ProductController.removeBranchPriceOverride
);

export const productRoutes = router;
