"use client";

import React, { useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { showAlert } from "@/lib/swal";
import {
  Archive,
  Layers,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  List,
  Store,
  FolderTree,
} from "lucide-react";

interface CreateRackViewProps {
  selectedBranchId: string;
  onNavigate?: (module: any) => void;
}

export function CreateRackView({ selectedBranchId, onNavigate }: CreateRackViewProps) {
  // Mode: Quick Structure Creator (Default) vs Manual Single Addition
  const [activeTab, setActiveTab] = useState<"QUICK_CREATOR" | "MANUAL_ADD">("QUICK_CREATOR");

  // Quick Creator Form State
  const [rackName, setRackName] = useState("R01");
  const [numberOfShelves, setNumberOfShelves] = useState<number>(6);
  const [binsPerShelf, setBinsPerShelf] = useState<number>(3);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Calculation of generated structure
  const totalShelves = Math.max(1, Math.min(50, numberOfShelves || 1));
  const totalBinsPerShelf = Math.max(1, Math.min(50, binsPerShelf || 1));
  const totalBins = totalShelves * totalBinsPerShelf;

  // Generated preview tree
  const previewStructure = useMemo(() => {
    const rName = rackName.trim() || "R01";
    const shelvesList: Array<{
      name: string;
      code: string;
      bins: Array<{ name: string; fullCode: string }>;
    }> = [];

    for (let s = 1; s <= totalShelves; s++) {
      const sNum = s < 10 ? `S0${s}` : `S${s}`;
      const binsList: Array<{ name: string; fullCode: string }> = [];

      for (let b = 1; b <= totalBinsPerShelf; b++) {
        const bNum = b < 10 ? `B0${b}` : `B${b}`;
        binsList.push({
          name: bNum,
          fullCode: `${rName}-${sNum}-${bNum}`,
        });
      }

      shelvesList.push({
        name: sNum,
        code: `${rName}-${sNum}`,
        bins: binsList,
      });
    }

    return {
      rackName: rName,
      shelves: shelvesList,
    };
  }, [rackName, totalShelves, totalBinsPerShelf]);

  // Handle Quick Rack Creation
  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rackName.trim()) {
      setErrorMsg("Rack Name/Code is required.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetchApi("/locations/quick-rack", {
        method: "POST",
        body: JSON.stringify({
          name: rackName.trim(),
          numberOfShelves: totalShelves,
          binsPerShelf: totalBinsPerShelf,
          branchId: selectedBranchId || undefined,
        }),
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to create rack structure");
      }

      const msg = `Successfully created complete Rack structure "${rackName.trim()}" with ${totalShelves} Shelves and ${totalBins} Total Bins!`;
      setSuccessMsg(msg);
      showAlert.success("Rack Created Successfully!", msg);
    } catch (err: any) {
      const msg = err.message || "Failed to create rack structure";
      setErrorMsg(msg);
      showAlert.error("Rack Creation Failed", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setRackName("");
    setNumberOfShelves(6);
    setBinsPerShelf(3);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <span>Location Management</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Create Rack</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <PlusCircle className="h-7 w-7 text-brand-primary" />
            Create Rack Structure
          </h1>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate("loc_rack_list")}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs"
          >
            <List className="h-4 w-4 text-slate-400" />
            <span>Rack List</span>
          </button>
        )}
      </div>

      {/* Global Alerts */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2.5 font-bold">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-emerald-800 dark:text-emerald-200 text-sm space-y-2 font-bold">
          <div className="flex items-center gap-2 font-black text-base">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <div className="flex items-center gap-3 pt-1">
            {onNavigate && (
              <button
                onClick={() => onNavigate("loc_rack_list")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-4 rounded-xl text-xs font-bold transition shadow-xs"
              >
                Go to Rack List
              </button>
            )}
            <button
              onClick={handleReset}
              className="h-10 px-4 rounded-xl border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100/50 transition"
            >
              Create Another Rack
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Form Left, Live Tree Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Left */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
          <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Archive className="h-5 w-5 text-brand-primary" />
            Rack Parameters
          </h2>

          <form onSubmit={handleQuickCreate} className="space-y-4">
            {/* Rack Name / Code */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Rack Name / Code *
              </label>
              <input
                type="text"
                value={rackName}
                onChange={(e) => setRackName(e.target.value)}
                placeholder="e.g. R01, Rack A, Dispensary 1"
                required
                className="w-full h-12 text-base font-bold px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            {/* Number of Shelves */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Number of Shelves (1 – 50) *
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={numberOfShelves}
                onChange={(e) => setNumberOfShelves(parseInt(e.target.value, 10) || 1)}
                required
                className="w-full h-12 text-base font-bold px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            {/* Bins per Shelf */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Bins per Shelf (1 – 50) *
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={binsPerShelf}
                onChange={(e) => setBinsPerShelf(parseInt(e.target.value, 10) || 1)}
                required
                className="w-full h-12 text-base font-bold px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            {/* Quick Summary Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 text-sm space-y-2">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Rack:</span>
                <span className="font-bold text-slate-900 dark:text-white">{rackName.trim() || "R01"}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Shelves:</span>
                <span className="font-bold text-slate-900 dark:text-white">{totalShelves} Shelves</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Bins per Shelf:</span>
                <span className="font-bold text-slate-900 dark:text-white">{totalBinsPerShelf} Bins</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-brand-primary font-black">
                <span>Total Locations:</span>
                <span>{totalBins} Bins</span>
              </div>
            </div>

            {/* Buttons: [Cancel] [Create Rack Structure] */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="h-12 px-5 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting || !rackName.trim()}
                className="flex-1 h-12 inline-flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white px-6 rounded-xl font-black text-sm shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating Structure...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4" />
                    <span>Create Rack Structure</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Live Tree Preview Right */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-emerald-600" />
              Live Hierarchy Preview
            </h2>
            <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-lg">
              1 Rack • {totalShelves} Shelves • {totalBins} Bins
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 max-h-[500px] overflow-y-auto font-mono text-xs text-slate-800 dark:text-slate-200 custom-scrollbar space-y-1">
            <div className="font-bold text-brand-primary text-sm flex items-center gap-2">
              <Archive className="h-4 w-4" />
              <span>{previewStructure.rackName} (Rack)</span>
            </div>

            {previewStructure.shelves.map((shelf, sIdx) => {
              const isLastShelf = sIdx === previewStructure.shelves.length - 1;
              return (
                <div key={shelf.name} className="pl-4">
                  <div className="text-slate-600 dark:text-slate-300 font-semibold py-0.5">
                    {isLastShelf ? "└── " : "├── "}
                    <span className="text-slate-900 dark:text-white font-bold">{shelf.name}</span>
                    <span className="text-slate-400 font-normal ml-2">({shelf.code})</span>
                  </div>

                  <div className="pl-6 space-y-0.5">
                    {shelf.bins.map((bin, bIdx) => {
                      const isLastBin = bIdx === shelf.bins.length - 1;
                      return (
                        <div key={bin.name} className="text-slate-500 dark:text-slate-400 py-0.5 flex items-center justify-between pr-4 hover:bg-slate-200/50 dark:hover:bg-slate-800/40 rounded px-1.5 transition">
                          <span>
                            {isLastBin ? "└── " : "├── "}
                            {bin.name}
                          </span>
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">
                            {bin.fullCode}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-400 italic">
            Location codes such as {previewStructure.rackName}-S01-B01 are saved so that barcode scanning, POS lookups, and stock allocation work instantly.
          </p>
        </div>
      </div>
    </div>
  );
}
