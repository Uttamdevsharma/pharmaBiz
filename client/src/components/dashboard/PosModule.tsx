"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/lib/api";
import { showAlert, showToast } from "@/lib/swal";
import { useBranchContext } from "@/context/BranchContext";
import { useSettings } from "@/context/SettingsContext";
import { Product } from "@/types";
import { calculateLocationPackaging } from "@/lib/packaging";
import { Barcode128 } from "@/components/common/Barcode128";
import { offlineDb } from "@/lib/offlineDb";
import { syncEngine, SyncState } from "@/lib/syncEngine";
import {
  Search, Plus, Minus, Trash2, Receipt,
  Loader2, AlertCircle, Store, Printer, Barcode, CheckCircle2, X,
  MapPin, Package, ShieldAlert, ArrowRight,
  Repeat, ChevronDown, Check, User, Phone, Maximize2,
  Wifi, WifiOff, CloudOff, RefreshCw
} from "lucide-react";

interface CartItem {
  productId: string;
  name: string;
  genericName?: string | null;
  sku: string;
  barcode?: string | null;
  size?: string | null;
  productType: string;
  unitType: string;
  unitMultiplier: number;
  quantity: number;
  unitPrice: number;
  basePrice: number;
  stripsPerBox: number;
  tabletsPerStrip: number;
  tabletsPerBox: number;
  availableBaseStock: number;
  batchNumber?: string | null;
  expiryDate?: string | null;
  inventoryId?: string | null;
  inventoryLocationId?: string | null;
  shelfLocation?: string | null;
  locationLabel?: string;
  rackName?: string;
  shelfName?: string;
  binName?: string;
  isControlled: boolean;
  requiresPrescription: boolean;
  purchasePrice?: number | null;
}

interface CustomerSuggestion {
  phone: string;
  name: string;
  address?: string;
  email?: string;
}

type PackagingModel = "MEDICINE" | "BOTTLE" | "PIECE" | "VIAL";

function getProductPackagingModel(prod?: any): PackagingModel {
  if (!prod) return "MEDICINE";
  const pType = (prod.productType || "").toUpperCase();
  const packType = (prod.defaultPackType || "").toUpperCase();
  const unit = (prod.unit || "").toLowerCase();
  const cat = (prod.category || prod.categoryRef?.name || "").toLowerCase();

  if (
    packType === "BOTTLE" ||
    pType === "SYRUP" ||
    unit === "bottle" ||
    cat.includes("syrup") ||
    cat.includes("liquid") ||
    cat.includes("suspension") ||
    cat.includes("drop")
  ) {
    return "BOTTLE";
  }
  if (packType === "VIAL" || unit === "vial" || unit === "ampoule" || cat.includes("injection") || cat.includes("vial")) {
    return "VIAL";
  }
  if (
    packType === "PIECE" ||
    pType === "EQUIPMENT" ||
    pType === "OTHER" ||
    unit === "piece" ||
    unit === "pcs" ||
    unit === "pack" ||
    unit === "tin" ||
    cat.includes("equipment") ||
    cat.includes("device") ||
    cat.includes("care") ||
    cat.includes("hygiene")
  ) {
    return "PIECE";
  }
  return "MEDICINE";
}

function getAvailableSellingUnits(prod?: any): { id: string; label: string; subtext: string; multiplier: number }[] {
  const model = getProductPackagingModel(prod);
  const stripsPerBox = Number(prod?.stripsPerBox) || 10;
  const tabletsPerStrip = Number(prod?.tabletsPerStrip) || 10;
  const tabletsPerBox = stripsPerBox * tabletsPerStrip;

  switch (model) {
    case "BOTTLE":
      return [
        { id: "BOTTLE", label: "Bottle", subtext: "1 bottle", multiplier: 1 },
      ];
    case "PIECE":
      return [
        { id: "PIECE", label: "Piece", subtext: "1 item", multiplier: 1 },
        ...(stripsPerBox > 1
          ? [{ id: "BOX", label: "Box / Pack", subtext: `${stripsPerBox} pcs`, multiplier: stripsPerBox }]
          : []),
      ];
    case "VIAL":
      return [
        { id: "VIAL", label: "Vial", subtext: "1 vial / ampoule", multiplier: 1 },
        ...(stripsPerBox > 1
          ? [{ id: "BOX", label: "Box", subtext: `${stripsPerBox} vials`, multiplier: stripsPerBox }]
          : []),
      ];
    case "MEDICINE":
    default:
      return [
        { id: "TABLET", label: "Tablet", subtext: "1 tab", multiplier: 1 },
        { id: "STRIP", label: "Strip", subtext: `${tabletsPerStrip} tabs`, multiplier: tabletsPerStrip },
        { id: "BOX", label: "Box", subtext: `${stripsPerBox} strips`, multiplier: tabletsPerBox },
      ];
  }
}

function getProductUnitPrice(p?: any, batch?: any): number {
  if (batch) {
    const batchSelling = Number(batch.sellingPrice || batch.boxSellingPrice || 0);
    if (batchSelling > 0) return batchSelling;
  }
  const eff = Number(p?.effectivePrice || 0);
  if (eff > 0) return eff;
  const base = Number(p?.basePrice || 0);
  if (base > 0) return base;
  if (p?.batches && p.batches.length > 0) {
    const bPrice = Number(p.batches[0].sellingPrice || p.batches[0].boxSellingPrice || 0);
    if (bPrice > 0) return bPrice;
  }
  return 0;
}

interface PosModuleProps {
  selectedBranchId?: string;
  onNavigate?: (module: any) => void;
}

export function PosModule({ selectedBranchId: propBranchId }: PosModuleProps = {}) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const {
    branches: contextBranches,
    selectedBranchId: contextBranchId,
    setSelectedBranchId: contextSetBranchId,
    canSwitchBranch,
  } = useBranchContext();

  // Tenant Brand Logo resolution
  const [tenantLogo, setTenantLogo] = useState<string | null>(() => user?.tenant?.logoUrl || null);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  useEffect(() => {
    if (user?.tenant?.logoUrl) {
      setTenantLogo(user.tenant.logoUrl);
    } else {
      fetchApi<any>("/tenant/profile").then((res) => {
        if (res.success && res.data?.logoUrl) {
          setTenantLogo(res.data.logoUrl);
        }
      }).catch(() => {});
    }
  }, [user?.tenant?.logoUrl]);

  // Preload logo image into browser cache so it's instantly available for print
  useEffect(() => {
    const url = tenantLogo || user?.tenant?.logoUrl || settings?.logoUrl;
    if (url) {
      const preImg = new Image();
      preImg.src = url;
      preImg.onload = () => setLogoLoadFailed(false);
      preImg.onerror = () => setLogoLoadFailed(true);
    }
  }, [tenantLogo, user?.tenant?.logoUrl, settings?.logoUrl]);

  const [localBranchId, setLocalBranchId] = useState<string>("");
  const activeNavbarBranchId = propBranchId !== undefined ? propBranchId : contextBranchId;
  const fallbackStoredBranchId = typeof window !== "undefined" ? (localStorage.getItem("pharmacy_selected_branch_id") || user?.branchId || "") : "";
  const selectedBranchId = activeNavbarBranchId || localBranchId || (contextBranches.length > 0 ? contextBranches[0].id : "") || fallbackStoredBranchId;
  const branches = contextBranches;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Bill & Customer details
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customersList, setCustomersList] = useState<CustomerSuggestion[]>([]);
  const [phoneDropdownOpen, setPhoneDropdownOpen] = useState(false);

  // Financials
  const [vatSettings, setVatSettings] = useState<{ isVatEnabled: boolean; vatPercent: number }>({ isVatEnabled: false, vatPercent: 0 });
  const [taxPercent, setTaxPercent] = useState<number>(0);

  // Payment & Accounts
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [financialAccounts, setFinancialAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [paidInput, setPaidInput] = useState<string>("");
  const [managerPin, setManagerPin] = useState("");
  const [prescriptionRef, setPrescriptionRef] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Location / Batch selection modal
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [modalProduct, setModalProduct] = useState<any>(null);
  const [modalBatch, setModalBatch] = useState<any>(null);
  const [modalLocations, setModalLocations] = useState<any[]>([]);
  const [modalSelectedLoc, setModalSelectedLoc] = useState<any>(null);
  const [modalUnit, setModalUnit] = useState<string>("TABLET");
  const [modalQty, setModalQty] = useState<number>(1);
  const [modalAllocations, setModalAllocations] = useState<Record<string, { box: number; strip: number; tablet: number; qty: number }>>({});
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [modalLocationSearch, setModalLocationSearch] = useState<string>("");
  const modalQuantityInputRef = useRef<HTMLInputElement>(null);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState<number>(0);

  // Last Completed Sale Receipt Document for Direct Silent Print
  const [invoiceData, setInvoiceData] = useState<any>(null);

  // Background Sync and Offline State
  const [syncState, setSyncState] = useState<SyncState>(() => syncEngine.getState());

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const phoneContainerRef = useRef<HTMLDivElement>(null);

  // Live order identifier
  const [currentOrderId] = useState(() => Math.floor(10000000 + Math.random() * 90000000).toString());

  // Subscribe to SyncEngine state updates
  useEffect(() => {
    const unsubscribe = syncEngine.subscribe(setSyncState);
    return unsubscribe;
  }, []);

  // Load products with IndexedDB offline-first priority
  const loadPosProducts = async () => {
    try {
      setLoading(true);
      // 1. Immediately read from IndexedDB for instant UI with 0ms wait
      const branchToQuery = selectedBranchId || fallbackStoredBranchId || undefined;
      const cached = await offlineDb.getProducts(branchToQuery);
      if (cached && cached.length > 0) {
        setProducts(cached);
        setLoading(false);
      }

      // 2. Fetch fresh catalog in background when online and update IndexedDB
      if (typeof navigator !== "undefined" && navigator.onLine) {
        const fresh = await syncEngine.cacheCatalog(branchToQuery);
        if (fresh && fresh.length > 0) {
          setProducts(fresh);
        }
      }
    } catch (err) {
      console.error("Failed to load products for POS", err);
    } finally {
      setLoading(false);
    }
  };

  // Load past customers for quick auto-fill with instant offline support
  const loadCustomers = async () => {
    try {
      // 1. Immediately read from localStorage cache and offline pending sales
      const cached = typeof window !== "undefined" ? localStorage.getItem("pharmabiz_cached_customers") : null;
      let list: CustomerSuggestion[] = cached ? JSON.parse(cached) : [];

      try {
        const pendingSales = await offlineDb.getPendingSales();
        const fromPending: CustomerSuggestion[] = pendingSales
          .filter((s) => s.customerPhone)
          .map((s) => ({
            phone: s.customerPhone!,
            name: s.customerName || "Customer",
            address: s.notes?.match(/address:\s*([^\n\r|]+)/i)?.[1]?.trim() || undefined,
          }));

        const map = new Map<string, CustomerSuggestion>();
        list.forEach((c) => { if (c.phone) map.set(c.phone, c); });
        fromPending.forEach((c) => { if (c.phone) map.set(c.phone, c); });
        list = Array.from(map.values());
      } catch {}

      if (list.length > 0) {
        setCustomersList(list);
      }

      // 2. If online, fetch fresh list from server and update local cache
      if (typeof navigator !== "undefined" && navigator.onLine) {
        const fresh = await syncEngine.cacheCustomers();
        if (fresh && fresh.length > 0) {
          const map = new Map<string, CustomerSuggestion>();
          fresh.forEach((c: CustomerSuggestion) => { if (c.phone) map.set(c.phone, c); });
          list.forEach((c) => { if (c.phone && !map.has(c.phone)) map.set(c.phone, c); });
          const merged = Array.from(map.values());
          setCustomersList(merged);
          try {
            localStorage.setItem("pharmabiz_cached_customers", JSON.stringify(merged.slice(0, 200)));
          } catch {}
        }
      }
    } catch (err) {
      console.warn("Failed to load customers for POS", err);
    }
  };

  // Load accounts with IndexedDB offline-first priority
  const loadFinancialAccounts = async (branchId: string) => {
    try {
      // 1. Read from IndexedDB first
      const cachedAccs = await offlineDb.getAccounts(branchId);
      if (cachedAccs && cachedAccs.length > 0) {
        setFinancialAccounts(cachedAccs);
        if (cachedAccs.length > 0) {
          setSelectedAccountId((prev) => cachedAccs.some((a: any) => a.id === prev) ? prev || cachedAccs[0].id : cachedAccs[0].id);
        }
      }

      // 2. Fetch fresh from server if online
      if (typeof navigator !== "undefined" && navigator.onLine) {
        const freshAccs = await syncEngine.cacheAccounts(branchId);
        if (freshAccs && freshAccs.length > 0) {
          setFinancialAccounts(freshAccs);
          setSelectedAccountId((prev) => freshAccs.some((a: any) => a.id === prev) ? prev || freshAccs[0].id : freshAccs[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load financial accounts", err);
    }
  };

  // Manual Trigger to Push Pending Offline Sales to Cloud
  const handleManualSync = async () => {
    if (!selectedBranchId) return;
    try {
      showAlert.toast("Syncing offline sales to cloud...", "info");
      const res = await syncEngine.pushPendingSales(selectedBranchId);
      if (res.synced > 0) {
        showAlert.toast(`Successfully synced ${res.synced} offline sale(s) to cloud!`, "success");
        setSuccessToast(`${res.synced} offline sale(s) synced to cloud!`);
        loadPosProducts();
      } else if (res.failed > 0) {
        showAlert.toast("Failed to sync some offline sales. Please check server connection.", "error");
      } else {
        showAlert.toast("All sales are already synced!", "info");
      }
    } catch (err: any) {
      showAlert.toast(err.message || "Sync failed", "error");
    }
  };

  useEffect(() => {
    loadCustomers();
    const loadSettings = async () => {
      try {
        const vRes = await fetchApi<any>("/settings/vat");
        if (vRes.success && vRes.data) {
          setVatSettings(vRes.data);
          setTaxPercent(vRes.data.isVatEnabled && typeof vRes.data.vatPercent === "number" ? vRes.data.vatPercent : 0);
        }
      } catch {}
    };
    loadSettings();
  }, []);

  useEffect(() => {
    loadPosProducts();
    if (selectedBranchId) {
      syncEngine.setBranchContext(selectedBranchId);
      loadFinancialAccounts(selectedBranchId);
      setCart([]);
    }
  }, [selectedBranchId]);

  // Click outside listener for search & phone dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
      if (phoneContainerRef.current && !phoneContainerRef.current.contains(e.target as Node)) {
        setPhoneDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Matching items for search dropdown (shows all products + FEFO batches by default on click, filters when typing)
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();

    const results: Array<{
      product: Product;
      batch: any;
      isExpired: boolean;
      daysLeft: number | null;
      stock: number;
    }> = [];

    for (const p of products) {
      const pName = (p.name || "").toLowerCase();
      const pGeneric = (p.genericName || "").toLowerCase();
      const pBrand = (p.brandName || p.manufacturer || "").toLowerCase();
      const pSku = (p.sku || "").toLowerCase();
      const pBarcode = (p.barcode || "").toLowerCase();

      const batches = (p as any).batches || [];

      // If query is empty, show all available products with stock
      const matchesSearch = !q ||
        pName.includes(q) ||
        pGeneric.includes(q) ||
        pBrand.includes(q) ||
        pSku.includes(q) ||
        pBarcode.includes(q);

      if (batches.length > 0) {
        for (const b of batches) {
          const bNum = (b.batchNumber || "").toLowerCase();
          if (matchesSearch || bNum.includes(q)) {
            const now = new Date();
            const exp = b.expiryDate ? new Date(b.expiryDate) : null;
            const isExpired = exp ? exp < now : false;
            const daysLeft = exp ? Math.ceil((exp.getTime() - now.getTime()) / 86400000) : null;
            const stock = b.quantity || 0;

            results.push({
              product: p,
              batch: b,
              isExpired,
              daysLeft,
              stock,
            });
          }
        }
      } else if (matchesSearch) {
        const stock = p.currentStock !== undefined && p.currentStock !== null ? Number(p.currentStock) : Number((p as any).stock || 0);
        results.push({
          product: p,
          batch: null,
          isExpired: false,
          daysLeft: null,
          stock,
        });
      }
    }

    // Sort FEFO: earliest expiry first
    return results.sort((a, b) => {
      if (!a.batch?.expiryDate) return 1;
      if (!b.batch?.expiryDate) return -1;
      return new Date(a.batch.expiryDate).getTime() - new Date(b.batch.expiryDate).getTime();
    }).slice(0, 30);
  }, [products, search]);

  // Open Location Selector Dialog - Instant opening without blocking spinner
  const openLocationSelector = async (prod: any, batch: any) => {
    setModalProduct(prod);
    setModalBatch(batch);
    setSearch("");
    setSearchFocused(false);
    setModalLocationSearch("");

    const model = getProductPackagingModel(prod);
    const units = getAvailableSellingUnits(prod);
    setModalUnit(model === "MEDICINE" ? "TABLET" : (units[0]?.id || "PIECE"));
    setModalQty(1);

    // Instant local locations extraction so modal is fully ready immediately (0 delay)
    let immediateLocs: any[] = [];
    if (batch?.physicalLocations && Array.isArray(batch.physicalLocations) && batch.physicalLocations.length > 0) {
      immediateLocs = batch.physicalLocations.filter((l: any) => (l.quantity || 0) > 0);
    } else if (batch?.locations && Array.isArray(batch.locations) && batch.locations.length > 0) {
      immediateLocs = batch.locations
        .map((loc: any) => {
          const rName = loc.rack?.name || loc.rackName || "Rack 1";
          const sName = loc.shelf?.name || loc.shelfName || "Shelf A";
          const bName = loc.bin?.name || loc.binName || "Bin 1";
          return {
            id: loc.id,
            rackName: rName,
            shelfName: sName,
            binName: bName,
            locationLabel: `${rName} → ${sName} → ${bName}`,
            quantity: loc.quantity || batch.quantity || 0,
          };
        })
        .filter((l: any) => (l.quantity || 0) > 0);
    }

    if (immediateLocs.length === 0) {
      const defQty = batch?.quantity || prod.currentStock || 0;
      if (defQty > 0) {
        immediateLocs = [
          {
            id: null,
            rackName: "Main Store",
            shelfName: "Rack 1",
            binName: "Shelf A",
            locationLabel: "Main Store → Rack 1 → Shelf A",
            quantity: defQty,
          },
        ];
      }
    }

    setModalLocations(immediateLocs);
    setModalSelectedLoc(immediateLocs[0] || null);
    setModalAllocations({});
    setLoadingLocations(false);
    setLocationModalOpen(true);

    setTimeout(() => {
      modalQuantityInputRef.current?.focus();
      modalQuantityInputRef.current?.select();
    }, 50);

    // Background sync for latest physical locations without showing any blocking spinner
    try {
      if (batch?.id) {
        const res = await fetchApi<any>(`/inventory/pos-batches?branchId=${selectedBranchId}&productId=${prod.id}`);
        if (res.success && Array.isArray(res.data)) {
          const matchedBatch = res.data.find((b: any) => b.id === batch.id) || res.data[0];
          if (matchedBatch && Array.isArray(matchedBatch.physicalLocations) && matchedBatch.physicalLocations.length > 0) {
            const validLocs = matchedBatch.physicalLocations
              .filter((l: any) => (l.quantity || 0) > 0)
              .sort((a: any, b: any) => (a.quantity || 0) - (b.quantity || 0));
            if (validLocs.length > 0) {
              setModalLocations(validLocs);
              setModalSelectedLoc((prev: any) => prev || validLocs[0]);
            }
          }
        }
      }
    } catch {
      // Quiet background fallback
    }
  };

  // Close modal and return focus to main product search
  const closeModal = () => {
    setLocationModalOpen(false);
    setModalProduct(null);
    setModalBatch(null);
    setModalSelectedLoc(null);
    setModalAllocations({});
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  // Helper to obtain a consistent unique key for each location in modal
  const getLocKey = useCallback((loc: any, idx: number) => {
    return loc?.id || (loc?.rackName ? `${loc.rackName}-${loc.shelfName}-${loc.binName}` : (loc?.locationLabel || `loc-${idx}`));
  }, []);

  const modalProductModel = modalProduct ? getProductPackagingModel(modalProduct) : "MEDICINE";
  const isMedicineModel = modalProductModel === "MEDICINE";
  const stripsPerBoxCount = Number(modalProduct?.stripsPerBox) || 10;
  const tabletsPerStripCount = Number(modalProduct?.tabletsPerStrip) || 10;
  const tabletsPerBoxCount = stripsPerBoxCount * tabletsPerStripCount;

  const modalBasePrice = modalProduct ? getProductUnitPrice(modalProduct, modalBatch) : 0;
  const modalUnitsList = modalProduct ? getAvailableSellingUnits(modalProduct) : [];
  const modalSelectedUnitObj = modalUnitsList.find((u) => u.id === modalUnit) || modalUnitsList[0];
  const modalUnitMultiplier = modalSelectedUnitObj?.multiplier || 1;
  const modalUnitPrice = modalBasePrice * modalUnitMultiplier;

  const modalBoxPrice = modalBasePrice * tabletsPerBoxCount;
  const modalStripPrice = modalBasePrice * tabletsPerStripCount;
  const modalTabletPrice = modalBasePrice;

  // Filter modal locations by search & sort ascending (lowest stock first for shelf clearance)
  const filteredModalLocations = useMemo(() => {
    let list = modalLocations.filter((loc) => (loc.quantity || 0) > 0);
    const q = modalLocationSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((loc) => {
        const rName = (loc.rackName || loc.rack?.name || "").toLowerCase();
        const sName = (loc.shelfName || loc.shelf?.name || "").toLowerCase();
        const bName = (loc.binName || loc.bin?.name || "").toLowerCase();
        const lLabel = (loc.locationLabel || "").toLowerCase();
        return rName.includes(q) || sName.includes(q) || bName.includes(q) || lLabel.includes(q);
      });
    }

    // Lowest stock first (Ascending order)
    return [...list].sort((a, b) => (a.quantity || 0) - (b.quantity || 0));
  }, [modalLocations, modalLocationSearch]);

  // Update allocation for medicine (Box, Strip, Tablet) with real-time base stock guardrail
  const updateMedAlloc = useCallback(
    (locKey: string, unitType: "box" | "strip" | "tablet", newQty: number, maxLocStock: number) => {
      setModalAllocations((prev) => {
        const current = prev[locKey] || { box: 0, strip: 0, tablet: 0, qty: 0 };
        const safeQty = Math.max(0, newQty);
        const nextBox = unitType === "box" ? safeQty : (current.box || 0);
        const nextStrip = unitType === "strip" ? safeQty : (current.strip || 0);
        const nextTablet = unitType === "tablet" ? safeQty : (current.tablet || 0);

        const totalBaseNeeded = (nextBox * tabletsPerBoxCount) + (nextStrip * tabletsPerStripCount) + nextTablet;
        if (totalBaseNeeded > maxLocStock) {
          showToast(`Cannot exceed location stock (${maxLocStock} tablets).`, "warning");
          return prev;
        }

        return {
          ...prev,
          [locKey]: {
            ...current,
            [unitType]: safeQty,
          },
        };
      });
    },
    [tabletsPerBoxCount, tabletsPerStripCount]
  );

  // Update allocation for general products (Bottle, Piece, Vial)
  const updateNonMedAlloc = useCallback((locKey: string, newQty: number, maxLocStock: number) => {
    const clamped = Math.max(0, Math.min(newQty, maxLocStock));
    setModalAllocations((prev) => ({
      ...prev,
      [locKey]: { box: 0, strip: 0, tablet: 0, qty: clamped },
    }));
  }, []);

  // Quick Max allocation for a location
  const setLocMaxAlloc = useCallback(
    (locKey: string, maxLocStock: number) => {
      if (isMedicineModel) {
        const fullBoxes = Math.floor(maxLocStock / tabletsPerBoxCount);
        const remTabs = maxLocStock % tabletsPerBoxCount;
        const remStrips = Math.floor(remTabs / tabletsPerStripCount);
        const looseTabs = remTabs % tabletsPerStripCount;
        setModalAllocations((prev) => ({
          ...prev,
          [locKey]: { box: fullBoxes, strip: remStrips, tablet: looseTabs, qty: 0 },
        }));
      } else {
        setModalAllocations((prev) => ({
          ...prev,
          [locKey]: { box: 0, strip: 0, tablet: 0, qty: maxLocStock },
        }));
      }
    },
    [isMedicineModel, tabletsPerBoxCount, tabletsPerStripCount]
  );

  // Max allocation for an individual unit (Box, Strip, or Tablet) based on remaining stock
  const setLocUnitMax = useCallback(
    (locKey: string, unitType: "box" | "strip" | "tablet", maxLocStock: number) => {
      setModalAllocations((prev) => {
        const current = prev[locKey] || { box: 0, strip: 0, tablet: 0, qty: 0 };
        const otherBaseUsed =
          (unitType === "box" ? 0 : (current.box || 0) * tabletsPerBoxCount) +
          (unitType === "strip" ? 0 : (current.strip || 0) * tabletsPerStripCount) +
          (unitType === "tablet" ? 0 : (current.tablet || 0));
        const rem = Math.max(0, maxLocStock - otherBaseUsed);

        let nextBox = current.box || 0;
        let nextStrip = current.strip || 0;
        let nextTablet = current.tablet || 0;

        if (unitType === "box") {
          nextBox = Math.floor(rem / tabletsPerBoxCount);
        } else if (unitType === "strip") {
          nextStrip = Math.floor(rem / tabletsPerStripCount);
        } else if (unitType === "tablet") {
          nextTablet = rem;
        }

        return {
          ...prev,
          [locKey]: {
            ...current,
            box: nextBox,
            strip: nextStrip,
            tablet: nextTablet,
          },
        };
      });
    },
    [tabletsPerBoxCount, tabletsPerStripCount]
  );

  // Toggle location selection on/off (allows user to select location first, then adjust quantity)
  const toggleLocSelect = useCallback(
    (locKey: string, isMed: boolean, maxLocStock: number) => {
      setModalAllocations((prev) => {
        const current = prev[locKey] || { box: 0, strip: 0, tablet: 0, qty: 0 };
        const isCurrentlyAllocated = isMed
          ? ((current.box || 0) > 0 || (current.strip || 0) > 0 || (current.tablet || 0) > 0)
          : ((current.qty || 0) > 0);

        if (isCurrentlyAllocated) {
          // Deselect -> reset this location
          const copy = { ...prev };
          delete copy[locKey];
          return copy;
        } else {
          // Select -> initialize with 1 Strip (or 1 unit) if stock allows
          if (maxLocStock <= 0) return prev;
          if (isMed) {
            const canGiveStrip = tabletsPerStripCount <= maxLocStock;
            return {
              ...prev,
              [locKey]: {
                box: 0,
                strip: canGiveStrip ? 1 : 0,
                tablet: canGiveStrip ? 0 : 1,
                qty: 0,
              },
            };
          } else {
            return {
              ...prev,
              [locKey]: { box: 0, strip: 0, tablet: 0, qty: 1 },
            };
          }
        }
      });
    },
    [tabletsPerStripCount]
  );

  // Clear a specific location's allocation
  const clearLocAlloc = useCallback((locKey: string) => {
    setModalAllocations((prev) => {
      const copy = { ...prev };
      delete copy[locKey];
      return copy;
    });
  }, []);

  // Comprehensive summary data across all locations
  const modalSummary = useMemo(() => {
    let totalBoxes = 0;
    let totalStrips = 0;
    let totalTablets = 0;
    let totalQty = 0;
    let totalEstimatedPrice = 0;
    let activeLocations = 0;

    Object.entries(modalAllocations).forEach(([_, alloc]) => {
      let locActive = false;
      if (isMedicineModel) {
        const b = alloc.box || 0;
        const s = alloc.strip || 0;
        const t = alloc.tablet || 0;
        if (b > 0 || s > 0 || t > 0) {
          locActive = true;
          totalBoxes += b;
          totalStrips += s;
          totalTablets += t;
          totalEstimatedPrice += (b * modalBoxPrice) + (s * modalStripPrice) + (t * modalTabletPrice);
        }
      } else {
        const q = alloc.qty || 0;
        if (q > 0) {
          locActive = true;
          totalQty += q;
          totalEstimatedPrice += q * modalUnitPrice;
        }
      }
      if (locActive) activeLocations += 1;
    });

    const totalSelectedCount = isMedicineModel ? (totalBoxes + totalStrips + totalTablets) : totalQty;

    return {
      totalBoxes,
      totalStrips,
      totalTablets,
      totalQty,
      totalSelectedCount,
      totalEstimatedPrice,
      activeLocations,
    };
  }, [modalAllocations, isMedicineModel, modalBoxPrice, modalStripPrice, modalTabletPrice, modalUnitPrice]);

  // Modal keyboard shortcuts: Escape to close, Enter to add
  useEffect(() => {
    if (!locationModalOpen) return;
    const handleModalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
      } else if (e.key === "Enter") {
        e.preventDefault();
        confirmAddToCart();
      }
    };
    window.addEventListener("keydown", handleModalKeyDown);
    return () => window.removeEventListener("keydown", handleModalKeyDown);
  }, [locationModalOpen, modalLocations, modalAllocations, modalProduct, modalBatch, modalUnit]);

  // Confirm Add to Cart (Multi-Unit & Multi-Location Enabled)
  const confirmAddToCart = () => {
    if (!modalProduct) return;
    const prod = modalProduct;
    const batch = modalBatch;
    const model = getProductPackagingModel(prod);
    const isMed = model === "MEDICINE";

    if (batch?.expiryDate && new Date(batch.expiryDate) <= new Date()) {
      showToast("Cannot sell expired batches.", "error");
      return;
    }

    if (modalSummary.totalSelectedCount <= 0) {
      showToast("Please enter quantity for at least 1 location.", "warning");
      return;
    }

    const baseSellingPrice = getProductUnitPrice(prod, batch);
    const stripsPerBox = Number(prod.stripsPerBox) || 10;
    const tabletsPerStrip = Number(prod.tabletsPerStrip) || 10;
    const tabletsPerBox = stripsPerBox * tabletsPerStrip;

    let updatedCart = [...cart];
    let addedLinesCount = 0;

    const pushCartItem = (loc: any, unitType: string, unitMultiplier: number, quantity: number, unitPrice: number) => {
      const locLabel = loc?.locationLabel || (loc?.rackName ? `${loc.rackName} → ${loc.shelfName || ""} → ${loc.binName || ""}` : "Shelf");
      const availableStockAtLoc = loc?.quantity ?? (batch?.quantity || prod.currentStock || 0);

      const existingIdx = updatedCart.findIndex((item) =>
        item.productId === prod.id &&
        item.inventoryId === (batch?.id || null) &&
        item.inventoryLocationId === (loc?.id || null) &&
        item.unitType === unitType
      );

      if (existingIdx >= 0) {
        const existing = updatedCart[existingIdx];
        const newQty = existing.quantity + quantity;
        const totalUnits = newQty * unitMultiplier;
        if (totalUnits > existing.availableBaseStock) {
          showToast(`Cannot add more. Max available stock is ${existing.availableBaseStock} for ${locLabel}.`, "warning");
          return;
        }
        updatedCart[existingIdx] = { ...existing, quantity: newQty, unitPrice };
      } else {
        updatedCart.push({
          productId: prod.id,
          name: prod.name,
          genericName: prod.genericName || null,
          sku: prod.sku,
          barcode: prod.barcode || batch?.barcode || null,
          size: prod.size,
          productType: model,
          unitType,
          unitMultiplier,
          quantity,
          unitPrice,
          basePrice: baseSellingPrice,
          stripsPerBox,
          tabletsPerStrip,
          tabletsPerBox,
          availableBaseStock: availableStockAtLoc,
          batchNumber: batch?.batchNumber || "Default",
          expiryDate: batch?.expiryDate || null,
          inventoryId: batch?.id || null,
          inventoryLocationId: loc?.id || null,
          shelfLocation: locLabel,
          locationLabel: locLabel,
          rackName: loc?.rackName,
          shelfName: loc?.shelfName,
          binName: loc?.binName,
          isControlled: prod.isControlled,
          requiresPrescription: prod.requiresPrescription,
          purchasePrice: batch?.purchasePrice || null,
        });
      }
      addedLinesCount += 1;
    };

    modalLocations.forEach((loc, idx) => {
      const k = getLocKey(loc, idx);
      const alloc = modalAllocations[k];
      if (!alloc) return;

      if (isMed) {
        if (alloc.box > 0) {
          pushCartItem(loc, "BOX", tabletsPerBox, alloc.box, baseSellingPrice * tabletsPerBox);
        }
        if (alloc.strip > 0) {
          pushCartItem(loc, "STRIP", tabletsPerStrip, alloc.strip, baseSellingPrice * tabletsPerStrip);
        }
        if (alloc.tablet > 0) {
          pushCartItem(loc, "TABLET", 1, alloc.tablet, baseSellingPrice);
        }
      } else {
        if (alloc.qty > 0) {
          pushCartItem(loc, modalUnit, modalUnitMultiplier, alloc.qty, modalUnitPrice);
        }
      }
    });

    setCart(updatedCart);
    showToast(`Added to cart successfully from ${modalSummary.activeLocations} location(s).`, "success");

    setLocationModalOpen(false);
    setModalProduct(null);
    setModalBatch(null);
    setModalSelectedLoc(null);
    setModalAllocations({});
    setSearch("");
    setSearchFocused(false);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  // Update Cart Quantity
  const updateCartQuantity = (idx: number, newQty: number) => {
    if (newQty <= 0) {
      setCart((prev) => prev.filter((_, i) => i !== idx));
      return;
    }
    setCart((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      const totalBaseUnits = newQty * item.unitMultiplier;
      if (totalBaseUnits > item.availableBaseStock) {
        showToast(`Stock limit reached. Max available: ${item.availableBaseStock} base units.`, "warning");
        return item;
      }
      return { ...item, quantity: newQty };
    }));
  };

  // Change Unit Type inside Cart Table
  const handleCartUnitChange = (idx: number, newUnit: string) => {
    setCart((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      let multiplier = 1;
      if (newUnit === "BOX") multiplier = item.tabletsPerBox;
      else if (newUnit === "STRIP") multiplier = item.tabletsPerStrip;
      const unitPrice = item.basePrice * multiplier;
      return { ...item, unitType: newUnit, unitMultiplier: multiplier, unitPrice };
    }));
  };

  // Select customer from suggestions
  const selectCustomer = (cust: CustomerSuggestion) => {
    setCustomerPhone(cust.phone);
    setCustomerName(cust.name);
    if (cust.address) setCustomerAddress(cust.address);
    setPhoneDropdownOpen(false);
  };

  // Filtered customer suggestions
  const filteredCustomers = useMemo(() => {
    const q = customerPhone.trim();
    if (!q) return customersList.slice(0, 20);
    return customersList.filter((c) =>
      c.phone.includes(q) || (c.name && c.name.toLowerCase().includes(q.toLowerCase()))
    ).slice(0, 20);
  }, [customersList, customerPhone]);

  // Financial calculations (Auto-rounded to integer, e.g. 275.80 -> 276)
  const totalCartUnits = cart.reduce((acc, item) => acc + item.quantity, 0);
  const rawSubTotal = cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const subTotal = Math.round(rawSubTotal);
  const rawTax = taxPercent > 0 ? (rawSubTotal * (taxPercent / 100)) : 0;
  const taxAmount = Math.round(rawTax);
  const grandTotal = Math.round(Math.max(0, rawSubTotal + rawTax));
  const numericPaid = paidInput !== "" ? Math.round(parseFloat(paidInput) || 0) : grandTotal;
  const dueAmount = Math.max(0, grandTotal - numericPaid);
  const changeAmount = Math.max(0, numericPaid - grandTotal);

  const hasRxItems = cart.some((i) => i.requiresPrescription);
  const hasControlledDrugs = cart.some((i) => i.isControlled);
  const isPhoneInvalid = customerPhone.length > 0 && customerPhone.length !== 11;

  // Final Checkout Submission (Direct One-Click Sale with Immediate Receipt Preview)
  const handleCheckout = async () => {
    if (cart.length === 0 || !selectedBranchId) return;

    if (hasRxItems && !prescriptionRef.trim()) {
      setError("Prescription required: Please enter Doctor / Rx reference for prescribed medicine.");
      return;
    }
    if (hasControlledDrugs && !managerPin.trim()) {
      setError("Controlled drugs require manager approval PIN.");
      return;
    }
    if (financialAccounts.length === 0 || !selectedAccountId) {
      setError("No active financial account exists for this branch.");
      return;
    }

    const chosenAccount = financialAccounts.find((a) => a.id === selectedAccountId);
    if (!chosenAccount) {
      setError("Selected financial account is invalid.");
      return;
    }

    try {
      setCheckingOut(true);
      setError(null);

      let finalNotes = `POS Sale`;
      if (customerAddress.trim()) finalNotes += ` | Address: ${customerAddress.trim()}`;
      if (chosenAccount.name) finalNotes += ` | Account: ${chosenAccount.name}`;

      const payload = {
        branchId: selectedBranchId,
        customerName: customerName.trim() || "Walk-in Customer",
        customerPhone: customerPhone.trim() || null,
        paymentMethod: chosenAccount.type || paymentMethod,
        financialAccountId: chosenAccount.id,
        bankName: chosenAccount.bankName || chosenAccount.name,
        notes: finalNotes,
        discount: 0,
        discountType: "FIXED" as const,
        tax: taxAmount,
        paidAmount: numericPaid,
        prescriptionRef: prescriptionRef.trim() || null,
        managerApprovedBy: managerPin.trim() || null,
        items: cart.map((item) => ({
          productId: item.productId,
          inventoryId: item.inventoryId || null,
          inventoryLocationId: item.inventoryLocationId || null,
          batchNumber: item.batchNumber || null,
          unitType: item.unitType,
          unitMultiplier: item.unitMultiplier,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      };

      let receiptNumber = `INV-${currentOrderId}`;
      let isOfflineSale = false;

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        isOfflineSale = true;
      } else {
        try {
          const res = await fetchApi<any>("/sales", { method: "POST", body: JSON.stringify(payload) });
          if (res.success && res.data) {
            receiptNumber = res.data.receiptNo || receiptNumber;
          } else {
            throw new Error(res.message || "Failed to process sale");
          }
        } catch (apiErr: any) {
          // If electricity cut or connection down, gracefully fallback to offline checkout!
          const isNetErr =
            typeof navigator !== "undefined" &&
            (!navigator.onLine ||
              apiErr.message?.includes("fetch") ||
              apiErr.message?.includes("Network") ||
              apiErr.message?.includes("Failed to fetch") ||
              apiErr.message?.includes("504") ||
              apiErr.message?.includes("502"));
          if (isNetErr) {
            isOfflineSale = true;
          } else {
            throw apiErr;
          }
        }
      }

      if (isOfflineSale) {
        receiptNumber = `OFFLINE-${Math.floor(100000 + Math.random() * 900000)}`;

        // Save to IndexedDB pending queue
        await offlineDb.savePendingSale({
          localId:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `loc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          receiptNo: receiptNumber,
          branchId: selectedBranchId,
          userId: user?.id || "offline-cashier",
          customerName: customerName.trim() || null,
          customerPhone: customerPhone.trim() || null,
          customerEmail: null,
          paymentMethod: chosenAccount.type || paymentMethod,
          financialAccountId: chosenAccount.id,
          bankName: chosenAccount.bankName || chosenAccount.name,
          subTotal,
          discount: 0,
          tax: taxAmount,
          totalAmount: grandTotal,
          paidAmount: numericPaid,
          dueAmount: Math.max(0, grandTotal - numericPaid),
          changeAmount: Math.max(0, numericPaid - grandTotal),
          notes: finalNotes,
          prescriptionRef: prescriptionRef.trim() || null,
          managerApprovedBy: managerPin.trim() || null,
          items: cart.map((it) => ({
            productId: it.productId,
            inventoryId: it.inventoryId || null,
            inventoryLocationId: it.inventoryLocationId || null,
            batchNumber: it.batchNumber || null,
            unitType: it.unitType,
            unitMultiplier: it.unitMultiplier,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            purchasePrice: it.purchasePrice ?? it.basePrice ?? null,
            subTotal: it.unitPrice * it.quantity,
            name: it.name,
            barcode: it.barcode || undefined,
          })),
          localCreatedAt: new Date().toISOString(),
          syncStatus: "PENDING",
        });

        // Decrement local stock in IndexedDB
        for (const it of cart) {
          await offlineDb.updateProductStockLocally(it.productId, it.quantity);
        }

        // Decrement in local React state
        setProducts((prev) =>
          prev.map((p) => {
            const match = cart.find((ci) => ci.productId === p.id);
            if (!match) return p;
            const curStock = typeof p.currentStock === "number" ? p.currentStock : ((p as any).stock ?? 0);
            return {
              ...p,
              currentStock: Math.max(0, curStock - match.quantity),
            };
          })
        );

        await syncEngine.refreshPendingCount();
        showAlert.toast("Sale saved in Offline Mode! Queued for auto-sync.", "warning");
        setSuccessToast("Sale saved in Offline Mode (Auto-sync when online)");
      } else {
        showAlert.toast("Payment submitted successfully!", "success");
        setSuccessToast("Payment submitted successfully!");
      }

      // Cache customer locally
      if (customerPhone.trim()) {
        const newCust: CustomerSuggestion = {
          phone: customerPhone.trim(),
          name: customerName.trim() || "Customer",
          address: customerAddress.trim() || undefined,
        };
        const updatedCusts = [newCust, ...customersList.filter((c) => c.phone !== newCust.phone)];
        setCustomersList(updatedCusts);
        try {
          localStorage.setItem("pharmabiz_cached_customers", JSON.stringify(updatedCusts.slice(0, 100)));
        } catch {}
      }

      // Prepare complete thermal receipt document
      const branchObj = branches.find((b) => b.id === selectedBranchId);
      const activeLogo = tenantLogo || user?.tenant?.logoUrl || settings?.logoUrl || null;
      const receiptDoc = {
        pharmacy: {
          name: user?.tenant?.name || settings?.siteName || "Shapla Pharmacy",
          logoUrl: activeLogo,
          branchName: branchObj?.name || "Main Branch",
          address: branchObj?.location || "Dhanmondi, Dhaka",
          phone: branchObj?.phone || user?.tenant?.phone || "01701560326",
          email: branchObj?.email || user?.tenant?.email || "uttam23412@gmail.com",
          website: (user?.tenant as any)?.website || "www.petvet-bd.com",
        },
        invoice: {
          receiptNo: receiptNumber,
          date: new Date().toISOString(),
          cashier: user?.name || "Akash Mahmud",
          customerName: customerName.trim() || "WALK-IN CUSTOMER",
          customerPhone: customerPhone.trim() || "—",
          items: cart.map((item) => ({
            name: item.name,
            barcode: item.barcode || "37000035058697",
            unitType: item.unitType,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subTotal: item.unitPrice * item.quantity,
          })),
          totalQuantity: totalCartUnits,
          subTotal,
          discount: 0,
          deliveryCharge: 0,
          totalAmount: grandTotal,
          paidAmount: numericPaid,
          dueAmount,
        },
      };

      setInvoiceData(receiptDoc);
      showAlert.toast("Payment submitted successfully!", "success");
      setSuccessToast("Payment submitted successfully!");
      setTimeout(() => setSuccessToast(null), 4000);

      // Ensure logo image is fully ready before triggering browser print dialog
      const triggerPrintWithLogo = () => {
        if (activeLogo && !logoLoadFailed) {
          const testImg = new Image();
          testImg.src = activeLogo;
          if (testImg.complete && testImg.naturalWidth > 0) {
            setTimeout(() => window.print(), 100);
          } else {
            testImg.onload = () => setTimeout(() => window.print(), 100);
            testImg.onerror = () => {
              setLogoLoadFailed(true);
              setTimeout(() => window.print(), 100);
            };
            setTimeout(() => window.print(), 600);
          }
        } else {
          setTimeout(() => window.print(), 150);
        }
      };
      triggerPrintWithLogo();

      // Reset cart and customer inputs
      setCart([]);
      setPaidInput("");
      setCustomerPhone("");
      setCustomerName("");
      setCustomerAddress("");
      setPrescriptionRef("");
      setManagerPin("");

      loadPosProducts();
      loadFinancialAccounts(selectedBranchId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCheckingOut(false);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2" || (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA")) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchFocused(true);
      }
      if (e.key === "F7") {
        e.preventDefault();
        setCart([]);
        setSearch("");
      }
      if (e.key === "F9" || (e.ctrlKey && e.key === "Enter")) {
        if (cart.length > 0 && !checkingOut) {
          e.preventDefault();
          handleCheckout();
        }
      }
      if (e.key === "Escape") {
        if (locationModalOpen) setLocationModalOpen(false);
        else setSearchFocused(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, checkingOut, locationModalOpen]);

  // Clean Native Print (triggers browser print without blank page)
  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 space-y-2 select-none text-slate-800 dark:text-slate-200">
      {/* Success Notification Banner */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 font-bold text-sm animate-bounce">
          <CheckCircle2 className="h-5 w-5" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Network Connectivity & Offline Cloud Sync Status Bar */}
      <div className="shrink-0 px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between text-xs transition-colors">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Online/Offline Badge */}
          {syncState.isOnline ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Wifi className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <span>Online Mode</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 font-bold shadow-xs">
              <WifiOff className="h-3 w-3 text-amber-600 dark:text-amber-400 animate-pulse" />
              <span>Offline POS (Electricity/Internet Cut)</span>
            </div>
          )}

          {/* Pending Sales Queued in IndexedDB */}
          {syncState.pendingCount > 0 && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-extrabold animate-pulse">
              <CloudOff className="h-3 w-3 text-amber-700 dark:text-amber-400" />
              <span>{syncState.pendingCount} offline bill{syncState.pendingCount > 1 ? "s" : ""} waiting to sync</span>
            </div>
          )}

          {syncState.lastSyncedAt && syncState.pendingCount === 0 && (
            <span className="hidden md:inline text-slate-400 text-[11px]">
              Last cloud sync: {new Date(syncState.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* Action button & Counter Selector */}
        <div className="flex items-center gap-3">
          {syncState.isOnline && syncState.pendingCount > 0 && (
            <button
              onClick={handleManualSync}
              disabled={syncState.isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold transition shadow-xs disabled:opacity-50 cursor-pointer text-xs"
            >
              <RefreshCw className={`h-3 w-3 ${syncState.isSyncing ? "animate-spin" : ""}`} />
              <span>{syncState.isSyncing ? "Syncing to Cloud..." : "Sync Now"}</span>
            </button>
          )}

          {!activeNavbarBranchId && canSwitchBranch && branches.length > 1 ? (
            <div className="flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <select
                value={selectedBranchId}
                onChange={(e) => setLocalBranchId(e.target.value)}
                className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold outline-none cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
              <Store className="h-3.5 w-3.5 text-emerald-600" />
              <span>Counter: <strong>{branches.find((b) => b.id === selectedBranchId)?.name || "Main Branch"}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TWO COLUMN POS LAYOUT (Optimized Responsive Cashier Layout)               */}
      {/* ========================================================================= */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-2.5 sm:gap-3 items-stretch overflow-hidden">
        {/* LEFT COLUMN: SEARCH BAR & ACTIVE CART TABLE (~70% width) */}
        <div className="flex-1 min-w-0 lg:w-[68%] xl:w-[70%] flex flex-col min-h-0 space-y-2 pb-12 sm:pb-14">
          {/* SEARCH ROW (Left-width only + Exchange F7) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Search Input with instant dropdown */}
            <div ref={searchContainerRef} className="relative flex-1">
              <div className="flex items-center h-12 bg-white dark:bg-slate-900 border-2 border-emerald-500/50 hover:border-emerald-500 focus-within:border-emerald-600 focus-within:ring-4 focus-within:ring-emerald-500/15 rounded-2xl shadow-xs px-3.5 transition">
                <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-center mr-3 shrink-0 text-emerald-600 dark:text-emerald-400">
                  <Search className="h-4.5 w-4.5" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Enter Product ID / SKU / Name or Barcode (Press /)"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSearchFocused(true);
                    setSelectedSearchIndex(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown" && searchResults.length > 0) {
                      e.preventDefault();
                      setSelectedSearchIndex((prev) => Math.min(searchResults.length - 1, prev + 1));
                    } else if (e.key === "ArrowUp" && searchResults.length > 0) {
                      e.preventDefault();
                      setSelectedSearchIndex((prev) => Math.max(0, prev - 1));
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      if (searchResults.length > 0) {
                        const target = searchResults[selectedSearchIndex] || searchResults[0];
                        if (target) openLocationSelector(target.product, target.batch);
                      }
                    } else if (e.key === "Escape") {
                      setSearchFocused(false);
                    }
                  }}
                  onClick={() => setSearchFocused(true)}
                  className="w-full bg-transparent text-base font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal outline-none"
                />
                <div className="flex items-center gap-2 text-slate-400 pl-2 shrink-0">
                  {search ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearch("");
                        setSearchFocused(false);
                      }}
                      className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                    <Barcode className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                    <span>Scan</span>
                  </div>
                  <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-mono font-black text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md">
                    /
                  </kbd>
                </div>
              </div>

              {/* INSTANT FEFO DROPDOWN */}
              {searchFocused && searchResults.length > 0 && (
                <div
                  onMouseDown={(e) => e.preventDefault()}
                  className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border-2 border-emerald-500/50 rounded-xl shadow-2xl max-h-[400px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 content-scrollbar"
                >
                  {searchResults.map(({ product, batch, isExpired, daysLeft, stock }, idx) => {
                    const isKeySelected = idx === selectedSearchIndex;
                    const barcodeVal = batch?.barcode || product.barcode || product.sku || "—";
                    const variantStr = product.size || (product.unit ? `Unit: ${product.unit}` : "- - -");
                    return (
                      <div
                        key={`${product.id}-${batch?.id || idx}`}
                        onClick={() => openLocationSelector(product, batch)}
                        onMouseEnter={() => setSelectedSearchIndex(idx)}
                        className={`p-3.5 cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                          isKeySelected
                            ? "bg-emerald-100/80 dark:bg-emerald-950/60 ring-2 ring-emerald-500 rounded-lg"
                            : "hover:bg-emerald-50/80 dark:hover:bg-emerald-950/30"
                        } ${isExpired ? "opacity-75 bg-rose-50/30 dark:bg-rose-950/20" : ""}`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="text-[15px] font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                            <span className="text-slate-500 dark:text-slate-400 font-mono text-xs font-bold">Barcode: {barcodeVal}</span>
                            <span className="text-slate-900 dark:text-white font-extrabold">{product.name}</span>
                            {product.requiresPrescription && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold border border-rose-300">
                                Rx
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            Product ID: <span className="text-slate-700 dark:text-slate-300 font-bold">{product.id.slice(0, 8)}</span>, SKU: <span className="text-slate-700 dark:text-slate-300 font-bold">{product.sku || "—"}</span>, Variant: <span className="text-slate-700 dark:text-slate-300 font-bold">{variantStr}</span>
                            {product.genericName && (
                              <span className="text-emerald-700 dark:text-emerald-400 ml-1.5 font-bold">({product.genericName})</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono">
                            Stock: {stock.toLocaleString()}
                          </span>

                          {isExpired ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-700 border border-rose-300">
                              Expire: Expired ({Math.abs(daysLeft || 0)} days ago)
                            </span>
                          ) : daysLeft !== null ? (
                            <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${daysLeft <= 90
                              ? "bg-amber-100 text-amber-800 border-amber-300"
                              : "bg-emerald-100 text-emerald-800 border-emerald-300"
                            }`}>
                              Expire: {daysLeft} days left
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">
                              No Expiry
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Empty state notice */}
              {searchFocused && search.trim().length > 0 && searchResults.length === 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center text-xs text-slate-500 shadow-lg">
                  No matching medicine or batches found for &ldquo;{search}&rdquo;
                </div>
              )}
            </div>

            {/* Exchange (F7) Button - Large Font & Prominent Styling with Primary Brand Color */}
            <button
              type="button"
              onClick={() => {
                setCart([]);
                setSearch("");
              }}
              style={{ backgroundColor: "var(--primary-color, #059669)" }}
              title="Reset or Exchange sale (F7)"
              className="h-12 flex items-center gap-2 px-5 sm:px-6 bg-emerald-600 hover:brightness-95 text-white rounded-2xl text-sm sm:text-base font-black transition shrink-0 cursor-pointer shadow-sm hover:shadow active:scale-97"
            >
              <Repeat className="h-5 w-5" />
              <span>Exchange (F7)</span>
            </button>
          </div>

          {/* ACTIVE CART TABLE WITH PRIMARY BRAND HEADER */}
          <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between">
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto content-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                {/* Sticky Primary Brand Color Table Header */}
                <thead
                  style={{ backgroundColor: "var(--primary-color, #059669)" }}
                  className="sticky top-0 z-10 bg-emerald-600 dark:bg-emerald-700 text-white font-black text-sm uppercase tracking-wider shadow-sm"
                >
                  <tr>
                    <th className="py-3.5 px-4 whitespace-nowrap">Barcode</th>
                    <th className="py-3.5 px-4">Product Name</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Batch & Expiry</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Location</th>
                    <th className="py-3.5 px-3 text-center whitespace-nowrap">Unit</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Price</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Qty</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Total</th>
                    <th className="py-3.5 px-2 text-center w-9"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-200">
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-14 sm:py-18 text-center text-slate-400">
                        <Barcode className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Sale cart is empty</p>
                        <p className="text-xs text-slate-400 mt-1">Click the search bar above to view products or scan barcode.</p>
                      </td>
                    </tr>
                  ) : (
                    cart.map((item, idx) => (
                      <tr key={`${item.productId}-${item.inventoryId}-${item.inventoryLocationId}-${item.unitType}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        {/* Barcode */}
                        <td className="py-3 px-3.5 font-mono text-slate-500 dark:text-slate-400 font-bold text-xs whitespace-nowrap">
                          {item.barcode || item.sku || "—"}
                        </td>

                        {/* Product Name */}
                        <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-white max-w-[240px]">
                          <div className="truncate text-[14.5px] font-extrabold leading-snug">{item.name}</div>
                          {item.genericName && (
                            <div className="text-xs text-emerald-600 dark:text-emerald-400 truncate font-semibold mt-0.5">{item.genericName}</div>
                          )}
                        </td>

                        {/* Batch & Expiry */}
                        <td className="py-3 px-3.5 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          <div className="font-bold">{item.batchNumber || "—"}</div>
                          {item.expiryDate && (
                            <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                              Exp: {new Date(item.expiryDate).toLocaleDateString("en-GB")}
                            </div>
                          )}
                        </td>

                        {/* Location */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold inline-flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span>{item.locationLabel || item.shelfLocation || "Shelf"}</span>
                          </span>
                        </td>

                        {/* Unit */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {item.productType === "MEDICINE" ? (
                            <select
                              value={item.unitType}
                              onChange={(e) => handleCartUnitChange(idx, e.target.value)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold outline-none cursor-pointer"
                            >
                              <option value="TABLET">Tab</option>
                              <option value="STRIP">Strip ({item.tabletsPerStrip})</option>
                              <option value="BOX">Box ({item.tabletsPerBox})</option>
                            </select>
                          ) : (
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded">{item.unitType}</span>
                          )}
                        </td>

                        {/* Price */}
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200 text-sm whitespace-nowrap">
                          ৳{Math.round(item.unitPrice).toLocaleString()}
                        </td>

                        {/* Qty Counter */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(idx, item.quantity - 1)}
                              className="h-6 w-6 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-8 text-center font-black text-[13px] font-mono text-slate-900 dark:text-white">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(idx, item.quantity + 1)}
                              className="h-6 w-6 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Line Total */}
                        <td className="py-3 px-3.5 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-[15px] whitespace-nowrap">
                          ৳{Math.round(item.unitPrice * item.quantity).toLocaleString()}
                        </td>

                        {/* Delete Button */}
                        <td className="py-3 px-2 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(idx, 0)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Total Items Summary (F2/F7 suggestions removed, showing selected product count on right) */}
            <div className="shrink-0 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 font-bold">
              <span className="text-slate-400 text-xs font-semibold">Selected Products</span>
              <div>
                Total Items: <strong className="text-slate-900 dark:text-white font-mono text-xs ml-1.5 px-2.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md">{totalCartUnits}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: "BILL DETAILS" SECTION (~30% width) */}
        <div className="w-full lg:w-[32%] xl:w-[30%] min-w-[310px] max-w-[430px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col h-full overflow-hidden shrink-0">
          {/* Header with Live Order # */}
          <div className="shrink-0 px-4 sm:px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Bill Details</h3>
            <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">#{currentOrderId}</span>
          </div>

          {error && (
            <div className="shrink-0 mx-4 sm:mx-5 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Unified Content Flow (No empty gap in middle, larger clear font sizes) */}
          <div className="flex-1 min-h-0 overflow-y-auto content-scrollbar px-4 sm:px-5 py-4 space-y-4">
            {/* Customer Details: Phone with Dropdown & Autocomplete */}
            <div className="space-y-3.5">
              <div ref={phoneContainerRef} className="relative">
                <label className="text-sm font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                  Phone
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter Customer Phone"
                    value={customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(e.target.value);
                      setPhoneDropdownOpen(true);
                    }}
                    onFocus={() => {
                      setPhoneDropdownOpen(true);
                      if (customersList.length === 0) loadCustomers();
                    }}
                    onClick={() => {
                      setPhoneDropdownOpen(true);
                      if (customersList.length === 0) loadCustomers();
                    }}
                    className="w-full h-11 px-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 rounded-xl text-base font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setPhoneDropdownOpen(!phoneDropdownOpen)}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                {/* Customer Autocomplete Dropdown */}
                {phoneDropdownOpen && filteredCustomers.length > 0 && (
                  <div
                    onMouseDown={(e) => e.preventDefault()}
                    className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800"
                  >
                    {filteredCustomers.map((cust, i) => (
                      <div
                        key={`${cust.phone}-${i}`}
                        onClick={() => selectCustomer(cust)}
                        className="p-3 text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white font-mono text-sm">{cust.phone}</div>
                          <div className="text-xs text-slate-500">{cust.name} {cust.address ? `• ${cust.address}` : ""}</div>
                        </div>
                        <span className="text-xs text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">Select</span>
                      </div>
                    ))}
                  </div>
                )}

                {isPhoneInvalid && (
                  <span className="text-xs font-bold text-rose-600 mt-1 block">
                    Invalid Number (Must have 11 digits)
                  </span>
                )}
              </div>

              {/* Customer Name */}
              <div>
                <label className="text-sm font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="Enter Customer Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 rounded-xl text-base font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
                />
              </div>

              {/* Customer Address */}
              <div>
                <label className="text-sm font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                  Address
                </label>
                <input
                  type="text"
                  placeholder="Enter Customer Address"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 rounded-xl text-base font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
                />
              </div>
            </div>

            {/* Rx Prescription / Manager PIN requirements */}
            {hasRxItems && (
              <div className="space-y-1.5 pt-1">
                <label className="text-sm font-bold text-rose-600 block">Doctor / Rx Reference *</label>
                <input
                  type="text"
                  placeholder="Doctor Name / Rx Reference"
                  value={prescriptionRef}
                  onChange={(e) => setPrescriptionRef(e.target.value)}
                  className="w-full h-11 px-3.5 bg-rose-50 border border-rose-300 rounded-xl text-sm font-bold text-slate-900 outline-none"
                />
              </div>
            )}

            {hasControlledDrugs && (
              <div className="space-y-1.5 pt-1">
                <label className="text-sm font-bold text-amber-600 block">Manager Approval PIN *</label>
                <input
                  type="text"
                  placeholder="Manager PIN"
                  value={managerPin}
                  onChange={(e) => setManagerPin(e.target.value)}
                  className="w-full h-11 px-3.5 bg-amber-50 border border-amber-300 rounded-xl text-sm font-bold text-slate-900 outline-none"
                />
              </div>
            )}

            {/* Payment Receiving Account */}
            <div className="pt-1">
              <label className="text-sm font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                Payment Receiving Account:
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => {
                  setSelectedAccountId(e.target.value);
                  const acct = financialAccounts.find((a) => a.id === e.target.value);
                  if (acct) setPaymentMethod(acct.type || "CASH");
                }}
                className="w-full h-11 px-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
              >
                {financialAccounts.map((acct) => (
                  <option key={acct.id} value={acct.id}>
                    {acct.name} ({acct.type}) — Bal: ৳{Math.round(acct.balance || 0).toLocaleString("en-BD")}
                  </option>
                ))}
              </select>
            </div>

            {/* Clean Section Divider */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-3.5">
              {/* Subtotal & VAT */}
              <div className="space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex justify-between font-bold">
                  <span className="text-slate-700 dark:text-slate-300">Subtotal:</span>
                  <span className="font-mono text-base font-black text-slate-900 dark:text-white">৳{subTotal.toLocaleString()}</span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between font-bold text-slate-600 dark:text-slate-400">
                    <span className="text-slate-700 dark:text-slate-300">VAT ({taxPercent}%):</span>
                    <span className="font-mono text-base font-black text-slate-900 dark:text-white">৳{taxAmount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* GRAND TOTAL (Prominent Primary Brand Banner with Big Numbers) */}
              <div
                style={{ backgroundColor: "var(--primary-color, #059669)" }}
                className="p-3.5 sm:p-4 bg-emerald-600 rounded-2xl text-white shadow-xs flex items-center justify-between"
              >
                <span className="text-sm font-black uppercase tracking-wider">GRAND TOTAL:</span>
                <span className="text-3xl sm:text-[34px] font-black font-mono tracking-tight">
                  ৳{grandTotal.toLocaleString()}
                </span>
              </div>

              {/* Paid Amount Input & Presets */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <span className="text-sm font-black text-slate-800 dark:text-slate-200">Paid Amount (৳):</span>
                  <input
                    type="number"
                    placeholder={`৳${grandTotal.toLocaleString()}`}
                    value={paidInput}
                    onChange={(e) => setPaidInput(e.target.value)}
                    className="w-40 h-11 px-3 bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded-xl text-xl font-black text-right outline-none text-emerald-700 dark:text-emerald-400 font-mono shadow-xs"
                  />
                </div>

                {/* Quick Paid Presets */}
                <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                  <button
                    type="button"
                    onClick={() => setPaidInput(grandTotal.toString())}
                    className="px-3.5 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl text-sm font-black shrink-0 hover:bg-emerald-200 cursor-pointer transition active:scale-95"
                  >
                    Exact
                  </button>
                  {[100, 500, 1000, 2000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setPaidInput(amt.toString())}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-sm font-black shrink-0 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition active:scale-95"
                    >
                      ৳{amt}
                    </button>
                  ))}
                </div>

                {dueAmount > 0 ? (
                  <div className="flex justify-between items-center text-rose-700 font-black text-sm bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-800">
                    <span>Due Amount:</span>
                    <span className="font-mono text-lg font-black">৳{dueAmount.toLocaleString()}</span>
                  </div>
                ) : changeAmount > 0 ? (
                  <div className="flex justify-between items-center text-blue-700 font-black text-sm bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-200 dark:border-blue-800">
                    <span>Change Return:</span>
                    <span className="font-mono text-lg font-black">৳{changeAmount.toLocaleString()}</span>
                  </div>
                ) : null}
              </div>

              {/* Complete Sale (F9) Button - Primary Brand Color CTA */}
              <button
                type="button"
                disabled={checkingOut || cart.length === 0 || financialAccounts.length === 0}
                onClick={handleCheckout}
                style={{ backgroundColor: "var(--primary-color, #059669)" }}
                className="h-13 sm:h-14 w-full bg-emerald-600 hover:brightness-95 disabled:opacity-50 text-white font-black rounded-xl text-lg shadow-md transition flex items-center justify-center gap-2.5 cursor-pointer active:scale-99"
              >
                {checkingOut ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <Receipt className="h-6 w-6" />
                    <span>Complete Sale (F9)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* 1. PRODUCT & LOCATION SELECTION MODAL (Large, Clean, Multi-Unit Enabled)  */}
      {/* ========================================================================= */}
      {locationModalOpen && modalProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-[880px] shadow-2xl p-6 sm:p-8 text-slate-800 dark:text-slate-100 flex flex-col space-y-5 max-h-[94vh] overflow-hidden select-none relative">
            {/* Top Close Button */}
            <button
              type="button"
              onClick={closeModal}
              title="Close (Esc)"
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 dark:hover:text-white p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Header: Product Name, Batch & Exp */}
            <div className="text-center pt-1 pb-1 shrink-0 px-12">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                {modalProduct.name}
              </h3>
              <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
                <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-300 font-mono">
                  Batch: {modalBatch?.batchNumber || "BAT-Default"}
                </span>
                <span className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-sm font-bold text-emerald-800 dark:text-emerald-300 font-mono">
                  Exp: {modalBatch?.expiryDate ? new Date(modalBatch.expiryDate).toLocaleDateString("en-GB") : "—"}
                </span>
              </div>
            </div>

            {/* Section: Select Stock Location */}
            <div className="flex-1 min-h-0 flex flex-col space-y-3 overflow-hidden">
              {/* Header: Title & Action */}
              <div className="flex items-center justify-between shrink-0 px-1">
                <div className="flex items-center gap-3">
                  <h4 className="text-lg font-black text-slate-900 dark:text-slate-100">
                    Select Location
                  </h4>
                  {modalSummary.totalSelectedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setModalAllocations({})}
                      className="text-sm font-bold text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 underline underline-offset-2 cursor-pointer transition"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <span className="px-3 py-1 rounded-full text-sm font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800/60 font-mono">
                  {filteredModalLocations.length} locations
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative shrink-0">
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search rack, shelf, bin..."
                  value={modalLocationSearch}
                  onChange={(e) => setModalLocationSearch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-slate-800 focus:border-emerald-500 rounded-2xl pl-11 pr-11 py-3 text-base font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition"
                />
                <Maximize2 className="absolute right-4 top-3.5 h-4.5 w-4.5 text-slate-400" />
              </div>

              {/* Location Cards List */}
              <div className="flex-1 min-h-0 overflow-y-auto content-scrollbar space-y-3 pr-1 mt-1">
                {filteredModalLocations.length === 0 ? (
                  <div className="py-12 text-center text-base font-medium text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    No physical stock locations available for this batch.
                  </div>
                ) : (
                  filteredModalLocations.map((loc, i) => {
                    const locKey = getLocKey(loc, i);
                    const alloc = modalAllocations[locKey] || { box: 0, strip: 0, tablet: 0, qty: 0 };
                    const locStock = loc.quantity || 0;

                    const rName = loc.rackName || loc.rack?.name || "R01";
                    const sName = loc.shelfName || loc.shelf?.name || "S01";
                    const bName = loc.binName || loc.bin?.name || "B01";
                    const displayCode = loc.rackName && loc.shelfName ? `${rName} / ${sName} / ${bName}` : (loc.locationLabel || "Main Counter");

                    const branchObj = branches.find((b) => b.id === selectedBranchId);
                    const branchName = branchObj?.name || "Main Branch";

                    if (isMedicineModel) {
                      const totalBaseUsed = (alloc.box * tabletsPerBoxCount) + (alloc.strip * tabletsPerStripCount) + alloc.tablet;
                      const remainingTablets = Math.max(0, locStock - totalBaseUsed);
                      const maxBoxesAvailable = Math.floor(remainingTablets / tabletsPerBoxCount);
                      const maxStripsAvailable = Math.floor(remainingTablets / tabletsPerStripCount);
                      const maxTabletsAvailable = remainingTablets;
                      const isAllocated = totalBaseUsed > 0;
                      const locPrice = (alloc.box * modalBoxPrice) + (alloc.strip * modalStripPrice) + (alloc.tablet * modalTabletPrice);

                      return (
                        <div
                          key={loc.id || i}
                          className={`p-4 sm:p-5 rounded-2xl transition shadow-xs relative border-2 ${
                            isAllocated
                              ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/25 ring-2 ring-emerald-500/20"
                              : "border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#111622]"
                          }`}
                        >
                          {/* Top Row: Location Name, Branch, Stock Badge, Max Button, Clear Button */}
                          <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                            <button
                              type="button"
                              onClick={() => toggleLocSelect(locKey, true, locStock)}
                              className="flex items-center gap-3 text-left cursor-pointer group"
                            >
                              <span
                                className={`h-7 w-7 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                                  isAllocated
                                    ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30"
                                    : "border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 group-hover:border-emerald-500"
                                }`}
                              >
                                {isAllocated && <Check className="h-4.5 w-4.5 stroke-[3]" />}
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                    {displayCode}
                                  </span>
                                  {isAllocated ? (
                                    <span className="px-2 py-0.5 rounded-md text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                      Selected
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-md text-xs font-bold text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 group-hover:border-emerald-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                      Click to Select
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-semibold">
                                  • {branchName}
                                </span>
                              </div>
                            </button>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="px-3 py-1 rounded-xl text-xs sm:text-sm font-black bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700/60 text-emerald-900 dark:text-emerald-300 font-mono">
                                Stock: {locStock} Tablets
                              </span>

                              <button
                                type="button"
                                onClick={() => setLocMaxAlloc(locKey, locStock)}
                                className="px-3 py-1.5 text-xs sm:text-sm font-black rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                              >
                                Max All
                              </button>

                              {isAllocated && (
                                <button
                                  type="button"
                                  onClick={() => clearLocAlloc(locKey)}
                                  title="Clear this location"
                                  className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                                >
                                  <X className="h-5 w-5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Middle Row: Clean Stepper & Max Button for Box, Strip, and Tablet */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3.5 pt-3.5 border-t border-slate-200/80 dark:border-slate-800">
                            {/* 1. Box Counter */}
                            <div className="bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col justify-between gap-2 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="text-base font-black text-slate-900 dark:text-white">Box</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-bold">
                                  ৳{modalBoxPrice.toFixed(0)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => updateMedAlloc(locKey, "box", (alloc.box || 0) - 1, locStock)}
                                    disabled={(alloc.box || 0) <= 0}
                                    className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-200 transition cursor-pointer"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <input
                                    type="number"
                                    min={0}
                                    max={(alloc.box || 0) + maxBoxesAvailable}
                                    value={alloc.box || 0}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => updateMedAlloc(locKey, "box", parseInt(e.target.value, 10) || 0, locStock)}
                                    className="w-12 text-center font-black text-lg outline-none font-mono text-emerald-600 dark:text-emerald-400"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateMedAlloc(locKey, "box", (alloc.box || 0) + 1, locStock)}
                                    disabled={maxBoxesAvailable <= 0}
                                    className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-200 transition cursor-pointer"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setLocUnitMax(locKey, "box", locStock)}
                                  disabled={maxBoxesAvailable <= 0}
                                  className="px-2.5 py-1.5 text-xs font-black rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer whitespace-nowrap"
                                >
                                  Max ({maxBoxesAvailable})
                                </button>
                              </div>
                            </div>

                            {/* 2. Strip Counter */}
                            <div className="bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col justify-between gap-2 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="text-base font-black text-slate-900 dark:text-white">Strip</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-bold">
                                  ৳{modalStripPrice.toFixed(0)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => updateMedAlloc(locKey, "strip", (alloc.strip || 0) - 1, locStock)}
                                    disabled={(alloc.strip || 0) <= 0}
                                    className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-200 transition cursor-pointer"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <input
                                    type="number"
                                    min={0}
                                    max={(alloc.strip || 0) + maxStripsAvailable}
                                    value={alloc.strip || 0}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => updateMedAlloc(locKey, "strip", parseInt(e.target.value, 10) || 0, locStock)}
                                    className="w-12 text-center font-black text-lg outline-none font-mono text-emerald-600 dark:text-emerald-400"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateMedAlloc(locKey, "strip", (alloc.strip || 0) + 1, locStock)}
                                    disabled={maxStripsAvailable <= 0}
                                    className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-200 transition cursor-pointer"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setLocUnitMax(locKey, "strip", locStock)}
                                  disabled={maxStripsAvailable <= 0}
                                  className="px-2.5 py-1.5 text-xs font-black rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer whitespace-nowrap"
                                >
                                  Max ({maxStripsAvailable})
                                </button>
                              </div>
                            </div>

                            {/* 3. Tablet Counter */}
                            <div className="bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col justify-between gap-2 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="text-base font-black text-slate-900 dark:text-white">Tablet</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-bold">
                                  ৳{modalTabletPrice.toFixed(0)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => updateMedAlloc(locKey, "tablet", (alloc.tablet || 0) - 1, locStock)}
                                    disabled={(alloc.tablet || 0) <= 0}
                                    className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-200 transition cursor-pointer"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <input
                                    type="number"
                                    min={0}
                                    max={(alloc.tablet || 0) + maxTabletsAvailable}
                                    value={alloc.tablet || 0}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => updateMedAlloc(locKey, "tablet", parseInt(e.target.value, 10) || 0, locStock)}
                                    className="w-12 text-center font-black text-lg outline-none font-mono text-emerald-600 dark:text-emerald-400"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateMedAlloc(locKey, "tablet", (alloc.tablet || 0) + 1, locStock)}
                                    disabled={maxTabletsAvailable <= 0}
                                    className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-200 transition cursor-pointer"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setLocUnitMax(locKey, "tablet", locStock)}
                                  disabled={maxTabletsAvailable <= 0}
                                  className="px-2.5 py-1.5 text-xs font-black rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer whitespace-nowrap"
                                >
                                  Max ({maxTabletsAvailable})
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Location Subtotal Preview */}
                          {isAllocated && (
                            <div className="flex items-center justify-between text-sm sm:text-base font-bold text-slate-700 dark:text-slate-300 mt-2.5 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800">
                              <span className="text-emerald-800 dark:text-emerald-300">
                                Selected: {alloc.box > 0 ? `${alloc.box} Box ` : ""}{alloc.strip > 0 ? `${alloc.strip} Strip ` : ""}{alloc.tablet > 0 ? `${alloc.tablet} Tablet ` : ""}
                                ({totalBaseUsed} Tablets)
                              </span>
                              <span className="font-mono text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                                ৳{Math.round(locPrice).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Non-Medicine Products (Single Unit Counter)
                    const isAllocated = (alloc.qty || 0) > 0;
                    const locPrice = (alloc.qty || 0) * modalUnitPrice;
                    const remainingNonMed = Math.max(0, locStock - (alloc.qty || 0));

                    return (
                      <div
                        key={loc.id || i}
                        className={`p-4 sm:p-5 rounded-2xl transition shadow-xs relative border-2 ${
                          isAllocated
                            ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/25 ring-2 ring-emerald-500/20"
                            : "border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#111622]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                          <div>
                            <button
                              type="button"
                              onClick={() => toggleLocSelect(locKey, false, locStock)}
                              className="flex items-center gap-3 text-left cursor-pointer group"
                            >
                              <span
                                className={`h-7 w-7 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                                  isAllocated
                                    ? "bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/30"
                                    : "border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 group-hover:border-emerald-500"
                                }`}
                              >
                                {isAllocated && <Check className="h-4.5 w-4.5 stroke-[3]" />}
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                    {displayCode}
                                  </span>
                                  {isAllocated ? (
                                    <span className="px-2 py-0.5 rounded-md text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                      Selected
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-md text-xs font-bold text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 group-hover:border-emerald-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                      Click to Select
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-semibold">
                                  • {branchName}
                                </span>
                              </div>
                            </button>
                            <div className="mt-2 ml-10 text-sm sm:text-base text-slate-700 dark:text-slate-300 font-bold">
                              Stock: <strong className="text-emerald-600 dark:text-emerald-400 font-black text-base sm:text-lg">{locStock} {modalProduct?.unit || "units"}</strong>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                            <div className="flex items-center gap-1.5 bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-xs">
                              <button
                                type="button"
                                onClick={() => updateNonMedAlloc(locKey, (alloc.qty || 0) - 1, locStock)}
                                disabled={(alloc.qty || 0) <= 0}
                                className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <input
                                type="number"
                                min={0}
                                max={locStock}
                                value={alloc.qty || 0}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => updateNonMedAlloc(locKey, parseInt(e.target.value, 10) || 0, locStock)}
                                className="w-14 text-center font-black text-xl outline-none font-mono text-emerald-600 dark:text-emerald-400"
                              />
                              <button
                                type="button"
                                onClick={() => updateNonMedAlloc(locKey, (alloc.qty || 0) + 1, locStock)}
                                disabled={remainingNonMed <= 0}
                                className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setLocMaxAlloc(locKey, locStock)}
                                disabled={remainingNonMed <= 0}
                                className="px-3 py-2 text-xs sm:text-sm font-black rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer ml-1 whitespace-nowrap"
                              >
                                Max ({remainingNonMed})
                              </button>
                              {isAllocated && (
                                <button
                                  type="button"
                                  onClick={() => clearLocAlloc(locKey)}
                                  className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer ml-0.5"
                                >
                                  <X className="h-5 w-5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Controls: Selling Unit (for non-med only), Total & Action */}
            <div className="space-y-4 shrink-0 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              {/* Selling Unit Selection (Only shown for non-medicines if multiple units available) */}
              {!isMedicineModel && modalUnitsList.length > 1 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    Selling Unit
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    {modalUnitsList.map((u) => {
                      const isSelected = modalUnit === u.id;
                      const price = modalBasePrice * u.multiplier;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => setModalUnit(u.id)}
                          className={`py-2.5 px-3.5 rounded-2xl border-2 text-center transition cursor-pointer ${
                            isSelected
                              ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-400 shadow-sm"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-[#111622] dark:text-slate-300"
                          }`}
                        >
                          <div className={`text-base font-black ${isSelected ? "text-emerald-700 dark:text-emerald-400" : "text-slate-900 dark:text-white"}`}>
                            {u.label}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono font-bold mt-0.5">
                            ৳{price.toFixed(0)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Total Summary */}
              <div className="bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">Total Selected:</span>
                    <span className="px-3.5 py-1 rounded-full text-sm sm:text-base font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono">
                      {isMedicineModel ? (
                        <>
                          {modalSummary.totalBoxes > 0 ? `${modalSummary.totalBoxes} Box ` : ""}
                          {modalSummary.totalStrips > 0 ? `${modalSummary.totalStrips} Strip ` : ""}
                          {modalSummary.totalTablets > 0 ? `${modalSummary.totalTablets} Tablet ` : ""}
                          {modalSummary.totalSelectedCount === 0 && "0 items"}
                        </>
                      ) : (
                        `${modalSummary.totalQty} ${modalSelectedUnitObj?.label || "unit(s)"}`
                      )}
                    </span>
                    {modalSummary.activeLocations > 1 && (
                      <span className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                        Across {modalSummary.activeLocations} locations
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 mr-2">Total Amount:</span>
                    <span className="font-mono text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                      ৳{Math.round(modalSummary.totalEstimatedPrice).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Add to Sale Cart Action Button */}
              <button
                type="button"
                onClick={confirmAddToCart}
                disabled={modalSummary.totalSelectedCount <= 0}
                style={{ backgroundColor: modalSummary.totalSelectedCount > 0 ? "var(--primary-color, #059669)" : undefined }}
                className={`w-full h-14 sm:h-15 font-black py-3.5 rounded-2xl text-lg sm:text-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                  modalSummary.totalSelectedCount > 0
                    ? "bg-emerald-600 hover:brightness-95 text-white active:scale-99"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                }`}
              >
                {modalSummary.totalSelectedCount > 0 ? (
                  <span>Add to Cart (Enter) • ৳{Math.round(modalSummary.totalEstimatedPrice).toLocaleString()}</span>
                ) : (
                  <span>Select quantity to add</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SILENT THERMAL RECEIPT PRINT PORTAL (Direct print, zero on-screen modal) */}
      {/* ========================================================================= */}
      {invoiceData && createPortal(
        <div className="print-portal fixed -left-[9999px] -top-[9999px] w-0 h-0 opacity-0 pointer-events-none overflow-hidden print:static print:left-auto print:top-auto print:w-full print:h-auto print:opacity-100 print:pointer-events-auto print:overflow-visible print:block print:m-0 print:p-0 print:bg-white">
          <div className="printable-document print-invoice-card bg-white text-black print:m-0 print:p-0 print:w-full">
            {/* 80mm THERMAL SALES INVOICE (With outer light border & Pharmacy Logo) */}
            <div
              className="bg-white font-sans text-xs leading-relaxed space-y-3 select-text"
              style={{
                width: "100%",
                maxWidth: "350px",
                margin: "0 auto",
                padding: "16px 16px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                color: "#000000",
                boxSizing: "border-box",
              }}
            >
              {/* Centered Header with Pharmacy Logo */}
              <div className="text-center space-y-0.5">
                {/* Pharmacy Brand Logo (Above Pharmacy Name) */}
                <div className="flex justify-center mb-1.5" style={{ minHeight: "44px" }}>
                  {(invoiceData.pharmacy?.logoUrl || tenantLogo || settings?.logoUrl) && !logoLoadFailed ? (
                    <img
                      src={invoiceData.pharmacy?.logoUrl || tenantLogo || settings?.logoUrl || ""}
                      alt={invoiceData.pharmacy?.name || "Pharmacy Logo"}
                      crossOrigin="anonymous"
                      loading="eager"
                      decoding="sync"
                      onError={() => setLogoLoadFailed(true)}
                      style={{
                        maxHeight: "52px",
                        maxWidth: "135px",
                        objectFit: "contain",
                        margin: "0 auto",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "46px",
                        height: "46px",
                        borderRadius: "50%",
                        border: "2px solid #000000",
                        margin: "0 auto 4px auto",
                        backgroundColor: "#ffffff",
                      }}
                    >
                      <svg
                        width="26"
                        height="26"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#000000"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 4v16M4 12h16" />
                        <circle cx="12" cy="12" r="9" strokeWidth="1.3" />
                      </svg>
                    </div>
                  )}
                </div>

                <h2 className="font-black text-2xl tracking-tight text-black uppercase">
                  {invoiceData.pharmacy?.name || "Shapla Pharmacy"}
                </h2>
                <p className="font-semibold text-xs text-black">
                  {invoiceData.pharmacy?.branchName || "Main Branch"}
                </p>
                <p className="text-[11px] text-black">
                  {invoiceData.pharmacy?.address || "Dhanmondi, Dhaka"}
                </p>
                <p className="text-[11px] text-black">
                  Hotline: {invoiceData.pharmacy?.phone || "01701560326"}
                </p>
                <p className="text-[11px] text-black">
                  Email : {invoiceData.pharmacy?.email || "uttam23412@gmail.com"}
                </p>
                <p className="text-[11px] text-black">
                  Website : {invoiceData.pharmacy?.website || "www.petvet-bd.com"}
                </p>
              </div>

              {/* Order Meta */}
              <div style={{ borderTop: "1px dashed #000000", paddingTop: "8px" }} className="space-y-1">
                <div className="flex justify-between font-bold text-xs">
                  <span>Order ID :</span>
                  <span className="font-mono">{invoiceData.invoice?.receiptNo || currentOrderId}</span>
                </div>
                <div className="flex justify-between font-bold text-xs">
                  <span>Date:</span>
                  <span>
                    {new Date(invoiceData.invoice?.date || Date.now()).toLocaleDateString("en-GB")}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-xs">
                  <span>Cashier :</span>
                  <span>{invoiceData.invoice?.cashier || user?.name || "Akash Mahmud"}</span>
                </div>
              </div>

              {/* Customer Meta */}
              <div style={{ borderTop: "1px solid #000000", paddingTop: "8px" }} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold">Customer:</span>
                  <span className="font-bold uppercase">{invoiceData.invoice?.customerName || "WALK-IN CUSTOMER"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-bold">Phone:</span>
                  <span className="font-mono">{invoiceData.invoice?.customerPhone || "—"}</span>
                </div>
              </div>

              {/* Line Items Table (Image 2 exact style) */}
              <div style={{ borderTop: "1.5px solid #000000", paddingTop: "8px" }} className="space-y-2">
                {(invoiceData.invoice?.items || []).map((item: any, idx: number) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="font-black text-xs">
                      #{idx + 1}. {item.name} - -
                    </div>
                    <div className="flex justify-between text-[11px] text-black">
                      <span className="font-mono">
                        Barcode: {item.barcode || "37000035058697"} | Unit: {item.quantity} x {Number(item.unitPrice || 0).toFixed(0)}
                      </span>
                      <span className="font-black font-mono">
                        {Number(item.subTotal || (item.unitPrice * item.quantity) || 0).toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Financial Totals */}
              <div style={{ borderTop: "1px dashed #000000", paddingTop: "8px" }} className="space-y-1 text-xs font-bold">
                <div className="flex justify-between">
                  <span>Total Quantity:</span>
                  <span className="font-mono">{invoiceData.invoice?.totalQuantity ?? totalCartUnits}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono">{Number(invoiceData.invoice?.subTotal || 0).toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span className="font-mono">{Number(invoiceData.invoice?.discount || 0).toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charge:</span>
                  <span className="font-mono">{Number(invoiceData.invoice?.deliveryCharge || 0).toFixed(0)}</span>
                </div>
                <div style={{ borderTop: "1px solid #000000", paddingTop: "4px" }} className="flex justify-between font-black text-sm">
                  <span>Grand Total:</span>
                  <span className="font-mono">{Number(invoiceData.invoice?.totalAmount || 0).toFixed(0)}</span>
                </div>
              </div>

              {/* Payment Details */}
              <div style={{ borderTop: "1px dashed #000000", paddingTop: "8px" }} className="space-y-1 text-xs font-bold">
                <div className="flex justify-between">
                  <span>Advance:</span>
                  <span className="font-mono">{Number(invoiceData.invoice?.paidAmount || 0).toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Due Amount:</span>
                  <span className="font-mono">{Number(invoiceData.invoice?.dueAmount || 0).toFixed(0)}</span>
                </div>
              </div>

              {/* Dashed line above Policy Box (Matches Image 2) */}
              <div style={{ borderTop: "1px dashed #000000", margin: "8px 0" }} />

              {/* Policy Box (Matches Image 2) */}
              <div style={{ border: "1px solid #000000", padding: "8px", margin: "8px 0", textAlign: "center", fontSize: "10px", lineHeight: "1.3" }} className="font-medium rounded">
                Items may be exchanged subject to Biz_Pos & Diagnostic sales policies within 7 days. No cash refund is applicable.
              </div>

              {/* Divider Line Under Policy Box (Matches Image 2) */}
              <div style={{ borderTop: "1px solid #000000", margin: "8px 0" }} />

              {/* Thank you note & Barcode */}
              <div className="text-center space-y-1">
                <p className="font-black text-xs tracking-wider uppercase">
                  THANK YOU FOR SHOPPING !
                </p>

                {/* SCANNABLE VECTOR BARCODE */}
                <div className="pt-1 flex justify-center">
                  <Barcode128
                    value={invoiceData.invoice?.receiptNo || currentOrderId}
                    width={1.6}
                    height={40}
                    showText={true}
                    textSize={11}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
