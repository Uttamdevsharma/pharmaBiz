"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { fetchApi } from "@/lib/api";
import { Product, Supplier, Branch, SupplierContact } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { showAlert } from "@/lib/swal";
import {
  Search,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Building,
  User,
  ArrowLeft,
  CreditCard,
  FileText,
  Boxes,
  Package,
  X,
  Store,
  Clock,
  Pill,
  Droplets,
  Syringe,
} from "lucide-react";

interface AddStockViewProps {
  onNavigate: (module: any) => void;
}

export type PackagingModel = "TABLET" | "BOTTLE" | "PIECE" | "VIAL";

export const getPackagingModel = (prod?: Product | null, packageType?: string): PackagingModel => {
  if (!prod && !packageType) return "TABLET";
  const unit = (prod?.unit || "").toLowerCase();
  const packType = (prod?.defaultPackType || "").toUpperCase();
  const pType = (prod?.productType || "").toUpperCase();
  const cat = (prod?.category || "").toLowerCase();
  const name = (prod?.name || "").toLowerCase();
  const generic = (prod?.genericName || "").toLowerCase();

  // 1. Bottle checks (Syrups, Suspensions, Drops, Tonics)
  if (
    packType === "BOTTLE" ||
    packageType === "BOTTLE" ||
    unit === "bottle" ||
    pType === "SYRUP" ||
    cat.includes("syrup") ||
    cat.includes("liquid") ||
    cat.includes("suspension") ||
    cat.includes("drop") ||
    cat.includes("tonic")
  ) {
    return "BOTTLE";
  }

  // 2. Vial / Injection checks
  if (
    packType === "VIAL" ||
    packageType === "VIAL" ||
    unit === "vial" ||
    unit === "ampoule" ||
    pType === "SALINE" ||
    cat.includes("inject") ||
    cat.includes("vial") ||
    cat.includes("ampoule") ||
    cat.includes("saline") ||
    cat.includes("infusion") ||
    name.includes("injection") ||
    name.includes("vial") ||
    name.includes("ampoule") ||
    generic.includes("injection") ||
    generic.includes("vial")
  ) {
    return "VIAL";
  }

  // 3. Piece / Unit checks (Diaper, Syringe, Bandage, Equipment, Surgical)
  if (
    packType === "PIECE" ||
    packageType === "PIECE" ||
    unit === "piece" ||
    unit === "pack" ||
    unit === "unit" ||
    unit === "pcs" ||
    pType === "EQUIPMENT" ||
    cat.includes("diaper") ||
    cat.includes("equip") ||
    cat.includes("device") ||
    cat.includes("care") ||
    cat.includes("surgical") ||
    cat.includes("hygiene") ||
    name.includes("diaper") ||
    generic.includes("diaper") ||
    name.includes("syringe") ||
    generic.includes("syringe") ||
    name.includes("bandage") ||
    generic.includes("bandage")
  ) {
    return "PIECE";
  }

  return "TABLET";
};

export interface StockLineItem {
  id: string;
  productId: string;
  product: Product;
  packagingModel: PackagingModel;
  currentStock: number;

  // Packaging hierarchy config
  boxesPerCarton: number;
  stripsPerBox: number;
  tabletsPerStrip: number;

  // Stock In Mode
  receivingMode: "CARTON" | "BOX" | "BOTTLE" | "PIECE" | "PACK" | "VIAL";

  // Quantity entered
  enteredQuantity: number;

  // Calculated totals
  totalBoxesOrPacks: number;
  totalLowestUnits: number;

  // Pricing
  unitCostBeforeDiscount: number;
  discountPercent: number;
  unitCostBeforeTax: number;
  lineTotal: number;
  unitSellingPrice: number;

  // Lowest unit prices
  lowestUnitCost: number;
  lowestUnitSelling: number;

  // Metadata
  lotNumber: string;
  mfgDate: string;
  expiryDate: string;
  shelfLocation: string;
}

export function AddStockView({ onNavigate }: AddStockViewProps) {
  const { user } = useAuth();

  // Basic Setup Data
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(user?.branchId || "");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [supplierContacts, setSupplierContacts] = useState<SupplierContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [financialAccounts, setFinancialAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  const [invoiceNo, setInvoiceNo] = useState<string>(`INV-${Date.now().toString().slice(-6)}`);
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Search & Products
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Table Line Items
  const [lineItems, setLineItems] = useState<StockLineItem[]>([]);

  // Invoice-Level Discount & Tax
  const [discountType, setDiscountType] = useState<"NONE" | "FIXED" | "PERCENT">("NONE");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [purchaseTaxOption, setPurchaseTaxOption] = useState<string>("NONE");
  const [customTaxPercent, setCustomTaxPercent] = useState<number>(0);
  const [additionalNotes, setAdditionalNotes] = useState<string>("");

  // Payment Section
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paidOnDate, setPaidOnDate] = useState<string>(
    new Date().toISOString().slice(0, 16)
  );
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [paymentNote, setPaymentNote] = useState<string>("");

  // Form State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Branch lock check
  const isBranchLocked = Boolean(
    user?.branchId && user?.role !== "COMPANY_OWNER" && user?.role !== "SUPER_ADMIN"
  );

  // Initial Data Fetching
  useEffect(() => {
    async function loadInitial() {
      try {
        setLoading(true);
        const [bRes, sRes] = await Promise.all([
          fetchApi("/branches"),
          fetchApi("/suppliers"),
        ]);

        if (bRes.success && bRes.data && bRes.data.length > 0) {
          setBranches(bRes.data);
          if (!selectedBranchId) {
            setSelectedBranchId(user?.branchId || bRes.data[0].id);
          }
        }

        if (sRes.success && sRes.data && sRes.data.length > 0) {
          setSuppliers(sRes.data);
          setSelectedSupplierId(sRes.data[0].id);
        }
      } catch (err) {
        console.error("Failed to load initial purchase setup", err);
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, [user]);

  // Load products with stock for selected branch
  useEffect(() => {
    if (!selectedBranchId) return;
    async function loadBranchProducts() {
      try {
        const pRes = await fetchApi(`/products?branchId=${selectedBranchId}&limit=300`);
        if (pRes.success && pRes.data) {
          setAllProducts(pRes.data);
        }
      } catch (err) {
        console.error("Failed to load branch products", err);
      }
    }
    loadBranchProducts();
  }, [selectedBranchId]);

  // Load contacts for selected supplier
  useEffect(() => {
    if (!selectedSupplierId) {
      setSupplierContacts([]);
      setSelectedContactId("");
      return;
    }
    async function loadContacts() {
      try {
        const res = await fetchApi<SupplierContact[]>(`/suppliers/${selectedSupplierId}/contacts`);
        if (res.success && res.data && res.data.length > 0) {
          const activeList = res.data.filter((c) => c.isActive);
          setSupplierContacts(activeList);
          const primary = activeList.find((c) => c.isPrimary) || activeList[0];
          setSelectedContactId(primary ? primary.id : "");
        } else {
          setSupplierContacts([]);
          setSelectedContactId("");
        }
      } catch {
        setSupplierContacts([]);
        setSelectedContactId("");
      }
    }
    loadContacts();
  }, [selectedSupplierId]);

  // Load financial accounts
  useEffect(() => {
    if (!selectedBranchId) return;
    async function loadBranchAccounts() {
      try {
        const res = await fetchApi<any>(`/accounting/accounts?branchId=${selectedBranchId}`);
        if (res.success && res.data && res.data.length > 0) {
          setFinancialAccounts(res.data);
          const defaultAcc = res.data.find((a: any) => a.isDefault) || res.data[0];
          setSelectedAccountId(defaultAcc.id);
          setPaymentMethod(defaultAcc.type || "CASH");
        } else {
          setFinancialAccounts([]);
          setSelectedAccountId("");
        }
      } catch {
        setFinancialAccounts([]);
      }
    }
    loadBranchAccounts();
  }, [selectedBranchId]);

  // Search logic - opens dropdown instantly on focus or typing
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults(allProducts.slice(0, 50));
      return;
    }
    const query = searchTerm.toLowerCase().trim();
    const filtered = allProducts
      .filter((p) => {
        const name = (p.name || "").toLowerCase();
        const generic = (p.genericName || "").toLowerCase();
        const sku = (p.sku || "").toLowerCase();
        const barcode = (p.barcode || "").toLowerCase();
        return (
          name.includes(query) ||
          generic.includes(query) ||
          sku.includes(query) ||
          barcode.includes(query)
        );
      })
      .slice(0, 50);

    setSearchResults(filtered);
  }, [searchTerm, allProducts]);

  // Click outside search container to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Helper to calculate total lowest units for a given product
  const getProductStockCount = (prod: Product): number => {
    const invs = (prod as any)?.inventories;
    if (!invs || !Array.isArray(invs)) return 0;
    return invs.reduce((sum: number, inv: any) => sum + (inv.quantity || 0), 0);
  };

  // Helper to calculate line item derived fields
  const computeLineCalculations = (
    model: PackagingModel,
    mode: StockLineItem["receivingMode"],
    enteredQty: number,
    boxesPerCtn: number,
    stripsPerBx: number,
    tabsPerStr: number,
    costInput: number,
    discPct: number,
    sellInput: number
  ) => {
    const costBeforeDisc = Number(costInput) || 0;
    const costNet = costBeforeDisc; // Table line discount removed
    const qty = Math.max(1, Number(enteredQty) || 1);
    const selling = Number(sellInput) || 0;

    let totalBoxesOrPacks = 0;
    let totalLowestUnits = 0;
    let lineTotal = 0;
    let lowestUnitCost = 0;
    let lowestUnitSelling = 0;

    if (model === "TABLET") {
      const tabsPerBox = (stripsPerBx || 10) * (tabsPerStr || 10);
      if (mode === "CARTON") {
        totalBoxesOrPacks = qty * (boxesPerCtn || 10);
      } else {
        totalBoxesOrPacks = qty;
      }
      totalLowestUnits = totalBoxesOrPacks * tabsPerBox;

      lineTotal = Math.round(totalBoxesOrPacks * costNet * 100) / 100;
      lowestUnitCost = tabsPerBox > 0 ? Math.round((costNet / tabsPerBox) * 1000) / 1000 : costNet;
      lowestUnitSelling = tabsPerBox > 0 ? Math.round((selling / tabsPerBox) * 1000) / 1000 : selling;
    } else if (model === "BOTTLE") {
      if (mode === "CARTON") {
        const bottlesPerCtn = boxesPerCtn || 12;
        totalLowestUnits = qty * bottlesPerCtn;
        totalBoxesOrPacks = qty;
      } else {
        totalLowestUnits = qty;
        totalBoxesOrPacks = 0;
      }
      lineTotal = Math.round(totalLowestUnits * costNet * 100) / 100;
      lowestUnitCost = costNet;
      lowestUnitSelling = selling;
    } else if (model === "PIECE") {
      if (mode === "PACK") {
        const pcsPerPack = stripsPerBx || 10;
        totalBoxesOrPacks = qty;
        totalLowestUnits = qty * pcsPerPack;
        lineTotal = Math.round(qty * costNet * 100) / 100;
        lowestUnitCost = pcsPerPack > 0 ? Math.round((costNet / pcsPerPack) * 100) / 100 : costNet;
        lowestUnitSelling = pcsPerPack > 0 ? Math.round((selling / pcsPerPack) * 100) / 100 : selling;
      } else {
        totalLowestUnits = qty;
        totalBoxesOrPacks = 0;
        lineTotal = Math.round(qty * costNet * 100) / 100;
        lowestUnitCost = costNet;
        lowestUnitSelling = selling;
      }
    } else {
      if (mode === "BOX" || mode === "CARTON") {
        const vialsPerBox = stripsPerBx || 10;
        totalBoxesOrPacks = qty;
        totalLowestUnits = qty * vialsPerBox;
        lineTotal = Math.round(qty * costNet * 100) / 100;
        lowestUnitCost = vialsPerBox > 0 ? Math.round((costNet / vialsPerBox) * 100) / 100 : costNet;
        lowestUnitSelling = vialsPerBox > 0 ? Math.round((selling / vialsPerBox) * 100) / 100 : selling;
      } else {
        totalLowestUnits = qty;
        totalBoxesOrPacks = 0;
        lineTotal = Math.round(qty * costNet * 100) / 100;
        lowestUnitCost = costNet;
        lowestUnitSelling = selling;
      }
    }

    return {
      unitCostBeforeTax: costNet,
      lineTotal,
      totalBoxesOrPacks,
      totalLowestUnits,
      lowestUnitCost,
      lowestUnitSelling,
    };
  };

  // Add Product to Table
  const handleAddProductToTable = (prod: Product) => {
    const packagingModel = getPackagingModel(prod);
    const isTablet = packagingModel === "TABLET";
    const isBottle = packagingModel === "BOTTLE";
    const isPiece = packagingModel === "PIECE";

    const boxesPerCarton = (prod as any).boxesPerCarton || 10;
    const stripsPerBox = prod.stripsPerBox || (isTablet ? 10 : isBottle ? 12 : isPiece ? 10 : 10);
    const tabletsPerStrip = prod.tabletsPerStrip || (isTablet ? 10 : 1);

    const baseSelling = Number(prod.effectivePrice || prod.basePrice || 10);

    let initialCost = 0;
    let initialSelling = 0;
    let defaultMode: StockLineItem["receivingMode"] = "BOX";

    if (isTablet) {
      defaultMode = "BOX";
      const tabsPerBox = stripsPerBox * tabletsPerStrip;
      initialSelling = Math.round(baseSelling * tabsPerBox * 100) / 100;
      initialCost = Math.round(initialSelling * 0.85 * 100) / 100;
    } else if (isBottle) {
      defaultMode = "BOTTLE";
      initialSelling = baseSelling;
      initialCost = Math.round(initialSelling * 0.82 * 100) / 100;
    } else if (isPiece) {
      defaultMode = "PIECE";
      initialSelling = baseSelling;
      initialCost = Math.round(initialSelling * 0.85 * 100) / 100;
    } else {
      defaultMode = "VIAL";
      initialSelling = baseSelling;
      initialCost = Math.round(initialSelling * 0.85 * 100) / 100;
    }

    const currentStock = getProductStockCount(prod);

    const calc = computeLineCalculations(
      packagingModel,
      defaultMode,
      1,
      boxesPerCarton,
      stripsPerBox,
      tabletsPerStrip,
      initialCost,
      0,
      initialSelling
    );

    const twoYearsLater = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 2)
      .toISOString()
      .slice(0, 10);

    const newItem: StockLineItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      productId: prod.id,
      product: prod,
      packagingModel,
      currentStock,
      boxesPerCarton,
      stripsPerBox,
      tabletsPerStrip,
      receivingMode: defaultMode,
      enteredQuantity: 1,
      unitCostBeforeDiscount: initialCost,
      discountPercent: 0,
      unitSellingPrice: initialSelling,
      lotNumber: `BAT-${Math.floor(10000 + Math.random() * 90000)}`,
      mfgDate: new Date().toISOString().slice(0, 10),
      expiryDate: twoYearsLater,
      shelfLocation: prod.shelfLocation || "Main Shelf",
      ...calc,
    };

    setLineItems((prev) => [...prev, newItem]);
    setSearchTerm("");
    setIsSearchOpen(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Update a line item
  const updateLineItem = (id: string, updates: Partial<StockLineItem>) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const merged = { ...item, ...updates };

        const calc = computeLineCalculations(
          merged.packagingModel,
          merged.receivingMode,
          merged.enteredQuantity,
          merged.boxesPerCarton,
          merged.stripsPerBox,
          merged.tabletsPerStrip,
          merged.unitCostBeforeDiscount,
          merged.discountPercent,
          merged.unitSellingPrice
        );

        return {
          ...merged,
          ...calc,
        };
      })
    );
  };

  // Remove line item
  const removeLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Calculate totals (Auto-rounded whole numbers)
  const subtotal = useMemo(() => {
    return Math.round(lineItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0));
  }, [lineItems]);

  const totalItemsCount = useMemo(() => {
    return Math.round(lineItems.reduce((sum, item) => sum + (Number(item.enteredQuantity) || 0), 0));
  }, [lineItems]);

  // Overall Discount calculation (Auto-rounded to integer)
  const calculatedInvoiceDiscount = useMemo(() => {
    if (discountType === "PERCENT") {
      return Math.round((subtotal * (Number(discountAmount) || 0)) / 100);
    }
    if (discountType === "FIXED") {
      return Math.round(Math.min(subtotal, Number(discountAmount) || 0));
    }
    return 0;
  }, [subtotal, discountType, discountAmount]);

  // Purchase Tax calculation
  const calculatedTax = useMemo(() => {
    let pct = 0;
    if (purchaseTaxOption === "5") pct = 5;
    else if (purchaseTaxOption === "7.5") pct = 7.5;
    else if (purchaseTaxOption === "10") pct = 10;
    else if (purchaseTaxOption === "15") pct = 15;
    else if (purchaseTaxOption === "CUSTOM") pct = Number(customTaxPercent) || 0;

    const baseForTax = Math.max(0, subtotal - calculatedInvoiceDiscount);
    return Math.round((baseForTax * pct) / 100);
  }, [subtotal, calculatedInvoiceDiscount, purchaseTaxOption, customTaxPercent]);

  // Grand Net Total (Auto-rounded integer, e.g. 33012.50 -> 33013)
  const netTotalAmount = useMemo(() => {
    return Math.max(0, Math.round(subtotal - calculatedInvoiceDiscount + calculatedTax));
  }, [subtotal, calculatedInvoiceDiscount, calculatedTax]);

  // Payment Due (Clean integer)
  const paymentDue = useMemo(() => {
    return Math.max(0, Math.round(netTotalAmount - (Number(paidAmount) || 0)));
  }, [netTotalAmount, paidAmount]);

  // Selected supplier details
  const currentSupplier = useMemo(() => {
    return suppliers.find((s) => s.id === selectedSupplierId) || null;
  }, [suppliers, selectedSupplierId]);

  // Selected financial account
  const selectedAccount = useMemo(() => {
    return (
      financialAccounts.find((a) => a.id === selectedAccountId) ||
      (financialAccounts.length > 0 ? financialAccounts[0] : null)
    );
  }, [financialAccounts, selectedAccountId]);

  // Submit Stock Inward
  const handleSubmitStock = async () => {
    if (lineItems.length === 0) {
      setError("Please add at least one product to the stock table.");
      return;
    }

    if (!selectedBranchId) {
      setError("Please select a branch.");
      return;
    }

    const effectiveAcc = financialAccounts.find((a) => a.id === selectedAccountId) || (financialAccounts.length > 0 ? financialAccounts[0] : null);

    if (Number(paidAmount) > 0 && !effectiveAcc) {
      setError("Please ensure a financial account is configured in Accounting for this branch before making payment.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const selectedContact = supplierContacts.find((c) => c.id === selectedContactId);

      const preparedItems = lineItems.map((item) => {
        const isCarton = item.receivingMode === "CARTON";
        const isBox = item.receivingMode === "BOX" || item.receivingMode === "PACK";
        const receivingUnit = isCarton ? "CARTON" : (isBox ? "BOX" : "PIECE");

        return {
          productId: item.productId,
          batchNumber: item.lotNumber || `BAT-${Date.now().toString().slice(-6)}`,
          barcode: item.product.barcode || null,
          mfgDate: item.mfgDate || null,
          expiryDate: item.expiryDate || null,
          packageType: item.product.productType || "Medicine",
          receivingUnit,
          cartonQuantity: isCarton ? item.enteredQuantity : null,
          boxQuantity: isBox ? item.enteredQuantity : (isCarton ? item.totalBoxesOrPacks : null),
          stripsPerBox: item.stripsPerBox,
          tabletsPerStrip: item.tabletsPerStrip,
          quantity: item.totalLowestUnits,
          unitPurchasePrice: item.lowestUnitCost,
          unitSellingPrice: item.lowestUnitSelling,
          unitCostBeforeDiscount: item.unitCostBeforeDiscount,
          discountPercent: item.discountPercent,
          lineTotal: item.lineTotal,
          shelfLocation: item.shelfLocation || null,
        };
      });

      const payload = {
        branchId: selectedBranchId,
        supplierId: selectedSupplierId || null,
        contactPersonId: selectedContactId || null,
        contactPersonName: selectedContact ? selectedContact.name : null,
        invoiceNo: invoiceNo.trim() || `PUR-${Date.now().toString().slice(-6)}`,
        purchaseDate,
        items: preparedItems,
        discountType,
        discountAmount: Math.round(calculatedInvoiceDiscount),
        taxAmount: Math.round(calculatedTax),
        subtotal: Math.round(subtotal),
        totalAmount: Math.round(netTotalAmount),
        paidAmount: Math.round(Number(paidAmount) || 0),
        paymentMethod: (effectiveAcc?.type || paymentMethod || "CASH").toUpperCase(),
        financialAccountId: Number(paidAmount) > 0 ? (effectiveAcc?.id || null) : null,
        notes: null,
      };

      const res = await fetchApi("/suppliers/purchases", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to record purchase stock");
      }

      setSuccess(true);
      await showAlert.success(
        "Stock Added Successfully!",
        `Purchase invoice ${payload.invoiceNo} recorded with ${lineItems.length} product(s). Batches added to inventory. Total: ৳${Number(netTotalAmount || 0).toLocaleString()}`,
        {
          confirmButtonText: "OK",
          timer: 3500,
        }
      );
      onNavigate("stock_stock_list");
    } catch (err: any) {
      const msg = err.message || "An error occurred while saving stock";
      setError(msg);
      showAlert.error("Stock Intake Failed", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 w-full mx-auto pb-20 px-2 sm:px-4 md:px-6">
      {/* Top Header & Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <Boxes className="w-8 h-8 sm:w-9 sm:h-9 text-emerald-600" />
            Add Stock
          </h1>
        </div>

        <div>
          <button
            type="button"
            onClick={() => onNavigate("stock_stock_list")}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Stock List
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-300 dark:border-rose-900 rounded-xl flex items-start gap-3 text-rose-900 dark:text-rose-200 shadow-md">
          <AlertCircle className="w-6 h-6 mt-0.5 flex-shrink-0 text-rose-600" />
          <div className="flex-1 text-base font-bold">{error}</div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center gap-3 text-emerald-900 dark:text-emerald-200 shadow-md">
          <CheckCircle2 className="w-7 h-7 text-emerald-600 flex-shrink-0" />
          <div>
            <h4 className="font-black text-base sm:text-lg">Stock Added Successfully!</h4>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mt-0.5">
              Cartons, boxes, bottles, pieces, and accounts have been updated. Redirecting...
            </p>
          </div>
        </div>
      )}

      {/* Section 1: Supplier & Invoice Metadata Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
        <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Building className="w-5 h-5 text-emerald-600" />
          Supplier Information
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Branch */}
          <div>
            <label className="block text-sm font-black text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
              <Store className="w-4 h-4 text-slate-400" />
              Branch / Store *
            </label>
            <select
              disabled={isBranchLocked}
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full text-sm font-bold bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 disabled:opacity-70 h-11"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-sm font-black text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-slate-400" />
              Supplier *
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full text-sm font-bold bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 h-11"
            >
              <option value="">-- Select Supplier --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.company ? `(${s.company})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Contact Person (MR / SR) */}
          <div>
            <label className="block text-sm font-black text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-400" />
              Representative (MR / SR)
            </label>
            <select
              value={selectedContactId}
              onChange={(e) => setSelectedContactId(e.target.value)}
              className="w-full text-sm font-bold bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 h-11"
            >
              <option value="">-- Direct / General --</option>
              {supplierContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Purchase Date */}
          <div>
            <label className="block text-sm font-black text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              Purchase Date *
            </label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full text-sm font-bold bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 h-11 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Product Search & Dynamic Stock Items Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Search Header Bar */}
        <div className="p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-800/60 border-b-2 border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative w-full max-w-xl lg:max-w-2xl" ref={searchContainerRef}>
            {/* Live Search Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-emerald-600 dark:text-emerald-400">
                <Search className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onClick={() => {
                  setSearchResults(searchTerm.trim() ? searchResults : allProducts.slice(0, 50));
                  setIsSearchOpen(true);
                }}
                onFocus={() => {
                  setSearchResults(searchTerm.trim() ? searchResults : allProducts.slice(0, 50));
                  setIsSearchOpen(true);
                }}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsSearchOpen(true);
                }}
                placeholder="Search medicine or scan barcode..."
                className="w-full pl-12 sm:pl-13 pr-10 py-3 sm:py-3.5 bg-white dark:bg-slate-900 border-2 border-emerald-500/60 dark:border-emerald-500/40 focus:border-emerald-600 dark:focus:border-emerald-500 rounded-xl text-sm sm:text-base text-slate-900 dark:text-white placeholder-slate-400 font-bold outline-none focus:ring-4 focus:ring-emerald-500/15 transition shadow-sm h-12 sm:h-13"
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    searchInputRef.current?.focus();
                  }}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  title="Clear search"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Autocomplete Dropdown List - Fixed Max Height with Smooth Scroll */}
            {isSearchOpen && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 max-h-[360px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 overscroll-contain">
                {searchResults.length > 0 ? (
                  searchResults.map((prod) => {
                    const stock = getProductStockCount(prod);
                    const model = getPackagingModel(prod);
                    return (
                      <div
                        key={prod.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleAddProductToTable(prod);
                        }}
                        className="px-4 py-3.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 cursor-pointer flex items-center justify-between transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                            {model === "TABLET" && <Pill className="w-5 h-5 text-emerald-600" />}
                            {model === "BOTTLE" && <Droplets className="w-5 h-5 text-blue-600" />}
                            {model === "PIECE" && <Package className="w-5 h-5 text-amber-600" />}
                            {model === "VIAL" && <Syringe className="w-5 h-5 text-purple-600" />}
                          </div>
                          <div>
                            <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                              <span>{prod.name}</span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                                  model === "TABLET"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/70 dark:text-emerald-300"
                                    : model === "BOTTLE"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/70 dark:text-blue-300"
                                    : model === "PIECE"
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/70 dark:text-amber-300"
                                    : "bg-purple-100 text-purple-800 dark:bg-purple-900/70 dark:text-purple-300"
                                }`}
                              >
                                {model === "TABLET"
                                  ? "Tablet / Box"
                                  : model === "BOTTLE"
                                  ? "Syrup / Bottle"
                                  : model === "PIECE"
                                  ? "Diaper / Piece"
                                  : "Injection / Vial"}
                              </span>
                            </div>
                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                              {prod.genericName || "—"}
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-3">
                          <div>
                            <span
                              className={`text-xs font-black px-2.5 py-1 rounded-full ${
                                stock > 0
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
                              }`}
                            >
                              Stock: {stock} {prod.unit || "Pcs"}
                            </span>
                            <div className="text-sm font-black text-slate-800 dark:text-slate-200 mt-1">
                              MRP: ৳{Number(prod.effectivePrice || prod.basePrice || 0).toFixed(2)}
                            </div>
                          </div>
                          <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-sm">
                            <Plus className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : searchTerm.trim() ? (
                  <div className="p-6 text-center">
                    <p className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-300">
                      No product found matching &quot;<span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{searchTerm}</span>&quot;
                    </p>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">
                      Need to register this new medicine in the catalog with full packaging and pricing?
                    </p>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onNavigate("inv_add_product");
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-black shadow-sm transition"
                    >
                      <Plus className="w-4 h-4" />
                      Add Product in Catalog
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Right side items counter badge */}
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 self-end sm:self-center">
            <span className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${lineItems.length > 0 ? "bg-emerald-500 animate-pulse" : "bg-slate-300 dark:bg-slate-600"}`} />
              <span>{lineItems.length} {lineItems.length === 1 ? "Product" : "Products"} in Table</span>
            </span>
          </div>
        </div>

        {/* Dynamic Multi-Product Items Table - Clean & Large Typography */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[1050px]">
            <thead>
              <tr className="bg-brand-primary text-white text-xs sm:text-sm font-black tracking-wider divide-x divide-white/20 shadow-xs">
                <th className="py-3.5 px-3 text-center w-12">#</th>
                <th className="py-3.5 px-4 min-w-[220px]">Product / Medicine</th>
                <th className="py-3.5 px-4 min-w-[240px]">Stock In Unit &amp; Intake Qty</th>
                <th className="py-3.5 px-3.5 min-w-[140px]">Purchase Cost (৳)</th>
                <th className="py-3.5 px-4 min-w-[130px] text-right">Total (৳)</th>
                <th className="py-3.5 px-3.5 min-w-[140px]">Selling Price (MRP)</th>
                <th className="py-3.5 px-3.5 min-w-[170px]">Lot / Batch &amp; EXP Date</th>
                <th className="py-3.5 px-2 text-center w-12">
                  <Trash2 className="w-4 h-4 mx-auto text-white/80" />
                </th>
              </tr>
            </thead>

            <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800 text-sm">
              {lineItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Search className="w-10 h-10 text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                      <p className="text-base font-black text-slate-600 dark:text-slate-300">
                        No products added yet.
                      </p>
                      <p className="text-sm font-semibold text-slate-400">
                        Click search above or scan barcode to add medicines to this challan.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                lineItems.map((item, index) => {
                  const isTablet = item.packagingModel === "TABLET";
                  const isBottle = item.packagingModel === "BOTTLE";
                  const isPiece = item.packagingModel === "PIECE";
                  const isVial = item.packagingModel === "VIAL";

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition divide-x-2 divide-slate-100 dark:divide-slate-800 align-top"
                    >
                      {/* # */}
                      <td className="py-4 px-3 text-center text-slate-400 font-mono font-bold text-sm">
                        {index + 1}
                      </td>

                      {/* Product Name & Packaging Type Badge */}
                      <td className="py-4 px-3.5">
                        <div className="font-black text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                          {item.product.name}
                        </div>
                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded font-black uppercase text-[10px] ${
                              isTablet
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : isBottle
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                : isPiece
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                            }`}
                          >
                            {isTablet ? "Tablet / Capsule" : isBottle ? "Syrup" : isPiece ? "Piece" : "Injection"}
                          </span>
                          <span>•</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-black">
                            Stock: {item.currentStock} {item.product.unit || "Pcs"}
                          </span>
                        </div>
                      </td>

                      {/* Stock In Unit & Intake Qty Input */}
                      <td className="py-4 px-3.5 space-y-2.5">
                        {/* Packaging Unit Switcher Pill */}
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black">
                          {isTablet && (
                            <>
                              <button
                                type="button"
                                onClick={() => updateLineItem(item.id, { receivingMode: "BOX" })}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-center transition ${
                                  item.receivingMode === "BOX"
                                    ? "bg-white dark:bg-slate-900 text-brand-primary shadow-xs"
                                    : "text-slate-500 hover:text-slate-900"
                                }`}
                              >
                                🗃️ Box Intake
                              </button>
                              <button
                                type="button"
                                onClick={() => updateLineItem(item.id, { receivingMode: "CARTON" })}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-center transition ${
                                  item.receivingMode === "CARTON"
                                    ? "bg-white dark:bg-slate-900 text-brand-primary shadow-xs"
                                    : "text-slate-500 hover:text-slate-900"
                                }`}
                              >
                                📦 Carton Intake
                              </button>
                            </>
                          )}

                          {isBottle && (
                            <>
                              <button
                                type="button"
                                onClick={() => updateLineItem(item.id, { receivingMode: "BOTTLE" })}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-center transition ${
                                  item.receivingMode === "BOTTLE"
                                    ? "bg-white dark:bg-slate-900 text-brand-primary shadow-xs"
                                    : "text-slate-500 hover:text-slate-900"
                                }`}
                              >
                                🍾 Bottle
                              </button>
                              <button
                                type="button"
                                onClick={() => updateLineItem(item.id, { receivingMode: "CARTON" })}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-center transition ${
                                  item.receivingMode === "CARTON"
                                    ? "bg-white dark:bg-slate-900 text-brand-primary shadow-xs"
                                    : "text-slate-500 hover:text-slate-900"
                                }`}
                              >
                                📦 Carton ({item.boxesPerCarton} btl)
                              </button>
                            </>
                          )}

                          {isPiece && (
                            <>
                              <button
                                type="button"
                                onClick={() => updateLineItem(item.id, { receivingMode: "PIECE" })}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-center transition ${
                                  item.receivingMode === "PIECE"
                                    ? "bg-white dark:bg-slate-900 text-brand-primary shadow-xs"
                                    : "text-slate-500 hover:text-slate-900"
                                }`}
                              >
                                🧩 Piece / Unit
                              </button>
                              <button
                                type="button"
                                onClick={() => updateLineItem(item.id, { receivingMode: "PACK" })}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-center transition ${
                                  item.receivingMode === "PACK"
                                    ? "bg-white dark:bg-slate-900 text-brand-primary shadow-xs"
                                    : "text-slate-500 hover:text-slate-900"
                                }`}
                              >
                                📦 Pack ({item.stripsPerBox} pcs)
                              </button>
                            </>
                          )}

                          {isVial && (
                            <>
                              <button
                                type="button"
                                onClick={() => updateLineItem(item.id, { receivingMode: "VIAL" })}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-center transition ${
                                  item.receivingMode === "VIAL"
                                    ? "bg-white dark:bg-slate-900 text-brand-primary shadow-xs"
                                    : "text-slate-500 hover:text-slate-900"
                                }`}
                              >
                                💉 Vial
                              </button>
                              <button
                                type="button"
                                onClick={() => updateLineItem(item.id, { receivingMode: "BOX" })}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-center transition ${
                                  item.receivingMode === "BOX"
                                    ? "bg-white dark:bg-slate-900 text-brand-primary shadow-xs"
                                    : "text-slate-500 hover:text-slate-900"
                                }`}
                              >
                                📦 Box ({item.stripsPerBox} vials)
                              </button>
                            </>
                          )}
                        </div>

                        {/* Quantity Input */}
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.enteredQuantity}
                            onChange={(e) =>
                              updateLineItem(item.id, {
                                enteredQuantity: Math.max(1, Number(e.target.value) || 1),
                              })
                            }
                            className="w-24 sm:w-28 h-10 text-sm sm:text-base font-black text-slate-900 dark:text-white bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl px-3 text-right focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 font-mono shadow-xs outline-none"
                          />
                          <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                            {item.receivingMode === "CARTON"
                              ? "Cartons"
                              : item.receivingMode === "BOX"
                              ? "Boxes"
                              : item.receivingMode === "PACK"
                              ? "Packs"
                              : item.receivingMode === "BOTTLE"
                              ? "Bottles"
                              : "Pieces"}
                          </span>
                        </div>

                        {/* Breakdown Calculation Banner */}
                        <div className="text-xs font-black text-slate-700 dark:text-slate-300">
                          {isTablet && (
                            <span>
                              = {item.totalBoxesOrPacks} Boxes ({item.totalLowestUnits.toLocaleString()} Tablets)
                            </span>
                          )}
                          {isBottle && (
                            <span>
                              = {item.totalLowestUnits} Bottles
                            </span>
                          )}
                          {isPiece && (
                            <span>
                              = {item.totalLowestUnits} Pieces
                            </span>
                          )}
                          {isVial && (
                            <span>
                              = {item.totalLowestUnits} Vials
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Purchase Cost */}
                      <td className="py-4 px-3.5">
                        <div className="max-w-[130px]">
                          <div className="text-xs font-black text-slate-500 dark:text-slate-400 mb-1.5 whitespace-nowrap">
                            {isTablet
                              ? "Cost / Box (৳):"
                              : isBottle
                              ? "Cost / Bottle (৳):"
                              : item.receivingMode === "PACK"
                              ? "Cost / Pack (৳):"
                              : "Cost / Piece (৳):"}
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitCostBeforeDiscount}
                            onChange={(e) =>
                              updateLineItem(item.id, {
                                unitCostBeforeDiscount: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className="w-full h-10 text-sm sm:text-base font-black text-slate-900 dark:text-white bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl px-3 text-right focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 font-mono outline-none shadow-xs"
                          />
                          {isTablet && (
                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1 text-right font-mono">
                              ৳{item.lowestUnitCost.toFixed(2)}/tab
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Total (৳) */}
                      <td className="py-4 px-4 text-right align-middle">
                        <div className="inline-flex items-center justify-end px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-2xs">
                          <span className="text-base sm:text-lg font-black text-brand-primary font-mono">
                            ৳{Math.round(item.lineTotal).toLocaleString("en-BD")}
                          </span>
                        </div>
                      </td>

                      {/* Selling Price / MRP */}
                      <td className="py-4 px-3.5">
                        <div className="max-w-[130px]">
                          <div className="text-xs font-black text-slate-500 dark:text-slate-400 mb-1.5 whitespace-nowrap">
                            {isTablet
                              ? "MRP / Box (৳):"
                              : isBottle
                              ? "MRP / Bottle (৳):"
                              : item.receivingMode === "PACK"
                              ? "MRP / Pack (৳):"
                              : "MRP / Piece (৳):"}
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitSellingPrice}
                            onChange={(e) =>
                              updateLineItem(item.id, {
                                unitSellingPrice: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className="w-full h-10 text-sm sm:text-base font-black text-slate-900 dark:text-white bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl px-3 text-right focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 font-mono outline-none shadow-xs"
                          />
                          {isTablet && (
                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1 text-right font-mono">
                              ৳{item.lowestUnitSelling.toFixed(2)}/tab
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Lot / Batch & Expiry Date */}
                      <td className="py-4 px-3.5 space-y-2">
                        <input
                          type="text"
                          value={item.lotNumber}
                          onChange={(e) =>
                            updateLineItem(item.id, {
                              lotNumber: e.target.value,
                            })
                          }
                          placeholder="Batch / Lot #"
                          className="w-full h-9 text-xs sm:text-sm font-bold font-mono bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl px-3 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none"
                        />
                        <div className="flex items-center gap-1.5 text-xs font-black text-slate-500">
                          <span className="text-[11px] font-black uppercase text-slate-400">EXP:</span>
                          <input
                            type="date"
                            value={item.expiryDate}
                            onChange={(e) =>
                              updateLineItem(item.id, {
                                expiryDate: e.target.value,
                              })
                            }
                            className="h-9 text-xs font-bold bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl px-2 text-slate-900 dark:text-white font-mono w-full focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none"
                          />
                        </div>
                      </td>

                      {/* Action: Delete */}
                      <td className="py-4 px-2.5 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => removeLineItem(item.id)}
                          className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                          title="Remove item"
                        >
                          <X className="w-5 h-5 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Bottom Summary Bar */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 border-t-2 border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-end items-end sm:items-center gap-6 sm:gap-10">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-black text-slate-600 dark:text-slate-300">Total Items:</span>
            <span className="font-black text-slate-900 dark:text-white font-mono text-base sm:text-lg">
              {Math.round(totalItemsCount).toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-sm font-black text-slate-600 dark:text-slate-300">Subtotal Amount:</span>
            <span className="font-black text-slate-900 dark:text-white font-mono text-xl sm:text-2xl">
              ৳{Math.round(subtotal).toLocaleString("en-BD")}
            </span>
          </div>
        </div>
      </div>

      {/* Section 3: Discount Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
        <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          Discount
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left Column: Discount Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-black text-slate-800 dark:text-slate-200 mb-2">
                Discount Type:
              </label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="w-full text-sm font-bold bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 h-11"
              >
                <option value="NONE">None</option>
                <option value="FIXED">Fixed Amount (৳)</option>
                <option value="PERCENT">Percentage (%)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-black text-slate-800 dark:text-slate-200 mb-2">
                Discount Amount:
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                disabled={discountType === "NONE"}
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                placeholder="0.00"
                className="w-full text-sm font-bold bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 h-11 font-mono"
              />
            </div>
          </div>

          {/* Right Column: Financial Breakdown Summary */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
            <div className="space-y-4 divide-y-2 divide-slate-200 dark:divide-slate-700/60">
              <div className="flex justify-between items-center py-1">
                <span className="text-sm sm:text-base font-bold text-slate-600 dark:text-slate-400">Subtotal:</span>
                <span className="font-black text-slate-900 dark:text-white font-mono text-base sm:text-lg">
                  ৳{Math.round(subtotal).toLocaleString("en-BD")}
                </span>
              </div>

              <div className="flex justify-between items-center pt-3">
                <span className="text-sm sm:text-base font-bold text-slate-600 dark:text-slate-400">Discount:(-)</span>
                <span className="font-black text-rose-600 dark:text-rose-400 font-mono text-base sm:text-lg">
                  ৳{Math.round(calculatedInvoiceDiscount).toLocaleString("en-BD")}
                </span>
              </div>

              <div className="flex justify-between items-center pt-4">
                <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">Net Total Amount:</span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  ৳{Math.round(netTotalAmount).toLocaleString("en-BD")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Add Payment Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5">
        <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <CreditCard className="w-6 h-6 text-emerald-600" />
          Payment
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {/* Amount Paid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-black text-slate-800 dark:text-slate-200">
                Paid Amount:*
              </label>
              {netTotalAmount > 0 && (
                <button
                  type="button"
                  onClick={() => setPaidAmount(netTotalAmount)}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Pay Full (৳{netTotalAmount.toLocaleString("en-BD")})
                </button>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-black text-sm">
                ৳
              </div>
              <input
                type="number"
                min="0"
                step="1"
                placeholder={`৳${netTotalAmount}`}
                value={paidAmount}
                onChange={(e) => setPaidAmount(Math.max(0, Math.round(Number(e.target.value) || 0)))}
                className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl text-sm sm:text-base font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 font-mono h-11"
              />
            </div>
          </div>

          {/* Paid on Date */}
          <div>
            <label className="block text-sm font-black text-slate-800 dark:text-slate-200 mb-2">
              Paid on:*
            </label>
            <input
              type="datetime-local"
              value={paidOnDate}
              onChange={(e) => setPaidOnDate(e.target.value)}
              className="w-full text-sm font-bold bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 h-11"
            />
          </div>

          {/* Payment Method / Account with Tk balance */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-black text-slate-800 dark:text-slate-200">
                Payment Method:*
              </label>
              {selectedAccount && (
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Balance:{" "}
                  <span
                    className={`font-mono font-black ${
                      Number(selectedAccount.balance || 0) < Number(paidAmount || 0)
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    ৳{Math.round(Number(selectedAccount.balance || 0)).toLocaleString("en-BD")}
                  </span>
                </span>
              )}
            </div>
            <select
              value={selectedAccountId}
              onChange={(e) => {
                const accId = e.target.value;
                setSelectedAccountId(accId);
                const acc = financialAccounts.find((a) => a.id === accId);
                if (acc) {
                  setPaymentMethod(acc.type || acc.name);
                }
              }}
              className="w-full text-sm font-bold bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 h-11"
            >
              {financialAccounts.length > 0 ? (
                financialAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type}) — ৳{Math.round(Number(acc.balance || 0)).toLocaleString("en-BD")}
                  </option>
                ))
              ) : (
                <option value="">No accounts found (৳0)</option>
              )}
            </select>
          </div>
        </div>

        {/* Save Action */}
        <div className="pt-5 border-t-2 border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            disabled={submitting || lineItems.length === 0}
            onClick={handleSubmitStock}
            className="w-full sm:w-auto px-10 py-3.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-base sm:text-lg font-black shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed h-13 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving Stock...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Stock
              </>
            )}
          </button>
        </div>
      </div>


    </div>
  );
}
