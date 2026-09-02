"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productRoutes = void 0;
const express_1 = require("express");
const product_controller_1 = require("./product.controller");
const authenticate_1 = require("../../middleware/authenticate");
const authorize_1 = require("../../middleware/authorize");
const requirePermission_1 = require("../../middleware/requirePermission");
const validate_1 = require("../../middleware/validate");
const planLimiter_1 = require("../../middleware/planLimiter");
const product_validation_1 = require("./product.validation");
const router = (0, express_1.Router)();
router.use(authenticate_1.authenticate, planLimiter_1.requireActiveSubscription);
// ==================== CATEGORIES ====================
router.get(["/categories", "/variants/categories"], (0, requirePermission_1.requirePermission)("product.view"), product_controller_1.ProductController.listCategories);
router.post(["/categories", "/variants/categories"], (0, requirePermission_1.requirePermission)("product.create"), (0, validate_1.validateRequest)({ body: product_validation_1.createCategorySchema }), product_controller_1.ProductController.createCategory);
router.patch(["/categories/:id", "/variants/categories/:id"], (0, requirePermission_1.requirePermission)("product.update"), (0, validate_1.validateRequest)({ body: product_validation_1.updateCategorySchema }), product_controller_1.ProductController.updateCategory);
router.delete(["/categories/:id", "/variants/categories/:id"], (0, authorize_1.authorize)(["COMPANY_OWNER", "SUPER_ADMIN"]), product_controller_1.ProductController.deleteCategory);
// ==================== BRANDS ====================
router.get(["/brands", "/variants/brands"], (0, requirePermission_1.requirePermission)("product.view"), product_controller_1.ProductController.listBrands);
router.post(["/brands", "/variants/brands"], (0, requirePermission_1.requirePermission)("product.create"), (0, validate_1.validateRequest)({ body: product_validation_1.createBrandSchema }), product_controller_1.ProductController.createBrand);
router.patch(["/brands/:id", "/variants/brands/:id"], (0, requirePermission_1.requirePermission)("product.update"), (0, validate_1.validateRequest)({ body: product_validation_1.updateBrandSchema }), product_controller_1.ProductController.updateBrand);
router.delete(["/brands/:id", "/variants/brands/:id"], (0, authorize_1.authorize)(["COMPANY_OWNER", "SUPER_ADMIN"]), product_controller_1.ProductController.deleteBrand);
// ==================== UNITS ====================
router.get("/units", (0, requirePermission_1.requirePermission)("product.view"), product_controller_1.ProductController.listUnits);
router.post("/units", (0, requirePermission_1.requirePermission)("product.create"), (0, validate_1.validateRequest)({ body: product_validation_1.createUnitSchema }), product_controller_1.ProductController.createUnit);
// ==================== PRODUCTS ====================
router.get("/", (0, requirePermission_1.requirePermission)("product.view"), (0, validate_1.validateRequest)({ query: product_validation_1.listProductsQuerySchema }), product_controller_1.ProductController.listProducts);
router.get("/barcode/:barcode", (0, requirePermission_1.requirePermission)("product.view"), product_controller_1.ProductController.getProductByBarcode);
router.get("/:id", (0, requirePermission_1.requirePermission)("product.view"), product_controller_1.ProductController.getProductById);
router.post("/", (0, requirePermission_1.requirePermission)("product.create"), (0, validate_1.validateRequest)({ body: product_validation_1.createProductSchema }), product_controller_1.ProductController.createProduct);
router.post("/bulk", (0, requirePermission_1.requirePermission)("product.create"), (0, validate_1.validateRequest)({ body: product_validation_1.bulkProductSchema }), product_controller_1.ProductController.bulkImport);
router.patch("/:id", (0, requirePermission_1.requirePermission)("product.update"), (0, validate_1.validateRequest)({ body: product_validation_1.updateProductSchema }), product_controller_1.ProductController.updateProduct);
router.delete("/:id", (0, authorize_1.authorize)(["COMPANY_OWNER", "SUPER_ADMIN"]), product_controller_1.ProductController.deleteProduct);
router.patch("/:id/price", (0, requirePermission_1.requirePermission)("product.update"), (0, validate_1.validateRequest)({ body: product_validation_1.updatePricingSchema }), product_controller_1.ProductController.updatePricing);
router.post("/:id/branch-price", (0, requirePermission_1.requirePermission)("product.update"), (0, validate_1.validateRequest)({ body: product_validation_1.branchPriceOverrideSchema }), product_controller_1.ProductController.setBranchPriceOverride);
router.delete("/:id/branch-price/:branchId", (0, authorize_1.authorize)(["COMPANY_OWNER", "SUPER_ADMIN"]), product_controller_1.ProductController.removeBranchPriceOverride);
exports.productRoutes = router;
