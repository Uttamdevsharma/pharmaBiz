"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import { PackagingConfig } from "@/lib/packaging";
import { showAlert } from "@/lib/swal";
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
  Snowflake,
  Plus,
  Minus,
  Check,
  Sparkles,
} from "lucide-react";
import { SmartLocationSelector, isRefrigeratorOrColdUnit } from "./SmartLocationSelector";

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

    const maxBoxesInBulk = Math.floor(unallocatedBulk / tabletsPerBox);

    // Standalone loose boxes received separately from supplier
    let remainingLooseBoxes = Math.max(0, looseBoxesReceived - allocatedLooseBoxes);
    remainingLooseBoxes = Math.min(remainingLooseBoxes, maxBoxesInBulk);

    // Guarantee: If the unallocated bulk stock contains boxes that are not accounted for in cartons,
    // they are available as loose / unboxed stock
    if (totalCartonBoxesAvailable + remainingLooseBoxes < maxBoxesInBulk) {
      remainingLooseBoxes = Math.max(remainingLooseBoxes, maxBoxesInBulk - totalCartonBoxesAvailable);
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
      } else if (batchMetrics.totalCartonBoxesAvailable > 0 && stockSource === "LOOSE_BOX" && batchMetrics.remainingLooseBoxes <= 0) {
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

    const maxBulkBoxes = Math.floor((batchMetrics?.unallocatedBulk || 0) / tabletsPerBox);
    const cartonBoxesAvail = batchMetrics?.totalCartonBoxesAvailable || 0;
    const looseBoxesAvail = batchMetrics?.remainingLooseBoxes || 0;
    const looseStripsAvail = batchMetrics?.looseStrips || 0;
    const looseTabletsAvail = batchMetrics?.looseTablets || 0;

    if (stockSource === "FROM_CARTON") {
      baseUnits = qty * tabletsPerBox;
      packagingUnitLabel = "Box";
      packagingDisplay = `${qty} Box${qty > 1 ? "es" : ""} from Carton`;
      maxAvailable = cartonBoxesAvail > 0 ? cartonBoxesAvail : (looseBoxesAvail > 0 ? looseBoxesAvail : maxBulkBoxes);
    } else if (stockSource === "LOOSE_BOX") {
      baseUnits = qty * tabletsPerBox;
      packagingUnitLabel = "Box";
      packagingDisplay = `${qty} Loose Box${qty > 1 ? "es" : ""}`;
      maxAvailable = looseBoxesAvail > 0 ? looseBoxesAvail : maxBulkBoxes;
    } else if (stockSource === "LOOSE_STRIP") {
      baseUnits = qty * tabsPerStrip;
      packagingUnitLabel = "Strip";
      packagingDisplay = `${qty} Loose Strip${qty > 1 ? "s" : ""}`;
      maxAvailable = looseStripsAvail > 0 ? looseStripsAvail : Math.floor((batchMetrics?.unallocatedBulk || 0) / tabsPerStrip);
    } else if (stockSource === "LOOSE_TABLET") {
      baseUnits = qty;
      packagingUnitLabel = "Tablet";
      packagingDisplay = `${qty} Loose Tablet${qty > 1 ? "s" : ""}`;
      maxAvailable = batchMetrics?.unallocatedBulk || 0;
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

  // Detect if medicine is temperature-sensitive
  const isColdSensitive = useMemo(() => {
    if (!selectedBatch) return false;
    const text = (
      (selectedBatch.productName || "") + " " +
      (selectedBatch.genericName || "") + " " +
      (selectedBatch.category || "")
    ).toLowerCase();
    return (
      text.includes("insulin") ||
      text.includes("vaccin") ||
      text.includes("cold chain") ||
      text.includes("refrigerat") ||
      text.includes("eye drop") ||
      text.includes("erythropoietin") ||
      text.includes("toxoid") ||
      text.includes("oxytocin") ||
      text.includes("2-8") ||
      text.includes("2°c")
    );
  }, [selectedBatch]);

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
      setErrorMsg("Please select a destination storage location.");
      return;
    }
    // Only require shelf if the chosen location actually has shelves configured!
    if (availableShelves.length > 0 && !shelfId) {
      setErrorMsg(`Please select a shelf within "${selectedRack?.name || "Rack"}".`);
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const destRackName = selectedRack?.name || "Location";
      const destShelfName = selectedShelf?.name || "";
      const destBinName = availableBins.find((b: any) => b.id === binId)?.name || "";
      let destLabel = destRackName;
      if (destShelfName) {
        destLabel += ` → ${destShelfName}`;
        if (destBinName) {
          destLabel += ` → ${destBinName}`;
        }
      } else {
        destLabel += ` (Direct)`;
      }

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

      const alertMsg = `Successfully placed ${allocationCalc.packagingDisplay} (${allocationCalc.baseUnits.toLocaleString()} ${packConfig.unit}s) into ${destLabel}. Total batch stock remains 100% constant!`;
      showAlert.success("Stock Allocated Successfully!", alertMsg);

      // Reset form inputs
      setQuantityInput(1);
      setNotes("");
      setRackId("");
      setShelfId("");
      setBinId("");

      // Immediately refresh live inventory
      await loadInventory();
    } catch (err: any) {
      const msg = err.message || "Failed to allocate stock";
      setErrorMsg(msg);
      showAlert.error("Allocation Failed", msg);
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
      setErrorMsg("Please select a destination storage location.");
      return;
    }
    if (availableDestShelves.length > 0 && !destShelfId) {
      setErrorMsg(`Please select a shelf within destination "${selectedDestRack?.name || "Rack"}".`);
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

      const alertMsg = `Successfully relocated ${relocateQty} ${relocateUnit} to destination shelf.`;
      showAlert.success("Stock Relocated Successfully!", alertMsg);
      setRelocateQty(1);
      setDestRackId("");
      setDestShelfId("");
      setDestBinId("");
      setRelocateNotes("");

      await loadInventory();
    } catch (err: any) {
      const msg = err.message || "Failed to relocate stock";
      setErrorMsg(msg);
      showAlert.error("Relocation Failed", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Stock Management</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Stock Allocation</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <MapPin className="h-7 w-7 text-brand-primary" />
            Stock Allocation
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {onNavigate && (
            <button
              onClick={() => onNavigate("stock_allocation_history")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs cursor-pointer"
            >
              <History className="h-4 w-4 text-slate-400" />
              <span>Allocation History</span>
            </button>
          )}

          <button
            onClick={() => loadInventory()}
            title="Refresh"
            className="p-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Workflow Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => {
            setActiveWorkflowTab("PLACE_IN_RACK");
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black transition cursor-pointer ${
            activeWorkflowTab === "PLACE_IN_RACK"
              ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
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
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black transition cursor-pointer ${
            activeWorkflowTab === "SHELF_TO_SHELF"
              ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <ArrowLeftRight className="h-4 w-4 text-sky-500" />
          <span>Shelf-to-Shelf Relocation</span>
        </button>
      </div>

      {/* Global Alerts */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-900 rounded-2xl text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2.5 font-bold">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}



      {/* ══════════════════════════════════════════════════════════
          WORKFLOW 1: PLACE STOCK IN RACK
      ══════════════════════════════════════════════════════════ */}
      {activeWorkflowTab === "PLACE_IN_RACK" && (
        <div className="space-y-6">
          {/* Active Selection Header */}
          {(selectedProductId && !selectedBatchId) && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
              <div className="flex flex-wrap items-center gap-2.5 text-sm">
                <span className="text-slate-500 dark:text-slate-400 font-bold">Selected:</span>
                
                {/* Product Badge */}
                {selectedProductItem && (
                  <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-slate-900 dark:text-white">
                    <span className="text-slate-500 font-normal">Product:</span>
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
                      className="ml-1 p-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Batch Badge */}
                {selectedBatch && (
                  <>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 font-black text-emerald-800 dark:text-emerald-300 font-mono">
                      <span className="text-slate-500 font-sans font-normal">Batch:</span>
                      <span>{selectedBatch.batchNumber || "—"}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBatchId("");
                          setErrorMsg(null);
                          setSuccessMsg(null);
                        }}
                        title="Change Batch"
                        className="ml-1 p-0.5 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProductId("");
                    setSelectedBatchId("");
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
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
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                    <span className="h-7 w-7 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center text-sm font-black">
                      1
                    </span>
                    Unallocated Products
                  </h2>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-80">
                  <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Search product name or generic..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              {loadingInventory ? (
                <div className="p-16 text-center text-sm font-medium text-slate-400 flex items-center justify-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-brand-primary" />
                  <span>Loading products...</span>
                </div>
              ) : productsWithUnallocatedStock.length === 0 ? (
                <div className="p-12 text-center space-y-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl">
                  <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
                  <h3 className="text-lg font-black text-emerald-900 dark:text-emerald-200">
                    All Products Are Placed in Racks
                  </h3>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-12 text-center text-sm font-semibold text-slate-400">
                  No products matching &quot;{productSearch}&quot; found.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                      className="p-6 rounded-2xl border-2 border-slate-200/90 dark:border-slate-800 hover:border-brand-primary dark:hover:border-brand-primary bg-white dark:bg-slate-900 hover:bg-brand-primary/[0.02] dark:hover:bg-brand-primary/5 transition text-left group shadow-sm hover:shadow-md flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-base font-black text-slate-900 dark:text-white group-hover:text-brand-primary transition leading-snug">
                            {item.product.name}
                          </h3>
                          <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 shrink-0">
                            {item.batches.length} Batch{item.batches.length !== 1 ? "es" : ""}
                          </span>
                        </div>

                        {item.product.genericName && (
                          <p className="text-sm text-slate-500 font-medium">
                            {item.product.genericName}
                          </p>
                        )}
                      </div>

                      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                            Not in Rack
                          </span>
                          <span className="text-lg font-black text-brand-primary">
                            {item.totalUnallocatedUnits.toLocaleString()} {item.product.unit || "tablets"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-500 group-hover:text-brand-primary transition">
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
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                    <span className="h-7 w-7 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-sm font-black">
                      2
                    </span>
                    Available Batches: {selectedProductItem?.product.name}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedProductId("");
                    setSelectedBatchId("");
                  }}
                  className="text-sm font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  ← Back to Product List
                </button>
              </div>

              {batchesWithUnallocatedStock.length === 0 ? (
                <div className="p-12 text-center text-sm font-semibold text-slate-400">
                  All batches for this product are currently placed in racks.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                        className="p-6 rounded-2xl border-2 border-slate-200/90 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-400 bg-white dark:bg-slate-900 hover:bg-amber-500/[0.02] dark:hover:bg-amber-500/5 transition text-left group shadow-sm hover:shadow-md flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                                Batch Number
                              </span>
                              <h4 className="text-lg font-black text-slate-900 dark:text-white font-mono group-hover:text-amber-600 transition">
                                {b.batchNumber || "—"}
                              </h4>
                            </div>
                            <span className="px-3 py-1 rounded-lg text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                              Exp: {expText}
                            </span>
                          </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                              Stock Not in Rack
                            </span>
                            <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                              {notInRack.toLocaleString()} {b.unit || "tablets"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-sm font-bold text-slate-500 group-hover:text-amber-600 transition">
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
              VIEW STATE 3: PRODUCT & BATCH SELECTED -> SIMPLE SECTION-WISE ALLOCATION
          ───────────────────────────────────────────────────────────── */}
          {selectedProductId && selectedBatchId && batchMetrics && (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* SECTION 1: MEDICINE & BATCH SUMMARY BANNER */}
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    {batchMetrics.genericName && (
                      <span className="text-xs font-black uppercase tracking-wider text-brand-primary block mb-1">
                        {batchMetrics.genericName}
                      </span>
                    )}
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                      {batchMetrics.productName}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2.5 mt-2.5 text-sm text-slate-600 dark:text-slate-300 font-mono">
                      <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold">
                        Batch: <strong className="text-slate-900 dark:text-white">{batchMetrics.batchNumber}</strong>
                      </span>
                      <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold">
                        Exp: {batchMetrics.expiryDate ? new Date(batchMetrics.expiryDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "—"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-200 dark:border-amber-900/60 text-right">
                      <span className="text-xs font-bold uppercase text-amber-700 dark:text-amber-400 block">Not in Rack</span>
                      <span className="text-xl font-black text-amber-900 dark:text-amber-200 font-mono">
                        {batchMetrics.unallocatedBulk.toLocaleString()} {packConfig.unit}s
                      </span>
                    </div>
                    <div className="px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-200 dark:border-emerald-900/60 text-right">
                      <span className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400 block">In Rack</span>
                      <span className="text-xl font-black text-emerald-900 dark:text-emerald-200 font-mono">
                        {batchMetrics.totalAllocated.toLocaleString()} {packConfig.unit}s
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedBatchId("")}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-700 px-3.5 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      Change Batch
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 2: ALLOCATION FORM */}
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                <form onSubmit={handlePlaceStockInRack} className="space-y-6">
                  {/* Stock Source (Only if multiple sources exist) */}
                  {(batchMetrics.totalCartonBoxesAvailable > 0 || batchMetrics.remainingLooseBoxes > 0) && (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                        Stock Source
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => setStockSource("FROM_CARTON")}
                          disabled={batchMetrics.totalCartonBoxesAvailable <= 0}
                          className={`p-4 rounded-xl border-2 flex items-center justify-between transition cursor-pointer ${
                            stockSource === "FROM_CARTON"
                              ? "border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 shadow-sm"
                              : batchMetrics.totalCartonBoxesAvailable <= 0
                              ? "opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 text-slate-400"
                              : "border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Archive className="h-5 w-5 text-amber-500" />
                            <span className="text-sm font-black">From Carton</span>
                          </div>
                          <span className="text-base font-black font-mono">
                            {batchMetrics.totalCartonBoxesAvailable} Boxes
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setStockSource("LOOSE_BOX")}
                          disabled={batchMetrics.remainingLooseBoxes <= 0}
                          className={`p-4 rounded-xl border-2 flex items-center justify-between transition cursor-pointer ${
                            stockSource === "LOOSE_BOX"
                              ? "border-sky-500 bg-sky-50/60 dark:bg-sky-950/30 text-sky-900 dark:text-sky-200 shadow-sm"
                              : batchMetrics.remainingLooseBoxes <= 0
                              ? "opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 text-slate-400"
                              : "border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Boxes className="h-5 w-5 text-sky-500" />
                            <span className="text-sm font-black">Loose Box</span>
                          </div>
                          <span className="text-base font-black font-mono">
                            {batchMetrics.remainingLooseBoxes} Boxes
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Cold Storage Alert for sensitive medicines */}
                  {isColdSensitive && (
                    <div className="p-3.5 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-2xl flex items-center gap-2.5 text-xs text-sky-800 dark:text-sky-300 font-bold">
                      <Snowflake className="h-4 w-4 text-sky-500 shrink-0 animate-pulse" />
                      <span>
                        Recommended: This medicine typically requires cold storage (2°C - 8°C). Storing in a Refrigerator is recommended.
                      </span>
                    </div>
                  )}

                  {/* Quantity to Allocate */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        Quantity to Allocate ({allocationCalc.packagingUnitLabel})
                      </label>
                      {allocationCalc.maxAvailable > 0 && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                          Available: <strong className="text-slate-900 dark:text-white font-mono">{allocationCalc.maxAvailable.toLocaleString()}</strong> {allocationCalc.packagingUnitLabel}s
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantityInput(Math.max(1, (quantityInput || 1) - 1))}
                        disabled={quantityInput <= 1}
                        className="h-12 w-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-40 cursor-pointer"
                        title="Decrease by 1"
                      >
                        <Minus className="h-4 w-4" />
                      </button>

                      <input
                        type="number"
                        min="1"
                        max={Math.max(1, allocationCalc.maxAvailable)}
                        value={quantityInput}
                        onChange={(e) => setQuantityInput(parseInt(e.target.value, 10) || 1)}
                        className={`w-full h-12 text-lg font-black px-4 text-center rounded-xl border-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-brand-primary ${
                          allocationCalc.hasError && quantityInput > 0
                            ? "border-rose-400 dark:border-rose-700 ring-2 ring-rose-500/20"
                            : "border-slate-200 dark:border-slate-700"
                        }`}
                      />

                      <button
                        type="button"
                        onClick={() => setQuantityInput(Math.min(allocationCalc.maxAvailable, (quantityInput || 1) + 1))}
                        disabled={quantityInput >= allocationCalc.maxAvailable}
                        className="h-12 w-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-40 cursor-pointer"
                        title="Increase by 1"
                      >
                        <Plus className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setQuantityInput(Math.max(1, allocationCalc.maxAvailable))}
                        disabled={allocationCalc.maxAvailable <= 0}
                        className="h-12 px-4 text-xs font-black rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 whitespace-nowrap transition cursor-pointer disabled:opacity-50"
                      >
                        Max ({allocationCalc.maxAvailable})
                      </button>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-xs font-semibold text-slate-400 mr-1">Quick:</span>
                      <button
                        type="button"
                        onClick={() => setQuantityInput(1)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          quantityInput === 1
                            ? "bg-brand-primary text-white border-brand-primary"
                            : "border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        1 {allocationCalc.packagingUnitLabel}
                      </button>
                      {allocationCalc.maxAvailable >= 5 && (
                        <button
                          type="button"
                          onClick={() => setQuantityInput(5)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                            quantityInput === 5
                              ? "bg-brand-primary text-white border-brand-primary"
                              : "border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          5 {allocationCalc.packagingUnitLabel}s
                        </button>
                      )}
                      {allocationCalc.maxAvailable >= 10 && (
                        <button
                          type="button"
                          onClick={() => setQuantityInput(10)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                            quantityInput === 10
                              ? "bg-brand-primary text-white border-brand-primary"
                              : "border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          10 {allocationCalc.packagingUnitLabel}s
                        </button>
                      )}
                      {allocationCalc.maxAvailable > 1 && (
                        <button
                          type="button"
                          onClick={() => setQuantityInput(Math.max(1, Math.floor(allocationCalc.maxAvailable / 2)))}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                        >
                          Half (50%)
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setQuantityInput(Math.max(1, allocationCalc.maxAvailable))}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold border border-brand-primary/40 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 transition cursor-pointer"
                      >
                        All Remaining (100%)
                      </button>
                    </div>

                    {/* Unit conversion summary */}
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      <Sparkles className="h-3.5 w-3.5 text-brand-primary shrink-0" />
                      <span>
                        Placing: <strong className="text-slate-900 dark:text-white">{allocationCalc.packagingDisplay}</strong> ={" "}
                        <strong className="text-brand-primary font-mono">{allocationCalc.baseUnits.toLocaleString()} {packConfig.unit}s</strong>
                      </span>
                    </div>

                    {allocationCalc.hasError && allocationCalc.validationMsg && (
                      <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-2 flex items-center gap-1.5 animate-in fade-in">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{allocationCalc.validationMsg}</span>
                      </p>
                    )}
                  </div>

                  {/* Destination Location: Smart Searchable & Dynamic Hierarchy */}
                  <SmartLocationSelector
                    racks={racks}
                    selectedRackId={rackId}
                    selectedShelfId={shelfId}
                    selectedBinId={binId}
                    onSelect={(rId, sId, bId) => {
                      setRackId(rId);
                      setShelfId(sId);
                      setBinId(bId);
                    }}
                    label="Destination Location (Rack / Refrigerator / Shelf)"
                    required={true}
                  />

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting || allocationCalc.hasError || !rackId}
                    className="w-full inline-flex items-center justify-center gap-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white py-4 px-6 rounded-xl font-black text-base shadow-sm hover:shadow transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Allocating Stock...</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="h-5 w-5" />
                        <span>Place Stock in Rack</span>
                        <ArrowRight className="h-5 w-5" />
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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm max-w-3xl space-y-6">
          <form onSubmit={handleRelocateShelfStock} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Select Batch to Relocate
              </label>
              <select
                value={relocateBatchId}
                onChange={(e) => {
                  setRelocateBatchId(e.target.value);
                  setSourceLocId("");
                }}
                className="w-full h-12 text-sm px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold"
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
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Source Physical Location
                </label>
                <select
                  value={sourceLocId}
                  onChange={(e) => setSourceLocId(e.target.value)}
                  className="w-full h-12 text-sm px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold"
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
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Relocation Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={relocateQty}
                  onChange={(e) => setRelocateQty(parseInt(e.target.value, 10) || 1)}
                  className="w-full h-12 text-base font-black px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Packaging Unit
                </label>
                <select
                  value={relocateUnit}
                  onChange={(e) => setRelocateUnit(e.target.value as any)}
                  className="w-full h-12 text-sm px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold"
                >
                  <option value="BOX">Box</option>
                  <option value="STRIP">Strip</option>
                  <option value="TABLET">Tablet / Piece</option>
                </select>
              </div>
            </div>

            <SmartLocationSelector
              racks={racks}
              selectedRackId={destRackId}
              selectedShelfId={destShelfId}
              selectedBinId={destBinId}
              onSelect={(rId, sId, bId) => {
                setDestRackId(rId);
                setDestShelfId(sId);
                setDestBinId(bId);
              }}
              label="Destination Location"
              required={true}
            />

            <button
              type="submit"
              disabled={submitting || !relocateBatchId || !sourceLocId || !destRackId}
              className="w-full inline-flex items-center justify-center gap-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white py-4 px-6 rounded-xl font-black text-base shadow-sm hover:shadow transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Relocating Stock...</span>
                </>
              ) : (
                <>
                  <ArrowLeftRight className="h-5 w-5" />
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
