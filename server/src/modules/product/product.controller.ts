import { Request, Response } from "express";
import { ProductService } from "./product.service";
import { ListProductsQuery } from "./product.validation";

export class ProductController {
  // ==================== CATEGORIES ====================

  static async listCategories(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const categories = await ProductService.listCategories(tenantId);
      res.status(200).json({ success: true, data: categories });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const category = await ProductService.createCategory(tenantId, userId, req.body);
      res.status(201).json({ success: true, data: category });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const category = await ProductService.updateCategory(id, tenantId, userId, req.body);
      res.status(200).json({ success: true, data: category });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const result = await ProductService.deleteCategory(id, tenantId, userId);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // ==================== BRANDS ====================

  static async listBrands(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const brands = await ProductService.listBrands(tenantId);
      res.status(200).json({ success: true, data: brands });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async createBrand(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const brand = await ProductService.createBrand(tenantId, userId, req.body);
      res.status(201).json({ success: true, data: brand });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async updateBrand(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const brand = await ProductService.updateBrand(id, tenantId, userId, req.body);
      res.status(200).json({ success: true, data: brand });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async deleteBrand(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const result = await ProductService.deleteBrand(id, tenantId, userId);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // ==================== UNITS ====================

  static async listUnits(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const units = await ProductService.listUnits(tenantId);
      res.status(200).json({ success: true, data: units });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async createUnit(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const unit = await ProductService.createUnit(tenantId, userId, req.body);
      res.status(201).json({ success: true, data: unit });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // ==================== PRODUCTS ====================

  static async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const product = await ProductService.createProduct(tenantId, userId, req.body);
      res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: product,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async listProducts(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const query = req.query as unknown as ListProductsQuery;
      if (!query.branchId && req.user?.branchId) {
        query.branchId = req.user.branchId;
      }
      const result = await ProductService.listProducts(tenantId, query);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getProductById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const branchId = (req.query.branchId as string) || req.user?.branchId || undefined;
      const product = await ProductService.getProductById(id, tenantId, branchId);
      res.status(200).json({ success: true, data: product });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  static async getProductByBarcode(req: Request, res: Response): Promise<void> {
    try {
      const { barcode } = req.params;
      const tenantId = req.user!.tenantId;
      const branchId = (req.query.branchId as string) || req.user?.branchId || undefined;
      const product = await ProductService.getProductByBarcode(barcode, tenantId, branchId);
      res.status(200).json({ success: true, data: product });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  static async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const updated = await ProductService.updateProduct(id, tenantId, userId, req.body);
      res.status(200).json({
        success: true,
        message: "Product updated successfully",
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const result = await ProductService.deleteProduct(id, tenantId, userId);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async bulkImport(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const result = await ProductService.bulkImport(tenantId, userId, req.body);
      res.status(200).json({
        success: true,
        message: `Successfully processed ${result.totalProcessed} products (${result.createdCount} created, ${result.updatedCount} updated)`,
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async updatePricing(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const { basePrice } = req.body;
      const updated = await ProductService.updateBasePrice(id, tenantId, userId, basePrice);
      res.status(200).json({
        success: true,
        message: "Base price updated successfully",
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async setBranchPriceOverride(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const override = await ProductService.setBranchPriceOverride(id, tenantId, userId, req.body);
      res.status(200).json({
        success: true,
        message: "Branch price override set successfully",
        data: override,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async removeBranchPriceOverride(req: Request, res: Response): Promise<void> {
    try {
      const { id, branchId } = req.params;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const result = await ProductService.removeBranchPriceOverride(id, branchId, tenantId, userId);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}
