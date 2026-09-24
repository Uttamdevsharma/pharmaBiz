/**
 * Background Sync Engine for PharmaBiz Offline POS
 * Handles auto-detection of online/offline status, queueing offline checkouts,
 * pre-caching product catalogs into IndexedDB, and pushing pending sales
 * to the cloud server via /api/sync/push/sales.
 */

import { fetchApi } from "./api";
import { offlineDb, OfflineSale } from "./offlineDb";

type SyncListener = (state: SyncState) => void;

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: Date | null;
  lastError: string | null;
}

class SyncEngine {
  private listeners: Set<SyncListener> = new Set();
  private state: SyncState = {
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncedAt: null,
    lastError: null,
  };
  private autoSyncInterval: NodeJS.Timeout | null = null;
  private currentBranchId: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.updateState({ isOnline: true, lastError: null });
        this.triggerAutoSync();
      });

      window.addEventListener("offline", () => {
        this.updateState({ isOnline: false });
      });

      // Periodically refresh pending count and attempt sync if online
      this.autoSyncInterval = setInterval(() => {
        this.refreshPendingCount();
        if (this.state.isOnline && this.state.pendingCount > 0 && !this.state.isSyncing) {
          this.triggerAutoSync();
        }
      }, 15000);
    }
  }

  setBranchContext(branchId: string) {
    this.currentBranchId = branchId;
    this.refreshPendingCount();
  }

  getState(): SyncState {
    return { ...this.state };
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private updateState(partial: Partial<SyncState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((l) => l(this.getState()));
  }

  async refreshPendingCount(): Promise<number> {
    const count = await offlineDb.getPendingCount(this.currentBranchId || undefined);
    this.updateState({ pendingCount: count });
    return count;
  }

  // Pre-cache products into IndexedDB for offline search
  async cacheCatalog(branchId?: string): Promise<any[]> {
    if (!this.state.isOnline) {
      return offlineDb.getProducts(branchId);
    }

    try {
      const q = branchId && branchId !== "all" && branchId !== "" ? `?branchId=${branchId}&limit=1000` : `?limit=1000`;
      const res = await fetchApi<any>(`/products${q}`);
      if (res.success && Array.isArray(res.data)) {
        await offlineDb.saveProducts(branchId || "default", res.data);
        return res.data;
      }
    } catch (e: any) {
      console.warn("Failed to fetch fresh catalog, falling back to IndexedDB cache", e);
    }

    return offlineDb.getProducts(branchId);
  }

  // Pre-cache financial accounts
  async cacheAccounts(branchId: string): Promise<any[]> {
    if (!this.state.isOnline) {
      return offlineDb.getAccounts(branchId);
    }

    try {
      const res = await fetchApi<any>(`/accounting/accounts?branchId=${branchId}`);
      if (res.success && Array.isArray(res.data)) {
        await offlineDb.saveAccounts(branchId, res.data);
        return res.data;
      }
    } catch {
      // Fallback
    }

    return offlineDb.getAccounts(branchId);
  }

  // Pre-cache customer suggestions for offline phone number auto-suggest
  async cacheCustomers(): Promise<any[]> {
    if (!this.state.isOnline) {
      try {
        const cached = localStorage.getItem("pharmabiz_cached_customers");
        return cached ? JSON.parse(cached) : [];
      } catch {
        return [];
      }
    }

    try {
      const res = await fetchApi<any>("/sales/customers");
      if (res.success && Array.isArray(res.data)) {
        try {
          localStorage.setItem("pharmabiz_cached_customers", JSON.stringify(res.data));
        } catch {}
        return res.data;
      }
    } catch {
      // Fallback
    }

    try {
      const cached = localStorage.getItem("pharmabiz_cached_customers");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }

  // Map arbitrary payment methods to backend-accepted enums
  private normalizePaymentMethod(pm?: string, notes?: string): "CASH" | "CARD" | "MOBILE" | "BKASH" | "NAGAD" | "BANK" | "OTHER" {
    const combined = `${pm || ""} ${notes || ""}`.toUpperCase();
    if (combined.includes("BKASH")) return "BKASH";
    if (combined.includes("NAGAD")) return "NAGAD";
    if (!pm) return "CASH";
    const u = pm.toUpperCase();
    if (u === "CARD" || u.includes("CREDIT") || u.includes("DEBIT")) return "CARD";
    if (u === "BANK") return "BANK";
    if (u === "MOBILE") return "MOBILE";
    if (u === "OTHER") return "OTHER";
    return "CASH";
  }

  // Push all pending offline orders to cloud backend
  async pushPendingSales(branchId?: string): Promise<{ synced: number; failed: number }> {
    const targetBranchId = branchId || this.currentBranchId;
    if (!targetBranchId) {
      return { synced: 0, failed: 0 };
    }

    const pending = await offlineDb.getPendingSales(targetBranchId);
    if (pending.length === 0) {
      this.updateState({ pendingCount: 0 });
      return { synced: 0, failed: 0 };
    }

    if (!navigator.onLine) {
      this.updateState({ isOnline: false });
      return { synced: 0, failed: 0 };
    }

    this.updateState({ isSyncing: true, lastError: null });

    let synced = 0;
    let failed = 0;

    try {
      // Get current logged-in user ID fallback
      let fallbackUserId = "";
      try {
        const rawUser = typeof window !== "undefined" ? localStorage.getItem("user") : null;
        if (rawUser) {
          fallbackUserId = JSON.parse(rawUser)?.id || "";
        }
      } catch {}

      // Format sales for the /api/sync/push/sales endpoint
      const formattedSales = pending.map((sale) => {
        const finalUserId = (sale.userId && sale.userId.length === 36) ? sale.userId : fallbackUserId;
        const tot = Number(sale.totalAmount) || 0;
        const paid = sale.paidAmount !== undefined ? Number(sale.paidAmount) : tot;
        return {
          localId: sale.localId,
          receiptNo: sale.receiptNo,
          branchId: targetBranchId,
          userId: finalUserId,
          customerName: sale.customerName || undefined,
          customerPhone: sale.customerPhone || undefined,
          financialAccountId: sale.financialAccountId || undefined,
          subTotal: Number(sale.subTotal) || 0,
          discount: Number(sale.discount) || 0,
          tax: Number(sale.tax) || 0,
          totalAmount: tot,
          paidAmount: paid,
          dueAmount: sale.dueAmount !== undefined ? Number(sale.dueAmount) : Math.max(0, tot - paid),
          changeAmount: sale.changeAmount !== undefined ? Number(sale.changeAmount) : Math.max(0, paid - tot),
          paymentMethod: this.normalizePaymentMethod(sale.paymentMethod, sale.notes || sale.bankName || undefined),
          status: "COMPLETED" as const,
          notes: sale.notes || undefined,
          managerApprovedBy: sale.managerApprovedBy || undefined,
          prescriptionRef: sale.prescriptionRef || undefined,
          localCreatedAt: sale.localCreatedAt || new Date().toISOString(),
          items: sale.items.map((it) => {
            const mult = Number(it.unitMultiplier) || 1;
            const qty = Number(it.quantity) || 1;
            return {
              productId: it.productId,
              inventoryId: it.inventoryId || undefined,
              inventoryLocationId: it.inventoryLocationId || undefined,
              batchNumber: it.batchNumber || undefined,
              unitType: it.unitType || "PIECE",
              unitMultiplier: mult,
              lowestUnitQuantity: qty * mult,
              quantity: qty,
              unitPrice: Number(it.unitPrice) || 0,
              purchasePrice: it.purchasePrice !== undefined && it.purchasePrice !== null ? Number(it.purchasePrice) : undefined,
              subTotal: Number(it.subTotal || qty * (Number(it.unitPrice) || 0)) || 0,
            };
          }),
        };
      });

      const res = await fetchApi<any>("/sync/push/sales", {
        method: "POST",
        body: JSON.stringify({
          branchId: targetBranchId,
          sales: formattedSales,
        }),
      });

      if (res.success) {
        // Mark all successfully synced
        for (const sale of pending) {
          await offlineDb.markSaleSynced(sale.localId);
          synced++;
        }
        this.updateState({
          lastSyncedAt: new Date(),
          lastError: null,
        });
      } else {
        throw new Error(res.message || "Failed to push offline sales");
      }
    } catch (err: any) {
      failed = pending.length;
      console.error("[SyncEngine] Push failed:", err);
      this.updateState({ lastError: err.message || "Sync failed" });
    } finally {
      const remaining = await offlineDb.getPendingCount(targetBranchId);
      this.updateState({ isSyncing: false, pendingCount: remaining });
    }

    return { synced, failed };
  }

  private triggerAutoSync() {
    if (this.currentBranchId && !this.state.isSyncing) {
      this.pushPendingSales(this.currentBranchId);
    }
  }
}

export const syncEngine = new SyncEngine();
