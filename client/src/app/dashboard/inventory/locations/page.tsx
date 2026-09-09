"use client";

import React, { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import { Layers, Plus, Edit2, Trash2, ChevronRight, ChevronDown, Package } from "lucide-react";

export default function LocationsPage() {
  const [racks, setRacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [rackForm, setRackForm] = useState({ name: "" });
  const [shelfForm, setShelfForm] = useState({ name: "", rackId: "" });
  const [binForm, setBinForm] = useState({ name: "", shelfId: "" });

  const [expandedRacks, setExpandedRacks] = useState<Record<string, boolean>>({});
  const [expandedShelves, setExpandedShelves] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    setLoading(true);
    try {
      const res = await fetchApi("/locations?includeInactive=true");
      let racksList: any[] = [];
      if (Array.isArray(res)) {
        racksList = res;
      } else if (Array.isArray(res?.data)) {
        racksList = res.data;
      } else if (Array.isArray((res as any)?.racks)) {
        racksList = (res as any).racks;
      }
      setRacks(racksList);
    } catch (e) {
      console.error(e);
      setRacks([]);
    } finally {
      setLoading(false);
    }
  };

  const createRack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rackForm.name) return;
    await fetchApi("/locations/racks", {
      method: "POST",
      body: JSON.stringify(rackForm),
    });
    setRackForm({ name: "" });
    loadLocations();
  };

  const createShelf = async (e: React.FormEvent, rackId: string) => {
    e.preventDefault();
    if (!shelfForm.name) return;
    await fetchApi("/locations/shelves", {
      method: "POST",
      body: JSON.stringify({ ...shelfForm, rackId }),
    });
    setShelfForm({ name: "", rackId: "" });
    setExpandedRacks(prev => ({ ...prev, [rackId]: true }));
    loadLocations();
  };

  const createBin = async (e: React.FormEvent, shelfId: string, rackId: string) => {
    e.preventDefault();
    if (!binForm.name) return;
    await fetchApi("/locations/bins", {
      method: "POST",
      body: JSON.stringify({ ...binForm, shelfId }),
    });
    setBinForm({ name: "", shelfId: "" });
    setExpandedShelves(prev => ({ ...prev, [shelfId]: true }));
    setExpandedRacks(prev => ({ ...prev, [rackId]: true }));
    loadLocations();
  };

  const toggleRack = (id: string) => setExpandedRacks(p => ({ ...p, [id]: !p[id] }));
  const toggleShelf = (id: string) => setExpandedShelves(p => ({ ...p, [id]: !p[id] }));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Layers className="h-6 w-6 text-emerald-600" />
            Storage Locations Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">Configure your pharmacy's dynamic Racks, Shelves, and Bins.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm h-fit">
          <h2 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-300">Add New Rack</h2>
          <form onSubmit={createRack} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Rack Name/Identifier</label>
              <input
                type="text"
                value={rackForm.name}
                onChange={e => setRackForm({ name: e.target.value })}
                placeholder="e.g. Rack A"
                className="w-full text-sm rounded-lg border dark:border-slate-700 bg-transparent px-3 py-2"
                required
              />
            </div>
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm py-2 rounded-lg font-medium transition-colors">
              Create Rack
            </button>
          </form>
        </div>

        <div className="md:col-span-3 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-0 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading locations...</div>
          ) : (!Array.isArray(racks) || racks.length === 0) ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center">
              <Package className="h-12 w-12 text-slate-300 mb-3" />
              <p>No storage locations configured yet.</p>
              <p className="text-sm">Create a Rack to get started.</p>
            </div>
          ) : (
            <div className="divide-y dark:divide-slate-800">
              {(Array.isArray(racks) ? racks : []).map(rack => (
                <div key={rack.id} className="p-0">
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-4 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => toggleRack(rack.id)}>
                      <button className="text-slate-400 hover:text-slate-600">
                        {expandedRacks[rack.id] ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      </button>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">{rack.name}</h3>
                      <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">Rack</span>
                    </div>
                  </div>

                  {expandedRacks[rack.id] && (
                    <div className="p-4 pl-12 border-t dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                      {/* Shelves List */}
                      {rack.shelves?.length > 0 ? (
                        <div className="space-y-3">
                          {rack.shelves.map((shelf: any) => (
                            <div key={shelf.id} className="border dark:border-slate-800 rounded-lg overflow-hidden">
                              <div className="flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30 p-3">
                                <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleShelf(shelf.id)}>
                                  <button className="text-slate-400 hover:text-slate-600">
                                    {expandedShelves[shelf.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  </button>
                                  <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300">{shelf.name}</h4>
                                  <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase font-semibold">Shelf</span>
                                </div>
                              </div>

                              {expandedShelves[shelf.id] && (
                                <div className="p-3 pl-10 border-t dark:border-slate-800 space-y-3">
                                  {/* Bins List */}
                                  {shelf.bins?.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                      {shelf.bins.map((bin: any) => (
                                        <div key={bin.id} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded border dark:border-slate-700">
                                          <Package className="h-4 w-4 text-slate-400" />
                                          <span className="text-sm font-medium">{bin.name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-500 italic">No bins in this shelf.</p>
                                  )}

                                  {/* Add Bin Form */}
                                  <form onSubmit={(e) => createBin(e, shelf.id, rack.id)} className="flex items-center gap-2 mt-2">
                                    <input
                                      type="text"
                                      placeholder="New Bin Name (e.g. Bin 1)"
                                      value={binForm.shelfId === shelf.id ? binForm.name : ""}
                                      onChange={e => setBinForm({ name: e.target.value, shelfId: shelf.id })}
                                      className="text-xs rounded border dark:border-slate-700 bg-transparent px-2 py-1.5 flex-1 max-w-[200px]"
                                    />
                                    <button type="submit" disabled={!binForm.name || binForm.shelfId !== shelf.id} className="bg-slate-800 text-white p-1.5 rounded disabled:opacity-50">
                                      <Plus className="h-3 w-3" />
                                    </button>
                                  </form>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 italic">No shelves in this rack.</p>
                      )}

                      {/* Add Shelf Form */}
                      <form onSubmit={(e) => createShelf(e, rack.id)} className="flex items-center gap-2 pt-2 border-t dark:border-slate-800 border-dashed">
                        <input
                          type="text"
                          placeholder="New Shelf Name (e.g. Shelf A1)"
                          value={shelfForm.rackId === rack.id ? shelfForm.name : ""}
                          onChange={e => setShelfForm({ name: e.target.value, rackId: rack.id })}
                          className="text-sm rounded-lg border dark:border-slate-700 bg-transparent px-3 py-1.5 w-[250px]"
                        />
                        <button type="submit" disabled={!shelfForm.name || shelfForm.rackId !== rack.id} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                          Add Shelf
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
