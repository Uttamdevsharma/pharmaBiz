"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import { showAlert } from "@/lib/swal";
import { calculatePackaging } from "@/lib/packaging";
import { OwnerModule } from "./DashboardSidebar";
import {
  LayoutGrid,
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
  Search,
  Plus,
  Check,
  Building2,
  Pill,
  Snowflake,
  Box,
  Layers,
  Archive,
  BarChart3,
  Loader2,
  TrendingUp,
  RefreshCw,
  Info,
  CheckCircle2,
  AlertCircle,
  Tag,
  Store,
  Warehouse,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Eye,
  Sparkles,
  MapPin,
  Edit2,
  X,
  AlertTriangle,
} from "lucide-react";

interface StorageGroupListViewProps {
  selectedBranchId: string;
  onNavigate: (module: OwnerModule) => void;
  preselectedGroupId?: string;
  preselectedProductId?: string;
  preselectedBatchId?: string;
}

export type GroupCategory = "ALL" | "COMPANY" | "GENERIC" | "SPECIAL" | "CUSTOM";

export function StorageGroupListView({
  selectedBranchId,
  onNavigate,
  preselectedGroupId,
  preselectedProductId,
  preselectedBatchId,
}: StorageGroupListViewProps) {
  // Navigation / View modes (100% Full-page, 0 Popups)
  const [viewMode, setViewMode] = useState<"TABLE" | "GROUP_DETAIL" | "MOVE_STOCK">(
    preselectedGroupId ? "GROUP_DETAIL" : preselectedProductId || preselectedBatchId ? "MOVE_STOCK" : "TABLE"
  );
  const [activeGroupId, setActiveGroupId] = useState<string>(preselectedGroupId || "");

  // Data state
  const [groups, setGroups] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState<GroupCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Edit group modal state
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState("");
  const [editingGroupName, setEditingGroupName] = useState("");
  const [editingGroupLocation, setEditingGroupLocation] = useState("");
  const [editingSubmitting, setEditingSubmitting] = useState(false);

  // Shift product to another group modal state
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [shiftingProduct, setShiftingProduct] = useState<any>(null);
  const [shiftTargetGroupId, setShiftTargetGroupId] = useState("");
  const [shiftQuantity, setShiftQuantity] = useState(1);
  const [shiftNotes, setShiftNotes] = useState("");
  const [shiftSubmitting, setShiftSubmitting] = useState(false);

  // Move stock form state
  const [moveProductId, setMoveProductId] = useState<string>(preselectedProductId || "");
  const [moveBatchId, setMoveBatchId] = useState<string>(preselectedBatchId || "");
  const [moveTargetGroupId, setMoveTargetGroupId] = useState<string>(preselectedGroupId || "");
  const [moveQuantity, setMoveQuantity] = useState<number>(1);
  const [moveUnitType, setMoveUnitType] = useState<"BOX" | "STRIP" | "TABLET">("BOX");
  const [moveSubmitting, setMoveSubmitting] = useState(false);
  const [batchSearchQuery, setBatchSearchQuery] = useState("");
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [isBatchPickerOpen, setIsBatchPickerOpen] = useState(false);
  const [autoSuggestedGroupInfo, setAutoSuggestedGroupInfo] = useState<{
    groupId: string;
    groupName: string;
    groupType: string;
    reason: string;
  } | null>(null);

  // Handle incoming props changes
  useEffect(() => {
    if (preselectedProductId || preselectedBatchId) {
      if (preselectedProductId) setMoveProductId(preselectedProductId);
      if (preselectedBatchId) setMoveBatchId(preselectedBatchId);
      setViewMode("MOVE_STOCK");
    } else if (preselectedGroupId) {
      setActiveGroupId(preselectedGroupId);
      setViewMode("GROUP_DETAIL");
    }
  }, [preselectedProductId, preselectedBatchId, preselectedGroupId]);

  // Intelligent Auto-suggest Target Storage Group (Company or Generic matching)
  useEffect(() => {
    if (!moveBatchId || groups.length === 0 || inventory.length === 0) return;

    // Find the batch in inventory
    const bObj = inventory.find((b) => b.id === moveBatchId);
    if (!bObj) return;

    const comp = (
      bObj.product?.manufacturer ||
      bObj.manufacturer ||
      bObj.product?.brandName ||
      (bObj as any).brandName ||
      bObj.supplier?.name ||
      ""
    ).toLowerCase().trim();

    const gen = (
      bObj.product?.genericName ||
      bObj.genericName ||
      ""
    ).toLowerCase().trim();

    // Priority 1: Match by Company / Brand / Supplier (e.g. Beximco -> Beximco Corner / Beximco Group)
    let matched: any = null;
    let matchReason = "";

    if (comp) {
      matched = groups.find((g) => {
        const gn = (g.name || "").toLowerCase();
        return g.type === "COMPANY" && (gn.includes(comp) || comp.includes(gn));
      });
      if (!matched) {
        matched = groups.find((g) => {
          const gn = (g.name || "").toLowerCase();
          return gn.includes(comp) || comp.includes(gn);
        });
      }
      if (matched) {
        matchReason = `Company: ${bObj.product?.manufacturer || bObj.manufacturer || bObj.product?.brandName || comp}`;
      }
    }

    // Priority 2: Match by Generic Therapy Name (e.g. Seclo -> Omeprazole Group)
    if (!matched && gen) {
      matched = groups.find((g) => {
        const gn = (g.name || "").toLowerCase();
        return g.type === "GENERIC" && (gn.includes(gen) || gen.includes(gn));
      });
      if (!matched) {
        matched = groups.find((g) => {
          const gn = (g.name || "").toLowerCase();
          return gn.includes(gen) || gen.includes(gn);
        });
      }
      if (matched) {
        matchReason = `Generic: ${bObj.product?.genericName || bObj.genericName || gen}`;
      }
    }

    if (matched) {
      setMoveTargetGroupId(matched.id);
      setAutoSuggestedGroupInfo({
        groupId: matched.id,
        groupName: matched.name,
        groupType: matched.type,
        reason: matchReason,
      });
    }
  }, [moveBatchId, groups, inventory]);

  // Load Groups and Inventory
  const loadData = useCallback(async () => {
    if (!selectedBranchId) return;
    try {
      setLoading(true);
      const [groupsRes, invRes] = await Promise.all([
        fetchApi<any>(`/locations?branchId=${encodeURIComponent(selectedBranchId)}`),
        fetchApi<any>(`/inventory/branch/${encodeURIComponent(selectedBranchId)}?limit=1000`),
      ]);

      let gList: any[] = [];
      if (Array.isArray(groupsRes)) gList = groupsRes;
      else if (Array.isArray(groupsRes?.data)) gList = groupsRes.data;
      else if (Array.isArray((groupsRes as any)?.racks)) gList = (groupsRes as any).racks;
      setGroups(gList);

      let iList: any[] = [];
      if (invRes?.success && Array.isArray(invRes.data)) iList = invRes.data;
      else if (Array.isArray(invRes)) iList = invRes;
      setInventory(iList);
    } catch (err) {
      console.error("Failed to load Storage Groups data", err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate Metrics for Each Group
  const groupMetricsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        totalUnitsInShop: number;
        totalUnitsInGodown: number;
        productCount: number;
        products: Map<string, any>;
        items: any[];
      }
    >();

    groups.forEach((g) => {
      map.set(g.id, {
        totalUnitsInShop: 0,
        totalUnitsInGodown: 0,
        productCount: 0,
        products: new Map<string, any>(),
        items: [],
      });
    });

    inventory.forEach((item) => {
      const prodId = item.productId || item.product?.id;
      const prodName = item.product?.name || item.name || "Unknown";
      const totalBatchQty = item.quantity || 0;
      let allocatedQtyInThisBatch = 0;

      const locs = Array.isArray(item.locations) ? item.locations : [];
      locs.forEach((loc: any) => {
        const rId = loc.rackId || loc.rack?.id;
        const qty = Number(loc.quantity) || 0;
        allocatedQtyInThisBatch += qty;

        if (rId && map.has(rId)) {
          const gData = map.get(rId)!;
          gData.totalUnitsInShop += qty;

          if (prodId && !gData.products.has(prodId)) {
            gData.products.set(prodId, {
              product: item.product || { id: prodId, name: prodName },
              shopUnits: 0,
              godownUnits: 0,
              totalUnits: 0,
              batches: [],
            });
          }
          if (prodId) {
            const pEntry = gData.products.get(prodId)!;
            pEntry.shopUnits += qty;
            pEntry.totalUnits += qty;
            pEntry.batches.push({ batch: item, allocatedQty: qty, locationId: loc.id });
          }
        }
      });

      // Godown stock logic: remaining unallocated stock in warehouse
      const remainingGodownQty = Math.max(0, totalBatchQty - allocatedQtyInThisBatch);
      if (remainingGodownQty > 0) {
        const rawMfg = (item.product?.manufacturer || item.manufacturer || item.product?.brandName || "").toLowerCase();
        const rawGen = (item.product?.genericName || item.genericName || "").toLowerCase();

        // Helper to strip noise words like "pharma", "pharmaceuticals", "ltd", "group"
        const cleanTokens = (str: string) =>
          str
            .toLowerCase()
            .replace(/[^\w\s]/g, " ")
            .split(/\s+/)
            .filter((w) => w.length >= 3 && !["group", "pharmaceuticals", "pharma", "ltd", "limited", "pvt", "corp", "co", "corner"].includes(w));

        const mfgTokens = cleanTokens(rawMfg);
        const genTokens = cleanTokens(rawGen);

        groups.forEach((g) => {
          const gData = map.get(g.id)!;
          const gTokens = cleanTokens(g.name || "");

          // Match condition:
          // 1. Product is ALREADY inside this group/rack
          const isAlreadyInGroup = Boolean(prodId && gData.products.has(prodId));

          // 2. Or is it a company group and brand tokens match (e.g. "beximco" in "Beximco Group" vs "Beximco Pharma")
          const isCompanyMatch =
            g.type === "COMPANY" &&
            mfgTokens.some((tok) => gTokens.includes(tok));

          // 3. Or is it a generic group and generic tokens match (e.g. "paracetamol")
          const isGenericMatch =
            g.type === "GENERIC" &&
            genTokens.some((tok) => gTokens.includes(tok));

          if (isAlreadyInGroup || isCompanyMatch || isGenericMatch) {
            gData.totalUnitsInGodown += remainingGodownQty;

            if (prodId && !gData.products.has(prodId)) {
              gData.products.set(prodId, {
                product: item.product || {
                  id: prodId,
                  name: prodName,
                  manufacturer: item.product?.manufacturer || item.manufacturer,
                  genericName: item.product?.genericName || item.genericName,
                },
                shopUnits: 0,
                godownUnits: 0,
                totalUnits: 0,
                batches: [],
              });
            }
            if (prodId) {
              const pEntry = gData.products.get(prodId)!;
              pEntry.godownUnits += remainingGodownQty;
              pEntry.totalUnits += remainingGodownQty;
              if (!pEntry.batches.some((b: any) => (b.batch?.id || b.id) === item.id)) {
                pEntry.batches.push({ batch: item, allocatedQty: 0 });
              }
            }
          }
        });
      }
    });

    map.forEach((val) => {
      val.productCount = val.products.size;
    });

    return map;
  }, [groups, inventory]);

  // Filter groups by search query (name or physical location)
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nMatch = (g.name || "").toLowerCase().includes(q);
        const lMatch = (g.location || "").toLowerCase().includes(q);
        return nMatch || lMatch;
      }
      return true;
    });
  }, [groups, searchQuery]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredGroups.length / pageSize) || 1;
  const paginatedGroups = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredGroups.slice(startIndex, startIndex + pageSize);
  }, [filteredGroups, page, pageSize]);

  // Edit Group Handlers
  const handleStartEditGroup = (group: any) => {
    setEditingGroupId(group.id);
    setEditingGroupName(group.name || "");
    setEditingGroupLocation(group.location || "");
    setIsEditingModalOpen(true);
  };

  const handleSaveEditGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroupName.trim()) {
      showAlert.error("Validation Error", "Group name cannot be empty.");
      return;
    }
    setEditingSubmitting(true);
    try {
      const res = await fetchApi<any>(`/locations/racks/${encodeURIComponent(editingGroupId)}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editingGroupName.trim(),
          location: editingGroupLocation.trim() || null,
        }),
      });

      if (res.success || res.data) {
        showAlert.toast("Group updated successfully", "success");
        setGroups((prev) =>
          prev.map((g) =>
            g.id === editingGroupId
              ? {
                  ...g,
                  name: editingGroupName.trim(),
                  location: editingGroupLocation.trim() || null,
                }
              : g
          )
        );
        setIsEditingModalOpen(false);
      } else {
        showAlert.error("Update Failed", res.message || "Could not update group.");
      }
    } catch (err: any) {
      console.error("Update group error:", err);
      showAlert.error("Error", err.message || "Failed to update storage group.");
    } finally {
      setEditingSubmitting(false);
    }
  };

  // Start shift product modal
  const handleStartShiftProduct = (item: any) => {
    setShiftingProduct(item);
    setShiftQuantity(item.shopUnits);

    // Auto-detect recommended target group based on product company/manufacturer
    const mfg = (item.manufacturer || item.product?.manufacturer || item.product?.brandName || "").toLowerCase().trim();
    let autoGroup = "";
    if (mfg && groups.length > 0) {
      const found = groups.find(
        (g) => g.id !== selectedGroup?.id && (g.name.toLowerCase().includes(mfg) || mfg.includes(g.name.toLowerCase()))
      );
      if (found) autoGroup = found.id;
    }
    setShiftTargetGroupId(autoGroup);
    setShiftNotes(`Shifted from ${selectedGroup?.name || "storage group"}`);
    setIsShiftModalOpen(true);
  };

  // Submit shift product
  const handleConfirmShiftProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftingProduct) return;
    if (!shiftTargetGroupId) {
      showAlert.error("Missing Destination", "Please choose the destination storage group.");
      return;
    }
    if (shiftTargetGroupId === selectedGroup?.id) {
      showAlert.error("Invalid Destination", "Destination group must be different from current group.");
      return;
    }
    if (!shiftQuantity || shiftQuantity <= 0) {
      showAlert.error("Invalid Quantity", "Quantity must be greater than 0.");
      return;
    }
    if (shiftQuantity > shiftingProduct.shopUnits) {
      showAlert.error(
        "Quantity Exceeded",
        `Cannot shift more than current shop stock (${shiftingProduct.shopUnits.toLocaleString()} units).`
      );
      return;
    }

    try {
      setShiftSubmitting(true);
      const batchesWithLoc = (shiftingProduct.batches || []).filter((b: any) => b.locationId && b.allocatedQty > 0);

      if (batchesWithLoc.length === 0) {
        throw new Error("No physical shop location found for this medicine in this group.");
      }

      let remainingToShift = shiftQuantity;
      for (const b of batchesWithLoc) {
        if (remainingToShift <= 0) break;
        const moveQty = Math.min(remainingToShift, b.allocatedQty);
        if (moveQty > 0) {
          const res = await fetchApi<any>("/inventory/move", {
            method: "POST",
            body: JSON.stringify({
              fromLocationId: b.locationId,
              rackId: shiftTargetGroupId,
              quantity: moveQty,
              notes: shiftNotes.trim() || `Shifted ${shiftingProduct.name} from ${selectedGroup?.name} to new group`,
            }),
          });

          if (!res || (!res.success && !(res as any)?.fromLocation && !(res as any)?.toLocation && !res.data)) {
            throw new Error(res?.message || "Failed to shift stock location.");
          }

          remainingToShift -= moveQty;
        }
      }

      const targetGroupObj = groups.find((g) => g.id === shiftTargetGroupId);
      showAlert.toast(`Successfully shifted ${shiftingProduct.name} to ${targetGroupObj?.name || "selected group"}!`, "success");
      setIsShiftModalOpen(false);
      setShiftingProduct(null);
      await loadData();
    } catch (err: any) {
      console.error("Shift product error:", err);
      showAlert.error("Shift Failed", err.message || "Failed to shift product to selected group.");
    } finally {
      setShiftSubmitting(false);
    }
  };

  // Delete Group
  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    const confirmed = await showAlert.confirm(
      "Delete Storage Group?",
      `Are you sure you want to delete "${groupName}"? Existing stock inside this group will return to Godown unallocated.`,
      "Delete Group",
      "Cancel",
      true
    );

    if (!confirmed) return;

    try {
      const res = await fetchApi<any>(`/locations/racks/${encodeURIComponent(groupId)}`, {
        method: "DELETE",
      });

      if (res.success || res.message) {
        showAlert.toast("Group deleted successfully", "success");
        setGroups((prev) => prev.filter((g) => g.id !== groupId));
        if (activeGroupId === groupId) {
          setViewMode("TABLE");
          setActiveGroupId("");
        }
      } else {
        showAlert.error("Delete Failed", res.message || "Could not delete group.");
      }
    } catch (err: any) {
      console.error("Delete group error:", err);
      showAlert.error("Error", err.message || "Failed to delete storage group.");
    }
  };

  // Active Selected Group for deep-dive Details View
  const selectedGroup = useMemo(() => {
    return groups.find((g) => g.id === activeGroupId) || null;
  }, [groups, activeGroupId]);

  // Products belonging to the selected group
  const selectedGroupProducts = useMemo(() => {
    if (!selectedGroup) return [];
    const metrics = groupMetricsMap.get(selectedGroup.id);
    if (!metrics) return [];

    const list: any[] = [];
    metrics.products.forEach((entry, pId) => {
      const p = entry.product || {};
      list.push({
        productId: pId,
        product: p,
        name: p.name || "Unknown Medicine",
        genericName: p.genericName || "N/A",
        manufacturer: p.manufacturer || p.brandName || "N/A",
        shopUnits: entry.shopUnits || 0,
        godownUnits: entry.godownUnits || 0,
        totalUnits: (entry.shopUnits || 0) + (entry.godownUnits || 0),
        batches: entry.batches || [],
      });
    });

    return list.sort((a, b) => b.totalUnits - a.totalUnits);
  }, [selectedGroup, groupMetricsMap]);

  // If Generic Group: Breakdown by Pharmaceutical Brand/Manufacturer
  const genericCompanyBreakdown = useMemo(() => {
    if (!selectedGroup || selectedGroup.type !== "GENERIC") return [];
    const companyMap = new Map<string, { company: string; shopUnits: number; godownUnits: number; products: string[] }>();

    selectedGroupProducts.forEach((p) => {
      const comp = p.manufacturer || "Other";
      if (!companyMap.has(comp)) {
        companyMap.set(comp, {
          company: comp,
          shopUnits: 0,
          godownUnits: 0,
          products: [],
        });
      }
      const entry = companyMap.get(comp)!;
      entry.shopUnits += p.shopUnits;
      entry.godownUnits += p.godownUnits;
      if (!entry.products.includes(p.name)) entry.products.push(p.name);
    });

    return Array.from(companyMap.values()).sort((a, b) => (b.shopUnits + b.godownUnits) - (a.shopUnits + a.godownUnits));
  }, [selectedGroup, selectedGroupProducts]);

  // Batches available in Godown for transfer
  const godownBatches = useMemo(() => {
    return inventory
      .map((item) => {
        const total = item.quantity || 0;
        const allocated = (item.locations || []).reduce((sum: number, l: any) => sum + (Number(l.quantity) || 0), 0);
        const godownQty = Math.max(0, total - allocated);
        return {
          ...item,
          godownQty,
        };
      })
      .filter((item) => item.godownQty > 0);
  }, [inventory]);

  // Target group object
  const currentTargetGroup = useMemo(() => {
    return groups.find((g) => g.id === moveTargetGroupId) || null;
  }, [groups, moveTargetGroupId]);

  // Filtered and FEFO-sorted batches for the target group
  const groupFilteredBatches = useMemo(() => {
    const list = [...godownBatches];
    if (!currentTargetGroup) {
      return list.sort((a, b) => {
        const expA = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
        const expB = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
        return expA - expB;
      });
    }

    const gType = currentTargetGroup.type;
    const cleanTokens = (str: string) =>
      str
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !["group", "pharmaceuticals", "pharma", "ltd", "limited", "pvt", "corp", "co", "corner"].includes(w));

    const gTokens = cleanTokens(currentTargetGroup.name || "");
    const metrics = groupMetricsMap.get(currentTargetGroup.id);
    const assignedProdIds = metrics ? Array.from(metrics.products.keys()) : [];

    const matches = list.filter((b) => {
      const pId = b.productId || b.product?.id;
      if (pId && assignedProdIds.includes(pId)) return true;

      const mfg = (b.product?.manufacturer || b.manufacturer || b.product?.brandName || "").toLowerCase();
      const mfgTokens = cleanTokens(mfg);
      if (gType === "COMPANY" && mfgTokens.some((t) => gTokens.includes(t))) return true;

      const gen = (b.product?.genericName || b.genericName || "").toLowerCase();
      const genTokens = cleanTokens(gen);
      if (gType === "GENERIC" && genTokens.some((t) => gTokens.includes(t))) return true;

      return false;
    });

    const listToUse = matches.length > 0 ? matches : list;

    // FEFO: Earliest Expiry Date First
    return listToUse.sort((a, b) => {
      const expA = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
      const expB = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
      return expA - expB;
    });
  }, [currentTargetGroup, godownBatches, groupMetricsMap]);

  // Search filtered batches inside picker
  const visibleBatchesInPicker = useMemo(() => {
    if (!batchSearchQuery.trim()) return groupFilteredBatches;
    const q = batchSearchQuery.toLowerCase();
    return groupFilteredBatches.filter((b) => {
      const pName = (b.product?.name || b.name || "").toLowerCase();
      const bNum = (b.batchNumber || "").toLowerCase();
      const gen = (b.product?.genericName || b.genericName || "").toLowerCase();
      const mfg = (b.product?.manufacturer || b.manufacturer || "").toLowerCase();
      return pName.includes(q) || bNum.includes(q) || gen.includes(q) || mfg.includes(q);
    });
  }, [groupFilteredBatches, batchSearchQuery]);

  // Active selected batch
  const activeSelectedBatch = useMemo(() => {
    return godownBatches.find((b) => b.id === moveBatchId) || null;
  }, [godownBatches, moveBatchId]);

  // Active selected product
  const activeSelectedProduct = useMemo(() => {
    if (activeSelectedBatch?.product) return activeSelectedBatch.product;
    if (moveProductId) {
      const fromInv = inventory.find((i) => (i.productId || i.product?.id) === moveProductId);
      if (fromInv?.product) return fromInv.product;
    }
    return activeSelectedBatch || null;
  }, [activeSelectedBatch, moveProductId, inventory]);

  // Batches for the current selected product
  const batchesForSelectedProduct = useMemo(() => {
    const pId = moveProductId || activeSelectedBatch?.productId || activeSelectedBatch?.product?.id;
    if (!pId) return godownBatches;
    const matches = godownBatches.filter((b) => (b.productId === pId || b.product?.id === pId));
    return matches.length > 0 ? matches : godownBatches;
  }, [moveProductId, activeSelectedBatch, godownBatches]);

  // FEFO: Earliest Expiry Date First
  const sortedMovingBatches = useMemo(() => {
    return [...batchesForSelectedProduct].sort((a, b) => {
      const expA = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
      const expB = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
      return expA - expB;
    });
  }, [batchesForSelectedProduct]);

  // Total Godown units across batches for this product
  const totalGodownUnitsAcrossBatches = useMemo(() => {
    return batchesForSelectedProduct.reduce((sum, b) => sum + (b.godownQty || 0), 0);
  }, [batchesForSelectedProduct]);

  // Packaging configuration
  const packagingConfig = useMemo(() => {
    const prod = activeSelectedBatch?.product || activeSelectedProduct || activeSelectedBatch || {};
    const stripsPerBox = Math.max(1, prod.stripsPerBox || 10);
    const tabletsPerStrip = Math.max(1, prod.tabletsPerStrip || 10);
    const unit = prod.unit || "tablet";
    const isTablet = prod.productType === "MEDICINE" || prod.category === "Medicine" || prod.stripsPerBox > 1;
    return {
      stripsPerBox,
      tabletsPerStrip,
      unit,
      isTablet,
    };
  }, [activeSelectedBatch, activeSelectedProduct]);

  // Base quantity to move in basic units (tablets/pieces)
  const baseUnitsToMove = useMemo(() => {
    const { stripsPerBox, tabletsPerStrip } = packagingConfig;
    if (moveUnitType === "BOX") {
      return moveQuantity * stripsPerBox * tabletsPerStrip;
    } else if (moveUnitType === "STRIP") {
      return moveQuantity * tabletsPerStrip;
    }
    return moveQuantity;
  }, [moveQuantity, moveUnitType, packagingConfig]);

  const godownAvailableUnits = activeSelectedBatch ? activeSelectedBatch.godownQty : 0;
  const isMoveOverLimit = activeSelectedBatch ? baseUnitsToMove > godownAvailableUnits : false;
  const remainingGodownUnits = Math.max(0, godownAvailableUnits - baseUnitsToMove);

  const totalTabsPerBox = packagingConfig.stripsPerBox * packagingConfig.tabletsPerStrip;
  const availableBoxesCount = Math.floor(godownAvailableUnits / totalTabsPerBox);
  const availableLooseTabsCount = godownAvailableUnits % totalTabsPerBox;
  const remainingBoxesCount = Math.floor(remainingGodownUnits / totalTabsPerBox);
  const remainingLooseTabsCount = remainingGodownUnits % totalTabsPerBox;

  // Filtered target groups / locations for 1-click list
  const filteredLocationGroups = useMemo(() => {
    if (!groupSearchQuery.trim()) return groups;
    const q = groupSearchQuery.toLowerCase().trim();
    return groups.filter((g) => {
      const nameMatch = (g.name || "").toLowerCase().includes(q);
      const locMatch = (g.location || "").toLowerCase().includes(q);
      const typeMatch = (g.type || "").toLowerCase().includes(q);
      return nameMatch || locMatch || typeMatch;
    });
  }, [groups, groupSearchQuery]);

  // Handle Move Stock from Godown to Group
  const handleMoveStock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!moveBatchId) {
      showAlert.error("Missing Medicine", "Please choose a batch from Godown to move.");
      return;
    }
    if (!moveTargetGroupId) {
      showAlert.error("Missing Group", "Please select which Shop Group to allocate this medicine into.");
      return;
    }
    if (baseUnitsToMove <= 0) {
      showAlert.error("Invalid Quantity", "Quantity to move must be greater than zero.");
      return;
    }
    if (isMoveOverLimit) {
      showAlert.error(
        "Insufficient Godown Stock",
        `You requested ${baseUnitsToMove.toLocaleString()} units, but only ${godownAvailableUnits.toLocaleString()} units are in Godown.`
      );
      return;
    }

    try {
      setMoveSubmitting(true);
      const res = await fetchApi<any>("/inventory/allocate", {
        method: "POST",
        body: JSON.stringify({
          inventoryId: moveBatchId,
          rackId: moveTargetGroupId,
          shelfId: null,
          binId: null,
          quantity: baseUnitsToMove,
        }),
      });

      if (res?.success || (res as any)?.location || (res as any)?.data) {
        showAlert.toast("Stock successfully moved from Godown into group!", "success");
        await loadData();
        setViewMode(activeGroupId ? "GROUP_DETAIL" : "TABLE");
        setMoveQuantity(1);
      } else {
        showAlert.error("Allocation Failed", res.message || "Failed to allocate stock.");
      }
    } catch (err: any) {
      console.error("Move stock error:", err);
      showAlert.error("Error", err.message || "Failed to move stock.");
    } finally {
      setMoveSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* ═══════════════════════════════════════════════════════════════
          VIEW 1: CLEAN GROUP LIST TABLE WITH PAGINATION (0 STAT CARDS)
          ═══════════════════════════════════════════════════════════════ */}
      {viewMode === "TABLE" && (
        <div className="space-y-4">
          {/* Header Row: Title & Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                <LayoutGrid className="h-7 w-7 text-brand-primary" />
                Storage Groups &amp; Zones
              </h1>
              <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
                Manage company corners, generic therapy zones, and check in-shop vs godown quantities.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition cursor-pointer"
                title="Refresh Groups"
              >
                <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
              </button>

              <button
                type="button"
                onClick={() => onNavigate("loc_create_group")}
                className="px-5 py-2.5 rounded-lg bg-brand-primary hover:bg-emerald-600 text-white text-sm sm:text-base font-bold shadow-sm transition cursor-pointer flex items-center gap-2 active:scale-95"
              >
                <Plus className="h-5 w-5 stroke-[2.5]" />
                <span>Create New Group</span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search group name or location..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm sm:text-base font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setPage(1);
                }}
                className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-semibold px-2 py-1 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Main Paginated Data Table */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            {loading ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm sm:text-base border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850">
                      <th className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300 w-14 text-center text-sm sm:text-base">#</th>
                      <th className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">Group Name</th>
                      <th className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">Physical Location</th>
                      <th className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300 text-center text-sm sm:text-base w-72">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 animate-pulse">
                    {[...Array(6)].map((_, i) => (
                      <tr key={`skeleton-${i}`} className="h-16">
                        {/* Index Skeleton */}
                        <td className="py-3.5 px-3.5 text-center">
                          <div className="h-3.5 w-4 bg-slate-200 dark:bg-slate-800 rounded mx-auto" />
                        </td>

                        {/* Group Name & Badge Skeleton */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
                            <div className="space-y-1.5">
                              <div className="h-3.5 w-36 sm:w-48 bg-slate-200 dark:bg-slate-800 rounded-md" />
                              <div className="h-2.5 w-16 bg-slate-100 dark:bg-slate-800/60 rounded-full" />
                            </div>
                          </div>
                        </td>

                        {/* Physical Location Skeleton */}
                        <td className="py-3.5 px-4">
                          <div className="h-6 w-28 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                        </td>

                        {/* Actions Skeleton */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="h-7 w-12 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                            <div className="h-7 w-14 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                            <div className="h-7 w-14 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                            <div className="h-7 w-7 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : paginatedGroups.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <Box className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto" />
                <div>
                  <h3 className="text-sm font-black text-slate-700 dark:text-slate-300">
                    No Storage Groups Found
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {searchQuery
                      ? "No groups match your search query."
                      : "Create your first storage group to get started."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate("loc_create_group")}
                  className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold transition cursor-pointer hover:bg-emerald-600"
                >
                  + Create Group
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm sm:text-base border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850">
                      <th className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300 w-14 text-center text-sm sm:text-base">#</th>
                      <th className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">Group Name</th>
                      <th className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">Physical Location</th>
                      <th className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300 text-center text-sm sm:text-base w-72">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
                    {paginatedGroups.map((group, idx) => {
                      const isCompany = group.type === "COMPANY";
                      const isGeneric = group.type === "GENERIC";
                      const isSpecial = group.type === "SPECIAL";
                      const rowNum = (page - 1) * pageSize + idx + 1;

                      return (
                        <tr
                          key={group.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors"
                        >
                          {/* Row Index */}
                          <td className="py-4 px-4 text-center text-slate-500 font-mono text-sm sm:text-base font-semibold">
                            {rowNum}
                          </td>

                          {/* Group Name */}
                          <td className="py-4 px-4">
                            <div className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                              {group.name}
                            </div>
                          </td>

                          {/* Physical Location (Normal text, no box or border) */}
                          <td className="py-4 px-4">
                            <span className="text-slate-800 dark:text-slate-200 font-medium text-sm sm:text-base">
                              {group.location || "—"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              {/* Edit Group Name & Location button */}
                              <button
                                type="button"
                                onClick={() => handleStartEditGroup(group)}
                                className="px-3 py-1.5 rounded-lg text-sm font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition cursor-pointer flex items-center gap-1.5"
                                title="Edit group name and physical location"
                              >
                                <Edit2 className="h-4 w-4" />
                                <span>Edit</span>
                              </button>

                              {/* Details button (switches to Full-Page Details) */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveGroupId(group.id);
                                  setViewMode("GROUP_DETAIL");
                                }}
                                className="px-3 py-1.5 rounded-lg text-sm font-bold text-brand-primary bg-brand-primary/10 hover:bg-brand-primary hover:text-white transition cursor-pointer flex items-center gap-1.5"
                                title="View medicines in this group"
                              >
                                <Eye className="h-4 w-4" />
                                <span>Details</span>
                              </button>



                              {/* Delete button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteGroup(group.id, group.name)}
                                className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                                title="Delete group"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {loading ? (
              <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs animate-pulse">
                <div className="h-4 w-44 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="flex items-center gap-2">
                  <div className="h-7 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                  <div className="h-7 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                </div>
              </div>
            ) : filteredGroups.length > 0 && (
              <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-medium">
                    Showing {(page - 1) * pageSize + 1} to{" "}
                    {Math.min(page * pageSize, filteredGroups.length)} of {filteredGroups.length} groups
                  </span>

                  <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 dark:border-slate-700">
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value) || 10);
                        setPage(1);
                      }}
                      className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                    >
                      <option value={10}>10 / page</option>
                      <option value={15}>15 / page</option>
                      <option value={25}>25 / page</option>
                      <option value={50}>50 / page</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pNum = i + 1;
                    if (
                      totalPages > 7 &&
                      pNum !== 1 &&
                      pNum !== totalPages &&
                      Math.abs(pNum - page) > 1
                    ) {
                      return null;
                    }
                    return (
                      <button
                        key={pNum}
                        type="button"
                        onClick={() => setPage(pNum)}
                        className={`w-7 h-7 rounded-lg font-bold text-xs transition cursor-pointer ${
                          page === pNum
                            ? "bg-brand-primary text-white"
                            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {pNum}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          VIEW 2: FULL-PAGE CLEAN GROUP DETAILS VIEW (ZERO POPUPS)
          ═══════════════════════════════════════════════════════════════ */}
      {viewMode === "GROUP_DETAIL" && selectedGroup && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode("TABLE")}
              className="inline-flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>&larr; Back to Group List</span>
            </button>


          </div>

          {/* Group Header Hero Summary */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {selectedGroup.name}
              </h2>
              {selectedGroup.location && (
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mt-1">
                  Location: {selectedGroup.location}
                </p>
              )}
            </div>

            {/* Quick Metrics Bar */}
            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-850 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold">Total Medicines</span>
                <span className="font-mono font-black text-slate-900 dark:text-white text-sm">
                  {selectedGroupProducts.length} items
                </span>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
              <div>
                <span className="text-emerald-600 block font-semibold">In Shop</span>
                <span className="font-mono font-black text-emerald-600 text-sm">
                  {selectedGroupProducts.reduce((sum, p) => sum + p.shopUnits, 0).toLocaleString()}
                </span>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
              <div>
                <span className="text-amber-600 block font-semibold">In Godown</span>
                <span className="font-mono font-black text-amber-600 text-sm">
                  {selectedGroupProducts.reduce((sum, p) => sum + p.godownUnits, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Generic Group Analysis (If Generic group, e.g. Paracetamol: shows Beximco vs Square vs Acme) */}
          {genericCompanyBreakdown.length > 1 && (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-brand-primary" />
                <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Manufacturer / Brand Comparison in this Therapy Group
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm sm:text-base border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
                      <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Company</th>
                      <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Medicines</th>
                      <th className="py-3 px-4 font-bold text-emerald-600 text-right">In Shop</th>
                      <th className="py-3 px-4 font-bold text-amber-600 text-right">In Godown</th>
                      <th className="py-3 px-4 font-bold text-slate-900 dark:text-white text-right">Total Units</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
                    {genericCompanyBreakdown.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-blue-500" />
                          <span>{row.company}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                          {row.products.join(", ")}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                          {row.shopUnits.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-600">
                          {row.godownUnits.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900 dark:text-white">
                          {(row.shopUnits + row.godownUnits).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Medicines List in this Group */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Pill className="h-5 w-5 text-brand-primary" />
                <span>All Medicines in {selectedGroup.name} ({selectedGroupProducts.length})</span>
              </h3>
            </div>

            {selectedGroupProducts.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                No medicines currently assigned to this storage group.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm sm:text-base border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
                      <th className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300 text-sm sm:text-base">Medicine Name</th>
                      <th className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300 text-sm sm:text-base">Generic &amp; Company</th>
                      <th className="py-3.5 px-4 font-bold text-emerald-600 text-right text-sm sm:text-base">In Shop</th>
                      <th className="py-3.5 px-4 font-bold text-amber-600 text-right text-sm sm:text-base">In Godown</th>
                      <th className="py-3.5 px-4 font-bold text-slate-900 dark:text-white text-right text-sm sm:text-base">Total Units</th>
                      <th className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300 text-center text-sm sm:text-base">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
                    {selectedGroupProducts.map((item) => (
                      <tr key={item.productId} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                          {item.name}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm sm:text-base">{item.genericName}</div>
                          <div className="text-xs sm:text-sm text-slate-500">{item.manufacturer}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm sm:text-base">
                          {item.shopUnits.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400 text-sm sm:text-base">
                          {item.godownUnits.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 dark:text-white text-sm sm:text-base">
                          {item.totalUnits.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            {item.shopUnits > 0 && (
                              <button
                                type="button"
                                onClick={() => handleStartShiftProduct(item)}
                                className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                                title="Shift this medicine to another storage group"
                              >
                                <ArrowLeftRight className="h-3.5 w-3.5" />
                                <span>Shift Group</span>
                              </button>
                            )}
                            {item.godownUnits > 0 ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setMoveProductId(item.product.id);
                                  const matchingBatch = godownBatches.find(
                                    (b) => (b.productId === item.product.id || b.product?.id === item.product.id) && b.godownQty > 0
                                  );
                                  if (matchingBatch) {
                                    setMoveBatchId(matchingBatch.id);
                                  } else if (item.batches.length > 0) {
                                    setMoveBatchId(item.batches[0].batch?.id || item.batches[0].id);
                                  }
                                  setMoveTargetGroupId(selectedGroup.id);
                                  setBatchSearchQuery("");
                                  setGroupSearchQuery("");
                                  setMoveQuantity(1);
                                  setViewMode("MOVE_STOCK");
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                              >
                                + Move from Godown
                              </button>
                            ) : item.shopUnits === 0 ? (
                              <span className="text-xs sm:text-sm text-slate-400 font-normal">
                                No Stock
                              </span>
                            ) : null}
                          </div>
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

      {/* ═══════════════════════════════════════════════════════════════
          VIEW 3: DEDICATED FULL-PAGE VIEW: MOVE STOCK TO SHOP (SAME AS STOCK LIST)
          ═══════════════════════════════════════════════════════════════ */}
      {viewMode === "MOVE_STOCK" && (
        <div className="space-y-6 max-w-6xl mx-auto py-2 px-1 animate-in fade-in duration-200">
          {/* Top Header & Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <button
                type="button"
                onClick={() => {
                  if (activeGroupId) {
                    setViewMode("GROUP_DETAIL");
                  } else {
                    setViewMode("TABLE");
                  }
                }}
                className="inline-flex items-center gap-2 text-sm sm:text-base font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition mb-2 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>{activeGroupId ? "Back to Group Details" : "Back to Groups"}</span>
              </button>
              <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-slate-900 dark:text-white tracking-tight">
                Move Stock to Shop
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (activeGroupId) {
                    setViewMode("GROUP_DETAIL");
                  } else {
                    setViewMode("TABLE");
                  }
                }}
                className="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleMoveStock()}
                disabled={moveSubmitting || !moveBatchId || !moveTargetGroupId || baseUnitsToMove <= 0 || isMoveOverLimit}
                style={{ backgroundColor: "var(--primary-color, #059669)" }}
                className="px-6 py-2.5 rounded-lg text-white text-sm sm:text-base font-bold shadow-sm hover:opacity-90 disabled:opacity-50 transition cursor-pointer flex items-center gap-2 active:scale-95"
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
          <form onSubmit={handleMoveStock}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Medicine Details & Quantity */}
              <div className="lg:col-span-6 space-y-6">
                {/* Medicine Card */}
                {activeSelectedBatch ? (
                  <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                          {activeSelectedProduct?.name || activeSelectedBatch.name || "Medicine"}
                          {(activeSelectedProduct?.size || activeSelectedBatch.size) && (
                            <span className="ml-2 text-base font-medium text-slate-500 dark:text-slate-400">
                              ({activeSelectedProduct?.size || activeSelectedBatch.size})
                            </span>
                          )}
                        </h2>
                        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
                          {activeSelectedProduct?.genericName ? `${activeSelectedProduct.genericName} • ` : ""}
                          {activeSelectedProduct?.manufacturer || activeSelectedProduct?.brandName || "Standard"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="px-3.5 py-1.5 rounded-md text-sm sm:text-base font-mono font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 block shadow-2xs">
                          Total Godown: {totalGodownUnitsAcrossBatches.toLocaleString()} {packagingConfig.unit}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setMoveBatchId("");
                            setMoveProductId("");
                          }}
                          className="text-xs text-brand-primary hover:underline font-semibold mt-1 inline-block cursor-pointer"
                        >
                          Change Medicine
                        </button>
                      </div>
                    </div>

                    {/* Batch Information */}
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-300">
                          Select Batch <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          Earliest expiry first (FEFO)
                        </span>
                      </div>

                      {/* Scrollable Batch List with visible styled scrollbar */}
                      <div className="max-h-56 overflow-y-auto space-y-2 p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg [scrollbar-width:thin] [scrollbar-color:#94a3b8_#f1f5f9] dark:[scrollbar-color:#64748b_#1e293b] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100 dark:[&::-webkit-scrollbar-track]:bg-slate-800">
                        {sortedMovingBatches.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-400">
                            No batch with godown stock available.
                          </div>
                        ) : (
                          sortedMovingBatches.map((b, idx) => {
                            const isSelected = moveBatchId === b.id;
                            const isFirst = idx === 0;

                            return (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => setMoveBatchId(b.id)}
                                className={`w-full text-left p-3 rounded-lg border transition flex items-center justify-between gap-3 cursor-pointer ${
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
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
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
                                      {b.godownQty.toLocaleString()} {packagingConfig.unit}
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
                  </div>
                ) : (
                  /* Medicine Search & Picker when none selected */
                  <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                      Select Medicine in Godown <span className="text-rose-500">*</span>
                    </h2>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search medicine name, generic, or batch..."
                        value={batchSearchQuery}
                        onChange={(e) => setBatchSearchQuery(e.target.value)}
                        className="w-full h-11 pl-10 pr-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm sm:text-base outline-none focus:border-brand-primary text-slate-800 dark:text-slate-200"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-80 overflow-y-auto space-y-2 p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg [scrollbar-width:thin] [scrollbar-color:#94a3b8_#f1f5f9] dark:[scrollbar-color:#64748b_#1e293b] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100 dark:[&::-webkit-scrollbar-track]:bg-slate-800">
                      {visibleBatchesInPicker.length === 0 ? (
                        <div className="py-8 text-center text-sm text-slate-400">
                          No matching stock in Godown found.
                        </div>
                      ) : (
                        visibleBatchesInPicker.map((b) => {
                          const p = b.product || b;
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => {
                                setMoveBatchId(b.id);
                                setMoveProductId(b.productId || p.id || "");
                              }}
                              className="w-full text-left p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-brand-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-between gap-3 cursor-pointer"
                            >
                              <div>
                                <div className="font-bold text-base text-slate-900 dark:text-white">
                                  {p.name}
                                </div>
                                <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                                  {p.genericName ? `${p.genericName} • ` : ""}Batch #{b.batchNumber || "Default"} • Exp: {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : "N/A"}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-mono font-bold text-amber-700 dark:text-amber-300 text-sm sm:text-base">
                                  {b.godownQty.toLocaleString()} units
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Quantity to Move Card */}
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                      Quantity to Move <span className="text-rose-500">*</span>
                    </h3>
                    <span className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
                      Moving: <strong className="text-brand-primary font-mono text-base sm:text-lg">{baseUnitsToMove.toLocaleString()}</strong> {packagingConfig.unit}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <input
                        type="number"
                        required
                        min={1}
                        value={moveQuantity}
                        onChange={(e) => setMoveQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full h-12 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-lg font-bold text-slate-900 dark:text-white outline-none focus:border-brand-primary font-mono"
                      />
                    </div>

                    {/* Unit Selector Toggle */}
                    {packagingConfig.isTablet ? (
                      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        {(["BOX", "STRIP", "TABLET"] as const).map((u) => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => setMoveUnitType(u)}
                            className={`py-2 rounded-md text-sm font-bold transition cursor-pointer text-center ${
                              moveUnitType === u
                                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                          >
                            {u === "BOX" ? "Box" : u === "STRIP" ? "Strip" : "Tab"}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="h-12 px-4 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm sm:text-base font-bold text-slate-600 dark:text-slate-300">
                        Unit: {packagingConfig.unit}
                      </div>
                    )}
                  </div>

                  {/* Live Stock Remaining Calculation Box */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-sm space-y-2">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>Available in Selected Batch:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {packagingConfig.isTablet && availableBoxesCount > 0
                          ? `${availableBoxesCount} Box${availableBoxesCount !== 1 ? "es" : ""}${availableLooseTabsCount > 0 ? ` + ${availableLooseTabsCount} ${packagingConfig.unit}` : ""} (${godownAvailableUnits.toLocaleString()} ${packagingConfig.unit})`
                          : `${godownAvailableUnits.toLocaleString()} ${packagingConfig.unit}`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                      <span>Moving to Shop:</span>
                      <span className="font-mono">
                        + {baseUnitsToMove.toLocaleString()} {packagingConfig.unit}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between font-bold">
                      <span className="text-slate-700 dark:text-slate-300">Remaining in Selected Batch:</span>
                      <span
                        className={`font-mono text-base ${
                          isMoveOverLimit ? "text-rose-600" : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {packagingConfig.isTablet && remainingBoxesCount >= 0
                          ? `${remainingBoxesCount} Box${remainingBoxesCount !== 1 ? "es" : ""}${remainingLooseTabsCount > 0 ? ` + ${remainingLooseTabsCount} ${packagingConfig.unit}` : ""} (${remainingGodownUnits.toLocaleString()} ${packagingConfig.unit})`
                          : `${remainingGodownUnits.toLocaleString()} ${packagingConfig.unit}`}
                      </span>
                    </div>

                    {isMoveOverLimit && (
                      <div className="pt-1.5 text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>Exceeds selected batch stock! Max available in this batch is {godownAvailableUnits.toLocaleString()} {packagingConfig.unit}.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Location */}
              <div className="lg:col-span-6 space-y-6">
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
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
                          if (filteredLocationGroups.length > 0) {
                            setMoveTargetGroupId(filteredLocationGroups[0].id);
                          }
                        }
                      }}
                      className="w-full h-11 pl-10 pr-9 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm sm:text-base outline-none focus:border-brand-primary text-slate-800 dark:text-slate-200"
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
                  <div className="max-h-[460px] overflow-y-auto space-y-2 p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg [scrollbar-width:thin] [scrollbar-color:#94a3b8_#f1f5f9] dark:[scrollbar-color:#64748b_#1e293b] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100 dark:[&::-webkit-scrollbar-track]:bg-slate-800">
                    {filteredLocationGroups.length === 0 ? (
                      <div className="py-10 text-center text-sm text-slate-400">
                        No location matching &quot;{groupSearchQuery}&quot;
                      </div>
                    ) : (
                      filteredLocationGroups.map((g) => {
                        const isSelected = moveTargetGroupId === g.id;

                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setMoveTargetGroupId(g.id)}
                            className={`w-full text-left p-3.5 rounded-lg border transition flex items-center justify-between gap-3 cursor-pointer ${
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
                onClick={() => {
                  if (activeGroupId) {
                    setViewMode("GROUP_DETAIL");
                  } else {
                    setViewMode("TABLE");
                  }
                }}
                className="px-6 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={moveSubmitting || !moveBatchId || !moveTargetGroupId || baseUnitsToMove <= 0 || isMoveOverLimit}
                style={{ backgroundColor: "var(--primary-color, #059669)" }}
                className="px-8 py-2.5 rounded-lg text-white text-sm sm:text-base font-bold shadow-sm hover:opacity-90 disabled:opacity-50 transition cursor-pointer flex items-center gap-2 active:scale-95"
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
      )}

      {/* Edit Storage Group Modal */}
      {isEditingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                  <Edit2 className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Edit Storage Group
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditGroup} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Storage Group Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingGroupName}
                  onChange={(e) => setEditingGroupName(e.target.value)}
                  placeholder="Enter storage group name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Physical Location
                </label>
                <input
                  type="text"
                  value={editingGroupLocation}
                  onChange={(e) => setEditingGroupLocation(e.target.value)}
                  placeholder="e.g. Rack 04, Shelf 2 or Fridge 01"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditingModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editingSubmitting}
                  className="px-5 py-2 rounded-xl bg-brand-primary hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-black shadow-sm transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  {editingSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shift Medicine to Another Group Modal */}
      {isShiftModalOpen && shiftingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <ArrowLeftRight className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Shift Medicine to Another Group
                  </h3>
                  <p className="text-xs text-slate-500">
                    Relocate stock from <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedGroup?.name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsShiftModalOpen(false);
                  setShiftingProduct(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmShiftProduct} className="p-6 space-y-4">
              {/* Medicine Summary Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-slate-900 dark:text-white">
                    {shiftingProduct.name}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    {shiftingProduct.shopUnits.toLocaleString()} units in shop
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span>Generic: <strong className="text-slate-700 dark:text-slate-300">{shiftingProduct.genericName}</strong></span>
                  <span>•</span>
                  <span>Mfg: <strong className="text-slate-700 dark:text-slate-300">{shiftingProduct.manufacturer}</strong></span>
                </div>
              </div>

              {/* Destination Group Dropdown */}
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Select Destination Storage Group <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={shiftTargetGroupId}
                  onChange={(e) => setShiftTargetGroupId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                >
                  <option value="">-- Choose destination group / rack --</option>
                  {groups
                    .filter((g) => g.id !== selectedGroup?.id)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.type}{g.location ? ` • ${g.location}` : ""})
                      </option>
                    ))}
                </select>
                {shiftTargetGroupId && (() => {
                  const targetG = groups.find((g) => g.id === shiftTargetGroupId);
                  const isMatchingMfg = (shiftingProduct.manufacturer || "")
                    .toLowerCase()
                    .trim() && targetG?.name?.toLowerCase().includes((shiftingProduct.manufacturer || "").toLowerCase().trim());
                  if (isMatchingMfg) {
                    return (
                      <p className="mt-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Matched manufacturer ({shiftingProduct.manufacturer})
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Quantity to Shift */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Quantity to Shift (Units) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShiftQuantity(shiftingProduct.shopUnits)}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Shift All ({shiftingProduct.shopUnits.toLocaleString()})
                  </button>
                </div>
                <input
                  type="number"
                  required
                  min={1}
                  max={shiftingProduct.shopUnits}
                  value={shiftQuantity}
                  onChange={(e) => setShiftQuantity(Math.max(1, Math.min(shiftingProduct.shopUnits, parseInt(e.target.value) || 1)))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Remaining in {selectedGroup?.name}: <strong>{Math.max(0, shiftingProduct.shopUnits - shiftQuantity).toLocaleString()} units</strong>
                </p>
              </div>

              {/* Transfer Notes (Optional) */}
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Reason / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={shiftNotes}
                  onChange={(e) => setShiftNotes(e.target.value)}
                  placeholder="e.g. Correcting misplaced medicine"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsShiftModalOpen(false);
                    setShiftingProduct(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={shiftSubmitting || !shiftTargetGroupId}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  {shiftSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Shifting...</span>
                    </>
                  ) : (
                    <>
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                      <span>Confirm Shift</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
