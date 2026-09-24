/**
 * Client-Side Persistent Offline Database (IndexedDB)
 * Allows cashiers to search medicines, complete checkouts, and print receipts
 * even when electricity is out and internet connection is lost.
 */

const DB_NAME = "PharmaBizOfflineDB";
const DB_VERSION = 1;

export interface OfflineProduct {
  id: string;
  name: string;
  genericName?: string | null;
  sku?: string | null;
  barcode?: string | null;
  basePrice: number;
  effectivePrice?: number | null;
  unit?: string;
  defaultPackType?: string;
  stripsPerBox?: number | null;
  tabletsPerStrip?: number | null;
  productType?: string;
  branchId?: string;
  stock?: number;
  batches?: any[];
  isControlled?: boolean;
  requiresPrescription?: boolean;
  updatedAt?: string;
}  

export interface OfflineSaleItem {
  productId: string;
  inventoryId?: string | null;
  inventoryLocationId?: string | null;
  batchNumber?: string | null;
  unitType: string;
  unitMultiplier: number;
  quantity: number;
  unitPrice: number;
  purchasePrice?: number | null;
  subTotal: number;
  name?: string;
  barcode?: string;
}

export interface OfflineSale {
  localId: string;
  receiptNo: string;
  branchId: string;
  userId: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  paymentMethod: string;
  financialAccountId?: string | null;
  bankName?: string | null;
  subTotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount?: number;
  changeAmount?: number;
  notes?: string | null;
  prescriptionRef?: string | null;
  managerApprovedBy?: string | null;
  items: OfflineSaleItem[];
  localCreatedAt: string;
  syncStatus: "PENDING" | "SYNCED" | "FAILED";
  syncError?: string | null;
  syncedAt?: string | null;
}

export interface OfflineFinancialAccount {
  id: string;
  name: string;
  type: string;
  bankName?: string | null;
  branchId: string;
  isDefault?: boolean;
}

class OfflineDbService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (typeof window === "undefined") {
      return Promise.reject(new Error("IndexedDB is only available in browser"));
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // Products store
          if (!db.objectStoreNames.contains("products")) {
            const productStore = db.createObjectStore("products", { keyPath: "id" });
            productStore.createIndex("barcode", "barcode", { unique: false });
            productStore.createIndex("name", "name", { unique: false });
            productStore.createIndex("branchId", "branchId", { unique: false });
          }

          // Offline Sales queue store
          if (!db.objectStoreNames.contains("pendingSales")) {
            const salesStore = db.createObjectStore("pendingSales", { keyPath: "localId" });
            salesStore.createIndex("syncStatus", "syncStatus", { unique: false });
            salesStore.createIndex("branchId", "branchId", { unique: false });
            salesStore.createIndex("localCreatedAt", "localCreatedAt", { unique: false });
          }

          // Financial Accounts store
          if (!db.objectStoreNames.contains("financialAccounts")) {
            const accountStore = db.createObjectStore("financialAccounts", { keyPath: "id" });
            accountStore.createIndex("branchId", "branchId", { unique: false });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    return this.dbPromise;
  }

  // ==================== PRODUCTS ====================

  async saveProducts(branchId: string, products: any[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("products", "readwrite");
      const store = tx.objectStore("products");

      products.forEach((prod) => {
        store.put({
          ...prod,
          branchId: prod.branchId || branchId,
          updatedAt: new Date().toISOString(),
        });
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getProducts(branchId?: string): Promise<any[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("products", "readonly");
      const store = tx.objectStore("products");
      const request = store.getAll();

      request.onsuccess = () => {
        const list = request.result || [];
        if (branchId && branchId !== "all" && branchId !== "") {
          const filtered = list.filter((p) => !p.branchId || p.branchId === branchId);
          resolve(filtered.length > 0 ? filtered : list);
        } else {
          resolve(list);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateProductStockLocally(productId: string, quantitySold: number): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const tx = db.transaction("products", "readwrite");
      const store = tx.objectStore("products");
      const getReq = store.get(productId);

      getReq.onsuccess = () => {
        const prod = getReq.result;
        if (prod) {
          if (typeof prod.stock === "number") {
            prod.stock = Math.max(0, prod.stock - quantitySold);
          }
          if (Array.isArray(prod.batches) && prod.batches.length > 0) {
            prod.batches[0].quantity = Math.max(0, (prod.batches[0].quantity || 0) - quantitySold);
          }
          store.put(prod);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve(); // Non-blocking
    });
  }

  // ==================== FINANCIAL ACCOUNTS ====================

  async saveAccounts(branchId: string, accounts: OfflineFinancialAccount[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("financialAccounts", "readwrite");
      const store = tx.objectStore("financialAccounts");
      accounts.forEach((acc) => store.put({ ...acc, branchId }));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getAccounts(branchId?: string): Promise<OfflineFinancialAccount[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("financialAccounts", "readonly");
      const store = tx.objectStore("financialAccounts");
      const request = store.getAll();

      request.onsuccess = () => {
        const list = request.result || [];
        if (branchId) {
          resolve(list.filter((a) => a.branchId === branchId));
        } else {
          resolve(list);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== OFFLINE SALES QUEUE ====================

  async savePendingSale(sale: OfflineSale): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("pendingSales", "readwrite");
      const store = tx.objectStore("pendingSales");
      store.put(sale);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getPendingSales(branchId?: string): Promise<OfflineSale[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("pendingSales", "readonly");
      const store = tx.objectStore("pendingSales");
      const index = store.index("syncStatus");
      const request = index.getAll("PENDING");

      request.onsuccess = () => {
        const list = (request.result || []) as OfflineSale[];
        if (branchId) {
          resolve(list.filter((s) => s.branchId === branchId));
        } else {
          resolve(list);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllSalesHistory(): Promise<OfflineSale[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("pendingSales", "readonly");
      const store = tx.objectStore("pendingSales");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async markSaleSynced(localId: string, serverReceiptNo?: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("pendingSales", "readwrite");
      const store = tx.objectStore("pendingSales");
      const getReq = store.get(localId);

      getReq.onsuccess = () => {
        const sale = getReq.result as OfflineSale;
        if (sale) {
          sale.syncStatus = "SYNCED";
          sale.syncedAt = new Date().toISOString();
          if (serverReceiptNo) {
            sale.receiptNo = serverReceiptNo;
          }
          store.put(sale);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async markSaleFailed(localId: string, errorMessage: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("pendingSales", "readwrite");
      const store = tx.objectStore("pendingSales");
      const getReq = store.get(localId);

      getReq.onsuccess = () => {
        const sale = getReq.result as OfflineSale;
        if (sale) {
          sale.syncStatus = "FAILED";
          sale.syncError = errorMessage;
          store.put(sale);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getPendingCount(branchId?: string): Promise<number> {
    try {
      const pending = await this.getPendingSales(branchId);
      return pending.length;
    } catch {
      return 0;
    }
  }
}

export const offlineDb = new OfflineDbService();
