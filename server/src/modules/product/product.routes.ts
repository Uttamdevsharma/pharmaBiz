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
  requirePermission("category.manage"),
  ProductController.listCategories
);

router.post(
  ["/categories", "/variants/categories"],
  requirePermission("category.manage"),
  validateRequest({ body: createCategorySchema }),
  ProductController.createCategory
);

router.patch(
  ["/categories/:id", "/variants/categories/:id"],
  requirePermission("category.manage"),
  validateRequest({ body: updateCategorySchema }),
  ProductController.updateCategory
);

router.delete(
  ["/categories/:id", "/variants/categories/:id"],
  requirePermission("category.manage"),
  ProductController.deleteCategory
);

// ==================== BRANDS ====================
router.get(
  ["/brands", "/variants/brands"],
  requirePermission("inventory.product_list"),
  ProductController.listBrands
);

router.post(
  ["/brands", "/variants/brands"],
  requirePermission("inventory.add_product"),
  validateRequest({ body: createBrandSchema }),
  ProductController.createBrand
);

router.patch(
  ["/brands/:id", "/variants/brands/:id"],
  requirePermission("inventory.product_list"),
  validateRequest({ body: updateBrandSchema }),
  ProductController.updateBrand
);

router.delete(
  ["/brands/:id", "/variants/brands/:id"],
  requirePermission("inventory.product_list"),
  ProductController.deleteBrand
);

// ==================== UNITS ====================
router.get(
  "/units",
  requirePermission("inventory.product_list"),
  ProductController.listUnits
);

router.post(
  "/units",
  requirePermission("inventory.add_product"),
  validateRequest({ body: createUnitSchema }),
  ProductController.createUnit
);

// ==================== PRODUCTS ====================
router.get(
  "/",
  requirePermission("inventory.product_list"),
  validateRequest({ query: listProductsQuerySchema }),
  ProductController.listProducts
);

router.get(
  "/barcode/:barcode",
  requirePermission("inventory.product_list"),
  ProductController.getProductByBarcode
);

router.get(
  "/:id",
  requirePermission("inventory.product_list"),
  ProductController.getProductById
);

router.post(
  "/",
  requirePermission("inventory.add_product"),
  validateRequest({ body: createProductSchema }),
  ProductController.createProduct
);

router.post(
  "/bulk",
  requirePermission("inventory.add_product"),
  validateRequest({ body: bulkProductSchema }),
  ProductController.bulkImport
);

router.patch(
  "/:id",
  requirePermission("inventory.product_list"),
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
  requirePermission("inventory.product_list"),
  validateRequest({ body: updatePricingSchema }),
  ProductController.updatePricing
);

router.post(
  "/:id/branch-price",
  requirePermission("inventory.product_list"),
  validateRequest({ body: branchPriceOverrideSchema }),
  ProductController.setBranchPriceOverride
);

router.delete(
  "/:id/branch-price/:branchId",
  authorize(["COMPANY_OWNER", "SUPER_ADMIN"]),
  ProductController.removeBranchPriceOverride
);

export const productRoutes = router;
