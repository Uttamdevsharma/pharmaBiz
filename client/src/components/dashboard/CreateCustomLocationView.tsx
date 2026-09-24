"use client";

import React, { useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { showAlert } from "@/lib/swal";
import {
  Layers,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  List,
  FolderTree,
  Box,
  Refrigerator,
  Store,
  Archive,
} from "lucide-react";

interface CreateCustomLocationViewProps {
  selectedBranchId: string;
  onNavigate?: (module: any) => void;
}

export function CreateCustomLocationView({
  selectedBranchId,
  onNavigate,
}: CreateCustomLocationViewProps) {
  // Form State
  const [locationName, setLocationName] = useState("");

  // Optional Shelves / Drawers
  const [hasShelves, setHasShelves] = useState<boolean>(false);
  const [shelfPrefix, setShelfPrefix] = useState<string>("Chamber");
  const [numberOfShelves, setNumberOfShelves] = useState<number>(3);

  // Optional Bins / Khop
  const [hasBins, setHasBins] = useState<boolean>(false);
  const [binPrefix, setBinPrefix] = useState<string>("Slot");
  const [binsPerShelf, setBinsPerShelf] = useState<number>(2);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Calculated totals
  const totalShelves = hasShelves ? Math.max(1, Math.min(50, numberOfShelves || 1)) : 0;
  const totalBinsPerShelf = hasShelves && hasBins ? Math.max(1, Math.min(50, binsPerShelf || 1)) : 0;
  const totalBins = totalShelves * totalBinsPerShelf;

  const formatName = (prefix: string, index: number) => {
    const clean = prefix.trim();
    if (clean.length <= 2 && /^[a-zA-Z]+$/.test(clean)) {
      return index < 10 ? `${clean}0${index}` : `${clean}${index}`;
    }
    return `${clean} ${index}`;
  };

  // Live Structure Preview
  const previewStructure = useMemo(() => {
    const locName = locationName.trim() || "Storage Location";

    if (!hasShelves || totalShelves === 0) {
      return {
        name: locName,
        isDirectUnit: true,
        shelves: [],
      };
    }

    const sPrefix = shelfPrefix.trim() || "Chamber";
    const bPrefix = binPrefix.trim() || "Slot";

    const shelvesList: Array<{
      name: string;
      code: string;
      bins: Array<{ name: string; fullCode: string }>;
    }> = [];

    for (let s = 1; s <= totalShelves; s++) {
      const sName = formatName(sPrefix, s);
      const binsList: Array<{ name: string; fullCode: string }> = [];

      if (hasBins && totalBinsPerShelf > 0) {
        for (let b = 1; b <= totalBinsPerShelf; b++) {
          const bName = formatName(bPrefix, b);
          binsList.push({
            name: bName,
            fullCode: `${locName} > ${sName} > ${bName}`,
          });
        }
      }

      shelvesList.push({
        name: sName,
        code: `${locName} > ${sName}`,
        bins: binsList,
      });
    }

    return {
      name: locName,
      isDirectUnit: false,
      shelves: shelvesList,
    };
  }, [locationName, hasShelves, shelfPrefix, totalShelves, hasBins, binPrefix, totalBinsPerShelf]);

  // Handle Submit
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationName.trim()) {
      setErrorMsg("Location Name is required.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetchApi("/locations/quick-rack", {
        method: "POST",
        body: JSON.stringify({
          name: locationName.trim(),
          type: "CUSTOM",
          shelfPrefix: hasShelves ? shelfPrefix.trim() : undefined,
          numberOfShelves: hasShelves ? totalShelves : 0,
          binPrefix: hasShelves && hasBins ? binPrefix.trim() : undefined,
          binsPerShelf: hasShelves && hasBins ? totalBinsPerShelf : 0,
          branchId: selectedBranchId || undefined,
        }),
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to create location");
      }

      let msg = `Successfully created "${locationName.trim()}"!`;
      if (!hasShelves) {
        msg = `Successfully created single storage unit "${locationName.trim()}"!`;
      } else if (!hasBins) {
        msg = `Successfully created "${locationName.trim()}" with ${totalShelves} ${shelfPrefix.trim() || "shelves"}!`;
      } else {
        msg = `Successfully created "${locationName.trim()}" with ${totalShelves} ${shelfPrefix.trim() || "shelves"} and ${totalBins} ${binPrefix.trim() || "bins"}!`;
      }

      setSuccessMsg(msg);
      showAlert.success("Location Created!", msg);
    } catch (err: any) {
      const msg = err.message || "Failed to create location";
      setErrorMsg(msg);
      showAlert.error("Creation Failed", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setLocationName("");
    setHasShelves(false);
    setShelfPrefix("Chamber");
    setNumberOfShelves(3);
    setHasBins(false);
    setBinPrefix("Slot");
    setBinsPerShelf(2);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <span>Other Locations</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Create Location</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
            <Layers className="h-8 w-8 text-brand-primary" />
            Create Location
          </h1>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate("loc_custom_list")}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs cursor-pointer"
          >
            <List className="h-4 w-4 text-slate-400" />
            <span>Location List</span>
          </button>
        )}
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2.5 font-bold">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-emerald-800 dark:text-emerald-200 text-sm space-y-3 font-bold">
          <div className="flex items-center gap-2 font-black text-base">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <div className="flex items-center gap-3 pt-1">
            {onNavigate && (
              <button
                onClick={() => onNavigate("loc_custom_list")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Go to Location List
              </button>
            )}
            <button
              onClick={handleReset}
              className="h-10 px-4 rounded-xl border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100/50 transition cursor-pointer"
            >
              Create Another Location
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Form Left, Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Container */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 lg:p-7 shadow-xs space-y-6">
          <form onSubmit={handleCreate} className="space-y-6">
            {/* Location Name */}
            <div>
              <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-2">
                Location Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Refrigerator, Counter Desk 1, Emergency Box"
                required
                className="w-full h-12 text-base font-bold px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-brand-primary outline-none transition"
              />
            </div>

            {/* Optional Shelves / Levels */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 text-sm font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasShelves}
                    onChange={(e) => {
                      setHasShelves(e.target.checked);
                      if (!e.target.checked) setHasBins(false);
                    }}
                    className="h-4 w-4 rounded text-brand-primary focus:ring-brand-primary cursor-pointer"
                  />
                  <span>Has Shelves / Levels (Optional)</span>
                </label>
                <span className="text-xs font-bold text-slate-400">
                  {hasShelves ? "Enabled" : "Single Direct Unit"}
                </span>
              </div>

              {hasShelves && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                      Shelf / Level Name
                    </label>
                    <input
                      type="text"
                      value={shelfPrefix}
                      onChange={(e) => setShelfPrefix(e.target.value)}
                      placeholder="e.g. Chamber, Drawer, Layer"
                      className="w-full h-11 text-sm font-bold px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-brand-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                      Number of Shelves (1 – 50)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={numberOfShelves}
                      onChange={(e) => setNumberOfShelves(parseInt(e.target.value, 10) || 1)}
                      className="w-full h-11 text-sm font-bold px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-brand-primary outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Optional Bins / Khop */}
            {hasShelves && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 text-sm font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasBins}
                      onChange={(e) => setHasBins(e.target.checked)}
                      className="h-4 w-4 rounded text-brand-primary focus:ring-brand-primary cursor-pointer"
                    />
                    <span>Has Bins / Compartments (Optional)</span>
                  </label>
                  <span className="text-xs font-bold text-slate-400">
                    {hasBins ? "Enabled" : "Shelves Only"}
                  </span>
                </div>

                {hasBins && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                        Bin / Khop Name
                      </label>
                      <input
                        type="text"
                        value={binPrefix}
                        onChange={(e) => setBinPrefix(e.target.value)}
                        placeholder="e.g. Khop, Slot, Pocket"
                        className="w-full h-11 text-sm font-bold px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-brand-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                        Bins per Shelf (1 – 50)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={binsPerShelf}
                        onChange={(e) => setBinsPerShelf(parseInt(e.target.value, 10) || 1)}
                        className="w-full h-11 text-sm font-bold px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-brand-primary outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 h-12 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white text-base font-bold flex items-center justify-center gap-2 transition shadow-md shadow-brand-primary/20 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Creating Location...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-5 w-5" />
                    <span>Create Location</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={submitting}
                className="h-12 px-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-bold transition cursor-pointer"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview Right */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 lg:p-7 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-brand-primary" />
              Hierarchy Preview
            </h2>
            <div className="flex items-center gap-2 text-xs font-black">
              {hasShelves ? (
                <>
                  <span className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                    {totalShelves} Shelves
                  </span>
                  {hasBins && (
                    <span className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                      {totalBins} Bins
                    </span>
                  )}
                </>
              ) : (
                <span className="px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
                  Single Unit
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[460px] pr-2 space-y-3 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 font-sans">
              <div className="flex items-center gap-2 font-black text-slate-900 dark:text-white text-base">
                <Layers className="h-5 w-5 text-brand-primary" />
                <span>{previewStructure.name}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary font-bold">
                  CUSTOM
                </span>
              </div>
            </div>

            {previewStructure.isDirectUnit ? (
              <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 font-sans text-center text-slate-500">
                <Box className="h-8 w-8 mx-auto mb-2 text-slate-400 opacity-60" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Direct Storage Unit
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Items are stored directly inside this unit without shelves or bins.
                </p>
              </div>
            ) : (
              <div className="pl-4 space-y-2 border-l-2 border-brand-primary/30 ml-3">
                {previewStructure.shelves.slice(0, 8).map((sh, sIdx) => (
                  <div
                    key={sIdx}
                    className="p-3 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 font-sans text-sm">
                      <Box className="h-4 w-4 text-blue-500" />
                      <span>{sh.name}</span>
                      {sh.bins.length > 0 && (
                        <span className="text-xs text-slate-400 font-normal">
                          ({sh.bins.length} bins)
                        </span>
                      )}
                    </div>

                    {sh.bins.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 pl-4">
                        {sh.bins.map((b, bIdx) => (
                          <span
                            key={bIdx}
                            className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 font-sans"
                          >
                            {b.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {previewStructure.shelves.length > 8 && (
                  <div className="text-xs text-slate-400 text-center py-2 font-sans italic">
                    + {previewStructure.shelves.length - 8} more shelves...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
