"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/lib/api";
import { useBranchContext } from "@/context/BranchContext";
import { Product, Branch } from "@/types";
import { calculateLocationPackaging, convertUnitToBase } from "@/lib/packaging";
import {
  ShoppingCart, Search, Plus, Minus, Trash2, Receipt, CreditCard,
  Banknote, Smartphone, ShieldAlert, Loader2, AlertCircle, Store,
  Printer, Barcode, CheckCircle2, X, Tag, Boxes, MapPin, Calendar,
  FileText, Building2, Archive, ArrowRight, Target, PackageCheck,
  Clock, ChevronRight, ChevronDown, RefreshCw, AlertTriangle,
  Zap, Package, ArrowLeft, DollarSign, Keyboard, Sparkles, Check
} from "lucide-react";

interface CartItem {
  productId: string;
  name: string;
  genericName?: string | null;
  sku: string;
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

type PosStep = "SEARCH" | "BATCH" | "LOCATION" | "UNIT" | "SELECT_PRODUCT" | "SELECT_LOCATION" | "SELECT_UNIT";

interface PosModuleProps {
  selectedBranchId?: string;
  onNavigate?: (module: any) => void;
}

export function PosModule({ selectedBranchId: propBranchId }: PosModuleProps = {}) {
  const { user } = useAuth();
  const {
    branches: contextBranches,
    selectedBranchId: contextBranchId,
    setSelectedBranchId: contextSetBranchId,
    canSwitchBranch,
    isBranchLocked,
  } = useBranchContext();

  const [viewTab, setViewTab] = useState<"pos" | "history">("pos");
  const [localBranchId, setLocalBranchId] = useState<string>("");

  // Effective branch: prop or context, fallback to local if All Branches selected
  const activeNavbarBranchId = propBranchId !== undefined ? propBranchId : contextBranchId;
  const selectedBranchId = activeNavbarBranchId || localBranchId || (contextBranches.length > 0 ? contextBranches[0].id : "");
  const branches = contextBranches;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [posCategoryFilter, setPosCategoryFilter] = useState<string>("ALL");
  const [categories, setCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<"FIXED" | "PERCENT">("FIXED");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [vatSettings, setVatSettings] = useState<{ isVatEnabled: boolean; vatPercent: number; vatNumber?: string; taxType?: string }>({ isVatEnabled: false, vatPercent: 0 });
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [mobileTrxId, setMobileTrxId] = useState<string>("");
  const [financialAccounts, setFinancialAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>("");
  const [bankTrxRef, setBankTrxRef] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paidInput, setPaidInput] = useState<string>("");
  const [managerPin, setManagerPin] = useState("");
  const [prescriptionRef, setPrescriptionRef] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step-by-step POS flow
  const [posStep, setPosStep] = useState<PosStep>("SEARCH");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [posBatches, setPosBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [selectedBatchLocations, setSelectedBatchLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>("TABLET");
  const [quantity, setQuantity] = useState<number>(1);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Invoice modal
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  // Sales history
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");

  // Pharmacy settings (prescription message, receipt notes)
  const [pharmacySettings, setPharmacySettings] = useState<{
    prescriptionRequiredMessage: string;
    receiptHeaderNote: string;
    receiptFooterNote: string;
  }>({
    prescriptionRequiredMessage:
      "⚠️ This product requires a valid doctor's prescription. Please provide the prescription reference number or doctor's name before completing the purchase.",
    receiptHeaderNote: "Thank you for shopping with us. Get well soon!",
    receiptFooterNote: "Items can be returned within 48 hours with original invoice and valid prescription.",
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadPosProducts = async () => {
    if (!selectedBranchId) return;
    try {
      setLoading(true);
      const res = await fetchApi(`/products?branchId=${selectedBranchId}&limit=150`);
      if (res.success && res.data) setProducts(res.data);
    } catch (err) { console.error("Failed to load products for POS", err); }
    finally { setLoading(false); }
  };

  const loadCategories = async () => {
    try {
      const res = await fetchApi<any>("/products/variants/categories");
      if (res.success && Array.isArray(res.data)) {
        setCategories(res.data.filter((c: any) => c.isActive !== false));
      }
    } catch (err) {
      console.error("Failed to load categories for POS", err);
    }
  };

  const loadFinancialAccounts = async (branchId: string) => {
    try {
      const res = await fetchApi<any>(`/accounting/accounts?branchId=${branchId}`);
      if (res.success && res.data) {
        setFinancialAccounts(res.data);
        if (res.data.length > 0) {
          setSelectedAccountId((prev) => res.data.some((a: any) => a.id === prev) ? prev || res.data[0].id : res.data[0].id);
        } else setSelectedAccountId("");
        const banks = res.data.filter((a: any) => a.type === "BANK" || a.type === "CARD_SETTLEMENT");
        if (banks.length > 0 && !selectedBankAccountId) setSelectedBankAccountId(banks[0].id);
      }
    } catch (err) { console.error("Failed to load financial accounts for POS", err); }
  };

  const loadVatSettings = async () => {
    try {
      const res = await fetchApi<any>("/settings/vat");
      if (res.success && res.data) {
        setVatSettings(res.data);
        setTaxPercent(res.data.isVatEnabled && typeof res.data.vatPercent === "number" ? res.data.vatPercent : 0);
      }
    } catch (err) { console.error("Failed to load VAT settings for POS", err); }
  };

  const loadPharmacySettings = async () => {
    try {
      const res = await fetchApi<any>("/settings/pharmacy");
      if (res.success && res.data) {
        setPharmacySettings((prev) => ({ ...prev, ...(res.data as any) }));
      }
    } catch (err) { console.error("Failed to load pharmacy settings", err); }
  };

  useEffect(() => { loadCategories(); loadVatSettings(); loadPharmacySettings(); }, []);

  useEffect(() => {
    if (selectedBranchId) {
      loadPosProducts();
      loadFinancialAccounts(selectedBranchId);
      setCart([]);
      if (viewTab === "history") loadSalesHistory();
    }
  }, [selectedBranchId, viewTab]);

  const loadSalesHistory = async () => {
    if (!selectedBranchId) return;
    try {
      setLoadingHistory(true);
      const params = new URLSearchParams();
      params.append("branchId", selectedBranchId);
      if (historySearch) params.append("search", historySearch);
      const res = await fetchApi(`/sales?${params.toString()}`);
      if (res.success && res.data) setSalesHistory(res.data);
    } catch (err) { console.error("Failed to load sales history", err); }
    finally { setLoadingHistory(false); }
  };

  // Load FEFO-sorted batches for a product
  const loadPosBatches = async (productId: string) => {
    if (!selectedBranchId) return;
    setLoadingBatches(true);
    try {
      const res = await fetchApi<any>(`/inventory/pos-batches?branchId=${selectedBranchId}&productId=${productId}`);
      if (res.success && res.data) setPosBatches(res.data);
    } catch (err) { console.error("Failed to load POS batches", err); setPosBatches([]); }
    finally { setLoadingBatches(false); }
  };

  // Load physical locations for a batch
  const loadBatchLocations = async (batchId: string) => {
    if (!selectedBranchId) return;
    setLoadingLocations(true);
    try {
      const res = await fetchApi<any>(`/locations/batch/${batchId}?branchId=${selectedBranchId}`);
      if (res.success && Array.isArray(res.data)) {
        setSelectedBatchLocations(res.data);
      }
    } catch {
      // keep whatever was previously loaded or fallback
    } finally {
      setLoadingLocations(false);
    }
  };

  // Step flow handlers
  const startProductSelection = (product: any) => {
    setSelectedProduct(product);
    setPosStep("SELECT_PRODUCT");
    loadPosBatches(product.id);
  };

  const selectBatch = async (batch: any) => {
    setSelectedBatch(batch);
    setPosStep("SELECT_LOCATION");
    setSelectedLocation(null);
    setSelectedUnit("TABLET");
    setQuantity(1);
    if (batch.physicalLocations && Array.isArray(batch.physicalLocations) && batch.physicalLocations.length > 0) {
      setSelectedBatchLocations(batch.physicalLocations);
    } else {
      setSelectedBatchLocations([]);
    }
    await loadBatchLocations(batch.id);
  };

  const selectLocation = (loc: any) => {
    setSelectedLocation(loc);
    setPosStep("SELECT_UNIT");
    setSelectedUnit("TABLET");
    setQuantity(1);
  };

  const selectUnitType = (unit: string) => {
    setSelectedUnit(unit);
  };

  const resetPosFlow = () => {
    setPosStep("SEARCH"); setSelectedProduct(null); setSelectedBatch(null);
    setSelectedLocation(null); setSelectedUnit("TABLET"); setQuantity(1);
    setPosBatches([]); setSelectedBatchLocations([]);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const confirmAddToCart = () => {
    if (!selectedProduct || !selectedBatch || !selectedLocation) return;
    const prod = selectedProduct;
    const isMed = prod.productType === "MEDICINE" || !prod.productType;
    const tabletsPerStrip = prod.tabletsPerStrip || 10;
    const stripsPerBox = prod.stripsPerBox || 10;
    const tabletsPerBox = isMed ? stripsPerBox * tabletsPerStrip : 1;

    let multiplier = 1, unitType = "PIECE";
    if (selectedUnit === "BOX") { multiplier = tabletsPerBox; unitType = "BOX"; }
    else if (selectedUnit === "STRIP") { multiplier = tabletsPerStrip; unitType = "STRIP"; }
    else if (selectedUnit === "TABLET") { multiplier = 1; unitType = "TABLET"; }

    const totalBaseUnitsNeeded = quantity * multiplier;
    if (selectedLocation.quantity < totalBaseUnitsNeeded) {
      alert(`Insufficient stock. Location has ${selectedLocation.quantity} units, need ${totalBaseUnitsNeeded}.`);
      return;
    }
    const now = new Date();
    if (selectedBatch.expiryDate && new Date(selectedBatch.expiryDate) <= now) {
      alert("Cannot sell expired batches.");
      return;
    }
    const unitPrice = Number(prod.basePrice) * multiplier;

    const existingIdx = cart.findIndex((item) =>
      item.productId === prod.id &&
      item.inventoryId === selectedBatch.id &&
      item.inventoryLocationId === selectedLocation.id &&
      item.unitType === unitType
    );

    if (existingIdx >= 0) {
      const existing = cart[existingIdx];
      const newQty = existing.quantity + quantity;
      const totalUnits = newQty * multiplier;
      if (totalUnits > existing.availableBaseStock) {
        alert(`Cannot add more. Max available at this location is ${existing.availableBaseStock} base units.`);
        return;
      }
      const updated = [...cart];
      updated[existingIdx] = { ...existing, quantity: newQty, availableBaseStock: selectedLocation.quantity };
      setCart(updated);
    } else {
      setCart([...cart, {
        productId: prod.id, name: prod.name, genericName: prod.genericName || null, sku: prod.sku, size: prod.size,
        productType: prod.productType || prod.category || "MEDICINE", unitType, unitMultiplier: multiplier, quantity, unitPrice,
        basePrice: Number(prod.basePrice), stripsPerBox: stripsPerBox, tabletsPerStrip: tabletsPerStrip, tabletsPerBox,
        availableBaseStock: selectedLocation.quantity, batchNumber: selectedBatch.batchNumber || null,
        expiryDate: selectedBatch.expiryDate || null, inventoryId: selectedBatch.id, inventoryLocationId: selectedLocation.id,
        shelfLocation: selectedLocation.locationLabel || null, locationLabel: selectedLocation.locationLabel || null,
        rackName: selectedLocation.rackName || null, shelfName: selectedLocation.shelfName || null, binName: selectedLocation.binName || null,
        isControlled: prod.isControlled, requiresPrescription: prod.requiresPrescription, purchasePrice: selectedBatch.purchasePrice || null,
      }]);
    }
    resetPosFlow();
  };

  const handleUnitChange = (productId: string, newUnit: string) => {
    setCart((prev) => prev.map((item) => {
      if (item.productId !== productId) return item;
      let multiplier = 1;
      if (newUnit === "BOX") multiplier = item.stripsPerBox * item.tabletsPerStrip;
      else if (newUnit === "STRIP") multiplier = item.tabletsPerStrip;
      else if (newUnit === "TABLET" || newUnit === "PIECE" || newUnit === "BOTTLE") multiplier = 1;
      const unitPrice = item.basePrice * multiplier;
      return { ...item, unitType: newUnit, unitMultiplier: multiplier, unitPrice };
    }));
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(cart.filter((item) => item.productId !== productId));
      return;
    }
    setCart((prev) => prev.map((item) => {
      if (item.productId !== productId) return item;
      const totalUnits = newQuantity * item.unitMultiplier;
      if (totalUnits > item.availableBaseStock) {
        alert(`Insufficient stock. Max available at location is ${item.availableBaseStock} base units.`);
        return item;
      }
      return { ...item, quantity: newQuantity };
    }));
  };

  const filteredProducts = products.filter((p) => {
    if (posCategoryFilter !== "ALL") {
      const catId = p.categoryId;
      const catName = p.categoryRef?.name || p.category || "";
      if (
        catId !== posCategoryFilter &&
        !catName.toLowerCase().includes(posCategoryFilter.toLowerCase())
      ) {
        return false;
      }
    }
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(s) ||
      p.genericName?.toLowerCase().includes(s) ||
      p.sku?.toLowerCase().includes(s) ||
      p.barcode?.includes(s) ||
      p.subcategory?.toLowerCase().includes(s)
    );
  });

  const subTotal = cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  let discountAmount = 0;
  if (discountValue > 0) {
    discountAmount = discountType === "PERCENT" ? Math.round((subTotal * (discountValue / 100)) * 100) / 100 : Number(discountValue);
  }
  const taxAmount = taxPercent > 0 ? Math.round((subTotal * (taxPercent / 100)) * 100) / 100 : 0;
  const grandTotal = Math.max(0, subTotal - discountAmount + taxAmount);
  const numericPaid = paidInput !== "" ? parseFloat(paidInput) || 0 : grandTotal;
  const dueAmount = Math.max(0, grandTotal - numericPaid);
  const changeAmount = Math.max(0, numericPaid - grandTotal);
  const hasRxItems = cart.some((i) => i.requiresPrescription);
  const hasControlledDrugs = cart.some((i) => i.isControlled);

  const handleCheckout = async () => {
    if (cart.length === 0 || !selectedBranchId) return;
    if (hasRxItems && !prescriptionRef.trim()) {
      setError("Prescription required: Please enter Doctor / Prescription reference for Rx medications before checkout.");
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
      setCheckingOut(true); setError(null);
      let paymentNote: string | null = null, trxRef: string | null = null;
      const targetBankName: string | null = chosenAccount.bankName || chosenAccount.name;
      if (paymentMethod === "BKASH" || paymentMethod === "NAGAD" || paymentMethod === "MOBILE") {
        paymentNote = `${chosenAccount.name}${mobileTrxId.trim() ? ` (Trx: ${mobileTrxId.trim()})` : ""}`;
        trxRef = mobileTrxId.trim() || null;
      } else if (paymentMethod === "BANK") {
        paymentNote = `${chosenAccount.name}${bankTrxRef.trim() ? ` (Ref: ${bankTrxRef.trim()})` : ""}`;
        trxRef = bankTrxRef.trim() || null;
      } else {
        paymentNote = `POS Cash via ${chosenAccount.name}`;
      }
      const payload = {
        branchId: selectedBranchId,
        customerName: customerName.trim() || "Walk-in Customer",
        customerPhone: customerPhone.trim() || null,
        paymentMethod: chosenAccount.type || paymentMethod,
        financialAccountId: chosenAccount.id,
        bankName: targetBankName,
        transactionRef: trxRef,
        notes: paymentNote,
        discount: discountValue,
        discountType,
        tax: taxAmount,
        paidAmount: numericPaid,
        prescriptionRef: prescriptionRef.trim() || null,
        managerApprovedBy: managerPin.trim() || null,
        items: cart.map((item) => ({
          productId: item.productId,
          inventoryId: item.inventoryId || null,
          inventoryLocationId: item.inventoryLocationId || null,
          unitType: item.unitType,
          unitMultiplier: item.unitMultiplier,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })),
      };
      const res = await fetchApi("/sales", { method: "POST", body: JSON.stringify(payload) });
      if (!res.success) throw new Error(res.message || "Failed to process sale");
      const receiptRes = await fetchApi(`/sales/${res.data.id}/receipt`);
      if (receiptRes.success && receiptRes.data) setInvoiceData(receiptRes.data);
      else setInvoiceData({ pharmacy: { name: "Pharmacy Store", address: "Main Branch", phone: "—" }, invoice: { ...res.data, items: cart } });
      setReceiptModalOpen(true); setCart([]); setPaidInput(""); setDiscountValue(0); setManagerPin(""); setPrescriptionRef(""); setMobileTrxId(""); setBankTrxRef("");
      loadPosProducts(); loadFinancialAccounts(selectedBranchId);
    } catch (err: any) { setError(err.message); } finally { setCheckingOut(false); }
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2" || (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA" && document.activeElement?.tagName !== "SELECT")) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape") {
        if (posStep !== "SEARCH") {
          e.preventDefault();
          resetPosFlow();
        }
      }
      if (e.key === "F9" || (e.ctrlKey && e.key === "Enter")) {
        if (cart.length > 0 && !checkingOut) {
          e.preventDefault();
          handleCheckout();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [posStep, cart, checkingOut]);

  const handlePrint = () => window.print();

  return (
    <div className="space-y-5 select-none">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-primary/10 dark:bg-brand-primary/20 rounded-xl">
              <ShoppingCart className="h-7 w-7 text-brand-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                Fast POS Billing Counter
                <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs px-3 py-1 rounded-full font-bold border border-emerald-300 dark:border-emerald-800">
                  FEFO + Rack/Shelf/Bin
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                High-speed counter interface: Product ➔ FEFO Batch ➔ Physical Location ➔ Selling Unit ➔ Instant Checkout
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Keyboard hints badge */}
          <div className="hidden lg:flex items-center gap-2 text-[11px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Keyboard className="h-4 w-4 text-brand-primary" />
            <span><kbd className="bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border shadow-2xs font-mono">F2</kbd> Search</span>
            <span><kbd className="bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border shadow-2xs font-mono">Esc</kbd> Reset</span>
            <span><kbd className="bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border shadow-2xs font-mono">F9</kbd> Pay</span>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button onClick={() => setViewTab("pos")} className={`px-4 py-2 rounded-lg text-xs font-black transition ${viewTab === "pos" ? "bg-white dark:bg-slate-900 text-brand-primary shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"}`}>Active Counter</button>
            <button onClick={() => setViewTab("history")} className={`px-4 py-2 rounded-lg text-xs font-black transition ${viewTab === "history" ? "bg-white dark:bg-slate-900 text-brand-primary shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"}`}>Sales History</button>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-xl text-xs font-black text-slate-800 dark:text-slate-200">
            <Store className="h-4 w-4 text-brand-primary" />
            <span>{branches.find((b) => b.id === selectedBranchId)?.name || "Counter Branch"}</span>
          </div>
        </div>
      </div>

      {/* When All Branches selected in navbar, inform user which counter is active */}
      {!activeNavbarBranchId && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium">
            <Store className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>All Branches</strong> is selected in navbar. Counter is selling stock for <strong>{branches.find((b) => b.id === selectedBranchId)?.name || "Main Counter"}</strong>.
            </span>
          </div>
          {canSwitchBranch && branches.length > 1 && (
            <select
              value={selectedBranchId}
              onChange={(e) => setLocalBranchId(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-500/40 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer shadow-2xs"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  Counter: {b.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {viewTab === "pos" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT 7 COLUMNS: PRODUCT SEARCH & STEP-BY-STEP SELECTION */}
          <div className="lg:col-span-7 space-y-4">

            {/* BARCODE & PRODUCT SEARCH BAR */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-2xs">
              <div className="relative flex items-center">
                <Search className="absolute left-4 h-5 w-5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Scan barcode or type medicine name, generic, SKU... [Press F2]"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:border-brand-primary dark:focus:border-brand-primary dark:text-white transition shadow-inner"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-4 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-1 overflow-x-auto max-w-full pb-1">
                <button
                  type="button"
                  onClick={() => setPosCategoryFilter("ALL")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    posCategoryFilter === "ALL"
                      ? "bg-brand-primary text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>All Products</span>
                  <span className="bg-white/20 px-1.5 py-0.2 rounded text-[10px]">{products.length}</span>
                </button>
                {categories.map((cat) => {
                  const count = products.filter(
                    (p) => p.categoryId === cat.id || (p.categoryRef?.name || p.category) === cat.name
                  ).length;
                  const isSelected = posCategoryFilter === cat.name || posCategoryFilter === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setPosCategoryFilter(cat.name)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                        isSelected
                          ? "bg-brand-primary text-white shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      <span>{cat.name}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] ${isSelected ? "bg-white/20" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PRODUCT CATALOG OR INLINE FLOW STEPPER CONTAINER */}
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 min-h-[500px] shadow-2xs space-y-4">
              {posStep === "SEARCH" ? (
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Package className="h-4 w-4 text-brand-primary" /> Select Medicine / Product
                    </span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      Showing {filteredProducts.length} items
                    </span>
                  </div>

                  {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center text-slate-400">
                      <Loader2 className="h-10 w-10 animate-spin text-brand-primary mb-3" />
                      <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Loading catalog stock...</p>
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="p-20 text-center text-slate-400">
                      <Barcode className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                      <p className="text-base font-black text-slate-700 dark:text-slate-300">No matching products found</p>
                      <p className="text-xs mt-1 text-slate-500">Try searching by generic name or scanning another barcode.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[580px] overflow-y-auto pr-1">
                      {filteredProducts.map((p) => {
                        const stock = p.currentStock || 0;
                        const inStock = stock > 0;
                        return (
                          <div
                            key={p.id}
                            onClick={() => inStock && startProductSelection(p)}
                            className={`p-4 rounded-2xl border-2 transition text-left cursor-pointer relative flex flex-col justify-between ${
                              inStock
                                ? "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-brand-primary hover:shadow-md active:scale-[0.99]"
                                : "bg-slate-50 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-800 opacity-60 cursor-not-allowed"
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="font-black text-sm text-slate-900 dark:text-white leading-tight">
                                  {p.name} {p.size ? <span className="text-xs text-slate-500 font-semibold">({p.size})</span> : null}
                                </div>
                                {p.requiresPrescription && (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-black text-[10px] shrink-0 border border-rose-300 dark:border-rose-800">
                                    Rx
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                {p.genericName ? <span className="text-brand-primary font-bold">{p.genericName} • </span> : null}
                                {p.brandName || p.manufacturer || "Generic"}
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                              <div>
                                <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                                  ৳{Number(p.basePrice).toFixed(2)}
                                </span>
                                <span className="text-xs font-semibold text-slate-400"> / {p.unit}</span>
                              </div>

                              <div>
                                <span className={`text-xs font-black px-3 py-1 rounded-full ${
                                  inStock
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                    : "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                                }`}>
                                  {inStock ? `${stock.toLocaleString()} ${p.unit}s` : "Out of Stock"}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* INLINE FLOW CONTAINER - Renders selected product step flow */
                <div className="space-y-5">
                  {/* Selected Product Card Banner */}
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
                        <Package className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-base text-slate-900 dark:text-white">{selectedProduct?.name}</span>
                          {selectedProduct?.size && <span className="text-xs text-slate-500 font-semibold">({selectedProduct.size})</span>}
                          {selectedProduct?.requiresPrescription && (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 font-black text-xs border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                              <ShieldAlert className="h-3.5 w-3.5 text-rose-600" /> Rx Prescription Required
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium">
                          {selectedProduct?.genericName && <span className="font-bold text-emerald-800 dark:text-emerald-300">{selectedProduct.genericName} • </span>}
                          Base Rate: <strong className="text-slate-900 dark:text-white">৳{Number(selectedProduct?.basePrice || 0).toFixed(2)}</strong> per {selectedProduct?.unit || "unit"}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={resetPosFlow}
                      className="self-start sm:self-center flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 text-xs font-black shadow-2xs transition"
                    >
                      <X className="h-4 w-4" /> Change Medicine <kbd className="hidden sm:inline bg-slate-100 dark:bg-slate-700 px-1 py-0.2 rounded font-mono text-[9px]">Esc</kbd>
                    </button>
                  </div>

                  {/* Flow Progress Step Bar */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className={`p-2.5 rounded-xl border text-center font-black text-xs flex items-center justify-center gap-1.5 transition ${
                      posStep === "SELECT_PRODUCT"
                        ? "bg-brand-primary text-white border-brand-primary shadow-xs"
                        : selectedBatch
                        ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
                    }`}>
                      <PackageCheck className="h-4 w-4 shrink-0" />
                      <span className="truncate">1. FEFO Batch</span>
                    </div>

                    <div className={`p-2.5 rounded-xl border text-center font-black text-xs flex items-center justify-center gap-1.5 transition ${
                      posStep === "SELECT_LOCATION"
                        ? "bg-brand-primary text-white border-brand-primary shadow-xs"
                        : selectedLocation
                        ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
                    }`}>
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="truncate">2. Location</span>
                    </div>

                    <div className={`p-2.5 rounded-xl border text-center font-black text-xs flex items-center justify-center gap-1.5 transition ${
                      posStep === "SELECT_UNIT"
                        ? "bg-brand-primary text-white border-brand-primary shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
                    }`}>
                      <Boxes className="h-4 w-4 shrink-0" />
                      <span className="truncate">3. Unit & Qty</span>
                    </div>
                  </div>

                  {/* SUB-STEP 1: SELECT BATCH (FEFO) */}
                  {posStep === "SELECT_PRODUCT" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <PackageCheck className="h-5 w-5 text-brand-primary" />
                          <h4 className="font-black text-sm text-slate-900 dark:text-white">Available Batches (FEFO Enforced):</h4>
                        </div>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                          Oldest Expiry First
                        </span>
                      </div>

                      {loadingBatches ? (
                        <div className="p-16 text-center text-slate-400">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-brand-primary" />
                          <p className="text-xs font-bold">Loading FEFO batch stock...</p>
                        </div>
                      ) : posBatches.length === 0 ? (
                        <div className="p-10 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400">
                          <AlertCircle className="h-8 w-8 mx-auto text-amber-500 mb-2" />
                          <p className="text-sm font-black text-slate-800 dark:text-slate-200">No active batch stock available</p>
                          <p className="text-xs mt-1">Add or receive stock for this product in Inventory Management.</p>
                        </div>
                      ) : (
                        <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                          {posBatches.map((batch: any) => {
                            const isExpired = batch.expiryDate && new Date(batch.expiryDate) < new Date();
                            const daysLeft = batch.expiryDate ? Math.ceil((new Date(batch.expiryDate).getTime() - Date.now()) / 86400000) : null;
                            const locationsCount = (batch.physicalLocations || []).length;
                            return (
                              <button
                                key={batch.id}
                                onClick={() => !isExpired && selectBatch(batch)}
                                disabled={isExpired || batch.hasPhysicalStock === false}
                                className={`w-full text-left p-4 rounded-2xl border-2 transition ${
                                  isExpired || !batch.hasPhysicalStock
                                    ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900 opacity-60 cursor-not-allowed"
                                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-brand-primary hover:shadow-md cursor-pointer active:scale-[0.99]"
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-black text-sm text-slate-900 dark:text-white">Batch: {batch.batchNumber || "—"}</span>
                                      {isExpired ? (
                                        <span className="text-xs bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300 px-2.5 py-0.5 rounded-full font-black">EXPIRED</span>
                                      ) : daysLeft !== null && daysLeft <= 90 ? (
                                        <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 px-2.5 py-0.5 rounded-full font-black">Near Expiry ({daysLeft}d left)</span>
                                      ) : (
                                        <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 px-2.5 py-0.5 rounded-full font-black">FEFO Priority</span>
                                      )}
                                    </div>
                                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
                                      Expiry: <strong className="text-slate-900 dark:text-white">{batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : "No Expiry"}</strong> • Total Available: <strong className="text-emerald-600 font-bold">{batch.quantity.toLocaleString()}</strong> units
                                    </div>
                                  </div>

                                  <div className="text-right self-start sm:self-auto">
                                    <div className="text-base font-black text-brand-primary font-mono">
                                      ৳{Number(batch.sellingPrice || selectedProduct?.basePrice).toFixed(2)}
                                      <span className="text-xs text-slate-400 font-normal"> / unit</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 text-xs font-bold flex items-center justify-between text-slate-600 dark:text-slate-400">
                                  <span className={locationsCount > 0 ? "text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 font-bold" : "text-amber-600 flex items-center gap-1.5"}>
                                    <MapPin className="h-4 w-4" /> {locationsCount} Rack/Shelf Location{locationsCount === 1 ? "" : "s"} Allocated
                                  </span>
                                  <span className="text-brand-primary flex items-center gap-1 font-black">
                                    Select Batch <ArrowRight className="h-4 w-4" />
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB-STEP 2: SELECT LOCATION (RACK / SHELF / BIN) */}
                  {posStep === "SELECT_LOCATION" && selectedBatch && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                        <button onClick={() => setPosStep("SELECT_PRODUCT")} className="flex items-center gap-1.5 text-xs font-black text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                          <ArrowLeft className="h-4 w-4" /> Back to Batches
                        </button>
                        <span className="text-xs font-black text-brand-primary bg-brand-primary/10 px-3 py-1 rounded-xl">
                          Batch: {selectedBatch.batchNumber}
                        </span>
                      </div>

                      {loadingLocations ? (
                        <div className="p-16 text-center text-slate-400">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-brand-primary" />
                          <p className="text-xs font-bold">Loading rack & shelf locations...</p>
                        </div>
                      ) : selectedBatchLocations.length === 0 ? (
                        <div className="p-10 text-center bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-900 rounded-2xl text-slate-600 dark:text-slate-400 space-y-1">
                          <AlertCircle className="h-8 w-8 mx-auto text-amber-500 mb-2" />
                          <p className="font-black text-sm text-amber-800 dark:text-amber-300">No physical locations allocated for this batch.</p>
                          <p className="text-xs">Stock must be allocated to Rack/Shelf/Bin before counter selling.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                          {selectedBatchLocations.map((loc: any) => {
                            const packDetails = calculateLocationPackaging(loc.quantity, {
                              stripsPerBox: selectedBatch.stripsPerBox || selectedProduct?.stripsPerBox || 10,
                              tabletsPerStrip: selectedBatch.tabletsPerStrip || selectedProduct?.tabletsPerStrip || 10,
                              packageType: selectedProduct?.productType,
                              unit: selectedProduct?.unit || "units",
                            });
                            return (
                              <button
                                key={loc.id}
                                onClick={() => selectLocation(loc)}
                                disabled={loc.quantity <= 0}
                                className={`p-4 rounded-2xl border-2 text-left transition ${
                                  loc.quantity <= 0
                                    ? "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-50 cursor-not-allowed"
                                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:shadow-md cursor-pointer active:scale-[0.99]"
                                }`}
                              >
                                {/* Rack / Shelf / Bin Pills */}
                                <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                                  <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 px-2.5 py-1 rounded-lg text-xs font-black">
                                    <Store className="h-3.5 w-3.5" /> {loc.rackName || loc.rack?.name || "Rack"}
                                  </span>
                                  <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 px-2.5 py-1 rounded-lg text-xs font-black">
                                    <Archive className="h-3.5 w-3.5" /> {loc.shelfName || loc.shelf?.name || "Shelf"}
                                  </span>
                                  <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  <span className="inline-flex items-center gap-1 bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 px-2.5 py-1 rounded-lg text-xs font-black">
                                    <Boxes className="h-3.5 w-3.5" /> {loc.binName || loc.bin?.name || "Bin"}
                                  </span>
                                </div>

                                <div className="flex items-baseline justify-between mb-2">
                                  <div>
                                    <span className="text-xl font-black text-slate-900 dark:text-white">{loc.quantity.toLocaleString()}</span>
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400"> {selectedProduct?.unit || "base units"}</span>
                                  </div>
                                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                                    In Stock
                                  </span>
                                </div>

                                {/* Packaging breakdown */}
                                <div className="flex flex-wrap gap-1.5 my-2.5">
                                  <span className="px-2 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                                    📦 {packDetails.fullBoxes} {packDetails.fullBoxes === 1 ? "Box" : "Boxes"}
                                  </span>
                                  <span className="px-2 py-1 rounded-lg text-xs font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-900">
                                    💊 {packDetails.openBoxRemainingStrips} {packDetails.openBoxRemainingStrips === 1 ? "Strip" : "Strips"}
                                  </span>
                                  <span className="px-2 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900">
                                    ⚪ {packDetails.openBoxRemainingTablets} {packDetails.openBoxRemainingTablets === 1 ? "Tab" : "Tabs"}
                                  </span>
                                </div>

                                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                                  <span>Pick from Location</span>
                                  <ArrowRight className="h-4 w-4" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB-STEP 3: SELECT SELLING UNIT & QUANTITY */}
                  {posStep === "SELECT_UNIT" && selectedLocation && (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                        <button onClick={() => setPosStep("SELECT_LOCATION")} className="flex items-center gap-1.5 text-xs font-black text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                          <ArrowLeft className="h-4 w-4" /> Back to Locations
                        </button>
                        <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-3 py-1 rounded-xl">
                          Location: {selectedLocation.locationLabel}
                        </span>
                      </div>

                      {/* Large Selling Unit Selector */}
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                          Select Selling Unit:
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          {(["BOX", "STRIP", "TABLET"] as string[]).map((unit) => {
                            const tabletsPerStrip = selectedProduct?.tabletsPerStrip || 10;
                            const stripsPerBox = selectedProduct?.stripsPerBox || 10;
                            const isSelected = selectedUnit === unit;
                            return (
                              <button
                                key={unit}
                                type="button"
                                onClick={() => selectUnitType(unit)}
                                className={`p-4 rounded-2xl border-2 text-center transition cursor-pointer ${
                                  isSelected
                                    ? "border-brand-primary bg-brand-primary/10 text-brand-primary font-black shadow-sm ring-2 ring-brand-primary/30"
                                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                <div className="font-black text-sm sm:text-base">
                                  {unit === "BOX" ? "📦 Full Box" : unit === "STRIP" ? "💊 Strip / Pata" : "⚪ Tablet / Piece"}
                                </div>
                                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                                  {unit === "BOX" ? `${stripsPerBox} strips` : unit === "STRIP" ? `${tabletsPerStrip} tabs` : "1 base unit"}
                                </div>
                                {isSelected && <CheckCircle2 className="h-5 w-5 text-brand-primary mx-auto mt-2" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Large Counter Quantity Selector */}
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                          Quantity to Sell:
                        </label>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 gap-3">
                          <div>
                            <span className="text-sm font-black text-slate-900 dark:text-white block">Enter Count ({selectedUnit.toLowerCase()}s):</span>
                            <span className="text-xs text-slate-500 font-medium">Location Stock: {selectedLocation.quantity.toLocaleString()} units</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setQuantity(Math.max(1, quantity - 1))}
                              className="p-3 rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition shadow-2xs font-bold active:scale-95"
                            >
                              <Minus className="h-5 w-5" />
                            </button>

                            <input
                              type="number"
                              min={1}
                              value={quantity}
                              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                              className="w-24 py-2 bg-white dark:bg-slate-900 border-2 border-brand-primary rounded-xl text-center font-black text-xl text-slate-900 dark:text-white outline-none shadow-inner"
                            />

                            <button
                              type="button"
                              onClick={() => setQuantity(quantity + 1)}
                              className="p-3 rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition shadow-2xs font-bold active:scale-95"
                            >
                              <Plus className="h-5 w-5" />
                            </button>
                          </div>
                        </div>

                        {/* Fast Quantity Add Shortcuts */}
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-xs font-bold text-slate-400">Quick Add:</span>
                          {[1, 5, 10, 20, 50].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setQuantity(num)}
                              className={`px-3 py-1 rounded-xl text-xs font-black transition border ${
                                quantity === num
                                  ? "bg-brand-primary text-white border-brand-primary"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-primary"
                              }`}
                            >
                              +{num}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Calculations & Add to Cart Action */}
                      {(() => {
                        const mult = selectedUnit === "BOX"
                          ? (selectedProduct?.stripsPerBox || 10) * (selectedProduct?.tabletsPerStrip || 10)
                          : selectedUnit === "STRIP"
                          ? (selectedProduct?.tabletsPerStrip || 10)
                          : 1;
                        const totalUnits = quantity * mult;
                        const unitPrice = Number(selectedProduct?.basePrice || 0) * mult;
                        const linePrice = unitPrice * quantity;
                        const isEnough = selectedLocation.quantity >= totalUnits;

                        return (
                          <div className="space-y-4 pt-2">
                            <div className="p-4 bg-slate-100 dark:bg-slate-800/90 rounded-2xl text-xs space-y-2 border border-slate-200 dark:border-slate-700">
                              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                <span className="font-medium">Location Base Stock:</span>
                                <span className="font-black text-slate-800 dark:text-slate-200">{selectedLocation.quantity.toLocaleString()} units</span>
                              </div>
                              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                <span className="font-medium">Selected Selling Amount:</span>
                                <span className="font-black text-slate-900 dark:text-white">{quantity} {selectedUnit} = {totalUnits.toLocaleString()} base units</span>
                              </div>
                              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                <span className="font-medium">Stock After Deduction:</span>
                                <span className={`font-black ${isEnough ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}`}>
                                  {(selectedLocation.quantity - totalUnits).toLocaleString()} base units
                                </span>
                              </div>
                              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-baseline">
                                <span className="font-black text-sm text-slate-800 dark:text-slate-200">Line Total:</span>
                                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">৳{linePrice.toFixed(2)}</span>
                              </div>
                            </div>

                            <button
                              onClick={confirmAddToCart}
                              disabled={!isEnough}
                              className="w-full bg-brand-primary hover:opacity-95 text-white font-black py-4 rounded-2xl text-sm shadow-md transition flex items-center justify-center gap-2.5 active:scale-[0.99] disabled:opacity-50"
                            >
                              <CheckCircle2 className="h-5 w-5" /> Add to Sale Cart (৳{linePrice.toFixed(2)}) →
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT 5 COLUMNS: CART ITEMS, CUSTOMER DETAILS & INSTANT PAYMENT */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">

              {/* Cart Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-brand-primary/10 rounded-xl">
                    <ShoppingCart className="h-5 w-5 text-brand-primary" />
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Sale Cart ({cart.length})</h3>
                </div>
                {cart.length > 0 && (
                  <button onClick={() => setCart([])} className="text-xs text-rose-500 hover:text-rose-600 font-black hover:underline">
                    Clear Cart
                  </button>
                )}
              </div>

              {error && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {cart.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <ShoppingCart className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700" />
                  <p className="text-sm font-black text-slate-700 dark:text-slate-300">Sale cart is empty</p>
                  <p className="text-xs text-slate-500">Scan barcode or select a medicine from the left panel.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1 divide-y divide-slate-100 dark:divide-slate-800">
                  {cart.map((item) => (
                    <div key={`${item.productId}-${item.inventoryId}-${item.inventoryLocationId}-${item.unitType}`} className="pt-3 first:pt-0 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="font-black text-sm text-slate-900 dark:text-white">{item.name} {item.size ? `(${item.size})` : ""}</div>
                            {item.requiresPrescription && (
                              <span className="px-2 py-0.2 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-black text-[10px] shrink-0 border border-rose-300 dark:border-rose-800">
                                Rx
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 font-medium">
                            {item.genericName ? `${item.genericName} • ` : ""}Rate: ৳{item.basePrice.toFixed(2)}/unit
                          </div>
                          {item.batchNumber && (
                            <div className="text-[11px] font-bold text-brand-primary mt-1 bg-brand-primary/10 px-2 py-0.5 rounded-lg inline-block">
                              Batch: {item.batchNumber} • {item.locationLabel || "Shelf"}
                            </div>
                          )}
                        </div>
                        <button onClick={() => updateQuantity(item.productId, 0)} className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        {item.productType === "MEDICINE" ? (
                          <select
                            value={item.unitType}
                            onChange={(e) => handleUnitChange(item.productId, e.target.value)}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                          >
                            <option value="TABLET">Tablet (1 tab)</option>
                            <option value="STRIP">Strip ({item.tabletsPerStrip} tabs)</option>
                            <option value="BOX">Box ({item.tabletsPerBox} tabs)</option>
                          </select>
                        ) : (
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">{item.unitType}</span>
                        )}

                        <div className="flex items-center gap-1.5">
                          <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-100"><Minus className="h-3.5 w-3.5" /></button>
                          <span className="w-8 text-center font-black text-sm text-slate-900 dark:text-white">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-100"><Plus className="h-3.5 w-3.5" /></button>
                        </div>

                        <div className="font-black text-sm text-emerald-600 dark:text-emerald-400 font-mono text-right">
                          ৳{(item.unitPrice * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Customer & Rx Verification Section */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Customer Name (optional)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Phone # (optional)"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none dark:text-white"
                  />
                </div>

                {hasRxItems && (
                  <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-900 rounded-2xl space-y-2">
                    <div className="text-xs font-black text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4 text-rose-600" />
                      Prescription Verification Required (Rx Item in Cart)
                    </div>
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                      {pharmacySettings.prescriptionRequiredMessage}
                    </p>
                    <div>
                      <label className="block text-xs font-bold text-rose-900 dark:text-rose-200 mb-1">
                        Doctor Name / Prescription Ref # *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Dr. K. Rahman - Ref #Rx-8391"
                        value={prescriptionRef}
                        onChange={(e) => setPrescriptionRef(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-rose-400 dark:border-rose-700 rounded-xl text-xs font-bold outline-none text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                {hasControlledDrugs && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900 rounded-xl space-y-2">
                    <div className="text-xs font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4 text-amber-600" /> Controlled Substance Authorization
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" placeholder="Manager PIN/ID *" value={managerPin} onChange={(e) => setManagerPin(e.target.value)} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-amber-400 rounded-lg text-xs font-bold outline-none" />
                      <input type="text" placeholder="Auth Note (optional)" value={prescriptionRef} onChange={(e) => setPrescriptionRef(e.target.value)} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-amber-400 rounded-lg text-xs outline-none" />
                    </div>
                  </div>
                )}
              </div>

              {/* Receiving Account Selection */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>Receiving Financial Account:</span>
                  <span className="text-[10px] text-slate-400 font-medium">Immediate Balance Credit</span>
                </label>
                {financialAccounts.length === 0 ? (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>No financial account found for this branch. Please create an account in Accounts module.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select
                      value={selectedAccountId}
                      onChange={(e) => {
                        setSelectedAccountId(e.target.value);
                        const acct = financialAccounts.find((a) => a.id === e.target.value);
                        if (acct) setPaymentMethod(acct.type || "CASH");
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-800 dark:text-white outline-none"
                    >
                      {financialAccounts.map((acct) => (
                        <option key={acct.id} value={acct.id}>
                          {acct.type === "CASH" ? "💵" : acct.type === "BKASH" ? "📱" : acct.type === "NAGAD" ? "📱" : "🏦"} {acct.name} ({acct.type}) — Bal: ৳{Number(acct.balance || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </option>
                      ))}
                    </select>

                    {/* Transaction Reference Input */}
                    {(() => {
                      const currentAcc = financialAccounts.find((a) => a.id === selectedAccountId);
                      if (!currentAcc || currentAcc.type === "CASH") return null;
                      const isMobile = currentAcc.type === "BKASH" || currentAcc.type === "NAGAD" || currentAcc.type === "MOBILE";
                      return (
                        <input
                          type="text"
                          placeholder={isMobile ? "TrxID / Mobile Payment Ref #" : "Bank / Card Auth Reference #"}
                          value={isMobile ? mobileTrxId : bankTrxRef}
                          onChange={(e) => isMobile ? setMobileTrxId(e.target.value) : setBankTrxRef(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none dark:text-white"
                        />
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* HIGH VISIBILITY FINANCIAL TOTALS & PAID INPUT */}
              <div className="pt-3 border-t-2 border-slate-200 dark:border-slate-800 space-y-3">
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between font-bold">
                    <span>Subtotal:</span>
                    <span className="font-mono text-slate-900 dark:text-white">৳{subTotal.toFixed(2)}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between font-black text-emerald-600">
                      <span>Discount:</span>
                      <span className="font-mono">-৳{discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between font-semibold">
                    <span className="flex items-center gap-1">
                      VAT {taxPercent > 0 ? `(${taxPercent}%)` : "(0%)"}:
                      {vatSettings.isVatEnabled && (
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded font-bold">Active</span>
                      )}
                    </span>
                    <span className="font-mono">৳{taxAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* PROMINENT GRAND TOTAL BANNER */}
                <div className="p-4 bg-slate-900 text-white dark:bg-slate-800 rounded-2xl flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Grand Total:</span>
                    <span className="text-xs text-emerald-400 font-semibold">Net Payable Amount</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                    ৳{grandTotal.toFixed(2)}
                  </div>
                </div>

                {/* Paid Input & Quick Preset Buttons */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">Paid Amount (৳):</span>
                    <input
                      type="number"
                      placeholder={`৳${grandTotal.toFixed(2)}`}
                      value={paidInput}
                      onChange={(e) => setPaidInput(e.target.value)}
                      className="w-36 px-3 py-1.5 bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded-xl text-sm font-black text-right outline-none text-emerald-600 dark:text-emerald-400 font-mono shadow-inner"
                    />
                  </div>

                  {/* Preset Cash Buttons */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    <span className="text-[11px] font-bold text-slate-400 shrink-0">Preset:</span>
                    <button
                      type="button"
                      onClick={() => setPaidInput(grandTotal.toString())}
                      className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg text-xs font-black shrink-0 hover:bg-emerald-200"
                    >
                      Exact (৳{grandTotal.toFixed(0)})
                    </button>
                    {[100, 500, 1000, 2000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setPaidInput(amt.toString())}
                        className="px-2.5 py-1 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-lg text-xs font-black shrink-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                        ৳{amt}
                      </button>
                    ))}
                  </div>

                  {/* Change Return / Due Display */}
                  {dueAmount > 0 ? (
                    <div className="flex justify-between items-center text-rose-700 dark:text-rose-300 font-black text-xs bg-rose-50 dark:bg-rose-950/50 p-3 rounded-xl border border-rose-200 dark:border-rose-900">
                      <span>Due Amount:</span>
                      <span className="font-mono text-sm">৳{dueAmount.toFixed(2)}</span>
                    </div>
                  ) : changeAmount > 0 ? (
                    <div className="flex justify-between items-center text-blue-700 dark:text-blue-300 font-black text-xs bg-blue-50 dark:bg-blue-950/50 p-3 rounded-xl border border-blue-200 dark:border-blue-900">
                      <span>Change Return:</span>
                      <span className="font-mono text-sm">৳{changeAmount.toFixed(2)}</span>
                    </div>
                  ) : null}
                </div>

                {/* Instant Checkout Action Button */}
                <button
                  disabled={checkingOut || cart.length === 0 || financialAccounts.length === 0}
                  onClick={handleCheckout}
                  className="w-full bg-brand-primary hover:opacity-95 text-white font-black py-4 rounded-2xl text-sm shadow-md transition flex items-center justify-center gap-2.5 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  {checkingOut ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Receipt className="h-5 w-5" /> Complete Sale & Receive ৳{numericPaid.toFixed(2)} <span className="text-xs opacity-75 font-mono">(F9)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* History tab */
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by receipt # or customer phone..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadSalesHistory()}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none dark:text-white"
              />
            </div>
            <button onClick={loadSalesHistory} className="px-4 py-2.5 bg-brand-primary text-white text-xs font-black rounded-xl hover:opacity-90">
              Search History
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {loadingHistory ? (
              <div className="p-16 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-brand-primary mb-2" />
                <p className="text-xs font-bold">Loading transaction history...</p>
              </div>
            ) : salesHistory.length === 0 ? (
              <div className="p-16 text-center text-slate-400">
                <Receipt className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No sales history found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-black text-[10px]">
                      <th className="py-3 px-4">Receipt # & Date</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Payment Account</th>
                      <th className="py-3 px-4">Total Amount</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {salesHistory.map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4">
                          <div className="font-mono font-black text-slate-900 dark:text-white">{s.receiptNo}</div>
                          <div className="text-[10px] text-slate-400">{new Date(s.createdAt).toLocaleString()}</div>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">{s.customerName || "Walk-in Customer"}</td>
                        <td className="py-3 px-4">
                          <span className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {s.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-black text-slate-900 dark:text-white text-sm">৳{Number(s.totalAmount).toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                            s.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                          }`}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RECEIPT / INVOICE MODAL — Professional Bangladesh Pharmacy Format */}
      {receiptModalOpen && invoiceData && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 print:static print:inset-auto print:bg-transparent print:p-0 print:block print:w-full">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden print-invoice-card print:rounded-none print:shadow-none print:border-none print:max-w-full print:w-full print:text-black">
            {/* Modal Control Bar — hidden on print */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 print:hidden">
              <div className="flex items-center gap-2 text-emerald-600 font-black text-xs">
                <CheckCircle2 className="h-5 w-5" /> Sale Completed & Invoice Ready
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-black shadow hover:opacity-90 cursor-pointer">
                  <Printer className="h-4 w-4" /> Print Receipt
                </button>
                <button onClick={() => setReceiptModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Invoice Document */}
            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0 print:space-y-6 text-slate-800 dark:text-slate-200 print:text-black">

              {/* Pharmacy Header */}
              <div className="text-center space-y-1.5 pb-4 border-b-2 border-slate-900 dark:border-slate-100 print:border-black">
                {(invoiceData.pharmacy?.logoUrl || user?.tenant?.logoUrl) && (
                  <div className="flex justify-center mb-2">
                    <img
                      src={invoiceData.pharmacy?.logoUrl || user?.tenant?.logoUrl || ""}
                      alt="Pharmacy logo"
                      className="h-16 sm:h-20 object-contain print:h-20"
                    />
                  </div>
                )}
                <h2 className="font-black text-xl sm:text-2xl print:text-2xl uppercase tracking-tight text-slate-900 dark:text-white print:text-black">
                  {invoiceData.pharmacy?.name || user?.tenant?.name || "Pharmacy"}
                </h2>
                {pharmacySettings.receiptHeaderNote && (
                  <p className="text-xs sm:text-sm print:text-sm text-emerald-700 dark:text-emerald-400 print:text-black font-bold italic">
                    {pharmacySettings.receiptHeaderNote}
                  </p>
                )}
                {invoiceData.pharmacy?.address && (
                  <p className="text-xs sm:text-sm print:text-sm text-slate-600 dark:text-slate-300 print:text-black font-medium">{invoiceData.pharmacy.address}</p>
                )}
                <p className="text-xs sm:text-sm print:text-sm text-slate-600 dark:text-slate-300 print:text-black font-medium">
                  {invoiceData.pharmacy?.phone && `Tel: ${invoiceData.pharmacy.phone}`}
                  {invoiceData.pharmacy?.phone && invoiceData.pharmacy?.email && " | "}
                  {invoiceData.pharmacy?.email && `Email: ${invoiceData.pharmacy.email}`}
                </p>
              </div>

              {/* Invoice Meta */}
              <div className="flex justify-between text-xs sm:text-sm print:text-sm pb-4 border-b-2 border-slate-900 dark:border-slate-100 print:border-black font-medium leading-relaxed">
                <div className="space-y-1">
                  <div><span className="font-bold text-slate-500 print:text-black">Invoice #: </span><span className="font-mono font-black text-sm sm:text-base print:text-base">{invoiceData.invoice?.receiptNo || "—"}</span></div>
                  <div><span className="font-bold text-slate-500 print:text-black">Customer: </span><span className="font-bold text-slate-900 dark:text-white print:text-black">{invoiceData.invoice?.customerName || "Walk-in Customer"}</span></div>
                  {invoiceData.invoice?.customerPhone && invoiceData.invoice.customerPhone !== "—" && (
                    <div><span className="font-bold text-slate-500 print:text-black">Phone: </span><span className="font-mono">{invoiceData.invoice.customerPhone}</span></div>
                  )}
                  <div><span className="font-bold text-slate-500 print:text-black">Cashier: </span>{invoiceData.invoice?.cashier || user?.name || "Staff"}</div>
                </div>
                <div className="text-right space-y-1">
                  <div><span className="font-bold text-slate-500 print:text-black">Date: </span>{new Date(invoiceData.invoice?.date || invoiceData.invoice?.createdAt || Date.now()).toLocaleDateString("en-BD", { day: "2-digit", month: "short", year: "numeric" })}</div>
                  <div><span className="font-bold text-slate-500 print:text-black">Time: </span>{new Date(invoiceData.invoice?.date || invoiceData.invoice?.createdAt || Date.now()).toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" })}</div>
                  <div><span className="font-bold text-slate-500 print:text-black">Payment Method: </span><span className="font-bold text-slate-900 dark:text-white print:text-black">{invoiceData.invoice?.paymentMethod || "Cash"}</span></div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <table className="w-full text-xs sm:text-sm print:text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-900 dark:border-slate-100 print:border-black uppercase text-xs font-black text-slate-700 dark:text-slate-300 print:text-black">
                      <th className="pb-2 text-left w-8">#</th>
                      <th className="pb-2 text-left">Medicine / Product</th>
                      <th className="pb-2 text-center">Batch</th>
                      <th className="pb-2 text-center">Unit</th>
                      <th className="pb-2 text-center">Qty</th>
                      <th className="pb-2 text-right">Unit Price</th>
                      <th className="pb-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 print:divide-slate-300 font-medium">
                    {(invoiceData.invoice?.items || []).map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 print:border-slate-200">
                        <td className="py-2.5 text-slate-400 font-mono text-xs">{idx + 1}</td>
                        <td className="py-2.5 font-bold text-slate-900 dark:text-white print:text-black">
                          {item.name}
                          {item.genericName && (
                            <div className="text-[11px] print:text-xs text-slate-500 print:text-slate-700 font-medium">{item.genericName}</div>
                          )}
                        </td>
                        <td className="py-2.5 text-center text-slate-600 print:text-black font-mono text-xs">{item.batchNumber || "—"}</td>
                        <td className="py-2.5 text-center text-slate-600 print:text-black">{item.unitType || "Pc"}</td>
                        <td className="py-2.5 text-center font-black">{item.quantity}</td>
                        <td className="py-2.5 text-right font-mono">৳{Number(item.unitPrice || 0).toFixed(2)}</td>
                        <td className="py-2.5 text-right font-black font-mono">৳{Number(item.subTotal || (item.unitPrice * item.quantity) || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="pt-3 border-t-2 border-slate-900 dark:border-slate-100 print:border-black space-y-1.5 text-xs sm:text-sm print:text-sm font-medium">
                <div className="flex justify-between text-slate-600 print:text-black">
                  <span>Subtotal:</span>
                  <span className="font-mono font-bold">৳{Number(invoiceData.invoice?.subTotal || 0).toFixed(2)}</span>
                </div>
                {Number(invoiceData.invoice?.discount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-600 print:text-black font-bold">
                    <span>Discount:</span>
                    <span className="font-mono">-৳{Number(invoiceData.invoice.discount).toFixed(2)}</span>
                  </div>
                )}
                {Number(invoiceData.invoice?.tax || 0) > 0 && (
                  <div className="flex justify-between text-slate-600 print:text-black">
                    <span>VAT / Tax:</span>
                    <span className="font-mono font-bold">৳{Number(invoiceData.invoice.tax).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-base sm:text-lg print:text-xl text-slate-900 dark:text-white print:text-black pt-2 border-t border-slate-300 print:border-black">
                  <span>Grand Total:</span>
                  <span className="font-mono">৳{Number(invoiceData.invoice?.totalAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400 print:text-black">
                  <span>Payment Method:</span>
                  <span className="font-bold">{invoiceData.invoice?.paymentMethod || "Cash"}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400 print:text-black">
                  <span>Paid Amount:</span>
                  <span className="font-mono font-bold">৳{Number(invoiceData.invoice?.paidAmount ?? invoiceData.invoice?.totalAmount ?? 0).toFixed(2)}</span>
                </div>
                {Number(invoiceData.invoice?.dueAmount || 0) > 0 && (
                  <div className="flex justify-between font-black text-rose-600 print:text-black">
                    <span>Due Amount:</span>
                    <span className="font-mono">৳{Number(invoiceData.invoice.dueAmount).toFixed(2)}</span>
                  </div>
                )}
                {Number(invoiceData.invoice?.changeAmount || 0) > 0 && (
                  <div className="flex justify-between font-black text-blue-600 print:text-black">
                    <span>Change Return:</span>
                    <span className="font-mono">৳{Number(invoiceData.invoice.changeAmount).toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Footer Note */}
              {pharmacySettings.receiptFooterNote && (
                <div className="pt-3 border-t border-dashed border-slate-300 print:border-black text-center text-xs print:text-sm text-slate-500 print:text-black italic">
                  {pharmacySettings.receiptFooterNote}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
