"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import { showAlert } from "@/lib/swal";
import { calculatePackaging } from "@/lib/packaging";
import {
  LayoutGrid,
  ArrowLeft,
  ArrowRight,
  Search,
  Plus,
  Check,
  Sparkles,
  Building2,
  Pill,
  Snowflake,
  Box,
  Layers,
  Archive,
  BarChart3,
  Loader2,
  MoveRight,
  TrendingUp,
  RefreshCw,
  Info,
  CheckCircle2,
  AlertCircle,
  Tag,
  Store,
  Warehouse,
  MapPin,
  Edit2,
  Trash2,
  X,
} from "lucide-react";

export interface StorageGroupHubProps {
  selectedBranchId: string;
  onNavigate?: (module: any) => void;
  preselectedGroupId?: string;
  preselectedProductId?: string;
  preselectedBatchId?: string;
}

export type GroupCategory = "ALL" | "COMPANY" | "GENERIC" | "SPECIAL" | "CUSTOM";

interface StorageGroupPreset {
  id: string;
  name: string;
  category: "COMPANY" | "GENERIC" | "SPECIAL";
  targetKey: string;
  description: string;
  badge: string;
}

const STORAGE_PRESETS: StorageGroupPreset[] = [
  // 🏢 Top Pharma Companies
  { id: "bex", name: "Beximco Group", category: "COMPANY", targetKey: "Beximco", description: "Napa, Napa Extra, Ace, Filmet, Tofen, etc.", badge: "Top Company" },
  { id: "sqr", name: "Square Group", category: "COMPANY", targetKey: "Square", description: "Seclo, Ace Plus, Alatrol, Ciprocin, etc.", badge: "Top Company" },
  { id: "inc", name: "Incepta Group", category: "COMPANY", targetKey: "Incepta", description: "Pantone, Osartil, Filwel Gold, etc.", badge: "Top Company" },
  { id: "ren", name: "Renata Group", category: "COMPANY", targetKey: "Renata", description: "Maxpro, Fexo, Rolac, etc.", badge: "Company" },
  { id: "skf", name: "Eskayef (SK+F) Group", category: "COMPANY", targetKey: "Eskayef", description: "Losectil, Bilastin, Coralcal-D, etc.", badge: "Company" },
  { id: "aci", name: "ACI Healthcare Group", category: "COMPANY", targetKey: "ACI", description: "Oradin, Deflux, Naproxen, etc.", badge: "Company" },
  { id: "ops", name: "Opsonin Group", category: "COMPANY", targetKey: "Opsonin", description: "Finix, De-Rash, Cef-3, etc.", badge: "Company" },
  { id: "ari", name: "Aristopharma Group", category: "COMPANY", targetKey: "Aristopharma", description: "Omep, Lodipin, Aritone, etc.", badge: "Company" },
  { id: "pop", name: "Popular Group", category: "COMPANY", targetKey: "Popular", description: "Progut, Polium, etc.", badge: "Company" },
  { id: "hpl", name: "Healthcare Group", category: "COMPANY", targetKey: "Healthcare", description: "Sergel, Xeldrin, etc.", badge: "Company" },

  // 💊 Generic Therapies
  { id: "gst", name: "Gastric & PPI Group", category: "GENERIC", targetKey: "Gastric", description: "All Omeprazole, Esomeprazole, Rabeprazole, Antacids", badge: "High Demand" },
  { id: "para", name: "Paracetamol Group", category: "GENERIC", targetKey: "Paracetamol", description: "Napa, Ace, Fast, Pyrigesic across all companies", badge: "High Demand" },
  { id: "ant", name: "Antibiotics Group", category: "GENERIC", targetKey: "Antibiotic", description: "Cefixime, Azithromycin, Ciprofloxacin, Amoxicillin", badge: "Controlled" },
  { id: "pain", name: "Pain Relief & NSAIDs", category: "GENERIC", targetKey: "Pain", description: "Aceclofenac, Ketorolac, Naproxen, Ibuprofen", badge: "Everyday" },
  { id: "syr", name: "Syrups & Liquids Zone", category: "GENERIC", targetKey: "Syrup", description: "All cough syrups, paediatric suspensions, tonics", badge: "Liquids" },
  { id: "cvs", name: "Cardiovascular & BP Group", category: "GENERIC", targetKey: "Cardiovascular", description: "Amlodipine, Losartan, Telmisartan, Rosuvastatin", badge: "Chronic" },
  { id: "dia", name: "Diabetes & Insulin Care", category: "GENERIC", targetKey: "Diabetes", description: "Metformin, Gliclazide, Linagliptin, Insulins", badge: "Chronic" },

  // ❄️ Specialized Zones
  { id: "fridge", name: "Cold Storage / Refrigerator (2-8°C)", category: "SPECIAL", targetKey: "Cold", description: "Insulins, Vaccines, Eye Drops, Biologics", badge: "2°C to 8°C" },
  { id: "otc", name: "Fast-Moving Front Counter", category: "SPECIAL", targetKey: "OTC", description: "Quick access emergency & high-volume daily medicines", badge: "Front Desk" },
];

export const autoDetectGroupType = (name: string): "COMPANY" | "GENERIC" | "SPECIAL" | "CUSTOM" => {
  const lower = name.toLowerCase().trim();
  if (
    lower.includes("cold") ||
    lower.includes("fridge") ||
    lower.includes("refrigerator") ||
    lower.includes("freeze") ||
    lower.includes("insulin") ||
    lower.includes("vaccine")
  ) {
    return "SPECIAL";
  }
  if (
    STORAGE_PRESETS.some(
      (p) => p.category === "COMPANY" && (lower.includes(p.targetKey.toLowerCase()) || lower.includes(p.name.toLowerCase()))
    )
  ) {
    return "COMPANY";
  }
  if (
    STORAGE_PRESETS.some(
      (p) => p.category === "GENERIC" && (lower.includes(p.targetKey.toLowerCase()) || lower.includes(p.name.toLowerCase()))
    )
  ) {
    return "GENERIC";
  }
  return "CUSTOM";
};

export function StorageGroupHub({
  selectedBranchId,
  onNavigate,
  preselectedGroupId,
  preselectedProductId,
  preselectedBatchId,
}: StorageGroupHubProps) {
  // Navigation / View state (NO POPUPS)
  const [viewMode, setViewMode] = useState<"OVERVIEW" | "GROUP_DETAIL" | "MOVE_STOCK">(
    preselectedGroupId ? "GROUP_DETAIL" : preselectedProductId || preselectedBatchId ? "MOVE_STOCK" : "OVERVIEW"
  );
  const [activeGroupId, setActiveGroupId] = useState<string>(preselectedGroupId || "");

  // Data state
  const [groups, setGroups] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState<GroupCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Group creation form state (Clean: only Name & Physical Location)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupLocation, setNewGroupLocation] = useState("");
  const [creatingSubmitting, setCreatingSubmitting] = useState(false);

  // Group Edit modal state
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState("");
  const [editingGroupName, setEditingGroupName] = useState("");
  const [editingGroupLocation, setEditingGroupLocation] = useState("");
  const [editingSubmitting, setEditingSubmitting] = useState(false);

  // Move stock form state
  const [moveProductId, setMoveProductId] = useState<string>(preselectedProductId || "");
  const [moveBatchId, setMoveBatchId] = useState<string>(preselectedBatchId || "");
  const [moveTargetGroupId, setMoveTargetGroupId] = useState<string>(preselectedGroupId || "");
  const [moveQuantity, setMoveQuantity] = useState<number>(1);
  const [moveUnitType, setMoveUnitType] = useState<"BOX" | "STRIP" | "TABLET">("BOX");
  const [moveSubmitting, setMoveSubmitting] = useState(false);

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
      console.error("Failed to load Storage Group Hub data", err);
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

    // Initialize all groups in map
    groups.forEach((g) => {
      map.set(g.id, {
        totalUnitsInShop: 0,
        totalUnitsInGodown: 0,
        productCount: 0,
        products: new Map(),
        items: [],
      });
    });

    inventory.forEach((inv) => {
      const totalUnits = Number(inv.quantity) || 0;
      const locations = (inv.locations || []) as any[];

      // Check which groups this inventory is allocated to
      let assignedShopUnits = 0;
      locations.forEach((loc) => {
        const qty = Number(loc.quantity) || 0;
        assignedShopUnits += qty;
        if (loc.rackId && map.has(loc.rackId)) {
          const entry = map.get(loc.rackId)!;
          entry.totalUnitsInShop += qty;
          if (inv.productId) {
            entry.products.set(inv.productId, inv.product || { name: inv.productName, genericName: inv.genericName });
          }
          entry.items.push({
            inventory: inv,
            allocatedUnits: qty,
            locationId: loc.id,
          });
        }
      });

      const unallocatedGodownUnits = Math.max(0, totalUnits - assignedShopUnits);

      // Auto-match godown units to relevant groups based on Company or Generic name
      if (unallocatedGodownUnits > 0) {
        const pCompany = (inv.manufacturer || inv.product?.manufacturer || inv.brandName || "").toLowerCase();
        const pGeneric = (inv.genericName || inv.product?.genericName || "").toLowerCase();

        groups.forEach((g) => {
          const gName = (g.name || "").toLowerCase();
          const isCompanyMatch = pCompany && gName.includes(pCompany);
          const isGenericMatch = pGeneric && gName.includes(pGeneric);

          if (isCompanyMatch || isGenericMatch) {
            const entry = map.get(g.id);
            if (entry) {
              entry.totalUnitsInGodown += unallocatedGodownUnits;
              if (inv.productId && !entry.products.has(inv.productId)) {
                entry.products.set(inv.productId, inv.product || { name: inv.productName, genericName: inv.genericName });
              }
            }
          }
        });
      }
    });

    // Update productCount
    map.forEach((entry) => {
      entry.productCount = entry.products.size;
    });

    return map;
  }, [groups, inventory]);

  // Global KPIs
  const globalKpis = useMemo(() => {
    let totalInShop = 0;
    let totalInGodown = 0;
    let totalShopValue = 0;

    inventory.forEach((inv) => {
      const totalUnits = Number(inv.quantity) || 0;
      const unitPrice = Number(inv.sellingPrice || inv.boxSellingPrice || inv.product?.basePrice || 0);
      const locTotal = (inv.locations || []).reduce((sum: number, l: any) => sum + (Number(l.quantity) || 0), 0);
      totalInShop += locTotal;
      totalInGodown += Math.max(0, totalUnits - locTotal);
      totalShopValue += locTotal * unitPrice;
    });

    return {
      totalGroups: groups.length,
      totalInShop,
      totalInGodown,
      totalShopValue,
    };
  }, [groups, inventory]);

  // Filtered Groups
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (g.name || "").toLowerCase().includes(q) || (g.type || "").toLowerCase().includes(q);

      const typeUpper = (g.type || "CUSTOM").toUpperCase();
      let matchesTab = true;
      if (activeCategoryTab === "COMPANY") matchesTab = typeUpper === "COMPANY";
      else if (activeCategoryTab === "GENERIC") matchesTab = typeUpper === "GENERIC";
      else if (activeCategoryTab === "SPECIAL") matchesTab = typeUpper === "REFRIGERATOR" || typeUpper === "SPECIAL" || (g.name || "").toLowerCase().includes("cold");
      else if (activeCategoryTab === "CUSTOM") matchesTab = typeUpper === "CUSTOM" || typeUpper === "RACK";

      return matchesSearch && matchesTab;
    });
  }, [groups, searchQuery, activeCategoryTab]);

  // Selected Group Object for Detail View
  const selectedGroup = useMemo(() => {
    if (!activeGroupId) return null;
    return groups.find((g) => g.id === activeGroupId) || null;
  }, [groups, activeGroupId]);

  // Products belonging to the selected group
  const selectedGroupProducts = useMemo(() => {
    if (!selectedGroup) return [];
    const groupNameLower = (selectedGroup.name || "").toLowerCase();
    const gType = (selectedGroup.type || "").toUpperCase();

    const productMap = new Map<string, {
      product: any;
      batches: any[];
      shopUnits: number;
      godownUnits: number;
      totalUnits: number;
      manufacturer: string;
      genericName: string;
    }>();

    inventory.forEach((inv) => {
      const pId = inv.productId || inv.id;
      const pName = inv.productName || inv.product?.name || inv.brandName || "Unknown Medicine";
      const pMan = inv.manufacturer || inv.product?.manufacturer || inv.brandName || "Other";
      const pGen = inv.genericName || inv.product?.genericName || "—";

      // Check if product is allocated to this group or matches this group
      const locationsInGroup = (inv.locations || []).filter((l: any) => l.rackId === selectedGroup.id);
      const shopUnitsForGroup = locationsInGroup.reduce((sum: number, l: any) => sum + (Number(l.quantity) || 0), 0);

      const isAllocated = shopUnitsForGroup > 0;
      const isCompanyMatch = pMan && groupNameLower.includes(pMan.toLowerCase());
      const isGenericMatch = pGen && groupNameLower.includes(pGen.toLowerCase());
      const isSpecialMatch = gType === "REFRIGERATOR" && (pGen.toLowerCase().includes("insulin") || pName.toLowerCase().includes("insulin"));

      if (isAllocated || isCompanyMatch || isGenericMatch || isSpecialMatch) {
        const totalAllocatedAll = (inv.locations || []).reduce((sum: number, l: any) => sum + (Number(l.quantity) || 0), 0);
        const godownUnits = Math.max(0, (Number(inv.quantity) || 0) - totalAllocatedAll);

        if (!productMap.has(pId)) {
          productMap.set(pId, {
            product: inv.product || { id: pId, name: pName },
            batches: [],
            shopUnits: 0,
            godownUnits: 0,
            totalUnits: 0,
            manufacturer: pMan,
            genericName: pGen,
          });
        }

        const entry = productMap.get(pId)!;
        entry.shopUnits += shopUnitsForGroup;
        entry.godownUnits += godownUnits;
        entry.totalUnits += shopUnitsForGroup + godownUnits;
        entry.batches.push(inv);
      }
    });

    return Array.from(productMap.values());
  }, [selectedGroup, inventory]);

  // Generic Comparison Breakdown (e.g. For Paracetamol: Beximco vs Square vs Acme)
  const genericCompanyBreakdown = useMemo(() => {
    if (!selectedGroup) return [];
    const map = new Map<string, { company: string; shopUnits: number; godownUnits: number; products: string[] }>();

    selectedGroupProducts.forEach((item) => {
      const comp = item.manufacturer || "Other";
      if (!map.has(comp)) {
        map.set(comp, { company: comp, shopUnits: 0, godownUnits: 0, products: [] });
      }
      const entry = map.get(comp)!;
      entry.shopUnits += item.shopUnits;
      entry.godownUnits += item.godownUnits;
      if (!entry.products.includes(item.product.name)) {
        entry.products.push(item.product.name);
      }
    });

    return Array.from(map.values()).sort((a, b) => (b.shopUnits + b.godownUnits) - (a.shopUnits + a.godownUnits));
  }, [selectedGroup, selectedGroupProducts]);

  // Handle Create Storage Group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      showAlert.error("Required", "Please provide a name for this Storage Group.");
      return;
    }

    try {
      setCreatingSubmitting(true);
      const detectedType = autoDetectGroupType(newGroupName);
      const res = await fetchApi<any>("/locations/quick-rack", {
        method: "POST",
        body: JSON.stringify({
          name: newGroupName.trim(),
          type: detectedType === "SPECIAL" ? "REFRIGERATOR" : detectedType,
          location: newGroupLocation.trim() || undefined,
          numberOfShelves: 0,
          binsPerShelf: 0,
          branchId: selectedBranchId || undefined,
        }),
      });

      if (!res.success && !(res as any)?.id && !(res as any)?.rack) {
        throw new Error(res.message || "Failed to create storage group");
      }

      showAlert.success("Storage Group Created!", `Group "${newGroupName.trim()}" is ready for stock placement.`);
      setNewGroupName("");
      setNewGroupLocation("");
      setIsCreatingGroup(false);
      loadData();
    } catch (err: any) {
      showAlert.error("Creation Failed", err.message || "Failed to create group");
    } finally {
      setCreatingSubmitting(false);
    }
  };

  // Handle Edit Storage Group
  const handleStartEditGroup = (group: any) => {
    setEditingGroupId(group.id);
    setEditingGroupName(group.name || "");
    setEditingGroupLocation(group.location || "");
    setIsEditingModalOpen(true);
  };

  const handleSaveEditGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroupName.trim()) {
      showAlert.error("Required", "Group name cannot be empty.");
      return;
    }

    try {
      setEditingSubmitting(true);
      const detectedType = autoDetectGroupType(editingGroupName);
      const res = await fetchApi<any>(`/locations/racks/${editingGroupId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editingGroupName.trim(),
          type: detectedType === "SPECIAL" ? "REFRIGERATOR" : detectedType,
          location: editingGroupLocation.trim() || null,
        }),
      });

      if (!res.success && !(res as any)?.id && !(res as any)?.data) {
        throw new Error(res.message || "Failed to update storage group");
      }

      showAlert.success("Group Updated!", "Storage group details saved successfully.");
      setIsEditingModalOpen(false);
      loadData();
    } catch (err: any) {
      showAlert.error("Update Failed", err.message || "Failed to update group");
    } finally {
      setEditingSubmitting(false);
    }
  };

  // Handle Delete Storage Group
  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    const isConfirmed = await showAlert.confirm(
      "Delete Storage Group?",
      `Are you sure you want to delete "${groupName}"? Any medicines placed in this group will become unassigned.`
    );
    if (!isConfirmed) return;

    try {
      setLoading(true);
      const res = await fetchApi<any>(`/locations/racks/${groupId}`, {
        method: "DELETE",
      });

      if (res && res.success === false) {
        throw new Error(res.message || "Failed to delete storage group");
      }

      showAlert.success("Deleted!", `Group "${groupName}" was deleted.`);
      if (activeGroupId === groupId) {
        setActiveGroupId("");
        setViewMode("OVERVIEW");
      }
      loadData();
    } catch (err: any) {
      showAlert.error("Delete Failed", err.message || "Could not delete group");
    } finally {
      setLoading(false);
    }
  };

  // Quick 1-Click Preset Group Creation
  const handleApplyPresetGroup = async (preset: StorageGroupPreset) => {
    try {
      setLoading(true);
      const res = await fetchApi<any>("/locations/quick-rack", {
        method: "POST",
        body: JSON.stringify({
          name: preset.name,
          type: preset.category === "SPECIAL" ? "REFRIGERATOR" : preset.category,
          numberOfShelves: 0,
          binsPerShelf: 0,
          branchId: selectedBranchId || undefined,
        }),
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to create preset group");
      }

      showAlert.success("Preset Created!", `Storage Group "${preset.name}" created successfully.`);
      loadData();
    } catch (err: any) {
      showAlert.error("Error", err.message || "Failed to apply preset");
    } finally {
      setLoading(false);
    }
  };

  // Handle Move Stock from Godown to Group
  const handleMoveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveBatchId) {
      showAlert.error("Select Batch", "Please choose a batch from Godown.");
      return;
    }
    if (!moveTargetGroupId) {
      showAlert.error("Select Group", "Please select a destination Storage Group.");
      return;
    }

    const matchInv = inventory.find((i) => i.id === moveBatchId);
    if (!matchInv) return;

    const stripsPerBox = Number(matchInv.stripsPerBox || matchInv.product?.stripsPerBox) || 10;
    const tabletsPerStrip = Number(matchInv.tabletsPerStrip || matchInv.product?.tabletsPerStrip) || 10;
    const tabletsPerBox = stripsPerBox * tabletsPerStrip;

    let unitsToMove = moveQuantity;
    if (moveUnitType === "BOX") unitsToMove = moveQuantity * tabletsPerBox;
    else if (moveUnitType === "STRIP") unitsToMove = moveQuantity * tabletsPerStrip;

    try {
      setMoveSubmitting(true);
      const res = await fetchApi<any>("/inventory/allocate", {
        method: "POST",
        body: JSON.stringify({
          inventoryId: moveBatchId,
          rackId: moveTargetGroupId,
          shelfId: null,
          binId: null,
          quantity: unitsToMove,
          allocationSource: "AUTO",
          packagingUnit: moveUnitType,
        }),
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to move stock to shop group");
      }

      showAlert.success("Stock Moved to Shop!", `Successfully placed ${moveQuantity} ${moveUnitType}s into group.`);
      loadData();
      setViewMode("GROUP_DETAIL");
      setActiveGroupId(moveTargetGroupId);
    } catch (err: any) {
      showAlert.error("Move Failed", err.message || "Failed to move stock");
    } finally {
      setMoveSubmitting(false);
    }
  };

  // Products with Godown Stock for Movement Picker
  const godownAvailableBatches = useMemo(() => {
    return inventory.filter((inv) => {
      const locTotal = (inv.locations || []).reduce((sum: number, l: any) => sum + (Number(l.quantity) || 0), 0);
      return (Number(inv.quantity) || 0) - locTotal > 0;
    });
  }, [inventory]);

  return (
    <div className="space-y-6 pb-16">
      {/* ═══════════════════════════════════════════════════════════════
          VIEW 1: MASTER STORAGE GROUPS OVERVIEW
          ═══════════════════════════════════════════════════════════════ */}
      {viewMode === "OVERVIEW" && (
        <div className="space-y-6">
          {/* Top Title Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
                <span>Pharmacy Layout</span>
                <span>/</span>
                <span className="text-brand-primary font-bold">Storage Groups & Zones</span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
                <LayoutGrid className="h-8 w-8 text-brand-primary" />
                Storage Groups Hub
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Logical pharmacy grouping: manage medicines company-wise, generic-wise, or zone-wise with zero shelf complexity.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => setIsCreatingGroup(!isCreatingGroup)}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white text-sm font-black transition shadow-sm cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Create Group</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("MOVE_STOCK")}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black transition shadow-sm cursor-pointer"
              >
                <MoveRight className="h-4 w-4" />
                <span>Move Stock from Godown</span>
              </button>

              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="h-11 w-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Refresh Groups"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-black uppercase tracking-wider">Active Groups</span>
                <LayoutGrid className="h-5 w-5 text-brand-primary" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {globalKpis.totalGroups}
              </div>
              <div className="text-xs text-slate-500 mt-1">Company & Generic Zones</div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-black uppercase tracking-wider">In Shop</span>
                <Store className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {globalKpis.totalInShop.toLocaleString()} <span className="text-sm font-medium">units</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">Ready on shop counters</div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-black uppercase tracking-wider">In Godown</span>
                <Warehouse className="h-5 w-5 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {globalKpis.totalInGodown.toLocaleString()} <span className="text-sm font-medium">units</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">Bulk warehouse stock</div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-black uppercase tracking-wider">Shop Value</span>
                <TrendingUp className="h-5 w-5 text-indigo-500" />
              </div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                ৳{Math.round(globalKpis.totalShopValue).toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">Front counter inventory value</div>
            </div>
          </div>

          {/* Quick Create Group Collapsible Form */}
          {isCreatingGroup && (
            <div className="bg-white dark:bg-slate-900 border-2 border-brand-primary/40 rounded-2xl p-6 shadow-md animate-in fade-in duration-200 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                    <Plus className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    New Storage Group
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreatingGroup(false)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                      Group Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Enter group name"
                      required
                      className="w-full h-11 text-sm font-semibold px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-xs placeholder:font-normal placeholder:text-slate-400 focus:border-brand-primary outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                      Physical Location <span className="text-slate-400 font-normal lowercase">(optional)</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={newGroupLocation}
                        onChange={(e) => setNewGroupLocation(e.target.value)}
                        placeholder="Enter location (e.g. Rack 04, Shelf 2, Fridge)"
                        className="w-full h-11 text-sm font-semibold pl-9 pr-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-xs placeholder:font-normal placeholder:text-slate-400 focus:border-brand-primary outline-none transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={creatingSubmitting}
                    className="h-11 px-6 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-black transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {creatingSubmitting ? "Creating..." : "Save Group"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 1-Click Fast Presets Strip */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-500" />
                1-Click Quick Preset Groups (Click to add):
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 content-scrollbar">
              {STORAGE_PRESETS.map((preset) => {
                const alreadyExists = groups.some((g) => (g.name || "").toLowerCase().includes(preset.targetKey.toLowerCase()));
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPresetGroup(preset)}
                    disabled={alreadyExists || loading}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      alreadyExists
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-primary hover:text-brand-primary shadow-2xs"
                    }`}
                  >
                    {preset.category === "COMPANY" ? (
                      <Building2 className="h-3.5 w-3.5 text-blue-500" />
                    ) : preset.category === "SPECIAL" ? (
                      <Snowflake className="h-3.5 w-3.5 text-sky-500" />
                    ) : (
                      <Pill className="h-3.5 w-3.5 text-purple-500" />
                    )}
                    <span>{preset.name}</span>
                    {alreadyExists && <Check className="h-3 w-3 text-emerald-500" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search & Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveCategoryTab("ALL")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  activeCategoryTab === "ALL"
                    ? "bg-brand-primary text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                All Groups ({groups.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveCategoryTab("COMPANY")}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                  activeCategoryTab === "COMPANY"
                    ? "bg-brand-primary text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>Company</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCategoryTab("GENERIC")}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                  activeCategoryTab === "GENERIC"
                    ? "bg-brand-primary text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Pill className="h-3.5 w-3.5" />
                <span>Generic</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCategoryTab("SPECIAL")}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                  activeCategoryTab === "SPECIAL"
                    ? "bg-brand-primary text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Snowflake className="h-3.5 w-3.5" />
                <span>Cold / Special</span>
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search storage groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 h-10 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          {/* Groups Cards Grid */}
          {filteredGroups.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
              <LayoutGrid className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                No Storage Groups Found
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Create your first company group (e.g. Beximco, Square) or generic group (e.g. Paracetamol) above to start organizing your shop.
              </p>
              <button
                type="button"
                onClick={() => setIsCreatingGroup(true)}
                className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold"
              >
                + Create First Group
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGroups.map((group) => {
                const metrics = groupMetricsMap.get(group.id) || {
                  totalUnitsInShop: 0,
                  totalUnitsInGodown: 0,
                  productCount: 0,
                };
                const isCold = (group.type || "").toUpperCase() === "REFRIGERATOR" || (group.name || "").toLowerCase().includes("cold");
                const isCompany = (group.type || "").toUpperCase() === "COMPANY" || STORAGE_PRESETS.some((p) => p.category === "COMPANY" && group.name.includes(p.targetKey));

                return (
                  <div
                    key={group.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200/80 dark:border-slate-800 hover:border-brand-primary/50 transition shadow-xs flex flex-col justify-between gap-4 group"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isCold
                                ? "bg-sky-100 text-sky-600 dark:bg-sky-950/80 dark:text-sky-300"
                                : isCompany
                                ? "bg-blue-100 text-blue-600 dark:bg-blue-950/80 dark:text-blue-300"
                                : "bg-purple-100 text-purple-600 dark:bg-purple-950/80 dark:text-purple-300"
                            }`}
                          >
                            {isCold ? (
                              <Snowflake className="h-5 w-5" />
                            ) : isCompany ? (
                              <Building2 className="h-5 w-5" />
                            ) : (
                              <Pill className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white group-hover:text-brand-primary transition">
                              {group.name}
                            </h3>
                            <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                              {isCold ? "Cold Chain (2-8°C)" : isCompany ? "Company Group" : "Generic Group"}
                            </span>
                          </div>
                        </div>

                        {/* Edit & Delete Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditGroup(group);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Edit Group & Location"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGroup(group.id, group.name);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                            title="Delete Group"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Prominent Physical Location Tag */}
                      {group.location ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60 mt-1 w-fit">
                          <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                          <span className="truncate">{group.location}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mt-1">
                          <MapPin className="h-3 w-3 opacity-40 shrink-0" />
                          <span>No location set</span>
                        </div>
                      )}

                      {/* Stock Distribution Bar */}
                      <div className="space-y-1.5 mt-4">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                            <Store className="h-3 w-3" />
                            Shop: {metrics.totalUnitsInShop.toLocaleString()}
                          </span>
                          <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1">
                            <Warehouse className="h-3 w-3" />
                            Godown: {metrics.totalUnitsInGodown.toLocaleString()}
                          </span>
                        </div>

                        {/* Dual-color bar */}
                        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                          <div
                            className="bg-emerald-500 h-full transition-all duration-300"
                            style={{
                              width: `${
                                metrics.totalUnitsInShop + metrics.totalUnitsInGodown > 0
                                  ? (metrics.totalUnitsInShop / (metrics.totalUnitsInShop + metrics.totalUnitsInGodown)) * 100
                                  : 0
                              }%`,
                            }}
                            title={`In Shop: ${metrics.totalUnitsInShop}`}
                          />
                          <div
                            className="bg-amber-400 h-full transition-all duration-300"
                            style={{
                              width: `${
                                metrics.totalUnitsInShop + metrics.totalUnitsInGodown > 0
                                  ? (metrics.totalUnitsInGodown / (metrics.totalUnitsInShop + metrics.totalUnitsInGodown)) * 100
                                  : 0
                              }%`,
                            }}
                            title={`In Godown: ${metrics.totalUnitsInGodown}`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-500">
                        {metrics.productCount} product{metrics.productCount !== 1 ? "s" : ""}
                      </span>

                      <div className="flex items-center gap-2">


                        <button
                          type="button"
                          onClick={() => {
                            setActiveGroupId(group.id);
                            setViewMode("GROUP_DETAIL");
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-black text-brand-primary bg-brand-primary/10 hover:bg-brand-primary hover:text-white transition cursor-pointer flex items-center gap-1"
                        >
                          <span>Details</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          VIEW 2: GROUP DEEP-DIVE DETAIL VIEW (FULL PAGE, NO POPUP)
          ═══════════════════════════════════════════════════════════════ */}
      {viewMode === "GROUP_DETAIL" && selectedGroup && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Navigation */}
          <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode("OVERVIEW")}
              className="inline-flex items-center gap-2 text-xs font-black text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Storage Groups Hub</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMoveTargetGroupId(selectedGroup.id);
                setViewMode("MOVE_STOCK");
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition cursor-pointer"
            >
              <MoveRight className="h-4 w-4" />
              <span>Move More Stock into this Group</span>
            </button>
          </div>

          {/* Group Profile Header */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                <LayoutGrid className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                    {selectedGroup.name}
                  </h1>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary font-black uppercase tracking-wider">
                    {selectedGroup.type || "GROUP"}
                  </span>
                </div>
                
                <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                    <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                    <span>Location: {selectedGroup.location || "Not assigned"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStartEditGroup(selectedGroup)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-primary hover:underline cursor-pointer"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Change Location</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-6">
              <div>
                <span className="text-xs text-slate-400 block font-bold">Total Products</span>
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {selectedGroupProducts.length}
                </span>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
              <div>
                <span className="text-xs text-slate-400 block font-bold">In Shop</span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {selectedGroupProducts.reduce((sum, p) => sum + p.shopUnits, 0).toLocaleString()}
                </span>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
              <div>
                <span className="text-xs text-slate-400 block font-bold">In Godown</span>
                <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                  {selectedGroupProducts.reduce((sum, p) => sum + p.godownUnits, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* If Generic Group (e.g. Paracetamol): Show Company-wise breakdown table! */}
          {genericCompanyBreakdown.length > 1 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-brand-primary" />
                Company-Wise Brand Breakdown in this Group
              </h3>
              <p className="text-xs text-slate-400">
                Comparison of different pharmaceutical manufacturers under this generic therapy:
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
                      <th className="py-2.5 px-3 font-black text-slate-600 dark:text-slate-300">Company / Brand</th>
                      <th className="py-2.5 px-3 font-black text-slate-600 dark:text-slate-300">Medicines</th>
                      <th className="py-2.5 px-3 font-black text-emerald-600 text-right">In Shop</th>
                      <th className="py-2.5 px-3 font-black text-amber-600 text-right">In Godown</th>
                      <th className="py-2.5 px-3 font-black text-slate-900 dark:text-white text-right">Total Available</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
                    {genericCompanyBreakdown.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-850/50">
                        <td className="py-2.5 px-3 font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-blue-500" />
                          <span>{row.company}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                          {row.products.join(", ")}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                          {row.shopUnits.toLocaleString()} units
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600">
                          {row.godownUnits.toLocaleString()} units
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                          {(row.shopUnits + row.godownUnits).toLocaleString()} units
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Products List in this Group */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Pill className="h-4 w-4 text-brand-primary" />
                All Medicines in {selectedGroup.name} ({selectedGroupProducts.length})
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
                      <th className="py-3 px-4 font-black text-slate-600 dark:text-slate-300">Medicine Name</th>
                      <th className="py-3 px-3 font-black text-slate-600 dark:text-slate-300">Generic & Company</th>
                      <th className="py-3 px-3 font-black text-emerald-600 text-right">In Shop</th>
                      <th className="py-3 px-3 font-black text-amber-600 text-right">In Godown</th>
                      <th className="py-3 px-3 font-black text-slate-900 dark:text-white text-right">Total Units</th>
                      <th className="py-3 px-4 font-black text-slate-600 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
                    {selectedGroupProducts.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition">
                        <td className="py-3 px-4 font-black text-slate-900 dark:text-white text-sm">
                          {item.product.name}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-700 dark:text-slate-300">{item.genericName}</div>
                          <div className="text-[11px] text-slate-400">{item.manufacturer}</div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          {item.shopUnits.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                          {item.godownUnits.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-slate-900 dark:text-white text-sm">
                          {item.totalUnits.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.godownUnits > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setMoveProductId(item.product.id);
                                if (item.batches.length > 0) setMoveBatchId(item.batches[0].id);
                                setMoveTargetGroupId(selectedGroup.id);
                                setViewMode("MOVE_STOCK");
                              }}
                              className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 cursor-pointer"
                            >
                              Move from Godown &rarr;
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
          VIEW 3: MOVE STOCK FROM GODOWN TO SUPERSHOP GROUP (FULL PAGE)
          ═══════════════════════════════════════════════════════════════ */}
      {viewMode === "MOVE_STOCK" && (
        <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode("OVERVIEW")}
              className="inline-flex items-center gap-2 text-xs font-black text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Storage Groups Hub</span>
            </button>
            <span className="text-xs font-black text-brand-primary uppercase tracking-wider">
              Godown &rarr; Shop Transfer
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                <Store className="h-7 w-7 text-emerald-600" />
                Move Stock from Godown to Shop
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Refill medicine from central warehouse bulk into your front store group with zero rack complexity.
              </p>
            </div>

            <form onSubmit={handleMoveStock} className="space-y-6">
              {/* Step 1: Select Batch in Godown */}
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                  1. Choose Medicine & Batch in Godown <span className="text-rose-500">*</span>
                </label>
                <select
                  value={moveBatchId}
                  onChange={(e) => {
                    const bId = e.target.value;
                    setMoveBatchId(bId);
                    const match = inventory.find((i) => i.id === bId);
                    if (match) {
                      setMoveProductId(match.productId);
                      // Auto recommend matching group based on company or generic!
                      const comp = (match.manufacturer || match.product?.manufacturer || "").toLowerCase();
                      const gen = (match.genericName || match.product?.genericName || "").toLowerCase();
                      const autoGroup = groups.find((g) => {
                        const gName = (g.name || "").toLowerCase();
                        return (comp && gName.includes(comp)) || (gen && gName.includes(gen));
                      });
                      if (autoGroup && !moveTargetGroupId) {
                        setMoveTargetGroupId(autoGroup.id);
                      }
                    }
                  }}
                  required
                  className="w-full h-12 text-sm font-semibold px-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-brand-primary outline-none cursor-pointer"
                >
                  <option value="">-- Select Medicine with Available Godown Stock --</option>
                  {godownAvailableBatches.map((inv) => {
                    const locTotal = (inv.locations || []).reduce((sum: number, l: any) => sum + (Number(l.quantity) || 0), 0);
                    const unallocated = (Number(inv.quantity) || 0) - locTotal;
                    const pName = inv.productName || inv.product?.name || "Medicine";
                    const bNum = inv.batchNumber || "Default";
                    return (
                      <option key={inv.id} value={inv.id}>
                        {pName} • Batch: {bNum} ({unallocated.toLocaleString()} units available in Godown)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Step 2: Select Target Storage Group */}
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                  2. Destination Storage Group in Shop <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {groups.map((g) => {
                    const isSelected = moveTargetGroupId === g.id;
                    const isCold = (g.type || "").toUpperCase() === "REFRIGERATOR";

                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setMoveTargetGroupId(g.id)}
                        className={`p-3 rounded-xl border-2 text-left transition flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 shadow-xs"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isCold ? (
                            <Snowflake className="h-4 w-4 text-sky-500 shrink-0" />
                          ) : (
                            <LayoutGrid className="h-4 w-4 text-slate-400 shrink-0" />
                          )}
                          <span className="text-xs font-black truncate">{g.name}</span>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-emerald-600 shrink-0 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Quantity & Packaging Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                    3. Quantity to Move
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={moveQuantity}
                    onChange={(e) => setMoveQuantity(parseInt(e.target.value, 10) || 1)}
                    required
                    className="w-full h-12 text-base font-black px-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-brand-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                    Packaging Unit
                  </label>
                  <select
                    value={moveUnitType}
                    onChange={(e) => setMoveUnitType(e.target.value as any)}
                    className="w-full h-12 text-sm font-bold px-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-brand-primary outline-none cursor-pointer"
                  >
                    <option value="BOX">Box</option>
                    <option value="STRIP">Strip</option>
                    <option value="TABLET">Tablet / Piece</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={moveSubmitting || !moveBatchId || !moveTargetGroupId}
                  className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-base font-black flex items-center justify-center gap-2 transition shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                >
                  {moveSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Moving to Shop...</span>
                    </>
                  ) : (
                    <>
                      <Store className="h-5 w-5" />
                      <span>Move Stock into Shop Group</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          EDIT GROUP & LOCATION MODAL
          ═══════════════════════════════════════════════════════════════ */}
      {isEditingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                  <Edit2 className="h-4 w-4" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Edit Storage Group
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditGroup} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Group Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingGroupName}
                  onChange={(e) => setEditingGroupName(e.target.value)}
                  required
                  placeholder="Enter group name"
                  className="w-full h-11 text-sm font-semibold px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-xs placeholder:font-normal placeholder:text-slate-400 focus:border-brand-primary outline-none transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Physical Location <span className="text-slate-400 font-normal lowercase">(optional)</span>
                  </label>
                  {editingGroupLocation && (
                    <button
                      type="button"
                      onClick={() => setEditingGroupLocation("")}
                      className="text-xs font-semibold text-rose-500 hover:underline cursor-pointer"
                    >
                      Clear location
                    </button>
                  )}
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={editingGroupLocation}
                    onChange={(e) => setEditingGroupLocation(e.target.value)}
                    placeholder="Enter location (e.g. Rack 04, Shelf 2, Fridge)"
                    className="w-full h-11 text-sm font-semibold pl-9 pr-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-xs placeholder:font-normal placeholder:text-slate-400 focus:border-brand-primary outline-none transition"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditingModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editingSubmitting || !editingGroupName.trim()}
                  className="px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-black transition cursor-pointer disabled:opacity-50"
                >
                  {editingSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
