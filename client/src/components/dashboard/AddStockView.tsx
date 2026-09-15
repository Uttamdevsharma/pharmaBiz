"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Product, Supplier, Branch, SupplierContact } from "@/types";
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
  Package,
  Boxes,
  Archive,
  Lock,
  Calculator,
  Info,
  User,
  Pill,
  Droplets,
  Syringe,
  Sparkles,
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
  const cat = (prod?.category || prod?.categoryRef?.name || packageType || "").toLowerCase();
  const name = (prod?.name || "").toLowerCase();
  const generic = (prod?.genericName || "").toLowerCase();

  // 1. Bottle checks
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

  // 3. Piece / Unit checks (Diaper, Syringe, Bandage, Device, Surgical, etc.)
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
    cat.includes("essential") ||
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

const isBottleProduct = (prod?: Product | null, packageType?: string) => {
  return getPackagingModel(prod, packageType) === "BOTTLE";
};

export function AddStockView({ onNavigate }: AddStockViewProps) {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(user?.branchId || "");
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierContacts, setSupplierContacts] = useState<SupplierContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [financialAccounts, setFinancialAccounts] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Receiving unit selection: CARTON vs BOX
  const [receivingUnit, setReceivingUnit] = useState<"CARTON" | "BOX">("CARTON");
  const [batchMode, setBatchMode] = useState<"NEW" | "EXISTING">("NEW");
  const [existingBatches, setExistingBatches] = useState<any[]>([]);
  const [selectedExistingBatch, setSelectedExistingBatch] = useState<any | null>(null);
  const [loadingBatches, setLoadingBatches] = useState(false);

  const [formData, setFormData] = useState({
    productId: "",
    supplierId: "",
    contactPersonId: "",
    contactPersonName: "",
    batchNumber: `BAT-${Date.now().toString().slice(-6)}`,
    barcode: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
    receivedDate: new Date().toISOString().slice(0, 10),
    mfgDate: new Date().toISOString().slice(0, 10),
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 2).toISOString().slice(0, 10),
    packageType: "MEDICINE",
    cartonQuantity: 5,
    boxesReceived: 7,
    boxesPerCarton: 10,
    boxQuantity: 50,
    stripsPerBox: 10,
    tabletsPerStrip: 10,
    quantity: 5000,
    boxPurchasePrice: 150,
    boxSellingPrice: 250,
    unitPurchasePrice: 1.5,
    unitSellingPrice: 2.5,
    paidAmount: 7500,
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

  // Load contacts for selected supplier
  useEffect(() => {
    if (!formData.supplierId) {
      setSupplierContacts([]);
      setFormData((prev) => ({ ...prev, contactPersonId: "", contactPersonName: "" }));
      return;
    }
    async function loadContacts() {
      try {
        setLoadingContacts(true);
        const res = await fetchApi<SupplierContact[]>(`/suppliers/${formData.supplierId}/contacts`);
        if (res.success && res.data && res.data.length > 0) {
          const activeList = res.data.filter((c) => c.isActive);
          setSupplierContacts(activeList);
          // Auto select primary contact or first contact
          const primary = activeList.find((c) => c.isPrimary) || activeList[0];
          if (primary) {
            setFormData((prev) => ({
              ...prev,
              contactPersonId: primary.id,
              contactPersonName: primary.name,
            }));
          } else {
            setFormData((prev) => ({ ...prev, contactPersonId: "", contactPersonName: "" }));
          }
        } else {
          setSupplierContacts([]);
          setFormData((prev) => ({ ...prev, contactPersonId: "", contactPersonName: "" }));
        }
      } catch (err) {
        console.error("Failed to load supplier contacts", err);
        setSupplierContacts([]);
      } finally {
        setLoadingContacts(false);
      }
    }
    loadContacts();
  }, [formData.supplierId]);

  // Load existing batches for the selected product and branch
  useEffect(() => {
    if (!selectedProduct || !selectedBranchId) return;
    async function loadBatches() {
      try {
        setLoadingBatches(true);
        const res = await fetchApi<any>(`/inventory/branch/${selectedBranchId}?limit=100`);
        if (res.success && Array.isArray(res.data)) {
          const matching = res.data.filter((i: any) => i.productId === selectedProduct!.id);
          setExistingBatches(matching);
        } else {
          setExistingBatches([]);
        }
      } catch {
        setExistingBatches([]);
      } finally {
        setLoadingBatches(false);
      }
    }
    loadBatches();
  }, [selectedProduct, selectedBranchId]);

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

    const model = getPackagingModel(prod);
    const isBottle = model === "BOTTLE";
    const isPiece = model === "PIECE";
    const isVial = model === "VIAL";
    const isTablet = model === "TABLET";

    const itemsPerBox = prod.stripsPerBox || (isBottle ? 12 : isPiece ? 1 : 10);
    const strips = isTablet ? (prod.stripsPerBox || 10) : (isBottle ? 1 : itemsPerBox);
    const tablets = isTablet ? (prod.tabletsPerStrip || 10) : 1;
    const unitsPerBox = isBottle ? 1 : (isTablet ? (strips * tablets) : itemsPerBox);

    const boxesPerCarton = prod.qtyPerLevel2 || (isBottle ? (prod.stripsPerBox || 12) : 10);
    const cartonQty = isBottle ? 2 : 5;
    const looseBoxes = isBottle ? 10 : (isPiece ? 20 : 7);
    const totalBoxes = receivingUnit === "CARTON" ? cartonQty * boxesPerCarton : looseBoxes;
    const totalUnits = isBottle ? totalBoxes : totalBoxes * unitsPerBox;

    // In product catalog, basePrice is Selling Price (per Box or per Bottle)
    const boxSelling = Number(prod.basePrice) || (isBottle ? 180 : 250);
    const boxPurchase = Math.round(boxSelling * 0.7 * 100) / 100;
    const unitPurchase = isBottle ? boxPurchase : (unitsPerBox > 0 ? Math.round((boxPurchase / unitsPerBox) * 10000) / 10000 : 0);
    const unitSelling = isBottle ? boxSelling : (unitsPerBox > 0 ? Math.round((boxSelling / unitsPerBox) * 10000) / 10000 : 0);
    const totalCost = Math.round(totalBoxes * boxPurchase * 100) / 100;

    setFormData((prev) => ({
      ...prev,
      productId: prod.id,
      barcode: prod.barcode || prev.barcode,
      packageType: model,
      cartonQuantity: cartonQty,
      boxesReceived: looseBoxes,
      boxesPerCarton: boxesPerCarton,
      boxQuantity: totalBoxes,
      stripsPerBox: strips,
      tabletsPerStrip: tablets,
      quantity: totalUnits,
      boxPurchasePrice: boxPurchase,
      boxSellingPrice: boxSelling,
      unitPurchasePrice: unitPurchase,
      unitSellingPrice: unitSelling,
      paidAmount: totalCost,
      shelfLocation: prod.shelfLocation || "Rack A-1",
    }));
  };

  const handleSelectExistingBatch = (batchId: string) => {
    const b = existingBatches.find((item) => item.id === batchId);
    if (!b) {
      setSelectedExistingBatch(null);
      return;
    }
    setSelectedExistingBatch(b);

    const model = getPackagingModel(selectedProduct, formData.packageType);
    const isBottle = model === "BOTTLE";
    const isPiece = model === "PIECE";
    const isVial = model === "VIAL";
    const isTablet = model === "TABLET";

    const itemsPerBox = selectedProduct?.stripsPerBox || b.stripsPerBox || (isBottle ? 12 : isPiece ? 1 : 10);
    const strips = isTablet ? (selectedProduct?.stripsPerBox || b.stripsPerBox || 10) : (isBottle ? 1 : itemsPerBox);
    const tabs = isTablet ? (selectedProduct?.tabletsPerStrip || b.tabletsPerStrip || 10) : 1;
    const unitsPerBox = isBottle ? 1 : (isTablet ? (strips * tabs) : itemsPerBox);
    const boxesPer = b.boxesPerCarton || selectedProduct?.qtyPerLevel2 || formData.boxesPerCarton || (isBottle ? 12 : 10);

    const boxPurchase = b.boxPurchasePrice ? Number(b.boxPurchasePrice) : (b.purchasePrice ? (isBottle ? Number(b.purchasePrice) : Number(b.purchasePrice) * unitsPerBox) : formData.boxPurchasePrice);
    const boxSelling = b.boxSellingPrice ? Number(b.boxSellingPrice) : (b.sellingPrice ? (isBottle ? Number(b.sellingPrice) : Number(b.sellingPrice) * unitsPerBox) : formData.boxSellingPrice);
    const unitPurchase = isBottle ? boxPurchase : (unitsPerBox > 0 ? Math.round((boxPurchase / unitsPerBox) * 10000) / 10000 : 0);
    const unitSelling = isBottle ? boxSelling : (unitsPerBox > 0 ? Math.round((boxSelling / unitsPerBox) * 10000) / 10000 : 0);

    setFormData((prev) => {
      const isCarton = receivingUnit === "CARTON";
      const totalBoxes = isCarton ? (prev.cartonQuantity * boxesPer) : prev.boxesReceived;
      const totalUnits = isBottle ? totalBoxes : totalBoxes * unitsPerBox;
      const totalCost = Math.round(totalBoxes * boxPurchase * 100) / 100;
      return {
        ...prev,
        batchNumber: b.batchNumber || prev.batchNumber,
        expiryDate: b.expiryDate ? new Date(b.expiryDate).toISOString().slice(0, 10) : prev.expiryDate,
        mfgDate: b.mfgDate ? new Date(b.mfgDate).toISOString().slice(0, 10) : prev.mfgDate,
        shelfLocation: b.shelfLocation || prev.shelfLocation,
        supplierId: b.supplier?.id || b.supplierId || prev.supplierId,
        boxesPerCarton: boxesPer,
        stripsPerBox: strips,
        tabletsPerStrip: tabs,
        boxPurchasePrice: boxPurchase,
        boxSellingPrice: boxSelling,
        unitPurchasePrice: unitPurchase,
        unitSellingPrice: unitSelling,
        quantity: totalUnits,
        boxQuantity: totalBoxes,
        paidAmount: totalCost,
      };
    });
  };

  const handleReceivingUnitToggle = (unit: "CARTON" | "BOX") => {
    setReceivingUnit(unit);
    const model = getPackagingModel(selectedProduct, formData.packageType);
    const isBottle = model === "BOTTLE";
    const isPiece = model === "PIECE";
    const isVial = model === "VIAL";
    const isTablet = model === "TABLET";

    const itemsPerBox = formData.stripsPerBox || (isBottle ? 12 : isPiece ? 1 : 10);
    const strips = isTablet ? (formData.stripsPerBox || 10) : (isBottle ? 1 : itemsPerBox);
    const tabs = isTablet ? (formData.tabletsPerStrip || 10) : 1;
    const unitsPerBox = isBottle ? 1 : (isTablet ? (strips * tabs) : itemsPerBox);
    const boxesPer = formData.boxesPerCarton || (isBottle ? 12 : 10);

    let totalBoxes = 0;
    if (unit === "CARTON") {
      const cartons = formData.cartonQuantity || (isBottle ? 2 : 5);
      totalBoxes = cartons * boxesPer;
    } else {
      totalBoxes = formData.boxesReceived || (isBottle ? 10 : (isPiece ? 20 : 7));
    }

    const total = isBottle ? totalBoxes : totalBoxes * unitsPerBox;
    const totalCost = Math.round(totalBoxes * formData.boxPurchasePrice * 100) / 100;
    setFormData((prev) => ({
      ...prev,
      boxQuantity: totalBoxes,
      quantity: total,
      paidAmount: totalCost,
    }));
  };

  const handleCartonChange = (cartons: number, boxesPer: number) => {
    const model = getPackagingModel(selectedProduct, formData.packageType);
    const isBottle = model === "BOTTLE";
    const isPiece = model === "PIECE";
    const isVial = model === "VIAL";
    const isTablet = model === "TABLET";

    const itemsPerBox = formData.stripsPerBox || (isBottle ? 12 : isPiece ? 1 : 10);
    const strips = isTablet ? (formData.stripsPerBox || 10) : (isBottle ? 1 : itemsPerBox);
    const tabs = isTablet ? (formData.tabletsPerStrip || 10) : 1;
    const unitsPerBox = isBottle ? 1 : (isTablet ? (strips * tabs) : itemsPerBox);

    const totalBoxes = cartons * boxesPer;
    const totalUnits = isBottle ? totalBoxes : totalBoxes * unitsPerBox;
    const totalCost = Math.round(totalBoxes * formData.boxPurchasePrice * 100) / 100;

    setFormData((prev) => ({
      ...prev,
      cartonQuantity: cartons,
      boxesPerCarton: boxesPer,
      boxQuantity: totalBoxes,
      quantity: totalUnits,
      paidAmount: totalCost,
    }));
  };

  const handleBoxesReceivedChange = (looseBoxes: number) => {
    const model = getPackagingModel(selectedProduct, formData.packageType);
    const isBottle = model === "BOTTLE";
    const isPiece = model === "PIECE";
    const isVial = model === "VIAL";
    const isTablet = model === "TABLET";

    const itemsPerBox = formData.stripsPerBox || (isBottle ? 12 : isPiece ? 1 : 10);
    const strips = isTablet ? (formData.stripsPerBox || 10) : (isBottle ? 1 : itemsPerBox);
    const tabs = isTablet ? (formData.tabletsPerStrip || 10) : 1;
    const unitsPerBox = isBottle ? 1 : (isTablet ? (strips * tabs) : itemsPerBox);

    const totalBoxes = looseBoxes;
    const totalUnits = isBottle ? totalBoxes : totalBoxes * unitsPerBox;
    const totalCost = Math.round(totalBoxes * formData.boxPurchasePrice * 100) / 100;

    setFormData((prev) => ({
      ...prev,
      boxesReceived: looseBoxes,
      boxQuantity: totalBoxes,
      quantity: totalUnits,
      paidAmount: totalCost,
    }));
  };

  const handleBoxPriceChange = (boxPurchase: number, boxSelling: number) => {
    const model = getPackagingModel(selectedProduct, formData.packageType);
    const isBottle = model === "BOTTLE";
    const isPiece = model === "PIECE";
    const isVial = model === "VIAL";
    const isTablet = model === "TABLET";

    const itemsPerBox = formData.stripsPerBox || (isBottle ? 12 : isPiece ? 1 : 10);
    const strips = isTablet ? (formData.stripsPerBox || 10) : (isBottle ? 1 : itemsPerBox);
    const tabs = isTablet ? (formData.tabletsPerStrip || 10) : 1;
    const unitsPerBox = isBottle ? 1 : (isTablet ? (strips * tabs) : itemsPerBox);

    const unitPurchase = isBottle ? boxPurchase : (unitsPerBox > 0 ? Math.round((boxPurchase / unitsPerBox) * 10000) / 10000 : 0);
    const unitSelling = isBottle ? boxSelling : (unitsPerBox > 0 ? Math.round((boxSelling / unitsPerBox) * 10000) / 10000 : 0);
    const totalBoxes = receivingUnit === "CARTON" ? (formData.cartonQuantity * formData.boxesPerCarton) : formData.boxesReceived;
    const totalCost = Math.round(totalBoxes * boxPurchase * 100) / 100;

    setFormData((prev) => ({
      ...prev,
      boxPurchasePrice: boxPurchase,
      boxSellingPrice: boxSelling,
      unitPurchasePrice: unitPurchase,
      unitSellingPrice: unitSelling,
      paidAmount: totalCost,
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

      const model = getPackagingModel(selectedProduct, formData.packageType);
      const isBottle = model === "BOTTLE";
      const isPiece = model === "PIECE";
      const isVial = model === "VIAL";
      const isTablet = model === "TABLET";

      const totalBoxes = receivingUnit === "CARTON" ? (Number(formData.cartonQuantity) * Number(formData.boxesPerCarton)) : Number(formData.boxesReceived);
      const itemsPerBox = Number(formData.stripsPerBox) || (isBottle ? 1 : isPiece ? 1 : 10);
      const strips = isTablet ? (Number(formData.stripsPerBox) || 10) : (isBottle ? 1 : itemsPerBox);
      const tablets = isTablet ? (Number(formData.tabletsPerStrip) || 10) : 1;
      const unitsPerBox = isBottle ? 1 : (isTablet ? (strips * tablets) : itemsPerBox);
      const finalQuantity = isBottle ? totalBoxes : totalBoxes * unitsPerBox;

      const payload = {
        branchId: selectedBranchId,
        productId: formData.productId,
        supplierId: formData.supplierId || null,
        contactPersonId: formData.contactPersonId || null,
        contactPersonName: formData.contactPersonName || null,
        batchNumber: formData.batchNumber?.trim() || null,
        barcode: formData.barcode?.trim() || null,
        receivedDate: formData.receivedDate ? new Date(formData.receivedDate).toISOString() : new Date().toISOString(),
        mfgDate: formData.mfgDate ? new Date(formData.mfgDate).toISOString() : null,
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : null,
        packageType: model,
        receivingUnit,
        cartonsReceived: receivingUnit === "CARTON" ? Number(formData.cartonQuantity) || 0 : 0,
        boxesReceived: receivingUnit === "BOX" ? Number(formData.boxesReceived) || 0 : totalBoxes,
        cartonQuantity: receivingUnit === "CARTON" ? Number(formData.cartonQuantity) || null : null,
        boxesPerCarton: Number(formData.boxesPerCarton) || null,
        boxQuantity: totalBoxes,
        stripsPerBox: strips,
        tabletsPerStrip: tablets,
        quantity: finalQuantity,
        boxPurchasePrice: Number(formData.boxPurchasePrice),
        boxSellingPrice: Number(formData.boxSellingPrice),
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

  const packagingModel = getPackagingModel(selectedProduct, formData.packageType);
  const isBottle = packagingModel === "BOTTLE";
  const isPiece = packagingModel === "PIECE";
  const isVial = packagingModel === "VIAL";
  const isTablet = packagingModel === "TABLET";

  const totalBoxes = receivingUnit === "CARTON" ? (formData.cartonQuantity * formData.boxesPerCarton) : formData.boxesReceived;
  const totalCost = Math.round(totalBoxes * formData.boxPurchasePrice * 100) / 100;
  const dueAmount = Math.max(0, Math.round((totalCost - formData.paidAmount) * 100) / 100);

  const piecesPerBox = isPiece ? (selectedProduct?.stripsPerBox || formData.stripsPerBox || 1) : 1;
  const vialsPerBox = isVial ? (selectedProduct?.stripsPerBox || formData.stripsPerBox || 10) : 1;

  const strips = isTablet ? (formData.stripsPerBox || 10) : (isPiece ? piecesPerBox : (isVial ? vialsPerBox : 1));
  const tablets = isTablet ? (formData.tabletsPerStrip || 10) : 1;
  const tabletsPerBox = strips * tablets;

  const stripPurchase = strips > 0 ? formData.boxPurchasePrice / strips : 0;
  const tabletPurchase = tabletsPerBox > 0 ? formData.boxPurchasePrice / tabletsPerBox : 0;
  const stripSelling = strips > 0 ? formData.boxSellingPrice / strips : 0;
  const tabletSelling = tabletsPerBox > 0 ? formData.boxSellingPrice / tabletsPerBox : 0;

  const piecePurchase = piecesPerBox > 0 ? formData.boxPurchasePrice / piecesPerBox : 0;
  const pieceSelling = piecesPerBox > 0 ? formData.boxSellingPrice / piecesPerBox : 0;

  const vialPurchase = vialsPerBox > 0 ? formData.boxPurchasePrice / vialsPerBox : 0;
  const vialSelling = vialsPerBox > 0 ? formData.boxSellingPrice / vialsPerBox : 0;

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
            <div className="p-3.5 bg-brand-primary/5 dark:bg-brand-primary/10 border border-brand-primary/20 rounded-xl text-xs flex flex-wrap items-center justify-between gap-4 text-slate-700 dark:text-slate-300">
              <div className="flex flex-wrap items-center gap-4">
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

              {/* Packaging Model Tag */}
              <div className="flex items-center gap-1.5">
                {packagingModel === "TABLET" && (
                  <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 px-2.5 py-1 rounded-lg font-bold text-[11px]">
                    <Pill className="h-3.5 w-3.5" />
                    Strip & Tablet (1 Box = {strips} Strips × {tablets} Tabs)
                  </span>
                )}
                {packagingModel === "BOTTLE" && (
                  <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-950/50 border border-blue-300 dark:border-blue-800 px-2.5 py-1 rounded-lg font-bold text-[11px]">
                    <Droplets className="h-3.5 w-3.5" />
                    Bottle / Liquid (1 Carton = {formData.boxesPerCarton} Bottles)
                  </span>
                )}
                {packagingModel === "PIECE" && (
                  <span className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 bg-purple-100/70 dark:bg-purple-950/50 border border-purple-300 dark:border-purple-800 px-2.5 py-1 rounded-lg font-bold text-[11px]">
                    <Package className="h-3.5 w-3.5" />
                    Piece / Unit (1 Box/Pack = {piecesPerBox} Pieces)
                  </span>
                )}
                {packagingModel === "VIAL" && (
                  <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 px-2.5 py-1 rounded-lg font-bold text-[11px]">
                    <Syringe className="h-3.5 w-3.5" />
                    Injection / Vial (1 Commercial Box = {vialsPerBox} Vials)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Batch Number, Expiry & Supplier */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="font-black text-sm text-slate-900 dark:text-white flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-brand-primary" />
              2. Batch Number, Expiry Date & Supplier
            </span>
            {selectedProduct && existingBatches.length > 0 && (
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setBatchMode("NEW");
                    setSelectedExistingBatch(null);
                    setFormData((prev) => ({
                      ...prev,
                      batchNumber: `BAT-${Date.now().toString().slice(-6)}`,
                    }));
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    batchMode === "NEW"
                      ? "bg-white dark:bg-slate-700 text-brand-primary shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  + New Batch
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBatchMode("EXISTING");
                    if (existingBatches.length > 0) {
                      handleSelectExistingBatch(existingBatches[0].id);
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    batchMode === "EXISTING"
                      ? "bg-white dark:bg-slate-700 text-brand-primary shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  Existing Batch ({existingBatches.length})
                </button>
              </div>
            )}
          </div>

          {batchMode === "EXISTING" && existingBatches.length > 0 && (
            <div className="p-3.5 bg-blue-50/70 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-blue-900 dark:text-blue-300">
                Choose Existing Batch to Receive Into *
              </label>
              <select
                value={selectedExistingBatch?.id || ""}
                onChange={(e) => handleSelectExistingBatch(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
              >
                {existingBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    Batch: {b.batchNumber || "Unassigned"} • In Stock: {b.quantity} {selectedProduct?.unit || "units"} • Expiry: {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : "—"}
                  </option>
                ))}
              </select>
              {selectedExistingBatch && (
                <div className="text-[11px] text-blue-800 dark:text-blue-300 font-medium">
                  Current Batch Stock: <span className="font-bold">{selectedExistingBatch.cartonQuantity || 0} Full Cartons</span> ({((selectedExistingBatch.cartonQuantity || 0) * (selectedExistingBatch.boxesPerCarton || 10))} Boxes) + <span className="font-bold">{selectedExistingBatch.remainingLooseBoxes ?? selectedExistingBatch.looseBoxesReceived ?? 0} Loose Boxes</span>.
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Batch Number *</span>
                {batchMode === "NEW" && (
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
                )}
              </label>
              <input
                type="text"
                required
                value={formData.batchNumber}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                readOnly={batchMode === "EXISTING"}
                className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono font-bold outline-none ${
                  batchMode === "EXISTING"
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed"
                    : "bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700"
                }`}
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
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Contact Person / SR</span>
                {loadingContacts && <Loader2 className="h-3 w-3 animate-spin text-brand-primary" />}
              </label>
              <select
                value={formData.contactPersonId}
                onChange={(e) => {
                  const cId = e.target.value;
                  const found = supplierContacts.find((c) => c.id === cId);
                  setFormData({
                    ...formData,
                    contactPersonId: cId,
                    contactPersonName: found ? found.name : "",
                  });
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
              >
                <option value="">Direct / General (No SR)</option>
                {supplierContacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.designation ? `(${c.designation})` : ""} {c.phone ? `- ${c.phone}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Received Date *</span>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      receivedDate: new Date().toISOString().slice(0, 10),
                    }))
                  }
                  className="text-[11px] text-brand-primary hover:underline font-bold"
                >
                  Today
                </button>
              </label>
              <input
                type="date"
                required
                value={formData.receivedDate}
                onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
              />
            </div>

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
                  placeholder="Scan or enter barcode"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Packaging Quantity Hierarchy */}
        {isBottle ? (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="font-black text-sm text-slate-900 dark:text-white flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
              <span className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-brand-primary" />
                3. Receiving Unit & Packaging Breakdown (Syrup / Bottle)
              </span>
              <div className="flex items-center gap-2 flex-wrap text-xs font-black">
                <span className="text-brand-primary bg-brand-primary/10 px-3 py-1 rounded-full">
                  {receivingUnit === "CARTON" ? `Total Cartons: ${formData.cartonQuantity} Cartons` : "0 Cartons (Loose)"}
                </span>
                <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full">
                  Total Bottles: {totalBoxes.toLocaleString()} Bottles
                </span>
              </div>
            </div>

            {/* Receiving Unit Selector */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">How is this syrup/bottle stock being received?</p>
                <p className="text-[11px] text-slate-500">Choose Carton for whole carton shipments, or Bottle for loose/individual bottles</p>
              </div>
              <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleReceivingUnitToggle("CARTON")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    receivingUnit === "CARTON"
                      ? "bg-white dark:bg-slate-900 text-brand-primary shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  }`}
                >
                  <Package className="h-3.5 w-3.5" />
                  Carton Receiving (কার্টুন)
                </button>
                <button
                  type="button"
                  onClick={() => handleReceivingUnitToggle("BOX")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    receivingUnit === "BOX"
                      ? "bg-white dark:bg-slate-900 text-brand-primary shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  }`}
                >
                  <Boxes className="h-3.5 w-3.5" />
                  Bottle Receiving (লুজ বোতল)
                </button>
              </div>
            </div>

            {/* Packaging Configuration Notice */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  <strong>Product Packaging (Read-Only):</strong> Bottles per Carton is locked to this product's catalog configuration.
                </span>
              </span>
              <span className="font-bold text-brand-primary font-mono text-[11px]">
                1 Master Carton = {formData.boxesPerCarton} Bottles
              </span>
            </div>

            {receivingUnit === "CARTON" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cartons Received *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.cartonQuantity}
                    onChange={(e) => {
                      const c = parseInt(e.target.value) || 0;
                      handleCartonChange(c, formData.boxesPerCarton);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                  />
                  <div className="text-[10px] text-slate-400 mt-1">Whole sealed master cartons received</div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                    <span>Bottles per Carton</span>
                    <span className="text-[9px] text-slate-400 font-normal flex items-center gap-0.5">
                      <Lock className="h-2.5 w-2.5" /> Read-Only
                    </span>
                  </label>
                  <div className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>{formData.boxesPerCarton} Bottles</span>
                    <span className="text-[10px] text-slate-400 font-mono">per Carton</span>
                  </div>
                  <div className="text-[10px] text-brand-primary font-bold mt-1">
                    = {formData.cartonQuantity * formData.boxesPerCarton} Total Bottles inside cartons
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Bottles Received (Loose) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.boxesReceived}
                    onChange={(e) => {
                      const b = parseInt(e.target.value) || 0;
                      handleBoxesReceivedChange(b);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                  />
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1">
                    Loose / Standalone Bottles (without master carton)
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                    <span>Carton Reference</span>
                    <span className="text-[9px] text-slate-400 font-normal flex items-center gap-0.5">
                      <Lock className="h-2.5 w-2.5" /> Product Standard
                    </span>
                  </label>
                  <div className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>{formData.boxesPerCarton} Bottles</span>
                    <span className="text-[10px] text-slate-400 font-mono">1 Standard Carton</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Direct stock: {formData.boxesReceived} bottles
                  </div>
                </div>
              </div>
            )}

            {/* Calculated Breakdown Summary Banner for Bottles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Cartons</span>
                <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                  {receivingUnit === "CARTON" ? `${formData.cartonQuantity} Cartons` : "0 (Loose)"}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {receivingUnit === "CARTON" ? `${formData.cartonQuantity} master cartons` : "Loose bottle intake"}
                </span>
              </div>
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 rounded-xl">
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">Bottles per Carton</span>
                <span className="text-lg font-black text-indigo-700 dark:text-indigo-300 font-mono">
                  {formData.boxesPerCarton} Bottles
                </span>
                <span className="text-[10px] text-indigo-500/80 block mt-0.5">
                  Standard carton capacity
                </span>
              </div>
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Total Bottles Inward</span>
                <span className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono">
                  {totalBoxes.toLocaleString()} Bottles
                </span>
                <span className="text-[10px] text-emerald-600/80 block mt-0.5">
                  {receivingUnit === "CARTON" ? `${formData.cartonQuantity} cartons × ${formData.boxesPerCarton} bottles` : `${formData.boxesReceived} loose bottles`}
                </span>
              </div>
            </div>

            {/* Same Batch Support Breakdown Preview Banner for Bottles */}
            <div className="p-4 bg-gradient-to-r from-slate-50 to-indigo-50/40 dark:from-slate-800/50 dark:to-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-indigo-500" />
                  Receiving Breakdown Preview:
                </span>
                <span className="text-indigo-600 dark:text-indigo-400 font-mono">
                  {receivingUnit === "CARTON"
                    ? `${formData.cartonQuantity} Cartons × ${formData.boxesPerCarton} Bottles = ${totalBoxes} Bottles`
                    : `${formData.boxesReceived} Loose Bottles (0 Cartons)`}
                </span>
              </div>

              {selectedExistingBatch ? (
                <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/30 text-xs">
                  <p className="text-slate-600 dark:text-slate-400">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Existing Batch {selectedExistingBatch.batchNumber}:</span>{" "}
                    {selectedExistingBatch.cartonQuantity || 0} Full Cartons ({((selectedExistingBatch.cartonQuantity || 0) * (formData.boxesPerCarton || 12))} Bottles) + {selectedExistingBatch.remainingLooseBoxes ?? selectedExistingBatch.looseBoxesReceived ?? 0} Loose Bottles.
                  </p>
                  <p className="text-indigo-700 dark:text-indigo-300 font-bold mt-1">
                    👉 After this {receivingUnit === "CARTON" ? `${formData.cartonQuantity} Carton` : `${formData.boxesReceived} Loose Bottle`} intake, Batch Total will be:{" "}
                    <span className="underline">
                      {(selectedExistingBatch.cartonQuantity || 0) + (receivingUnit === "CARTON" ? formData.cartonQuantity : 0)} Full Cartons
                    </span>{" "}
                    ({((selectedExistingBatch.cartonQuantity || 0) + (receivingUnit === "CARTON" ? formData.cartonQuantity : 0)) * (formData.boxesPerCarton || 12)} Bottles inside Cartons) +{" "}
                    <span className="underline">
                      {(selectedExistingBatch.remainingLooseBoxes ?? selectedExistingBatch.looseBoxesReceived ?? 0) + (receivingUnit === "BOX" ? formData.boxesReceived : 0)} Loose Bottles
                    </span>{" "}
                    = <span className="font-black text-indigo-800 dark:text-indigo-200">{
                      (((selectedExistingBatch.cartonQuantity || 0) + (receivingUnit === "CARTON" ? formData.cartonQuantity : 0)) * (formData.boxesPerCarton || 12)) +
                      ((selectedExistingBatch.remainingLooseBoxes ?? selectedExistingBatch.looseBoxesReceived ?? 0) + (receivingUnit === "BOX" ? formData.boxesReceived : 0))
                    } Total Equivalent Bottles</span>.
                  </p>
                </div>
              ) : (
                <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/30 text-xs text-slate-500">
                  {receivingUnit === "CARTON" ? (
                    <span>
                      Will record <span className="font-bold text-slate-800 dark:text-slate-200">{formData.cartonQuantity} Full Cartons</span> ({totalBoxes} Bottles) and 0 Loose Bottles.
                    </span>
                  ) : (
                    <span>
                      Will record <span className="font-bold text-slate-800 dark:text-slate-200">{formData.boxesReceived} Loose Bottles</span> (0 Cartons).
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : isPiece ? (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="font-black text-sm text-slate-900 dark:text-white flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
              <span className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-600" />
                3. Receiving Unit & Piece / Unit Breakdown
              </span>
              <div className="flex items-center gap-2 flex-wrap text-xs font-black">
                <span className="text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-3 py-1 rounded-full">
                  Total Boxes / Packs: {totalBoxes.toLocaleString()} Boxes
                </span>
                <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full">
                  Total Pieces: {formData.quantity.toLocaleString()} Pieces
                </span>
              </div>
            </div>

            {/* Receiving Unit Selector */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">How is this item being received?</p>
                <p className="text-[11px] text-slate-500">Choose Carton for master carton shipments, or Box / Pack for loose boxes</p>
              </div>
              <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleReceivingUnitToggle("CARTON")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    receivingUnit === "CARTON"
                      ? "bg-white dark:bg-slate-900 text-purple-600 shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  }`}
                >
                  <Package className="h-3.5 w-3.5" />
                  Carton Receiving (মাস্টার কার্টুন)
                </button>
                <button
                  type="button"
                  onClick={() => handleReceivingUnitToggle("BOX")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    receivingUnit === "BOX"
                      ? "bg-white dark:bg-slate-900 text-purple-600 shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  }`}
                >
                  <Boxes className="h-3.5 w-3.5" />
                  Box / Pack Receiving (লুজ বক্স / প্যাকেট)
                </button>
              </div>
            </div>

            {/* Packaging Configuration Notice */}
            <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 rounded-xl flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-purple-500" />
                <span>
                  <strong>Product Packaging (Read-Only):</strong> Pieces per Box is locked to this product's catalog configuration.
                </span>
              </span>
              <span className="font-bold text-purple-700 dark:text-purple-300 font-mono text-[11px]">
                1 Box / Pack = {piecesPerBox} Pieces
              </span>
            </div>

            {receivingUnit === "CARTON" ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Master Cartons Received *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.cartonQuantity}
                    onChange={(e) => {
                      const c = parseInt(e.target.value) || 0;
                      handleCartonChange(c, formData.boxesPerCarton);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                  />
                  <div className="text-[10px] text-slate-400 mt-1">Whole sealed cartons received</div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Boxes / Packs per Carton *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.boxesPerCarton}
                    onChange={(e) => {
                      const b = parseInt(e.target.value) || 1;
                      handleCartonChange(formData.cartonQuantity, b);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                  />
                  <div className="text-[10px] text-purple-600 dark:text-purple-400 font-bold mt-1">
                    = {formData.cartonQuantity * formData.boxesPerCarton} Total Boxes inside cartons
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                    <span>Pieces per Box / Pack</span>
                    <span className="text-[9px] text-slate-400 font-normal flex items-center gap-0.5">
                      <Lock className="h-2.5 w-2.5" /> Read-Only
                    </span>
                  </label>
                  <div className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>{piecesPerBox} Pieces</span>
                    <span className="text-[10px] text-slate-400 font-mono">per Box</span>
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                    = {(formData.cartonQuantity * formData.boxesPerCarton * piecesPerBox).toLocaleString()} Total Pieces
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Boxes / Packs Received (Loose) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.boxesReceived}
                    onChange={(e) => {
                      const b = parseInt(e.target.value) || 0;
                      handleBoxesReceivedChange(b);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                  />
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1">
                    Loose / Standalone Boxes or Packs
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                    <span>Pieces per Box / Pack</span>
                    <span className="text-[9px] text-slate-400 font-normal flex items-center gap-0.5">
                      <Lock className="h-2.5 w-2.5" /> Read-Only
                    </span>
                  </label>
                  <div className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>{piecesPerBox} Pieces</span>
                    <span className="text-[10px] text-slate-400 font-mono">per Box</span>
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                    = {(formData.boxesReceived * piecesPerBox).toLocaleString()} Total Pieces
                  </div>
                </div>
              </div>
            )}

            {/* Calculated Breakdown Summary Banner for Pieces */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Boxes / Packs</span>
                <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                  {totalBoxes.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {receivingUnit === "CARTON" ? `${formData.cartonQuantity} cartons × ${formData.boxesPerCarton}` : `${formData.boxesReceived} loose boxes`}
                </span>
              </div>
              <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 rounded-xl">
                <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">Pieces per Box</span>
                <span className="text-lg font-black text-purple-700 dark:text-purple-300 font-mono">
                  {piecesPerBox.toLocaleString()} Pcs
                </span>
                <span className="text-[10px] text-purple-500 block mt-0.5">
                  Items in 1 commercial box
                </span>
              </div>
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Total Pieces Inward</span>
                <span className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono">
                  {formData.quantity.toLocaleString()} Pieces
                </span>
                <span className="text-[10px] text-emerald-600/80 block mt-0.5">
                  {totalBoxes} boxes × {piecesPerBox} pieces/box
                </span>
              </div>
            </div>

            {/* Same Batch Support Breakdown Preview Banner for Pieces */}
            <div className="p-4 bg-gradient-to-r from-slate-50 to-purple-50/40 dark:from-slate-800/50 dark:to-purple-950/20 border border-purple-100 dark:border-purple-900/30 rounded-xl space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-purple-500" />
                  Receiving Breakdown Preview:
                </span>
                <span className="text-purple-600 dark:text-purple-400 font-mono">
                  {receivingUnit === "CARTON"
                    ? `${formData.cartonQuantity} Cartons × ${formData.boxesPerCarton} Boxes = ${totalBoxes} Boxes (${formData.quantity.toLocaleString()} Pieces)`
                    : `${formData.boxesReceived} Loose Boxes = ${formData.quantity.toLocaleString()} Pieces (0 Cartons)`}
                </span>
              </div>
            </div>
          </div>
        ) : isVial ? (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="font-black text-sm text-slate-900 dark:text-white flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
              <span className="flex items-center gap-2">
                <Syringe className="h-4 w-4 text-amber-600" />
                3. Receiving Unit & Injection / Vial Breakdown
              </span>
              <div className="flex items-center gap-2 flex-wrap text-xs font-black">
                <span className="text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full">
                  Total Boxes: {totalBoxes.toLocaleString()} Boxes
                </span>
                <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full">
                  Total Vials: {formData.quantity.toLocaleString()} Vials
                </span>
              </div>
            </div>

            {/* Receiving Unit Selector */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">How is this injectable stock being received?</p>
                <p className="text-[11px] text-slate-500">Choose Carton for master carton shipments, or Box for loose commercial boxes</p>
              </div>
              <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleReceivingUnitToggle("CARTON")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    receivingUnit === "CARTON"
                      ? "bg-white dark:bg-slate-900 text-amber-600 shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  }`}
                >
                  <Package className="h-3.5 w-3.5" />
                  Carton Receiving (মাস্টার কার্টুন)
                </button>
                <button
                  type="button"
                  onClick={() => handleReceivingUnitToggle("BOX")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    receivingUnit === "BOX"
                      ? "bg-white dark:bg-slate-900 text-amber-600 shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  }`}
                >
                  <Boxes className="h-3.5 w-3.5" />
                  Box Receiving (লুজ বক্স)
                </button>
              </div>
            </div>

            {/* Packaging Configuration Notice */}
            <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-xl flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-amber-500" />
                <span>
                  <strong>Product Packaging (Read-Only):</strong> Vials / Ampoules per Box is locked to this product's catalog configuration.
                </span>
              </span>
              <span className="font-bold text-amber-700 dark:text-amber-300 font-mono text-[11px]">
                1 Commercial Box = {vialsPerBox} Vials / Ampoules
              </span>
            </div>

            {receivingUnit === "CARTON" ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Master Cartons Received *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.cartonQuantity}
                    onChange={(e) => {
                      const c = parseInt(e.target.value) || 0;
                      handleCartonChange(c, formData.boxesPerCarton);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                  />
                  <div className="text-[10px] text-slate-400 mt-1">Whole sealed cartons received</div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Boxes per Carton *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.boxesPerCarton}
                    onChange={(e) => {
                      const b = parseInt(e.target.value) || 1;
                      handleCartonChange(formData.cartonQuantity, b);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                  />
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1">
                    = {formData.cartonQuantity * formData.boxesPerCarton} Total Boxes inside cartons
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                    <span>Vials per Box</span>
                    <span className="text-[9px] text-slate-400 font-normal flex items-center gap-0.5">
                      <Lock className="h-2.5 w-2.5" /> Read-Only
                    </span>
                  </label>
                  <div className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>{vialsPerBox} Vials</span>
                    <span className="text-[10px] text-slate-400 font-mono">per Box</span>
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                    = {(formData.cartonQuantity * formData.boxesPerCarton * vialsPerBox).toLocaleString()} Total Vials
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Commercial Boxes Received (Loose) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.boxesReceived}
                    onChange={(e) => {
                      const b = parseInt(e.target.value) || 0;
                      handleBoxesReceivedChange(b);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                  />
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1">
                    Loose / Standalone Commercial Boxes
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                    <span>Vials / Ampoules per Box</span>
                    <span className="text-[9px] text-slate-400 font-normal flex items-center gap-0.5">
                      <Lock className="h-2.5 w-2.5" /> Read-Only
                    </span>
                  </label>
                  <div className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>{vialsPerBox} Vials</span>
                    <span className="text-[10px] text-slate-400 font-mono">per Box</span>
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                    = {(formData.boxesReceived * vialsPerBox).toLocaleString()} Total Vials
                  </div>
                </div>
              </div>
            )}

            {/* Calculated Breakdown Summary Banner for Vials */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Commercial Boxes</span>
                <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                  {totalBoxes.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {receivingUnit === "CARTON" ? `${formData.cartonQuantity} cartons × ${formData.boxesPerCarton}` : `${formData.boxesReceived} loose boxes`}
                </span>
              </div>
              <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Vials per Box</span>
                <span className="text-lg font-black text-amber-700 dark:text-amber-300 font-mono">
                  {vialsPerBox.toLocaleString()} Vials
                </span>
                <span className="text-[10px] text-amber-500 block mt-0.5">
                  Injectables packed per box
                </span>
              </div>
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Total Vials Inward</span>
                <span className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono">
                  {formData.quantity.toLocaleString()} Vials
                </span>
                <span className="text-[10px] text-emerald-600/80 block mt-0.5">
                  {totalBoxes} boxes × {vialsPerBox} vials/box
                </span>
              </div>
            </div>

            {/* Same Batch Support Breakdown Preview Banner for Vials */}
            <div className="p-4 bg-gradient-to-r from-slate-50 to-amber-50/40 dark:from-slate-800/50 dark:to-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-amber-500" />
                  Receiving Breakdown Preview:
                </span>
                <span className="text-amber-600 dark:text-amber-400 font-mono">
                  {receivingUnit === "CARTON"
                    ? `${formData.cartonQuantity} Cartons × ${formData.boxesPerCarton} Boxes = ${totalBoxes} Boxes (${formData.quantity.toLocaleString()} Vials)`
                    : `${formData.boxesReceived} Loose Boxes = ${formData.quantity.toLocaleString()} Vials (0 Cartons)`}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="font-black text-sm text-slate-900 dark:text-white flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
              <span className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-brand-primary" />
                3. Receiving Unit & Packaging Hierarchy
              </span>
              <div className="flex items-center gap-2 flex-wrap text-xs font-black">
                <span className="text-brand-primary bg-brand-primary/10 px-3 py-1 rounded-full">
                  Total Boxes: {totalBoxes.toLocaleString()} Boxes
                </span>
                <span className="text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-full">
                  Total Strips: {(totalBoxes * strips).toLocaleString()} Strips
                </span>
                <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full">
                  Total Tablets: {formData.quantity.toLocaleString()} Tablets
                </span>
              </div>
            </div>

            {/* Receiving Unit Selector */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">How is this stock being received?</p>
                <p className="text-[11px] text-slate-500">Choose Carton for whole carton shipments, or Box for loose/standalone boxes</p>
              </div>
              <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleReceivingUnitToggle("CARTON")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    receivingUnit === "CARTON"
                      ? "bg-white dark:bg-slate-900 text-brand-primary shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  }`}
                >
                  <Package className="h-3.5 w-3.5" />
                  Carton Receiving
                </button>
                <button
                  type="button"
                  onClick={() => handleReceivingUnitToggle("BOX")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    receivingUnit === "BOX"
                      ? "bg-white dark:bg-slate-900 text-brand-primary shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  }`}
                >
                  <Boxes className="h-3.5 w-3.5" />
                  Box Receiving
                </button>
              </div>
            </div>

            {/* Packaging Configuration Notice */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  <strong>Product Packaging (Read-Only):</strong> Strips per Box and Tablets per Strip are locked to this product's catalog configuration.
                </span>
              </span>
              <span className="font-bold text-brand-primary font-mono text-[11px]">
                1 Box = {strips} Strips = {tabletsPerBox} Tablets
              </span>
            </div>

            {receivingUnit === "CARTON" ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cartons Received *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.cartonQuantity}
                    onChange={(e) => {
                      const c = parseInt(e.target.value) || 0;
                      handleCartonChange(c, formData.boxesPerCarton);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                  />
                  <div className="text-[10px] text-slate-400 mt-1">Whole sealed cartons received</div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Boxes per Carton *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.boxesPerCarton}
                    onChange={(e) => {
                      const b = parseInt(e.target.value) || 1;
                      handleCartonChange(formData.cartonQuantity, b);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                  />
                  <div className="text-[10px] text-brand-primary font-bold mt-1">
                    = {formData.cartonQuantity * formData.boxesPerCarton} Total Boxes inside cartons
                  </div>
                </div>

                {/* Read-Only Strips per Box */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                    <span>Strips per Box</span>
                    <span className="text-[9px] text-slate-400 font-normal flex items-center gap-0.5">
                      <Lock className="h-2.5 w-2.5" /> Read-Only
                    </span>
                  </label>
                  <div className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>{strips} Strips</span>
                    <span className="text-[10px] text-slate-400 font-mono">per Box</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Saved with product</div>
                </div>

                {/* Read-Only Tablets per Strip */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                    <span>Tablets per Strip</span>
                    <span className="text-[9px] text-slate-400 font-normal flex items-center gap-0.5">
                      <Lock className="h-2.5 w-2.5" /> Read-Only
                    </span>
                  </label>
                  <div className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>{tablets} Tablets</span>
                    <span className="text-[10px] text-slate-400 font-mono">per Strip</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Saved with product</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Boxes Received *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.boxesReceived}
                    onChange={(e) => {
                      const b = parseInt(e.target.value) || 0;
                      handleBoxesReceivedChange(b);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                  />
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1">
                    Loose / Standalone Boxes (not cartons)
                  </div>
                </div>

                {/* Read-Only Strips per Box */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                    <span>Strips per Box</span>
                    <span className="text-[9px] text-slate-400 font-normal flex items-center gap-0.5">
                      <Lock className="h-2.5 w-2.5" /> Read-Only
                    </span>
                  </label>
                  <div className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>{strips} Strips</span>
                    <span className="text-[10px] text-slate-400 font-mono">per Box</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Saved with product</div>
                </div>

                {/* Read-Only Tablets per Strip */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                    <span>Tablets per Strip</span>
                    <span className="text-[9px] text-slate-400 font-normal flex items-center gap-0.5">
                      <Lock className="h-2.5 w-2.5" /> Read-Only
                    </span>
                  </label>
                  <div className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>{tablets} Tablets</span>
                    <span className="text-[10px] text-slate-400 font-mono">per Strip</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Saved with product</div>
                </div>
              </div>
            )}

            {/* Calculated Breakdown Summary Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Boxes</span>
                <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                  {totalBoxes.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {receivingUnit === "CARTON" ? `${formData.cartonQuantity} cartons × ${formData.boxesPerCarton}` : `${formData.boxesReceived} loose boxes`}
                </span>
              </div>
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 rounded-xl">
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">Total Strips</span>
                <span className="text-lg font-black text-indigo-700 dark:text-indigo-300 font-mono">
                  {(totalBoxes * strips).toLocaleString()}
                </span>
                <span className="text-[10px] text-indigo-500/80 block mt-0.5">
                  {totalBoxes} boxes × {strips} strips/box
                </span>
              </div>
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Total Tablets</span>
                <span className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono">
                  {formData.quantity.toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-600/80 block mt-0.5">
                  {totalBoxes * strips} strips × {tablets} tabs/strip
                </span>
              </div>
            </div>

            {/* Same Batch Support Breakdown Preview Banner */}
            <div className="p-4 bg-gradient-to-r from-slate-50 to-indigo-50/40 dark:from-slate-800/50 dark:to-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-indigo-500" />
                  Receiving Breakdown Preview:
                </span>
                <span className="text-indigo-600 dark:text-indigo-400 font-mono">
                  {receivingUnit === "CARTON"
                    ? `${formData.cartonQuantity} Cartons × ${formData.boxesPerCarton} Boxes = ${formData.cartonQuantity * formData.boxesPerCarton} Boxes`
                    : `${formData.boxesReceived} Loose Boxes (0 Cartons)`}
                </span>
              </div>

              {selectedExistingBatch ? (
                <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/30 text-xs">
                  <p className="text-slate-600 dark:text-slate-400">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Existing Batch {selectedExistingBatch.batchNumber}:</span>{" "}
                    {selectedExistingBatch.cartonQuantity || 0} Full Cartons ({((selectedExistingBatch.cartonQuantity || 0) * (formData.boxesPerCarton || 10))} Boxes) + {selectedExistingBatch.remainingLooseBoxes ?? selectedExistingBatch.looseBoxesReceived ?? 0} Loose Boxes.
                  </p>
                  <p className="text-indigo-700 dark:text-indigo-300 font-bold mt-1">
                    👉 After this {receivingUnit === "CARTON" ? `${formData.cartonQuantity} Carton` : `${formData.boxesReceived} Loose Box`} intake, Batch Total will be:{" "}
                    <span className="underline">
                      {(selectedExistingBatch.cartonQuantity || 0) + (receivingUnit === "CARTON" ? formData.cartonQuantity : 0)} Full Cartons
                    </span>{" "}
                    ({((selectedExistingBatch.cartonQuantity || 0) + (receivingUnit === "CARTON" ? formData.cartonQuantity : 0)) * (formData.boxesPerCarton || 10)} Boxes inside Cartons) +{" "}
                    <span className="underline">
                      {(selectedExistingBatch.remainingLooseBoxes ?? selectedExistingBatch.looseBoxesReceived ?? 0) + (receivingUnit === "BOX" ? formData.boxesReceived : 0)} Loose Boxes
                    </span>{" "}
                    = <span className="font-black text-indigo-800 dark:text-indigo-200">{
                      (((selectedExistingBatch.cartonQuantity || 0) + (receivingUnit === "CARTON" ? formData.cartonQuantity : 0)) * (formData.boxesPerCarton || 10)) +
                      ((selectedExistingBatch.remainingLooseBoxes ?? selectedExistingBatch.looseBoxesReceived ?? 0) + (receivingUnit === "BOX" ? formData.boxesReceived : 0))
                    } Total Equivalent Boxes</span>.
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    (Loose boxes will remain separate and will NOT increase carton count or convert loose boxes into cartons.)
                  </p>
                </div>
              ) : (
                <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/30 text-xs text-slate-500">
                  {receivingUnit === "CARTON" ? (
                    <span>
                      Will record <span className="font-bold text-slate-800 dark:text-slate-200">{formData.cartonQuantity} Full Cartons</span> ({formData.cartonQuantity * formData.boxesPerCarton} Boxes) and 0 Loose Boxes.
                    </span>
                  ) : (
                    <span>
                      Will record <span className="font-bold text-slate-800 dark:text-slate-200">{formData.boxesReceived} Loose/Standalone Boxes</span> (0 Cartons).
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Purchase Financials & Selling Price */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="font-black text-sm text-slate-900 dark:text-white flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
            <span className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-brand-primary" />
              {isBottle
                ? "4. Financials & Pricing (Entered per Bottle)"
                : isPiece
                ? "4. Financials & Pricing (Entered per Box / Pack)"
                : isVial
                ? "4. Financials & Pricing (Entered per Commercial Box)"
                : "4. Financials & Pricing (Entered per Box)"}
            </span>
            <div className="text-xs">
              <span className="text-slate-400">Total Purchase: </span>
              <span className="font-black font-mono text-slate-900 dark:text-white">৳{totalCost.toFixed(2)}</span>
              <span className="text-[10px] text-slate-400 ml-1">
                ({totalBoxes} {isBottle ? "Bottles" : "Boxes"} × ৳{formData.boxPurchasePrice.toFixed(2)})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isBottle
                  ? "Purchase Price per Bottle (৳) *"
                  : isPiece
                  ? "Purchase Price per Box / Pack (৳) *"
                  : isVial
                  ? "Purchase Price per Box (৳) *"
                  : "Purchase Price per Box (৳) *"}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.boxPurchasePrice}
                onChange={(e) => {
                  const p = parseFloat(e.target.value) || 0;
                  handleBoxPriceChange(p, formData.boxSellingPrice);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
              />
              <div className="text-[10px] text-slate-400 mt-1">
                {isBottle
                  ? "Distributor invoice price per individual bottle"
                  : isPiece
                  ? `Distributor invoice cost for 1 full box (${piecesPerBox} pieces)`
                  : isVial
                  ? `Distributor invoice cost for 1 commercial box (${vialsPerBox} vials)`
                  : "Distributor invoice price per full box"}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isBottle
                  ? "Selling Price (MRP) per Bottle (৳) *"
                  : isPiece
                  ? "Selling Price (MRP) per Box / Pack (৳) *"
                  : isVial
                  ? "Selling Price (MRP) per Box (৳) *"
                  : "Selling Price per Box (৳) *"}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.boxSellingPrice}
                onChange={(e) => {
                  const s = parseFloat(e.target.value) || 0;
                  handleBoxPriceChange(formData.boxPurchasePrice, s);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-emerald-600"
              />
              <div className="text-[10px] text-slate-400 mt-1">
                {isBottle
                  ? "Counter MRP / retail price per bottle"
                  : isPiece
                  ? `Counter retail price (MRP) for 1 full box (${piecesPerBox} pieces)`
                  : isVial
                  ? `Counter retail price (MRP) for 1 full box (${vialsPerBox} vials)`
                  : "Counter MRP / retail price per full box"}
              </div>
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

          {/* Automatic Price Derivation Banner */}
          {isBottle ? (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-1.5">
                  <Calculator className="h-4 w-4 text-brand-primary" />
                  Automatic Bottle Pricing & Carton Equivalent:
                </span>
                {formData.boxSellingPrice > formData.boxPurchasePrice && (
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full">
                    Profit Margin: ৳{(formData.boxSellingPrice - formData.boxPurchasePrice).toFixed(2)} / Bottle ({formData.boxSellingPrice > 0 ? Math.round(((formData.boxSellingPrice - formData.boxPurchasePrice) / formData.boxSellingPrice) * 100) : 0}%)
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="text-[11px] font-bold text-slate-400">Purchase Price Flow</div>
                  <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                    ৳{formData.boxPurchasePrice.toFixed(2)} / Bottle
                    <span className="text-slate-400 font-normal"> → </span>
                    <span className="text-brand-primary font-black">1 Carton ({formData.boxesPerCarton} Bottles) = ৳{(formData.boxPurchasePrice * formData.boxesPerCarton).toFixed(2)}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Distributor invoice cost per bottle & full carton equivalent
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="text-[11px] font-bold text-slate-400">Selling Price Flow (MRP)</div>
                  <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ৳{formData.boxSellingPrice.toFixed(2)} / Bottle
                    <span className="text-slate-400 font-normal"> → </span>
                    <span className="font-black">1 Carton ({formData.boxesPerCarton} Bottles) = ৳{(formData.boxSellingPrice * formData.boxesPerCarton).toFixed(2)}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Counter retail price (MRP) per bottle & full carton equivalent
                  </div>
                </div>
              </div>
            </div>
          ) : isPiece ? (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-1.5">
                  <Calculator className="h-4 w-4 text-purple-600" />
                  Automatic Piece / Unit Pricing & Box Derivation:
                </span>
                {formData.boxSellingPrice > formData.boxPurchasePrice && (
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full">
                    Profit Margin: ৳{(formData.boxSellingPrice - formData.boxPurchasePrice).toFixed(2)} / Box (৳{(pieceSelling - piecePurchase).toFixed(2)} / Piece) ({formData.boxSellingPrice > 0 ? Math.round(((formData.boxSellingPrice - formData.boxPurchasePrice) / formData.boxSellingPrice) * 100) : 0}%)
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="text-[11px] font-bold text-slate-400">Purchase Price Flow</div>
                  <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                    ৳{formData.boxPurchasePrice.toFixed(2)} / Box
                    <span className="text-slate-400 font-normal"> → </span>
                    <span className="text-purple-600 font-black">৳{piecePurchase.toFixed(2)} / Piece</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    1 Box / Pack = {piecesPerBox} Pieces (Unit purchase cost derived)
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="text-[11px] font-bold text-slate-400">Selling Price Flow (MRP)</div>
                  <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ৳{formData.boxSellingPrice.toFixed(2)} / Box
                    <span className="text-slate-400 font-normal"> → </span>
                    <span className="font-black">৳{pieceSelling.toFixed(2)} / Piece</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    1 Box / Pack = {piecesPerBox} Pieces (Counter retail MRP per piece derived)
                  </div>
                </div>
              </div>
            </div>
          ) : isVial ? (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-1.5">
                  <Calculator className="h-4 w-4 text-amber-600" />
                  Automatic Injection / Vial Pricing & Box Derivation:
                </span>
                {formData.boxSellingPrice > formData.boxPurchasePrice && (
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full">
                    Profit Margin: ৳{(formData.boxSellingPrice - formData.boxPurchasePrice).toFixed(2)} / Box (৳{(vialSelling - vialPurchase).toFixed(2)} / Vial) ({formData.boxSellingPrice > 0 ? Math.round(((formData.boxSellingPrice - formData.boxPurchasePrice) / formData.boxSellingPrice) * 100) : 0}%)
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="text-[11px] font-bold text-slate-400">Purchase Price Flow</div>
                  <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                    ৳{formData.boxPurchasePrice.toFixed(2)} / Box
                    <span className="text-slate-400 font-normal"> → </span>
                    <span className="text-amber-600 font-black">৳{vialPurchase.toFixed(2)} / Vial</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    1 Commercial Box = {vialsPerBox} Vials / Ampoules (Unit purchase cost derived)
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="text-[11px] font-bold text-slate-400">Selling Price Flow (MRP)</div>
                  <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ৳{formData.boxSellingPrice.toFixed(2)} / Box
                    <span className="text-slate-400 font-normal"> → </span>
                    <span className="font-black">৳{vialSelling.toFixed(2)} / Vial</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    1 Commercial Box = {vialsPerBox} Vials / Ampoules (Counter retail MRP per vial derived)
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Calculator className="h-4 w-4 text-brand-primary" />
                Automatic Unit Price Derivation (Box Price → Strip Price → Tablet Price):
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="text-[11px] font-bold text-slate-400">Purchase Price Flow</div>
                  <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                    ৳{formData.boxPurchasePrice.toFixed(2)} / Box
                    <span className="text-slate-400 font-normal"> → </span>
                    ৳{stripPurchase.toFixed(2)} / Strip
                    <span className="text-slate-400 font-normal"> → </span>
                    <span className="text-brand-primary font-black">৳{tabletPurchase.toFixed(2)} / Tablet</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    1 Box ({strips} Strips × {tablets} Tablets = {tabletsPerBox} Tablets)
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="text-[11px] font-bold text-slate-400">Selling Price Flow</div>
                  <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ৳{formData.boxSellingPrice.toFixed(2)} / Box
                    <span className="text-slate-400 font-normal"> → </span>
                    ৳{stripSelling.toFixed(2)} / Strip
                    <span className="text-slate-400 font-normal"> → </span>
                    <span className="font-black">৳{tabletSelling.toFixed(2)} / Tablet</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    1 Box ({strips} Strips × {tablets} Tablets = {tabletsPerBox} Tablets)
                  </div>
                </div>
              </div>
            </div>
          )}

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
