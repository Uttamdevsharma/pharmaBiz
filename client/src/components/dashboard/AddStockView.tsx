"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Product, Supplier, Branch } from "@/types";
import { useAuth } from "@/context/AuthContext";
import {
  PackagePlus,
  ArrowLeft,
  Barcode,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Store,
  Layers,
  DollarSign,
  Calendar,
} from "lucide-react";

interface AddStockViewProps {
  onNavigate: (module: any) => void;
}

export function AddStockView({ onNavigate }: AddStockViewProps) {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(user?.branchId || "");
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [financialAccounts, setFinancialAccounts] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    productId: "",
    supplierId: "",
    batchNumber: `BAT-${Date.now().toString().slice(-6)}`,
    barcode: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
    mfgDate: new Date().toISOString().slice(0, 10),
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 2).toISOString().slice(0, 10),
    packageType: "MEDICINE",
    boxQuantity: 10,
    stripsPerBox: 10,
    tabletsPerStrip: 10,
    quantity: 1000,
    unitPurchasePrice: 1.5,
    unitSellingPrice: 2.5,
    paidAmount: 1500,
    financialAccountId: "",
    shelfLocation: "Rack A-1",
    notes: "Direct distributor shipment",
  });

  const isBranchLocked = Boolean(
    user?.branchId && user?.role !== "COMPANY_OWNER" && user?.role !== "SUPER_ADMIN"
  );

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [bRes, pRes, sRes] = await Promise.all([
          fetchApi("/branches"),
          fetchApi("/products?limit=150"),
          fetchApi("/suppliers"),
        ]);

        if (bRes.success && bRes.data && bRes.data.length > 0) {
          setBranches(bRes.data);
          if (!selectedBranchId) {
            setSelectedBranchId(user?.branchId || bRes.data[0].id);
          }
        }
        if (pRes.success && pRes.data) {
          setProducts(pRes.data);
          if (pRes.data.length > 0) {
            handleSelectProduct(pRes.data[0]);
          }
        }
        if (sRes.success && sRes.data) {
          setSuppliers(sRes.data);
          if (sRes.data.length > 0) {
            setFormData((prev) => ({ ...prev, supplierId: sRes.data[0].id }));
          }
        }
      } catch (err) {
        console.error("Failed to load inward setup data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  useEffect(() => {
    async function loadBranchAccounts() {
      if (!selectedBranchId) return;
      try {
        const res = await fetchApi<any>(`/accounting/accounts?branchId=${selectedBranchId}`);
        if (res.success && res.data) {
          setFinancialAccounts(res.data);
          if (res.data.length > 0) {
            setFormData((prev) => ({ ...prev, financialAccountId: res.data[0].id }));
          } else {
            setFormData((prev) => ({ ...prev, financialAccountId: "" }));
          }
        }
      } catch (err) {
        console.error("Failed to load branch financial accounts", err);
      }
    }
    loadBranchAccounts();
  }, [selectedBranchId]);

  const handleSelectProduct = (prod: Product) => {
    setSelectedProduct(prod);

    const isMed =
      prod.category === "Medicine" ||
      prod.categoryRef?.name === "Medicine" ||
      prod.productType === "MEDICINE";
    const strips = prod.stripsPerBox || 10;
    const tablets = prod.tabletsPerStrip || 10;
    const boxQty = 10;
    const totalUnits = isMed ? boxQty * strips * tablets : 100;

    const basePrice = Number(prod.basePrice) || 2.5;
    const purchasePrice = Math.round(basePrice * 0.7 * 100) / 100;
    const totalCost = Math.round(totalUnits * purchasePrice * 100) / 100;

    setFormData((prev) => ({
      ...prev,
      productId: prod.id,
      barcode: prod.barcode || prev.barcode,
      packageType: prod.category || prod.categoryRef?.name || "Medicine",
      boxQuantity: boxQty,
      stripsPerBox: strips,
      tabletsPerStrip: tablets,
      quantity: totalUnits,
      unitPurchasePrice: purchasePrice,
      unitSellingPrice: basePrice,
      paidAmount: totalCost,
      shelfLocation: prod.shelfLocation || "Rack A-1",
    }));
  };

  const handleHierarchyChange = (boxQty: number, strips: number, tabs: number) => {
    const total = boxQty * strips * tabs;
    setFormData((prev) => ({
      ...prev,
      boxQuantity: boxQty,
      stripsPerBox: strips,
      tabletsPerStrip: tabs,
      quantity: total,
      paidAmount: Math.round(total * prev.unitPurchasePrice * 100) / 100,
    }));
  };

  const handlePriceChange = (purchasePrice: number, totalUnits: number) => {
    setFormData((prev) => ({
      ...prev,
      unitPurchasePrice: purchasePrice,
      paidAmount: Math.round(totalUnits * purchasePrice * 100) / 100,
    }));
  };

  const handleInwardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId || !formData.productId) {
      setError("Please select both a target branch and catalog product");
      return;
    }

    if (Number(formData.paidAmount || 0) > 0 && !formData.financialAccountId) {
      setError("A valid financial account for the selected branch is required when making a payment to a supplier.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(false);

      const isMedicine =
        formData.packageType?.toLowerCase() === "medicine" ||
        formData.packageType === "MEDICINE";

      const payload = {
        branchId: selectedBranchId,
        productId: formData.productId,
        supplierId: formData.supplierId || null,
        batchNumber: formData.batchNumber?.trim() || null,
        barcode: formData.barcode?.trim() || null,
        mfgDate: formData.mfgDate ? new Date(formData.mfgDate).toISOString() : null,
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : null,
        packageType: formData.packageType || "Medicine",
        boxQuantity: isMedicine ? Number(formData.boxQuantity) || null : null,
        stripsPerBox: isMedicine ? Number(formData.stripsPerBox) || null : null,
        tabletsPerStrip: isMedicine ? Number(formData.tabletsPerStrip) || null : null,
        quantity: Number(formData.quantity),
        purchasePrice: Number(formData.unitPurchasePrice),
        sellingPrice: Number(formData.unitSellingPrice),
        paidAmount: Number(formData.paidAmount || 0),
        financialAccountId: Number(formData.paidAmount || 0) > 0 ? formData.financialAccountId || null : null,
        shelfLocation: formData.shelfLocation || null,
        notes: formData.notes || null,
      };

      const res = await fetchApi("/inventory/inward", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.success) {
        const errorDetail = res.errors?.length
          ? res.errors.map((e: any) => `${e.field}: ${e.message}`).join("; ")
          : res.message || "Failed to record stock inward";
        throw new Error(errorDetail);
      }

      setSuccess(true);
      setTimeout(() => {
        onNavigate("stock_stock_list");
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to record stock intake");
    } finally {
      setSubmitting(false);
    }
  };

  const totalCost = Math.round(formData.quantity * formData.unitPurchasePrice * 100) / 100;
  const dueAmount = Math.max(0, Math.round((totalCost - formData.paidAmount) * 100) / 100);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Stock Management</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Add Stock (Inward Batch)</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <PackagePlus className="h-6 w-6 text-brand-primary" />
            Inward Stock & Batch Intake
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Receive inventory shipments from distributors, generate batch numbers, track expiry dates, and update branch stock.
          </p>
        </div>

        {/* Branch Selector */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-xl">
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

      {/* Success Notification */}
      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <div className="font-bold text-xs text-emerald-900 dark:text-emerald-200">
              Stock Inward Recorded Successfully!
            </div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
              Inventory batches updated. Redirecting to Stock List...
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-center gap-3 text-rose-700 dark:text-rose-300 text-xs">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Inward Form */}
      <form onSubmit={handleInwardSubmit} className="space-y-6">
        {/* Step 1: Select Catalog Product */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Layers className="h-4 w-4 text-brand-primary" />
            1. Select Catalog Product
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Product from Central Catalog *
            </label>
            <select
              required
              value={formData.productId}
              onChange={(e) => {
                const prod = products.find((p) => p.id === e.target.value);
                if (prod) handleSelectProduct(prod);
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none font-bold"
            >
              <option value="">-- Choose Product from Catalog --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.size ? `(${p.size})` : ""} {p.genericName ? `[${p.genericName}]` : ""} - {p.brandName || "Generic"} [{p.category || p.categoryRef?.name || "Medicine"}]
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="p-3.5 bg-brand-primary/5 dark:bg-brand-primary/10 border border-brand-primary/20 rounded-xl text-xs flex flex-wrap gap-4 text-slate-700 dark:text-slate-300">
              <div>
                <span className="text-slate-400">Generic: </span>
                <span className="font-bold text-brand-primary">
                  {selectedProduct.genericName || "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Strength: </span>
                <span className="font-bold">{selectedProduct.size || "Standard"}</span>
              </div>
              <div>
                <span className="text-slate-400">Unit: </span>
                <span className="font-bold">{selectedProduct.unit}</span>
              </div>
              <div>
                <span className="text-slate-400">Base Catalog Price: </span>
                <span className="font-bold font-mono">৳{Number(selectedProduct.basePrice).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Batch Number, Expiry & Supplier */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Calendar className="h-4 w-4 text-brand-primary" />
            2. Batch Number, Expiry Date & Supplier
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Batch Number *</span>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      batchNumber: `BAT-${Date.now().toString().slice(-6)}`,
                    })
                  }
                  className="text-[11px] text-brand-primary hover:underline font-bold"
                >
                  Auto Batch No
                </button>
              </label>
              <input
                type="text"
                required
                value={formData.batchNumber}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Company / Supplier *
              </label>
              <select
                required
                value={formData.supplierId}
                onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
              >
                <option value="">-- Choose Company / Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.contactPerson ? ` (${s.contactPerson})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Manufacturing Date
              </label>
              <input
                type="date"
                value={formData.mfgDate}
                onChange={(e) => setFormData({ ...formData, mfgDate: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Expiry Date (FEFO Mandatory) *
              </label>
              <input
                type="date"
                required
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none font-bold text-brand-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Barcode
              </label>
              <div className="relative">
                <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Packaging Quantity Hierarchy */}
        {(formData.packageType === "Medicine" || formData.packageType === "MEDICINE") ? (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="font-black text-sm text-slate-900 dark:text-white flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-brand-primary" />
                3. Medicine Packaging Multipliers & Quantity
              </span>
              <span className="text-xs font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full">
                Total Units: {formData.quantity} Tablets
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Boxes Received *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.boxQuantity}
                  onChange={(e) => {
                    const b = parseInt(e.target.value) || 0;
                    handleHierarchyChange(b, formData.stripsPerBox, formData.tabletsPerStrip);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Strips per Box
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.stripsPerBox}
                  onChange={(e) => {
                    const s = parseInt(e.target.value) || 1;
                    handleHierarchyChange(formData.boxQuantity, s, formData.tabletsPerStrip);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tablets per Strip
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.tabletsPerStrip}
                  onChange={(e) => {
                    const t = parseInt(e.target.value) || 1;
                    handleHierarchyChange(formData.boxQuantity, formData.stripsPerBox, t);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Layers className="h-4 w-4 text-brand-primary" />
              3. Intake Quantity
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Total Quantity Received *
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.quantity}
                onChange={(e) => {
                  const q = parseInt(e.target.value) || 1;
                  setFormData((prev) => ({
                    ...prev,
                    quantity: q,
                    paidAmount: Math.round(q * prev.unitPurchasePrice * 100) / 100,
                  }));
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
              />
            </div>
          </div>
        )}

        {/* Step 4: Purchase Financials & Selling Price */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="font-black text-sm text-slate-900 dark:text-white flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-brand-primary" />
              4. Financials & Supplier Payable
            </span>
            <div className="text-xs">
              <span className="text-slate-400">Total Purchase: </span>
              <span className="font-black font-mono text-slate-900 dark:text-white">৳{totalCost.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Purchase Price per Lowest Unit *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.unitPurchasePrice}
                onChange={(e) => {
                  const p = parseFloat(e.target.value) || 0;
                  handlePriceChange(p, formData.quantity);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Selling Price per Lowest Unit *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.unitSellingPrice}
                onChange={(e) =>
                  setFormData({ ...formData, unitSellingPrice: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Amount Paid to Supplier Now (৳)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.paidAmount}
                onChange={(e) =>
                  setFormData({ ...formData, paidAmount: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
              />
              {dueAmount > 0 && (
                <div className="text-[10px] text-rose-500 font-bold mt-1">
                  Supplier Due: ৳{dueAmount.toFixed(2)}
                </div>
              )}
            </div>
          </div>

          {formData.paidAmount > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Select Branch Payment Account (Debited) *
              </label>
              {financialAccounts.length === 0 ? (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-bold">
                  ⚠️ No active financial account created for this branch. Please create an account in Accounts & Finance first before completing supplier payments.
                </div>
              ) : (
                <select
                  required
                  value={formData.financialAccountId}
                  onChange={(e) => setFormData({ ...formData, financialAccountId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                >
                  {financialAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type}){acc.accountNumber ? ` - A/C: ${acc.accountNumber}` : ""} [Balance: ৳{Number(acc.balance).toFixed(2)}]
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Submit Action */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => onNavigate("stock_stock_list")}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Recording Intake...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Record Stock Inward
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
