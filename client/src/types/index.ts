export type Role =
  | "SUPER_ADMIN"
  | "CTO"
  | "PROJECT_MANAGER"
  | "COMPANY_OWNER"
  | "REGIONAL_ADMIN"
  | "BRANCH_MANAGER"
  | "MANAGER"
  | "INVENTORY_EXECUTIVE"
  | "CASHIER"
  | "ACCOUNTS"
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
  qtyPerLevel2?: number | null;
  stripsPerBox?: number | null;
  tabletsPerStrip?: number | null;
  shelfLocation?: string | null;
  minStockAlert: number;
  description?: string | null;
  isControlled: boolean;
  requiresPrescription: boolean;
  isActive: boolean;
  currentStock?: number | null;
  categoryRef?: Category;
  subcategoryRef?: Category;
  brandRef?: Brand;
  unitRef?: Unit;
}

export interface SupplierContact {
  id: string;
  tenantId?: string;
  supplierId: string;
  name: string;
  phone: string;
  email?: string | null;
  designation?: string | null;
  isPrimary?: boolean;
  isActive: boolean;
  createdAt?: string;
}

export interface SupplierPayment {
  id: string;
  tenantId: string;
  supplierId: string;
  branchId?: string | null;
  purchaseId?: string | null;
  financialAccountId?: string | null;
  amount: number;
  previousDue: number;
  remainingDue: number;
  paymentMethod?: string | null;
  reference?: string | null;
  notes?: string | null;
  paidBy?: string | null;
  paymentDate: string;
  createdAt?: string;
  supplier?: { id: string; name: string; company?: string | null; phone: string };
  branch?: { id: string; name: string };
  purchase?: { id: string; invoiceNo?: string | null; totalAmount: number };
  financialAccount?: { id: string; name: string; type: string };
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
  contacts?: SupplierContact[];
  _count?: { purchases: number; inventories: number; contacts?: number };
  purchases?: any[];
  payments?: SupplierPayment[];
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
  receivedDate?: string | null;
  createdAt?: string;
  packageType?: string | null;
  cartonQuantity?: number | null;
  boxesPerCarton?: number | null;
  boxQuantity?: number | null;
  stripsPerBox?: number | null;
  tabletsPerStrip?: number | null;
  cartonsReceived?: number | null;
  looseBoxesReceived?: number | null;
  allocatedCartons?: number | null;
  allocatedLooseBoxes?: number | null;
  fullCartons?: number | null;
  boxesInsideCartons?: number | null;
  remainingLooseBoxes?: number | null;
  totalEquivalentBoxes?: number | null;
  totalStrips?: number | null;
  totalTablets?: number | null;
  shelfLocation?: string | null;
  isLowStock: boolean;
  isExpired: boolean;
  daysUntilExpiry?: number | null;
  supplier?: { id: string; name: string; phone: string } | null;
  locations?: any[];
  receivingRecords?: BatchReceivingRecord[];
}

export interface BatchReceivingRecord {
  id: string;
  inventoryId: string;
  branchId: string;
  productId: string;
  supplierId?: string | null;
  batchNumber?: string | null;
  receivingUnit: "CARTON" | "BOX";
  cartonsReceived?: number | null;
  boxesPerCarton?: number | null;
  boxesReceived: number;
  stripsPerBox?: number | null;
  tabletsPerStrip?: number | null;
  totalQuantity: number;
  purchasePrice?: number | string | null;
  sellingPrice?: number | string | null;
  receivedDate: string;
  expiryDate?: string | null;
  mfgDate?: string | null;
  invoiceNo?: string | null;
  notes?: string | null;
  receivedBy?: string | null;
  createdAt: string;
  supplier?: { id: string; name: string; phone: string } | null;
}

