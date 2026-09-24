"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import {
  Layers,
  Plus,
  PlusCircle,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  Search,
  X,
  Loader2,
  Box,
} from "lucide-react";

interface CustomLocationListViewProps {
  selectedBranchId: string;
  onNavigate?: (module: any) => void;
}

export function CustomLocationListView({
  selectedBranchId,
  onNavigate,
}: CustomLocationListViewProps) {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modals & Action States
  const [viewingLocation, setViewingLocation] = useState<any | null>(null);
  const [editingLocation, setEditingLocation] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [addShelfLocation, setAddShelfLocation] = useState<any | null>(null);
  const [newShelfName, setNewShelfName] = useState("");
  const [editingShelf, setEditingShelf] = useState<any | null>(null);
  const [editShelfName, setEditShelfName] = useState("");
  const [addBinShelf, setAddBinShelf] = useState<any | null>(null);
  const [newBinName, setNewBinName] = useState("");
  const [editingBin, setEditingBin] = useState<any | null>(null);
  const [editBinName, setEditBinName] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load Custom Locations
  const loadLocations = useCallback(async () => {
    if (!selectedBranchId) return;
    try {
      setLoading(true);
      const queryParam = `?branchId=${encodeURIComponent(selectedBranchId)}&includeInactive=true&type=CUSTOM`;
      const res = await fetchApi(`/locations${queryParam}`);
      let list: any[] = [];
      if (Array.isArray(res)) {
        list = res;
      } else if (Array.isArray(res?.data)) {
        list = res.data;
      } else if (Array.isArray((res as any)?.racks)) {
        list = (res as any).racks;
      }
      setLocations(list);
    } catch (err) {
      console.error("Failed to load custom locations", err);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  // Filtered Locations
  const filteredLocations = useMemo(() => {
    if (!search) return locations;
    const q = search.toLowerCase().trim();
    return locations.filter((l) => {
      const name = (l.name || "").toLowerCase();
      return name.includes(q);
    });
  }, [locations, search]);

  // Action: Edit Name
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLocation || !editName.trim()) return;
    try {
      setActionLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      const res = await fetchApi(`/locations/racks/${editingLocation.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (res.success === false) {
        throw new Error(res.message || "Failed to rename location");
      }
      setSuccessMsg(`Location renamed to "${editName.trim()}".`);
      setEditingLocation(null);
      await loadLocations();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to rename location");
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Add Shelf / Level
  const handleAddShelf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addShelfLocation || !newShelfName.trim()) return;
    try {
      setActionLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      const res = await fetchApi("/locations/shelves", {
        method: "POST",
        body: JSON.stringify({
          rackId: addShelfLocation.id,
          name: newShelfName.trim(),
        }),
      });
      if (res.success === false) {
        throw new Error(res.message || "Failed to add shelf");
      }
      setSuccessMsg(`Added shelf "${newShelfName.trim()}".`);
      setAddShelfLocation(null);
      setNewShelfName("");
      await loadLocations();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to add shelf");
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Add Bin
  const handleAddBin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addBinShelf || !newBinName.trim()) return;
    try {
      setActionLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      const res = await fetchApi("/locations/bins", {
        method: "POST",
        body: JSON.stringify({
          shelfId: addBinShelf.id,
          name: newBinName.trim(),
        }),
      });
      if (res.success === false) {
        throw new Error(res.message || "Failed to add compartment");
      }
      setSuccessMsg(`Added compartment "${newBinName.trim()}".`);
      setAddBinShelf(null);
      setNewBinName("");
      await loadLocations();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to add compartment");
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Edit Shelf Name
  const handleSaveEditShelf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShelf || !editShelfName.trim()) return;
    try {
      setActionLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      const res = await fetchApi(`/locations/shelves/${editingShelf.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editShelfName.trim() }),
      });
      if (res.success === false) {
        throw new Error(res.message || "Failed to rename shelf");
      }
      setSuccessMsg(`Shelf name updated.`);
      if (viewingLocation && viewingLocation.shelves) {
        setViewingLocation({
          ...viewingLocation,
          shelves: viewingLocation.shelves.map((s: any) =>
            s.id === editingShelf.id ? { ...s, name: editShelfName.trim() } : s
          ),
        });
      }
      setEditingShelf(null);
      await loadLocations();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to rename shelf");
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Edit Bin Name
  const handleSaveEditBin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBin || !editBinName.trim()) return;
    try {
      setActionLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      const res = await fetchApi(`/locations/bins/${editingBin.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editBinName.trim() }),
      });
      if (res.success === false) {
        throw new Error(res.message || "Failed to rename compartment");
      }
      setSuccessMsg(`Compartment name updated.`);
      setEditingBin(null);
      await loadLocations();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to rename compartment");
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Delete Location
  const handleDeleteLocation = async (loc: any) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${loc.name}"?`
    );
    if (!confirmDelete) return;

    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      const res = await fetchApi(`/locations/racks/${loc.id}`, {
        method: "DELETE",
      });
      if (res.success === false) {
        throw new Error(res.message || "Failed to delete location");
      }
      setSuccessMsg(`"${loc.name}" deleted successfully.`);
      if (viewingLocation?.id === loc.id) {
        setViewingLocation(null);
      }
      await loadLocations();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete location");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <span>Other Locations</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Location List</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <Layers className="h-8 w-8 text-brand-primary" />
            <span>Location List</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-brand-primary/10 text-brand-primary font-bold">
              Total: {locations.length}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {onNavigate && (
            <button
              onClick={() => onNavigate("loc_create_custom")}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-brand-primary text-white text-sm font-bold hover:bg-brand-primary/90 transition shadow-xs cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create Location</span>
            </button>
          )}

          <button
            onClick={loadLocations}
            title="Refresh list"
            className="h-11 w-11 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2 font-bold">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl text-emerald-800 dark:text-emerald-200 text-sm flex items-center gap-2 font-bold">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search location..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-brand-primary"
          />
        </div>
      </div>

      {/* Simplified, Clean Table */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
          <p className="text-sm font-bold">Loading locations...</p>
        </div>
      ) : filteredLocations.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <Layers className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-base font-bold text-slate-700 dark:text-slate-300">
            No locations found
          </p>
          {onNavigate && (
            <button
              onClick={() => onNavigate("loc_create_custom")}
              className="mt-2 inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary/90 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create Location</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-850 text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800 select-none">
                <tr>
                  <th className="py-4 px-5 w-16 text-center">#</th>
                  <th className="py-4 px-6 text-base font-black">Location Name</th>
                  <th className="py-4 px-6 text-sm font-bold">Shelves &amp; Bins</th>
                  <th className="py-4 px-6 text-right text-sm font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLocations.map((loc, index) => {
                  const shelfCount = loc.numberOfShelves || 0;
                  const binCount = loc.numberOfBins || 0;
                  const isDirect = shelfCount === 0;

                  return (
                    <tr
                      key={loc.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                    >
                      {/* Serial */}
                      <td className="py-4 px-5 text-center font-bold text-slate-400 text-sm">
                        {index + 1}
                      </td>

                      {/* Location Name */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                            <Layers className="h-5 w-5" />
                          </div>
                          <div>
                            <span className="text-base font-black text-slate-900 dark:text-white block">
                              {loc.name}
                            </span>
                            {isDirect && (
                              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                                Direct Storage Unit
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Shelves & Bins Summary */}
                      <td className="py-4 px-6">
                        {isDirect ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                            <Box className="h-3.5 w-3.5" />
                            <span>Direct Storage (No shelves or bins)</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-lg text-xs font-black bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                              {shelfCount} {shelfCount === 1 ? "Shelf" : "Shelves"}
                            </span>
                            {binCount > 0 ? (
                              <span className="px-3 py-1 rounded-lg text-xs font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                                {binCount} {binCount === 1 ? "Bin" : "Bins"}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium">
                                (No sub-bins)
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* 👁️ View Button */}
                          <button
                            type="button"
                            onClick={() => setViewingLocation(loc)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-primary text-white text-xs font-black hover:bg-brand-primary/90 transition shadow-xs cursor-pointer"
                            title="View Structure"
                          >
                            <Eye className="h-4 w-4" />
                            <span>View</span>
                          </button>

                          {/* ✏️ Rename */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLocation(loc);
                              setEditName(loc.name);
                            }}
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                            title="Rename Location"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          {/* 🗑️ Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteLocation(loc)}
                            className="p-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                            title="Delete Location"
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
        </div>
      )}

      {/* 👁️ View Details Modal */}
      {viewingLocation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                  <Layers className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    {viewingLocation.name}
                  </h3>
                  <span className="text-xs text-slate-400 font-bold">
                    Storage Layout &amp; Details
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewingLocation(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4">
              {(!viewingLocation.shelves || viewingLocation.shelves.length === 0) ? (
                /* Direct Unit Presentation */
                <div className="p-6 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 text-center space-y-3">
                  <Box className="h-12 w-12 text-amber-500 mx-auto" />
                  <h4 className="text-base font-black text-amber-900 dark:text-amber-200">
                    Direct Storage Unit
                  </h4>
                  <p className="text-sm font-semibold text-amber-800/80 dark:text-amber-300/80 max-w-md mx-auto">
                    No shelves or bins configured. Items are stored directly inside &quot;{viewingLocation.name}&quot;.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAddShelfLocation(viewingLocation);
                        setNewShelfName("");
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary/90 transition shadow-xs cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Shelf / Chamber</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Multi-Level Presentation */
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                      Total Shelves: {viewingLocation.shelves.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAddShelfLocation(viewingLocation);
                        setNewShelfName("");
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-primary hover:text-brand-primary/80 transition cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add New Shelf</span>
                    </button>
                  </div>

                  {viewingLocation.shelves.map((shelf: any, sIdx: number) => (
                    <div
                      key={shelf.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-black flex items-center justify-center">
                            {sIdx + 1}
                          </span>
                          <span className="font-black text-sm text-slate-900 dark:text-white">
                            {shelf.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingShelf(shelf);
                              setEditShelfName(shelf.name);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition"
                            title="Rename Shelf"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAddBinShelf(shelf);
                              setNewBinName("");
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition cursor-pointer"
                            title="Add Compartment"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Add Bin</span>
                          </button>
                        </div>
                      </div>

                      {/* Bins / Khop Tags */}
                      {shelf.bins && shelf.bins.length > 0 ? (
                        <div className="flex flex-wrap gap-2 pt-1 pl-8">
                          {shelf.bins.map((bin: any) => (
                            <span
                              key={bin.id}
                              onClick={() => {
                                setEditingBin(bin);
                                setEditBinName(bin.name);
                              }}
                              className="px-3 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-brand-primary transition cursor-pointer shadow-2xs"
                              title="Click to rename"
                            >
                              📦 {bin.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic pl-8 block">
                          No sub-bins (items stored directly on this level)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingLocation(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Location Name */}
      {editingLocation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Rename Location
            </h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  Location Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold outline-none focus:border-brand-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLocation(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary/90 transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Shelf */}
      {addShelfLocation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Add Shelf / Chamber
            </h3>
            <p className="text-xs text-slate-400">
              Adding to &quot;{addShelfLocation.name}&quot;
            </p>
            <form onSubmit={handleAddShelf} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  Shelf Name
                </label>
                <input
                  type="text"
                  value={newShelfName}
                  onChange={(e) => setNewShelfName(e.target.value)}
                  placeholder="e.g. Chamber 1, Drawer A, Shelf 3"
                  required
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold outline-none focus:border-brand-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddShelfLocation(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary/90 transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Adding..." : "Add Shelf"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Bin */}
      {addBinShelf && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Add Compartment / Bin
            </h3>
            <p className="text-xs text-slate-400">
              Adding to &quot;{addBinShelf.name}&quot;
            </p>
            <form onSubmit={handleAddBin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  Compartment Name
                </label>
                <input
                  type="text"
                  value={newBinName}
                  onChange={(e) => setNewBinName(e.target.value)}
                  placeholder="e.g. Slot 1, Pocket A, Box 2"
                  required
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold outline-none focus:border-brand-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddBinShelf(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary/90 transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Adding..." : "Add Compartment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Shelf */}
      {editingShelf && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Rename Shelf
            </h3>
            <form onSubmit={handleSaveEditShelf} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  New Shelf Name
                </label>
                <input
                  type="text"
                  value={editShelfName}
                  onChange={(e) => setEditShelfName(e.target.value)}
                  required
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold outline-none focus:border-brand-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingShelf(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary/90 transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Bin */}
      {editingBin && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Rename Compartment
            </h3>
            <form onSubmit={handleSaveEditBin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  New Compartment Name
                </label>
                <input
                  type="text"
                  value={editBinName}
                  onChange={(e) => setEditBinName(e.target.value)}
                  required
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold outline-none focus:border-brand-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBin(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary/90 transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
