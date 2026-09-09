"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import { PackagingConfig } from "@/lib/packaging";
import {
  MapPin,
  Archive,
  ArrowRight,
  ArrowLeftRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  Boxes,
  History,
  RefreshCw,
  Info,
  ChevronRight,
  X,
  Layers,
  Building,
} from "lucide-react";

interface StockAllocationViewProps {
  selectedBranchId: string;
  preselectedProductId?: string;
  preselectedBatchId?: string;
  onClearPreselectedBatch?: () => void;
  onNavigate?: (module: any) => void;
}

type StockSource = "FROM_CARTON" | "LOOSE_BOX" | "LOOSE_STRIP" | "LOOSE_TABLET";

export function StockAllocationView({
  selectedBranchId,
  preselectedProductId,
  preselectedBatchId,
  onClearPreselectedBatch,
  onNavigate,
}: StockAllocationViewProps) {
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<"PLACE_IN_RACK" | "SHELF_TO_SHELF">("PLACE_IN_RACK");
  const [inventory, setInventory] = useState<any[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(true);

  // Racks, Shelves, Bins from real database
  const [racks, setRacks] = useState<any[]>([]);
  const [loadingRacks, setLoadingRacks] = useState(false);

  // Search filter for products in Step 1
  const [productSearch, setProductSearch] = useState("");

  // Step 1: Selected Product
  const [selectedProductId, setSelectedProductId] = useState<string>(preselectedProductId || "");

  // Step 2: Selected Batch
  const [selectedBatchId, setSelectedBatchId] = useState<string>(preselectedBatchId || "");

  // Step 4: Allocation Form State
  const [stockSource, setStockSource] = useState<StockSource>("FROM_CARTON");
  const [quantityInput, setQuantityInput] = useState<number>(1);
  const [rackId, setRackId] = useState<string>("");
  const [shelfId, setShelfId] = useState<string>("");
  const [binId, setBinId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Workflow 2: Shelf to Shelf Relocation
  const [relocateBatchId, setRelocateBatchId] = useState<string>("");
  const [sourceLocId, setSourceLocId] = useState<string>("");
  const [relocateQty, setRelocateQty] = useState<number>(1);
  const [relocateUnit, setRelocateUnit] = useState<"BOX" | "STRIP" | "TABLET">("BOX");
  const [destRackId, setDestRackId] = useState<string>("");
  const [destShelfId, setDestShelfId] = useState<string>("");
  const [destBinId, setDestBinId] = useState<string>("");
  const [relocateNotes, setRelocateNotes] = useState<string>("");

  // Feedback states
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load Inventory for current branch
  const loadInventory = useCallback(async () => {
    if (!selectedBranchId) return;
    try {
      setLoadingInventory(true);
      const res = await fetchApi(`/inventory/branch/${selectedBranchId}?limit=500`);
      if (res.success && Array.isArray(res.data)) {
        setInventory(res.data);
      }
    } catch (err) {
      console.error("Failed to load inventory for allocation", err);
    } finally {
      setLoadingInventory(false);
    }
  }, [selectedBranchId]);

  // Load Active Racks
  const loadLocations = useCallback(async () => {
    if (!selectedBranchId) return;
    try {
      setLoadingRacks(true);
      const res = await fetchApi(`/locations?branchId=${encodeURIComponent(selectedBranchId)}`);
      let racksList: any[] = [];
      if (Array.isArray(res)) {
        racksList = res;
      } else if (Array.isArray(res?.data)) {
        racksList = res.data;
      } else if (Array.isArray((res as any)?.racks)) {
        racksList = (res as any).racks;
      }
      setRacks(racksList);
    } catch (err) {
      console.error("Failed to load locations", err);
      setRacks([]);
    } finally {
      setLoadingRacks(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  // Handle deep-linking preselection from Batch Details or Stock List
  useEffect(() => {
    if (preselectedBatchId && inventory.length > 0) {
      const match = inventory.find((i) => i.id === preselectedBatchId);
      if (match) {
        setSelectedProductId(match.productId);
        setSelectedBatchId(match.id);
      } else {
        setSelectedBatchId(preselectedBatchId);
      }
      if (onClearPreselectedBatch) onClearPreselectedBatch();
    } else if (preselectedProductId && !selectedProductId) {
      setSelectedProductId(preselectedProductId);
      if (onClearPreselectedBatch) onClearPreselectedBatch();
    }
  }, [preselectedBatchId, preselectedProductId, inventory, onClearPreselectedBatch, selectedProductId]);

  // ══════════════════════════════════════════════════════════
  // STEP 1: PRODUCTS WITH UNALLOCATED STOCK NOT IN RACK
  // ══════════════════════════════════════════════════════════
  const productsWithUnallocatedStock = useMemo(() => {
    const productMap = new Map<string, {
      product: any;
      batches: any[];
      totalUnallocatedUnits: number;
      totalUnallocatedBoxes: number;
    }>();

    inventory.forEach((inv) => {
      const totalAllocated = (inv.locations || []).reduce(
        (sum: number, loc: any) => sum + (Number(loc.quantity) || 0),
        0
      );
      const unallocatedUnits = Math.max(0, (Number(inv.quantity) || 0) - totalAllocated);

      // ONLY include products and batches that actually have unallocated stock!
      if (unallocatedUnits > 0 && inv.productId) {
        // Extract real product name directly from API/database fields
        const realProductName =
          inv.productName ||
          inv.product?.name ||
          inv.brandName ||
          (typeof inv.product === "string" ? inv.product : "") ||
          "";

        const realGenericName =
          inv.genericName ||
          inv.product?.genericName ||
          "";

        const realCategory =
          inv.category ||
          inv.product?.categoryRef?.name ||
          inv.product?.category ||
          "";

        const realUnit =
          inv.unit ||
          inv.product?.unit ||
          "tablets";

        const prod = {
          id: inv.productId,
          ...(inv.product && typeof inv.product === "object" ? inv.product : {}),
          name: realProductName || "Unknown Product",
          genericName: realGenericName,
          category: realCategory,
          unit: realUnit,
        };

        const stripsPerBox = Math.max(1, inv.stripsPerBox || prod.stripsPerBox || 10);
        const tabletsPerStrip = Math.max(1, inv.tabletsPerStrip || prod.tabletsPerStrip || 10);
        const tabsPerBox = stripsPerBox * tabletsPerStrip;
        const equivBoxes = Math.floor(unallocatedUnits / tabsPerBox);

        if (!productMap.has(inv.productId)) {
          productMap.set(inv.productId, {
            product: prod,
            batches: [],
            totalUnallocatedUnits: 0,
            totalUnallocatedBoxes: 0,
          });
        }

        const entry = productMap.get(inv.productId)!;
        entry.batches.push(inv);
        entry.totalUnallocatedUnits += unallocatedUnits;
        entry.totalUnallocatedBoxes += equivBoxes;
      }
    });

    return Array.from(productMap.values());
  }, [inventory]);

  // Filtered Products by search
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return productsWithUnallocatedStock;
    const q = productSearch.toLowerCase().trim();
    return productsWithUnallocatedStock.filter((item) => {
      const name = (item.product?.name || item.product?.productName || "").toLowerCase();
      const gen = (item.product?.genericName || "").toLowerCase();
      const cat = (item.product?.categoryRef?.name || item.product?.category || "").toLowerCase();
      return name.includes(q) || gen.includes(q) || cat.includes(q);
    });
  }, [productsWithUnallocatedStock, productSearch]);

  // Selected Product Object
  const selectedProductItem = useMemo(() => {
    return productsWithUnallocatedStock.find((p) => p.product.id === selectedProductId) || null;
  }, [productsWithUnallocatedStock, selectedProductId]);

  // ══════════════════════════════════════════════════════════
  // STEP 2: BATCHES OF SELECTED PRODUCT WITH STOCK NOT IN RACK
  // ══════════════════════════════════════════════════════════
  const batchesWithUnallocatedStock = useMemo(() => {
    if (!selectedProductId) return [];
    return inventory.filter((inv) => {
      if (inv.productId !== selectedProductId) return false;
      const totalAllocated = (inv.locations || []).reduce(
        (sum: number, loc: any) => sum + (Number(loc.quantity) || 0),
        0
      );
      const unallocated = (Number(inv.quantity) || 0) - totalAllocated;
      // If a batch is fully allocated, do not show it!
      return unallocated > 0;
    });
  }, [inventory, selectedProductId]);

  // Selected Batch Item
  const selectedBatch = useMemo(() => {
    return batchesWithUnallocatedStock.find((b) => b.id === selectedBatchId) || null;
  }, [batchesWithUnallocatedStock, selectedBatchId]);

  // If the current batch becomes fully allocated, deselect it immediately
  useEffect(() => {
    if (selectedBatchId && !loadingInventory) {
      const exists = batchesWithUnallocatedStock.some((b) => b.id === selectedBatchId);
      if (!exists) {
        setSelectedBatchId("");
      }
    }
  }, [batchesWithUnallocatedStock, selectedBatchId, loadingInventory]);

  // If the selected product no longer has any batches with unallocated stock, return to product list
  useEffect(() => {
    if (selectedProductId && !loadingInventory) {
      const prodHasUnallocated = productsWithUnallocatedStock.some((p) => p.product.id === selectedProductId);
      if (!prodHasUnallocated) {
        setSelectedProductId("");
        setSelectedBatchId("");
      }
    }
  }, [productsWithUnallocatedStock, selectedProductId, loadingInventory]);

  // ══════════════════════════════════════════════════════════
  // STEP 3: PRECISE 6-METRIC PACKAGING BREAKDOWN FOR SELECTED BATCH
  // ══════════════════════════════════════════════════════════
  const packConfig: PackagingConfig = useMemo(() => {
    if (!selectedBatch) {
      return {
        packageType: "MEDICINE",
        boxesPerCarton: 10,
        stripsPerBox: 10,
        tabletsPerStrip: 10,
        unit: "tablet",
      };
    }
    return {
      packageType: selectedBatch.packageType || "MEDICINE",
      boxesPerCarton: selectedBatch.boxesPerCarton || selectedBatch.product?.qtyPerLevel2 || 10,
      stripsPerBox: selectedBatch.stripsPerBox || selectedBatch.product?.stripsPerBox || 10,
      tabletsPerStrip: selectedBatch.tabletsPerStrip || selectedBatch.product?.tabletsPerStrip || 10,
      unit: selectedBatch.unit || selectedBatch.product?.unit || "tablet",
    };
  }, [selectedBatch]);

  const tabsPerStrip = Math.max(1, packConfig.tabletsPerStrip || 10);
  const stripsPerBox = Math.max(1, packConfig.stripsPerBox || 10);
  const boxesPerCarton = Math.max(1, packConfig.boxesPerCarton || 10);
  const tabletsPerBox = stripsPerBox * tabsPerStrip;
  const tabletsPerCarton = boxesPerCarton * tabletsPerBox;

  // Real database metrics breakdown
  const batchMetrics = useMemo(() => {
    if (!selectedBatch) return null;

    const totalStock = Number(selectedBatch.quantity) || 0;
    const totalAllocated = (selectedBatch.locations || []).reduce(
      (sum: number, loc: any) => sum + (Number(loc.quantity) || 0),
      0
    );
    const unallocatedBulk = Math.max(0, totalStock - totalAllocated);

    // Cartons received & loose boxes received
    const cartonsReceived = Number(selectedBatch.cartonsReceived) || Number(selectedBatch.cartonQuantity) || 0;
    const looseBoxesReceived = Number(selectedBatch.looseBoxesReceived) || 0;

    // Allocated tracking from database
    const boxesAllocatedFromCarton = Number(selectedBatch.boxesAllocatedFromCarton) || (Number(selectedBatch.allocatedCartons) || 0) * boxesPerCarton;
    const allocatedLooseBoxes = Number(selectedBatch.allocatedLooseBoxes) || 0;

    const cartonsOpened = Math.ceil(boxesAllocatedFromCarton / boxesPerCarton);
    let fullCartons = Math.max(0, cartonsReceived - cartonsOpened);
    if (selectedBatch.cartonQuantity !== undefined && selectedBatch.cartonQuantity !== null && Number(selectedBatch.cartonQuantity) >= 0) {
      fullCartons = Math.min(fullCartons, Number(selectedBatch.cartonQuantity));
    }
    fullCartons = Math.min(fullCartons, Math.floor(unallocatedBulk / tabletsPerCarton));

    const boxesInsideCartons = fullCartons * boxesPerCarton;
    const boxesRemovedFromCarton = boxesAllocatedFromCarton;
    const boxesInOpenCarton = cartonsOpened > 0 ? Math.max(0, (cartonsOpened * boxesPerCarton) - boxesAllocatedFromCarton) : 0;
    const totalCartonBoxesAvailable = boxesInsideCartons + boxesInOpenCarton;

    // Standalone loose boxes received separately from supplier
    let remainingLooseBoxes = Math.max(0, looseBoxesReceived - allocatedLooseBoxes);
    remainingLooseBoxes = Math.min(remainingLooseBoxes, Math.floor(unallocatedBulk / tabletsPerBox));

    if (cartonsReceived === 0 && looseBoxesReceived === 0) {
      remainingLooseBoxes = Math.floor(unallocatedBulk / tabletsPerBox);
    }

    const totalEquivalentBoxes = totalCartonBoxesAvailable + remainingLooseBoxes;

    // Loose strips & tablets in bulk
    const bulkUnitsAfterBoxes = Math.max(0, unallocatedBulk - (totalEquivalentBoxes * tabletsPerBox));
    const looseStrips = Math.floor(bulkUnitsAfterBoxes / tabsPerStrip);
    const looseTablets = bulkUnitsAfterBoxes % tabsPerStrip;

    return {
      productName:
        selectedBatch.productName ||
        selectedBatch.product?.name ||
        selectedBatch.brandName ||
        "Unknown Product",
      genericName:
        selectedBatch.genericName ||
        selectedBatch.product?.genericName ||
        "",
      batchNumber: selectedBatch.batchNumber || "—",
      expiryDate: selectedBatch.expiryDate,
      totalStock,
      totalAllocated,
      unallocatedBulk,
      fullCartons,
      boxesInsideCartons,
      boxesInOpenCarton,
      boxesRemovedFromCarton,
      totalCartonBoxesAvailable,
      remainingLooseBoxes,
      looseBoxesReceived,
      looseStrips,
      looseTablets,
      totalEquivalentBoxes,
    };
  }, [selectedBatch, boxesPerCarton, tabletsPerBox, tabletsPerCarton, tabsPerStrip]);

  // Adjust default stock source based on availability
  useEffect(() => {
    if (batchMetrics) {
      if (batchMetrics.totalCartonBoxesAvailable <= 0 && batchMetrics.remainingLooseBoxes > 0) {
        setStockSource("LOOSE_BOX");
      } else if (batchMetrics.totalCartonBoxesAvailable > 0) {
        setStockSource("FROM_CARTON");
      }
    }
  }, [batchMetrics]);

  // ══════════════════════════════════════════════════════════
  // LOCATION CASCADING DROPDOWNS: Rack → Shelf → Bin
  // ══════════════════════════════════════════════════════════
  const selectedRack = useMemo(() => {
    return racks.find((r) => r.id === rackId) || null;
  }, [racks, rackId]);

  const availableShelves = useMemo(() => {
    return selectedRack?.shelves || [];
  }, [selectedRack]);

  const selectedShelf = useMemo(() => {
    return availableShelves.find((s: any) => s.id === shelfId) || null;
  }, [availableShelves, shelfId]);

  const availableBins = useMemo(() => {
    return selectedShelf?.bins || [];
  }, [selectedShelf]);

  useEffect(() => {
    setShelfId("");
    setBinId("");
  }, [rackId]);

  useEffect(() => {
    setBinId("");
  }, [shelfId]);

  // Relocation Cascading Dropdowns
  const selectedDestRack = useMemo(() => {
    return racks.find((r) => r.id === destRackId) || null;
  }, [racks, destRackId]);

  const availableDestShelves = useMemo(() => {
    return selectedDestRack?.shelves || [];
  }, [selectedDestRack]);

  const selectedDestShelf = useMemo(() => {
    return availableDestShelves.find((s: any) => s.id === destShelfId) || null;
  }, [availableDestShelves, destShelfId]);

  const availableDestBins = useMemo(() => {
    return selectedDestShelf?.bins || [];
  }, [selectedDestShelf]);

  useEffect(() => {
    setDestShelfId("");
    setDestBinId("");
  }, [destRackId]);

  useEffect(() => {
    setDestBinId("");
  }, [destShelfId]);

  // ══════════════════════════════════════════════════════════
  // STEP 4: ALLOCATION CALCULATION & LIVE IMPACT PREVIEW
  // ══════════════════════════════════════════════════════════
  const allocationCalc = useMemo(() => {
    const qty = Math.max(1, quantityInput || 1);
    let baseUnits = 0;
    let packagingUnitLabel = "Box";
    let packagingDisplay = "";
    let maxAvailable = 0;

    const cartonBoxesAvail = batchMetrics?.totalCartonBoxesAvailable || 0;
    const looseBoxesAvail = batchMetrics?.remainingLooseBoxes || 0;
    const looseStripsAvail = batchMetrics?.looseStrips || 0;
    const looseTabletsAvail = batchMetrics?.looseTablets || 0;

    if (stockSource === "FROM_CARTON") {
      baseUnits = qty * tabletsPerBox;
      packagingUnitLabel = "Box";
      packagingDisplay = `${qty} Box${qty > 1 ? "es" : ""} from Carton`;
      maxAvailable = cartonBoxesAvail;
    } else if (stockSource === "LOOSE_BOX") {
      baseUnits = qty * tabletsPerBox;
      packagingUnitLabel = "Box";
      packagingDisplay = `${qty} Loose Box${qty > 1 ? "es" : ""}`;
      maxAvailable = looseBoxesAvail;
    } else if (stockSource === "LOOSE_STRIP") {
      baseUnits = qty * tabsPerStrip;
      packagingUnitLabel = "Strip";
      packagingDisplay = `${qty} Loose Strip${qty > 1 ? "s" : ""}`;
      maxAvailable = looseStripsAvail;
    } else if (stockSource === "LOOSE_TABLET") {
      baseUnits = qty;
      packagingUnitLabel = "Tablet";
      packagingDisplay = `${qty} Loose Tablet${qty > 1 ? "s" : ""}`;
      maxAvailable = looseTabletsAvail;
    }

    let hasError = false;
    let validationMsg = "";

    if (!selectedBatch) {
      hasError = true;
      validationMsg = "Please select a product and batch.";
    } else if (qty > maxAvailable) {
      hasError = true;
      if (stockSource === "FROM_CARTON") {
        validationMsg = `Cannot allocate ${qty} boxes from carton. Only ${maxAvailable} boxes available in cartons.`;
      } else if (stockSource === "LOOSE_BOX") {
        validationMsg = `Cannot allocate ${qty} loose boxes. Only ${maxAvailable} loose boxes available.`;
      } else {
        validationMsg = `Quantity exceeds available stock (${maxAvailable} ${packagingUnitLabel}s).`;
      }
    } else if (baseUnits > (batchMetrics?.unallocatedBulk || 0)) {
      hasError = true;
      validationMsg = `Requested units (${baseUnits.toLocaleString()}) exceeds total available bulk stock (${(batchMetrics?.unallocatedBulk || 0).toLocaleString()}).`;
    }

    // Projected state after allocation
    let projectedFullCartons = batchMetrics?.fullCartons || 0;
    let projectedBoxesInCarton = batchMetrics?.boxesInsideCartons || 0;
    let projectedBoxesRemoved = batchMetrics?.boxesRemovedFromCarton || 0;
    let projectedLooseBoxes = batchMetrics?.remainingLooseBoxes || 0;
    const projectedRackStock = (batchMetrics?.totalAllocated || 0) + baseUnits;

    if (stockSource === "FROM_CARTON") {
      projectedBoxesRemoved += qty;
      const newOpened = Math.ceil(projectedBoxesRemoved / boxesPerCarton);
      const cartonsReceived = (selectedBatch?.cartonsReceived || selectedBatch?.cartonQuantity || 0);
      projectedFullCartons = Math.max(0, cartonsReceived - newOpened);
      projectedBoxesInCarton = projectedFullCartons * boxesPerCarton;
    } else if (stockSource === "LOOSE_BOX") {
      projectedLooseBoxes = Math.max(0, projectedLooseBoxes - qty);
    }

    return {
      qty,
      baseUnits,
      packagingUnitLabel,
      packagingDisplay,
      maxAvailable,
      hasError,
      validationMsg,
      projectedFullCartons,
      projectedBoxesInCarton,
      projectedBoxesRemoved,
      projectedLooseBoxes,
      projectedRackStock,
    };
  }, [
    quantityInput,
    stockSource,
    selectedBatch,
    batchMetrics,
    tabletsPerBox,
    tabsPerStrip,
    boxesPerCarton,
  ]);

  // Submit Handler: Place Stock in Rack
  const handlePlaceStockInRack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) {
      setErrorMsg("Please select a product and batch first.");
      return;
    }
    if (allocationCalc.hasError) {
      setErrorMsg(allocationCalc.validationMsg);
      return;
    }
    if (!rackId) {
      setErrorMsg("Please select a destination Rack.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const destRackName = selectedRack?.name || "Rack";
      const destShelfName = selectedShelf?.name || "Shelf";
      const destBinName = availableBins.find((b: any) => b.id === binId)?.name || "Bin";
      const destLabel = `${destRackName} → ${destShelfName}${binId ? ` → ${destBinName}` : ""}`;

      const res = await fetchApi("/inventory/allocate", {
        method: "POST",
        body: JSON.stringify({
          inventoryId: selectedBatch.id,
          rackId,
          shelfId: shelfId || null,
          binId: binId || null,
          quantity: allocationCalc.baseUnits,
          allocationSource: stockSource,
          packagingUnit: allocationCalc.packagingUnitLabel,
          boxesAllocated: (stockSource === "FROM_CARTON" || stockSource === "LOOSE_BOX") ? allocationCalc.qty : null,
          stripsAllocated: stockSource === "LOOSE_STRIP" ? allocationCalc.qty : null,
          tabletsAllocated: stockSource === "LOOSE_TABLET" ? allocationCalc.qty : null,
          notes: notes || `Stock Placed in Rack: ${allocationCalc.packagingDisplay} into ${destLabel}`,
        }),
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to place stock in rack");
      }

      setSuccessMsg(
        `Successfully placed ${allocationCalc.packagingDisplay} (${allocationCalc.baseUnits.toLocaleString()} ${packConfig.unit}s) into ${destLabel}. Total batch stock remains 100% constant!`
      );

      // Reset form inputs
      setQuantityInput(1);
      setNotes("");
      setRackId("");
      setShelfId("");
      setBinId("");

      // Immediately refresh live inventory
      await loadInventory();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to allocate stock");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Handler: Shelf to Shelf Relocation
  const handleRelocateShelfStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!relocateBatchId || !sourceLocId) {
      setErrorMsg("Please select a batch and source shelf location.");
      return;
    }
    if (!destRackId) {
      setErrorMsg("Please select a destination Rack.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const rBatch = inventory.find((i) => i.id === relocateBatchId);
      const sBox = rBatch?.stripsPerBox || 10;
      const sTab = rBatch?.tabletsPerStrip || 10;
      const bTabs = sBox * sTab;

      let baseUnits = relocateQty;
      if (relocateUnit === "BOX") baseUnits = relocateQty * bTabs;
      if (relocateUnit === "STRIP") baseUnits = relocateQty * sTab;

      const res = await fetchApi("/inventory/move", {
        method: "POST",
        body: JSON.stringify({
          fromLocationId: sourceLocId,
          quantity: baseUnits,
          rackId: destRackId,
          shelfId: destShelfId || null,
          binId: destBinId || null,
          notes: relocateNotes || `Relocated ${relocateQty} ${relocateUnit} to new shelf`,
        }),
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to relocate stock");
      }

      setSuccessMsg(`Successfully relocated stock to destination shelf.`);
      setRelocateQty(1);
      setDestRackId("");
      setDestShelfId("");
      setDestBinId("");
      setRelocateNotes("");

      await loadInventory();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to relocate stock");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <span>Stock Management</span>
            <span>/</span>
            <span>Allocate Product</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Stock Allocation</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <MapPin className="h-6 w-6 text-brand-primary" />
            Place Stock in Rack (Stock Allocation)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Product → Batch → Available Stock → Allocation. Packaging-aware placement with zero double-counting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigate && (
            <button
              onClick={() => onNavigate("stock_allocation_history")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs"
            >
              <History className="h-4 w-4 text-slate-400" />
              <span>Allocation History</span>
            </button>
          )}

          <button
            onClick={() => loadInventory()}
            title="Refresh"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Workflow Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => {
            setActiveWorkflowTab("PLACE_IN_RACK");
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeWorkflowTab === "PLACE_IN_RACK"
              ? "bg-white dark:bg-slate-900 text-brand-primary shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Archive className="h-4 w-4 text-amber-500" />
          <span>Place Stock in Rack</span>
        </button>

        <button
          onClick={() => {
            setActiveWorkflowTab("SHELF_TO_SHELF");
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeWorkflowTab === "SHELF_TO_SHELF"
              ? "bg-white dark:bg-slate-900 text-brand-primary shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <ArrowLeftRight className="h-4 w-4 text-sky-500" />
          <span>Shelf-to-Shelf Relocation</span>
        </button>
      </div>

      {/* Global Alerts */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5 font-bold">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2.5 font-bold">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          WORKFLOW 1: PLACE STOCK IN RACK
      ══════════════════════════════════════════════════════════ */}
      {activeWorkflowTab === "PLACE_IN_RACK" && (
        <div className="space-y-6">
          {/* Active Selection Breadcrumb Header (if product or batch is selected) */}
          {(selectedProductId || selectedBatchId) && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Active Flow:</span>
                
                {/* Product Badge */}
                {selectedProductItem && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white shadow-xs">
                    <span className="text-slate-400 font-normal">Product:</span>
                    <span>{selectedProductItem.product.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProductId("");
                        setSelectedBatchId("");
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      title="Change Product"
                      className="ml-1 p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Batch Badge */}
                {selectedBatch && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-brand-primary shadow-xs font-mono">
                      <span className="text-slate-400 font-normal font-sans">Batch:</span>
                      <span>{selectedBatch.batchNumber || "—"}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBatchId("");
                          setErrorMsg(null);
                          setSuccessMsg(null);
                        }}
                        title="Change Batch"
                        className="ml-1 p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProductId("");
                    setSelectedBatchId("");
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
                >
                  Start Over (All Products)
                </button>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              VIEW STATE 1: NO PRODUCT SELECTED -> SHOW ALL PRODUCTS
          ───────────────────────────────────────────────────────────── */}
          {!selectedProductId && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="h-6 w-6 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-black">
                      1
                    </span>
                    Products with Stock Not in Rack
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click a product to view its unallocated batches and place them into physical racks.
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-72">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search product or generic..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              {loadingInventory ? (
                <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
                  <span>Loading products with unallocated stock...</span>
                </div>
              ) : productsWithUnallocatedStock.length === 0 ? (
                <div className="p-12 text-center space-y-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 rounded-2xl">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                  <h3 className="text-sm font-black text-emerald-900 dark:text-emerald-200">
                    All Products Are Fully Placed in Racks!
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 max-w-md mx-auto">
                    There is currently zero unallocated bulk stock in this branch. All received medicine stock has been assigned to physical Rack → Shelf → Bin locations.
                  </p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No products matching &quot;{productSearch}&quot; with unallocated stock found.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProducts.map((item) => (
                    <button
                      key={item.product.id}
                      type="button"
                      onClick={() => {
                        setSelectedProductId(item.product.id);
                        setSelectedBatchId("");
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-brand-primary dark:hover:border-brand-primary/60 bg-white dark:bg-slate-900 hover:bg-brand-primary/[0.02] dark:hover:bg-brand-primary/5 transition text-left group shadow-xs hover:shadow-md flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-brand-primary transition leading-snug">
                            {item.product.name}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 shrink-0">
                            {item.batches.length} Batch{item.batches.length !== 1 ? "es" : ""}
                          </span>
                        </div>

                        {item.product.genericName && (
                          <p className="text-xs text-slate-500 italic line-clamp-1">
                            {item.product.genericName}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                            Not in Rack
                          </span>
                          <span className="text-base font-black text-brand-primary">
                            {item.totalUnallocatedUnits.toLocaleString()} {item.product.unit || "tablets"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-xs font-bold text-slate-400 group-hover:text-brand-primary transition">
                          <span>Select</span>
                          <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              VIEW STATE 2: PRODUCT SELECTED, NO BATCH SELECTED -> SHOW BATCHES
          ───────────────────────────────────────────────────────────── */}
          {selectedProductId && !selectedBatchId && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="h-6 w-6 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center text-xs font-black">
                      2
                    </span>
                    Batches with Stock Not in Rack for: {selectedProductItem?.product.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select a batch below to view its complete packaging breakdown and allocate it to racks.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedProductId("");
                    setSelectedBatchId("");
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  ← Back to Product List
                </button>
              </div>

              {batchesWithUnallocatedStock.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  All batches for this product are currently 100% placed in racks.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {batchesWithUnallocatedStock.map((b) => {
                    const totalAlloc = (b.locations || []).reduce(
                      (sum: number, loc: any) => sum + (Number(loc.quantity) || 0),
                      0
                    );
                    const notInRack = Math.max(0, (Number(b.quantity) || 0) - totalAlloc);
                    const expText = b.expiryDate
                      ? new Date(b.expiryDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
                      : "No expiry";

                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setSelectedBatchId(b.id);
                          setErrorMsg(null);
                          setSuccessMsg(null);
                        }}
                        className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-400 bg-white dark:bg-slate-900 hover:bg-amber-500/[0.02] dark:hover:bg-amber-500/5 transition text-left group shadow-xs hover:shadow-md flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Batch Number
                              </span>
                              <h4 className="text-base font-black text-slate-900 dark:text-white font-mono group-hover:text-amber-600 transition">
                                {b.batchNumber || "—"}
                              </h4>
                            </div>
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                              Exp: {expText}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                              Stock Not in Rack
                            </span>
                            <span className="text-base font-black text-amber-600 dark:text-amber-400">
                              {notInRack.toLocaleString()} {b.unit || "tablets"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-xs font-bold text-slate-400 group-hover:text-amber-600 transition">
                            <span>Allocate</span>
                            <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              VIEW STATE 3: PRODUCT & BATCH SELECTED -> BREAKDOWN & FORM
          ───────────────────────────────────────────────────────────── */}
          {selectedProductId && selectedBatchId && batchMetrics && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 5 Columns: Step 3 Available Stock Breakdown Card */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5 sticky top-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
                      <Archive className="h-4 w-4 text-amber-500" />
                      3. Available Stock Breakdown
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedBatchId("")}
                      className="text-[11px] font-bold text-brand-primary hover:underline"
                    >
                      Change Batch
                    </button>
                  </div>

                  {/* Batch Header */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Product & Batch</p>
                    <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                      {batchMetrics.productName}
                    </p>
                    {batchMetrics.genericName && (
                      <p className="text-xs text-slate-500 italic mt-0.5">
                        {batchMetrics.genericName}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700 font-mono">
                      <span>Batch: <strong className="text-slate-900 dark:text-white">{batchMetrics.batchNumber}</strong></span>
                      <span>
                        Exp: {batchMetrics.expiryDate ? new Date(batchMetrics.expiryDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Exact 6 Requested Breakdown Metrics */}
                  <div className="space-y-2.5">
                    {/* 1. Full Cartons Not in Rack */}
                    <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-300 block">
                          Full Cartons Not in Rack
                        </span>
                        <span className="text-[10px] text-amber-700 dark:text-amber-400">
                          Sealed cartons ({boxesPerCarton} boxes each)
                        </span>
                      </div>
                      <span className="text-xl font-black text-amber-900 dark:text-amber-200 font-mono">
                        {batchMetrics.fullCartons}
                      </span>
                    </div>

                    {/* 2. Boxes Inside Cartons */}
                    <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/60 dark:border-amber-900/20 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-300 block">
                          Boxes Inside Cartons
                        </span>
                        <span className="text-[10px] text-amber-700 dark:text-amber-400">
                          {batchMetrics.boxesInsideCartons} in full cartons
                          {batchMetrics.boxesInOpenCarton > 0 && ` + ${batchMetrics.boxesInOpenCarton} in open carton`}
                        </span>
                      </div>
                      <span className="text-base font-black text-amber-900 dark:text-amber-200 font-mono">
                        {batchMetrics.totalCartonBoxesAvailable} Boxes
                      </span>
                    </div>

                    {/* 3. Loose / Standalone Boxes Not in Rack */}
                    <div className="p-3 rounded-xl bg-sky-50/80 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/40 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-sky-900 dark:text-sky-300 block">
                          Loose/Standalone Boxes Not in Rack
                        </span>
                        <span className="text-[10px] text-sky-700 dark:text-sky-400">
                          Received separately from supplier
                        </span>
                      </div>
                      <span className="text-xl font-black text-sky-900 dark:text-sky-200 font-mono">
                        {batchMetrics.remainingLooseBoxes} Boxes
                      </span>
                    </div>

                    {/* 4. Loose Strips & 5. Loose Tablets */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Loose Strips</span>
                        <span className="text-base font-black text-slate-800 dark:text-slate-200 font-mono">
                          {batchMetrics.looseStrips}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Loose Tablets</span>
                        <span className="text-base font-black text-slate-800 dark:text-slate-200 font-mono">
                          {batchMetrics.looseTablets}
                        </span>
                      </div>
                    </div>

                    {/* 6. Total Stock Not in Rack */}
                    <div className="p-4 rounded-xl bg-brand-primary/10 dark:bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-black text-brand-primary block">
                          Total Stock Not in Rack
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          Available for placement in rack
                        </span>
                      </div>
                      <span className="text-xl font-black text-brand-primary font-mono">
                        {batchMetrics.unallocatedBulk.toLocaleString()} {packConfig.unit}s
                      </span>
                    </div>
                  </div>

                  {/* Physical Rack Stock Status */}
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30 text-xs flex items-center justify-between">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Physical Rack Stock
                    </span>
                    <span className="font-mono font-black text-emerald-700 dark:text-emerald-200">
                      {batchMetrics.totalAllocated.toLocaleString()} {packConfig.unit}s
                    </span>
                  </div>
                </div>
              </div>

              {/* Right 7 Columns: Step 4 Allocation Form */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="h-6 w-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xs font-black">
                      4
                    </span>
                    Allocation Details
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Specify stock source, quantity, packaging unit, and destination Rack → Shelf → Bin.
                  </p>
                </div>

                <form onSubmit={handlePlaceStockInRack} className="space-y-6">
                  {/* Stock Source Selection */}
                  <div className="space-y-2.5">
                    <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                      Stock Source
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Source A: From Carton */}
                      <button
                        type="button"
                        onClick={() => setStockSource("FROM_CARTON")}
                        disabled={batchMetrics.totalCartonBoxesAvailable <= 0}
                        className={`p-4 rounded-xl border text-left transition relative ${
                          stockSource === "FROM_CARTON"
                            ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 ring-2 ring-amber-500/30"
                            : batchMetrics.totalCartonBoxesAvailable <= 0
                            ? "opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Archive className="h-4 w-4 text-amber-500" />
                            From Carton
                          </span>
                          {stockSource === "FROM_CARTON" && (
                            <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-2xl font-black text-amber-700 dark:text-amber-400">
                          {batchMetrics.totalCartonBoxesAvailable}{" "}
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-500">Boxes</span>
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                          Allocates Boxes from a Carton (not entire carton). Opens carton as needed.
                        </p>
                      </button>

                      {/* Source B: Loose Box */}
                      <button
                        type="button"
                        onClick={() => setStockSource("LOOSE_BOX")}
                        disabled={batchMetrics.remainingLooseBoxes <= 0}
                        className={`p-4 rounded-xl border text-left transition relative ${
                          stockSource === "LOOSE_BOX"
                            ? "border-sky-500 bg-sky-50/50 dark:bg-sky-950/20 ring-2 ring-sky-500/30"
                            : batchMetrics.remainingLooseBoxes <= 0
                            ? "opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Boxes className="h-4 w-4 text-sky-500" />
                            Loose Box
                          </span>
                          {stockSource === "LOOSE_BOX" && (
                            <CheckCircle2 className="h-4 w-4 text-sky-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-2xl font-black text-sky-700 dark:text-sky-400">
                          {batchMetrics.remainingLooseBoxes}{" "}
                          <span className="text-xs font-bold text-sky-600 dark:text-sky-500">Boxes</span>
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                          Allocates separately received standalone boxes from supplier.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Quantity & Packaging Unit */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Quantity to Allocate
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max={allocationCalc.maxAvailable}
                          value={quantityInput}
                          onChange={(e) => setQuantityInput(parseInt(e.target.value, 10) || 1)}
                          className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-black focus:ring-2 focus:ring-brand-primary"
                        />
                        <button
                          type="button"
                          onClick={() => setQuantityInput(allocationCalc.maxAvailable)}
                          className="px-2.5 py-2 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap"
                        >
                          Max ({allocationCalc.maxAvailable})
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        = {allocationCalc.baseUnits.toLocaleString()} {packConfig.unit}s total
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Packaging Unit
                      </label>
                      <div className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-between">
                        <span>{allocationCalc.packagingUnitLabel}</span>
                        <span className="text-[10px] text-slate-400">({tabletsPerBox} {packConfig.unit}s/box)</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Source: {stockSource === "FROM_CARTON" ? "Taken from Carton" : "Supplier Loose Box"}
                      </p>
                    </div>
                  </div>

                  {/* Cascading Physical Location: Rack → Shelf → Bin */}
                  <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-brand-primary" />
                        Destination Physical Location
                      </label>
                      <span className="text-[10px] text-slate-400">Rack → Shelf → Bin</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Rack */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Rack <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={rackId}
                          onChange={(e) => setRackId(e.target.value)}
                          required
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold"
                        >
                          <option value="">-- Choose Rack --</option>
                          {racks.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Shelf */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Shelf
                        </label>
                        <select
                          value={shelfId}
                          onChange={(e) => setShelfId(e.target.value)}
                          disabled={!rackId}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold disabled:opacity-50"
                        >
                          <option value="">-- Choose Shelf --</option>
                          {availableShelves.map((s: any) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Bin */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Bin
                        </label>
                        <select
                          value={binId}
                          onChange={(e) => setBinId(e.target.value)}
                          disabled={!shelfId}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold disabled:opacity-50"
                        >
                          <option value="">-- Choose Bin (Optional) --</option>
                          {availableBins.map((b: any) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Note */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Allocation Note (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Placed for front counter dispensing..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  {/* Live Impact Preview */}
                  <div className="p-4 bg-brand-primary/5 dark:bg-brand-primary/10 border border-brand-primary/20 rounded-2xl space-y-2">
                    <p className="text-[11px] font-black uppercase text-brand-primary tracking-wider flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5" />
                      Immediate Balance Preview After Allocation:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Full Cartons</span>
                        <span className="font-bold text-amber-600">{allocationCalc.projectedFullCartons}</span>
                      </div>
                      <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Boxes in Cartons</span>
                        <span className="font-bold text-amber-600">{allocationCalc.projectedBoxesInCarton}</span>
                      </div>
                      <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Loose Boxes</span>
                        <span className="font-bold text-sky-600">{allocationCalc.projectedLooseBoxes}</span>
                      </div>
                      <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Physical Rack</span>
                        <span className="font-bold text-emerald-600">+{allocationCalc.baseUnits.toLocaleString()} units</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                      Total batch stock remains 100% constant ({batchMetrics.totalStock.toLocaleString()} {packConfig.unit}s).
                    </p>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting || allocationCalc.hasError || !rackId}
                    className="w-full inline-flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white py-3.5 px-6 rounded-xl font-black text-xs shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Allocating Stock...</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="h-4 w-4" />
                        <span>Place Stock in Rack</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          WORKFLOW 2: SHELF-TO-SHELF RELOCATION
      ══════════════════════════════════════════════════════════ */}
      {activeWorkflowTab === "SHELF_TO_SHELF" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs max-w-3xl space-y-6">
          <form onSubmit={handleRelocateShelfStock} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Select Batch to Relocate
              </label>
              <select
                value={relocateBatchId}
                onChange={(e) => {
                  setRelocateBatchId(e.target.value);
                  setSourceLocId("");
                }}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold"
              >
                <option value="">-- Choose Batch --</option>
                {inventory
                  .filter((inv) => (inv.locations || []).some((l: any) => l.quantity > 0))
                  .map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.productName || inv.product?.name || inv.brandName || "Medicine"} (Batch: {inv.batchNumber || "—"})
                    </option>
                  ))}
              </select>
            </div>

            {relocateBatchId && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Source Physical Location
                </label>
                <select
                  value={sourceLocId}
                  onChange={(e) => setSourceLocId(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold"
                >
                  <option value="">-- Choose Source Shelf --</option>
                  {(inventory.find((i) => i.id === relocateBatchId)?.locations || [])
                    .filter((l: any) => l.quantity > 0)
                    .map((l: any) => (
                      <option key={l.id} value={l.id}>
                        Rack: {l.rack?.name || "—"} → Shelf: {l.shelf?.name || "—"}{l.bin?.name ? ` → Bin: ${l.bin.name}` : ""} ({l.quantity} units available)
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Relocation Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={relocateQty}
                  onChange={(e) => setRelocateQty(parseInt(e.target.value, 10) || 1)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Packaging Unit
                </label>
                <select
                  value={relocateUnit}
                  onChange={(e) => setRelocateUnit(e.target.value as any)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold"
                >
                  <option value="BOX">Box</option>
                  <option value="STRIP">Strip</option>
                  <option value="TABLET">Tablet / Piece</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Destination Location
              </label>
              <div className="grid grid-cols-3 gap-3">
                <select
                  value={destRackId}
                  onChange={(e) => setDestRackId(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                >
                  <option value="">-- Choose Rack --</option>
                  {racks.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>

                <select
                  value={destShelfId}
                  onChange={(e) => setDestShelfId(e.target.value)}
                  disabled={!destRackId}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 disabled:opacity-50"
                >
                  <option value="">-- Choose Shelf --</option>
                  {availableDestShelves.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <select
                  value={destBinId}
                  onChange={(e) => setDestBinId(e.target.value)}
                  disabled={!destShelfId}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 disabled:opacity-50"
                >
                  <option value="">-- Bin (Optional) --</option>
                  {availableDestBins.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !relocateBatchId || !sourceLocId || !destRackId}
              className="w-full inline-flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white py-3 px-6 rounded-xl font-bold text-xs shadow-sm transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Relocating Stock...</span>
                </>
              ) : (
                <>
                  <ArrowLeftRight className="h-4 w-4" />
                  <span>Relocate Stock to New Shelf</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
