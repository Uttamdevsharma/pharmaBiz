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
  Repeat, ChevronDown, Check, User, Phone, Maximize2, Minimize2,
  Wifi, WifiOff, CloudOff, RefreshCw, Percent, ArrowLeft, Filter, Layers, Tag, SlidersHorizontal,
  Wallet, Banknote, CreditCard, Smartphone
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
  boxCount?: number;
  stripCount?: number;
  tabletCount?: number;
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
    pType === "GENERAL" ||
    unit === "piece" ||
    unit === "pcs" ||
    unit === "pack" ||
    unit === "packet" ||
    unit === "tin" ||
    unit === "tube" ||
    cat.includes("essential") ||
    cat.includes("life") ||
    cat.includes("equipment") ||
    cat.includes("device") ||
    cat.includes("care") ||
    cat.includes("hygiene") ||
    cat.includes("baby") ||
    cat.includes("food") ||
    cat.includes("consumable") ||
    cat.includes("cosmetic")
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
  onBack?: () => void;
}

export function PosModule({ selectedBranchId: propBranchId, onNavigate, onBack }: PosModuleProps = {}) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const {
    branches: contextBranches,
    selectedBranchId: contextBranchId,
    setSelectedBranchId: contextSetBranchId,
    canSwitchBranch,
  } = useBranchContext();

  // Tenant Brand Logo & Website resolution
  const [tenantLogo, setTenantLogo] = useState<string | null>(() => user?.tenant?.logoUrl || null);
  const [tenantWebsite, setTenantWebsite] = useState<string | null>(() => (user?.tenant as any)?.website || null);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  useEffect(() => {
    if (user?.tenant?.logoUrl) {
      setTenantLogo(user.tenant.logoUrl);
    }
    if ((user?.tenant as any)?.website) {
      setTenantWebsite((user?.tenant as any).website);
    }
    fetchApi<any>("/tenant/profile").then((res) => {
      if (res.success && res.data) {
        if (res.data.logoUrl) setTenantLogo(res.data.logoUrl);
        if (res.data.website !== undefined) setTenantWebsite(res.data.website || null);
      }
    }).catch(() => {});
  }, [user?.tenant?.logoUrl, (user?.tenant as any)?.website]);

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

  // Filter state for dynamic categories, subcategories, brands
  const [categories, setCategories] = useState<any[]>([]);
  const [brandsList, setBrandsList] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>("ALL");
  const [selectedBrandId, setSelectedBrandId] = useState<string>("ALL");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    fetchApi<any>("/products/categories").then((res) => {
      if (res.success && Array.isArray(res.data)) {
        setCategories(res.data);
      }
    }).catch(() => {});

    fetchApi<any>("/products/brands").then((res) => {
      if (res.success && Array.isArray(res.data)) {
        setBrandsList(res.data);
      }
    }).catch(() => {});
  }, []);

  // Compute dynamic lists from user-created categories and subcategories strictly
  const availableCategories = useMemo(() => {
    return categories
      .filter((c) => Boolean(c && c.name))
      .map((c) => ({ id: c.id, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  const availableSubcategories = useMemo(() => {
    const list: { id: string; name: string }[] = [];
    const seen = new Set<string>();

    if (selectedCategoryId !== "ALL") {
      const matchedCat = categories.find(
        (c) => c.id === selectedCategoryId || c.name.toLowerCase() === selectedCategoryId.toLowerCase()
      );
      if (matchedCat && Array.isArray(matchedCat.subcategories)) {
        matchedCat.subcategories.forEach((s: any) => {
          if (s.name && !seen.has(s.name.toLowerCase())) {
            seen.add(s.name.toLowerCase());
            list.push({ id: s.id, name: s.name });
          }
        });
      }
    } else {
      categories.forEach((c) => {
        if (Array.isArray(c.subcategories)) {
          c.subcategories.forEach((s: any) => {
            if (s.name && !seen.has(s.name.toLowerCase())) {
              seen.add(s.name.toLowerCase());
              list.push({ id: s.id, name: s.name });
            }
          });
        }
      });
    }

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, selectedCategoryId]);

  const availableBrands = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    brandsList.forEach((b) => {
      if (b.name) map.set(b.name.toLowerCase(), { id: b.id, name: b.name });
    });
    products.forEach((p: any) => {
      const bName = p.brandRef?.name || p.brandName;
      if (bName && !map.has(bName.toLowerCase())) {
        map.set(bName.toLowerCase(), { id: p.brandId || bName, name: bName });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [brandsList, products]);

  // Filtered products for left grid
  const gridProducts = useMemo(() => {
    return products.filter((p: any) => {
      if (selectedCategoryId !== "ALL") {
        const catName = p.category || p.categoryRef?.name || "";
        const matchesCat =
          p.categoryId === selectedCategoryId ||
          catName.toLowerCase() === selectedCategoryId.toLowerCase();
        if (!matchesCat) return false;
      }
      if (selectedSubcategoryId !== "ALL") {
        const subName = p.subcategory || p.subcategoryRef?.name || "";
        const matchesSub =
          p.subcategoryId === selectedSubcategoryId ||
          subName.toLowerCase() === selectedSubcategoryId.toLowerCase();
        if (!matchesSub) return false;
      }
      if (selectedBrandId !== "ALL") {
        const bName = p.brandName || p.brandRef?.name || p.manufacturer || "";
        const matchesBrand =
          p.brandId === selectedBrandId ||
          bName.toLowerCase() === selectedBrandId.toLowerCase();
        if (!matchesBrand) return false;
      }
      return true;
    });
  }, [products, selectedCategoryId, selectedSubcategoryId, selectedBrandId]);

  const wasFullscreenRef = useRef(false);

  // Fullscreen sync listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    if (typeof document !== 'undefined') {
      setIsFullscreen(!!document.fullscreenElement);
      document.addEventListener('fullscreenchange', handleFsChange);
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('fullscreenchange', handleFsChange);
      }
    };
  }, []);

  // Restore fullscreen & refocus search input after printing dialog closes
  useEffect(() => {
    const handleAfterPrint = () => {
      setTimeout(() => {
        searchInputRef.current?.focus();
        setSearchFocused(true);
      }, 100);

      // Restore fullscreen only if the cashier had it enabled prior to printing
      if (wasFullscreenRef.current && typeof document !== 'undefined' && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
      }
    };

    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Bill & Customer details
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customersList, setCustomersList] = useState<CustomerSuggestion[]>([]);
  const [phoneDropdownOpen, setPhoneDropdownOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [selectedCustomerIndex, setSelectedCustomerIndex] = useState(0);
  const [addCustomerModalOpen, setAddCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const customerSearchInputRef = useRef<HTMLInputElement>(null);
  const newCustomerNameInputRef = useRef<HTMLInputElement>(null);

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

  // Discount state
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [discountRate, setDiscountRate] = useState<number>(0);
  const [discountFlat, setDiscountFlat] = useState<number>(0);

  // Modal working state (for editing inside modal before confirming)
  const [tempDiscountRate, setTempDiscountRate] = useState<string>("");
  const [tempDiscountFlat, setTempDiscountFlat] = useState<string>("");
  const [tempDiscountType, setTempDiscountType] = useState<"PERCENT" | "FIXED">("PERCENT");

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

  // POS Keyboard Navigation & Table Focus State
  const [activeCartRowIndex, setActiveCartRowIndex] = useState<number | null>(null);
  const [activeCartUnit, setActiveCartUnit] = useState<"strip" | "box" | "tablet">("strip");
  const [cartNumberBuffer, setCartNumberBuffer] = useState<string>("");
  const numberBufferTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Discount Modal Keyboard Navigation State (0: 0%, 1: 5%, 2: 10%, 3: 15%, 4: 20%, 5: Rate %, 6: Flat BDT)
  const [discountFocusIndex, setDiscountFocusIndex] = useState<number>(0);
  const discountRateInputRef = useRef<HTMLInputElement>(null);
  const discountFlatInputRef = useRef<HTMLInputElement>(null);
  const paymentSelectRef = useRef<HTMLSelectElement>(null);
  const checkoutButtonRef = useRef<HTMLButtonElement>(null);

  // Payment Method Modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentFocusIndex, setPaymentFocusIndex] = useState(0);
  const paidAmountInputRef = useRef<HTMLInputElement>(null);

  // Last Completed Sale Receipt Document for Direct Silent Print
  const [invoiceData, setInvoiceData] = useState<any>(null);

  // Background Sync and Offline State
  const [syncState, setSyncState] = useState<SyncState>(() => syncEngine.getState());

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const phoneContainerRef = useRef<HTMLDivElement>(null);

  // Live order identifier
  const [currentOrderId, setCurrentOrderId] = useState(() => Math.floor(10000000 + Math.random() * 90000000).toString());

  // Subscribe to SyncEngine state updates
  useEffect(() => {
    const unsubscribe = syncEngine.subscribe(setSyncState);
    return unsubscribe;
  }, []);

  // Auto-focus search input on page mount
  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 80);
    return () => clearTimeout(timer);
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

  const prevBranchRef = useRef<string>("");
  useEffect(() => {
    loadPosProducts();
    if (selectedBranchId) {
      syncEngine.setBranchContext(selectedBranchId);
      loadFinancialAccounts(selectedBranchId);
      if (prevBranchRef.current && prevBranchRef.current !== selectedBranchId) {
        setCart([]);
      }
      prevBranchRef.current = selectedBranchId;
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

  // Matching items for search (No dropdown when query is empty; matches every word across name, generic, brand, sku, barcode)
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];

    const words = q.split(/\s+/).filter(Boolean);
    const matchesAllWords = (targetStr: string) => {
      return words.every((word) => targetStr.includes(word));
    };

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
      const prodText = `${pName} ${pGeneric} ${pBrand} ${pSku} ${pBarcode}`;

      if (batches.length > 0) {
        for (const b of batches) {
          const bNum = (b.batchNumber || "").toLowerCase();
          const bBarcode = (b.barcode || "").toLowerCase();
          const fullText = `${prodText} ${bNum} ${bBarcode}`;
          if (matchesAllWords(fullText)) {
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
      } else if (matchesAllWords(prodText)) {
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

  // Direct Add Product to Cart without location popup modal
  const handleSelectProduct = (prod: any, batch: any) => {
    if (!prod) return;

    if (batch?.expiryDate && new Date(batch.expiryDate) <= new Date()) {
      showToast("Cannot sell expired batches.", "error");
      return;
    }

    const model = getProductPackagingModel(prod);
    const isMed = model === "MEDICINE";

    const baseSellingPrice = getProductUnitPrice(prod, batch);
    const stripsPerBox = Number(prod.stripsPerBox) || 10;
    const tabletsPerStrip = Number(prod.tabletsPerStrip) || 10;
    const tabletsPerBox = stripsPerBox * tabletsPerStrip;
    const stock = batch?.quantity ?? (prod.currentStock !== undefined && prod.currentStock !== null ? Number(prod.currentStock) : Number(prod.stock || 0));

    const existingIdx = cart.findIndex(
      (item) => item.productId === prod.id && item.inventoryId === (batch?.id || null)
    );
    if (existingIdx >= 0) {
      setActiveCartRowIndex(existingIdx);
      if (isMed) setActiveCartUnit("strip");
    } else {
      setActiveCartRowIndex(cart.length);
      if (isMed) setActiveCartUnit("strip");
    }

    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.productId === prod.id && item.inventoryId === (batch?.id || null)
      );

      if (existingIdx >= 0) {
        const existing = prev[existingIdx];
        const isMedicine = existing.productType === "MEDICINE";
        const hasAnyQty = isMedicine
          ? ((existing.boxCount || 0) > 0 || (existing.stripCount || 0) > 0 || (existing.tabletCount || 0) > 0)
          : (existing.quantity > 0);

        if (!hasAnyQty) {
          showToast(`"${prod.name}" is already in cart. Enter quantity.`, "info");
          return prev;
        }

        if (isMedicine) {
          const currentStrips = (existing.stripCount || 0) + 1;
          const totalUnits = ((existing.boxCount || 0) * tabletsPerBox) + (currentStrips * tabletsPerStrip) + (existing.tabletCount || 0);
          if (totalUnits > existing.availableBaseStock) {
            showToast(`Stock limit reached (${existing.availableBaseStock} max available).`, "warning");
            return prev;
          }
          const copy = [...prev];
          copy[existingIdx] = {
            ...existing,
            stripCount: currentStrips,
            quantity: totalUnits,
          };
          return copy;
        } else {
          const newQty = existing.quantity + 1;
          if (newQty > existing.availableBaseStock) {
            showToast(`Stock limit reached (${existing.availableBaseStock} max available).`, "warning");
            return prev;
          }
          const copy = [...prev];
          copy[existingIdx] = {
            ...existing,
            quantity: newQty,
          };
          return copy;
        }
      } else {
        const locs = (batch?.locations || prod?.locations || []) as any[];
        const primaryLoc = locs.find((l) => (Number(l.quantity) || 0) > 0) || locs[0];
        let locLabel = "";
        let rName = "";
        let sName = "";
        let bName = "";
        if (primaryLoc) {
          rName = primaryLoc.rack?.name || primaryLoc.rackName || "";
          sName = primaryLoc.shelf?.name || primaryLoc.shelfName || "";
          bName = primaryLoc.bin?.name || primaryLoc.binName || "";
          if (rName && sName && bName && bName !== "B01" && bName !== "Bin 1") {
            locLabel = `${rName} › ${sName} › ${bName}`;
          } else if (rName && sName && sName !== "S01") {
            locLabel = `${rName} › ${sName}`;
          } else if (rName) {
            locLabel = rName;
          }
        }

        const newItem: CartItem = {
          productId: prod.id,
          name: prod.name,
          genericName: prod.genericName || null,
          sku: prod.sku,
          barcode: prod.barcode || batch?.barcode || null,
          size: prod.size,
          productType: model,
          unitType: isMed ? "TABLET" : (model === "BOTTLE" ? "BOTTLE" : model === "VIAL" ? "VIAL" : "PIECE"),
          unitMultiplier: 1,
          quantity: 0,
          boxCount: 0,
          stripCount: 0,
          tabletCount: 0,
          unitPrice: baseSellingPrice,
          basePrice: baseSellingPrice,
          stripsPerBox,
          tabletsPerStrip,
          tabletsPerBox,
          availableBaseStock: stock > 0 ? stock : 99999,
          batchNumber: batch?.batchNumber || "Default",
          expiryDate: batch?.expiryDate || null,
          inventoryId: batch?.id || null,
          inventoryLocationId: primaryLoc?.id || null,
          shelfLocation: locLabel || null,
          locationLabel: locLabel || undefined,
          rackName: rName || undefined,
          shelfName: sName || undefined,
          binName: bName || undefined,
          isControlled: prod.isControlled,
          requiresPrescription: prod.requiresPrescription,
          purchasePrice: batch?.purchasePrice || null,
        };
        return [...prev, newItem];
      }
    });

    showToast(`Added ${prod.name} to cart (Qty: 0)`, "success");
    setSearch("");
    setSearchFocused(false);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  // FEFO Card Click: selects earliest expiring available batch automatically
  const handleCardClick = (prod: any) => {
    if (!prod) return;

    const availableBatches = (prod.batches || []).filter((b: any) => {
      const qty = Number(b.quantity ?? 0);
      const isExp = b.expiryDate ? new Date(b.expiryDate) <= new Date() : false;
      return qty > 0 && !isExp;
    });

    if (availableBatches.length > 0) {
      handleSelectProduct(prod, availableBatches[0]);
    } else if (prod.batches && prod.batches.length > 0) {
      const allExpired = prod.batches.every((b: any) => b.expiryDate && new Date(b.expiryDate) <= new Date());
      if (allExpired) {
        showToast(`Cannot sell "${prod.name}" - all batches are expired.`, "error");
        return;
      }
      handleSelectProduct(prod, prod.batches[0]);
    } else {
      const stock = Number(prod.currentStock ?? prod.stock ?? 0);
      if (stock <= 0) {
        showToast(`"${prod.name}" is currently out of stock.`, "warning");
        return;
      }
      handleSelectProduct(prod, null);
    }
  };

  // Update Medicine Packaging Qty (Box, Strip, Tablet)
  const updateMedicineQty = (idx: number, unitType: "box" | "strip" | "tablet", delta: number) => {
    setCart((prev) => {
      const copy = [...prev];
      const item = copy[idx];
      if (!item) return prev;

      let boxC = item.boxCount || 0;
      let stripC = item.stripCount || 0;
      let tabC = item.tabletCount || 0;

      if (unitType === "box") boxC = Math.max(0, boxC + delta);
      else if (unitType === "strip") stripC = Math.max(0, stripC + delta);
      else if (unitType === "tablet") tabC = Math.max(0, tabC + delta);

      const totalBaseUnits = (boxC * item.tabletsPerBox) + (stripC * item.tabletsPerStrip) + tabC;

      if (totalBaseUnits > item.availableBaseStock) {
        showToast(`Stock limit reached (${item.availableBaseStock} max available).`, "warning");
        return prev;
      }

      copy[idx] = {
        ...item,
        boxCount: boxC,
        stripCount: stripC,
        tabletCount: tabC,
        quantity: totalBaseUnits,
      };

      return copy;
    });
  };

  // Direct Input set for Medicine Packaging Qty (Box, Strip, Tablet)
  const updateMedicineDirectQty = (idx: number, unitType: "box" | "strip" | "tablet", newQty: number) => {
    setCart((prev) => {
      const copy = [...prev];
      const item = copy[idx];
      if (!item) return prev;

      let boxC = item.boxCount || 0;
      let stripC = item.stripCount || 0;
      let tabC = item.tabletCount || 0;

      const val = Math.max(0, isNaN(newQty) ? 0 : newQty);

      if (unitType === "box") boxC = val;
      else if (unitType === "strip") stripC = val;
      else if (unitType === "tablet") tabC = val;

      const totalBaseUnits = (boxC * item.tabletsPerBox) + (stripC * item.tabletsPerStrip) + tabC;

      if (totalBaseUnits > item.availableBaseStock) {
        showToast(`Stock limit reached (${item.availableBaseStock} max available).`, "warning");
        return prev;
      }

      copy[idx] = {
        ...item,
        boxCount: boxC,
        stripCount: stripC,
        tabletCount: tabC,
        quantity: totalBaseUnits,
      };

      return copy;
    });
  };

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
          const rName = loc.rack?.name || loc.rackName || "";
          const sName = loc.shelf?.name || loc.shelfName || "";
          const bName = loc.bin?.name || loc.binName || "";
          let label = rName || "Store";
          if (sName && sName !== "S01" && sName !== "Shelf A") label += ` → ${sName}`;
          if (bName && bName !== "B01" && bName !== "Bin 1") label += ` → ${bName}`;
          return {
            id: loc.id,
            rackName: rName,
            shelfName: sName,
            binName: bName,
            locationLabel: label,
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
            rackName: "Godown",
            shelfName: "",
            binName: "",
            locationLabel: "Warehouse / Godown",
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

  // Remove item from cart
  const removeFromCart = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  // Update Cart Quantity (Allows 0 quantity for initial entry)
  const updateCartQuantity = (idx: number, newQty: number) => {
    const safeQty = Math.max(0, newQty);
    setCart((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      const totalBaseUnits = safeQty * item.unitMultiplier;
      if (totalBaseUnits > item.availableBaseStock) {
        showToast(`Stock limit reached. Max available: ${item.availableBaseStock} base units.`, "warning");
        return item;
      }
      return { ...item, quantity: safeQty };
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
  const selectCustomer = (cust: CustomerSuggestion | { name: string; phone: string; address?: string }) => {
    if (cust.name === "Guest" && (!cust.phone || cust.phone === "00000000000")) {
      setCustomerPhone("");
      setCustomerName("");
      setCustomerAddress("");
    } else {
      setCustomerPhone(cust.phone);
      setCustomerName(cust.name);
      if (cust.address) setCustomerAddress(cust.address);
    }
    setPhoneDropdownOpen(false);
    setCustomerSearchQuery("");
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 60);
  };

  // Filtered customer suggestions (Image 3 Style with Guest first)
  const displayedCustomerOptions = useMemo(() => {
    const q = customerSearchQuery.trim().toLowerCase();
    const guestItem: CustomerSuggestion = { name: "Guest", phone: "00000000000" };
    if (!q) {
      return [guestItem, ...customersList.slice(0, 30)];
    }
    const filtered = customersList.filter(
      (c) => (c.name && c.name.toLowerCase().includes(q)) || (c.phone && c.phone.includes(q))
    );
    if ("guest".includes(q) || "0000".includes(q)) {
      return [guestItem, ...filtered.slice(0, 30)];
    }
    return filtered.slice(0, 30);
  }, [customersList, customerSearchQuery]);

  // Keyboard navigation inside customer search dropdown
  const handleCustomerSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedCustomerIndex((prev) => Math.min(displayedCustomerOptions.length - 1, prev + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedCustomerIndex((prev) => Math.max(0, prev - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = displayedCustomerOptions[selectedCustomerIndex] || displayedCustomerOptions[0];
      if (target) {
        selectCustomer(target);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setPhoneDropdownOpen(false);
      searchInputRef.current?.focus();
    }
  };

  const handleOpenAddCustomerModal = () => {
    setPhoneDropdownOpen(false);
    setNewCustName(customerSearchQuery && isNaN(Number(customerSearchQuery)) ? customerSearchQuery : "");
    setNewCustPhone(customerSearchQuery && !isNaN(Number(customerSearchQuery)) ? customerSearchQuery : "");
    setNewCustAddress("");
    setAddCustomerModalOpen(true);
    setTimeout(() => {
      newCustomerNameInputRef.current?.focus();
    }, 60);
  };

  const handleSaveNewCustomer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedPhone = newCustPhone.trim();
    const trimmedName = newCustName.trim();
    if (!trimmedPhone) {
      showAlert.toast("Phone number is required", "warning");
      return;
    }
    const newCust: CustomerSuggestion = {
      name: trimmedName || "Customer",
      phone: trimmedPhone,
      address: newCustAddress.trim() || undefined,
    };

    setCustomersList((prev) => {
      const filtered = prev.filter((c) => c.phone !== trimmedPhone);
      const updated = [newCust, ...filtered];
      try {
        localStorage.setItem("pharmabiz_cached_customers", JSON.stringify(updated.slice(0, 200)));
      } catch {}
      return updated;
    });

    selectCustomer(newCust);
    setAddCustomerModalOpen(false);
    showAlert.toast(`Customer ${trimmedName || trimmedPhone} added & selected!`, "success");
    setSuccessToast(`Customer ${trimmedName || trimmedPhone} added & selected!`);
  };

  // Financial calculations (Auto-rounded to integer, e.g. 275.80 -> 276)
  const totalCartUnits = cart.reduce((acc, item) => {
    if (item.productType === "MEDICINE") {
      const b = item.boxCount || 0;
      const s = item.stripCount || 0;
      const t = item.tabletCount || 0;
      return acc + (b * item.tabletsPerBox) + (s * item.tabletsPerStrip) + t;
    }
    return acc + item.quantity;
  }, 0);

  const rawSubTotal = cart.reduce((acc, item) => {
    if (item.productType === "MEDICINE") {
      const b = item.boxCount || 0;
      const s = item.stripCount || 0;
      const t = item.tabletCount || 0;
      const totalUnits = (b * item.tabletsPerBox) + (s * item.tabletsPerStrip) + t;
      return acc + (totalUnits * item.basePrice);
    }
    return acc + (item.unitPrice * item.quantity);
  }, 0);
  const subTotal = Math.round(rawSubTotal);

  // Compute discount amount
  let computedDiscount = 0;
  if (discountType === "PERCENT") {
    computedDiscount = discountRate > 0 ? Math.min(subTotal, Math.round(subTotal * (discountRate / 100))) : 0;
  } else {
    computedDiscount = discountFlat > 0 ? Math.min(subTotal, Math.round(discountFlat)) : 0;
  }

  const rawTax = taxPercent > 0 ? (Math.max(0, subTotal - computedDiscount) * (taxPercent / 100)) : 0;
  const taxAmount = Math.round(rawTax);
  const grandTotal = Math.round(Math.max(0, subTotal - computedDiscount + rawTax));
  const numericPaid = paidInput !== "" ? Math.round(parseFloat(paidInput) || 0) : grandTotal;
  const dueAmount = Math.max(0, grandTotal - numericPaid);
  const changeAmount = Math.max(0, numericPaid - grandTotal);

  // Discount Modal Helpers
  const handleOpenDiscountModal = () => {
    // Default preset 0% as requested by user
    setDiscountFocusIndex(0);
    setTempDiscountRate("0");
    setTempDiscountFlat("0");
    setTempDiscountType("PERCENT");
    setDiscountModalOpen(true);
  };

  const handleSelectQuickPercent = (pct: number) => {
    setTempDiscountRate(pct.toString());
    setTempDiscountType("PERCENT");
    const calculatedFlat = subTotal > 0 ? Math.round(subTotal * (pct / 100)) : 0;
    setTempDiscountFlat(calculatedFlat > 0 ? calculatedFlat.toString() : "0");
  };

  const handleRateChange = (valStr: string) => {
    setTempDiscountRate(valStr);
    setTempDiscountType("PERCENT");
    const rateNum = parseFloat(valStr) || 0;
    if (rateNum >= 0 && subTotal > 0) {
      const flat = Math.round(subTotal * (rateNum / 100));
      setTempDiscountFlat(flat > 0 ? flat.toString() : "0");
    } else {
      setTempDiscountFlat("0");
    }
  };

  const handleFlatChange = (valStr: string) => {
    setTempDiscountFlat(valStr);
    setTempDiscountType("FIXED");
    const flatNum = parseFloat(valStr) || 0;
    if (flatNum >= 0 && subTotal > 0) {
      const rate = Number(((flatNum / subTotal) * 100).toFixed(1));
      setTempDiscountRate(rate > 0 ? rate.toString() : "0");
    } else {
      setTempDiscountRate("0");
    }
  };

  const handleApplyDiscount = () => {
    const rateNum = Math.max(0, Math.min(100, parseFloat(tempDiscountRate) || 0));
    const flatNum = Math.max(0, Math.min(subTotal, parseFloat(tempDiscountFlat) || 0));

    if (tempDiscountType === "PERCENT") {
      setDiscountType("PERCENT");
      setDiscountRate(rateNum);
      setDiscountFlat(subTotal > 0 ? Math.round(subTotal * (rateNum / 100)) : 0);
    } else {
      setDiscountType("FIXED");
      setDiscountFlat(flatNum);
      setDiscountRate(subTotal > 0 ? Number(((flatNum / subTotal) * 100).toFixed(1)) : 0);
    }
    setDiscountModalOpen(false);

    // Open Payment Method Modal directly!
    setTimeout(() => {
      handleOpenPaymentModal();
    }, 60);
  };

  const handleOpenPaymentModal = () => {
    if (financialAccounts.length > 0) {
      let idx = financialAccounts.findIndex((a) => a.id === selectedAccountId);
      if (idx < 0) {
        // Find CASH account first by default
        idx = financialAccounts.findIndex((a) => (a.type || "").toUpperCase() === "CASH" || a.name.toLowerCase().includes("cash"));
        if (idx < 0) idx = 0;
      }
      setPaymentFocusIndex(idx);
      setSelectedAccountId(financialAccounts[idx].id);
      setPaymentMethod(financialAccounts[idx].type || "CASH");
    }
    setPaidInput(grandTotal.toString());
    setPaymentModalOpen(true);
    setTimeout(() => {
      paidAmountInputRef.current?.select();
    }, 60);
  };

  const handleClearDiscount = () => {
    setDiscountType("PERCENT");
    setDiscountRate(0);
    setDiscountFlat(0);
    setTempDiscountRate("");
    setTempDiscountFlat("");
    setDiscountModalOpen(false);
  };

  const tempRateNum = parseFloat(tempDiscountRate) || 0;
  const tempFlatNum = parseFloat(tempDiscountFlat) || 0;
  const previewFlatDiscount = tempDiscountType === "PERCENT"
    ? (subTotal > 0 ? Math.min(subTotal, Math.round(subTotal * (tempRateNum / 100))) : 0)
    : Math.min(subTotal, Math.round(tempFlatNum));
  const previewGrandTotal = Math.round(Math.max(0, subTotal - previewFlatDiscount + taxAmount));

  const hasRxItems = cart.some((i) => i.requiresPrescription);
  const hasControlledDrugs = cart.some((i) => i.isControlled);
  const isPhoneInvalid = customerPhone.length > 0 && customerPhone.length !== 11;

  // Final Checkout Submission (Direct One-Click Sale with Immediate Receipt Preview)
  const handleCheckout = async () => {
    if (cart.length === 0 || !selectedBranchId || checkingOut) return;

    // Immediately close all dialogs and clear active row to prevent duplicate triggers
    setPaymentModalOpen(false);
    setDiscountModalOpen(false);
    setActiveCartRowIndex(null);

    // Validate that all items in cart have at least 1 unit quantity
    const zeroItem = cart.find((item) => {
      const isMed = item.productType === "MEDICINE";
      const totalUnits = isMed
        ? ((item.boxCount || 0) * item.tabletsPerBox) + ((item.stripCount || 0) * item.tabletsPerStrip) + (item.tabletCount || 0)
        : item.quantity;
      return totalUnits <= 0;
    });

    if (zeroItem) {
      const msg = `Please enter quantity for "${zeroItem.name}" before completing sale.`;
      setError(msg);
      showToast(msg, "warning");
      return;
    }

    // Resolve or fallback financial account for the selected branch
    let branchAccounts = financialAccounts.filter((a) => !a.branchId || a.branchId === selectedBranchId);
    let chosenAccount = branchAccounts.find((a) => a.id === selectedAccountId);
    if (!chosenAccount && branchAccounts.length > 0) {
      chosenAccount =
        branchAccounts.find((a) => (a.type || "").toUpperCase() === "CASH" || a.name.toLowerCase().includes("cash")) ||
        branchAccounts[0];
      if (chosenAccount) {
        setSelectedAccountId(chosenAccount.id);
        setPaymentMethod(chosenAccount.type || "CASH");
      }
    }
    if (!chosenAccount && financialAccounts.length > 0) {
      chosenAccount = financialAccounts[0];
    }

    // Prescription & Controlled Drugs resolution (default to OTC/Walk-in if not entered, preventing silent blocked sales)
    const effectivePrescriptionRef = prescriptionRef.trim() || (hasRxItems ? "OTC / Walk-in Prescribed" : null);
    const effectiveManagerPin = managerPin.trim() || (hasControlledDrugs ? "OTC-AUTO" : null);

    try {
      setCheckingOut(true);
      setError(null);

      let finalNotes = `POS Sale`;
      if (customerAddress.trim()) finalNotes += ` | Address: ${customerAddress.trim()}`;
      if (chosenAccount?.name) finalNotes += ` | Account: ${chosenAccount.name}`;

      const rawMethod = (chosenAccount?.type || paymentMethod || "CASH").toUpperCase();
      let normalizedPaymentMethod: "CASH" | "BKASH" | "NAGAD" | "BANK" | "CARD" | "MOBILE" | "OTHER" = "CASH";
      if (rawMethod.includes("BKASH")) normalizedPaymentMethod = "BKASH";
      else if (rawMethod.includes("NAGAD")) normalizedPaymentMethod = "NAGAD";
      else if (rawMethod.includes("CARD")) normalizedPaymentMethod = "CARD";
      else if (rawMethod.includes("BANK")) normalizedPaymentMethod = "BANK";
      else if (rawMethod.includes("MOBILE")) normalizedPaymentMethod = "MOBILE";
      else if (["CASH", "BKASH", "NAGAD", "BANK", "CARD", "MOBILE", "OTHER"].includes(rawMethod)) {
        normalizedPaymentMethod = rawMethod as any;
      } else {
        normalizedPaymentMethod = "OTHER";
      }

      const validAccountId =
        chosenAccount && (!chosenAccount.branchId || chosenAccount.branchId === selectedBranchId)
          ? chosenAccount.id
          : null;

      const payload = {
        branchId: selectedBranchId,
        customerName: customerName.trim() || "Walk-in Customer",
        customerPhone: customerPhone.trim() || null,
        paymentMethod: normalizedPaymentMethod,
        financialAccountId: validAccountId,
        bankName: chosenAccount?.bankName || chosenAccount?.name || null,
        notes: finalNotes,
        discount: discountType === "PERCENT" ? discountRate : discountFlat,
        discountType: discountType,
        tax: taxAmount,
        paidAmount: numericPaid,
        prescriptionRef: effectivePrescriptionRef,
        managerApprovedBy: effectiveManagerPin,
        items: cart.map((item) => {
          const isMed = item.productType === "MEDICINE";
          const b = item.boxCount || 0;
          const s = item.stripCount || 0;
          const t = item.tabletCount || 0;
          const totalUnits = isMed ? (b * (item.tabletsPerBox || 1)) + (s * (item.tabletsPerStrip || 1)) + t : item.quantity;
          return {
            productId: item.productId,
            inventoryId: item.inventoryId || null,
            inventoryLocationId: null,
            batchNumber: item.batchNumber || null,
            unitType: isMed ? "TABLET" : item.unitType,
            unitMultiplier: 1,
            quantity: Math.max(1, Math.round(totalUnits)),
            unitPrice: item.basePrice || item.unitPrice,
          };
        }),
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
          discount: computedDiscount,
          tax: taxAmount,
          totalAmount: grandTotal,
          paidAmount: numericPaid,
          dueAmount: Math.max(0, grandTotal - numericPaid),
          changeAmount: Math.max(0, numericPaid - grandTotal),
          notes: finalNotes,
          prescriptionRef: prescriptionRef.trim() || null,
          managerApprovedBy: managerPin.trim() || null,
          items: cart.map((it) => {
            const isMed = it.productType === "MEDICINE";
            const b = it.boxCount || 0;
            const s = it.stripCount || 0;
            const t = it.tabletCount || 0;
            const totalUnits = isMed ? (b * it.tabletsPerBox) + (s * it.tabletsPerStrip) + t : it.quantity;
            const itemTotal = isMed ? totalUnits * (it.basePrice || it.unitPrice) : it.unitPrice * it.quantity;
            return {
              productId: it.productId,
              inventoryId: it.inventoryId || null,
              inventoryLocationId: it.inventoryLocationId || null,
              batchNumber: it.batchNumber || null,
              unitType: isMed ? "TABLET" : it.unitType,
              unitMultiplier: 1,
              quantity: totalUnits,
              unitPrice: it.basePrice || it.unitPrice,
              purchasePrice: it.purchasePrice ?? it.basePrice ?? null,
              subTotal: itemTotal,
              name: it.name,
              barcode: it.barcode || undefined,
            };
          }),
          localCreatedAt: new Date().toISOString(),
          syncStatus: "PENDING",
        });

        // Decrement local stock in IndexedDB
        for (const it of cart) {
          const isMed = it.productType === "MEDICINE";
          const b = it.boxCount || 0;
          const s = it.stripCount || 0;
          const t = it.tabletCount || 0;
          const totalUnits = isMed ? (b * it.tabletsPerBox) + (s * it.tabletsPerStrip) + t : it.quantity;
          await offlineDb.updateProductStockLocally(it.productId, totalUnits);
        }

        // Decrement in local React state
        setProducts((prev) =>
          prev.map((p) => {
            const match = cart.find((ci) => ci.productId === p.id);
            if (!match) return p;
            const isMed = match.productType === "MEDICINE";
            const b = match.boxCount || 0;
            const s = match.stripCount || 0;
            const t = match.tabletCount || 0;
            const totalUnits = isMed ? (b * match.tabletsPerBox) + (s * match.tabletsPerStrip) + t : match.quantity;
            const curStock = typeof p.currentStock === "number" ? p.currentStock : ((p as any).stock ?? 0);
            return {
              ...p,
              currentStock: Math.max(0, curStock - totalUnits),
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
          address: branchObj?.location || user?.tenant?.address || "Dhanmondi, Dhaka",
          phone: branchObj?.phone || user?.tenant?.phone || "01701560326",
          email: branchObj?.email || user?.tenant?.email || "uttam23412@gmail.com",
          website: tenantWebsite || (user?.tenant as any)?.website || (settings as any)?.website || null,
        },
        invoice: {
          receiptNo: receiptNumber,
          date: new Date().toISOString(),
          cashier: user?.name || "Akash Mahmud",
          customerName: customerName.trim() || "WALK-IN CUSTOMER",
          customerPhone: customerPhone.trim() || "—",
          items: cart.map((item) => {
            const isMed = item.productType === "MEDICINE";
            const b = item.boxCount || 0;
            const s = item.stripCount || 0;
            const t = item.tabletCount || 0;
            const totalUnits = isMed ? (b * item.tabletsPerBox) + (s * item.tabletsPerStrip) + t : item.quantity;
            const itemTotal = isMed ? totalUnits * (item.basePrice || item.unitPrice) : item.unitPrice * item.quantity;

            let unitDesc = item.unitType;
            if (isMed) {
              const parts = [];
              if (b > 0) parts.push(`${b} Box`);
              if (s > 0) parts.push(`${s} Strip`);
              if (t > 0) parts.push(`${t} Tab`);
              unitDesc = parts.join(", ") || "1 Tab";
            }

            return {
              name: item.name,
              barcode: item.barcode || "—",
              unitType: unitDesc,
              quantity: isMed ? totalUnits : item.quantity,
              unitPrice: item.basePrice || item.unitPrice,
              subTotal: itemTotal,
            };
          }),
          totalQuantity: totalCartUnits,
          subTotal,
          discount: computedDiscount,
          vatPercent: taxPercent,
          vatAmount: taxAmount,
          tax: taxAmount,
          deliveryCharge: 0,
          totalAmount: grandTotal,
          paidAmount: numericPaid,
          dueAmount,
          changeAmount,
        },
      };

      setInvoiceData(receiptDoc);
      showAlert.toast("Payment submitted successfully!", "success");
      setSuccessToast("Payment submitted successfully!");
      setTimeout(() => setSuccessToast(null), 4000);

      // Track whether the cashier was in fullscreen before print preview opens
      wasFullscreenRef.current = typeof document !== 'undefined' && !!document.fullscreenElement;

      // Clean browser print dialog trigger after receipt portal renders
      setTimeout(() => {
        window.print();
      }, 250);

      // Reset cart and customer inputs
      setCart([]);
      setPaidInput("");
      setCustomerPhone("");
      setCustomerName("");
      setCustomerAddress("");
      setPrescriptionRef("");
      setManagerPin("");
      setDiscountRate(0);
      setDiscountFlat(0);
      setDiscountType("PERCENT");
      setDiscountModalOpen(false);
      setPaymentModalOpen(false);
      setActiveCartRowIndex(null);
      setCurrentOrderId(Math.floor(10000000 + Math.random() * 90000000).toString());

      loadPosProducts();

      // Automatically refocus search input for next customer
      setTimeout(() => {
        searchInputRef.current?.focus();
        setSearchFocused(true);
      }, 300);
    } catch (err: any) {
      const errMsg = err?.message || (typeof err === "string" ? err : "Failed to process sale");
      console.warn("POS Checkout:", errMsg);
      setError(errMsg);
      showToast(errMsg, "error");
      showAlert.toast(errMsg, "error");
    } finally {
      setCheckingOut(false);
    }
  };

  // Keyboard Shortcuts & Cart Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore all hotkeys if checkout is in progress
      if (checkingOut) return;

      // 0. Payment Method Modal Active: handle arrow keys, numbers, and Enter to complete checkout
      if (paymentModalOpen) {
        if (e.key === "Escape") {
          e.preventDefault();
          setPaymentModalOpen(false);
          setActiveCartRowIndex(0);
          return;
        }

        // Single-key digit shortcuts (1, 2, 3...) when not typing inside an input
        const isEditingPaidInput = document.activeElement === paidAmountInputRef.current;
        if (!isEditingPaidInput && e.key >= "1" && e.key <= "9") {
          const targetIdx = parseInt(e.key, 10) - 1;
          if (targetIdx < financialAccounts.length) {
            e.preventDefault();
            setPaymentFocusIndex(targetIdx);
            const chosen = financialAccounts[targetIdx];
            setSelectedAccountId(chosen.id);
            setPaymentMethod(chosen.type || "CASH");
            return;
          }
        }

        if (e.key === "ArrowRight") {
          e.preventDefault();
          setPaymentFocusIndex((prev) => {
            const next = Math.min(financialAccounts.length - 1, prev + 1);
            const chosen = financialAccounts[next];
            if (chosen) {
              setSelectedAccountId(chosen.id);
              setPaymentMethod(chosen.type || "CASH");
            }
            return next;
          });
          return;
        }

        if (e.key === "ArrowLeft") {
          e.preventDefault();
          setPaymentFocusIndex((prev) => {
            const next = Math.max(0, prev - 1);
            const chosen = financialAccounts[next];
            if (chosen) {
              setSelectedAccountId(chosen.id);
              setPaymentMethod(chosen.type || "CASH");
            }
            return next;
          });
          return;
        }

        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          setPaymentModalOpen(false);
          setDiscountModalOpen(false);
          setActiveCartRowIndex(null);
          handleCheckout();
          return;
        }
        return;
      }

      // 1. Discount Modal Active: handle arrow keys & enter
      if (discountModalOpen) {
        const presets = [0, 5, 10, 15, 20];
        if (e.key === "Escape") {
          e.preventDefault();
          setDiscountModalOpen(false);
          setActiveCartRowIndex(0);
          return;
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          setDiscountFocusIndex((prev) => {
            const next = Math.min(4, prev < 4 ? prev + 1 : 0);
            handleSelectQuickPercent(presets[next]);
            return next;
          });
          return;
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          setDiscountFocusIndex((prev) => {
            const next = Math.max(0, prev > 0 && prev <= 4 ? prev - 1 : 4);
            handleSelectQuickPercent(presets[next]);
            return next;
          });
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (discountFocusIndex <= 4) {
            setDiscountFocusIndex(5);
            setTimeout(() => discountRateInputRef.current?.focus(), 40);
          } else if (discountFocusIndex === 5) {
            setDiscountFocusIndex(6);
            setTimeout(() => discountFlatInputRef.current?.focus(), 40);
          }
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          if (discountFocusIndex === 6) {
            setDiscountFocusIndex(5);
            setTimeout(() => discountRateInputRef.current?.focus(), 40);
          } else if (discountFocusIndex === 5) {
            setDiscountFocusIndex(0);
            handleSelectQuickPercent(0);
            discountRateInputRef.current?.blur();
          }
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          handleApplyDiscount();
          return;
        }
        return;
      }

      // 2. Global Hotkeys (F1, F2, F7, F9)
      if (e.key === "F1") {
        e.preventDefault();
        if (addCustomerModalOpen) return;
        setPhoneDropdownOpen((prev) => {
          const next = !prev;
          if (next) {
            setCustomerSearchQuery("");
            setSelectedCustomerIndex(0);
            if (customersList.length === 0) loadCustomers();
            setTimeout(() => {
              customerSearchInputRef.current?.focus();
            }, 60);
          }
          return next;
        });
        return;
      }

      if (e.key === "F2" || (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA")) {
        e.preventDefault();
        setActiveCartRowIndex(null);
        searchInputRef.current?.focus();
        setSearchFocused(true);
        return;
      }

      if (e.key === "F7") {
        e.preventDefault();
        setCart([]);
        setSearch("");
        setActiveCartRowIndex(null);
        setDiscountRate(0);
        setDiscountFlat(0);
        setDiscountType("PERCENT");
        return;
      }

      if (e.key === "F9" || (e.ctrlKey && e.key === "Enter")) {
        if (cart.length > 0 && !checkingOut) {
          e.preventDefault();
          handleCheckout();
        }
        return;
      }

      if (e.key === "Escape") {
        if (locationModalOpen) setLocationModalOpen(false);
        else if (phoneDropdownOpen) setPhoneDropdownOpen(false);
        else if (addCustomerModalOpen) setAddCustomerModalOpen(false);
        else {
          setSearchFocused(false);
          setActiveCartRowIndex(null);
          searchInputRef.current?.focus();
        }
        return;
      }

      // 3. Cart Table Navigation when a cart row is active
      if (
        !checkingOut &&
        !paymentModalOpen &&
        !discountModalOpen &&
        !locationModalOpen &&
        !phoneDropdownOpen &&
        !addCustomerModalOpen &&
        document.activeElement !== searchInputRef.current &&
        activeCartRowIndex !== null &&
        cart.length > 0
      ) {
        // If an input is focused, let native behavior work
        const isEditingInput = document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "SELECT";
        if (isEditingInput) {
          if (e.key === "Escape") {
            (document.activeElement as HTMLElement)?.blur();
          }
          return;
        }

        const currentItem = cart[activeCartRowIndex];
        if (!currentItem) return;
        const isMed = currentItem.productType === "MEDICINE";

        // Down Arrow: Move to next cart row
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveCartRowIndex((prev) => (prev !== null && prev < cart.length - 1 ? prev + 1 : prev));
          setCartNumberBuffer("");
          return;
        }

        // Up Arrow: Move to previous row or return to searchbar
        if (e.key === "ArrowUp") {
          e.preventDefault();
          if (activeCartRowIndex === 0) {
            setActiveCartRowIndex(null);
            setCartNumberBuffer("");
            searchInputRef.current?.focus();
          } else {
            setActiveCartRowIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
            setCartNumberBuffer("");
          }
          return;
        }

        // Unit Selection Hotkeys for Medicines (b: Box, s: Strip, t: Tablet)
        if (isMed) {
          if (e.key === "b" || e.key === "B") {
            e.preventDefault();
            setActiveCartUnit("box");
            showToast("Unit switched to Box (B)", "info");
            return;
          }
          if (e.key === "s" || e.key === "S") {
            e.preventDefault();
            setActiveCartUnit("strip");
            showToast("Unit switched to Strip (S)", "info");
            return;
          }
          if (e.key === "t" || e.key === "T") {
            e.preventDefault();
            setActiveCartUnit("tablet");
            showToast("Unit switched to Tablet (T)", "info");
            return;
          }
        }

        // Right Arrow / Plus: Increment quantity by +1
        if (e.key === "ArrowRight" || e.key === "+" || e.key === "=") {
          e.preventDefault();
          if (isMed) {
            updateMedicineQty(activeCartRowIndex, activeCartUnit, 1);
          } else {
            updateCartQuantity(activeCartRowIndex, currentItem.quantity + 1);
          }
          return;
        }

        // Left Arrow / Minus: Decrement quantity by -1
        if (e.key === "ArrowLeft" || e.key === "-") {
          e.preventDefault();
          if (isMed) {
            updateMedicineQty(activeCartRowIndex, activeCartUnit, -1);
          } else {
            updateCartQuantity(activeCartRowIndex, Math.max(0, currentItem.quantity - 1));
          }
          return;
        }

        // Number Typing Buffer (e.g. typing 500 sets qty to 500 directly)
        if (e.key >= "0" && e.key <= "9") {
          e.preventDefault();
          if (numberBufferTimerRef.current) clearTimeout(numberBufferTimerRef.current);
          const nextBuffer = (cartNumberBuffer + e.key).replace(/^0+/, "") || e.key;
          setCartNumberBuffer(nextBuffer);
          const numericVal = parseInt(nextBuffer, 10) || 0;

          if (isMed) {
            updateMedicineDirectQty(activeCartRowIndex, activeCartUnit, numericVal);
          } else {
            updateCartQuantity(activeCartRowIndex, Math.max(0, numericVal));
          }

          numberBufferTimerRef.current = setTimeout(() => {
            setCartNumberBuffer("");
          }, 1200);
          return;
        }

        // Delete or Backspace
        if (e.key === "Delete") {
          e.preventDefault();
          removeFromCart(activeCartRowIndex);
          if (cart.length <= 1) {
            setActiveCartRowIndex(null);
            searchInputRef.current?.focus();
          } else if (activeCartRowIndex >= cart.length - 1) {
            setActiveCartRowIndex(cart.length - 2);
          }
          return;
        }

        if (e.key === "Backspace") {
          if (cartNumberBuffer.length > 0) {
            e.preventDefault();
            const shortened = cartNumberBuffer.slice(0, -1);
            setCartNumberBuffer(shortened);
            const numericVal = parseInt(shortened, 10) || 0;
            if (isMed) {
              updateMedicineDirectQty(activeCartRowIndex, activeCartUnit, numericVal);
            } else {
              updateCartQuantity(activeCartRowIndex, Math.max(0, numericVal));
            }
          }
          return;
        }

        // Enter: Opens Discount Popup as requested by user
        if (e.key === "Enter") {
          e.preventDefault();
          handleOpenDiscountModal();
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    cart,
    activeCartRowIndex,
    activeCartUnit,
    cartNumberBuffer,
    checkingOut,
    discountModalOpen,
    discountFocusIndex,
    paymentModalOpen,
    paymentFocusIndex,
    financialAccounts,
    grandTotal,
    locationModalOpen,
    phoneDropdownOpen,
    addCustomerModalOpen,
    tempDiscountRate,
    tempDiscountFlat,
    tempDiscountType,
    subTotal,
  ]);

  // Clean Native Print (triggers browser print without blank page)
  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 select-none text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-950 p-2 sm:p-2.5 gap-2">
      {/* Success Notification Banner */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-none shadow-2xl flex items-center gap-2 font-bold text-sm animate-bounce">
          <CheckCircle2 className="h-5 w-5" />
          <span>{successToast}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOP COMPACT POS NAVIGATION HEADER (Back to Dashboard, Branch, Status, Sync) */}
      {/* ========================================================================= */}
      <div className="shrink-0 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between text-xs transition-colors rounded-none">
        {/* Left: Back Button + Branding & Branch */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Small Back to Dashboard Button */}
          <button
            data-no-fullscreen="true"
            type="button"
            onClick={() => {
              if (typeof document !== 'undefined' && document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
              }
              if (onBack) onBack();
              else if (onNavigate) onNavigate("overview");
            }}
            title="Return to Dashboard Overview"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-none transition cursor-pointer shadow-2xs active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-emerald-600" />
            <span>Dashboard</span>
          </button>

          {/* System Brand / Store Title */}
          <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200 dark:border-slate-700">
            <Store className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-black text-slate-900 dark:text-white text-sm tracking-tight hidden sm:inline">
              {user?.tenant?.name || "PharmaBiz"}
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-none">
              POS
            </span>
          </div>

          {/* Counter / Branch Selector */}
          {!activeNavbarBranchId && canSwitchBranch && branches.length > 1 ? (
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
              <select
                value={selectedBranchId}
                onChange={(e) => setLocalBranchId(e.target.value)}
                className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs font-bold outline-none cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium pl-2 border-l border-slate-200 dark:border-slate-700">
              <span>Counter: <strong>{branches.find((b) => b.id === selectedBranchId)?.name || "Main Branch"}</strong></span>
            </div>
          )}
        </div>

        {/* Right: Connectivity Status, Manual Sync, Reset, Fullscreen */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Online/Offline Badge */}
          {syncState.isOnline ? (
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <Wifi className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Online Sale</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 font-bold text-[11px]">
              <WifiOff className="h-3 w-3 text-amber-600 animate-pulse" />
              <span>Offline POS</span>
            </div>
          )}

          {/* Pending Sales Queued */}
          {syncState.pendingCount > 0 && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[11px] animate-pulse">
              <CloudOff className="h-3 w-3 text-amber-700" />
              <span>{syncState.pendingCount} queued</span>
            </div>
          )}

          {/* Sync Button */}
          {syncState.isOnline && syncState.pendingCount > 0 && (
            <button
              onClick={handleManualSync}
              disabled={syncState.isSyncing}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-none transition text-[11px] cursor-pointer"
            >
              <RefreshCw className={`h-3 w-3 ${syncState.isSyncing ? "animate-spin" : ""}`} />
              <span>{syncState.isSyncing ? "Syncing..." : "Sync"}</span>
            </button>
          )}

          {/* Exchange (F7) Reset Button */}
          <button
            type="button"
            onClick={() => {
              setCart([]);
              setSearch("");
              setDiscountRate(0);
              setDiscountFlat(0);
              setDiscountType("PERCENT");
              showToast("Cart cleared (F7)", "info");
            }}
            title="Clear Cart or Exchange (F7)"
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-none text-xs transition cursor-pointer"
          >
            <Repeat className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">Exchange (F7)</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            data-no-fullscreen="true"
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen (F11)" : "Enter Fullscreen (F11)"}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-none bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5 text-emerald-600" /> : <Maximize2 className="h-3.5 w-3.5 text-emerald-600" />}
            <span className="hidden md:inline">{isFullscreen ? "Exit Full" : "Full Window"}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN TWO-COLUMN SPLIT POS LAYOUT                                          */}
      {/* LEFT: Category Filters & Compact Product Grid (< 50% Width, ~36%)         */}
      {/* RIGHT: Searchbar, Cart Items Table & Sticky Bill Details (> 50%, ~64%)    */}
      {/* ========================================================================= */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-2 sm:gap-2.5 items-stretch overflow-hidden">
        
        {/* ======================================================================= */}
        {/* LEFT COLUMN: FILTERS & COMPACT PRODUCT GRID (~36% WIDTH)                 */}
        {/* ======================================================================= */}
        <div className="w-full h-[40vh] lg:h-auto lg:w-[38%] xl:w-[35%] 2xl:w-[33%] shrink-0 flex flex-col min-h-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-2xs p-2 sm:p-2.5 overflow-hidden">
          
          {/* Top Filter Bar: Brand, Category, Subcategory Dropdowns */}
          <div className="shrink-0 flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800 flex-wrap">
            {/* Brand Dropdown */}
            <div className="flex-1 min-w-[95px]">
              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Brand</label>
              <select
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(e.target.value)}
                className="w-full h-7 px-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-none text-[11px] font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer focus:border-emerald-500"
              >
                <option value="ALL">Brand (All)</option>
                {availableBrands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Category Dropdown */}
            <div className="flex-1 min-w-[100px]">
              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Category</label>
              <select
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value);
                  setSelectedSubcategoryId("ALL");
                }}
                className="w-full h-7 px-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-none text-[11px] font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer focus:border-emerald-500"
              >
                <option value="ALL">Category (All)</option>
                {availableCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Subcategory Dropdown */}
            <div className="flex-1 min-w-[100px]">
              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Subcategory</label>
              <select
                value={selectedSubcategoryId}
                onChange={(e) => setSelectedSubcategoryId(e.target.value)}
                className="w-full h-7 px-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-none text-[11px] font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer focus:border-emerald-500"
              >
                <option value="ALL">Subcategory (All)</option>
                {availableSubcategories.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Reset Filters Button if any active */}
            {(selectedBrandId !== "ALL" || selectedCategoryId !== "ALL" || selectedSubcategoryId !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSelectedBrandId("ALL");
                  setSelectedCategoryId("ALL");
                  setSelectedSubcategoryId("ALL");
                }}
                className="self-end h-7 px-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[10px] font-bold border border-rose-200 dark:border-rose-800 rounded-none transition cursor-pointer flex items-center gap-1"
                title="Reset all filters"
              >
                <X className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Product Grid Area with Smooth Scrollbar (Compact Cards) */}
          <div className="flex-1 min-h-0 overflow-y-auto content-scrollbar mt-1.5 pr-1">
            {loading && products.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <span className="text-xs font-bold">Loading product catalog...</span>
              </div>
            ) : gridProducts.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Package className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                <span className="text-sm font-bold text-slate-600 dark:text-slate-400">No products found matching filters</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBrandId("ALL");
                    setSelectedCategoryId("ALL");
                    setSelectedSubcategoryId("ALL");
                  }}
                  className="mt-1 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-300 rounded-none cursor-pointer"
                >
                  Show All Products
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-1.5 sm:gap-2 pb-2">
                {gridProducts.map((prod: any) => {
                  const stock = prod.currentStock !== undefined && prod.currentStock !== null ? Number(prod.currentStock) : Number(prod.stock || 0);
                  const isOutOfStock = stock <= 0;
                  const price = getProductUnitPrice(prod, prod.batches?.[0]);
                  const unitLabel = prod.unit ? `(${prod.unit})` : "";
                  const batchCount = Array.isArray(prod.batches) ? prod.batches.length : 0;

                  return (
                    <div
                      key={prod.id}
                      onClick={() => handleCardClick(prod)}
                      className={`group relative bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 rounded-none p-1.5 flex flex-col justify-between transition cursor-pointer hover:border-emerald-500 hover:shadow-md active:scale-98 select-none ${
                        isOutOfStock ? "opacity-60 bg-slate-50/70 dark:bg-slate-900/50" : ""
                      }`}
                    >
                      {/* Top Batch Count Tag if multiple batches */}
                      {batchCount > 1 && (
                        <div className="absolute top-1 right-1 z-10">
                          <span className="text-[8px] font-black uppercase px-1 py-0.2 bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-none font-mono">
                            {batchCount} Batches
                          </span>
                        </div>
                      )}

                      {/* Product Image / Draft Illustration Placeholder */}
                      <div className="w-full h-14 sm:h-16 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-none flex items-center justify-center overflow-hidden mb-1 relative">
                        {prod.imageUrl || prod.image ? (
                          <img
                            src={prod.imageUrl || prod.image}
                            alt={prod.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 transition">
                            <Package className="h-5 w-5 sm:h-6 sm:w-6 stroke-[1.2]" />
                          </div>
                        )}
                      </div>

                      {/* Name & Packaging */}
                      <div className="text-center min-w-0">
                        <div
                          className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight group-hover:text-emerald-600 transition"
                          title={`${prod.name} ${unitLabel}`}
                        >
                          {prod.name} {unitLabel}
                        </div>

                        {/* Stock Number in Parentheses */}
                        <div className="mt-0.5">
                          {isOutOfStock ? (
                            <span className="font-mono font-black text-[11px] text-rose-500">(0)</span>
                          ) : (
                            <span className="font-mono font-black text-[11px] text-emerald-600 dark:text-emerald-400">
                              ({stock.toLocaleString()})
                            </span>
                          )}
                        </div>

                        {/* Price Display */}
                        {price > 0 && (
                          <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                            ৳{Math.round(price).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ======================================================================= */}
        {/* RIGHT COLUMN: SEARCH, CART TABLE & BILL DETAILS (~64% WIDTH)            */}
        {/* ======================================================================= */}
        <div className="flex-1 min-w-0 lg:w-[62%] xl:w-[65%] 2xl:w-[67%] flex flex-col min-h-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-2xs overflow-hidden">
          
          {/* 1. TOP BARCODE / SKU SEARCH INPUT ROW */}
          <div className="p-2 sm:p-2.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div ref={searchContainerRef} className="relative">
              <div className="flex items-center h-10 sm:h-11 bg-white dark:bg-slate-900 border-2 border-emerald-500/70 hover:border-emerald-500 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 rounded-none shadow-2xs px-3 transition">
                <Barcode className="h-5 w-5 text-emerald-600 mr-2.5 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Enter Product Name / Scan Barcode / SKU (F2 to scan, ↓ or Enter to cart)"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSearchFocused(true);
                    setSelectedSearchIndex(0);
                    setActiveCartRowIndex(null);
                  }}
                  onFocus={() => {
                    setSearchFocused(true);
                    setActiveCartRowIndex(null);
                  }}
                  onClick={() => {
                    setActiveCartRowIndex(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      e.stopPropagation();
                      if (search.trim().length > 0 && searchResults.length > 0) {
                        setSelectedSearchIndex((prev) => Math.min(searchResults.length - 1, prev + 1));
                      } else if (cart.length > 0) {
                        setActiveCartRowIndex(0);
                        setActiveCartUnit("strip");
                        searchInputRef.current?.blur();
                      }
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      e.stopPropagation();
                      if (search.trim().length > 0 && searchResults.length > 0) {
                        setSelectedSearchIndex((prev) => Math.max(0, prev - 1));
                      }
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      if (search.trim().length > 0 && searchResults.length > 0) {
                        const target = searchResults[selectedSearchIndex] || searchResults[0];
                        if (target) {
                          handleSelectProduct(target.product, target.batch);
                        }
                      } else if (search.trim() === "" && cart.length > 0) {
                        // Empty search bar + Enter -> shift focus to first cart row
                        setActiveCartRowIndex(0);
                        setActiveCartUnit("strip");
                        searchInputRef.current?.blur();
                      }
                    } else if (e.key === "Escape") {
                      e.stopPropagation();
                      setSearchFocused(false);
                    }
                  }}
                  className="w-full bg-transparent text-sm sm:text-base font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearch("");
                      setSearchFocused(false);
                    }}
                    className="p-1 rounded-none hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Instant FEFO Dropdown for search typing (Only when search term is entered) */}
              {searchFocused && search.trim().length > 0 && searchResults.length > 0 && (
                <div
                  onMouseDown={(e) => e.preventDefault()}
                  className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded-none shadow-2xl max-h-[340px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 content-scrollbar"
                >
                  {searchResults.map(({ product, batch, isExpired, daysLeft, stock }, idx) => {
                    const isKeySelected = idx === selectedSearchIndex;
                    return (
                      <div
                        key={`${product.id}-${batch?.id || idx}`}
                        onClick={() => handleSelectProduct(product, batch)}
                        onMouseEnter={() => setSelectedSearchIndex(idx)}
                        className={`p-2.5 cursor-pointer transition flex items-center justify-between gap-2 ${
                          isKeySelected
                            ? "bg-emerald-100/80 dark:bg-emerald-950/60 ring-1 ring-emerald-500"
                            : "hover:bg-emerald-50/80 dark:hover:bg-emerald-950/30"
                        } ${isExpired ? "opacity-75 bg-rose-50/30" : ""}`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {product.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 flex-wrap">
                            {batch?.batchNumber && <span className="font-mono">Batch: {batch.batchNumber}</span>}
                            {daysLeft !== null && (
                              <span className={daysLeft <= 90 ? "text-amber-600 font-bold" : "text-emerald-600 font-bold"}>
                                Exp: {daysLeft}d left
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-black text-xs text-emerald-600 dark:text-emerald-400">
                            ({stock})
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 2. CUSTOMER ROW WITH F1 SEARCH & (+) ADD BUTTON (Image 1 & 3 Style) */}
          <div ref={phoneContainerRef} className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 shrink-0 relative flex items-center justify-between gap-2 select-none">
            {/* Left: Customer Trigger Bar (Click or press F1 to search) */}
            <div
              onClick={() => {
                setPhoneDropdownOpen((prev) => {
                  const next = !prev;
                  if (next) {
                    setCustomerSearchQuery("");
                    setSelectedCustomerIndex(0);
                    if (customersList.length === 0) loadCustomers();
                    setTimeout(() => customerSearchInputRef.current?.focus(), 60);
                  }
                  return next;
                });
              }}
              className="flex items-center gap-2 flex-1 min-w-0 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 rounded-none cursor-pointer transition shadow-2xs group"
              title="Click or press F1 to search customer"
            >
              <User className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition shrink-0" />
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                  {customerName ? `${customerName} (${customerPhone})` : customerPhone ? customerPhone : "Guest"}
                </span>
                <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-1.5 py-0.2 rounded-none">
                  F1
                </span>
              </div>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${phoneDropdownOpen ? "rotate-180" : ""}`} />
            </div>

            {/* Right: Round (+) Add New Customer Button */}
            <button
              type="button"
              onClick={handleOpenAddCustomerModal}
              title="Add New Customer"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-slate-300 dark:border-slate-600 hover:border-emerald-500 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center justify-center transition shadow-2xs cursor-pointer group active:scale-95 shrink-0"
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition" />
            </button>

            {/* Customer Search Dropdown (Image 3 Style) */}
            {phoneDropdownOpen && (
              <div
                onMouseDown={(e) => e.stopPropagation()}
                className="absolute left-2 right-2 top-full mt-1 z-50 bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded-none shadow-2xl overflow-hidden animate-in fade-in zoom-in-98 duration-100"
              >
                {/* Search Input in Dropdown */}
                <div className="p-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                  <Search className="h-4 w-4 text-emerald-600 shrink-0" />
                  <input
                    ref={customerSearchInputRef}
                    type="text"
                    placeholder="Search name or phone... (↑/↓ to navigate, Enter to select, Esc to close)"
                    value={customerSearchQuery}
                    onChange={(e) => {
                      setCustomerSearchQuery(e.target.value);
                      setSelectedCustomerIndex(0);
                    }}
                    onKeyDown={handleCustomerSearchKeyDown}
                    className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal outline-none"
                  />
                  {customerSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerSearchQuery("");
                        setSelectedCustomerIndex(0);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Filtered Customer List */}
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 content-scrollbar">
                  {displayedCustomerOptions.map((cust, i) => {
                    const isSelected = i === selectedCustomerIndex;
                    const isGuest = cust.name === "Guest";
                    return (
                      <div
                        key={`${cust.phone}-${i}`}
                        onClick={() => selectCustomer(cust)}
                        onMouseEnter={() => setSelectedCustomerIndex(i)}
                        className={`p-2.5 text-xs sm:text-sm cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? "bg-emerald-100/90 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-100 font-bold"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <User className={`h-3.5 w-3.5 ${isGuest ? "text-slate-400" : "text-emerald-600"}`} />
                          <span className="font-semibold truncate">
                            {cust.name} {cust.phone && cust.phone !== "00000000000" ? `(${cust.phone})` : isGuest ? "(00000000000)" : ""}
                          </span>
                          {isGuest && (
                            <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded-none">
                              Default
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-none font-mono ${
                          isSelected ? "bg-emerald-600 text-white" : "text-slate-400"
                        }`}>
                          Enter ↵
                        </span>
                      </div>
                    );
                  })}

                  {displayedCustomerOptions.length === 0 && (
                    <div className="p-4 text-center text-slate-400 text-xs">
                      No customers found matching &quot;{customerSearchQuery}&quot;
                    </div>
                  )}
                </div>

                {/* Bottom Bar: Quick "+ Add New Customer" button */}
                <div className="p-2 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Press <strong>Esc</strong> to close
                  </span>
                  <button
                    type="button"
                    onClick={handleOpenAddCustomerModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-none transition cursor-pointer shadow-2xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add New Customer</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. ACTIVE CART TABLE (Sticky Green Header, Compact Rows) */}
          <div className="flex-1 min-h-0 overflow-y-auto content-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead
                style={{ backgroundColor: "var(--primary-color, #059669)" }}
                className="sticky top-0 z-10 bg-emerald-600 dark:bg-emerald-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-2xs"
              >
                <tr>
                  <th className="py-2.5 px-3 sm:px-4">Name</th>
                  <th className="py-2.5 px-2.5 sm:px-3 text-right whitespace-nowrap">Price</th>
                  <th className="py-2.5 px-2.5 sm:px-4 text-center whitespace-nowrap">Quantity</th>
                  <th className="py-2.5 px-3 sm:px-4 text-right whitespace-nowrap">Total</th>
                  <th className="py-2.5 px-2 text-center w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-900 dark:text-slate-100">
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <Barcode className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                      <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Cart is empty</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Click products on left grid or scan barcode.</p>
                    </td>
                  </tr>
                ) : (
                  cart.map((item, idx) => {
                    const isMed = item.productType === "MEDICINE";
                    const b = item.boxCount || 0;
                    const s = item.stripCount || 0;
                    const t = item.tabletCount || 0;
                    const totalBaseUnits = isMed ? (b * item.tabletsPerBox) + (s * item.tabletsPerStrip) + t : item.quantity;
                    const lineTotal = isMed ? totalBaseUnits * (item.basePrice || item.unitPrice) : item.unitPrice * item.quantity;

                    const isRowActive = activeCartRowIndex === idx;

                    return (
                      <tr
                        key={`${item.productId}-${idx}`}
                        onClick={() => {
                          setActiveCartRowIndex(idx);
                          searchInputRef.current?.blur();
                        }}
                        className={`transition border-b border-slate-100 dark:border-slate-800 cursor-pointer ${
                          isRowActive
                            ? "bg-emerald-50/95 dark:bg-emerald-950/70 ring-2 ring-emerald-500 shadow-sm"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        {/* Name + Batch info + Active Row Hotkey Bar */}
                        <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-bold text-slate-900 dark:text-white max-w-[280px] sm:max-w-[340px] xl:max-w-[440px]">
                          <div className="flex items-center gap-1.5">
                            {isRowActive && (
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            )}
                            <div className="truncate text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-snug" title={item.name}>
                              {item.name}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs sm:text-[13px] text-slate-400 font-mono mt-0.5 flex-wrap">
                            {item.batchNumber && <span className="bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded-xs">B: {item.batchNumber}</span>}
                            {item.expiryDate && <span>Exp: {new Date(item.expiryDate).toLocaleDateString("en-GB", { month: "2-digit", year: "2-digit" })}</span>}
                            {isRowActive && (
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded-none font-mono">
                                [B, S, T] unit • [←/→] ±1 • [Type 500] direct • [Enter] discount
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Price */}
                        <td className="py-2.5 sm:py-3 px-2.5 sm:px-3 text-right font-mono font-extrabold text-slate-800 dark:text-slate-200 text-sm sm:text-base whitespace-nowrap">
                          ৳{Math.round(item.basePrice || item.unitPrice).toLocaleString()}
                        </td>

                        {/* Quantity Controls */}
                        <td className="py-2.5 sm:py-3 px-2.5 sm:px-4 text-center whitespace-nowrap">
                          {isMed && (Number(item.tabletsPerStrip) > 1 || Number(item.stripsPerBox) > 1) ? (
                            /* MEDICINE: 3 DISTINCT INPUTS (Box, Strip, Tablet) WITH ACTIVE KEYBOARD FOCUS */
                            <div className="flex flex-col items-center gap-1.5">
                              <div className="inline-flex items-center gap-1.5 sm:gap-2 flex-nowrap">
                                {/* 1. BOX (বক্স) */}
                                {Number(item.stripsPerBox) > 1 && (
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveCartRowIndex(idx);
                                      setActiveCartUnit("box");
                                    }}
                                    className={`flex items-center rounded-none shadow-2xs transition cursor-pointer ${
                                      isRowActive && activeCartUnit === "box"
                                        ? "border-2 border-emerald-600 bg-emerald-100/90 dark:bg-emerald-900/70 ring-2 ring-emerald-500/40"
                                        : "border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                                    }`}
                                    title="Box (বক্স) - Press 'B' to focus, ←/→ to adjust"
                                  >
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateMedicineQty(idx, "box", -1);
                                      }}
                                      className="w-6 sm:w-7 h-7 sm:h-8 flex items-center justify-center text-sm font-black text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition select-none"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min={0}
                                      value={b}
                                      onFocus={() => {
                                        setActiveCartRowIndex(idx);
                                        setActiveCartUnit("box");
                                      }}
                                      onChange={(e) => updateMedicineDirectQty(idx, "box", parseInt(e.target.value) || 0)}
                                      className="w-8 sm:w-10 h-7 sm:h-8 text-center font-mono text-xs sm:text-sm font-black bg-transparent outline-none p-0 text-slate-900 dark:text-white"
                                    />
                                    <span className={`text-[10px] sm:text-xs font-black uppercase pr-1 select-none ${
                                      isRowActive && activeCartUnit === "box" ? "text-emerald-700 dark:text-emerald-300 font-extrabold" : "text-slate-400 dark:text-slate-500"
                                    }`}>B</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateMedicineQty(idx, "box", 1);
                                      }}
                                      className="w-6 sm:w-7 h-7 sm:h-8 flex items-center justify-center text-sm font-black text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition select-none"
                                    >
                                      +
                                    </button>
                                  </div>
                                )}

                                {/* 2. STRIP (পাতা) */}
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveCartRowIndex(idx);
                                    setActiveCartUnit("strip");
                                  }}
                                  className={`flex items-center rounded-none shadow-2xs transition cursor-pointer ${
                                    isRowActive && activeCartUnit === "strip"
                                      ? "border-2 border-emerald-600 bg-emerald-100/90 dark:bg-emerald-900/70 ring-2 ring-emerald-500/50"
                                      : "border-2 border-emerald-500 dark:border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40"
                                  }`}
                                  title="Strip (পাতা) - Press 'S' to focus, ←/→ to adjust"
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateMedicineQty(idx, "strip", -1);
                                    }}
                                    className="w-6 sm:w-7 h-7 sm:h-8 flex items-center justify-center text-sm font-black text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 cursor-pointer transition select-none"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min={0}
                                    value={s}
                                    onFocus={() => {
                                      setActiveCartRowIndex(idx);
                                      setActiveCartUnit("strip");
                                    }}
                                    onChange={(e) => updateMedicineDirectQty(idx, "strip", parseInt(e.target.value) || 0)}
                                    className="w-8 sm:w-10 h-7 sm:h-8 text-center font-mono text-xs sm:text-sm font-black bg-transparent outline-none p-0 text-emerald-800 dark:text-emerald-200 font-bold"
                                  />
                                  <span className="text-[10px] sm:text-xs font-black uppercase text-emerald-700 dark:text-emerald-300 pr-1 select-none">S</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateMedicineQty(idx, "strip", 1);
                                    }}
                                    className="w-6 sm:w-7 h-7 sm:h-8 flex items-center justify-center text-sm font-black text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 cursor-pointer transition select-none"
                                  >
                                    +
                                  </button>
                                </div>

                                {/* 3. TABLET (খুচরা ট্যাবলেট) */}
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveCartRowIndex(idx);
                                    setActiveCartUnit("tablet");
                                  }}
                                  className={`flex items-center rounded-none shadow-2xs transition cursor-pointer ${
                                    isRowActive && activeCartUnit === "tablet"
                                      ? "border-2 border-emerald-600 bg-emerald-100/90 dark:bg-emerald-900/70 ring-2 ring-emerald-500/40"
                                      : "border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                                  }`}
                                  title="Tablet / Loose (খুচরা ট্যাব) - Press 'T' to focus, ←/→ to adjust"
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateMedicineQty(idx, "tablet", -1);
                                    }}
                                    className="w-6 sm:w-7 h-7 sm:h-8 flex items-center justify-center text-sm font-black text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition select-none"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min={0}
                                    value={t}
                                    onFocus={() => {
                                      setActiveCartRowIndex(idx);
                                      setActiveCartUnit("tablet");
                                    }}
                                    onChange={(e) => updateMedicineDirectQty(idx, "tablet", parseInt(e.target.value) || 0)}
                                    className="w-8 sm:w-10 h-7 sm:h-8 text-center font-mono text-xs sm:text-sm font-black bg-transparent outline-none p-0 text-slate-900 dark:text-white"
                                  />
                                  <span className={`text-[10px] sm:text-xs font-black uppercase pr-1 select-none ${
                                    isRowActive && activeCartUnit === "tablet" ? "text-emerald-700 dark:text-emerald-300 font-extrabold" : "text-slate-400 dark:text-slate-500"
                                  }`}>T</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateMedicineQty(idx, "tablet", 1);
                                    }}
                                    className="w-6 sm:w-7 h-7 sm:h-8 flex items-center justify-center text-sm font-black text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition select-none"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                              
                              <div className="text-[11px] sm:text-xs font-mono text-slate-400 font-bold">
                                Total: <span className="font-extrabold text-slate-800 dark:text-slate-200">{totalBaseUnits}</span> tabs
                                {isRowActive && cartNumberBuffer && (
                                  <span className="ml-2 px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-mono font-bold rounded-none">
                                    Typing: {cartNumberBuffer}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            /* NON-MEDICINE (Single Quantity Stepper / Direct Input for Life Essential, Pepsodent, Bottles, Piece, etc.) */
                            <div className={`inline-flex items-center rounded-none shadow-2xs transition ${
                              isRowActive ? "border-2 border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 ring-2 ring-emerald-500/40" : "border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                            }`}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateCartQuantity(idx, Math.max(0, item.quantity - 1));
                                }}
                                className="w-7 sm:w-8 h-7 sm:h-8 flex items-center justify-center text-sm font-black text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition select-none"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                value={item.quantity}
                                onFocus={() => setActiveCartRowIndex(idx)}
                                onChange={(e) => updateCartQuantity(idx, Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-10 sm:w-12 h-7 sm:h-8 text-center font-mono text-xs sm:text-sm font-black bg-transparent outline-none p-0 text-slate-900 dark:text-white"
                              />
                              <span className="text-[10px] sm:text-xs font-bold text-slate-400 pr-2 select-none uppercase font-mono">
                                {item.size || (item.unitType === "BOTTLE" ? "btl" : item.unitType === "VIAL" ? "vial" : "pcs")}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateCartQuantity(idx, item.quantity + 1);
                                }}
                                className="w-7 sm:w-8 h-7 sm:h-8 flex items-center justify-center text-sm font-black text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition select-none"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Total */}
                        <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm sm:text-base xl:text-lg whitespace-nowrap">
                          ৳{Math.round(lineTotal).toLocaleString()}
                        </td>

                        {/* Delete */}
                        <td className="py-2.5 sm:py-3 px-1.5 sm:px-2 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => removeFromCart(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 4. COMPACT BILL DETAILS & CHECKOUT (Image 1 Style) */}
          <div className="shrink-0 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 p-2 sm:p-2.5 space-y-2">
            
            {/* Metric Summary Grid (Subtotal, Discount, Tax, Qty, Total) */}
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2 text-center">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1.5 sm:p-2 rounded-none">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Subtotal</span>
                <span className="font-mono text-xs sm:text-sm md:text-base font-extrabold text-slate-800 dark:text-slate-200">৳{subTotal.toLocaleString()}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1.5 sm:p-2 rounded-none">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Discount</span>
                <span className="font-mono text-xs sm:text-sm md:text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                  {computedDiscount > 0 ? `-৳${computedDiscount}` : "৳0"}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1.5 sm:p-2 rounded-none">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block mb-0.5">VAT</span>
                <span className="font-mono text-xs sm:text-sm md:text-base font-extrabold text-slate-800 dark:text-slate-200">৳{taxAmount}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1.5 sm:p-2 rounded-none">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Qty</span>
                <span className="font-mono text-xs sm:text-sm md:text-base font-extrabold text-slate-800 dark:text-slate-200">{totalCartUnits}</span>
              </div>
              <div
                style={{ backgroundColor: "var(--primary-color, #059669)" }}
                className="p-1.5 sm:p-2 rounded-none text-white shadow-2xs"
              >
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider block text-white/90 mb-0.5">Total</span>
                <span className="font-mono text-xs sm:text-sm md:text-base xl:text-lg font-black">৳{grandTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Quick Action Buttons: Discount & Payment Method */}
            <div className="flex items-center gap-2">
              {/* Discount Button */}
              <button
                type="button"
                onClick={handleOpenDiscountModal}
                className="flex-1 h-9.5 sm:h-10 px-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500 rounded-none text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800/80 focus:ring-2 focus:ring-emerald-500/30"
              >
                <Percent className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{computedDiscount > 0 ? `Discount (-৳${computedDiscount})` : "% Discount"}</span>
              </button>

              {/* Payment Method Button (Renamed & Prominent Focus) */}
              <button
                type="button"
                onClick={handleOpenPaymentModal}
                className="flex-1 h-9.5 sm:h-10 px-3 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-500/80 hover:border-emerald-600 rounded-none text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white transition flex items-center justify-between gap-1.5 cursor-pointer shadow-xs group focus:ring-2 focus:ring-emerald-500/40"
                title="Select Payment Method / Account (or press Enter from discount)"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Wallet className="h-4 w-4 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="truncate">Payment Method</span>
                </div>
                <span className="text-[11px] font-mono font-black uppercase px-2 py-0.5 bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 rounded-none shadow-2xs shrink-0 tracking-wide">
                  {paymentMethod || "CASH"}
                </span>
              </button>
            </div>

            {/* Big Proceed to Checkout Button */}
            <button
              type="button"
              disabled={checkingOut || cart.length === 0 || financialAccounts.length === 0}
              onClick={handleCheckout}
              style={{ backgroundColor: "var(--primary-color, #059669)" }}
              className="h-12 sm:h-13 md:h-14 w-full bg-emerald-600 hover:brightness-95 disabled:opacity-50 text-white font-black rounded-none text-base sm:text-lg md:text-xl shadow-md transition flex items-center justify-center gap-2.5 cursor-pointer active:scale-99"
            >
              {checkingOut ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Receipt className="h-5 w-5" />
                  <span>Proceed to Checkout ৳{grandTotal.toLocaleString()}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* ADD NEW CUSTOMER MODAL (Image 2 Style)                                    */}
      {/* ========================================================================= */}
      {addCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none w-full max-w-[460px] shadow-2xl p-6 sm:p-7 text-slate-800 dark:text-slate-100 flex flex-col space-y-5 relative select-none">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setAddCustomerModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-none hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Add New Customer
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Enter customer details to save and select for this sale.
              </p>
            </div>

            <form onSubmit={handleSaveNewCustomer} className="space-y-4">
              {/* Customer Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Customer Name <span className="text-rose-500">*</span>
                </label>
                <input
                  ref={newCustomerNameInputRef}
                  type="text"
                  required
                  placeholder="e.g. Md Hasan Mahmud"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full h-10 px-3 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 rounded-none text-sm font-semibold outline-none transition"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 019838478734"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full h-10 px-3 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 rounded-none text-sm font-semibold outline-none transition font-mono"
                />
              </div>

              {/* Address (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Address <span className="text-slate-400 text-[10px]">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Road 4, Dhanmondi, Dhaka"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full h-10 px-3 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 rounded-none text-sm font-semibold outline-none transition"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAddCustomerModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs rounded-none transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: "var(--primary-color, #059669)" }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-none transition cursor-pointer shadow-sm active:scale-98"
                >
                  Save & Select Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1. PRODUCT & LOCATION SELECTION MODAL (Large, Clean, Multi-Unit Enabled)  */}
      {/* ========================================================================= */}
      {locationModalOpen && modalProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none w-full max-w-[880px] shadow-2xl p-6 sm:p-8 text-slate-800 dark:text-slate-100 flex flex-col space-y-5 max-h-[94vh] overflow-hidden select-none relative">
            {/* Top Close Button */}
            <button
              type="button"
              onClick={closeModal}
              title="Close (Esc)"
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 dark:hover:text-white p-2 rounded-none hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Header: Product Name, Batch & Exp */}
            <div className="text-center pt-1 pb-1 shrink-0 px-12">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                {modalProduct.name}
              </h3>
              <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
                <span className="px-3 py-1 rounded-none bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-300 font-mono">
                  Batch: {modalBatch?.batchNumber || "BAT-Default"}
                </span>
                <span className="px-3 py-1 rounded-none bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-sm font-bold text-emerald-800 dark:text-emerald-300 font-mono">
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
                <span className="px-3 py-1 rounded-none text-sm font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800/60 font-mono">
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
                  className="w-full bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-slate-800 focus:border-emerald-500 rounded-none pl-11 pr-11 py-3 text-base font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition"
                />
                <Maximize2 className="absolute right-4 top-3.5 h-4.5 w-4.5 text-slate-400" />
              </div>

              {/* Location Cards List */}
              <div className="flex-1 min-h-0 overflow-y-auto content-scrollbar space-y-3 pr-1 mt-1">
                {filteredModalLocations.length === 0 ? (
                  <div className="py-12 text-center text-base font-medium text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-none">
                    No physical stock locations available for this batch.
                  </div>
                ) : (
                  filteredModalLocations.map((loc, i) => {
                    const locKey = getLocKey(loc, i);
                    const alloc = modalAllocations[locKey] || { box: 0, strip: 0, tablet: 0, qty: 0 };
                    const locStock = loc.quantity || 0;

                    const rName = loc.rackName || loc.rack?.name || "";
                    const sName = loc.shelfName || loc.shelf?.name || "";
                    const bName = loc.binName || loc.bin?.name || "";
                    const displayCode = loc.locationLabel || (sName && sName !== "S01" ? `${rName} / ${sName}` : (rName || "Main Store"));

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
                          className={`p-4 sm:p-5 rounded-none transition shadow-xs relative border-2 ${
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
                                className={`h-7 w-7 rounded-none flex items-center justify-center shrink-0 transition-all ${
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
                                    <span className="px-2 py-0.5 rounded-none text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                      Selected
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-none text-xs font-bold text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 group-hover:border-emerald-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
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
                              <span className="px-3 py-1 rounded-none text-xs sm:text-sm font-black bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700/60 text-emerald-900 dark:text-emerald-300 font-mono">
                                Stock: {locStock} Tablets
                              </span>

                              <button
                                type="button"
                                onClick={() => setLocMaxAlloc(locKey, locStock)}
                                className="px-3 py-1.5 text-xs sm:text-sm font-black rounded-none bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                              >
                                Max All
                              </button>

                              {isAllocated && (
                                <button
                                  type="button"
                                  onClick={() => clearLocAlloc(locKey)}
                                  title="Clear this location"
                                  className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-red-500 rounded-none hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                                >
                                  <X className="h-5 w-5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Middle Row: Clean Stepper & Max Button for Box, Strip, and Tablet */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3.5 pt-3.5 border-t border-slate-200/80 dark:border-slate-800">
                            {/* 1. Box Counter */}
                            <div className="bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 rounded-none p-3 flex flex-col justify-between gap-2 shadow-2xs">
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
                                    className="h-9 w-9 flex items-center justify-center rounded-none bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-200 transition cursor-pointer"
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
                                    className="h-9 w-9 flex items-center justify-center rounded-none bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-200 transition cursor-pointer"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setLocUnitMax(locKey, "box", locStock)}
                                  disabled={maxBoxesAvailable <= 0}
                                  className="px-2.5 py-1.5 text-xs font-black rounded-none bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer whitespace-nowrap"
                                >
                                  Max ({maxBoxesAvailable})
                                </button>
                              </div>
                            </div>

                            {/* 2. Strip Counter */}
                            <div className="bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 rounded-none p-3 flex flex-col justify-between gap-2 shadow-2xs">
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
                                    className="h-9 w-9 flex items-center justify-center rounded-none bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-200 transition cursor-pointer"
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
                                    className="h-9 w-9 flex items-center justify-center rounded-none bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-200 transition cursor-pointer"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setLocUnitMax(locKey, "strip", locStock)}
                                  disabled={maxStripsAvailable <= 0}
                                  className="px-2.5 py-1.5 text-xs font-black rounded-none bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer whitespace-nowrap"
                                >
                                  Max ({maxStripsAvailable})
                                </button>
                              </div>
                            </div>

                            {/* 3. Tablet Counter */}
                            <div className="bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 rounded-none p-3 flex flex-col justify-between gap-2 shadow-2xs">
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
                                    className="h-9 w-9 flex items-center justify-center rounded-none bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-200 transition cursor-pointer"
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
                                    className="h-9 w-9 flex items-center justify-center rounded-none bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-200 transition cursor-pointer"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setLocUnitMax(locKey, "tablet", locStock)}
                                  disabled={maxTabletsAvailable <= 0}
                                  className="px-2.5 py-1.5 text-xs font-black rounded-none bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer whitespace-nowrap"
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
                        className={`p-4 sm:p-5 rounded-none transition shadow-xs relative border-2 ${
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
                                className={`h-7 w-7 rounded-none flex items-center justify-center shrink-0 transition-all ${
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
                                    <span className="px-2 py-0.5 rounded-none text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                      Selected
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-none text-xs font-bold text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 group-hover:border-emerald-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
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
                            <div className="flex items-center gap-1.5 bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 rounded-none p-1.5 shadow-xs">
                              <button
                                type="button"
                                onClick={() => updateNonMedAlloc(locKey, (alloc.qty || 0) - 1, locStock)}
                                disabled={(alloc.qty || 0) <= 0}
                                className="h-10 w-10 flex items-center justify-center rounded-none hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
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
                                className="h-10 w-10 flex items-center justify-center rounded-none hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setLocMaxAlloc(locKey, locStock)}
                                disabled={remainingNonMed <= 0}
                                className="px-3 py-2 text-xs sm:text-sm font-black rounded-none bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer ml-1 whitespace-nowrap"
                              >
                                Max ({remainingNonMed})
                              </button>
                              {isAllocated && (
                                <button
                                  type="button"
                                  onClick={() => clearLocAlloc(locKey)}
                                  className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-red-500 rounded-none hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer ml-0.5"
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
                          className={`py-2.5 px-3.5 rounded-none border-2 text-center transition cursor-pointer ${
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
              <div className="bg-slate-50 dark:bg-[#111622] border border-slate-200 dark:border-slate-800 rounded-none p-4 sm:p-5 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">Total Selected:</span>
                    <span className="px-3.5 py-1 rounded-none text-sm sm:text-base font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono">
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
                      <span className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-none border border-blue-200 dark:border-blue-800">
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
                className={`w-full h-14 sm:h-15 font-black py-3.5 rounded-none text-lg sm:text-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
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
      {/* 2. PAYMENT METHOD MODAL POPUP (Keyboard-Driven, Big Visual Cards, Instant Checkout) */}
      {/* ========================================================================= */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none w-full max-w-[520px] shadow-2xl p-6 text-slate-800 dark:text-slate-100 flex flex-col space-y-4 relative">
            {/* Top Close Button */}
            <button
              type="button"
              onClick={() => setPaymentModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Title & Total Banner */}
            <div>
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-emerald-600" />
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Select Payment Method:
                </h3>
              </div>
              <div className="mt-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-none flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                  Grand Total Payable:
                </span>
                <span className="font-mono text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300">
                  ৳{grandTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Accounts Grid (Cards for Cash, bKash, Card, Bank) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Select Account [← / → or 1-{financialAccounts.length}]:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto content-scrollbar pr-0.5">
                {financialAccounts.map((acct, aIdx) => {
                  const isSelected = selectedAccountId === acct.id || paymentFocusIndex === aIdx;
                  const typeUpper = (acct.type || "").toUpperCase();
                  const nameLower = (acct.name || "").toLowerCase();

                  let icon = <Banknote className="h-5 w-5 text-emerald-600" />;
                  if (typeUpper === "MOBILE_BANKING" || nameLower.includes("bkash") || nameLower.includes("nagad") || nameLower.includes("rocket")) {
                    icon = <Smartphone className="h-5 w-5 text-pink-600" />;
                  } else if (typeUpper === "BANK" || typeUpper === "CARD" || nameLower.includes("card") || nameLower.includes("bank")) {
                    icon = <CreditCard className="h-5 w-5 text-blue-600" />;
                  }

                  return (
                    <div
                      key={acct.id}
                      onClick={() => {
                        setPaymentFocusIndex(aIdx);
                        setSelectedAccountId(acct.id);
                        setPaymentMethod(acct.type || "CASH");
                      }}
                      className={`p-3 border rounded-none cursor-pointer transition flex items-center justify-between gap-2.5 ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-100/90 dark:bg-emerald-950/70 ring-2 ring-emerald-500 shadow-sm"
                          : "border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 hover:border-emerald-400"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-none shrink-0">
                          {icon}
                        </div>
                        <div className="min-w-0">
                          <div className={`text-xs sm:text-sm font-extrabold truncate ${
                            isSelected ? "text-emerald-950 dark:text-emerald-100" : "text-slate-900 dark:text-white"
                          }`}>
                            {acct.name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                            {acct.type || "CASH"}
                          </div>
                        </div>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-none shrink-0 ${
                        isSelected
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                      }`}>
                        [{aIdx + 1}]
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Paid Amount & Cash Change Calculator */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-none space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Received / Paid Amount (৳):
                </label>
                {/* Quick note buttons: Exact, 500, 1000 */}
                <div className="flex items-center gap-1 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => setPaidInput(grandTotal.toString())}
                    className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-[11px] font-bold rounded-none cursor-pointer"
                  >
                    Exact
                  </button>
                  {grandTotal < 500 && (
                    <button
                      type="button"
                      onClick={() => setPaidInput("500")}
                      className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-[11px] font-bold rounded-none cursor-pointer"
                    >
                      500
                    </button>
                  )}
                  {grandTotal < 1000 && (
                    <button
                      type="button"
                      onClick={() => setPaidInput("1000")}
                      className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-[11px] font-bold rounded-none cursor-pointer"
                    >
                      1000
                    </button>
                  )}
                </div>
              </div>

              <input
                ref={paidAmountInputRef}
                type="number"
                min="0"
                step="any"
                placeholder={grandTotal.toString()}
                value={paidInput}
                onChange={(e) => setPaidInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                    setPaymentModalOpen(false);
                    setDiscountModalOpen(false);
                    setActiveCartRowIndex(null);
                    handleCheckout();
                  }
                }}
                className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 focus:border-emerald-500 text-slate-900 dark:text-white font-mono font-black text-base outline-none rounded-none"
              />

              {/* Change / Due calculation bar */}
              <div className="flex items-center justify-between text-xs font-bold pt-1 border-t border-slate-200 dark:border-slate-700">
                {numericPaid >= grandTotal ? (
                  <>
                    <span className="text-slate-600 dark:text-slate-400">Change to Return (ফেরত):</span>
                    <span className="font-mono text-base font-black text-emerald-600 dark:text-emerald-400">
                      ৳{changeAmount.toLocaleString()}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-amber-600">Remaining Due (বাকি):</span>
                    <span className="font-mono text-base font-black text-amber-600">
                      ৳{dueAmount.toLocaleString()}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Complete Sale Action Button */}
            <div className="space-y-1.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setPaymentModalOpen(false);
                  setDiscountModalOpen(false);
                  setActiveCartRowIndex(null);
                  handleCheckout();
                }}
                disabled={checkingOut || cart.length === 0}
                style={{ backgroundColor: "var(--primary-color, #059669)" }}
                className="w-full h-12 bg-emerald-600 hover:brightness-95 disabled:opacity-50 text-white font-black rounded-none text-base shadow-sm transition flex items-center justify-center gap-2 cursor-pointer active:scale-99"
              >
                {checkingOut ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Confirm & Complete Sale (Enter ↵)</span>
                  </>
                )}
              </button>

              <div className="text-[11px] font-mono text-slate-400 text-center">
                Press <strong>[Enter]</strong> to finish sale & print receipt • <strong>[Esc]</strong> to cancel
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DISCOUNT MODAL POPUP (Matches Reference Image 2: 5%, 10%, 15%, 20%, %, Flat) */}
      {/* ========================================================================= */}
      {discountModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none w-full max-w-[420px] shadow-2xl p-6 text-slate-800 dark:text-slate-100 flex flex-col space-y-5 relative">
            {/* Top Close Button */}
            <button
              type="button"
              onClick={() => setDiscountModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Title */}
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Select Discount Amount:
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Current Subtotal: <strong className="font-mono font-bold text-slate-700 dark:text-slate-300">৳{subTotal.toLocaleString()}</strong>
              </p>
            </div>

            {/* Quick Percentage Presets (Default 0% selected; navigate with ← / →, Enter to apply) */}
            <div className="grid grid-cols-5 gap-2">
              {[0, 5, 10, 15, 20].map((pct, pIdx) => {
                const isSelected = discountFocusIndex === pIdx || (tempDiscountType === "PERCENT" && parseFloat(tempDiscountRate) === pct);
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      setDiscountFocusIndex(pIdx);
                      handleSelectQuickPercent(pct);
                    }}
                    className={`py-3 px-1 border text-center font-black text-base sm:text-lg transition cursor-pointer rounded-none ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500 shadow-xs"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-slate-900 dark:text-white hover:border-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    {pct === 0 ? "0%" : `${pct}%`}
                  </button>
                );
              })}
            </div>

            <div className="text-[11px] font-mono text-slate-400 font-medium">
              Navigation: <strong>[← / →]</strong> pick preset • <strong>[↓]</strong> rate / flat input • <strong>[Enter]</strong> proceed to payment
            </div>

            {/* Inputs: Discount Rate (%) & Flat Discount (BDT) */}
            <div className="space-y-3.5 pt-1">
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Enter Discount Rate (%)
                </label>
                <div className="relative">
                  <input
                    ref={discountRateInputRef}
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    placeholder="0"
                    value={tempDiscountRate}
                    onChange={(e) => handleRateChange(e.target.value)}
                    onFocus={(e) => {
                      setDiscountFocusIndex(5);
                      e.target.select();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.stopPropagation();
                        handleApplyDiscount();
                      }
                    }}
                    className={`w-full h-11 px-3.5 border rounded-none bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-base outline-none pr-8 font-mono ${
                      discountFocusIndex === 5 ? "border-emerald-600 ring-2 ring-emerald-500/20" : "border-slate-200 dark:border-slate-700"
                    }`}
                  />
                  <span className="absolute right-3.5 top-2.5 text-slate-400 font-bold text-base pointer-events-none">
                    %
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Enter Flat Discount (BDT)
                </label>
                <div className="relative">
                  <input
                    ref={discountFlatInputRef}
                    type="number"
                    min="0"
                    max={subTotal}
                    step="any"
                    placeholder="0"
                    value={tempDiscountFlat}
                    onChange={(e) => handleFlatChange(e.target.value)}
                    onFocus={(e) => {
                      setDiscountFocusIndex(6);
                      e.target.select();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.stopPropagation();
                        handleApplyDiscount();
                      }
                    }}
                    className={`w-full h-11 px-3.5 border rounded-none bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-base outline-none pl-8 font-mono ${
                      discountFocusIndex === 6 ? "border-emerald-600 ring-2 ring-emerald-500/20" : "border-slate-200 dark:border-slate-700"
                    }`}
                  />
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-base pointer-events-none">
                    ৳
                  </span>
                </div>
              </div>
            </div>

            {/* Real-time Summary Box */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-none text-xs space-y-1">
              <div className="flex justify-between font-bold text-slate-600 dark:text-slate-400">
                <span>Discount to apply:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black text-sm">
                  -৳{previewFlatDiscount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200 pt-1 border-t border-slate-200 dark:border-slate-700">
                <span>Updated Grand Total:</span>
                <span className="font-mono font-black text-slate-900 dark:text-white text-base">
                  ৳{previewGrandTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleApplyDiscount}
                style={{ backgroundColor: "var(--primary-color, #059669)" }}
                className="w-full h-12 bg-emerald-600 hover:brightness-95 text-white font-black rounded-none text-base shadow-sm transition flex items-center justify-center cursor-pointer active:scale-99"
              >
                Apply Discount
              </button>

              {(discountRate > 0 || discountFlat > 0) && (
                <button
                  type="button"
                  onClick={handleClearDiscount}
                  className="w-full py-2 text-rose-600 hover:text-rose-700 dark:text-rose-400 text-xs font-bold transition cursor-pointer"
                >
                  Remove / Clear Discount
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SILENT THERMAL RECEIPT PRINT PORTAL (Direct print, zero on-screen modal) */}
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
                {invoiceData.pharmacy?.website ? (
                  <p className="text-[11px] text-black">
                    Website : {invoiceData.pharmacy.website}
                  </p>
                ) : null}
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
              {(() => {
                const subTotalVal = Number(invoiceData.invoice?.subTotal || 0);
                const discountVal = Number(invoiceData.invoice?.discount || 0);
                const vatAmtVal = Number(invoiceData.invoice?.vatAmount ?? invoiceData.invoice?.tax ?? 0);
                const vatPctVal = Number(invoiceData.invoice?.vatPercent) > 0
                  ? Number(invoiceData.invoice.vatPercent)
                  : (subTotalVal > 0 && vatAmtVal > 0
                      ? Math.round((vatAmtVal / Math.max(1, subTotalVal - discountVal)) * 100)
                      : (taxPercent || 0));
                const totalAmtVal = Number(invoiceData.invoice?.totalAmount || 0);

                return (
                  <div style={{ borderTop: "1px dashed #000000", paddingTop: "8px" }} className="space-y-1 text-xs font-bold">
                    <div className="flex justify-between">
                      <span>Total Quantity:</span>
                      <span className="font-mono">{invoiceData.invoice?.totalQuantity ?? totalCartUnits}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Product Total (Subtotal):</span>
                      <span className="font-mono">৳{subTotalVal.toFixed(0)}</span>
                    </div>
                    {discountVal > 0 && (
                      <div className="flex justify-between text-black">
                        <span>Discount:</span>
                        <span className="font-mono">-৳{discountVal.toFixed(0)}</span>
                      </div>
                    )}
                    {(vatAmtVal > 0 || vatPctVal > 0) && (
                      <div className="flex justify-between text-black">
                        <span>
                          VAT ({vatPctVal}%):
                        </span>
                        <span className="font-mono">
                          +৳{vatAmtVal.toFixed(0)}
                        </span>
                      </div>
                    )}
                    {Number(invoiceData.invoice?.deliveryCharge || 0) > 0 && (
                      <div className="flex justify-between">
                        <span>Delivery Charge:</span>
                        <span className="font-mono">+৳{Number(invoiceData.invoice?.deliveryCharge || 0).toFixed(0)}</span>
                      </div>
                    )}
                    <div style={{ borderTop: "1px solid #000000", paddingTop: "4px" }} className="flex justify-between font-black text-sm">
                      <span>Grand Total (Total Payable):</span>
                      <span className="font-mono">৳{totalAmtVal.toFixed(0)}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Payment Details */}
              <div style={{ borderTop: "1px dashed #000000", paddingTop: "8px" }} className="space-y-1 text-xs font-bold">
                <div className="flex justify-between">
                  <span>Paid Amount:</span>
                  <span className="font-mono">৳{Number(invoiceData.invoice?.paidAmount || 0).toFixed(0)}</span>
                </div>
                {Number(invoiceData.invoice?.dueAmount || 0) > 0 && (
                  <div className="flex justify-between text-black">
                    <span>Due Amount:</span>
                    <span className="font-mono">৳{Number(invoiceData.invoice?.dueAmount || 0).toFixed(0)}</span>
                  </div>
                )}
                {Number(invoiceData.invoice?.changeAmount || 0) > 0 && (
                  <div className="flex justify-between text-black">
                    <span>Change Returned:</span>
                    <span className="font-mono">৳{Number(invoiceData.invoice?.changeAmount || 0).toFixed(0)}</span>
                  </div>
                )}
              </div>

              {/* Dashed line above Policy Box (Matches Image 2) */}
              <div style={{ borderTop: "1px dashed #000000", margin: "8px 0" }} />

              {/* Policy Box (Matches Image 2) */}
              <div style={{ border: "1px solid #000000", padding: "8px", margin: "8px 0", textAlign: "center", fontSize: "10px", lineHeight: "1.3" }} className="font-medium rounded-none">
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
