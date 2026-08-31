"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductController = void 0;
const product_service_1 = require("./product.service");
class ProductController {
    // ==================== CATEGORIES ====================
    static async listCategories(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const categories = await product_service_1.ProductService.listCategories(tenantId);
            res.status(200).json({ success: true, data: categories });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async createCategory(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const category = await product_service_1.ProductService.createCategory(tenantId, userId, req.body);
            res.status(201).json({ success: true, data: category });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async updateCategory(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const category = await product_service_1.ProductService.updateCategory(id, tenantId, userId, req.body);
            res.status(200).json({ success: true, data: category });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async deleteCategory(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const result = await product_service_1.ProductService.deleteCategory(id, tenantId, userId);
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    // ==================== BRANDS ====================
    static async listBrands(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const brands = await product_service_1.ProductService.listBrands(tenantId);
            res.status(200).json({ success: true, data: brands });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async createBrand(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const brand = await product_service_1.ProductService.createBrand(tenantId, userId, req.body);
            res.status(201).json({ success: true, data: brand });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async updateBrand(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const brand = await product_service_1.ProductService.updateBrand(id, tenantId, userId, req.body);
            res.status(200).json({ success: true, data: brand });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async deleteBrand(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const result = await product_service_1.ProductService.deleteBrand(id, tenantId, userId);
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    // ==================== UNITS ====================
    static async listUnits(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const units = await product_service_1.ProductService.listUnits(tenantId);
            res.status(200).json({ success: true, data: units });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async createUnit(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const unit = await product_service_1.ProductService.createUnit(tenantId, userId, req.body);
            res.status(201).json({ success: true, data: unit });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    // ==================== PRODUCTS ====================
    static async createProduct(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const product = await product_service_1.ProductService.createProduct(tenantId, userId, req.body);
            res.status(201).json({
                success: true,
                message: "Product created successfully",
                data: product,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async listProducts(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const query = req.query;
            if (!query.branchId && req.user?.branchId) {
                query.branchId = req.user.branchId;
            }
            const result = await product_service_1.ProductService.listProducts(tenantId, query);
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getProductById(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const branchId = req.query.branchId || req.user?.branchId || undefined;
            const product = await product_service_1.ProductService.getProductById(id, tenantId, branchId);
            res.status(200).json({ success: true, data: product });
        }
        catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }
    static async getProductByBarcode(req, res) {
        try {
            const { barcode } = req.params;
            const tenantId = req.user.tenantId;
            const branchId = req.query.branchId || req.user?.branchId || undefined;
            const product = await product_service_1.ProductService.getProductByBarcode(barcode, tenantId, branchId);
            res.status(200).json({ success: true, data: product });
        }
        catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }
    static async updateProduct(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const updated = await product_service_1.ProductService.updateProduct(id, tenantId, userId, req.body);
            res.status(200).json({
                success: true,
                message: "Product updated successfully",
                data: updated,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async deleteProduct(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const result = await product_service_1.ProductService.deleteProduct(id, tenantId, userId);
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async bulkImport(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const result = await product_service_1.ProductService.bulkImport(tenantId, userId, req.body);
            res.status(200).json({
                success: true,
                message: `Successfully processed ${result.totalProcessed} products (${result.createdCount} created, ${result.updatedCount} updated)`,
                data: result,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async updatePricing(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const { basePrice } = req.body;
            const updated = await product_service_1.ProductService.updateBasePrice(id, tenantId, userId, basePrice);
            res.status(200).json({
                success: true,
                message: "Base price updated successfully",
                data: updated,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async setBranchPriceOverride(req, res) {
        try {
            const { id } = req.params;
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const override = await product_service_1.ProductService.setBranchPriceOverride(id, tenantId, userId, req.body);
            res.status(200).json({
                success: true,
                message: "Branch price override set successfully",
                data: override,
            });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async removeBranchPriceOverride(req, res) {
        try {
            const { id, branchId } = req.params;
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const result = await product_service_1.ProductService.removeBranchPriceOverride(id, branchId, tenantId, userId);
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}
exports.ProductController = ProductController;
