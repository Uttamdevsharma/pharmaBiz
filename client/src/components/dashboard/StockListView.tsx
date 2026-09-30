"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { fetchApi } from "@/lib/api";
import { InventoryItem } from "@/types";
import { useBranchContext } from "@/context/BranchContext";
import { showAlert } from "@/lib/swal";
import {
  calculatePackaging,
  calculateLocationPackaging,
  calculateBatchBulkPackaging,
  PackagingConfig,
} from "@/lib/packaging";
import { OwnerModule } from "./DashboardSidebar";
import {
  Boxes,
  Plus,
  Search,
  Store,
  MapPin,
  Loader2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  X,
  Barcode,
  Calendar,
  ChevronRight,
  ChevronDown,
  Package,
  Sparkles,
  Layers,
  MoreVertical,
  ArrowRightLeft,
  LayoutGrid,
  Table as TableIcon,
  CheckCircle2,
  ExternalLink,
  Filter,
  Warehouse,
  Building2,
  ChevronLeft,
  RotateCcw,
  Clock,
  AlertCircle,
  Truck,
  Eye,
  ShieldAlert,
  Check,
  Download,
} from "lucide-react";

export interface BatchStockItem extends InventoryItem {
  isExpired: boolean;
  daysLeft: number | null;
  inRackQty: number;
  notInRackQty: number;
  primaryLocation: string;
  storageGroupName?: string;
  storageLocationDetails?: string | null;
}

export interface ProductStockGroup {
  productId: string;
  productName: string;
  genericName?: string | null;
  brandName?: string | null;
  manufacturer?: string | null;
  category?: string | null;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  size?: string | null;
  packageType?: string | null;
  boxesPerCarton?: number | null;
  stripsPerBox?: number | null;
  tabletsPerStrip?: number | null;
  minStockLevel?: number;
  shopMinStockAlert?: number;
  godownMinStockAlert?: number;
  totalQuantity: number;
  totalGodownQuantity: number;
  totalRackQuantity: number;
  batches: BatchStockItem[];
  hasExpired: boolean;
  hasExpiringSoon: boolean;
  hasLowStock: boolean;
  hasShopStock: boolean;
  hasGodownStock: boolean;
  isShopLowStock: boolean;
  isGodownLowStock: boolean;
  primaryLocation?: string;
  storageGroupName?: string;
  storageLocationDetails?: string | null;
  earliestExpiry: Date | null;
  supplierName?: string | null;
  supplierPhone?: string | null;
  latestInvoiceNo?: string | null;
}

interface StockListViewProps {
  onNavigate: (module: OwnerModule, extraParams?: any) => void;
  selectedBranchId?: string;
}

let cachedStockList: InventoryItem[] = [];

export function StockListView({ onNavigate, selectedBranchId: propBranchId }: StockListViewProps) {
  const {
    selectedBranchId: contextBranchId,
    currentBranch,
  } = useBranchContext();

  const effectiveBranchId = propBranchId !== undefined ? propBranchId : contextBranchId;
  const [rawInventory, setRawInventory] = useState<InventoryItem[]>(() => cachedStockList);
  const [loading, setLoading] = useState(() => cachedStockList.length === 0);

  // Search state (Direct table filtering, NO DROPDOWN POPUP)
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Selected Product for dedicated full-page Product Stock Hub view (NO MODAL)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [inspectedBatchId, setInspectedBatchId] = useState<string | null>(null);
  const [activeMenuLocId, setActiveMenuLocId] = useState<string | null>(null);
  const [isOtherBatchesOpen, setIsOtherBatchesOpen] = useState(true);

  // Load branch inventory batches
  const loadBranchStock = async () => {
    try {
      if (cachedStockList.length === 0) setLoading(true);
      const params = new URLSearchParams();
      params.append("limit", "1000");

      const targetPath =
        effectiveBranchId && effectiveBranchId !== "all"
          ? `/inventory/branch/${effectiveBranchId}?${params.toString()}`
          : `/inventory/branch/all?${params.toString()}`;

      const res = await fetchApi(targetPath);
      if (res.success && res.data) {
        cachedStockList = res.data;
        setRawInventory(res.data);
      }
    } catch (err) {
      console.error("Failed to load branch stock", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranchStock();
  }, [effectiveBranchId]);

  // Click outside to close 3-dot location menu
  useEffect(() => {
    function handleOutsideMenu(e: MouseEvent) {
      if (activeMenuLocId) {
        const target = e.target as HTMLElement;
        if (!target.closest("[data-menu-container]")) {
          setActiveMenuLocId(null);
        }
      }
    }
    document.addEventListener("mousedown", handleOutsideMenu);
    return () => document.removeEventListener("mousedown", handleOutsideMenu);
  }, [activeMenuLocId]);

  // Format and sort all batches by FEFO (Earliest Expiry Date First)
  const sortedBatches: BatchStockItem[] = useMemo(() => {
    const now = new Date();

    const mapped = rawInventory.map((item) => {
      const exp = item.expiryDate ? new Date(item.expiryDate) : null;
      const isExpired = exp ? exp < now : false;
      const daysLeft = exp ? Math.ceil((exp.getTime() - now.getTime()) / 86400000) : null;

      // In-Rack stock
      let inRackQty = 0;
      if (item.locations && Array.isArray(item.locations)) {
        for (const loc of item.locations) {
          inRackQty += loc.quantity || 0;
        }
      }
      const notInRackQty = Math.max(0, (item.quantity || 0) - inRackQty);

      // Primary location summary (Group Name + Location Details)
      let primaryLocation = "Not in Rack";
      let storageGroupName = "";
      let storageLocationDetails: string | null = null;

      if (item.locations && item.locations.length > 0) {
        const placed = item.locations.find((l: any) => (l.quantity || 0) > 0) || item.locations[0];
        const rName = placed.rack?.name || (placed.rackName && placed.rackName !== "—" ? placed.rackName : "");
        const rLoc = placed.rack?.location;
        const sName = placed.shelf?.name || (placed.shelfName && placed.shelfName !== "—" ? placed.shelfName : "");
        const bName = placed.bin?.name || (placed.binName && placed.binName !== "—" ? placed.binName : "");

        const cleanShelf = sName && sName !== "S01" && sName !== "—" && sName.toLowerCase() !== "none" ? sName : "";
        const cleanBin = bName && bName.toLowerCase() !== "none" && bName.toLowerCase() !== "n/a" && bName !== "B01" && bName !== "—" ? bName : "";

        storageGroupName = rName || "Shop Shelf";

        if (rLoc && rLoc.trim()) {
          storageLocationDetails = rLoc.trim();
          if (cleanShelf && !rLoc.toLowerCase().includes(cleanShelf.toLowerCase())) {
            storageLocationDetails += ` • ${cleanShelf}`;
          }
          if (cleanBin) {
            storageLocationDetails += ` • ${cleanBin}`;
          }
        } else if (cleanShelf) {
          storageLocationDetails = cleanBin ? `${cleanShelf} › ${cleanBin}` : cleanShelf;
        } else {
          storageLocationDetails = null;
        }

        primaryLocation = storageLocationDetails ? `${storageGroupName} (${storageLocationDetails})` : storageGroupName;
      }

      return {
        ...item,
        isExpired,
        daysLeft,
        inRackQty,
        notInRackQty,
        primaryLocation,
        storageGroupName,
        storageLocationDetails,
      };
    });

    return mapped.sort((a, b) => {
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
    });
  }, [rawInventory]);

  // ══════════════════════════════════════════════════════════════════════════
  // IN-PLACE MOVE STOCK TO SHOP MODAL LOGIC
  // ══════════════════════════════════════════════════════════════════════════
  const [storageGroups, setStorageGroups] = useState<any[]>([]);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [movingProduct, setMovingProduct] = useState<ProductStockGroup | null>(null);
  const [movingBatchId, setMovingBatchId] = useState<string>("");
  const [isBatchPreselected, setIsBatchPreselected] = useState<boolean>(false);
  const [movingTargetGroupId, setMovingTargetGroupId] = useState<string>("");
  const [groupSearchQuery, setGroupSearchQuery] = useState<string>("");
  const [movingQuantity, setMovingQuantity] = useState<number>(1);
  const [movingUnitType, setMovingUnitType] = useState<"BOX" | "STRIP" | "TABLET">("BOX");
  const [moveSubmitting, setMoveSubmitting] = useState(false);

  // Load storage groups
  const loadStorageGroups = async () => {
    if (!effectiveBranchId || effectiveBranchId === "all") return;
    try {
      const res = await fetchApi<any>(`/locations?branchId=${encodeURIComponent(effectiveBranchId)}`);
      let list: any[] = [];
      if (Array.isArray(res)) list = res;
      else if (Array.isArray(res?.data)) list = res.data;
      else if (Array.isArray((res as any)?.racks)) list = (res as any).racks;
      setStorageGroups(list);
    } catch (err) {
      console.error("Failed to load storage groups", err);
    }
  };

  useEffect(() => {
    loadStorageGroups();
  }, [effectiveBranchId]);

  // Open Move to Shop modal with pre-selected batch and auto-suggested group
  const handleOpenMoveModal = (product: ProductStockGroup, specificBatchId?: string) => {
    const availableBatches = [...product.batches]
      .filter((b) => b.notInRackQty > 0)
      .sort((a, b) => {
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      });
    const targetBatch =
      (specificBatchId ? product.batches.find((b) => b.id === specificBatchId) : null) ||
      availableBatches[0] ||
      product.batches[0];

    setMovingProduct(product);
    setMovingBatchId(targetBatch?.id || "");
    setIsBatchPreselected(Boolean(specificBatchId));
    setMovingQuantity(1);

    const u = (product.unit || "").toLowerCase();
    const pkg = (product.packageType || "").toUpperCase();
    if (u === "bottle" || pkg === "BOTTLE" || u === "piece" || pkg === "PIECE" || u === "vial" || pkg === "VIAL") {
      setMovingUnitType("TABLET");
    } else {
      setMovingUnitType("BOX");
    }

    // Auto-suggest group by manufacturer/brand or generic name
    const comp = (product.manufacturer || product.brandName || "").toLowerCase();
    const gen = (product.genericName || "").toLowerCase();
    const matched = storageGroups.find((g) => {
      const gn = (g.name || "").toLowerCase();
      return (comp && gn.includes(comp)) || (gen && gn.includes(gen));
    });
    setMovingTargetGroupId(matched?.id || storageGroups[0]?.id || "");
    setGroupSearchQuery("");
    setMoveModalOpen(true);
  };

  // Batches for the moving product, sorted by expiry date ascending (FEFO)
  const sortedMovingBatches = useMemo(() => {
    if (!movingProduct) return [];
    return [...movingProduct.batches]
      .filter((b) => b.notInRackQty > 0)
      .sort((a, b) => {
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      });
  }, [movingProduct]);

  // Total Godown stock across all batches for the moving product
  const totalGodownUnitsAcrossBatches = useMemo(() => {
    if (!movingProduct) return 0;
    return movingProduct.batches.reduce((sum, b) => sum + (b.notInRackQty || 0), 0);
  }, [movingProduct]);

  // Selected batch inside the move modal
  const selectedMovingBatch = useMemo(() => {
    if (!movingProduct) return null;
    return movingProduct.batches.find((b) => b.id === movingBatchId) || sortedMovingBatches[0] || movingProduct.batches[0] || null;
  }, [movingProduct, movingBatchId, sortedMovingBatches]);

  // Godown quantity and live packaging calculations
  const godownAvailableUnits = selectedMovingBatch?.notInRackQty || 0;
  const moveTabsPerStrip = Math.max(1, movingProduct?.tabletsPerStrip || 10);
  const moveStripsPerBox = Math.max(1, movingProduct?.stripsPerBox || 10);
  const moveTabsPerBox = moveStripsPerBox * moveTabsPerStrip;

  const isTabletPackaging =
    movingProduct?.packageType !== "BOTTLE" &&
    movingProduct?.packageType !== "PIECE" &&
    movingProduct?.packageType !== "VIAL" &&
    !movingProduct?.unit?.toLowerCase().includes("bottle") &&
    !movingProduct?.unit?.toLowerCase().includes("vial");

  let baseUnitsToMove = Math.max(0, Number(movingQuantity) || 0);
  if (isTabletPackaging) {
    if (movingUnitType === "BOX") {
      baseUnitsToMove = (Number(movingQuantity) || 0) * moveTabsPerBox;
    } else if (movingUnitType === "STRIP") {
      baseUnitsToMove = (Number(movingQuantity) || 0) * moveTabsPerStrip;
    }
  }

  const isMoveOverLimit = baseUnitsToMove > godownAvailableUnits;
  const remainingGodownUnits = Math.max(0, godownAvailableUnits - baseUnitsToMove);

  const availableBoxesCount = isTabletPackaging ? Math.floor(godownAvailableUnits / moveTabsPerBox) : 0;
  const availableLooseTabsCount = isTabletPackaging ? godownAvailableUnits % moveTabsPerBox : 0;

  const remainingBoxesCount = isTabletPackaging ? Math.floor(remainingGodownUnits / moveTabsPerBox) : 0;
  const remainingLooseTabsCount = isTabletPackaging ? remainingGodownUnits % moveTabsPerBox : 0;

  // Filter groups in move modal by search query
  const filteredModalGroups = useMemo(() => {
    if (!groupSearchQuery.trim()) return storageGroups;
    const q = groupSearchQuery.toLowerCase().trim();
    return storageGroups.filter(
      (g) =>
        (g.name || "").toLowerCase().includes(q) ||
        (g.type || "").toLowerCase().includes(q) ||
        (g.location || "").toLowerCase().includes(q) ||
        (g.description || "").toLowerCase().includes(q)
    );
  }, [storageGroups, groupSearchQuery]);

  // Auto suggested group match badge
  const autoSuggestedGroup = useMemo(() => {
    if (!movingProduct) return null;
    const comp = (movingProduct.manufacturer || movingProduct.brandName || "").toLowerCase();
    const gen = (movingProduct.genericName || "").toLowerCase();
    return storageGroups.find((g) => {
      const gn = (g.name || "").toLowerCase();
      return (comp && gn.includes(comp)) || (gen && gn.includes(gen));
    });
  }, [movingProduct, storageGroups]);

  // Submit Move Stock to Supershop
  const handleConfirmMoveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMovingBatch || !movingTargetGroupId) {
      showAlert.error("Missing Group", "Please select which Shop Group to allocate this medicine into.");
      return;
    }
    if (baseUnitsToMove <= 0 || isMoveOverLimit) {
      showAlert.error("Invalid Quantity", "Quantity to move must not exceed available Godown stock.");
      return;
    }

    try {
      setMoveSubmitting(true);
      const res = await fetchApi<any>("/inventory/allocate", {
        method: "POST",
        body: JSON.stringify({
          inventoryId: selectedMovingBatch.id,
          rackId: movingTargetGroupId,
          shelfId: null,
          binId: null,
          quantity: baseUnitsToMove,
        }),
      });

      if (res?.success || (res as any)?.location || (res as any)?.data) {
        showAlert.success(
          "Stock Moved to Shop!",
          `Successfully moved ${baseUnitsToMove.toLocaleString()} ${movingProduct?.unit || "units"} into front store group.`,
          { timer: 2000 }
        );
        setMoveModalOpen(false);
        await loadBranchStock();
      } else {
        showAlert.error("Move Failed", res?.message || "Failed to allocate stock.");
      }
    } catch (err: any) {
      console.error("Allocation error:", err);
      showAlert.error("Error", err.message || "Failed to move stock.");
    } finally {
      setMoveSubmitting(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // MASTER STOCK TABLE: GROUPING, FILTERS, SEARCH & PAGINATION
  // ══════════════════════════════════════════════════════════════════════════
  type StockFilterType = "ALL" | "IN_SHOP" | "IN_GODOWN" | "SHOP_LOW" | "GODOWN_LOW";
  const [activeFilter, setActiveFilter] = useState<StockFilterType>("ALL");
  const [selectedCompany, setSelectedCompany] = useState<string>("ALL");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Group batches by productId to form Master Product Groups
  const productGroups: ProductStockGroup[] = useMemo(() => {
    const map = new Map<string, ProductStockGroup>();

    for (const batch of sortedBatches) {
      const pid = batch.productId || batch.id;
      const rawSupplier =
        batch.supplier?.name ||
        (batch as any).supplier?.name ||
        batch.receivingRecords?.[0]?.supplier?.name ||
        (batch as any).product?.supplier?.name ||
        null;
      const rawBrand =
        batch.brandName ||
        (batch as any).manufacturer ||
        (batch as any).product?.manufacturer ||
        (batch as any).product?.brandName ||
        null;
      const resolvedCompany =
        (rawSupplier && rawSupplier.length > 2)
          ? rawSupplier
          : (rawBrand && rawBrand.length > 2)
          ? rawBrand
          : (rawSupplier || rawBrand || null);

      if (!map.has(pid)) {
        map.set(pid, {
          productId: pid,
          productName: batch.productName || "Unknown Product",
          genericName: batch.genericName || null,
          brandName: resolvedCompany,
          manufacturer: resolvedCompany || (batch as any).manufacturer || (batch as any).product?.manufacturer || null,
          category: batch.category || null,
          sku: batch.sku || null,
          barcode: batch.barcode || null,
          unit: batch.unit || "tablets",
          size: batch.size || null,
          packageType: batch.packageType || null,
          boxesPerCarton: batch.boxesPerCarton || null,
          stripsPerBox: batch.stripsPerBox || null,
          tabletsPerStrip: batch.tabletsPerStrip || null,
          minStockLevel: (batch as any).product?.minStockAlert ?? (batch as any).minStockAlert ?? (batch as any).minStockLevel ?? 10,
          shopMinStockAlert: (batch as any).product?.shopMinStockAlert ?? (batch as any).shopMinStockAlert ?? (batch as any).product?.minStockAlert ?? 10,
          godownMinStockAlert: (batch as any).product?.godownMinStockAlert ?? (batch as any).godownMinStockAlert ?? 50,
          totalQuantity: 0,
          totalGodownQuantity: 0,
          totalRackQuantity: 0,
          batches: [],
          hasExpired: false,
          hasExpiringSoon: false,
          hasLowStock: false,
          hasShopStock: false,
          hasGodownStock: false,
          isShopLowStock: false,
          isGodownLowStock: false,
          primaryLocation: "Not in Rack",
          storageGroupName: "",
          storageLocationDetails: null,
          earliestExpiry: null,
          supplierName: rawSupplier,
          supplierPhone: batch.supplier?.phone || batch.receivingRecords?.[0]?.supplier?.phone || null,
          latestInvoiceNo: batch.receivingRecords?.[0]?.invoiceNo || null,
        });
      }

      const grp = map.get(pid)!;
      grp.totalQuantity += batch.quantity || 0;
      grp.totalGodownQuantity += batch.notInRackQty || 0;
      grp.totalRackQuantity += batch.inRackQty || 0;
      grp.batches.push(batch);

      if (rawSupplier) {
        if (!grp.supplierName || grp.supplierName.length <= 2) {
          grp.supplierName = rawSupplier;
        }
        if (!grp.brandName || grp.brandName.length <= 2) {
          grp.brandName = rawSupplier;
        }
      }
      if (!grp.supplierPhone && (batch.supplier?.phone || batch.receivingRecords?.[0]?.supplier?.phone)) {
        grp.supplierPhone = batch.supplier?.phone || batch.receivingRecords?.[0]?.supplier?.phone || null;
      }
      if (!grp.latestInvoiceNo && batch.receivingRecords?.[0]?.invoiceNo) {
        grp.latestInvoiceNo = batch.receivingRecords[0].invoiceNo;
      }

      if (batch.isExpired) grp.hasExpired = true;
      if (batch.daysLeft !== null && batch.daysLeft <= 90 && !batch.isExpired) {
        grp.hasExpiringSoon = true;
      }
      if (batch.notInRackQty > 0) {
        grp.hasGodownStock = true;
      }

      if (batch.expiryDate) {
        const d = new Date(batch.expiryDate);
        if (!grp.earliestExpiry || d < grp.earliestExpiry) {
          grp.earliestExpiry = d;
        }
      }
    }

    // Accurate Product-level Low Stock evaluation: across shop & godown
    const list = Array.from(map.values());
    for (const grp of list) {
      const shopAlert = grp.shopMinStockAlert ?? grp.minStockLevel ?? 10;
      const godownAlert = grp.godownMinStockAlert ?? 50;
      
      grp.hasShopStock = grp.totalRackQuantity > 0;
      grp.hasGodownStock = grp.totalGodownQuantity > 0;

      // Shop Low Stock: if shop stock is low (<= shopAlert, or 0 while godown has stock)
      grp.isShopLowStock = grp.totalRackQuantity <= shopAlert || (grp.totalRackQuantity === 0 && grp.totalGodownQuantity > 0);

      // Godown Low Stock: if godown stock is low (<= godownAlert)
      grp.isGodownLowStock = grp.totalGodownQuantity <= godownAlert;

      // Overall Low Stock flag
      grp.hasLowStock = grp.totalQuantity <= (grp.minStockLevel || godownAlert) || grp.isShopLowStock || grp.isGodownLowStock;

      // Resolve primary rack/shelf location
      const placedBatch = grp.batches.find((b) => b.inRackQty > 0 && b.storageGroupName && b.storageGroupName !== "Not in Rack");
      const defaultBatch = grp.batches[0];
      grp.storageGroupName = placedBatch?.storageGroupName || defaultBatch?.storageGroupName || "Not in Rack";
      grp.storageLocationDetails = placedBatch?.storageLocationDetails ?? defaultBatch?.storageLocationDetails ?? null;
      grp.primaryLocation = placedBatch?.primaryLocation || defaultBatch?.primaryLocation || "Not in Rack";
    }

    return list;
  }, [sortedBatches]);

  // Available Companies for Dropdown filter
  const availableCompanies = useMemo(() => {
    const set = new Set<string>();
    for (const p of productGroups) {
      if (p.brandName && p.brandName.trim()) {
        set.add(p.brandName.trim());
      } else if (p.supplierName && p.supplierName.trim()) {
        set.add(p.supplierName.trim());
      }
    }
    return Array.from(set).sort();
  }, [productGroups]);

  // Counts for Quick Filter Tabs
  const filterCounts = useMemo(() => {
    let inShop = 0;
    let inGodown = 0;
    let shopLow = 0;
    let godownLow = 0;

    for (const p of productGroups) {
      if (p.hasShopStock) inShop++;
      if (p.hasGodownStock) inGodown++;
      if (p.isShopLowStock) shopLow++;
      if (p.isGodownLowStock) godownLow++;
    }

    return {
      all: productGroups.length,
      inShop,
      inGodown,
      shopLow,
      godownLow,
    };
  }, [productGroups]);

  // Filter products by company, quick filter, and search
  const filteredProducts = useMemo(() => {
    let list = productGroups;

    if (selectedCompany !== "ALL") {
      list = list.filter(
        (p) =>
          p.brandName?.toLowerCase() === selectedCompany.toLowerCase() ||
          p.supplierName?.toLowerCase() === selectedCompany.toLowerCase()
      );
    }

    if (activeFilter === "IN_SHOP") {
      list = list.filter((p) => p.hasShopStock);
    } else if (activeFilter === "IN_GODOWN") {
      list = list.filter((p) => p.hasGodownStock);
    } else if (activeFilter === "SHOP_LOW") {
      list = list.filter((p) => p.isShopLowStock);
    } else if (activeFilter === "GODOWN_LOW") {
      list = list.filter((p) => p.isGodownLowStock);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((p) => {
        const matchName = p.productName.toLowerCase().includes(q);
        const matchGen = (p.genericName || "").toLowerCase().includes(q);
        const matchBrand = (p.brandName || "").toLowerCase().includes(q);
        const matchMfg = (p.manufacturer || "").toLowerCase().includes(q);
        const matchSupplier = (p.supplierName || "").toLowerCase().includes(q);
        const matchSku = (p.sku || "").toLowerCase().includes(q);
        const matchBarcode = (p.barcode || "").toLowerCase().includes(q);
        const matchBatch = p.batches.some((b) => {
          const bNum = (b.batchNumber || "").toLowerCase();
          const bSup = (b.supplier?.name || "").toLowerCase();
          const bMfg = ((b as any).manufacturer || (b as any).product?.manufacturer || "").toLowerCase();
          const bBrand = ((b as any).brandName || "").toLowerCase();
          return bNum.includes(q) || bSup.includes(q) || bMfg.includes(q) || bBrand.includes(q);
        });
        return (
          matchName ||
          matchGen ||
          matchBrand ||
          matchMfg ||
          matchSupplier ||
          matchSku ||
          matchBarcode ||
          matchBatch
        );
      });
    }

    // Sort order
    if (activeFilter === "SHOP_LOW") {
      return list.sort((a, b) => a.totalRackQuantity - b.totalRackQuantity);
    }
    if (activeFilter === "GODOWN_LOW") {
      return list.sort((a, b) => a.totalGodownQuantity - b.totalGodownQuantity);
    }
    if (activeFilter === "IN_SHOP") {
      return list.sort((a, b) => b.totalRackQuantity - a.totalRackQuantity);
    }
    if (activeFilter === "IN_GODOWN") {
      return list.sort((a, b) => b.totalGodownQuantity - a.totalGodownQuantity);
    }

    return list.sort((a, b) => a.productName.localeCompare(b.productName));
  }, [productGroups, selectedCompany, activeFilter, search]);

  // Reset page when filter or search changes
  useEffect(() => {
    setPage(1);
  }, [activeFilter, selectedCompany, search, pageSize]);

  // Paginated products slice
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, page, pageSize]);

  const [isExportingStock, setIsExportingStock] = useState(false);

  const handleExportStockCsv = () => {
    try {
      setIsExportingStock(true);
      const list = filteredProducts.length > 0 ? filteredProducts : productGroups;

      if (!list || list.length === 0) {
        showAlert.info("No Stock", "No stock items available to export.");
        return;
      }

      const headers = [
        "Medicine Name",
        "Generic Name",
        "Manufacturer / Company",
        "Total Stock (Units)",
        "In Shop (Units)",
        "In Godown (Units)",
        "Shop Storage Location",
        "Supplier",
        "Stock Status",
      ];

      const escapeVal = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val);
        return `"${str.replace(/"/g, '""')}"`;
      };

      const rows = list.map((p) => {
        let status = "In Stock";
        if (p.isShopLowStock && p.isGodownLowStock) status = "Critical Low";
        else if (p.isShopLowStock) status = "Shop Low";
        else if (p.isGodownLowStock) status = "Godown Low";
        if (p.hasExpired) status += " (Has Expired Batch)";
        else if (p.hasExpiringSoon) status += " (Expiring Soon)";

        return [
          escapeVal(p.productName),
          escapeVal(p.genericName || ""),
          escapeVal(p.brandName || ""),
          p.totalQuantity,
          p.totalRackQuantity,
          p.totalGodownQuantity,
          escapeVal(p.storageGroupName || p.primaryLocation || "Not in Rack"),
          escapeVal(p.supplierName || ""),
          escapeVal(status),
        ];
      });

      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pharmabiz_stock_report_${activeFilter.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showAlert.toast(`Exported ${list.length} stock items to CSV!`, "success");
    } catch (err: any) {
      console.error("Export stock error:", err);
      showAlert.error("Export Failed", err.message || "Failed to export stock.");
    } finally {
      setIsExportingStock(false);
    }
  };

  const handleAllocateProduct = (p: ProductStockGroup) => {
    handleOpenMoveModal(p);
  };

  // Selected Product memo
  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return productGroups.find((p) => p.productId === selectedProductId) || null;
  }, [productGroups, selectedProductId]);

  // Calculated details for Selected Product
  const selectedProductDetails = useMemo(() => {
    if (!selectedProduct) return null;

    const firstBatch = selectedProduct.batches[0];
    const packConfig: PackagingConfig = {
      packageType: selectedProduct.packageType || firstBatch?.packageType || "MEDICINE",
      boxesPerCarton: selectedProduct.boxesPerCarton || firstBatch?.boxesPerCarton || 10,
      stripsPerBox: selectedProduct.stripsPerBox || firstBatch?.stripsPerBox || 10,
      tabletsPerStrip: selectedProduct.tabletsPerStrip || firstBatch?.tabletsPerStrip || 10,
      unit: selectedProduct.unit || firstBatch?.unit || "tablet",
    };

    const overallPackaging = calculatePackaging(selectedProduct.totalQuantity || 0, packConfig);

    // Readable breakdown for overall product (e.g. "≈ 4 cartons, 6 boxes, 2 strips, 8 tabs")
    const overallParts: string[] = [];
    if (overallPackaging.fullCartons > 0) overallParts.push(`${overallPackaging.fullCartons} carton${overallPackaging.fullCartons > 1 ? "s" : ""}`);
    if (overallPackaging.looseBoxes > 0) overallParts.push(`${overallPackaging.looseBoxes} box${overallPackaging.looseBoxes > 1 ? "es" : ""}`);
    if (overallPackaging.remainingStrips > 0) overallParts.push(`${overallPackaging.remainingStrips} strip${overallPackaging.remainingStrips > 1 ? "s" : ""}`);
    if (overallPackaging.remainingTablets > 0) overallParts.push(`${overallPackaging.remainingTablets} tab${overallPackaging.remainingTablets > 1 ? "s" : ""}`);
    const overallFormula = overallParts.length > 0 ? `≈ ${overallParts.join(", ")}` : `${(selectedProduct.totalQuantity || 0).toLocaleString()} ${packConfig.unit || "units"}`;

    // Aggregated Supershop Shelf Locations across all batches
    interface AggregatedShelfLocation {
      key: string;
      rackName: string;
      shelfName: string;
      binName?: string;
      label: string;
      quantity: number;
      batches: string[];
    }

    const locMap = new Map<string, AggregatedShelfLocation>();

    for (const b of selectedProduct.batches) {
      if (b.locations && Array.isArray(b.locations)) {
        for (const loc of b.locations) {
          if (loc.quantity > 0) {
            const rName = loc.rack?.name || loc.rackName || "Rack R01";
            const sName = loc.shelf?.name || loc.shelfName || "";
            const bName = loc.bin?.name || loc.binName || "";
            const cleanBin = bName && bName.toLowerCase() !== "none" && bName.toLowerCase() !== "n/a" && bName !== "B01" ? bName : "";

            const key = `${rName}|||${sName}|||${cleanBin}`;
            let label = rName;
            if (sName && sName !== "S01") label += ` › ${sName}`;
            if (cleanBin) label += ` › ${cleanBin}`;

            if (!locMap.has(key)) {
              locMap.set(key, {
                key,
                rackName: rName,
                shelfName: sName,
                binName: cleanBin,
                label,
                quantity: 0,
                batches: [],
              });
            }
            const item = locMap.get(key)!;
            item.quantity += loc.quantity;
            if (b.batchNumber && !item.batches.includes(b.batchNumber)) {
              item.batches.push(b.batchNumber);
            }
          }
        }
      }
    }

    const aggregatedLocations = Array.from(locMap.values()).sort((a, b) => b.quantity - a.quantity);

    const percentInRack = selectedProduct.totalQuantity > 0
      ? Math.round((selectedProduct.totalRackQuantity / selectedProduct.totalQuantity) * 100)
      : 0;
    const percentNotInRack = 100 - percentInRack;

    // Sourcing Suppliers
    const suppliersSet = new Map<string, { name: string; phone?: string | null; invoiceNo?: string | null }>();
    for (const b of selectedProduct.batches) {
      const sName = b.supplier?.name || b.receivingRecords?.[0]?.supplier?.name;
      const sPhone = b.supplier?.phone || b.receivingRecords?.[0]?.supplier?.phone;
      const invNo = b.receivingRecords?.[0]?.invoiceNo;
      if (sName) {
        if (!suppliersSet.has(sName)) {
          suppliersSet.set(sName, { name: sName, phone: sPhone, invoiceNo: invNo });
        }
      }
    }
    const suppliersList = Array.from(suppliersSet.values());

    return {
      packConfig,
      overallPackaging,
      overallFormula,
      aggregatedLocations,
      percentInRack,
      percentNotInRack,
      suppliersList,
    };
  }, [selectedProduct]);

  // ══════════════════════════════════════════════════════════════════════════
  // DEDICATED FULL-PAGE VIEW: MOVE STOCK TO SHOP
  // ══════════════════════════════════════════════════════════════════════════
  if (moveModalOpen && movingProduct && selectedMovingBatch) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto py-2 px-1">
        {/* Top Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <button
              type="button"
              onClick={() => setMoveModalOpen(false)}
              className="inline-flex items-center gap-2 text-sm sm:text-base font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition mb-2 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Back to Stock List</span>
            </button>
            <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-slate-900 dark:text-white tracking-tight">
              Move Stock to Shop
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMoveModalOpen(false)}
              className="px-5 py-2.5 rounded-none border border-slate-300 dark:border-slate-700 text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmMoveStock}
              disabled={moveSubmitting || !movingTargetGroupId || baseUnitsToMove <= 0 || isMoveOverLimit}
              style={{ backgroundColor: "var(--primary-color, #059669)" }}
              className="px-6 py-2.5 rounded-none text-white text-sm sm:text-base font-bold shadow-sm hover:opacity-90 disabled:opacity-50 transition cursor-pointer flex items-center gap-2 active:scale-95"
            >
              {moveSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Moving Stock...</span>
                </>
              ) : (
                <>
                  <Check className="h-5 w-5 stroke-[2.5]" />
                  <span>Confirm &amp; Move to Shop</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleConfirmMoveStock}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Medicine Details & Quantity */}
            <div className="lg:col-span-6 space-y-6">
              {/* Medicine Card */}
              <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                      {movingProduct.productName}
                      {movingProduct.size && (
                        <span className="ml-2 text-base font-medium text-slate-500 dark:text-slate-400">
                          ({movingProduct.size})
                        </span>
                      )}
                    </h2>
                    <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
                      {movingProduct.genericName ? `${movingProduct.genericName} • ` : ""}
                      {movingProduct.manufacturer || movingProduct.brandName || "Standard"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-3.5 py-1.5 rounded-none text-sm sm:text-base font-mono font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 block shadow-2xs">
                      Total Godown: {totalGodownUnitsAcrossBatches.toLocaleString()} {movingProduct.unit}
                    </span>
                  </div>
                </div>

                {/* Batch Information */}
                {isBatchPreselected && selectedMovingBatch ? (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                    <label className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-300 block mb-2">
                      Selected Batch:
                    </label>
                    <div className="flex items-center justify-between p-3.5 rounded-none bg-emerald-50/70 dark:bg-emerald-950/40 border border-brand-primary ring-1 ring-brand-primary">
                      <div>
                        <div className="text-base sm:text-lg font-mono font-bold text-slate-900 dark:text-white">
                          Batch #{selectedMovingBatch.batchNumber || "Default"}
                        </div>
                        <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                          Exp: {selectedMovingBatch.expiryDate ? new Date(selectedMovingBatch.expiryDate).toLocaleDateString() : "No Expiry"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm sm:text-base font-mono font-bold text-amber-700 dark:text-amber-300">
                          {selectedMovingBatch.notInRackQty.toLocaleString()} {movingProduct.unit}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Available in Batch</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-300">
                        Select Batch <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        Earliest expiry first (FEFO)
                      </span>
                    </div>

                    {/* Scrollable Batch List with visible scrollbar */}
                    <div className="max-h-56 overflow-y-auto space-y-2 p-1.5 border border-slate-200 dark:border-slate-800 rounded-none [scrollbar-width:thin] [scrollbar-color:#94a3b8_#f1f5f9] dark:[scrollbar-color:#64748b_#1e293b] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-none [&::-webkit-scrollbar-track]:bg-slate-100 dark:[&::-webkit-scrollbar-track]:bg-slate-800">
                      {sortedMovingBatches.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400">
                          No batch with godown stock available.
                        </div>
                      ) : (
                        sortedMovingBatches.map((b, idx) => {
                          const isSelected = movingBatchId === b.id;
                          const isFirst = idx === 0;

                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => setMovingBatchId(b.id)}
                              className={`w-full text-left p-3 rounded-none border transition flex items-center justify-between gap-3 cursor-pointer ${
                                isSelected
                                  ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-brand-primary ring-1 ring-brand-primary"
                                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm sm:text-base font-mono font-bold text-slate-900 dark:text-white">
                                    Batch #{b.batchNumber || "Default"}
                                  </span>
                                  {isFirst && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-none bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                                      Earliest Expiry
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                  Exp: {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : "No Expiry"}
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-3">
                                <div className="text-right">
                                  <div className="text-sm sm:text-base font-mono font-bold text-amber-700 dark:text-amber-300">
                                    {b.notInRackQty.toLocaleString()} {movingProduct.unit}
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Available</div>
                                </div>
                                {isSelected ? (
                                  <CheckCircle2 className="h-5 w-5 text-brand-primary shrink-0" />
                                ) : (
                                  <div className="h-5 w-5 rounded-full border border-slate-300 dark:border-slate-600 shrink-0" />
                                )}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Quantity to Move Card */}
              <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    Quantity to Move <span className="text-rose-500">*</span>
                  </h3>
                  <span className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
                    Moving: <strong className="text-brand-primary font-mono text-base sm:text-lg">{baseUnitsToMove.toLocaleString()}</strong> {movingProduct.unit}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      required
                      min={1}
                      value={movingQuantity}
                      onChange={(e) => setMovingQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full h-12 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-lg font-bold text-slate-900 dark:text-white outline-none focus:border-brand-primary font-mono"
                    />
                  </div>

                  {/* Unit Selector Toggle */}
                  {isTabletPackaging ? (
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-none">
                      {(["BOX", "STRIP", "TABLET"] as const).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setMovingUnitType(u)}
                          className={`py-2 rounded-none text-sm font-bold transition cursor-pointer text-center ${
                            movingUnitType === u
                              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          {u === "BOX" ? "Box" : u === "STRIP" ? "Strip" : "Tab"}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="h-12 px-4 rounded-none bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm sm:text-base font-bold text-slate-600 dark:text-slate-300">
                      Unit: {movingProduct.unit}
                    </div>
                  )}
                </div>

                {/* Live Stock Remaining Calculation Box */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-none border border-slate-200 dark:border-slate-700 text-sm space-y-2">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>Available in Selected Batch:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {isTabletPackaging && availableBoxesCount > 0
                        ? `${availableBoxesCount} Box${availableBoxesCount !== 1 ? "es" : ""}${availableLooseTabsCount > 0 ? ` + ${availableLooseTabsCount} ${movingProduct.unit}` : ""} (${godownAvailableUnits.toLocaleString()} ${movingProduct.unit})`
                        : `${godownAvailableUnits.toLocaleString()} ${movingProduct.unit}`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                    <span>Moving to Shop:</span>
                    <span className="font-mono">
                      + {baseUnitsToMove.toLocaleString()} {movingProduct.unit}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between font-bold">
                    <span className="text-slate-700 dark:text-slate-300">Remaining in Selected Batch:</span>
                    <span
                      className={`font-mono text-base ${
                        isMoveOverLimit ? "text-rose-600" : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {isTabletPackaging && remainingBoxesCount >= 0
                        ? `${remainingBoxesCount} Box${remainingBoxesCount !== 1 ? "es" : ""}${remainingLooseTabsCount > 0 ? ` + ${remainingLooseTabsCount} ${movingProduct.unit}` : ""} (${remainingGodownUnits.toLocaleString()} ${movingProduct.unit})`
                        : `${remainingGodownUnits.toLocaleString()} ${movingProduct.unit}`}
                    </span>
                  </div>

                  {isMoveOverLimit && (
                    <div className="pt-1.5 text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>Exceeds selected batch stock! Max available in this batch is {godownAvailableUnits.toLocaleString()} {movingProduct.unit}.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Location */}
            <div className="lg:col-span-6 space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    Location <span className="text-rose-500">*</span>
                  </h3>
                </div>

                {/* Instant Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search location or group (e.g. Beximco, Rack 02)..."
                    value={groupSearchQuery}
                    onChange={(e) => setGroupSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (filteredModalGroups.length > 0) {
                          setMovingTargetGroupId(filteredModalGroups[0].id);
                        }
                      }
                    }}
                    className="w-full h-11 pl-10 pr-9 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-sm sm:text-base outline-none focus:border-brand-primary text-slate-800 dark:text-slate-200"
                  />
                  {groupSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setGroupSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Direct 1-Click Selectable Location List with visible scrollbar */}
                <div className="max-h-[460px] overflow-y-auto space-y-2 p-1.5 border border-slate-200 dark:border-slate-800 rounded-none [scrollbar-width:thin] [scrollbar-color:#94a3b8_#f1f5f9] dark:[scrollbar-color:#64748b_#1e293b] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-none [&::-webkit-scrollbar-track]:bg-slate-100 dark:[&::-webkit-scrollbar-track]:bg-slate-800">
                  {filteredModalGroups.length === 0 ? (
                    <div className="py-10 text-center text-sm text-slate-400">
                      No location matching &quot;{groupSearchQuery}&quot;
                    </div>
                  ) : (
                    filteredModalGroups.map((g) => {
                      const isSelected = movingTargetGroupId === g.id;

                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setMovingTargetGroupId(g.id)}
                          className={`w-full text-left p-3.5 rounded-none border transition flex items-center justify-between gap-3 cursor-pointer ${
                            isSelected
                              ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-brand-primary ring-1 ring-brand-primary"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <span
                              className={`text-base sm:text-lg font-bold truncate block ${
                                isSelected
                                  ? "text-brand-primary dark:text-emerald-400"
                                  : "text-slate-900 dark:text-white"
                              }`}
                            >
                              {g.name}
                            </span>
                            {/* Physical rack/shelf location */}
                            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <span className="truncate">
                                {g.location || g.description || "Counter / Shelf"}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center">
                            {isSelected ? (
                              <CheckCircle2 className="h-5 w-5 text-brand-primary" />
                            ) : (
                              <div className="h-5 w-5 rounded-full border border-slate-300 dark:border-slate-600" />
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions Bar */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setMoveModalOpen(false)}
              className="px-6 py-2.5 rounded-none border border-slate-300 dark:border-slate-700 text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={moveSubmitting || !movingTargetGroupId || baseUnitsToMove <= 0 || isMoveOverLimit}
              style={{ backgroundColor: "var(--primary-color, #059669)" }}
              className="px-8 py-2.5 rounded-none text-white text-sm sm:text-base font-bold shadow-sm hover:opacity-90 disabled:opacity-50 transition cursor-pointer flex items-center gap-2 active:scale-95"
            >
              {moveSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Moving Stock...</span>
                </>
              ) : (
                <>
                  <Check className="h-5 w-5 stroke-[2.5]" />
                  <span>Confirm &amp; Move to Shop</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Stock Management</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Stock List</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Boxes className="h-7 w-7 text-brand-primary" />
            Stock List
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-none text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
            <Store className="h-4 w-4 text-brand-primary shrink-0" />
            <span>{currentBranch?.name || (effectiveBranchId ? "Current Branch" : "All Branches")}</span>
          </div>

          <button
            type="button"
            onClick={() => onNavigate("stock_add_stock")}
            className="h-11 px-5 bg-brand-primary hover:opacity-90 text-white rounded-none text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-md shadow-brand-primary/20 cursor-pointer active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Receive Stock</span>
          </button>
        </div>
      </div>

      {/* Prominent Search Bar (Filters Table Directly - Zero Dropdown Popup) */}
      {!selectedProductId && (
        <div className="relative max-w-3xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by Product Name, Generic, Company / Brand, Supplier, Barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-12 h-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-brand-primary rounded-none text-sm sm:text-base font-bold text-slate-900 dark:text-white placeholder:text-slate-400 shadow-xs outline-none transition"
            />

            {search ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  searchInputRef.current?.focus();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-none text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                title="Clear Search"
              >
                <X className="h-5 w-5" />
              </button>
            ) : null}
          </div>

          {search.trim() && (
            <div className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between px-1">
              <span>
                Filtering table: found <strong className="text-brand-primary font-mono font-black">{filteredProducts.length}</strong> matching product{filteredProducts.length !== 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-xs text-brand-primary hover:underline cursor-pointer font-bold"
              >
                Clear filter
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. DEDICATED FULL-PAGE PRODUCT STOCK HUB (PRODUCT-CENTRIC DETAILS VIEW)    */}
      {/* ========================================================================= */}
      {selectedProductId && selectedProduct && selectedProductDetails ? (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Top Navigation & Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setSelectedProductId(null);
                setInspectedBatchId(null);
                setSearch("");
              }}
              className="text-xs sm:text-sm font-bold text-brand-primary hover:text-brand-primary/80 transition flex items-center gap-1.5 cursor-pointer py-2 px-3.5 rounded-none bg-brand-primary/10 hover:bg-brand-primary/20 active:scale-95 w-fit"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>&larr; Back to Master Stock List</span>
            </button>

            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-none text-xs font-bold text-slate-700 dark:text-slate-300">
                <Store className="h-3.5 w-3.5 text-brand-primary shrink-0" />
                <span>{currentBranch?.name || "Current Branch"}</span>
              </div>

              {selectedProduct.totalGodownQuantity > 0 && (
                <button
                  type="button"
                  onClick={() => handleAllocateProduct(selectedProduct)}
                  className="h-9 px-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-none text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-amber-500/20 cursor-pointer active:scale-95"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Allocate to Shelf</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onNavigate("stock_add_stock")}
                className="h-9 px-3.5 bg-brand-primary hover:opacity-90 text-white rounded-none text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-brand-primary/20 cursor-pointer active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Receive More Stock</span>
              </button>
            </div>
          </div>

          {/* Product Profile & Sourcing Hero Card */}
          <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-none text-xs sm:text-sm font-extrabold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                    {selectedProduct.brandName || "Standard Brand"}
                  </span>
                  {selectedProduct.category && (
                    <span className="px-3 py-1 rounded-none text-xs sm:text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {selectedProduct.category}
                    </span>
                  )}
                  {(selectedProduct.barcode || selectedProduct.sku) && (
                    <span className="text-xs sm:text-sm font-mono text-slate-400 font-medium">
                      #{selectedProduct.barcode || selectedProduct.sku}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {selectedProduct.productName}
                </h1>

                {selectedProduct.genericName && (
                  <p className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedProduct.genericName}
                    {selectedProduct.size ? ` · ${selectedProduct.size}` : ""}
                  </p>
                )}
              </div>

              {/* Status and Supplier Sourcing Badges */}
              <div className="flex flex-col sm:items-end gap-2 shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedProduct.hasExpired ? (
                    <span className="px-3.5 py-1.5 rounded-none text-xs sm:text-sm font-black bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                      <span>1+ Expired Batch</span>
                    </span>
                  ) : selectedProduct.hasExpiringSoon ? (
                    <span className="px-3.5 py-1.5 rounded-none text-xs sm:text-sm font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 flex items-center gap-1.5">
                      <Clock className="h-4 w-4 shrink-0 text-amber-600" />
                      <span>Expiring Soon (&le;90d)</span>
                    </span>
                  ) : null}

                  {selectedProduct.totalGodownQuantity > 0 && selectedProduct.totalRackQuantity === 0 ? (
                    <span className="px-3.5 py-1.5 rounded-none text-xs sm:text-sm font-black bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1.5">
                      <Warehouse className="h-4 w-4 shrink-0 text-purple-600" />
                      <span>Needs Shelf Placement</span>
                    </span>
                  ) : selectedProduct.hasLowStock ? (
                    <span className="px-3.5 py-1.5 rounded-none text-xs sm:text-sm font-black bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border border-orange-200 dark:border-orange-900/60 flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 shrink-0 text-orange-600" />
                      <span>Low Stock Alert</span>
                    </span>
                  ) : (
                    <span className="px-3.5 py-1.5 rounded-none text-xs sm:text-sm font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>In Stock</span>
                    </span>
                  )}
                </div>

                {/* Sourcing / Supplier Card Info */}
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-4 py-2 rounded-none border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                  <Truck className="h-4 w-4 text-brand-primary shrink-0" />
                  <span>
                    Supplier:{" "}
                    <strong className="text-slate-900 dark:text-white">
                      {selectedProduct.supplierName || "Company Direct / Depot"}
                    </strong>
                  </span>
                  {selectedProduct.latestInvoiceNo && (
                    <span className="text-slate-400 font-mono text-xs">
                      · Inv #{selectedProduct.latestInvoiceNo}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Top 3 KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Total Available Stock */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-5 shadow-xs flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Total Stock Available
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black font-mono text-slate-900 dark:text-white">
                    {selectedProduct.totalQuantity.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold text-slate-500">
                    {selectedProduct.unit}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {selectedProductDetails.overallFormula}
                </p>
              </div>

              {/* Progress Bar & Distribution */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-none overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${selectedProductDetails.percentInRack}%` }}
                    title={`${selectedProductDetails.percentInRack}% on shelves`}
                  />
                  <div
                    className="bg-amber-500 h-full transition-all duration-500"
                    style={{ width: `${selectedProductDetails.percentNotInRack}%` }}
                    title={`${selectedProductDetails.percentNotInRack}% in godown`}
                  />
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                    {selectedProductDetails.percentInRack}% Shelves
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <span className="text-amber-600 dark:text-amber-400 font-mono">
                    {selectedProductDetails.percentNotInRack}% Godown
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: In Shop / Front Counter (Shop Stock) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-5 shadow-xs flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5" />
                  <span>In Shop (Shelves &amp; Racks)</span>
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {selectedProduct.totalRackQuantity.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold text-slate-500">
                    {selectedProduct.unit}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Ready for instant POS counter sales
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                {selectedProduct.totalRackQuantity > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Stocked on counter shelves</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Front counter empty! Refill needed</span>
                  </span>
                )}
              </div>
            </div>

            {/* Card 3: In Godown / Warehouse (Bulk Stock) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-5 shadow-xs flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Warehouse className="h-3.5 w-3.5" />
                  <span>In Godown (Warehouse / Bulk)</span>
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black font-mono text-amber-600 dark:text-amber-400">
                    {selectedProduct.totalGodownQuantity.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold text-slate-500">
                    {selectedProduct.unit}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Stored in bulk storage / unopened cartons
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                {selectedProduct.totalGodownQuantity > 0 ? (
                  <button
                    type="button"
                    onClick={() => handleOpenMoveModal(selectedProduct)}
                    style={{ backgroundColor: "var(--primary-color, #059669)" }}
                    className="w-full h-9 rounded-none hover:opacity-90 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
                  >
                    <Store className="h-3.5 w-3.5" />
                    <span>Move to Shop</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>All stock is already placed on shelves</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Master Batch Inventory Matrix (Table of All Batches) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none overflow-hidden shadow-xs space-y-0">
            <div className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Boxes className="h-5 w-5 text-brand-primary" />
                  <span>Available Batches for {selectedProduct.productName} ({selectedProduct.batches.length})</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sorted by <strong>FEFO (First Expiry, First Out)</strong> — batches with earliest expiry should be sold first.
                </p>
              </div>

              <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Total: <strong className="text-slate-900 dark:text-white">{selectedProduct.totalQuantity.toLocaleString()} {selectedProduct.unit}</strong>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[420px] overflow-y-auto content-scrollbar border-t border-slate-100 dark:border-slate-800">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm tracking-wide border-b border-slate-200 dark:border-slate-700 select-none sticky top-0 z-10 shadow-2xs">
                  <tr>
                    <th className="py-3.5 px-4 font-mono font-bold">Batch #</th>
                    <th className="py-3.5 px-3 font-bold">Supplier / Invoice</th>
                    <th className="py-3.5 px-3 font-bold">Expiry Date & Status</th>
                    <th className="py-3.5 px-3 text-right font-bold">In Shop (Rack)</th>
                    <th className="py-3.5 px-3 text-right font-bold">In Godown</th>
                    <th className="py-3.5 px-3 font-bold">Shelf Location</th>
                    <th className="py-3.5 px-4 text-right font-bold">Batch Total</th>
                    <th className="py-3.5 px-4 text-center font-bold">Batch Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-900 dark:text-slate-100">
                  {selectedProduct.batches.map((b, idx) => {
                    const isInspected = inspectedBatchId === b.id;
                    const bSupplierName = b.supplier?.name || b.receivingRecords?.[0]?.supplier?.name || selectedProduct.supplierName || "Company Depot";
                    const bInvoice = b.receivingRecords?.[0]?.invoiceNo || selectedProduct.latestInvoiceNo;

                    return (
                      <React.Fragment key={b.id || idx}>
                        <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                          {/* Batch # & FEFO Rank */}
                          <td className="py-3.5 px-4 font-mono">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                                {b.batchNumber || "Default"}
                              </span>
                              {idx === 0 && !b.isExpired && (
                                <span className="px-2 py-0.5 rounded-none text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                  FEFO #1
                                </span>
                              )}
                            </div>
                            {(b.barcode || b.sku) && (
                              <div className="text-xs text-slate-400 font-mono mt-0.5">
                                #{b.barcode || b.sku}
                              </div>
                            )}
                          </td>

                          {/* Supplier / Sourcing */}
                          <td className="py-3.5 px-3">
                            <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                              {bSupplierName}
                            </div>
                            {bInvoice && (
                              <div className="text-xs text-slate-400 font-mono mt-0.5">
                                Inv #{bInvoice}
                              </div>
                            )}
                          </td>

                          {/* Expiry Date & Status */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            {b.isExpired ? (
                              <span className="px-3 py-1 rounded-none text-xs sm:text-sm font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 inline-flex items-center gap-1.5">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                <span>Expired ({b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : "—"})</span>
                              </span>
                            ) : b.daysLeft !== null ? (
                              <span
                                className={`px-3 py-1 rounded-none text-xs sm:text-sm font-bold border inline-flex items-center gap-1.5 ${
                                  b.daysLeft <= 90
                                    ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50"
                                    : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50"
                                }`}
                              >
                                <Calendar className="h-3.5 w-3.5 shrink-0" />
                                <span>
                                  {b.daysLeft}d left ({b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : "—"})
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-400 text-sm">No Expiry Date</span>
                            )}
                          </td>

                          {/* In Shop (Rack) */}
                          <td className="py-3.5 px-3 text-right whitespace-nowrap font-mono">
                            {b.inRackQty > 0 ? (
                              <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 px-2.5 py-1 rounded-none">
                                {b.inRackQty.toLocaleString()} {b.unit || "tab"}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-sm">0</span>
                            )}
                          </td>

                          {/* In Godown */}
                          <td className="py-3.5 px-3 text-right whitespace-nowrap font-mono">
                            {b.notInRackQty > 0 ? (
                              <span className="font-bold text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 px-2.5 py-1 rounded-none">
                                {b.notInRackQty.toLocaleString()} {b.unit || "tab"}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-sm">0</span>
                            )}
                          </td>

                          {/* Shelf Location */}
                          <td className="py-3.5 px-3 font-mono text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                            {b.primaryLocation}
                          </td>

                          {/* Batch Total */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-black text-slate-900 dark:text-white text-sm sm:text-base">
                            {b.quantity.toLocaleString()} {b.unit || "tab"}
                          </td>

                          {/* Batch Action */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              {b.notInRackQty > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenMoveModal(selectedProduct, b.id)}
                                  style={{ backgroundColor: "var(--primary-color, #059669)" }}
                                  className="px-3 py-1.5 hover:opacity-90 text-white rounded-none text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
                                >
                                  <Store className="h-3.5 w-3.5" />
                                  <span>Move to Shop</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setInspectedBatchId(isInspected ? null : b.id)}
                                className={`px-3 py-1.5 rounded-none text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                                  isInspected
                                    ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
                                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                                }`}
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>{isInspected ? "Hide" : "Breakdown"}</span>
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Inline Batch Packaging & Location Breakdown */}
                        {isInspected && (
                          <tr className="bg-slate-50/90 dark:bg-slate-850/80">
                            <td colSpan={8} className="p-4 border-t border-b border-slate-200 dark:border-slate-700">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between text-xs font-extrabold text-slate-700 dark:text-slate-300">
                                  <span className="flex items-center gap-1.5">
                                    <Package className="h-4 w-4 text-brand-primary" />
                                    <span>Packaging & Shelf Locations for Batch #{b.batchNumber || "Default"}:</span>
                                  </span>
                                  <span className="text-slate-400 font-mono">
                                    Total: {b.quantity.toLocaleString()} {b.unit || "tab"}
                                  </span>
                                </div>

                                {b.locations && b.locations.length > 0 ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                    {b.locations.map((loc: any, lIdx: number) => {
                                      const rN = loc.rack?.name || loc.rackName || "Rack R01";
                                      const sN = loc.shelf?.name || loc.shelfName || "";
                                      const bN = loc.bin?.name || loc.binName || "";
                                      const cleanB = bN && bN.toLowerCase() !== "none" && bN.toLowerCase() !== "n/a" && bN !== "B01" ? bN : "";
                                      let locStr = rN;
                                      if (sN && sN !== "S01") locStr += ` › ${sN}`;
                                      if (cleanB) locStr += ` › ${cleanB}`;

                                      return (
                                        <div
                                          key={loc.id || lIdx}
                                          className="p-3 rounded-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center justify-between gap-2"
                                        >
                                          <div>
                                            <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                                              {locStr}
                                            </div>
                                            <div className="text-[11px] text-slate-400">
                                              {loc.displayText || "Shelf Placement"}
                                            </div>
                                          </div>
                                          <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-none">
                                            {loc.quantity.toLocaleString()} {b.unit || "tab"}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="p-3 text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-700">
                                    All units for this batch are currently stored in bulk warehouse / Godown.
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* 2. MASTER STOCK MANAGEMENT HUB (TABLE, FILTERS, ALLOCATION & PAGINATION)  */
        /* ========================================================================= */
        <div className="space-y-4">
          {/* Quick KPI Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 content-scrollbar">
            {/* All Stock */}
            <button
              type="button"
              onClick={() => setActiveFilter("ALL")}
              className={`px-4 py-2 rounded-none text-xs sm:text-sm font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
                activeFilter === "ALL"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50"
              }`}
            >
              <Boxes className="h-4 w-4" />
              <span>All Stock</span>
              <span className={`px-2 py-0.5 rounded-none text-xs font-mono font-extrabold ${
                activeFilter === "ALL" ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}>
                {filterCounts.all}
              </span>
            </button>

            {/* In Shop */}
            <button
              type="button"
              onClick={() => setActiveFilter("IN_SHOP")}
              className={`px-4 py-2 rounded-none text-xs sm:text-sm font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
                activeFilter === "IN_SHOP"
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                  : "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              }`}
            >
              <Store className="h-4 w-4" />
              <span>In Shop</span>
              <span className={`px-2 py-0.5 rounded-none text-xs font-mono font-extrabold ${
                activeFilter === "IN_SHOP" ? "bg-white/20 text-white" : "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
              }`}>
                {filterCounts.inShop}
              </span>
            </button>

            {/* In Godown */}
            <button
              type="button"
              onClick={() => setActiveFilter("IN_GODOWN")}
              className={`px-4 py-2 rounded-none text-xs sm:text-sm font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
                activeFilter === "IN_GODOWN"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                  : "bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-950/30"
              }`}
            >
              <Warehouse className="h-4 w-4" />
              <span>In Godown</span>
              <span className={`px-2 py-0.5 rounded-none text-xs font-mono font-extrabold ${
                activeFilter === "IN_GODOWN" ? "bg-white/20 text-white" : "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300"
              }`}>
                {filterCounts.inGodown}
              </span>
            </button>

            {/* Shop Low Stock */}
            <button
              type="button"
              onClick={() => setActiveFilter("SHOP_LOW")}
              className={`px-4 py-2 rounded-none text-xs sm:text-sm font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
                activeFilter === "SHOP_LOW"
                  ? "bg-amber-600 text-white shadow-sm shadow-amber-600/30"
                  : "bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Shop Low Stock</span>
              <span className={`px-2 py-0.5 rounded-none text-xs font-mono font-extrabold ${
                activeFilter === "SHOP_LOW" ? "bg-white/20 text-white" : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
              }`}>
                {filterCounts.shopLow}
              </span>
            </button>

            {/* Godown Low Stock */}
            <button
              type="button"
              onClick={() => setActiveFilter("GODOWN_LOW")}
              className={`px-4 py-2 rounded-none text-xs sm:text-sm font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
                activeFilter === "GODOWN_LOW"
                  ? "bg-rose-600 text-white shadow-sm shadow-rose-600/30"
                  : "bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              }`}
            >
              <ShieldAlert className="h-4 w-4" />
              <span>Godown Low Stock</span>
              <span className={`px-2 py-0.5 rounded-none text-xs font-mono font-extrabold ${
                activeFilter === "GODOWN_LOW" ? "bg-white/20 text-white" : "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300"
              }`}>
                {filterCounts.godownLow}
              </span>
            </button>
          </div>

          {/* Secondary Control Bar: Company Filter, Page Size, Reset */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-none border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Company / Brand Filter Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-none text-xs font-bold text-slate-700 dark:text-slate-300">
                <Building2 className="h-4 w-4 text-brand-primary shrink-0" />
                <span className="text-slate-400 font-medium">Company:</span>
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer pr-1"
                >
                  <option value="ALL" className="bg-white dark:bg-slate-900">All Companies / Brands</option>
                  {availableCompanies.map((c) => (
                    <option key={c} value={c} className="bg-white dark:bg-slate-900">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {(activeFilter !== "ALL" || selectedCompany !== "ALL" || search) && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilter("ALL");
                    setSelectedCompany("ALL");
                    setSearch("");
                  }}
                  className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-none transition flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleExportStockCsv}
                disabled={isExportingStock}
                className="px-3 py-1.5 rounded-none bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                title="Download current stock report as CSV"
              >
                {isExportingStock ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-primary" />
                ) : (
                  <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                )}
                <span>Export Stock CSV</span>
              </button>

              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono">
                Showing {filteredProducts.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredProducts.length)} of {filteredProducts.length} products
              </div>
            </div>
          </div>

          {/* Master Stock Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none overflow-hidden shadow-xs">
            <div className="overflow-x-auto content-scrollbar">
              <table className="w-full text-left text-sm border-collapse">
                <thead
                  style={{ backgroundColor: "var(--primary-color, #059669)" }}
                  className="bg-emerald-600 dark:bg-emerald-700 text-white font-bold text-sm tracking-wide shadow-sm select-none"
                >
                  {activeFilter === "IN_SHOP" ? (
                    <tr>
                      <th className="py-3.5 px-4 font-bold text-sm">Medicine Name &amp; Generic</th>
                      <th className="py-3.5 px-3 text-left whitespace-nowrap font-bold text-sm">Location</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold text-sm">In Shop Stock</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-bold text-sm">Action</th>
                    </tr>
                  ) : activeFilter === "IN_GODOWN" ? (
                    <tr>
                      <th className="py-3.5 px-4 font-bold text-sm">Medicine Name &amp; Company</th>
                      <th className="py-3.5 px-3 text-left whitespace-nowrap font-bold text-sm">Supplier / Sourcing</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold text-sm">In Godown Stock</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-bold text-sm">Action</th>
                    </tr>
                  ) : activeFilter === "SHOP_LOW" ? (
                    <tr>
                      <th className="py-3.5 px-4 font-bold text-sm">Medicine Name &amp; Generic</th>
                      <th className="py-3.5 px-3 text-right whitespace-nowrap font-bold text-sm">Current Shop Stock</th>
                      <th className="py-3.5 px-3 text-center whitespace-nowrap font-bold text-sm">Available in Godown</th>
                      <th className="py-3.5 px-3 text-left whitespace-nowrap font-bold text-sm">Location</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-bold text-sm">Quick Action</th>
                    </tr>
                  ) : activeFilter === "GODOWN_LOW" ? (
                    /* 4 clean main columns as requested */
                    <tr>
                      <th className="py-3.5 px-4 font-bold text-sm">Medicine Name &amp; Company</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold text-sm">Godown Stock</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold text-sm">Running in Shop</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-bold text-sm">Action</th>
                    </tr>
                  ) : (
                    /* ALL STOCK (Default) */
                    <tr>
                      <th className="py-3.5 px-4 font-bold text-sm">Medicine Name &amp; Generic</th>
                      <th className="py-3.5 px-3 text-right whitespace-nowrap font-bold text-sm">In Godown</th>
                      <th className="py-3.5 px-3 text-right whitespace-nowrap font-bold text-sm">In Shop (Shelf)</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold text-sm">Total Stock</th>
                      <th className="py-3.5 px-3 text-center whitespace-nowrap font-bold text-sm">Status</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-bold text-sm">Action</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-900 dark:text-slate-100">
                  {loading ? (
                    Array.from({ length: 8 }).map((_, idx) => {
                      const nameWidth = ["w-48", "w-36", "w-56", "w-40", "w-52", "w-44", "w-32", "w-48"][idx % 8];
                      const genericWidth = ["w-28", "w-20", "w-32", "w-24", "w-28", "w-36", "w-20", "w-24"][idx % 8];
                      return (
                        <tr key={`stock-skeleton-${idx}`} className="animate-pulse">
                          {activeFilter === "IN_SHOP" ? (
                            <>
                              {/* Medicine Name & Generic */}
                              <td className="py-4 px-4">
                                <div className={`h-4 bg-slate-200 dark:bg-slate-700 rounded-none ${nameWidth} mb-2`} />
                                <div className="flex items-center gap-2">
                                  <div className={`h-3 bg-slate-100 dark:bg-slate-800 rounded-none ${genericWidth}`} />
                                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-none w-20" />
                                </div>
                              </td>
                              {/* Location */}
                              <td className="py-4 px-3">
                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-none w-28 mb-1" />
                                <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-none w-16" />
                              </td>
                              {/* In Shop Stock */}
                              <td className="py-4 px-4 text-right">
                                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded-none w-16 ml-auto" />
                              </td>
                              {/* Action */}
                              <td className="py-4 px-4 text-center">
                                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-none w-20 mx-auto" />
                              </td>
                            </>
                          ) : activeFilter === "IN_GODOWN" ? (
                            <>
                              {/* Medicine Name & Company */}
                              <td className="py-4 px-4">
                                <div className={`h-4 bg-slate-200 dark:bg-slate-700 rounded-none ${nameWidth} mb-2`} />
                                <div className="flex items-center gap-2">
                                  <div className={`h-3 bg-slate-100 dark:bg-slate-800 rounded-none ${genericWidth}`} />
                                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-none w-20" />
                                </div>
                              </td>
                              {/* Supplier / Sourcing */}
                              <td className="py-4 px-3">
                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-none w-32" />
                              </td>
                              {/* In Godown Stock */}
                              <td className="py-4 px-4 text-right">
                                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded-none w-16 ml-auto" />
                              </td>
                              {/* Action */}
                              <td className="py-4 px-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-none w-24" />
                                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-none w-8" />
                                </div>
                              </td>
                            </>
                          ) : activeFilter === "SHOP_LOW" ? (
                            <>
                              {/* Medicine Name & Generic */}
                              <td className="py-4 px-4">
                                <div className={`h-4 bg-slate-200 dark:bg-slate-700 rounded-none ${nameWidth} mb-2`} />
                                <div className="flex items-center gap-2">
                                  <div className={`h-3 bg-slate-100 dark:bg-slate-800 rounded-none ${genericWidth}`} />
                                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-none w-16" />
                                </div>
                              </td>
                              {/* Current Shop Stock */}
                              <td className="py-4 px-3 text-right">
                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-none w-16 ml-auto mb-1" />
                                <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-none w-20 ml-auto" />
                              </td>
                              {/* Available in Godown */}
                              <td className="py-4 px-3 text-center">
                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-none w-16 mx-auto mb-1" />
                                <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-none w-20 mx-auto" />
                              </td>
                              {/* Location */}
                              <td className="py-4 px-3">
                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-none w-28" />
                              </td>
                              {/* Quick Action */}
                              <td className="py-4 px-4 text-center">
                                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-none w-28 mx-auto" />
                              </td>
                            </>
                          ) : activeFilter === "GODOWN_LOW" ? (
                            <>
                              {/* Medicine Name & Company */}
                              <td className="py-4 px-4">
                                <div className={`h-4 bg-slate-200 dark:bg-slate-700 rounded-none ${nameWidth} mb-2`} />
                                <div className="flex items-center gap-2">
                                  <div className={`h-3 bg-slate-100 dark:bg-slate-800 rounded-none ${genericWidth}`} />
                                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-none w-20" />
                                </div>
                              </td>
                              {/* Godown Stock */}
                              <td className="py-4 px-4 text-right">
                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-none w-20 ml-auto" />
                              </td>
                              {/* Running in Shop */}
                              <td className="py-4 px-4 text-right">
                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-none w-20 ml-auto" />
                              </td>
                              {/* Action */}
                              <td className="py-4 px-4 text-center">
                                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-none w-20 mx-auto" />
                              </td>
                            </>
                          ) : (
                            /* ALL STOCK (Default 6 cols) */
                            <>
                              {/* Medicine Name & Generic */}
                              <td className="py-4 px-4">
                                <div className={`h-4 bg-slate-200 dark:bg-slate-700 rounded-none ${nameWidth} mb-2`} />
                                <div className="flex items-center gap-2">
                                  <div className={`h-3 bg-slate-100 dark:bg-slate-800 rounded-none ${genericWidth}`} />
                                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-none w-20" />
                                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-none w-16" />
                                </div>
                              </td>
                              {/* In Godown */}
                              <td className="py-4 px-3 text-right">
                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-none w-14 ml-auto" />
                              </td>
                              {/* In Shop (Shelf) */}
                              <td className="py-4 px-3 text-right">
                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-none w-14 ml-auto" />
                              </td>
                              {/* Total Stock */}
                              <td className="py-4 px-4 text-right">
                                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded-none w-16 ml-auto" />
                              </td>
                              {/* Status */}
                              <td className="py-4 px-3 text-center">
                                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-none w-20 mx-auto" />
                              </td>
                              {/* Action */}
                              <td className="py-4 px-4 text-center">
                                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-none w-20 mx-auto" />
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })
                  ) : paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={activeFilter === "ALL" ? 6 : activeFilter === "SHOP_LOW" ? 5 : 4} className="py-16 text-center text-slate-400">
                        <Package className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="text-base font-bold text-slate-700 dark:text-slate-300">No matching stock items found</p>
                        <p className="text-sm text-slate-400 mt-1">Try adjusting your search query or reset the filters above.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((p) => {
                      /* ----------------------------------------------------------- */
                      /* 1. VIEW: IN SHOP                                            */
                      /* ----------------------------------------------------------- */
                      if (activeFilter === "IN_SHOP") {
                        return (
                          <tr key={p.productId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                            <td
                              onClick={() => setSelectedProductId(p.productId)}
                              className="py-3.5 px-4 cursor-pointer group"
                            >
                              <div className="font-bold text-base text-slate-900 dark:text-white group-hover:text-brand-primary transition leading-snug">
                                {p.productName}
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap text-xs sm:text-sm">
                                {p.genericName && (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                    {p.genericName}
                                  </span>
                                )}
                                {(p.brandName || p.supplierName) && (
                                  <span className="px-2 py-0.5 rounded-none text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {p.brandName || p.supplierName}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-3 text-left whitespace-nowrap">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                                  <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                  <span>{p.storageGroupName || p.primaryLocation || "Front Counter"}</span>
                                </div>
                                {p.storageLocationDetails && (
                                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 pl-5">
                                    {p.storageLocationDetails}
                                  </div>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base sm:text-lg">
                                {p.totalRackQuantity.toLocaleString()}
                              </span>
                              <span className="text-xs sm:text-sm text-slate-400 font-sans ml-1 font-medium">
                                {p.unit}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setSelectedProductId(p.productId)}
                                className="px-3.5 py-1.5 bg-slate-100 hover:bg-brand-primary hover:text-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-none text-xs font-bold transition flex items-center gap-1.5 mx-auto"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Details</span>
                              </button>
                            </td>
                          </tr>
                        );
                      }

                      /* ----------------------------------------------------------- */
                      /* 2. VIEW: IN GODOWN                                          */
                      /* ----------------------------------------------------------- */
                      if (activeFilter === "IN_GODOWN") {
                        return (
                          <tr key={p.productId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                            <td
                              onClick={() => setSelectedProductId(p.productId)}
                              className="py-3.5 px-4 cursor-pointer group"
                            >
                              <div className="font-bold text-base text-slate-900 dark:text-white group-hover:text-brand-primary transition leading-snug">
                                {p.productName}
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap text-xs sm:text-sm">
                                {p.genericName && (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                    {p.genericName}
                                  </span>
                                )}
                                {(p.brandName || p.supplierName) && (
                                  <span className="px-2 py-0.5 rounded-none text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {p.brandName || p.supplierName}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-3 text-left whitespace-nowrap">
                              <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
                                {p.supplierName || "Direct Warehouse"}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-base sm:text-lg">
                                {p.totalGodownQuantity.toLocaleString()}
                              </span>
                              <span className="text-xs sm:text-sm text-slate-400 font-sans ml-1 font-medium">
                                {p.unit}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleAllocateProduct(p)}
                                  style={{ backgroundColor: "var(--primary-color, #059669)" }}
                                  className="px-3.5 py-1.5 hover:opacity-90 text-white rounded-none text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                                  title="Move stock from Godown into Shop"
                                >
                                  <ArrowRightLeft className="h-3.5 w-3.5" />
                                  <span>Move to Shop</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedProductId(p.productId)}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-none transition cursor-pointer"
                                  title="Details"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      /* ----------------------------------------------------------- */
                      /* 3. VIEW: SHOP LOW STOCK                                     */
                      /* ----------------------------------------------------------- */
                      if (activeFilter === "SHOP_LOW") {
                        return (
                          <tr key={p.productId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                            <td
                              onClick={() => setSelectedProductId(p.productId)}
                              className="py-3.5 px-4 cursor-pointer group"
                            >
                              <div className="font-bold text-base text-slate-900 dark:text-white group-hover:text-brand-primary transition leading-snug">
                                {p.productName}
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap text-xs sm:text-sm">
                                {p.genericName && (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                    {p.genericName}
                                  </span>
                                )}
                                {(p.brandName || p.supplierName) && (
                                  <span className="px-2 py-0.5 rounded-none text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {p.brandName || p.supplierName}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-3 text-right whitespace-nowrap">
                              <div className="font-mono font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                                {p.totalRackQuantity.toLocaleString()} {p.unit}
                              </div>
                              <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                                Shop Min: {p.shopMinStockAlert ?? p.minStockLevel ?? 10}
                              </div>
                            </td>

                            <td className="py-3.5 px-3 text-center whitespace-nowrap">
                              <div className="font-mono font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                                {p.totalGodownQuantity.toLocaleString()} {p.unit}
                              </div>
                              <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                                Godown Min: {p.godownMinStockAlert ?? 50}
                              </div>
                            </td>

                            <td className="py-3.5 px-3 text-left whitespace-nowrap">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                                  <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                  <span>{p.storageGroupName || p.primaryLocation || "Front Counter"}</span>
                                </div>
                                {p.storageLocationDetails && (
                                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 pl-5">
                                    {p.storageLocationDetails}
                                  </div>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              {p.totalGodownQuantity > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => handleAllocateProduct(p)}
                                  style={{ backgroundColor: "var(--primary-color, #059669)" }}
                                  className="px-3.5 py-1.5 hover:opacity-90 text-white rounded-none text-xs sm:text-sm font-bold transition flex items-center gap-1.5 mx-auto shadow-2xs cursor-pointer active:scale-95"
                                  title="Bring medicine from Godown into Shop"
                                >
                                  <ArrowRightLeft className="h-3.5 w-3.5" />
                                  <span>Move to Shop</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setSelectedProductId(p.productId)}
                                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-none text-xs font-bold transition mx-auto"
                                >
                                  Details
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      }

                      /* ----------------------------------------------------------- */
                      /* 4. VIEW: GODOWN LOW STOCK (Just 4 clean main columns)       */
                      /* ----------------------------------------------------------- */
                      if (activeFilter === "GODOWN_LOW") {
                        return (
                          <tr key={p.productId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                            {/* Col 1: Medicine & Company */}
                            <td
                              onClick={() => setSelectedProductId(p.productId)}
                              className="py-3.5 px-4 cursor-pointer group"
                            >
                              <div className="font-bold text-base text-slate-900 dark:text-white group-hover:text-brand-primary transition leading-snug">
                                {p.productName}
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap text-xs sm:text-sm">
                                {p.genericName && (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                    {p.genericName}
                                  </span>
                                )}
                                {(p.brandName || p.supplierName) && (
                                  <span className="px-2 py-0.5 rounded-none text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {p.brandName || p.supplierName}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Col 2: Godown Stock */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <span className="font-mono font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                                {p.totalGodownQuantity.toLocaleString()} {p.unit}
                              </span>
                            </td>

                            {/* Col 3: Running in Shop */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                                {p.totalRackQuantity.toLocaleString()} {p.unit}
                              </span>
                            </td>

                            {/* Col 4: Action */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setSelectedProductId(p.productId)}
                                className="px-3.5 py-1.5 bg-slate-100 hover:bg-brand-primary hover:text-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-none text-xs font-bold transition flex items-center gap-1.5 mx-auto cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Details</span>
                              </button>
                            </td>
                          </tr>
                        );
                      }

                      /* ----------------------------------------------------------- */
                      /* 5. VIEW: ALL STOCK (Full 6 columns)                         */
                      /* ----------------------------------------------------------- */
                      return (
                        <tr
                          key={p.productId}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                        >
                          {/* Medicine Name, Generic, Company */}
                          <td
                            onClick={() => setSelectedProductId(p.productId)}
                            className="py-3.5 px-4 cursor-pointer group"
                            title="Click to view complete details, batches & shelf placement"
                          >
                            <div className="font-bold text-base text-slate-900 dark:text-white group-hover:text-brand-primary transition leading-snug">
                              {p.productName}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap text-sm">
                              {p.genericName && (
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                                  {p.genericName}
                                </span>
                              )}
                              {(p.brandName || p.supplierName || p.manufacturer) && (
                                <span className="px-2.5 py-0.5 rounded-none text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  {p.brandName || p.supplierName || p.manufacturer}
                                </span>
                              )}
                              {(p.barcode || p.sku) && (
                                <span className="text-xs font-mono text-slate-400 font-medium">
                                  #{p.barcode || p.sku}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* In Godown Stock */}
                          <td className="py-3.5 px-3 text-right whitespace-nowrap">
                            <span className="font-mono text-base font-semibold text-slate-800 dark:text-slate-200">
                              {p.totalGodownQuantity > 0 ? (
                                p.totalGodownQuantity.toLocaleString()
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600 font-normal">0</span>
                              )}
                            </span>
                          </td>

                          {/* In Shop / Rack Stock */}
                          <td className="py-3.5 px-3 text-right whitespace-nowrap">
                            <span className="font-mono text-base font-semibold text-slate-800 dark:text-slate-200">
                              {p.totalRackQuantity > 0 ? (
                                p.totalRackQuantity.toLocaleString()
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600 font-normal">0</span>
                              )}
                            </span>
                          </td>

                          {/* Total Available Stock */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <span className="font-mono font-black text-slate-900 dark:text-white text-base sm:text-lg">
                              {p.totalQuantity.toLocaleString()}
                            </span>
                            <span className="text-xs sm:text-sm text-slate-400 font-sans ml-1 font-medium">
                              {p.unit}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            {p.hasLowStock ? (
                              <span
                                title={`Shop Alert: ≤${p.shopMinStockAlert ?? p.minStockLevel ?? 10} | Godown Alert: ≤${p.godownMinStockAlert ?? 50}`}
                                className="px-3 py-1 rounded-none text-xs sm:text-sm font-black bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-200 dark:border-orange-900/50"
                              >
                                Low Stock ({p.isShopLowStock && p.isGodownLowStock ? "Shop & Godown" : p.isShopLowStock ? "Shop Low" : "Godown Low"})
                              </span>
                            ) : p.totalGodownQuantity > 0 && p.totalRackQuantity === 0 ? (
                              <span className="px-3 py-1 rounded-none text-xs sm:text-sm font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800">
                                Needs Shelf
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-none text-xs sm:text-sm font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
                                In Stock
                              </span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => setSelectedProductId(p.productId)}
                                title="View all batches, FEFO expiry dates & warehouse allocation"
                                className="px-4 py-2 bg-slate-100 hover:bg-brand-primary hover:text-white dark:bg-slate-800 dark:hover:bg-brand-primary text-slate-700 dark:text-slate-200 rounded-none text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 group"
                              >
                                <Eye className="h-4 w-4 text-slate-400 group-hover:text-white transition" />
                                <span>Details</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Table Pagination & Show per page selector */}
            {!loading && filteredProducts.length > 0 && (
              <div className="p-4 bg-slate-50/90 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3.5">
                {/* Left: Showing info & Show per page dropdown */}
                <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-medium">
                    Showing <strong className="text-slate-900 dark:text-white font-mono font-bold">{(page - 1) * pageSize + 1}</strong> to{" "}
                    <strong className="text-slate-900 dark:text-white font-mono font-bold">{Math.min(page * pageSize, filteredProducts.length)}</strong> of{" "}
                    <strong className="text-slate-900 dark:text-white font-mono font-bold">{filteredProducts.length}</strong> products
                  </span>

                  <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>

                  {/* Show per page dropdown */}
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-none shadow-2xs">
                    <span className="font-bold text-slate-600 dark:text-slate-300">Show:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(parseInt(e.target.value) || 15);
                        setPage(1);
                      }}
                      className="bg-transparent font-black text-brand-primary outline-none cursor-pointer pr-1"
                    >
                      <option value={10} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">10</option>
                      <option value={15} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">15</option>
                      <option value={25} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">25</option>
                      <option value={50} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">50</option>
                      <option value={100} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">100</option>
                    </select>
                    <span className="text-slate-400 font-medium">/ page</span>
                  </div>
                </div>

                {/* Right: Previous, Page Numbers & Next */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Previous Button with text */}
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    className="h-8 px-3 rounded-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                  >
                    <ChevronLeft className="h-4 w-4 shrink-0" />
                    <span>Previous</span>
                  </button>

                  {/* Page numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const pageNum = i + 1;
                      if (
                        totalPages > 6 &&
                        pageNum !== 1 &&
                        pageNum !== totalPages &&
                        Math.abs(pageNum - page) > 1
                      ) {
                        if (pageNum === 2 && page > 3) {
                          return <span key="dots-left" className="px-1 text-slate-400 font-bold">...</span>;
                        }
                        if (pageNum === totalPages - 1 && page < totalPages - 2) {
                          return <span key="dots-right" className="px-1 text-slate-400 font-bold">...</span>;
                        }
                        return null;
                      }

                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setPage(pageNum)}
                          className={`h-8 min-w-[32px] px-2 rounded-none text-xs font-black transition cursor-pointer ${
                            page === pageNum
                              ? "bg-brand-primary text-white shadow-xs"
                              : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Button with text */}
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    className="h-8 px-3 rounded-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
