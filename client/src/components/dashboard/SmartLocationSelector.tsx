"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  MapPin,
  Search,
  X,
  ChevronRight,
  Snowflake,
  Layers,
  Box,
  Check,
  RotateCcw,
  Sparkles,
  Info,
} from "lucide-react";

export interface SmartLocationSelectorProps {
  racks: any[];
  selectedRackId: string;
  selectedShelfId: string;
  selectedBinId: string;
  onSelect: (rackId: string, shelfId: string, binId: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

/**
 * Detect if a rack/location is a refrigerator, cold room, or temperature-controlled unit
 */
export function isRefrigeratorOrColdUnit(rack: any): boolean {
  if (!rack) return false;
  const type = (rack.type || "").toUpperCase();
  const name = (rack.name || "").toLowerCase();
  return (
    type === "REFRIGERATOR" ||
    type === "COLD_STORAGE" ||
    type === "FREEZER" ||
    name.includes("refrigerator") ||
    name.includes("fridge") ||
    name.includes("cold") ||
    name.includes("freeze") ||
    name.includes("chiller") ||
    name.includes("deep") ||
    name.includes("refri")
  );
}

export function SmartLocationSelector({
  racks,
  selectedRackId,
  selectedShelfId,
  selectedBinId,
  onSelect,
  label = "Destination Location",
  required = true,
  disabled = false,
  compact = false,
}: SmartLocationSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<"ALL" | "RACKS" | "COLD" | "OTHER">("ALL");
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close search suggestions on click outside
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

  // Currently selected objects
  const selectedRack = useMemo(() => {
    return racks.find((r) => r.id === selectedRackId) || null;
  }, [racks, selectedRackId]);

  const availableShelves = useMemo(() => {
    return selectedRack?.shelves || [];
  }, [selectedRack]);

  const selectedShelf = useMemo(() => {
    return availableShelves.find((s: any) => s.id === selectedShelfId) || null;
  }, [availableShelves, selectedShelfId]);

  const availableBins = useMemo(() => {
    return selectedShelf?.bins || [];
  }, [selectedShelf]);

  const selectedBin = useMemo(() => {
    return availableBins.find((b: any) => b.id === selectedBinId) || null;
  }, [availableBins, selectedBinId]);

  const isSelectedCold = useMemo(() => {
    return isRefrigeratorOrColdUnit(selectedRack);
  }, [selectedRack]);

  // Flattened searchable entries for instant search
  const searchableOptions = useMemo(() => {
    const list: Array<{
      id: string;
      rackId: string;
      shelfId: string;
      binId: string;
      title: string;
      breadcrumb: string;
      category: "COLD" | "RACK" | "SHELF" | "BIN" | "CUSTOM";
      isDirect: boolean;
      shelfCount?: number;
      binCount?: number;
    }> = [];

    racks.forEach((rack) => {
      const isCold = isRefrigeratorOrColdUnit(rack);
      const shelves = rack.shelves || [];

      // 1. The Rack / Unit itself
      if (shelves.length === 0) {
        list.push({
          id: `rack-${rack.id}`,
          rackId: rack.id,
          shelfId: "",
          binId: "",
          title: rack.name,
          breadcrumb: isCold
            ? `❄️ ${rack.name} (Direct Unit)`
            : `📍 ${rack.name} (Direct Unit)`,
          category: isCold ? "COLD" : "CUSTOM",
          isDirect: true,
        });
      } else {
        list.push({
          id: `rack-${rack.id}`,
          rackId: rack.id,
          shelfId: "",
          binId: "",
          title: rack.name,
          breadcrumb: isCold ? `❄️ ${rack.name}` : `🗄️ ${rack.name}`,
          category: isCold ? "COLD" : "RACK",
          isDirect: false,
          shelfCount: shelves.length,
        });

        // 2. Shelves within this rack
        shelves.forEach((shelf: any) => {
          const bins = shelf.bins || [];
          list.push({
            id: `shelf-${shelf.id}`,
            rackId: rack.id,
            shelfId: shelf.id,
            binId: "",
            title: `${rack.name} → ${shelf.name}`,
            breadcrumb: `${rack.name}  ›  ${shelf.name}`,
            category: "SHELF",
            isDirect: bins.length === 0,
            binCount: bins.length,
          });

          // 3. Bins within this shelf
          bins.forEach((bin: any) => {
            list.push({
              id: `bin-${bin.id}`,
              rackId: rack.id,
              shelfId: shelf.id,
              binId: bin.id,
              title: `${rack.name} → ${shelf.name} → ${bin.name}`,
              breadcrumb: `${rack.name}  ›  ${shelf.name}  ›  ${bin.name}`,
              category: "BIN",
              isDirect: false,
            });
          });
        });
      }
    });

    return list;
  }, [racks]);

  // Filtered search results
  const filteredSearchOptions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return searchableOptions
      .filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.breadcrumb.toLowerCase().includes(q)
      )
      .slice(0, 15);
  }, [searchableOptions, searchQuery]);

  // Filtered racks for browsing tabs
  const filteredRacks = useMemo(() => {
    return racks.filter((rack) => {
      const isCold = isRefrigeratorOrColdUnit(rack);
      if (activeFilterTab === "COLD") return isCold;
      if (activeFilterTab === "RACKS") return !isCold && (rack.shelves?.length ?? 0) > 0;
      if (activeFilterTab === "OTHER") return !isCold && (rack.shelves?.length ?? 0) === 0;
      return true;
    });
  }, [racks, activeFilterTab]);

  // Counts for tabs
  const tabCounts = useMemo(() => {
    let cold = 0;
    let standardRacks = 0;
    let others = 0;
    racks.forEach((r) => {
      if (isRefrigeratorOrColdUnit(r)) cold++;
      else if ((r.shelves?.length ?? 0) > 0) standardRacks++;
      else others++;
    });
    return { all: racks.length, cold, standardRacks, others };
  }, [racks]);

  // Handle direct item selection from search
  const handleSelectSearchItem = (item: (typeof searchableOptions)[0]) => {
    onSelect(item.rackId, item.shelfId, item.binId);
    setSearchQuery("");
    setIsSearchOpen(false);
  };

  // Handle selecting a rack
  const handleSelectRack = (rack: any) => {
    // If the rack has NO shelves (like Refrigerator or Direct Table), shelf & bin are empty
    onSelect(rack.id, "", "");
  };

  // Handle selecting a shelf
  const handleSelectShelf = (shelf: any) => {
    onSelect(selectedRackId, shelf.id, "");
  };

  // Handle selecting a bin
  const handleSelectBin = (binId: string) => {
    onSelect(selectedRackId, selectedShelfId, binId);
  };

  // Clear / Reset selection
  const handleReset = () => {
    onSelect("", "", "");
    setSearchQuery("");
  };

  // Formatted display of selected location
  const formattedSelectedPath = useMemo(() => {
    if (!selectedRack) return null;
    let path = selectedRack.name;
    if (selectedShelf) {
      path += `  ›  ${selectedShelf.name}`;
      if (selectedBin) {
        path += `  ›  ${selectedBin.name}`;
      }
    } else if (availableShelves.length === 0) {
      path += ` (Direct Placement)`;
    }
    return path;
  }, [selectedRack, selectedShelf, selectedBin, availableShelves]);

  return (
    <div className={`space-y-4 ${disabled ? "opacity-60 pointer-events-none" : ""}`}>
      {/* Header with Label and Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-brand-primary" />
          <span>{label}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>

        {selectedRack && (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                isSelectedCold
                  ? "bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-300 dark:border-sky-800"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
              }`}
            >
              {isSelectedCold ? (
                <Snowflake className="h-3.5 w-3.5 animate-pulse text-sky-500" />
              ) : (
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              )}
              <span>{formattedSelectedPath}</span>
            </span>

            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Change</span>
            </button>
          </div>
        )}
      </div>

      {/* Prominent Search Bar for All Locations */}
      <div ref={searchContainerRef} className="relative z-20">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Type to search (e.g., 'Refrigerator', 'Rack 1', 'Shelf 2', 'Bin A')..."
            value={searchQuery}
            onFocus={() => setIsSearchOpen(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            className="w-full pl-10 pr-10 h-11 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 focus:border-brand-primary dark:focus:border-brand-primary rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 shadow-xs outline-none transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                searchInputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {isSearchOpen && searchQuery.trim().length > 0 && (
          <div className="absolute left-0 right-0 mt-1.5 max-h-72 overflow-y-auto bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-30 divide-y divide-slate-100 dark:divide-slate-800">
            {filteredSearchOptions.length === 0 ? (
              <div className="p-4 text-center text-xs font-semibold text-slate-400">
                No location matching &quot;{searchQuery}&quot; found.
              </div>
            ) : (
              filteredSearchOptions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectSearchItem(item)}
                  className="w-full text-left px-4 py-3 hover:bg-brand-primary/5 dark:hover:bg-brand-primary/10 transition flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                        item.category === "COLD"
                          ? "bg-sky-100 text-sky-600 dark:bg-sky-950/80 dark:text-sky-400"
                          : item.category === "SHELF"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-400"
                          : item.category === "BIN"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-400"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {item.category === "COLD" ? (
                        <Snowflake className="h-4 w-4" />
                      ) : item.category === "SHELF" ? (
                        <Layers className="h-4 w-4" />
                      ) : item.category === "BIN" ? (
                        <Box className="h-4 w-4" />
                      ) : (
                        <MapPin className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-brand-primary transition">
                        {item.breadcrumb}
                      </div>
                      <div className="text-xs text-slate-400">
                        {item.category === "COLD"
                          ? "❄️ Temperature Controlled (Direct Unit)"
                          : item.isDirect
                          ? "Direct Storage Unit (No Shelves)"
                          : item.category === "SHELF"
                          ? `Shelf (${item.binCount || 0} bins)`
                          : item.category === "BIN"
                          ? "Specific Bin Compartment"
                          : `Rack (${item.shelfCount || 0} shelves)`}
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-brand-primary group-hover:text-white transition">
                    Select
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Visual Dynamic Browser & Step Hierarchy */}
      <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-5">
        {/* Step 1: Location / Storage Unit */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-black">
                1
              </span>
              Select Rack or Storage Unit:
            </span>

            {/* Quick Filter Tabs */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto text-xs">
              <button
                type="button"
                onClick={() => setActiveFilterTab("ALL")}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  activeFilterTab === "ALL"
                    ? "bg-brand-primary text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                All ({tabCounts.all})
              </button>
              {tabCounts.cold > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveFilterTab("COLD")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                    activeFilterTab === "COLD"
                      ? "bg-sky-600 text-white shadow-xs"
                      : "text-sky-700 dark:text-sky-400 hover:text-sky-900"
                  }`}
                >
                  <Snowflake className="h-3 w-3" />
                  <span>Cold/Fridge ({tabCounts.cold})</span>
                </button>
              )}
              {tabCounts.standardRacks > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveFilterTab("RACKS")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    activeFilterTab === "RACKS"
                      ? "bg-brand-primary text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  Racks ({tabCounts.standardRacks})
                </button>
              )}
            </div>
          </div>

          {/* Racks Grid / Badges */}
          {filteredRacks.length === 0 ? (
            <div className="p-4 text-center text-xs font-semibold text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              No storage locations found in this category.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {filteredRacks.map((r) => {
                const isSelected = r.id === selectedRackId;
                const isCold = isRefrigeratorOrColdUnit(r);
                const shelfCount = r.shelves?.length ?? 0;

                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelectRack(r)}
                    className={`p-3 rounded-xl border-2 text-left transition flex flex-col justify-between gap-1.5 cursor-pointer relative ${
                      isSelected
                        ? isCold
                          ? "border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-950 dark:text-sky-100 shadow-xs"
                          : "border-brand-primary bg-brand-primary/5 dark:bg-brand-primary/10 text-brand-primary shadow-xs"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 truncate">
                        {isCold ? (
                          <Snowflake className="h-4 w-4 text-sky-500 shrink-0" />
                        ) : (
                          <Layers className="h-4 w-4 text-slate-400 shrink-0" />
                        )}
                        <span className="text-sm font-black truncate">{r.name}</span>
                      </div>
                      {isSelected && (
                        <div className="h-4 w-4 rounded-full bg-brand-primary text-white flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                      {shelfCount === 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-bold">
                          Direct (No Shelves)
                        </span>
                      ) : (
                        <span>
                          {shelfCount} shelf{shelfCount !== 1 ? "ves" : ""}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════
            STEP 2: SMART HIERARCHY ADAPTATION
            - If Rack has NO shelves (e.g. Refrigerator, Direct Unit) -> Show Confirmation Banner, HIDE Shelf & Bin!
            - If Rack has shelves -> Show Shelf Selector!
            ══════════════════════════════════════════════════════════ */}
        {selectedRack && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 animate-in fade-in duration-200">
            {availableShelves.length === 0 ? (
              // CASE A: NO SHELVES (Refrigerator, Cold Storage, or Flat Unit)
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isSelectedCold
                    ? "bg-sky-50/80 dark:bg-sky-950/30 border-sky-200 dark:border-sky-900/60 text-sky-900 dark:text-sky-200"
                    : "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelectedCold
                        ? "bg-sky-500 text-white"
                        : "bg-emerald-600 text-white"
                    }`}
                  >
                    {isSelectedCold ? (
                      <Snowflake className="h-5 w-5" />
                    ) : (
                      <Check className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-black flex items-center gap-2">
                      <span>Direct Unit Placement: {selectedRack.name}</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/70 dark:bg-slate-800 border border-current">
                        No Shelves Needed
                      </span>
                    </h4>
                    <p className="text-xs opacity-80 mt-0.5">
                      This storage unit does not require any shelf or bin selection.
                      Stock will be assigned directly to &quot;{selectedRack.name}&quot;.
                    </p>
                  </div>
                </div>

                <div className="self-end sm:self-auto shrink-0">
                  <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <Check className="h-4 w-4" />
                    Ready to Allocate
                  </span>
                </div>
              </div>
            ) : (
              // CASE B: RACK HAS SHELVES -> PROMPT FOR SHELF SELECTION
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <span className="h-5 w-5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center text-xs font-black">
                        2
                      </span>
                      Select Shelf / Section in &quot;{selectedRack.name}&quot;:
                      <span className="text-rose-500">*</span>
                    </span>

                    {selectedShelf && (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" />
                        <span>Shelf: {selectedShelf.name}</span>
                      </span>
                    )}
                  </div>

                  {/* Shelf Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {availableShelves.map((shelf: any) => {
                      const isShelfSelected = shelf.id === selectedShelfId;
                      const binCount = shelf.bins?.length ?? 0;

                      return (
                        <button
                          key={shelf.id}
                          type="button"
                          onClick={() => handleSelectShelf(shelf)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition flex items-center gap-2 cursor-pointer ${
                            isShelfSelected
                              ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 shadow-xs"
                              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <Layers className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span>{shelf.name}</span>
                          {binCount > 0 && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({binCount} bins)
                            </span>
                          )}
                          {isShelfSelected && (
                            <Check className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 stroke-[3]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* STEP 3: BIN SELECTION (Only if selected shelf has bins) */}
                {selectedShelf && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 animate-in fade-in duration-200">
                    {availableBins.length === 0 ? (
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <Info className="h-4 w-4 text-slate-400 shrink-0" />
                        <span>
                          No sub-bins configured in &quot;{selectedShelf.name}&quot;. Stock
                          will be placed directly on this shelf.
                        </span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <span className="h-5 w-5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-400 flex items-center justify-center text-xs font-black">
                              3
                            </span>
                            Select Bin / Compartment (Optional):
                          </span>

                          <span className="text-xs text-slate-400">
                            {selectedBinId ? `Bin: ${selectedBin?.name}` : "Whole Shelf"}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {/* Option to place directly on whole shelf without specific bin */}
                          <button
                            type="button"
                            onClick={() => handleSelectBin("")}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold border-2 transition cursor-pointer ${
                              !selectedBinId
                                ? "border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200"
                                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                            }`}
                          >
                            <span>Whole Shelf (No specific bin)</span>
                          </button>

                          {availableBins.map((b: any) => {
                            const isBinSelected = b.id === selectedBinId;
                            return (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => handleSelectBin(b.id)}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold border-2 transition flex items-center gap-1.5 cursor-pointer ${
                                  isBinSelected
                                    ? "border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 shadow-xs"
                                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                                }`}
                              >
                                <Box className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                                <span>{b.name}</span>
                                {isBinSelected && (
                                  <Check className="h-3 w-3 text-purple-600 dark:text-purple-400 stroke-[3]" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
