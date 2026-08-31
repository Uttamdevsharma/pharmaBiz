"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/lib/api";
import { Product, Branch } from "@/types";
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  ShieldAlert,
  Loader2,
  AlertCircle,
  Store,
  Printer,
  Barcode,
  CheckCircle2,
  X,
  Tag,
} from "lucide-react";

interface CartItem {
  productId: string;
  name: string;
  genericName?: string | null;
  sku: string;
  size?: string | null;
  productType: string;
  unitType: string; // "TABLET", "STRIP", "BOX", "BOTTLE", "PIECE"
  unitMultiplier: number;
  quantity: number; // Selected unit count
  unitPrice: number; // Price per selected unit
  basePrice: number; // Price per lowest unit
  stripsPerBox: number;
  tabletsPerStrip: number;
  availableBaseStock: number;
  batchNumber?: string | null;
  expiryDate?: string | null;
  isControlled: boolean;
  requiresPrescription: boolean;
}

export function PosModule() {
  const { user } = useAuth();
  const [viewTab, setViewTab] = useState<"pos" | "history">("pos");

  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(user?.branchId || "");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [posCategoryFilter, setPosCategoryFilter] = useState<string>("ALL");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<"FIXED" | "PERCENT">("FIXED");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "MOBILE">("CASH");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paidInput, setPaidInput] = useState<string>("");
  const [managerPin, setManagerPin] = useState("");
  const [prescriptionRef, setPrescriptionRef] = useState("");

  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Professional Invoice Modal
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);

  // Sales History state
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");

  const isBranchLocked = Boolean(
    user?.branchId && user?.role !== "COMPANY_OWNER" && user?.role !== "SUPER_ADMIN"
  );

  // Load products with branch stock
  const loadPosProducts = async () => {
    if (!selectedBranchId) return;
    try {
      setLoading(true);
      const res = await fetchApi(`/products?branchId=${selectedBranchId}&limit=150`);
      if (res.success && res.data) {
        setProducts(res.data);
      }
    } catch (err) {
      console.error("Failed to load products for POS", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function init() {
      try {
        const bRes = await fetchApi("/branches");
        if (bRes.success && bRes.data && bRes.data.length > 0) {
          setBranches(bRes.data);
          if (user?.branchId) {
            setSelectedBranchId(user.branchId);
          } else if (!selectedBranchId) {
            setSelectedBranchId(bRes.data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to init branches", err);
      }
    }
    init();
  }, [user?.branchId]);

  useEffect(() => {
    if (selectedBranchId) {
      loadPosProducts();
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
      if (res.success && res.data) {
        setSalesHistory(res.data);
      }
    } catch (err) {
      console.error("Failed to load sales history", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Add Product to Cart with default packaging unit
  const addToCart = (p: Product) => {
    const availableStock = p.currentStock || 0;
    if (availableStock <= 0) {
      alert(`"${p.name}" has 0 stock available in this branch.`);
      return;
    }

    const existingIdx = cart.findIndex((item) => item.productId === p.id);
    if (existingIdx >= 0) {
      const existing = cart[existingIdx];
      const newQty = existing.quantity + 1;
      const totalUnits = newQty * existing.unitMultiplier;

      if (totalUnits > existing.availableBaseStock) {
        alert(`Cannot add more. Maximum available stock is ${existing.availableBaseStock} base units.`);
        return;
      }

      const updated = [...cart];
      updated[existingIdx] = { ...existing, quantity: newQty };
      setCart(updated);
    } else {
      const isMed = p.category === "Medicine" || p.categoryRef?.name === "Medicine" || p.productType === "MEDICINE";
      const defaultUnit = isMed ? "STRIP" : "PIECE";
      const strips = p.stripsPerBox || 10;
      const tabsPerStrip = p.tabletsPerStrip || 10;
      const multiplier = isMed ? tabsPerStrip : 1;
      const basePrice = Number(p.basePrice);
      const unitPrice = basePrice * multiplier;

      // Find nearest batch expiry if available
      const nearestBatch = (p as any).batches && (p as any).batches[0];

      setCart([
        ...cart,
        {
          productId: p.id,
          name: p.name,
          genericName: p.genericName || null,
          sku: p.sku,
          size: p.size,
          productType: p.productType || p.category || "MEDICINE",
          unitType: defaultUnit,
          unitMultiplier: multiplier,
          quantity: 1,
          unitPrice,
          basePrice,
          stripsPerBox: strips,
          tabletsPerStrip: tabsPerStrip,
          availableBaseStock: availableStock,
          batchNumber: nearestBatch?.batchNumber || null,
          expiryDate: nearestBatch?.expiryDate || null,
          isControlled: p.isControlled,
          requiresPrescription: p.requiresPrescription,
        },
      ]);
    }
  };

  // Change Unit Type (e.g. from Tablet to Strip or Box)
  const handleUnitChange = (productId: string, newUnit: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;

        let multiplier = 1;
        if (newUnit === "BOX") {
          multiplier = item.stripsPerBox * item.tabletsPerStrip;
        } else if (newUnit === "STRIP") {
          multiplier = item.tabletsPerStrip;
        } else if (newUnit === "TABLET" || newUnit === "PIECE" || newUnit === "BOTTLE") {
          multiplier = 1;
        }

        const unitPrice = item.basePrice * multiplier;
        return {
          ...item,
          unitType: newUnit,
          unitMultiplier: multiplier,
          unitPrice,
        };
      })
    );
  };

  // Update Cart Quantity
  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(cart.filter((item) => item.productId !== productId));
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        const totalUnits = newQuantity * item.unitMultiplier;
        if (totalUnits > item.availableBaseStock) {
          alert(`Insufficient stock. Maximum available is ${item.availableBaseStock} base units.`);
          return item;
        }
        return { ...item, quantity: newQuantity };
      })
    );
  };

  // Category, Barcode, Name, Generic filter
  const filteredProducts = products.filter((p) => {
    if (posCategoryFilter !== "ALL") {
      const cat = p.categoryRef?.name || p.category || "Medicine";
      if (!cat.toLowerCase().includes(posCategoryFilter.toLowerCase())) {
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
      p.subcategory?.toLowerCase().includes(s) ||
      p.subcategoryRef?.name.toLowerCase().includes(s)
    );
  });

  // Calculate Subtotal, Discounts, Tax, and Grand Total
  const subTotal = cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);

  let discountAmount = 0;
  if (discountValue > 0) {
    if (discountType === "PERCENT") {
      discountAmount = Math.round((subTotal * (discountValue / 100)) * 100) / 100;
    } else {
      discountAmount = Number(discountValue);
    }
  }

  const taxAmount = taxPercent > 0 ? Math.round((subTotal * (taxPercent / 100)) * 100) / 100 : 0;
  const grandTotal = Math.max(0, subTotal - discountAmount + taxAmount);

  const numericPaid = paidInput !== "" ? parseFloat(paidInput) || 0 : grandTotal;
  const dueAmount = Math.max(0, grandTotal - numericPaid);
  const changeAmount = Math.max(0, numericPaid - grandTotal);

  const hasControlledDrugs = cart.some((i) => i.isControlled || i.requiresPrescription);

  // Execute POS Checkout
  const handleCheckout = async () => {
    if (cart.length === 0 || !selectedBranchId) return;
    if (hasControlledDrugs && !managerPin.trim()) {
      setError("Controlled/Prescription drugs require manager approval or prescription reference.");
      return;
    }

    try {
      setCheckingOut(true);
      setError(null);

      const payload = {
        branchId: selectedBranchId,
        customerName: customerName.trim() || "Walk-in Customer",
        customerPhone: customerPhone.trim() || null,
        paymentMethod,
        discount: discountValue,
        discountType,
        tax: taxAmount,
        paidAmount: numericPaid,
        prescriptionRef: prescriptionRef.trim() || null,
        managerApprovedBy: managerPin.trim() || null,
        items: cart.map((item) => ({
          productId: item.productId,
          unitType: item.unitType,
          unitMultiplier: item.unitMultiplier,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      };

      const res = await fetchApi("/sales", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.success) throw new Error(res.message || "Failed to process sale");

      // Fetch printable invoice payload
      const receiptRes = await fetchApi(`/sales/${res.data.id}/receipt`);
      if (receiptRes.success && receiptRes.data) {
        setInvoiceData(receiptRes.data);
      } else {
        setInvoiceData({
          pharmacy: { name: "Pharmacy Store", address: "Main Branch", phone: "—" },
          invoice: { ...res.data, items: cart },
        });
      }

      setReceiptModalOpen(true);
      // Reset Cart
      setCart([]);
      setPaidInput("");
      setDiscountValue(0);
      setManagerPin("");
      setPrescriptionRef("");
      loadPosProducts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCheckingOut(false);
    }
  };

  // View Receipt Modal from history
  const handleViewHistoricalReceipt = async (saleId: string) => {
    try {
      const res = await fetchApi(`/sales/${saleId}/receipt`);
      if (res.success && res.data) {
        setInvoiceData(res.data);
        setReceiptModalOpen(true);
      }
    } catch (err) {
      console.error("Failed to load historical receipt", err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 text-brand-primary" />
              Counter POS & Sales Terminal
            </h1>
            <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
              Live FEFO Deduction
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Barcode scanning, Box/Strip/Tablet multi-unit selling, automated stock deduction, and tax invoices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Tab Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setViewTab("pos")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewTab === "pos"
                  ? "bg-white dark:bg-slate-900 text-brand-primary shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Active POS
            </button>
            <button
              onClick={() => setViewTab("history")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewTab === "history"
                  ? "bg-white dark:bg-slate-900 text-brand-primary shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Sales History & Receipts
            </button>
          </div>

          {/* Branch Selector */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl">
            <Store className="h-4 w-4 text-slate-400" />
            <select
              disabled={isBranchLocked}
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none disabled:opacity-60"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {viewTab === "pos" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT 7 COLS: PRODUCT SEARCH & GRID */}
          <div className="lg:col-span-7 space-y-4">
            {/* Search Input & Category Pills */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Scan barcode or search by brand name, generic name, subcategory..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white font-medium"
                />
              </div>

              {/* Fast 1-Click Category Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {[
                  { id: "ALL", label: "All Items" },
                  { id: "Medicine", label: "💊 Medicine" },
                  { id: "Syrup", label: "💧 Syrup" },
                  { id: "Medical Equipment", label: "🩺 Equipment" },
                  { id: "Saline", label: "💉 Saline / IV" },
                  { id: "Other", label: "📦 Other Health" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setPosCategoryFilter(tab.id)}
                    className={`px-3 py-1 rounded-xl text-[11px] font-bold transition ${
                      posCategoryFilter === tab.id
                        ? "bg-brand-primary text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Cards Grid */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 min-h-[420px]">
              {loading ? (
                <div className="p-16 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-primary mb-2" />
                  <p className="text-xs">Loading available catalog & branch stock...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-16 text-center text-slate-400">
                  <Barcode className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No products matched</p>
                  <p className="text-xs mt-1">Try another keyword or scan a valid barcode.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[560px] overflow-y-auto pr-1">
                  {filteredProducts.map((p) => {
                    const stock = p.currentStock || 0;
                    const inStock = stock > 0;
                    return (
                      <div
                        key={p.id}
                        onClick={() => inStock && addToCart(p)}
                        className={`p-3.5 rounded-2xl border transition text-left flex flex-col justify-between ${
                          inStock
                            ? "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 hover:border-brand-primary hover:shadow-md cursor-pointer"
                            : "bg-slate-50 dark:bg-slate-800/20 border-slate-200/50 dark:border-slate-800 opacity-60 cursor-not-allowed"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-black text-xs text-slate-900 dark:text-white leading-tight">
                              {p.name}
                            </div>
                            {p.size && (
                              <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0">
                                {p.size}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {p.genericName ? (
                              <span className="font-semibold text-brand-primary">
                                {p.genericName} •{" "}
                              </span>
                            ) : null}
                            {p.brandName || p.manufacturer || "Generic"}
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                          <div>
                            <span className="text-sm font-black text-slate-900 dark:text-white">
                              ৳{Number(p.basePrice).toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-400"> / {p.unit}</span>
                          </div>

                          <div className="text-right">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                inStock
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                                  : "bg-rose-50 text-rose-600 dark:bg-rose-950/50"
                              }`}
                            >
                              {inStock ? `${stock} ${p.unit}s` : "Out of Stock"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT 5 COLS: ACTIVE CART & CHECKOUT */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-brand-primary" />
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Active Cart ({cart.length})
                  </h3>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-[11px] text-rose-500 hover:underline font-bold"
                  >
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

              {/* Cart Item List */}
              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <ShoppingCart className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-xs font-bold">Cart is currently empty</p>
                  <p className="text-[10px] mt-0.5">Click products from the catalog to add to bill.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 divide-y divide-slate-100 dark:divide-slate-800">
                  {cart.map((item) => (
                    <div key={item.productId} className="pt-2.5 first:pt-0 space-y-1.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-xs text-slate-900 dark:text-white">
                            {item.name} {item.size ? `(${item.size})` : ""}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {item.genericName ? `${item.genericName} • ` : ""}Base: ৳{item.basePrice.toFixed(2)} • Stock: {item.availableBaseStock}
                          </div>
                        </div>
                        <button
                          onClick={() => updateQuantity(item.productId, 0)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Multi-Unit Selector (Box, Strip, Tablet, etc.) */}
                      <div className="flex items-center justify-between gap-2">
                        {item.productType === "MEDICINE" ? (
                          <select
                            value={item.unitType}
                            onChange={(e) => handleUnitChange(item.productId, e.target.value)}
                            className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 outline-none"
                          >
                            <option value="STRIP">Strip ({item.tabletsPerStrip} tabs)</option>
                            <option value="BOX">
                              Box ({item.stripsPerBox * item.tabletsPerStrip} tabs)
                            </option>
                            <option value="TABLET">Tablet (1 tab)</option>
                          </select>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {item.unitType}
                          </span>
                        )}

                        {/* Quantity Counter */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-7 text-center font-black text-xs text-slate-900 dark:text-white font-mono">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <div className="font-black text-xs text-slate-900 dark:text-white text-right">
                          ৳{(item.unitPrice * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Customer Details */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Customer Name (optional)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Phone (for history/loyalty)"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white font-mono"
                  />
                </div>

                {hasControlledDrugs && (
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl space-y-1.5">
                    <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Prescription / Controlled Substance Authorization
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Manager PIN / ID *"
                        value={managerPin}
                        onChange={(e) => setManagerPin(e.target.value)}
                        className="px-2 py-1 bg-white dark:bg-slate-800 border border-amber-300 rounded-lg text-xs outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Prescription Ref #"
                        value={prescriptionRef}
                        onChange={(e) => setPrescriptionRef(e.target.value)}
                        className="px-2 py-1 bg-white dark:bg-slate-800 border border-amber-300 rounded-lg text-xs outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Discount & Payment Method */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5 text-slate-400" />
                    Discount:
                  </div>
                  <div className="flex items-center gap-1">
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as any)}
                      className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] outline-none"
                    >
                      <option value="FIXED">৳ Fixed</option>
                      <option value="PERCENT">% Percent</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                      className="w-16 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-right outline-none"
                    />
                  </div>
                </div>

                {/* Payment Methods */}
                <div>
                  <div className="text-[11px] font-bold text-slate-500 mb-1.5">Payment Mode</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "CASH", label: "Cash", icon: Banknote },
                      { id: "CARD", label: "Card / POS", icon: CreditCard },
                      { id: "MOBILE", label: "bKash / Nagad", icon: Smartphone },
                    ].map((m) => {
                      const Icon = m.icon;
                      const active = paymentMethod === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethod(m.id as any)}
                          className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                            active
                              ? "border-brand-primary bg-brand-primary/10 text-brand-primary font-bold"
                              : "border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="text-[10px]">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Paid & Due / Change Calculation */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span>৳{subTotal.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Discount ({discountType === "PERCENT" ? `${discountValue}%` : "Fixed"}):</span>
                      <span>-৳{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-sm text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span>Grand Total:</span>
                    <span>৳{grandTotal.toFixed(2)}</span>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Paid Amount ৳:
                    </span>
                    <input
                      type="number"
                      placeholder={`Default ৳${grandTotal.toFixed(2)}`}
                      value={paidInput}
                      onChange={(e) => setPaidInput(e.target.value)}
                      className="w-24 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-right outline-none text-emerald-600"
                    />
                  </div>

                  {dueAmount > 0 ? (
                    <div className="flex justify-between text-rose-600 font-bold text-xs">
                      <span>Due Balance:</span>
                      <span>৳{dueAmount.toFixed(2)}</span>
                    </div>
                  ) : changeAmount > 0 ? (
                    <div className="flex justify-between text-blue-600 font-bold text-xs">
                      <span>Change to Return:</span>
                      <span>৳{changeAmount.toFixed(2)}</span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Checkout Button */}
              <button
                type="button"
                disabled={checkingOut || cart.length === 0}
                onClick={handleCheckout}
                className="w-full bg-brand-primary hover:opacity-95 text-white font-black py-3 rounded-xl text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {checkingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Receipt className="h-4 w-4" />
                    Complete Sale & Print Tax Invoice (৳{grandTotal.toFixed(2)})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ================= TAB: SALES HISTORY ================= */
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by invoice receipt # or customer phone..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadSalesHistory()}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
              />
            </div>
            <button
              onClick={loadSalesHistory}
              className="px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-xl"
            >
              Search
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {loadingHistory ? (
              <div className="p-16 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-brand-primary mb-2" />
                <p className="text-xs">Loading sales history ledger...</p>
              </div>
            ) : salesHistory.length === 0 ? (
              <div className="p-16 text-center text-slate-400">
                <Receipt className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No sales transactions found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                      <th className="py-3 px-4">Receipt # & Date</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Payment</th>
                      <th className="py-3 px-4">Total Amount</th>
                      <th className="py-3 px-4">Paid / Due</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                    {salesHistory.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-slate-900 dark:text-white">
                            {s.receiptNo}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(s.createdAt).toLocaleString()} • By {s.user?.name || "Staff"}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {s.customerName || "Walk-in Customer"}
                          </div>
                          {s.customerPhone && (
                            <div className="text-[10px] text-slate-400 font-mono">{s.customerPhone}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold">
                            {s.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-black text-slate-900 dark:text-white">
                          ৳{Number(s.totalAmount).toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-emerald-600 font-bold">৳{Number(s.paidAmount).toFixed(2)}</div>
                          {Number(s.dueAmount) > 0 && (
                            <div className="text-[10px] text-rose-500 font-bold">
                              Due: ৳{Number(s.dueAmount).toFixed(2)}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              s.status === "COMPLETED"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40"
                                : s.status === "REFUNDED"
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40"
                                : "bg-rose-50 text-rose-700 dark:bg-rose-950/40"
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleViewHistoricalReceipt(s.id)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold flex items-center gap-1 ml-auto"
                          >
                            <Printer className="h-3 w-3" />
                            Receipt
                          </button>
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

      {/* ================= PROFESSIONAL INVOICE MODAL ================= */}
      {receiptModalOpen && invoiceData && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 print:border-none print:shadow-none print:p-0 print:text-black">
            {/* Modal Header (Hidden during browser print) */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 print:hidden">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                <CheckCircle2 className="h-4 w-4" />
                Sale Recorded Successfully
              </div>
              <button onClick={() => setReceiptModalOpen(false)} className="p-1 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Printable Receipt Body */}
            <div id="printable-invoice" className="mt-4 space-y-4 text-slate-800 dark:text-slate-200 print:text-black">
              {/* Pharmacy Header */}
              <div className="text-center pb-3 border-b border-dashed border-slate-300 dark:border-slate-700">
                <h2 className="font-black text-base text-slate-900 dark:text-white print:text-black uppercase tracking-wide">
                  {invoiceData.pharmacy?.name || "Pharmacy Ltd"}
                </h2>
                <p className="text-[11px] text-slate-500 print:text-black mt-0.5">
                  {invoiceData.pharmacy?.address || "Main Branch"}
                </p>
                <p className="text-[10px] text-slate-400 print:text-black">
                  Phone: {invoiceData.pharmacy?.phone || "—"} • VAT Reg: 12093849-01
                </p>
              </div>

              {/* Invoice Meta */}
              <div className="grid grid-cols-2 text-[11px] gap-1.5 py-1">
                <div>
                  <span className="text-slate-400">Invoice No: </span>
                  <span className="font-bold font-mono text-slate-900 dark:text-white print:text-black">
                    {invoiceData.invoice?.receiptNo}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400">Date: </span>
                  <span className="font-bold font-mono">
                    {new Date(invoiceData.invoice?.date || Date.now()).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Customer: </span>
                  <span className="font-bold">{invoiceData.invoice?.customerName || "Walk-in"}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400">Cashier: </span>
                  <span className="font-bold">{invoiceData.invoice?.cashier || "Counter 1"}</span>
                </div>
              </div>

              {/* Itemized Table with Batch Info */}
              <div className="border-t border-b border-dashed border-slate-300 dark:border-slate-700 py-2">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="text-slate-400 uppercase font-bold text-[9px] border-b border-slate-100 dark:border-slate-800 pb-1">
                      <th className="pb-1">Item / Batch</th>
                      <th className="pb-1 text-center">Unit</th>
                      <th className="pb-1 text-center">Qty</th>
                      <th className="pb-1 text-right">Price</th>
                      <th className="pb-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {invoiceData.invoice?.items?.map((item: any, idx: number) => (
                      <tr key={idx} className="py-1">
                        <td className="py-1.5">
                          <div className="font-bold text-slate-900 dark:text-white print:text-black">
                            {item.name} {item.size ? `(${item.size})` : ""}
                          </div>
                          {item.batchNumber && (
                            <div className="text-[9px] text-slate-400 font-mono">
                              Batch: {item.batchNumber} {item.expiryDate ? `• Exp: ${item.expiryDate}` : ""}
                            </div>
                          )}
                        </td>
                        <td className="py-1.5 text-center text-slate-500">{item.unitType || "Piece"}</td>
                        <td className="py-1.5 text-center font-bold">{item.quantity}</td>
                        <td className="py-1.5 text-right font-mono">৳{Number(item.unitPrice).toFixed(2)}</td>
                        <td className="py-1.5 text-right font-bold font-mono">
                          ৳{Number(item.subTotal || item.unitPrice * item.quantity).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Financials */}
              <div className="space-y-1 text-xs pt-1">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span className="font-mono">৳{Number(invoiceData.invoice?.subTotal || 0).toFixed(2)}</span>
                </div>
                {Number(invoiceData.invoice?.discount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Discount:</span>
                    <span className="font-mono">-৳{Number(invoiceData.invoice?.discount).toFixed(2)}</span>
                  </div>
                )}
                {Number(invoiceData.invoice?.tax || 0) > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>VAT / Tax:</span>
                    <span className="font-mono">+৳{Number(invoiceData.invoice?.tax).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white print:text-black pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Grand Total:</span>
                  <span className="font-mono font-black">
                    ৳{Number(invoiceData.invoice?.totalAmount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 pt-1">
                  <span>Paid ({invoiceData.invoice?.paymentMethod || "CASH"}):</span>
                  <span className="font-bold font-mono">
                    ৳{Number(invoiceData.invoice?.paidAmount || 0).toFixed(2)}
                  </span>
                </div>
                {Number(invoiceData.invoice?.dueAmount || 0) > 0 ? (
                  <div className="flex justify-between text-rose-600 font-bold">
                    <span>Due Balance:</span>
                    <span className="font-mono">
                      ৳{Number(invoiceData.invoice?.dueAmount).toFixed(2)}
                    </span>
                  </div>
                ) : Number(invoiceData.invoice?.changeAmount || 0) > 0 ? (
                  <div className="flex justify-between text-blue-600 font-bold">
                    <span>Change Returned:</span>
                    <span className="font-mono">
                      ৳{Number(invoiceData.invoice?.changeAmount).toFixed(2)}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="text-center pt-3 border-t border-dashed border-slate-300 dark:border-slate-700 text-[10px] text-slate-400">
                <p>Thank you for choosing {invoiceData.pharmacy?.name}!</p>
                <p className="mt-0.5">Please consult a doctor for prescription medication.</p>
              </div>
            </div>

            {/* Actions: Print and Close (Hidden in Print) */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 print:hidden mt-4">
              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 bg-brand-primary text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm hover:opacity-90"
              >
                <Printer className="h-4 w-4" />
                Print Invoice Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
