import { prisma } from "../../app/lib/prisma";
import { AuditService } from "../../app/lib/audit";
import {
  CreateProductInput,
  UpdateProductInput,
  BulkProductInput,
  BranchPriceOverrideInput,
  ListProductsQuery,
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateBrandInput,
  UpdateBrandInput,
  CreateUnitInput,
  UpdateUnitInput,
} from "./product.validation";

export const CANONICAL_MAIN_CATEGORIES = [
  {
    name: "Medicine",
    productType: "MEDICINE" as const,
    defaultUnit: "tablet",
    description: "Tablets, capsules, pills, oral solids & prescription medications",
    subcategories: [
      { name: "Antibiotics", defaultUnit: "capsule", description: "Antibacterial and antimicrobial drugs" },
      { name: "Antipyretics & Pain Relief", defaultUnit: "tablet", description: "Fever and pain management (NSAIDs, Paracetamol)" },
      { name: "Antihistamines & Allergy", defaultUnit: "tablet", description: "Allergy, cold and sinus relief" },
      { name: "Cardiovascular & BP", defaultUnit: "tablet", description: "Heart, hypertension and cholesterol medications" },
      { name: "Gastrointestinal & Antacids", defaultUnit: "tablet", description: "Gastric, ulcer, and acid reflux care" },
      { name: "Eye & Ear Drops", defaultUnit: "bottle", description: "Ophthalmic and otic formulations" },
      { name: "Vitamins & Multivitamins", defaultUnit: "tablet", description: "Daily vitamins, iron, and mineral supplements" },
      { name: "Antifungal & Dermatological", defaultUnit: "tube", description: "Topical and oral antifungal treatments" },
      { name: "Anti-Diabetic & Insulin", defaultUnit: "tablet", description: "Blood glucose management and insulin products" },
      { name: "Respiratory & Inhalers", defaultUnit: "piece", description: "Inhalers, rotacaps, and bronchodilators" },
    ],
  },
  {
    name: "Syrup",
    productType: "SYRUP" as const,
    defaultUnit: "bottle",
    description: "Liquid oral suspensions, cough syrups, and pediatric drops",
    subcategories: [
      { name: "Cough Syrups & Expectorants", defaultUnit: "bottle", description: "Dry and productive cough formulations" },
      { name: "Digestive & Antacid Syrups", defaultUnit: "bottle", description: "Liquid antacids and digestive enzymes" },
      { name: "Pediatric Syrups & Drops", defaultUnit: "bottle", description: "Infant and children liquid medications" },
      { name: "Vitamin & Tonic Syrups", defaultUnit: "bottle", description: "Liquid vitamins, iron tonics, appetite stimulants" },
      { name: "Antipyretic & Pain Syrups", defaultUnit: "bottle", description: "Liquid paracetamol and ibuprofen for children" },
      { name: "Antihistamine & Cold Syrups", defaultUnit: "bottle", description: "Liquid allergy and cold relief" },
    ],
  },
  {
    name: "Medical Equipment",
    productType: "EQUIPMENT" as const,
    defaultUnit: "piece",
    description: "Diagnostic devices, surgical disposables, monitoring equipment",
    subcategories: [
      { name: "Diagnostic Devices", defaultUnit: "piece", description: "BP monitors, thermometers, glucometers, oximeters" },
      { name: "Surgical Supplies & Disposables", defaultUnit: "piece", description: "Syringes, needles, cannula, surgical gloves" },
      { name: "Nebulizers & Respiratory", defaultUnit: "piece", description: "Nebulizer machines, masks, oxygen cannulas" },
      { name: "Bandages & Wound Dressing", defaultUnit: "piece", description: "Cotton, gauze, crepe bandage, adhesive tapes" },
      { name: "Orthopedic & Rehabilitation", defaultUnit: "piece", description: "Belts, collars, braces, walking aids" },
    ],
  },
  {
    name: "Saline (IV Fluid)",
    productType: "SALINE" as const,
    defaultUnit: "bag",
    description: "Intravenous fluids, infusion bags, electrolytes, and irrigation solutions",
    subcategories: [
      { name: "0.9% Normal Saline (NS)", defaultUnit: "bag", description: "Isotonic intravenous sodium chloride" },
      { name: "5% Dextrose in Water (D5W)", defaultUnit: "bag", description: "Dextrose infusion fluid" },
      { name: "Dextrose Normal Saline (DNS)", defaultUnit: "bag", description: "Combined dextrose and saline infusion" },
      { name: "Cholera Saline / Hartmann's Solution", defaultUnit: "bag", description: "Electrolyte replacement fluids" },
      { name: "3% Hypertonic Saline", defaultUnit: "bag", description: "Concentrated saline infusion" },
      { name: "Irrigation & Sterile Solutions", defaultUnit: "bottle", description: "Wound wash and sterile irrigation fluids" },
    ],
  },
  {
    name: "Other Health Product",
    productType: "OTHER" as const,
    defaultUnit: "piece",
    description: "Personal care, baby care, hygiene, and consumer health goods",
    subcategories: [
      { name: "Baby Care & Diapers", defaultUnit: "pack", description: "Baby wipes, diapers, baby wash, lotions" },
      { name: "Personal Hygiene & Skin Care", defaultUnit: "piece", description: "Antiseptic soaps, moisturizers, sanitizers" },
      { name: "Nutritional Supplements & Milk", defaultUnit: "tin", description: "Adult & baby milk formula, protein powders" },
      { name: "First Aid & Antiseptic Liquids", defaultUnit: "bottle", description: "Savlon, Dettol, Povidone Iodine, surgical spirit" },
      { name: "Oral & Dental Care", defaultUnit: "piece", description: "Toothpaste, toothbrushes, mouthwash" },
      { name: "Women's Health & Sanitary", defaultUnit: "pack", description: "Sanitary pads, maternity care products" },
    ],
  },
];

export function mapCategoryNameToProductType(
  categoryName?: string | null
): "MEDICINE" | "SYRUP" | "EQUIPMENT" | "SALINE" | "OTHER" {
  if (!categoryName) return "MEDICINE";
  const lower = categoryName.toLowerCase();
  if (lower.includes("syrup") || lower.includes("liquid") || lower.includes("suspension") || lower.includes("drop")) return "SYRUP";
  if (lower.includes("equipment") || lower.includes("device") || lower.includes("monitor") || lower.includes("surgical") || lower.includes("disposable")) return "EQUIPMENT";
  if (lower.includes("saline") || lower.includes("fluid") || lower.includes("infusion") || lower.includes("iv")) return "SALINE";
  if (lower.includes("other") || lower.includes("care") || lower.includes("hygiene") || lower.includes("baby") || lower.includes("supplement") || lower.includes("general")) return "OTHER";
  return "MEDICINE";
}

export class ProductService {
  /**
   * Seed default Catalog Categories, Subcategories, Units, and Brands for a Tenant
   */
  static async seedDefaultCatalogVariants(tenantId: string) {
    const defaultUnits = [
      { name: "Tablet", symbol: "tab", productType: "MEDICINE" as const },
      { name: "Strip", symbol: "strip", productType: "MEDICINE" as const },
      { name: "Box", symbol: "box", productType: "MEDICINE" as const },
      { name: "Capsule", symbol: "cap", productType: "MEDICINE" as const },
      { name: "Milligram", symbol: "mg", productType: "MEDICINE" as const },
      { name: "Milliliter", symbol: "ml", productType: "SYRUP" as const },
      { name: "Bottle", symbol: "bottle", productType: "SYRUP" as const },
      { name: "Piece", symbol: "pcs", productType: "EQUIPMENT" as const },
      { name: "Bag", symbol: "bag", productType: "SALINE" as const },
      { name: "Vial", symbol: "vial", productType: "MEDICINE" as const },
      { name: "Pack", symbol: "pack", productType: "OTHER" as const },
      { name: "Tin", symbol: "tin", productType: "OTHER" as const },
      { name: "Tube", symbol: "tube", productType: "MEDICINE" as const },
    ];

    for (const mainCat of CANONICAL_MAIN_CATEGORIES) {
      let rootCat = await (prisma as any).category.findFirst({
        where: { tenantId, name: mainCat.name, parentId: null },
      });

      if (!rootCat) {
        rootCat = await (prisma as any).category.create({
          data: {
            tenantId,
            name: mainCat.name,
            productType: mainCat.productType,
            defaultUnit: mainCat.defaultUnit,
            description: mainCat.description,
            parentId: null,
          },
        });
      }

      for (const sub of mainCat.subcategories) {
        const existingSub = await (prisma as any).category.findFirst({
          where: { tenantId, name: sub.name, parentId: rootCat.id },
        });

        if (!existingSub) {
          await (prisma as any).category.create({
            data: {
              tenantId,
              name: sub.name,
              parentId: rootCat.id,
              productType: mainCat.productType,
              defaultUnit: sub.defaultUnit,
              description: sub.description,
            },
          });
        }
      }
    }

    for (const unit of defaultUnits) {
      const existingUnit = await (prisma as any).unit.findFirst({
        where: { tenantId, name: unit.name },
      });
      if (!existingUnit) {
        await (prisma as any).unit.create({
          data: { tenantId, ...unit },
        });
      }
    }
  }

  /**
   * Automatically reconcile legacy categories, product types and subcategories
   */
  static async reconcileLegacyCategories(tenantId: string) {
    try {
      // 1. Ensure the 5 canonical main categories exist
      const mainCatMap = new Map<string, any>();
      for (const mainCatDef of CANONICAL_MAIN_CATEGORIES) {
        let root = await (prisma as any).category.findFirst({
          where: { tenantId, name: mainCatDef.name, parentId: null },
        });

        // Check if legacy name exists (e.g., "Saline & IV" or "General Healthcare")
        if (!root && mainCatDef.name === "Saline (IV Fluid)") {
          root = await (prisma as any).category.findFirst({
            where: { tenantId, name: "Saline & IV", parentId: null },
          });
          if (root) {
            root = await (prisma as any).category.update({
              where: { id: root.id },
              data: { name: "Saline (IV Fluid)" },
            });
          }
        }

        if (!root && mainCatDef.name === "Other Health Product") {
          root = await (prisma as any).category.findFirst({
            where: { tenantId, name: "General Healthcare", parentId: null },
          });
          if (root) {
            root = await (prisma as any).category.update({
              where: { id: root.id },
              data: { name: "Other Health Product" },
            });
          }
        }

        if (!root) {
          root = await (prisma as any).category.create({
            data: {
              tenantId,
              name: mainCatDef.name,
              productType: mainCatDef.productType,
              defaultUnit: mainCatDef.defaultUnit,
              description: mainCatDef.description,
              parentId: null,
            },
          });
        }

        mainCatMap.set(mainCatDef.name, root);
        mainCatMap.set(mainCatDef.productType, root);
      }

      // 2. Identify any category that is NOT one of the 5 canonical main categories and has parentId = null
      const nonMainRoots = await (prisma as any).category.findMany({
        where: {
          tenantId,
          parentId: null,
          name: {
            notIn: CANONICAL_MAIN_CATEGORIES.map((c) => c.name),
          },
        },
      });

      for (const cat of nonMainRoots) {
        // Convert to a subcategory under the appropriate main category
        const parentType = cat.productType || mapCategoryNameToProductType(cat.name);
        const parentCat = mainCatMap.get(parentType) || mainCatMap.get("Medicine");
        if (parentCat && parentCat.id !== cat.id) {
          await (prisma as any).category.update({
            where: { id: cat.id },
            data: { parentId: parentCat.id },
          });
        }
      }

      // 3. Reconcile existing products to have valid categoryId, subcategoryId, category, subcategory
      const products = await (prisma as any).product.findMany({
        where: { tenantId },
        include: { categoryRef: true, subcategoryRef: true },
      });

      for (const prod of products) {
        let mainCatId = prod.categoryId;
        let mainCatName = prod.category;
        let subCatId = prod.subcategoryId;
        let subCatName = prod.subcategory;
        let needsUpdate = false;

        // If product has a categoryRef that is actually a subcategory
        if (prod.categoryRef && prod.categoryRef.parentId) {
          subCatId = prod.categoryRef.id;
          subCatName = prod.categoryRef.name;
          const parent = await (prisma as any).category.findUnique({
            where: { id: prod.categoryRef.parentId },
          });
          if (parent) {
            mainCatId = parent.id;
            mainCatName = parent.name;
          }
          needsUpdate = true;
        } else if (!mainCatId || !mainCatName) {
          // Resolve main category from productType or category name
          const pType = prod.productType || mapCategoryNameToProductType(prod.category);
          const parent = mainCatMap.get(pType) || mainCatMap.get("Medicine");
          if (parent) {
            mainCatId = parent.id;
            mainCatName = parent.name;
            needsUpdate = true;
          }
        }

        const calculatedType = mapCategoryNameToProductType(mainCatName);
        if (prod.productType !== calculatedType) {
          needsUpdate = true;
        }

        if (needsUpdate) {
          await (prisma as any).product.update({
            where: { id: prod.id },
            data: {
              categoryId: mainCatId || null,
              category: mainCatName || "Medicine",
              subcategoryId: subCatId || null,
              subcategory: subCatName || null,
              productType: calculatedType,
            },
          });
        }
      }
    } catch (err) {
      console.error("[reconcileLegacyCategories] Error:", err);
    }
  }

  // ==================== CATEGORIES ====================

  static async listCategories(tenantId: string) {
    // Seed and reconcile if needed
    let mainCategories = await (prisma as any).category.findMany({
      where: { tenantId, parentId: null },
      include: {
        subcategories: {
          where: { isActive: true },
          orderBy: { name: "asc" },
          include: {
            _count: { select: { subProducts: true } },
          },
        },
        _count: { select: { products: true, subcategories: true } },
      },
    });

    if (mainCategories.length === 0) {
      await this.seedDefaultCatalogVariants(tenantId);
      mainCategories = await (prisma as any).category.findMany({
        where: { tenantId, parentId: null },
        include: {
          subcategories: {
            where: { isActive: true },
            orderBy: { name: "asc" },
            include: {
              _count: { select: { subProducts: true } },
            },
          },
          _count: { select: { products: true, subcategories: true } },
        },
      });
    } else {
      // Background reconciliation to keep data clean
      this.reconcileLegacyCategories(tenantId).catch(() => {});
    }

    // Sort categories according to the canonical definition order
    const canonicalOrder = CANONICAL_MAIN_CATEGORIES.map((c) => c.name);
    mainCategories.sort((a: any, b: any) => {
      const idxA = canonicalOrder.indexOf(a.name);
      const idxB = canonicalOrder.indexOf(b.name);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.name.localeCompare(b.name);
    });

    return mainCategories;
  }

  static async createCategory(tenantId: string, userId: string, data: CreateCategoryInput) {
    let parentCategory = null;
    let resolvedProductType = data.productType;

    if (data.parentId) {
      parentCategory = await (prisma as any).category.findFirst({
        where: { id: data.parentId, tenantId },
      });
      if (!parentCategory) {
        throw new Error("Selected Main Category was not found");
      }
      resolvedProductType = parentCategory.productType || mapCategoryNameToProductType(parentCategory.name);
    } else {
      resolvedProductType = resolvedProductType || mapCategoryNameToProductType(data.name);
    }

    const category = await (prisma as any).category.create({
      data: {
        tenantId,
        name: data.name.trim(),
        parentId: data.parentId || null,
        productType: resolvedProductType,
        defaultUnit: data.defaultUnit || parentCategory?.defaultUnit || null,
        description: data.description || null,
      },
      include: {
        parent: true,
      },
    });

    await AuditService.log({
      tenantId,
      userId,
      action: "CATEGORY_CREATE",
      details: {
        categoryId: category.id,
        name: category.name,
        parentId: category.parentId,
        isSubcategory: Boolean(category.parentId),
      },
    });

    return category;
  }

  static async updateCategory(id: string, tenantId: string, userId: string, data: UpdateCategoryInput) {
    const existing = await (prisma as any).category.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new Error("Category not found");
    }

    const updated = await (prisma as any).category.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
        ...(data.productType && { productType: data.productType }),
        ...(data.defaultUnit !== undefined && { defaultUnit: data.defaultUnit }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    // Update denormalized names on products if name changed
    if (data.name && data.name.trim() !== existing.name) {
      if (existing.parentId === null) {
        await (prisma as any).product.updateMany({
          where: { categoryId: id },
          data: { category: data.name.trim() },
        });
      } else {
        await (prisma as any).product.updateMany({
          where: { subcategoryId: id },
          data: { subcategory: data.name.trim() },
        });
      }
    }

    await AuditService.log({
      tenantId,
      userId,
      action: "CATEGORY_UPDATE",
      details: { categoryId: id, name: updated.name },
    });

    return updated;
  }

  static async deleteCategory(id: string, tenantId: string, userId: string) {
    const category = await (prisma as any).category.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { products: true, subProducts: true, subcategories: true } },
      },
    });

    if (!category) {
      throw new Error("Category not found");
    }

    // Unlink products referencing this subcategory
    if (category.parentId) {
      await (prisma as any).product.updateMany({
        where: { subcategoryId: id },
        data: { subcategoryId: null, subcategory: null },
      });
    } else {
      // If deleting a root category that has subcategories or products, prevent accidental wipe of canonicals
      const isCanonical = CANONICAL_MAIN_CATEGORIES.some((c) => c.name === category.name);
      if (isCanonical) {
        throw new Error(`Cannot delete default core category "${category.name}". You can manage subcategories under it.`);
      }
      await (prisma as any).product.updateMany({
        where: { categoryId: id },
        data: { categoryId: null, category: null },
      });
    }

    await (prisma as any).category.delete({ where: { id } });

    await AuditService.log({
      tenantId,
      userId,
      action: "CATEGORY_DELETE",
      details: { categoryId: id, name: category.name },
    });

    return { message: "Category deleted successfully" };
  }

  // ==================== BRANDS ====================

  static async listBrands(tenantId: string) {
    return (prisma as any).brand.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    });
  }

  static async createBrand(tenantId: string, userId: string, data: CreateBrandInput) {
    const brand = await (prisma as any).brand.create({
      data: {
        tenantId,
        name: data.name.trim(),
        description: data.description || null,
      },
    });

    await AuditService.log({
      tenantId,
      userId,
      action: "BRAND_CREATE",
      details: { brandId: brand.id, name: brand.name },
    });

    return brand;
  }

  static async updateBrand(id: string, tenantId: string, userId: string, data: UpdateBrandInput) {
    const updated = await (prisma as any).brand.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    await AuditService.log({
      tenantId,
      userId,
      action: "BRAND_UPDATE",
      details: { brandId: id, name: updated.name },
    });

    return updated;
  }

  static async deleteBrand(id: string, tenantId: string, userId: string) {
    await (prisma as any).brand.delete({ where: { id } });
    await AuditService.log({
      tenantId,
      userId,
      action: "BRAND_DELETE",
      details: { brandId: id },
    });
    return { message: "Brand deleted successfully" };
  }

  // ==================== UNITS ====================

  static async listUnits(tenantId: string) {
    let units = await (prisma as any).unit.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });

    if (units.length === 0) {
      await this.seedDefaultCatalogVariants(tenantId);
      units = await (prisma as any).unit.findMany({
        where: { tenantId },
        orderBy: { name: "asc" },
      });
    }

    return units;
  }

  static async createUnit(tenantId: string, userId: string, data: CreateUnitInput) {
    const unit = await (prisma as any).unit.create({
      data: {
        tenantId,
        name: data.name.trim(),
        symbol: data.symbol.trim(),
        productType: data.productType || "MEDICINE",
      },
    });

    await AuditService.log({
      tenantId,
      userId,
      action: "UNIT_CREATE",
      details: { unitId: unit.id, symbol: unit.symbol },
    });

    return unit;
  }

  // ==================== PRODUCTS ====================

  static async createProduct(
    tenantId: string,
    userId: string,
    data: CreateProductInput
  ) {
    const sku = data.sku && data.sku.trim() !== ""
      ? data.sku.trim()
      : `SKU-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const existing = await (prisma as any).product.findUnique({
      where: {
        tenantId_sku: {
          tenantId,
          sku,
        },
      },
    });

    if (existing) {
      throw new Error(`Product with SKU "${sku}" already exists in your catalog`);
    }

    // Resolve Category, Subcategory, Brand names
    let mainCategoryName = data.category || null;
    let mainCategoryId = data.categoryId || null;
    let subcategoryName = data.subcategory || null;
    let subcategoryId = data.subcategoryId || null;

    if (mainCategoryId) {
      const cat = await (prisma as any).category.findUnique({ where: { id: mainCategoryId } });
      if (cat) {
        // If user passed a subcategory as categoryId by mistake, resolve parent
        if (cat.parentId) {
          subcategoryId = cat.id;
          subcategoryName = cat.name;
          const parent = await (prisma as any).category.findUnique({ where: { id: cat.parentId } });
          if (parent) {
            mainCategoryId = parent.id;
            mainCategoryName = parent.name;
          }
        } else {
          mainCategoryName = cat.name;
        }
      }
    }

    if (subcategoryId && !subcategoryName) {
      const sub = await (prisma as any).category.findUnique({ where: { id: subcategoryId } });
      if (sub) {
        subcategoryName = sub.name;
        if (!mainCategoryId && sub.parentId) {
          mainCategoryId = sub.parentId;
          const parent = await (prisma as any).category.findUnique({ where: { id: sub.parentId } });
          if (parent) mainCategoryName = parent.name;
        }
      }
    }

    if (!mainCategoryName && !mainCategoryId) {
      mainCategoryName = "Medicine";
      const root = await (prisma as any).category.findFirst({
        where: { tenantId, name: "Medicine", parentId: null },
      });
      if (root) mainCategoryId = root.id;
    }

    let brandName = data.brandName || null;
    if (data.brandId && !brandName) {
      const b = await (prisma as any).brand.findUnique({ where: { id: data.brandId } });
      if (b) brandName = b.name;
    }

    const calculatedType = mapCategoryNameToProductType(mainCategoryName);
    const isMed = calculatedType === "MEDICINE";

    const product = await (prisma as any).product.create({
      data: {
        tenantId,
        name: data.name.trim(),
        genericName: data.genericName ? data.genericName.trim() : null,
        sku,
        barcode: data.barcode || null,
        basePrice: data.basePrice,
        category: mainCategoryName,
        categoryId: mainCategoryId,
        subcategory: subcategoryName,
        subcategoryId: subcategoryId,
        brandId: data.brandId || null,
        unitId: data.unitId || null,
        productType: calculatedType,
        brandName: brandName || data.manufacturer || null,
        manufacturer: data.manufacturer || brandName || null,
        unit: data.unit || (isMed ? "tablet" : "piece"),
        size: data.size || null,
        defaultPackType: data.defaultPackType || (isMed ? "BOX" : "PIECE"),
        stripsPerBox: isMed ? (data.stripsPerBox || 10) : null,
        tabletsPerStrip: isMed ? (data.tabletsPerStrip || 10) : null,

        minStockAlert: data.minStockAlert !== undefined ? data.minStockAlert : 10,
        description: data.description || null,
        imageUrl: data.imageUrl || null,
        imagePublicId: data.imagePublicId || null,
        isControlled: data.isControlled || false,
        requiresPrescription: data.requiresPrescription || false,
        isActive: true,
      },
      include: {
        categoryRef: true,
        subcategoryRef: true,
        brandRef: true,
        unitRef: true,
      },
    });

    await AuditService.log({
      tenantId,
      userId,
      action: "PRODUCT_CREATE",
      details: {
        productId: product.id,
        name: product.name,
        genericName: product.genericName,
        sku: product.sku,
        category: product.category,
        subcategory: product.subcategory,
      },
    });

    return product;
  }

  static async listProducts(tenantId: string, query: ListProductsQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    } else {
      where.isActive = true;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    } else if (query.category) {
      where.category = { equals: query.category, mode: "insensitive" };
    }

    if (query.subcategoryId) {
      where.subcategoryId = query.subcategoryId;
    } else if (query.subcategory) {
      where.subcategory = { equals: query.subcategory, mode: "insensitive" };
    }

    if (query.brandId) {
      where.brandId = query.brandId;
    }

    if (query.productType) {
      where.productType = query.productType;
    }

    if (query.isControlled !== undefined) {
      where.isControlled = query.isControlled;
    }

    if (query.requiresPrescription !== undefined) {
      where.requiresPrescription = query.requiresPrescription;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { genericName: { contains: query.search, mode: "insensitive" } },
        { sku: { contains: query.search, mode: "insensitive" } },
        { barcode: { contains: query.search, mode: "insensitive" } },
        { category: { contains: query.search, mode: "insensitive" } },
        { subcategory: { contains: query.search, mode: "insensitive" } },
        { brandName: { contains: query.search, mode: "insensitive" } },
        { manufacturer: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const includeOptions: any = {
      categoryRef: true,
      subcategoryRef: true,
      brandRef: true,
      unitRef: true,
    };

    if (query.branchId) {
      includeOptions.branchOverrides = {
        where: { branchId: query.branchId },
      };
      includeOptions.inventories = {
        where: { branchId: query.branchId, quantity: { gt: 0 } },
        orderBy: { expiryDate: "asc" },
      };
    } else {
      includeOptions.inventories = {
        where: { quantity: { gt: 0 } },
      };
    }

    const [total, products] = await Promise.all([
      (prisma as any).product.count({ where }),
      (prisma as any).product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: includeOptions,
      }),
    ]);

    // Compute effective price and aggregated stock
    const data = products.map((p: any) => {
      const override = p.branchOverrides && p.branchOverrides[0];
      const totalStock = (p.inventories || []).reduce((acc: number, inv: any) => acc + (inv.quantity || 0), 0);
      return {
        ...p,
        effectivePrice: override ? Number(override.price) : Number(p.basePrice),
        hasBranchOverride: !!override,
        currentStock: totalStock,
        batches: p.inventories || [],
      };
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getProductById(productId: string, tenantId: string, branchId?: string) {
    const includeOptions: any = {
      categoryRef: true,
      subcategoryRef: true,
      brandRef: true,
      unitRef: true,
      inventories: {
        where: branchId ? { branchId } : undefined,
        include: {
          branch: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { expiryDate: "asc" },
      },
    };

    if (branchId) {
      includeOptions.branchOverrides = { where: { branchId } };
    } else {
      includeOptions.branchOverrides = {
        include: { branch: { select: { id: true, name: true } } },
      };
    }

    const product = await (prisma as any).product.findFirst({
      where: { id: productId, tenantId },
      include: includeOptions,
    });

    if (!product) {
      throw new Error("Product not found");
    }

    const override = branchId && product.branchOverrides && product.branchOverrides[0];
    const totalStock = (product.inventories || []).reduce((acc: number, inv: any) => acc + (inv.quantity || 0), 0);

    return {
      ...product,
      effectivePrice: override ? Number(override.price) : Number(product.basePrice),
      hasBranchOverride: !!override,
      currentStock: totalStock,
      batches: product.inventories || [],
    };
  }

  static async getProductByBarcode(barcode: string, tenantId: string, branchId?: string) {
    const includeOptions: any = {
      categoryRef: true,
      subcategoryRef: true,
      brandRef: true,
      unitRef: true,
      inventories: {
        where: branchId ? { branchId } : undefined,
        include: {
          branch: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { expiryDate: "asc" },
      },
    };

    if (branchId) {
      includeOptions.branchOverrides = { where: { branchId } };
    } else {
      includeOptions.branchOverrides = {
        include: { branch: { select: { id: true, name: true } } },
      };
    }

    const product = await (prisma as any).product.findFirst({
      where: { barcode, tenantId },
      include: includeOptions,
    });

    if (!product) {
      throw new Error(`Product with barcode "${barcode}" not found`);
    }

    const override = branchId && product.branchOverrides && product.branchOverrides[0];
    const totalStock = (product.inventories || []).reduce((acc: number, inv: any) => acc + (inv.quantity || 0), 0);

    return {
      ...product,
      effectivePrice: override ? Number(override.price) : Number(product.basePrice),
      hasBranchOverride: !!override,
      currentStock: totalStock,
      batches: product.inventories || [],
    };
  }

  static async updateProduct(
    productId: string,
    tenantId: string,
    userId: string,
    data: UpdateProductInput
  ) {
    const product = await (prisma as any).product.findFirst({
      where: { id: productId, tenantId },
    });

    if (!product) {
      throw new Error("Product not found");
    }

    let categoryName = data.category !== undefined ? data.category : product.category;
    let categoryId = data.categoryId !== undefined ? data.categoryId : product.categoryId;
    let subcategoryName = data.subcategory !== undefined ? data.subcategory : product.subcategory;
    let subcategoryId = data.subcategoryId !== undefined ? data.subcategoryId : product.subcategoryId;

    if (data.categoryId && data.categoryId !== product.categoryId) {
      const cat = await (prisma as any).category.findUnique({ where: { id: data.categoryId } });
      if (cat) {
        if (cat.parentId) {
          subcategoryId = cat.id;
          subcategoryName = cat.name;
          const parent = await (prisma as any).category.findUnique({ where: { id: cat.parentId } });
          if (parent) {
            categoryId = parent.id;
            categoryName = parent.name;
          }
        } else {
          categoryId = cat.id;
          categoryName = cat.name;
        }
      }
    }

    if (data.subcategoryId !== undefined && data.subcategoryId !== product.subcategoryId) {
      if (data.subcategoryId === null || data.subcategoryId === "") {
        subcategoryId = null;
        subcategoryName = null;
      } else {
        const sub = await (prisma as any).category.findUnique({ where: { id: data.subcategoryId } });
        if (sub) {
          subcategoryId = sub.id;
          subcategoryName = sub.name;
        }
      }
    }

    const calculatedType = mapCategoryNameToProductType(categoryName);
    const isMed = calculatedType === "MEDICINE";

    const updated = await (prisma as any).product.update({
      where: { id: productId },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.genericName !== undefined && { genericName: data.genericName ? data.genericName.trim() : null }),
        ...(data.sku !== undefined && { sku: data.sku.trim() }),
        ...(data.barcode !== undefined && { barcode: data.barcode }),
        ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
        category: categoryName,
        categoryId: categoryId,
        subcategory: subcategoryName,
        subcategoryId: subcategoryId,
        productType: calculatedType,
        ...(data.brandId !== undefined && { brandId: data.brandId }),
        ...(data.unitId !== undefined && { unitId: data.unitId }),
        ...(data.brandName !== undefined && { brandName: data.brandName }),
        ...(data.manufacturer !== undefined && { manufacturer: data.manufacturer }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.size !== undefined && { size: data.size }),
        ...(data.defaultPackType !== undefined && { defaultPackType: data.defaultPackType }),
        stripsPerBox: isMed ? (data.stripsPerBox !== undefined ? data.stripsPerBox : product.stripsPerBox) : null,
        tabletsPerStrip: isMed ? (data.tabletsPerStrip !== undefined ? data.tabletsPerStrip : product.tabletsPerStrip) : null,
        ...(data.minStockAlert !== undefined && { minStockAlert: data.minStockAlert }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.imagePublicId !== undefined && { imagePublicId: data.imagePublicId }),
        ...(data.isControlled !== undefined && { isControlled: data.isControlled }),
        ...(data.requiresPrescription !== undefined && { requiresPrescription: data.requiresPrescription }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        categoryRef: true,
        subcategoryRef: true,
        brandRef: true,
        unitRef: true,
      },
    });

    await AuditService.log({
      tenantId,
      userId,
      action: "PRODUCT_UPDATE",
      details: { productId, changes: Object.keys(data) },
    });

    return updated;
  }

  static async deleteProduct(productId: string, tenantId: string, userId: string) {
    const product = await (prisma as any).product.findFirst({
      where: { id: productId, tenantId },
      include: {
        _count: { select: { saleItems: true, inventories: true } },
      },
    });

    if (!product) {
      throw new Error("Product not found");
    }

    if (product._count.saleItems > 0 || product._count.inventories > 0) {
      const deactivated = await (prisma as any).product.update({
        where: { id: productId },
        data: { isActive: false },
      });

      await AuditService.log({
        tenantId,
        userId,
        action: "PRODUCT_DEACTIVATE",
        details: { productId },
      });

      return {
        message: "Product has sales or inventory records and was deactivated.",
        product: deactivated,
      };
    }

    await (prisma as any).product.delete({ where: { id: productId } });

    await AuditService.log({
      tenantId,
      userId,
      action: "PRODUCT_DELETE",
      details: { productId },
    });

    return { message: "Product deleted permanently" };
  }

  static async bulkImport(tenantId: string, userId: string, data: BulkProductInput) {
    const results = [];

    for (const item of data.products) {
      const existing = await (prisma as any).product.findUnique({
        where: {
          tenantId_sku: {
            tenantId,
            sku: item.sku,
          },
        },
      });

      const calculatedType = mapCategoryNameToProductType(item.category);
      const isMed = calculatedType === "MEDICINE";

      if (existing) {
        const updated = await (prisma as any).product.update({
          where: { id: existing.id },
          data: {
            name: item.name,
            barcode: item.barcode || existing.barcode,
            basePrice: item.basePrice,
            category: item.category || existing.category,
            categoryId: item.categoryId || existing.categoryId,
            subcategory: item.subcategory || existing.subcategory,
            subcategoryId: item.subcategoryId || existing.subcategoryId,
            productType: calculatedType,
            brandName: item.brandName || existing.brandName,
            manufacturer: item.manufacturer || existing.manufacturer,
            unit: item.unit || existing.unit,
            size: item.size || existing.size,
            stripsPerBox: isMed ? (item.stripsPerBox || existing.stripsPerBox) : null,
            tabletsPerStrip: isMed ? (item.tabletsPerStrip || existing.tabletsPerStrip) : null,
            minStockAlert: item.minStockAlert !== undefined ? item.minStockAlert : existing.minStockAlert,
            description: item.description || existing.description,
            isControlled: item.isControlled !== undefined ? item.isControlled : existing.isControlled,
            requiresPrescription: item.requiresPrescription !== undefined ? item.requiresPrescription : existing.requiresPrescription,
            isActive: true,
          },
        });
        results.push({ action: "UPDATED", product: updated });
      } else {
        const created = await (prisma as any).product.create({
          data: {
            tenantId,
            name: item.name,
            sku: item.sku,
            barcode: item.barcode || null,
            basePrice: item.basePrice,
            category: item.category || "Medicine",
            categoryId: item.categoryId || null,
            subcategory: item.subcategory || null,
            subcategoryId: item.subcategoryId || null,
            productType: calculatedType,
            brandName: item.brandName || null,
            manufacturer: item.manufacturer || null,
            unit: item.unit || (isMed ? "tablet" : "piece"),
            size: item.size || null,
            stripsPerBox: isMed ? (item.stripsPerBox || 10) : null,
            tabletsPerStrip: isMed ? (item.tabletsPerStrip || 10) : null,
            minStockAlert: item.minStockAlert || 10,
            description: item.description || null,
            isControlled: item.isControlled || false,
            requiresPrescription: item.requiresPrescription || false,
            isActive: true,
          },
        });
        results.push({ action: "CREATED", product: created });
      }
    }

    await AuditService.log({
      tenantId,
      userId,
      action: "PRODUCT_BULK_IMPORT",
      details: { totalProcessed: results.length },
    });

    return {
      totalProcessed: results.length,
      createdCount: results.filter((r) => r.action === "CREATED").length,
      updatedCount: results.filter((r) => r.action === "UPDATED").length,
      items: results,
    };
  }

  static async updateBasePrice(
    productId: string,
    tenantId: string,
    userId: string,
    basePrice: number
  ) {
    const product = await (prisma as any).product.findFirst({
      where: { id: productId, tenantId },
    });

    if (!product) {
      throw new Error("Product not found");
    }

    const updated = await (prisma as any).product.update({
      where: { id: productId },
      data: { basePrice },
    });

    await AuditService.log({
      tenantId,
      userId,
      action: "PRICE_CENTRAL_UPDATE",
      details: { productId, oldPrice: product.basePrice, newPrice: basePrice },
    });

    return updated;
  }

  static async setBranchPriceOverride(
    productId: string,
    tenantId: string,
    userId: string,
    data: BranchPriceOverrideInput
  ) {
    const tenant = await (prisma as any).tenant.findUnique({
      where: { id: tenantId },
    });

    if (tenant.tier === "STARTER" || tenant.tier === "TRIAL") {
      throw new Error("Branch-level price overrides require a Growth or Enterprise plan");
    }

    const branch = await (prisma as any).branch.findFirst({
      where: { id: data.branchId, tenantId },
    });

    if (!branch) {
      throw new Error("Branch not found in your company");
    }

    const product = await (prisma as any).product.findFirst({
      where: { id: productId, tenantId },
    });

    if (!product) {
      throw new Error("Product not found");
    }

    const override = await (prisma as any).branchProduct.upsert({
      where: {
        branchId_productId: {
          branchId: data.branchId,
          productId,
        },
      },
      update: {
        price: data.price,
      },
      create: {
        branchId: data.branchId,
        productId,
        price: data.price,
      },
    });

    await AuditService.log({
      tenantId,
      branchId: data.branchId,
      userId,
      action: "BRANCH_PRICE_OVERRIDE_SET",
      details: { productId, branchId: data.branchId, overridePrice: data.price },
    });

    return override;
  }

  static async removeBranchPriceOverride(
    productId: string,
    branchId: string,
    tenantId: string,
    userId: string
  ) {
    const override = await (prisma as any).branchProduct.findUnique({
      where: {
        branchId_productId: {
          branchId,
          productId,
        },
      },
    });

    if (!override) {
      throw new Error("No price override found for this product and branch");
    }

    await (prisma as any).branchProduct.delete({
      where: {
        branchId_productId: {
          branchId,
          productId,
        },
      },
    });

    await AuditService.log({
      tenantId,
      branchId,
      userId,
      action: "BRANCH_PRICE_OVERRIDE_REMOVED",
      details: { productId, branchId },
    });

    return { message: "Branch price override removed. Standard base price is now active." };
  }
}
