"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import {
  Archive,
  Layers,
  Plus,
  PlusCircle,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Power,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  MapPin,
  Package,
  X,
  Loader2,
} from "lucide-react";

interface RackListViewProps {
  selectedBranchId: string;
  onNavigate?: (module: any) => void;
}

export function RackListView({ selectedBranchId, onNavigate }: RackListViewProps) {
  const [racks, setRacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(true);

  // Modals & Action States
  const [viewingRack, setViewingRack] = useState<any | null>(null);
  const [editingRack, setEditingRack] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [addShelfRack, setAddShelfRack] = useState<any | null>(null);
  const [newShelfName, setNewShelfName] = useState("");
  const [addBinShelf, setAddBinShelf] = useState<any | null>(null);
  const [newBinName, setNewBinName] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load Racks with complete hierarchy and statistics
  const loadRacks = useCallback(async () => {
    if (!selectedBranchId) return;
    try {
      setLoading(true);
      const queryParam = `?branchId=${encodeURIComponent(selectedBranchId)}&includeInactive=${includeInactive}`;
      const res = await fetchApi(`/locations${queryParam}`);
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
      console.error("Failed to load racks", err);
      setRacks([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, includeInactive]);

  useEffect(() => {
    loadRacks();
  }, [loadRacks]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalRacks = racks.length;
    let totalShelves = 0;
    let totalBins = 0;
    let totalUsed = 0;
    let totalEmpty = 0;

    racks.forEach((r) => {
      totalShelves += r.numberOfShelves || 0;
      totalBins += r.numberOfBins || 0;
      totalUsed += r.usedLocations || 0;
      totalEmpty += r.emptyLocations || 0;
    });

    return {
      totalRacks,
      totalShelves,
      totalBins,
      totalUsed,
      totalEmpty,
    };
  }, [racks]);

  // Filtered Racks
  const filteredRacks = useMemo(() => {
    if (!search) return racks;
    const q = search.toLowerCase().trim();
    return racks.filter((r) => {
      const name = (r.name || "").toLowerCase();
      return name.includes(q);
    });
  }, [racks, search]);

  // Action: Toggle Active/Inactive
  const handleToggleActive = async (rack: any) => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      const res = await fetchApi(`/locations/racks/${rack.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !rack.isActive }),
      });
      if (res.success === false) {
        throw new Error(res.message || "Failed to update rack status");
      }
      setSuccessMsg(`Rack "${rack.name}" is now ${!rack.isActive ? "Active" : "Inactive"}.`);
      await loadRacks();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update rack status");
    }
  };

  // Action: Edit Rack Name
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRack || !editName.trim()) return;
    try {
      setActionLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      const res = await fetchApi(`/locations/racks/${editingRack.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (res.success === false) {
        throw new Error(res.message || "Failed to rename rack");
      }
      setSuccessMsg(`Rack renamed to "${editName.trim()}".`);
      setEditingRack(null);
      await loadRacks();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to rename rack");
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Add Shelf
  const handleAddShelf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addShelfRack || !newShelfName.trim()) return;
    try {
      setActionLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      const res = await fetchApi("/locations/shelves", {
        method: "POST",
        body: JSON.stringify({
          rackId: addShelfRack.id,
          name: newShelfName.trim(),
        }),
      });
      if (res.success === false) {
        throw new Error(res.message || "Failed to add shelf");
      }
      setSuccessMsg(`Shelf "${newShelfName.trim()}" added to Rack "${addShelfRack.name}".`);
      setAddShelfRack(null);
      setNewShelfName("");
      await loadRacks();
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
        throw new Error(res.message || "Failed to add bin");
      }
      setSuccessMsg(`Bin "${newBinName.trim()}" added to Shelf "${addBinShelf.name}".`);
      setAddBinShelf(null);
      setNewBinName("");
      await loadRacks();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to add bin");
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Delete Rack (Protected with stock and audit safety checks)
  const handleDeleteRack = async (rack: any) => {
    if (!confirm(`Are you sure you want to delete Rack "${rack.name}"?`)) {
      return;
    }
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      const res = await fetchApi(`/locations/racks/${rack.id}`, {
        method: "DELETE",
      });
      if (res.success === false) {
        throw new Error(res.message || "Cannot delete rack");
      }
      setSuccessMsg(`Rack "${rack.name}" deleted successfully.`);
      await loadRacks();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete rack");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <span>Location Management</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Rack List</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Archive className="h-7 w-7 text-brand-primary" />
            Physical Rack List
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {onNavigate && (
            <button
              onClick={() => onNavigate("loc_create_rack")}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-brand-primary text-white text-sm font-bold hover:bg-brand-primary/90 transition shadow-xs"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create Rack Structure</span>
            </button>
          )}

          <button
            onClick={loadRacks}
            title="Refresh racks"
            className="h-11 w-11 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2.5 font-bold">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2.5 font-bold">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-black uppercase text-slate-400 tracking-wider">Total Racks</p>
          <p className="text-3xl font-black font-mono text-slate-900 dark:text-white mt-1">{metrics.totalRacks}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-black uppercase text-slate-400 tracking-wider">Total Shelves</p>
          <p className="text-3xl font-black font-mono text-slate-900 dark:text-white mt-1">{metrics.totalShelves}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-black uppercase text-slate-400 tracking-wider">Total Bins</p>
          <p className="text-3xl font-black font-mono text-slate-900 dark:text-white mt-1">{metrics.totalBins}</p>
        </div>

        <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">Used Locations</p>
          <p className="text-3xl font-black font-mono text-emerald-900 dark:text-emerald-200 mt-1">{metrics.totalUsed}</p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">Empty Locations</p>
          <p className="text-3xl font-black font-mono text-slate-800 dark:text-slate-200 mt-1">{metrics.totalEmpty}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="h-5 w-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Rack by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 text-sm font-semibold pl-11 pr-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-100"
          />
        </div>

        <label className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
          />
          <span>Show Inactive Racks</span>
        </label>
      </div>

      {/* Racks Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm font-bold">Loading racks...</div>
        ) : filteredRacks.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <Archive className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="font-bold text-slate-700 dark:text-slate-300 text-base">No Racks found</p>
            {onNavigate && (
              <button
                onClick={() => onNavigate("loc_create_rack")}
                className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-bold hover:bg-brand-primary/90 transition"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Create Your First Rack</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-4 px-4">Rack Name / Code</th>
                  <th className="py-4 px-4 text-center">Shelves</th>
                  <th className="py-4 px-4 text-center">Bins</th>
                  <th className="py-4 px-4 text-center">Used Locations</th>
                  <th className="py-4 px-4 text-center">Empty Locations</th>
                  <th className="py-4 px-4 text-center">Status</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
                {filteredRacks.map((rack) => (
                  <tr key={rack.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Archive className="h-4 w-4 text-brand-primary shrink-0" />
                      <span>{rack.name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                      {rack.numberOfShelves || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                      {rack.numberOfBins || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {rack.usedLocations || 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-slate-500 dark:text-slate-400">
                        {rack.emptyLocations || 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          rack.isActive
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {rack.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Button */}
                        <button
                          onClick={() => setViewingRack(rack)}
                          title="View Rack structure and stored stock"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        {/* Edit Name Button */}
                        <button
                          onClick={() => {
                            setEditingRack(rack);
                            setEditName(rack.name);
                          }}
                          title="Edit Rack name"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        {/* Add Shelf Button */}
                        <button
                          onClick={() => {
                            setAddShelfRack(rack);
                            setNewShelfName(`S0${(rack.numberOfShelves || 0) + 1}`);
                          }}
                          title="Add a new Shelf to this Rack"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-brand-primary transition"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>

                        {/* Toggle Active/Inactive */}
                        <button
                          onClick={() => handleToggleActive(rack)}
                          title={rack.isActive ? "Deactivate Rack" : "Activate Rack"}
                          className={`p-1.5 rounded-lg border transition ${
                            rack.isActive
                              ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900/60 dark:hover:bg-emerald-950/40"
                              : "border-slate-300 text-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                          }`}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteRack(rack)}
                          title="Delete Rack (Protected if active stock or audit records exist)"
                          className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────
          MODAL: VIEW RACK HIERARCHY & STORED STOCK
      ────────────────────────────────────────── */}
      {viewingRack && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Archive className="h-5 w-5 text-brand-primary" />
                Rack {viewingRack.name} Hierarchy & Stored Stock
              </h3>
              <button
                onClick={() => setViewingRack(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 flex-1 pr-1 custom-scrollbar">
              {(viewingRack.shelves || []).map((shelf: any) => (
                <div key={shelf.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      Shelf: {shelf.name}
                    </span>
                    <button
                      onClick={() => {
                        setAddBinShelf(shelf);
                        setNewBinName(`B0${(shelf.bins?.length || 0) + 1}`);
                      }}
                      className="text-[11px] font-bold text-brand-primary hover:underline flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add Bin
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    {(shelf.bins || []).map((bin: any) => {
                      const storedItems = (viewingRack.inventoryLocations || []).filter(
                        (loc: any) => loc.binId === bin.id
                      );
                      const hasStock = storedItems.length > 0;

                      return (
                        <div
                          key={bin.id}
                          className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                            hasStock
                              ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40"
                              : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-slate-800 dark:text-slate-200">{bin.name}</span>
                            <span
                              className={`text-[10px] font-black ${
                                hasStock ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400"
                              }`}
                            >
                              {hasStock ? "Stocked" : "Empty"}
                            </span>
                          </div>

                          {hasStock && (
                            <div className="space-y-1 pt-1 text-[11px] border-t border-emerald-200/60 dark:border-emerald-900/30">
                              {storedItems.map((loc: any) => (
                                <p key={loc.id} className="text-emerald-800 dark:text-emerald-200 truncate">
                                  {loc.inventory?.product?.name}: <span className="font-bold">{loc.quantity} units</span>
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────
          MODAL: EDIT RACK NAME
      ────────────────────────────────────────── */}
      {editingRack && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Edit Rack Name</h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Rack Name *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full h-12 text-base font-bold px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRack(null)}
                  className="h-11 px-5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="h-11 px-6 rounded-xl bg-brand-primary text-white text-sm font-black shadow-sm"
                >
                  {actionLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────
          MODAL: ADD SHELF
      ────────────────────────────────────────── */}
      {addShelfRack && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              Add Shelf ({addShelfRack.name})
            </h3>
            <form onSubmit={handleAddShelf} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Shelf Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g. S07"
                  value={newShelfName}
                  onChange={(e) => setNewShelfName(e.target.value)}
                  required
                  className="w-full h-12 text-base font-bold px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddShelfRack(null)}
                  className="h-11 px-5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="h-11 px-6 rounded-xl bg-brand-primary text-white text-sm font-black shadow-sm"
                >
                  {actionLoading ? "Adding..." : "Add Shelf"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────
          MODAL: ADD BIN
      ────────────────────────────────────────── */}
      {addBinShelf && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              Add Bin ({addBinShelf.name})
            </h3>
            <form onSubmit={handleAddBin} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Bin Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g. B04"
                  value={newBinName}
                  onChange={(e) => setNewBinName(e.target.value)}
                  required
                  className="w-full h-12 text-base font-bold px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddBinShelf(null)}
                  className="h-11 px-5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="h-11 px-6 rounded-xl bg-brand-primary text-white text-sm font-black shadow-sm"
                >
                  {actionLoading ? "Adding..." : "Add Bin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
