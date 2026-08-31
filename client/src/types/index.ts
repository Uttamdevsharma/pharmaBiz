export type Role =
  | "SUPER_ADMIN"
  | "COMPANY_OWNER"
  | "REGIONAL_ADMIN"
  | "BRANCH_MANAGER"
  | "CASHIER"
  | "AUDITOR";

export type Tier = "TRIAL" | "STARTER" | "GROWTH" | "ENTERPRISE";

export interface User {
  id: string;
  tenantId: string;
  branchId: string | null;
  username: string;
  name?: string | null;
  email?: string | null;
  role: Role;
  isActive: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  tier: Tier;
  isActive: boolean;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  isTrial?: boolean;
  trialDaysRemaining?: number;
  isExpired?: boolean;
}

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  location?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive: boolean;
  users?: User[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: Tier;
  price: number;
  billingCycle: string;
  maxBranches: number;
  features?: Record<string, any>;
  isActive: boolean;
}

export type ProductType = "MEDICINE" | "SYRUP" | "EQUIPMENT" | "SALINE" | "OTHER";

export interface Category {
  id: string;
  tenantId?: string;
  name: string;
  parentId?: string | null;
  productType?: ProductType | null;
  defaultUnit?: string | null;
  description?: string | null;
  isActive: boolean;
  parent?: Category | null;
  subcategories?: Category[];
  _count?: { products?: number; subProducts?: number; subcategories?: number };
}

export interface Brand {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  _count?: { products: number };
}

export interface Unit {
  id: string;
  name: string;
  symbol: string;
  productType?: ProductType | null;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  genericName?: string | null;
  sku: string;
  barcode?: string | null;
  basePrice: number;
  effectivePrice?: number;
  hasBranchOverride?: boolean;
  category?: string | null;
  categoryId?: string | null;
  subcategory?: string | null;
  subcategoryId?: string | null;
  brandId?: string | null;
  unitId?: string | null;
  productType?: ProductType;
  brandName?: string | null;
  manufacturer?: string | null;
  unit: string;
  size?: string | null;
  defaultPackType?: string | null;
  stripsPerBox?: number | null;
  tabletsPerStrip?: number | null;
  shelfLocation?: string | null;
  minStockAlert: number;
  description?: string | null;
  imageUrl?: string | null;
  isControlled: boolean;
  requiresPrescription: boolean;
  isActive: boolean;
  currentStock?: number | null;
  categoryRef?: Category;
  subcategoryRef?: Category;
  brandRef?: Brand;
  unitRef?: Unit;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  company?: string | null;
  contactPerson?: string | null;
  totalPurchased: number;
  totalPaid: number;
  totalDue: number;
  isActive: boolean;
  _count?: { purchases: number; inventories: number };
  purchases?: any[];
}

export interface InventoryItem {
  id: string;
  branchId: string;
  productId: string;
  productName: string;
  genericName?: string | null;
  sku: string;
  barcode?: string | null;
  category?: string | null;
  subcategory?: string | null;
  brandName?: string | null;
  unit: string;
  size?: string | null;
  basePrice: number;
  sellingPrice: number;
  purchasePrice?: number | null;
  hasPriceOverride: boolean;
  isControlled: boolean;
  requiresPrescription: boolean;
  quantity: number;
  initialQuantity?: number;
  batchNumber?: string | null;
  mfgDate?: string | null;
  expiryDate?: string | null;
  packageType?: string | null;
  boxQuantity?: number | null;
  stripsPerBox?: number | null;
  tabletsPerStrip?: number | null;
  shelfLocation?: string | null;
  isLowStock: boolean;
  isExpired: boolean;
  daysUntilExpiry?: number | null;
  supplier?: { id: string; name: string; phone: string } | null;
}
