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

  // Move stock form state
  const [moveProductId, setMoveProductId] = useState<string>(preselectedProductId || "");
  const [moveBatchId, setMoveBatchId] = useState<string>(preselectedBatchId || "");
  const [moveTargetGroupId, setMoveTargetGroupId] = useState<string>(preselectedGroupId || "");
  const [moveQuantity, setMoveQuantity] = useState<number>(1);
  const [moveUnitType, setMoveUnitType] = useState<"BOX" | "STRIP" | "TABLET">("BOX");
  const [moveSubmitting, setMoveSubmitting] = useState(false);
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
            pEntry.batches.push({ batch: item, allocatedQty: qty });
          }
        }
      });

      // Godown stock logic: remaining unallocated stock
      const remainingGodownQty = Math.max(0, totalBatchQty - allocatedQtyInThisBatch);
      if (remainingGodownQty > 0) {
        const itemMfg = (item.product?.manufacturer || item.manufacturer || item.product?.brandName || "").toLowerCase();
        const itemGen = (item.product?.genericName || item.genericName || "").toLowerCase();

        groups.forEach((g) => {
          const gName = (g.name || "").toLowerCase();
          const isMatch =
            (g.type === "COMPANY" && itemMfg && gName.includes(itemMfg)) ||
            (g.type === "GENERIC" && itemGen && gName.includes(itemGen));

          if (isMatch) {
            const gData = map.get(g.id)!;
            gData.totalUnitsInGodown += remainingGodownQty;

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
              pEntry.godownUnits += remainingGodownQty;
              pEntry.totalUnits += remainingGodownQty;
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

  // Filter groups by tab and search
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      // Category filter
      if (activeCategoryTab !== "ALL") {
        if (activeCategoryTab === "COMPANY" && g.type !== "COMPANY") return false;
        if (activeCategoryTab === "GENERIC" && g.type !== "GENERIC") return false;
        if (activeCategoryTab === "SPECIAL" && g.type !== "SPECIAL") return false;
        if (activeCategoryTab === "CUSTOM" && g.type !== "CUSTOM" && g.type !== "RACK") return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nMatch = (g.name || "").toLowerCase().includes(q);
        const tMatch = (g.type || "").toLowerCase().includes(q);
        return nMatch || tMatch;
      }

      return true;
    });
  }, [groups, activeCategoryTab, searchQuery]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredGroups.length / pageSize) || 1;
  const paginatedGroups = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredGroups.slice(startIndex, startIndex + pageSize);
  }, [filteredGroups, page, pageSize]);

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

  // Handle Move Stock from Godown to Group
  const handleMoveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveBatchId) {
      showAlert.error("Missing Medicine", "Please choose a batch from Godown to move.");
      return;
    }
    if (!moveTargetGroupId) {
      showAlert.error("Missing Group", "Please select which Supershop Group to allocate this medicine into.");
      return;
    }

    const batch = godownBatches.find((b) => b.id === moveBatchId);
    if (!batch) {
      showAlert.error("Not Found", "Selected batch is no longer available in Godown.");
      return;
    }

    const prod = batch.product || batch;
    const tabsPerStrip = Math.max(1, prod.tabletsPerStrip || 10);
    const stripsPerBox = Math.max(1, prod.stripsPerBox || 10);
    let baseQtyToMove = moveQuantity;
    if (moveUnitType === "BOX") {
      baseQtyToMove = moveQuantity * stripsPerBox * tabsPerStrip;
    } else if (moveUnitType === "STRIP") {
      baseQtyToMove = moveQuantity * tabsPerStrip;
    }

    if (baseQtyToMove <= 0) {
      showAlert.error("Invalid Quantity", "Quantity to move must be greater than zero.");
      return;
    }

    if (baseQtyToMove > batch.godownQty) {
      showAlert.error(
        "Insufficient Godown Stock",
        `You requested ${baseQtyToMove.toLocaleString()} units, but only ${batch.godownQty.toLocaleString()} units are in Godown.`
      );
      return;
    }

    try {
      setMoveSubmitting(true);
      const res = await fetchApi<any>("/inventory/allocate", {
        method: "POST",
        body: JSON.stringify({
          inventoryId: batch.id,
          rackId: moveTargetGroupId,
          shelfId: null,
          binId: null,
          quantity: baseQtyToMove,
        }),
      });

      if (res?.success || (res as any)?.location || (res as any)?.data) {
        showAlert.toast("Stock successfully moved from Godown into group!", "success");
        await loadData();
        setViewMode("TABLE");
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
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                <LayoutGrid className="h-6 w-6 text-brand-primary" />
                Storage Groups &amp; Zones
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage company corners, generic therapy zones, and check in-shop vs godown quantities.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition cursor-pointer"
                title="Refresh Groups"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>

              <button
                type="button"
                onClick={() => onNavigate("loc_create_group")}
                className="px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-emerald-600 text-white text-xs font-black shadow-sm transition cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                <span>Create New Group</span>
              </button>
            </div>
          </div>

          {/* Filter & Search Bar (Clean, uncluttered, no stat cards) */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-2xs">
            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 content-scrollbar">
              {(
                [
                  { id: "ALL", label: "All Groups" },
                  { id: "COMPANY", label: "Company" },
                  { id: "GENERIC", label: "Generic" },
                  { id: "SPECIAL", label: "Cold Chain" },
                  { id: "CUSTOM", label: "Custom" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveCategoryTab(tab.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                    activeCategoryTab === tab.id
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input & Page Size */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search group name..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value) || 10);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
              >
                <option value={10}>10 / page</option>
                <option value={15}>15 / page</option>
                <option value={25}>25 / page</option>
              </select>
            </div>
          </div>

          {/* Main Paginated Data Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            {loading ? (
              <div className="py-16 text-center">
                <Loader2 className="h-8 w-8 text-brand-primary animate-spin mx-auto" />
                <p className="text-xs text-slate-400 mt-2 font-medium">Loading storage groups...</p>
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
                      : "Create your first company corner or generic zone to get started."}
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
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850">
                      <th className="py-3 px-3.5 font-black text-slate-500 w-12 text-center">#</th>
                      <th className="py-3 px-4 font-black text-slate-700 dark:text-slate-300">Group Name &amp; Type</th>
                      <th className="py-3 px-4 font-black text-slate-600 dark:text-slate-400">Placement Note</th>
                      <th className="py-3 px-3 font-black text-slate-700 dark:text-slate-300 text-center">Products</th>
                      <th className="py-3 px-3 font-black text-emerald-600 text-right">In Supershop</th>
                      <th className="py-3 px-3 font-black text-amber-600 text-right">In Godown</th>
                      <th className="py-3 px-3 font-black text-slate-900 dark:text-white text-right">Total Units</th>
                      <th className="py-3 px-4 font-black text-slate-600 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
                    {paginatedGroups.map((group, idx) => {
                      const metrics = groupMetricsMap.get(group.id) || {
                        totalUnitsInShop: 0,
                        totalUnitsInGodown: 0,
                        productCount: 0,
                      };

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
                          <td className="py-3 px-3.5 text-center text-slate-400 font-mono text-[11px]">
                            {rowNum}
                          </td>

                          {/* Group Name & Badge */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`p-2 rounded-xl shrink-0 ${
                                  isCompany
                                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                                    : isGeneric
                                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                                    : isSpecial
                                    ? "bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400"
                                    : "bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400"
                                }`}
                              >
                                {isCompany ? (
                                  <Building2 className="h-4 w-4" />
                                ) : isGeneric ? (
                                  <Pill className="h-4 w-4" />
                                ) : isSpecial ? (
                                  <Snowflake className="h-4 w-4" />
                                ) : (
                                  <Box className="h-4 w-4" />
                                )}
                              </div>
                              <div>
                                <div className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                                  {group.name}
                                </div>
                                <span
                                  className={`inline-block px-2 py-0.2 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                    isCompany
                                      ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                                      : isGeneric
                                      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                                      : isSpecial
                                      ? "bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300"
                                      : "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                                  }`}
                                >
                                  {isCompany ? "Company" : isGeneric ? "Generic" : isSpecial ? "Cold Chain" : "Custom"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Placement Note */}
                          <td className="py-3 px-4 text-slate-500 text-xs max-w-xs truncate">
                            {group.note || group.description || "Counter Area / Display"}
                          </td>

                          {/* Products Count */}
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                            {metrics.productCount}
                          </td>

                          {/* In Supershop Units */}
                          <td className="py-3 px-3 text-right">
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                              {metrics.totalUnitsInShop.toLocaleString()}
                            </span>
                          </td>

                          {/* In Godown Units */}
                          <td className="py-3 px-3 text-right">
                            <span className="font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                              {metrics.totalUnitsInGodown.toLocaleString()}
                            </span>
                          </td>

                          {/* Total Units */}
                          <td className="py-3 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                            {(metrics.totalUnitsInShop + metrics.totalUnitsInGodown).toLocaleString()}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Details button (switches to Full-Page Details) */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveGroupId(group.id);
                                  setViewMode("GROUP_DETAIL");
                                }}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-brand-primary bg-brand-primary/10 hover:bg-brand-primary hover:text-white transition cursor-pointer flex items-center gap-1"
                                title="View medicines in this group"
                              >
                                <Eye className="h-3 w-3" />
                                <span>Details</span>
                              </button>

                              {/* Refill / Move button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setMoveTargetGroupId(group.id);
                                  setViewMode("MOVE_STOCK");
                                }}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 transition cursor-pointer flex items-center gap-1"
                                title="Refill stock from Godown to this group"
                              >
                                <Store className="h-3 w-3" />
                                <span>Refill</span>
                              </button>

                              {/* Delete button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteGroup(group.id, group.name)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                                title="Delete group"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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
            {!loading && filteredGroups.length > 0 && (
              <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 font-medium">
                  Showing {(page - 1) * pageSize + 1} to{" "}
                  {Math.min(page * pageSize, filteredGroups.length)} of {filteredGroups.length} groups
                </span>

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

            <button
              type="button"
              onClick={() => {
                setMoveTargetGroupId(selectedGroup.id);
                setViewMode("MOVE_STOCK");
              }}
              className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-emerald-600 text-white text-xs font-black shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <Store className="h-3.5 w-3.5" />
              <span>+ Refill Medicines into this Group</span>
            </button>
          </div>

          {/* Group Header Hero Summary */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-brand-primary/10 text-brand-primary">
                {selectedGroup.type === "COMPANY" ? (
                  <Building2 className="h-6 w-6" />
                ) : selectedGroup.type === "GENERIC" ? (
                  <Pill className="h-6 w-6" />
                ) : selectedGroup.type === "SPECIAL" ? (
                  <Snowflake className="h-6 w-6" />
                ) : (
                  <Box className="h-6 w-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {selectedGroup.name}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {selectedGroup.type}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Location Note: {selectedGroup.note || selectedGroup.description || "Counter Area / Display"}
                </p>
              </div>
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
                <span className="text-emerald-600 block font-semibold">In Supershop</span>
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
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-brand-primary" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Manufacturer / Brand Comparison in this Therapy Group
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
                      <th className="py-2 px-3 font-black text-slate-600 dark:text-slate-300">Company</th>
                      <th className="py-2 px-3 font-black text-slate-600 dark:text-slate-300">Medicines</th>
                      <th className="py-2 px-3 font-black text-emerald-600 text-right">In Shop</th>
                      <th className="py-2 px-3 font-black text-amber-600 text-right">In Godown</th>
                      <th className="py-2 px-3 font-black text-slate-900 dark:text-white text-right">Total Units</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
                    {genericCompanyBreakdown.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                        <td className="py-2 px-3 font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-blue-500" />
                          <span>{row.company}</span>
                        </td>
                        <td className="py-2 px-3 text-slate-500 max-w-xs truncate">
                          {row.products.join(", ")}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                          {row.shopUnits.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-600">
                          {row.godownUnits.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Pill className="h-4 w-4 text-brand-primary" />
                <span>All Medicines in {selectedGroup.name} ({selectedGroupProducts.length})</span>
              </h3>
            </div>

            {selectedGroupProducts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No medicines currently assigned to this storage group.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
                      <th className="py-2.5 px-4 font-black text-slate-600 dark:text-slate-300">Medicine Name</th>
                      <th className="py-2.5 px-3 font-black text-slate-600 dark:text-slate-300">Generic &amp; Company</th>
                      <th className="py-2.5 px-3 font-black text-emerald-600 text-right">In Supershop</th>
                      <th className="py-2.5 px-3 font-black text-amber-600 text-right">In Godown</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 dark:text-white text-right">Total Units</th>
                      <th className="py-2.5 px-4 font-black text-slate-600 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
                    {selectedGroupProducts.map((item) => (
                      <tr key={item.productId} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                        <td className="py-2.5 px-4 font-black text-slate-900 dark:text-white">
                          {item.name}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-700 dark:text-slate-300">{item.genericName}</div>
                          <div className="text-[11px] text-slate-400">{item.manufacturer}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                          {item.shopUnits.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                          {item.godownUnits.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                          {item.totalUnits.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {item.godownUnits > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setMoveProductId(item.product.id);
                                if (item.batches.length > 0) setMoveBatchId(item.batches[0].batch?.id || item.batches[0].id);
                                setMoveTargetGroupId(selectedGroup.id);
                                setViewMode("MOVE_STOCK");
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
                            >
                              + Move from Godown
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-normal">
                              Fully in Shop
                            </span>
                          )}
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
          VIEW 3: FULL-PAGE MOVE STOCK FROM GODOWN TO GROUP (0 POPUPS)
          ═══════════════════════════════════════════════════════════════ */}
      {viewMode === "MOVE_STOCK" && (
        <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode("TABLE")}
              className="inline-flex items-center gap-2 text-xs font-black text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Group List</span>
            </button>
            <span className="text-xs font-black text-brand-primary uppercase tracking-wider">
              Godown &rarr; Supershop Refill
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                <Store className="h-6 w-6 text-emerald-600" />
                Move Stock to Supershop
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Refill medicine from central warehouse bulk into your front store group with zero rack complexity.
              </p>
            </div>

            <form onSubmit={handleMoveStock} className="space-y-6">
              {/* Step 1: Select Batch in Godown */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  1. Choose Medicine &amp; Batch in Godown <span className="text-rose-500">*</span>
                </label>
                <select
                  value={moveBatchId}
                  onChange={(e) => {
                    const bId = e.target.value;
                    setMoveBatchId(bId);
                    const bObj = godownBatches.find((b) => b.id === bId);
                    if (bObj) {
                      setMoveProductId(bObj.productId || bObj.product?.id || "");

                      // Auto-suggest group by Company or Generic
                      const comp = (bObj.product?.manufacturer || bObj.manufacturer || "").toLowerCase();
                      const gen = (bObj.product?.genericName || bObj.genericName || "").toLowerCase();
                      const matched = groups.find((g) => {
                        const gn = (g.name || "").toLowerCase();
                        return (comp && gn.includes(comp)) || (gen && gn.includes(gen));
                      });
                      if (matched) setMoveTargetGroupId(matched.id);
                    }
                  }}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="">-- Choose available batch in warehouse --</option>
                  {godownBatches.map((b) => {
                    const pName = b.product?.name || b.name || "Medicine";
                    const bNum = b.batchNumber || "Default";
                    const exp = b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : "No Exp";
                    return (
                      <option key={b.id} value={b.id}>
                        {pName} (Batch #{bNum} | Exp: {exp}) — Godown: {b.godownQty.toLocaleString()} units
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Step 2: Target Group */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    2. Select Target Storage Group <span className="text-rose-500">*</span>
                  </label>
                  {autoSuggestedGroupInfo && autoSuggestedGroupInfo.groupId === moveTargetGroupId && (
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs animate-in fade-in">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Auto-suggested ({autoSuggestedGroupInfo.reason})</span>
                    </span>
                  )}
                </div>
                <select
                  value={moveTargetGroupId}
                  onChange={(e) => {
                    setMoveTargetGroupId(e.target.value);
                    if (autoSuggestedGroupInfo?.groupId !== e.target.value) {
                      setAutoSuggestedGroupInfo(null);
                    }
                  }}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="">-- Select Group / Zone --</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.type})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Choose a company corner, generic therapy rack, or custom front-store area.
                </p>
              </div>

              {/* Step 3: Quantity & Packaging Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                    3. Quantity to Move <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={moveQuantity}
                    onChange={(e) => setMoveQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                    Unit Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["BOX", "STRIP", "TABLET"] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setMoveUnitType(u)}
                        className={`py-3 rounded-xl border text-xs font-bold transition cursor-pointer text-center ${
                          moveUnitType === u
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setViewMode("TABLE")}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={moveSubmitting || !moveBatchId || !moveTargetGroupId}
                  className="px-6 py-2.5 rounded-xl bg-brand-primary hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-black shadow-md transition cursor-pointer flex items-center gap-2 active:scale-95"
                >
                  {moveSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Allocating Stock...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 stroke-[3]" />
                      <span>Confirm &amp; Move to Supershop</span>
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
