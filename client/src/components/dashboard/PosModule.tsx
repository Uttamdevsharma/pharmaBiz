"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/lib/api";
import { Product, Branch } from "@/types";
import { calculateLocationPackaging, convertUnitToBase } from "@/lib/packaging";
import {
  ShoppingCart, Search, Plus, Minus, Trash2, Receipt, CreditCard,
  Banknote, Smartphone, ShieldAlert, Loader2, AlertCircle, Store,
  Printer, Barcode, CheckCircle2, X, Tag, Boxes, MapPin, Calendar,
  FileText, Building2, Archive, ArrowRight, Target, PackageCheck,
  Clock, ChevronRight, ChevronDown, RefreshCw, AlertTriangle,
  Zap, Package, ArrowLeft, DollarSign,
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

type PosStep = "SEARCH" | "SELECT_PRODUCT" | "SELECT_BATCH" | "SELECT_LOCATION" | "SELECT_UNIT" | "ENTER_QTY";

export function PosModule() {
  const { user } = useAuth();
  const [viewTab, setViewTab] = useState<"pos" | "history">("pos");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(user?.branchId || "");
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
  // Daily report
  const [dailyReportModalOpen, setDailyReportModalOpen] = useState(false);
  const [dailyReportData, setDailyReportData] = useState<any>(null);
  const [dailyReportLoading, setDailyReportLoading] = useState(false);
  const [dailyReportDate, setDailyReportDate] = useState(new Date().toISOString().split("T")[0]);
  // Sale completion callback for refresh
  const [saleJustCompleted, setSaleJustCompleted] = useState(false);

  const loadDailyReport = async (dateStr?: string) => {
    try {
      setDailyReportLoading(true);
      const targetDate = dateStr || dailyReportDate;
      const params = new URLSearchParams();
      params.append("startDate", targetDate); params.append("endDate", targetDate);
      if (selectedBranchId) params.append("branchId", selectedBranchId);
      const res = await fetchApi<any>(`/reports/sales/daily?${params.toString()}`);
      if (res.success && res.data) setDailyReportData(res.data);
    } catch (err) { console.error("Failed to load daily shift report", err); }
    finally { setDailyReportLoading(false); }
  };

  const isBranchLocked = Boolean(user?.branchId && user?.role !== "COMPANY_OWNER" && user?.role !== "SUPER_ADMIN");

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

  useEffect(() => {
    async function init() {
      try {
        const bRes = await fetchApi("/branches");
        if (bRes.success && bRes.data && bRes.data.length > 0) {
          setBranches(bRes.data);
          if (user?.branchId) setSelectedBranchId(user.branchId);
          else if (!selectedBranchId) setSelectedBranchId(bRes.data[0].id);
        }
      } catch (err) { console.error("Failed to init branches", err); }
    }
    init();
    loadCategories();
  }, [user?.branchId]);

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

  useEffect(() => { loadVatSettings(); }, []);
  useEffect(() => { if (selectedBranchId) { loadPosProducts(); loadFinancialAccounts(selectedBranchId); if (viewTab === "history") loadSalesHistory(); } }, [selectedBranchId, viewTab]);

  const loadSalesHistory = async () => {
    if (!selectedBranchId) return;
    try { setLoadingHistory(true); const params = new URLSearchParams(); params.append("branchId", selectedBranchId); if (historySearch) params.append("search", historySearch); const res = await fetchApi(`/sales?${params.toString()}`); if (res.success && res.data) setSalesHistory(res.data); } catch (err) { console.error("Failed to load sales history", err); } finally { setLoadingHistory(false); }
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

  const confirmAddToCart = () => {
    if (!selectedProduct || !selectedBatch || !selectedLocation) return;
    const prod = selectedProduct;
    const isMed = prod.productType === "MEDICINE" || !prod.productType;
    const tabletsPerStrip = prod.tabletsPerStrip || 10;
    const stripsPerBox = prod.stripsPerBox || 10;
    const tabletsPerBox = isMed ? stripsPerBox * tabletsPerStrip : 1;
    const boxesPerCarton = prod.boxesPerCarton || 10;
    const tabletsPerCarton = boxesPerCarton * tabletsPerBox;

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
    if (selectedBatch.expiryDate && selectedBatch.expiryDate <= now) { alert("Cannot sell expired batches."); return; }
    const unitPrice = Number(prod.basePrice) * multiplier;

    const existingIdx = cart.findIndex((item) => item.productId === prod.id && item.inventoryId === selectedBatch.id && item.inventoryLocationId === selectedLocation.id && item.unitType === unitType);
    if (existingIdx >= 0) {
      const existing = cart[existingIdx];
      const newQty = existing.quantity + quantity;
      const totalUnits = newQty * multiplier;
      if (totalUnits > existing.availableBaseStock) { alert(`Cannot add more. Max available is ${existing.availableBaseStock} base units.`); return; }
      const updated = [...cart]; updated[existingIdx] = { ...existing, quantity: newQty, availableBaseStock: selectedLocation.quantity }; setCart(updated);
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

  const resetPosFlow = () => {
    setPosStep("SEARCH"); setSelectedProduct(null); setSelectedBatch(null);
    setSelectedLocation(null); setSelectedUnit("TABLET"); setQuantity(1);
    setPosBatches([]); setSelectedBatchLocations([]);
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
    if (newQuantity <= 0) { setCart(cart.filter((item) => item.productId !== productId)); return; }
    setCart((prev) => prev.map((item) => {
      if (item.productId !== productId) return item;
      const totalUnits = newQuantity * item.unitMultiplier;
      if (totalUnits > item.availableBaseStock) { alert(`Insufficient stock. Max available is ${item.availableBaseStock} base units.`); return item; }
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
  if (discountValue > 0) { discountAmount = discountType === "PERCENT" ? Math.round((subTotal * (discountValue / 100)) * 100) / 100 : Number(discountValue); }
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
    if (financialAccounts.length === 0 || !selectedAccountId) { setError("No active financial account exists for this branch."); return; }
    const chosenAccount = financialAccounts.find((a) => a.id === selectedAccountId);
    if (!chosenAccount) { setError("Selected financial account is invalid."); return; }
    try {
      setCheckingOut(true); setError(null);
      let paymentNote: string | null = null, trxRef: string | null = null;
      const targetBankName: string | null = chosenAccount.bankName || chosenAccount.name;
      if (paymentMethod === "BKASH" || paymentMethod === "NAGAD" || paymentMethod === "MOBILE") { paymentNote = `${chosenAccount.name}${mobileTrxId.trim() ? ` (Trx: ${mobileTrxId.trim()})` : ""}`; trxRef = mobileTrxId.trim() || null; }
      else if (paymentMethod === "BANK") { paymentNote = `${chosenAccount.name}${bankTrxRef.trim() ? ` (Ref: ${bankTrxRef.trim()})` : ""}`; trxRef = bankTrxRef.trim() || null; }
      else { paymentNote = `POS Cash via ${chosenAccount.name}`; }
      const payload = {
        branchId: selectedBranchId, customerName: customerName.trim() || "Walk-in Customer", customerPhone: customerPhone.trim() || null,
        paymentMethod: chosenAccount.type || paymentMethod, financialAccountId: chosenAccount.id, bankName: targetBankName, transactionRef: trxRef, notes: paymentNote,
        discount: discountValue, discountType, tax: taxAmount, paidAmount: numericPaid, prescriptionRef: prescriptionRef.trim() || null, managerApprovedBy: managerPin.trim() || null,
        items: cart.map((item) => ({ productId: item.productId, inventoryId: item.inventoryId || null, inventoryLocationId: item.inventoryLocationId || null, unitType: item.unitType, unitMultiplier: item.unitMultiplier, quantity: item.quantity, unitPrice: item.unitPrice })),
      };
      const res = await fetchApi("/sales", { method: "POST", body: JSON.stringify(payload) });
      if (!res.success) throw new Error(res.message || "Failed to process sale");
      const receiptRes = await fetchApi(`/sales/${res.data.id}/receipt`);
      if (receiptRes.success && receiptRes.data) setInvoiceData(receiptRes.data);
      else setInvoiceData({ pharmacy: { name: "Pharmacy Store", address: "Main Branch", phone: "—" }, invoice: { ...res.data, items: cart } });
      setReceiptModalOpen(true); setCart([]); setPaidInput(""); setDiscountValue(0); setManagerPin(""); setPrescriptionRef(""); setMobileTrxId(""); setBankTrxRef("");
      setSaleJustCompleted(true);
      loadPosProducts(); loadFinancialAccounts(selectedBranchId);
    } catch (err: any) { setError(err.message); } finally { setCheckingOut(false); }
  };

  const handleViewHistoricalReceipt = async (saleId: string) => {
    try { const res = await fetchApi(`/sales/${saleId}/receipt`); if (res.success && res.data) { setInvoiceData(res.data); setReceiptModalOpen(true); } } catch (err) { console.error("Failed to load historical receipt", err); }
  };
  const handlePrint = () => window.print();

  const stepIndicator = ["Search", "Product", "Batch", "Location", "Unit", "Qty"];
  const stepIndex = ["SEARCH","SELECT_PRODUCT","SELECT_BATCH","SELECT_LOCATION","SELECT_UNIT","ENTER_QTY"].indexOf(posStep);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 text-brand-primary" /> Counter POS & Sales Terminal
              <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-bold">Batch + Location Aware</span>
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">FEFO batch selection, physical rack/shelf/bin tracking, and real-time stock deduction.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button onClick={() => setViewTab("pos")} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${viewTab === "pos" ? "bg-white dark:bg-slate-900 text-brand-primary shadow-sm" : "text-slate-600 dark:text-slate-400"}`}>Active POS</button>
            <button onClick={() => setViewTab("history")} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${viewTab === "history" ? "bg-white dark:bg-slate-900 text-brand-primary shadow-sm" : "text-slate-600 dark:text-slate-400"}`}>Sales History</button>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl">
            <Store className="h-4 w-4 text-slate-400" />
            <select disabled={isBranchLocked} value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)} className="bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none disabled:opacity-60">
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
      </div>


      {viewTab === "pos" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-4">
            {/* Search */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Scan barcode or search by name, generic name, SKU..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white font-medium" />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPosCategoryFilter("ALL")}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold transition ${
                    posCategoryFilter === "ALL"
                      ? "bg-brand-primary text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  All Items ({products.length})
                </button>
                {categories.map((cat) => {
                  const count = products.filter(
                    (p) => p.categoryId === cat.id || (p.categoryRef?.name || p.category) === cat.name
                  ).length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setPosCategoryFilter(cat.name)}
                      className={`px-3 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 ${
                        posCategoryFilter === cat.name || posCategoryFilter === cat.id
                          ? "bg-brand-primary text-white shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                    >
                      <span>{cat.name}</span>
                      <span className="text-[10px] opacity-75">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Product & Inline Flow Area */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 min-h-[460px] space-y-4">
              {posStep === "SEARCH" ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Select a Product to Sell:</span>
                    <span className="text-[11px] text-slate-400 font-medium">{filteredProducts.length} product{filteredProducts.length === 1 ? "" : "s"} found</span>
                  </div>
                  {loading ? (
                    <div className="p-16 flex flex-col items-center justify-center text-slate-400"><Loader2 className="h-8 w-8 animate-spin text-brand-primary mb-2" /><p className="text-xs">Loading catalog...</p></div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="p-16 text-center text-slate-400"><Barcode className="h-10 w-10 mx-auto text-slate-300 mb-2" /><p className="text-sm font-bold">No products matched</p></div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[560px] overflow-y-auto pr-1">
                      {filteredProducts.map((p) => {
                        const stock = p.currentStock || 0;
                        const inStock = stock > 0;
                        return (
                          <div key={p.id} onClick={() => inStock && startProductSelection(p)} className={`p-3.5 rounded-2xl border transition text-left cursor-pointer ${inStock ? "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 hover:border-brand-primary hover:shadow-md" : "bg-slate-50 dark:bg-slate-800/20 border-slate-200/50 dark:border-slate-800 opacity-60 cursor-not-allowed"}`}>
                            <div className="flex items-start justify-between gap-1">
                              <div className="font-black text-xs text-slate-900 dark:text-white leading-tight">{p.name}</div>
                              {p.requiresPrescription && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-black text-[9px] shrink-0">
                                  Rx
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{p.genericName ? <span className="font-semibold text-brand-primary">{p.genericName} • </span> : null}{p.brandName || p.manufacturer || "Generic"}</div>
                            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                              <div><span className="text-sm font-black text-slate-900 dark:text-white">৳{Number(p.basePrice).toFixed(2)}</span><span className="text-[10px] text-slate-400"> / {p.unit}</span></div>
                              <div className="text-right"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${inStock ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-rose-50 text-rose-600 dark:bg-rose-950/50"}`}>{inStock ? `${stock} ${p.unit}s` : "Out of Stock"}</span></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* INLINE FLOW CONTAINER - Renders directly inside the product area */
                <div className="space-y-4">
                  {/* Selected Product Banner */}
                  <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-black text-xs text-slate-900 dark:text-white">{selectedProduct?.name}</span>
                        {selectedProduct?.size && <span className="text-[10px] text-slate-500 font-semibold">({selectedProduct.size})</span>}
                        {selectedProduct?.requiresPrescription && (
                          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-black text-[10px] flex items-center gap-1">
                            <ShieldAlert className="h-3 w-3" /> Rx Required
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {selectedProduct?.genericName && <span>{selectedProduct.genericName} • </span>}
                        Base Price: <strong>৳{Number(selectedProduct?.basePrice || 0).toFixed(2)}</strong>/{selectedProduct?.unit || "unit"}
                      </div>
                    </div>
                    <button onClick={resetPosFlow} className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                      <X className="h-3 w-3" /> Change Product
                    </button>
                  </div>

                  {/* Flow Breadcrumb */}
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 flex-wrap">
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Product</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className={posStep === "SELECT_PRODUCT" ? "text-brand-primary font-black" : selectedBatch ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}>
                      {selectedBatch ? `Batch: ${selectedBatch.batchNumber}` : "1. Select Batch"}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className={posStep === "SELECT_LOCATION" ? "text-brand-primary font-black" : selectedLocation ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}>
                      {selectedLocation ? `Location: ${selectedLocation.locationLabel || "Shelf"}` : "2. Select Location"}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className={posStep === "SELECT_UNIT" ? "text-brand-primary font-black" : "text-slate-400"}>
                      3. Unit & Quantity
                    </span>
                  </div>

                  {/* SUB-STEP 1: SELECT BATCH */}
                  {posStep === "SELECT_PRODUCT" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <PackageCheck className="h-4 w-4 text-brand-primary" />
                          <h4 className="font-black text-xs text-slate-800 dark:text-slate-200">Available Batches (FEFO Sorted):</h4>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400">Oldest expiry first</span>
                      </div>
                      {loadingBatches ? (
                        <div className="p-12 text-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-brand-primary" />Loading FEFO batches...</div>
                      ) : posBatches.length === 0 ? (
                        <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400">
                          <AlertCircle className="h-6 w-6 mx-auto text-amber-500 mb-1" />
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No available batches with stock</p>
                          <p className="text-[11px] mt-0.5">Please add or receive inventory for this product.</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                          {posBatches.map((batch: any) => {
                            const isExpired = batch.expiryDate && new Date(batch.expiryDate) < new Date();
                            const daysLeft = batch.expiryDate ? Math.ceil((new Date(batch.expiryDate).getTime() - Date.now()) / 86400000) : null;
                            const locationsCount = (batch.physicalLocations || []).length;
                            return (
                              <button key={batch.id} onClick={() => !isExpired && selectBatch(batch)} disabled={isExpired || batch.hasPhysicalStock === false}
                                className={`w-full text-left p-3.5 rounded-xl border transition ${isExpired || !batch.hasPhysicalStock ? "bg-rose-50/50 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/40 opacity-60 cursor-not-allowed" : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-brand-primary hover:shadow-sm cursor-pointer"}`}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-black text-slate-900 dark:text-white text-xs">Batch: {batch.batchNumber || "—"}</span>
                                      {isExpired ? (
                                        <span className="text-[10px] bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 px-2 py-0.5 rounded-full font-bold">EXPIRED</span>
                                      ) : daysLeft !== null && daysLeft <= 90 ? (
                                        <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">Near Expiry ({daysLeft}d)</span>
                                      ) : (
                                        <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">Active</span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-1">
                                      Expiry: <strong className="text-slate-700 dark:text-slate-300">{batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : "No Expiry"}</strong> • Total Stock: <strong>{batch.quantity.toLocaleString()}</strong> units
                                    </div>
                                  </div>
                                  <div className="text-xs font-black text-brand-primary font-mono self-start sm:self-auto">
                                    ৳{Number(batch.sellingPrice || selectedProduct?.basePrice).toFixed(2)}/unit
                                  </div>
                                </div>
                                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50 text-[10px] font-bold flex items-center justify-between">
                                  <span className={locationsCount > 0 ? "text-emerald-600 dark:text-emerald-400 flex items-center gap-1" : "text-amber-500 flex items-center gap-1"}>
                                    <MapPin className="h-3 w-3" /> {locationsCount} Physical Location{locationsCount === 1 ? "" : "s"} Allocated
                                  </span>
                                  <span className="text-brand-primary flex items-center gap-0.5">Select Batch <ArrowRight className="h-3 w-3" /></span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB-STEP 2: SELECT LOCATION */}
                  {posStep === "SELECT_LOCATION" && selectedBatch && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <button onClick={() => setPosStep("SELECT_PRODUCT")} className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                          <ArrowLeft className="h-3.5 w-3.5" /> Back to Batches
                        </button>
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Batch: {selectedBatch.batchNumber}</span>
                      </div>
                      {loadingLocations ? (
                        <div className="p-12 text-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-brand-primary" />Loading physical locations...</div>
                      ) : selectedBatchLocations.length === 0 ? (
                        <div className="p-8 text-center bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl text-slate-600 dark:text-slate-400 space-y-1">
                          <AlertCircle className="h-7 w-7 mx-auto text-amber-500 mb-1" />
                          <p className="font-bold text-xs text-amber-800 dark:text-amber-300">No physical locations allocated for this batch.</p>
                          <p className="text-[11px]">Stock must be allocated to Rack/Shelf/Bin before counter selling.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                          {selectedBatchLocations.map((loc: any) => {
                            const packDetails = calculateLocationPackaging(loc.quantity, {
                              stripsPerBox: selectedBatch.stripsPerBox || 10,
                              tabletsPerStrip: selectedBatch.tabletsPerStrip || 10,
                              packageType: selectedProduct?.productType,
                              unit: selectedProduct?.unit || "units",
                            });
                            return (
                              <button key={loc.id} onClick={() => selectLocation(loc)} disabled={loc.quantity <= 0}
                                className={`p-3.5 rounded-xl border text-left text-xs transition ${loc.quantity <= 0 ? "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed" : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:shadow-sm cursor-pointer"}`}>
                                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                                  <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                    {loc.rackName || loc.rack?.name || "Rack"}
                                  </span>
                                  <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
                                  <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                    {loc.shelfName || loc.shelf?.name || "Shelf"}
                                  </span>
                                  <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
                                  <span className="inline-flex items-center gap-1 bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                    {loc.binName || loc.bin?.name || "Bin"}
                                  </span>
                                </div>
                                <div className="flex items-baseline justify-between mb-1.5">
                                  <div className="text-base font-black text-slate-900 dark:text-white">
                                    {loc.quantity.toLocaleString()} <span className="text-[11px] font-semibold text-slate-500">{selectedProduct?.unit || "units"}</span>
                                  </div>
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                                    In Stock
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 my-2">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/50">
                                    📦 {packDetails.fullBoxes} {packDetails.fullBoxes === 1 ? "Box" : "Boxes"}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-900/50">
                                    💊 {packDetails.openBoxRemainingStrips} {packDetails.openBoxRemainingStrips === 1 ? "Strip" : "Strips"}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/50">
                                    ⚪ {packDetails.openBoxRemainingTablets} {packDetails.openBoxRemainingTablets === 1 ? "Tab" : "Tabs"}
                                  </span>
                                </div>
                                <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700/60 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                                  <span>Select this location</span>
                                  <ArrowRight className="h-3 w-3" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB-STEP 3: SELECT UNIT & QUANTITY & ADD TO CART */}
                  {posStep === "SELECT_UNIT" && selectedLocation && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <button onClick={() => setPosStep("SELECT_LOCATION")} className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                          <ArrowLeft className="h-3.5 w-3.5" /> Back to Locations
                        </button>
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                          Location: {selectedLocation.locationLabel}
                        </span>
                      </div>

                      {/* Unit Selector */}
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Selling Unit:</label>
                        <div className="grid grid-cols-3 gap-2.5">
                          {(["BOX", "STRIP", "TABLET"] as string[]).map((unit) => {
                            const tabletsPerStrip = selectedProduct?.tabletsPerStrip || 10;
                            const stripsPerBox = selectedProduct?.stripsPerBox || 10;
                            const isSelected = selectedUnit === unit;
                            return (
                              <button key={unit} type="button" onClick={() => selectUnitType(unit)}
                                className={`p-3 rounded-xl border text-center transition ${isSelected ? "border-brand-primary bg-brand-primary/10 text-brand-primary font-black shadow-2xs" : "border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300"}`}>
                                <div className="font-black text-xs">{unit === "BOX" ? "Full Box" : unit === "STRIP" ? "Strip / Pata" : "Single Tablet"}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {unit === "BOX" ? `${stripsPerBox} strips` : unit === "STRIP" ? `${tabletsPerStrip} tabs` : "1 tab"}
                                </div>
                                {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-brand-primary mx-auto mt-1" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Quantity Selector */}
                      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Quantity to Sell:</span>
                          <span className="text-[10px] text-slate-400">Enter number of {selectedUnit.toLowerCase()}s</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
                            <Minus className="h-4 w-4" />
                          </button>
                          <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))} className="w-16 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-center font-black text-sm text-slate-900 dark:text-white outline-none" />
                          <button type="button" onClick={() => setQuantity(quantity + 1)} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Inline Calculations & Action */}
                      {(() => {
                        const mult = selectedUnit === "BOX" ? (selectedProduct?.stripsPerBox || 10) * (selectedProduct?.tabletsPerStrip || 10) : selectedUnit === "STRIP" ? (selectedProduct?.tabletsPerStrip || 10) : 1;
                        const totalUnits = quantity * mult;
                        const unitPrice = Number(selectedProduct?.basePrice || 0) * mult;
                        const linePrice = unitPrice * quantity;
                        const isEnough = selectedLocation.quantity >= totalUnits;

                        return (
                          <div className="space-y-3">
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-xs space-y-1.5 border border-slate-200 dark:border-slate-700/60">
                              <div className="flex justify-between text-slate-500">
                                <span>Location Available:</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">{selectedLocation.quantity.toLocaleString()} base units</span>
                              </div>
                              <div className="flex justify-between text-slate-500">
                                <span>Selling:</span>
                                <span className="font-bold text-slate-900 dark:text-white">{quantity} {selectedUnit} = {totalUnits.toLocaleString()} units</span>
                              </div>
                              <div className="flex justify-between text-slate-500">
                                <span>Remaining at Location:</span>
                                <span className={`font-bold ${isEnough ? "text-emerald-600" : "text-rose-600"}`}>
                                  {(selectedLocation.quantity - totalUnits).toLocaleString()} units
                                </span>
                              </div>
                              <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex justify-between items-baseline">
                                <span className="font-bold text-slate-700 dark:text-slate-300">Item Total:</span>
                                <span className="text-base font-black text-brand-primary">৳{linePrice.toFixed(2)}</span>
                              </div>
                            </div>

                            <button onClick={confirmAddToCart} disabled={!isEnough} className="w-full bg-brand-primary hover:opacity-95 text-white font-black py-3 rounded-xl text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50">
                              <CheckCircle2 className="h-4 w-4" /> Add to Cart (৳{linePrice.toFixed(2)}) →
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

          {/* RIGHT 5 COLS: FINAL SALE SUMMARY & CHECKOUT */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-brand-primary" />
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Sale Summary ({cart.length})</h3>
                </div>
                {cart.length > 0 && (
                  <button onClick={() => setCart([])} className="text-[11px] text-rose-500 hover:underline font-bold">
                    Clear Cart
                  </button>
                )}
              </div>

              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-600 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <ShoppingCart className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-xs font-bold">Cart is empty</p>
                  <p className="text-[10px] mt-0.5">Select a product to begin the inline selling workflow.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 divide-y divide-slate-100 dark:divide-slate-800">
                  {cart.map((item) => (
                    <div key={`${item.productId}-${item.inventoryId}-${item.inventoryLocationId}-${item.unitType}`} className="pt-2.5 first:pt-0 space-y-1.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <div className="font-bold text-xs text-slate-900 dark:text-white">{item.name} {item.size ? `(${item.size})` : ""}</div>
                            {item.requiresPrescription && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-black text-[9px] shrink-0">
                                Rx
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {item.genericName ? `${item.genericName} • ` : ""}Base: ৳{item.basePrice.toFixed(2)}
                          </div>
                          {item.batchNumber && (
                            <div className="text-[9px] font-bold text-brand-primary mt-0.5 bg-brand-primary/10 px-1.5 py-0.5 rounded inline-block">
                              Batch: {item.batchNumber} • {item.locationLabel || "Shelf"}
                            </div>
                          )}
                        </div>
                        <button onClick={() => updateQuantity(item.productId, 0)} className="text-slate-400 hover:text-rose-600 p-1">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        {item.productType === "MEDICINE" ? (
                          <select value={item.unitType} onChange={(e) => handleUnitChange(item.productId, e.target.value)} className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 outline-none">
                            <option value="TABLET">Tablet (1 tab)</option>
                            <option value="STRIP">Strip ({item.tabletsPerStrip} tabs)</option>
                            <option value="BOX">Box ({item.tabletsPerBox} tabs)</option>
                          </select>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{item.unitType}</span>
                        )}
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100"><Minus className="h-3 w-3" /></button>
                          <span className="w-7 text-center font-black text-xs text-slate-900 dark:text-white">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100"><Plus className="h-3 w-3" /></button>
                        </div>
                        <div className="font-black text-xs text-slate-900 dark:text-white text-right">৳{(item.unitPrice * item.quantity).toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Customer & Prescription Details */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Customer Name (optional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white" />
                  <input type="text" placeholder="Phone (optional)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white font-mono" />
                </div>

                {hasRxItems && (
                  <div className="p-3 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl space-y-2">
                    <div className="text-xs font-black text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4 text-rose-600" />
                      Prescription Verification Required (Rx Items in Cart)
                    </div>
                    <p className="text-[11px] text-rose-600/90 dark:text-rose-400">
                      Doctor name / prescription reference is mandatory to complete sale for Rx items.
                    </p>
                    <div>
                      <label className="block text-[10px] font-bold text-rose-900 dark:text-rose-200 mb-1">
                        Doctor Name / Prescription Ref # *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Dr. K. Rahman - Ref #Rx-8391"
                        value={prescriptionRef}
                        onChange={(e) => setPrescriptionRef(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 rounded-lg text-xs outline-none font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                {hasControlledDrugs && (
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl space-y-1.5">
                    <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <ShieldAlert className="h-3.5 w-3.5" /> Controlled Substance Authorization
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" placeholder="Manager PIN/ID *" value={managerPin} onChange={(e) => setManagerPin(e.target.value)} className="px-2 py-1 bg-white dark:bg-slate-800 border border-amber-300 rounded-lg text-xs outline-none" />
                      <input type="text" placeholder="Auth Note (optional)" value={prescriptionRef} onChange={(e) => setPrescriptionRef(e.target.value)} className="px-2 py-1 bg-white dark:bg-slate-800 border border-amber-300 rounded-lg text-xs outline-none" />
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Method / Real Branch Financial Account Selector */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>Receiving Account:</span>
                  <span className="text-[10px] text-slate-400 font-normal">Credits balance immediately</span>
                </label>
                {financialAccounts.length === 0 ? (
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>No financial account found for this branch. Please create an account (Cash, bKash, Bank) in Accounts & Finance.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select value={selectedAccountId} onChange={(e) => {
                      setSelectedAccountId(e.target.value);
                      const acct = financialAccounts.find((a) => a.id === e.target.value);
                      if (acct) setPaymentMethod(acct.type || "CASH");
                    }} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none">
                      {financialAccounts.map((acct) => (
                        <option key={acct.id} value={acct.id}>
                          {acct.type === "CASH" ? "💵" : acct.type === "BKASH" ? "📱" : acct.type === "NAGAD" ? "📱" : "🏦"} {acct.name} ({acct.type}) — Bal: ৳{Number(acct.balance || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </option>
                      ))}
                    </select>

                    {/* Transaction Reference for Non-Cash Accounts */}
                    {(() => {
                      const currentAcc = financialAccounts.find((a) => a.id === selectedAccountId);
                      if (!currentAcc || currentAcc.type === "CASH") return null;
                      const isMobile = currentAcc.type === "BKASH" || currentAcc.type === "NAGAD" || currentAcc.type === "MOBILE";
                      return (
                        <input type="text" placeholder={isMobile ? "Transaction ID (e.g. TrxID / bKash Ref)" : "Bank / Card Auth Reference #"} value={isMobile ? mobileTrxId : bankTrxRef} onChange={(e) => isMobile ? setMobileTrxId(e.target.value) : setBankTrxRef(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white font-mono" />
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Financial Totals: Subtotal, VAT, Grand Total, Paid, Change/Due */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>Subtotal:</span>
                  <span>৳{subTotal.toFixed(2)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Discount:</span>
                    <span>-৳{discountAmount.toFixed(2)}</span>
                  </div>
                )}

                {/* Real VAT Amount and VAT Rate according to VAT Settings */}
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    VAT {taxPercent > 0 ? `(${taxPercent}%)` : "(0%)"}:
                    {vatSettings.isVatEnabled && (
                      <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded font-bold">Active</span>
                    )}
                  </span>
                  <span className="font-semibold">৳{taxAmount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between font-black text-sm text-slate-900 dark:text-white pt-1.5 border-t border-slate-200 dark:border-slate-700">
                  <span>Grand Total:</span>
                  <span>৳{grandTotal.toFixed(2)}</span>
                </div>

                <div className="pt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Paid Amount ৳:</span>
                  <input type="number" placeholder={`Default ৳${grandTotal.toFixed(2)}`} value={paidInput} onChange={(e) => setPaidInput(e.target.value)} className="w-28 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-right outline-none text-emerald-600" />
                </div>

                {dueAmount > 0 ? (
                  <div className="flex justify-between text-rose-600 font-bold text-xs bg-rose-50 dark:bg-rose-950/30 px-2 py-1 rounded-lg">
                    <span>Due Amount:</span>
                    <span>৳{dueAmount.toFixed(2)}</span>
                  </div>
                ) : changeAmount > 0 ? (
                  <div className="flex justify-between text-blue-600 font-bold text-xs bg-blue-50 dark:bg-blue-950/30 px-2 py-1 rounded-lg">
                    <span>Change Return:</span>
                    <span>৳{changeAmount.toFixed(2)}</span>
                  </div>
                ) : null}
              </div>

              {/* Complete Sale Button */}
              <button disabled={checkingOut || cart.length === 0 || financialAccounts.length === 0} onClick={handleCheckout} className="w-full bg-brand-primary hover:opacity-95 text-white font-black py-3 rounded-xl text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50">
                {checkingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Receipt className="h-4 w-4" /> Complete Sale & Receive ৳{numericPaid.toFixed(2)}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* History tab */
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search by receipt # or customer phone..." value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadSalesHistory()} className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white" />
            </div>
            <button onClick={loadSalesHistory} className="px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-xl">Search</button>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {loadingHistory ? <div className="p-16 flex flex-col items-center justify-center text-slate-400"><Loader2 className="h-8 w-8 animate-spin text-brand-primary mb-2" /><p>Loading...</p></div> : salesHistory.length === 0 ? <div className="p-16 text-center text-slate-400"><Receipt className="h-10 w-10 mx-auto text-slate-300 mb-3" /><p>No sales found</p></div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead><tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold text-[10px]"><th className="py-3 px-4">Receipt # & Date</th><th className="py-3 px-4">Customer</th><th className="py-3 px-4">Payment</th><th className="py-3 px-4">Total</th><th className="py-3 px-4">Status</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {salesHistory.map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4"><div className="font-mono font-bold text-slate-900 dark:text-white">{s.receiptNo}</div><div className="text-[10px] text-slate-400">{new Date(s.createdAt).toLocaleString()}</div></td>
                        <td className="py-3 px-4">{s.customerName || "Walk-in"}</td>
                        <td className="py-3 px-4"><span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold">{s.paymentMethod}</span></td>
                        <td className="py-3 px-4 font-black text-slate-900 dark:text-white">৳{Number(s.totalAmount).toFixed(2)}</td>
                        <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{s.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptModalOpen && invoiceData && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 print:border-none print:shadow-none print:p-0 print:text-black">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 print:hidden">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs"><CheckCircle2 className="h-4 w-4" /> Sale Recorded Successfully</div>
              <button onClick={() => setReceiptModalOpen(false)} className="p-1 text-slate-400"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 space-y-4 text-slate-800 dark:text-slate-200 print:text-black">
              <div className="text-center pb-3 border-b border-dashed border-slate-300 dark:border-slate-700">
                <h2 className="font-black text-base text-slate-900 dark:text-white print:text-black uppercase">{invoiceData.pharmacy?.name || "Pharmacy Ltd"}</h2>
                <p className="text-[11px] text-slate-500 print:text-black mt-0.5">{invoiceData.pharmacy?.address || "Main Branch"}</p>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-500"><span>Invoice:</span><span className="font-bold font-mono">{invoiceData.invoice?.receiptNo}</span></div>
                <div className="flex justify-between text-slate-500"><span>Customer:</span><span className="font-bold">{invoiceData.invoice?.customerName || "Walk-in"}</span></div>
                <div className="flex justify-between text-slate-500"><span>Grand Total:</span><span className="font-black">৳{Number(invoiceData.invoice?.totalAmount || 0).toFixed(2)}</span></div>
              </div>
              {invoiceData.invoice?.items?.map((item: any, idx: number) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white">{item.name}</div>
                  <div className="text-[10px] text-slate-400">
                    Batch: {item.batchNumber || "—"} | {item.inventoryLocationId ? `Location: ${item.inventoryLocationId} | ` : ""}Unit: {item.unitType} | Qty: {item.quantity} | ৳{Number(item.subTotal || item.unitPrice * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 print:hidden mt-4">
              <button onClick={() => setReceiptModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Close</button>
              <button onClick={handlePrint} className="flex items-center gap-2 bg-brand-primary text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm hover:opacity-90"><Printer className="h-4 w-4" /> Print</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
