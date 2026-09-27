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
  List,
  FolderTree,
  Box,
  Building2,
  Pill,
  Snowflake,
  Sparkles,
  Check,
  Zap,
} from "lucide-react";

interface CreateRackViewProps {
  selectedBranchId: string;
  onNavigate?: (module: any) => void;
}

interface RackPreset {
  id: string;
  name: string;
  code: string;
  category: "COMPANY" | "GENERIC" | "SPECIAL";
  shelves: number;
  bins: number;
  type?: string;
  description: string;
  badge: string;
}

const RACK_PRESETS: RackPreset[] = [
  // 🏢 Top Pharma Companies
  { id: "bex", name: "Beximco Pharmaceuticals", code: "BEX-01 (Beximco)", category: "COMPANY", shelves: 6, bins: 0, description: "Napa, Ace, Filmet, Tofen, etc.", badge: "Top Company" },
  { id: "sqr", name: "Square Pharmaceuticals", code: "SQR-01 (Square)", category: "COMPANY", shelves: 6, bins: 0, description: "Seclo, Ace, Alatrol, Ciprocin, etc.", badge: "Top Company" },
  { id: "inc", name: "Incepta Pharmaceuticals", code: "INC-01 (Incepta)", category: "COMPANY", shelves: 6, bins: 0, description: "Pantone, Osartil, Filwel, etc.", badge: "Top Company" },
  { id: "ren", name: "Renata Limited", code: "REN-01 (Renata)", category: "COMPANY", shelves: 5, bins: 0, description: "Maxpro, Fexo, Rolac, etc.", badge: "Company" },
  { id: "aci", name: "ACI Healthcare", code: "ACI-01 (ACI)", category: "COMPANY", shelves: 5, bins: 0, description: "Oradin, Deflux, Naproxen, etc.", badge: "Company" },
  { id: "skf", name: "Eskayef (SK+F)", code: "SKF-01 (SK+F)", category: "COMPANY", shelves: 5, bins: 0, description: "Losectil, Bilastin, Coralcal, etc.", badge: "Company" },
  { id: "ops", name: "Opsonin Pharma", code: "OPS-01 (Opsonin)", category: "COMPANY", shelves: 5, bins: 0, description: "Finix, De-Rash, Cef-3, etc.", badge: "Company" },
  { id: "ari", name: "Aristopharma", code: "ARI-01 (Aristopharma)", category: "COMPANY", shelves: 5, bins: 0, description: "Omep, Lodipin, Aritone, etc.", badge: "Company" },
  { id: "pop", name: "Popular Pharmaceuticals", code: "POP-01 (Popular)", category: "COMPANY", shelves: 5, bins: 0, description: "Progut, Polium, etc.", badge: "Company" },
  { id: "hpl", name: "Healthcare Pharmaceuticals", code: "HPL-01 (Healthcare)", category: "COMPANY", shelves: 5, bins: 0, description: "Sergel, Xeldrin, etc.", badge: "Company" },

  // 💊 Generic & Therapy Categories
  { id: "gst", name: "Gastric & PPI", code: "GST-01 (Gastric & PPI)", category: "GENERIC", shelves: 6, bins: 0, description: "Omeprazole, Esomeprazole, Rabeprazole, Antacids", badge: "High Demand" },
  { id: "ant", name: "Antibiotics & Anti-infectives", code: "ANT-01 (Antibiotics)", category: "GENERIC", shelves: 6, bins: 0, description: "Cefixime, Azithromycin, Ciprofloxacin, Amoxicillin", badge: "Controlled" },
  { id: "syr", name: "Syrups & Suspensions", code: "SYR-01 (Syrups & Suspensions)", category: "GENERIC", shelves: 4, bins: 0, description: "Cough syrups, Paediatric drops, Liquid tonics", badge: "Liquids" },
  { id: "pain", name: "Pain Relief, Fever & NSAIDs", code: "PAIN-01 (Pain & Fever)", category: "GENERIC", shelves: 5, bins: 0, description: "Paracetamol, Aceclofenac, Ketorolac, Ibuprofen", badge: "Everyday" },
  { id: "cvs", name: "Cardiovascular & BP", code: "CVS-01 (Heart & BP)", category: "GENERIC", shelves: 5, bins: 0, description: "Amlodipine, Losartan, Telmisartan, Rosuvastatin", badge: "Chronic" },
  { id: "dia", name: "Diabetes & Endocrine", code: "DIA-01 (Diabetes)", category: "GENERIC", shelves: 4, bins: 0, description: "Metformin, Gliclazide, Sitagliptin, Linagliptin", badge: "Chronic" },
  { id: "drop", name: "Eye, Ear & Nasal Drops", code: "DRP-01 (Drops)", category: "GENERIC", shelves: 4, bins: 0, description: "Ophthalmic & Otic formulations, Nasal sprays", badge: "Specialty" },
  { id: "ont", name: "Ointments, Creams & Topical", code: "ONT-01 (Ointments)", category: "GENERIC", shelves: 4, bins: 0, description: "Antibiotic creams, Steroids, Antifungal gels", badge: "Topical" },
  { id: "vit", name: "Vitamins & Calcium", code: "VIT-01 (Vitamins & Supplements)", category: "GENERIC", shelves: 5, bins: 0, description: "Multivitamins, Zinc, Calcium + Vit D, Iron", badge: "OTC" },

  // ❄️ Specialized Units
  { id: "fridge", name: "Main Refrigerator (Cold Chain)", code: "FRIDGE-01 (Cold Chain 2-8°C)", category: "SPECIAL", shelves: 3, bins: 0, type: "REFRIGERATOR", description: "Insulins, Vaccines, Eye Drops, Biologics", badge: "2°C to 8°C" },
  { id: "otc", name: "Fast-Moving Front Counter", code: "OTC-01 (Front Counter)", category: "SPECIAL", shelves: 4, bins: 0, description: "Quick access emergency & high-volume products", badge: "Front Desk" },
];

export function CreateRackView({ selectedBranchId, onNavigate }: CreateRackViewProps) {
  // Form State
  const [rackName, setRackName] = useState("BEX-01 (Beximco)");
  const [rackType, setRackType] = useState("RACK");
  const [shelfPrefix, setShelfPrefix] = useState("Shelf");
  const [numberOfShelves, setNumberOfShelves] = useState<number>(6);
  const [binPrefix, setBinPrefix] = useState("Bin");
  const [binsPerShelf, setBinsPerShelf] = useState<number>(0);

  // Custom Shelf Names state
  const [useCustomShelfLabels, setUseCustomShelfLabels] = useState(false);
  const [customShelfNames, setCustomShelfNames] = useState<string[]>([]);

  // Preset filter tab
  const [presetTab, setPresetTab] = useState<"COMPANY" | "GENERIC" | "SPECIAL">("COMPANY");

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Calculations
  const totalShelves = Math.max(1, Math.min(50, numberOfShelves || 1));
  const totalBinsPerShelf = Math.max(0, Math.min(50, binsPerShelf || 0));
  const totalBins = totalShelves * totalBinsPerShelf;

  const formatName = (prefix: string, index: number) => {
    const clean = prefix.trim();
    if (clean.length <= 2 && /^[a-zA-Z]+$/.test(clean)) {
      return index < 10 ? `${clean}0${index}` : `${clean}${index}`;
    }
    return `${clean} ${index}`;
  };

  // Quick shelf name helpers
  const fillCompanyShelves = () => {
    setUseCustomShelfLabels(true);
    const companies = [
      "Shelf 1 - Beximco (Napa, Ace)",
      "Shelf 2 - Square (Seclo, Alatrol)",
      "Shelf 3 - Incepta (Pantone, Osartil)",
      "Shelf 4 - Renata (Maxpro, Fexo)",
      "Shelf 5 - ACI Healthcare (Oradin)",
      "Shelf 6 - Eskayef SK+F (Losectil)",
      "Shelf 7 - Opsonin (Finix)",
      "Shelf 8 - Aristopharma (Omep)",
      "Shelf 9 - Popular Pharma",
      "Shelf 10 - Healthcare Pharma",
    ];
    setCustomShelfNames(companies.slice(0, totalShelves));
  };

  const fillGenericShelves = () => {
    setUseCustomShelfLabels(true);
    const generics = [
      "Shelf 1 - Gastric & PPI (Antacids)",
      "Shelf 2 - Antibiotics & Anti-infectives",
      "Shelf 3 - Pain, Fever & NSAIDs",
      "Shelf 4 - Syrups & Suspensions",
      "Shelf 5 - Cardiovascular & BP",
      "Shelf 6 - Diabetes & Endocrine",
      "Shelf 7 - Eye & Ear Drops",
      "Shelf 8 - Ointments & Topical",
      "Shelf 9 - Vitamins & Calcium",
      "Shelf 10 - Surgical & OTC",
    ];
    setCustomShelfNames(generics.slice(0, totalShelves));
  };

  // Live Structure Preview
  const previewStructure = useMemo(() => {
    const rName = rackName.trim() || "Rack";
    const sPrefix = shelfPrefix.trim() || "Shelf";
    const bPrefix = binPrefix.trim() || "Bin";

    const shelvesList: Array<{
      name: string;
      code: string;
      bins: Array<{ name: string; fullCode: string }>;
    }> = [];

    for (let s = 1; s <= totalShelves; s++) {
      const customVal = customShelfNames[s - 1]?.trim();
      const sName = (useCustomShelfLabels && customVal) ? customVal : formatName(sPrefix, s);
      const binsList: Array<{ name: string; fullCode: string }> = [];

      if (totalBinsPerShelf > 0) {
        for (let b = 1; b <= totalBinsPerShelf; b++) {
          const bName = formatName(bPrefix, b);
          binsList.push({
            name: bName,
            fullCode: `${rName} > ${sName} > ${bName}`,
          });
        }
      }

      shelvesList.push({
        name: sName,
        code: `${rName} > ${sName}`,
        bins: binsList,
      });
    }

    return {
      rackName: rName,
      shelves: shelvesList,
    };
  }, [rackName, shelfPrefix, totalShelves, binPrefix, totalBinsPerShelf, useCustomShelfLabels, customShelfNames]);

  // Handle Rack Creation
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rackName.trim()) {
      setErrorMsg("Rack Name is required.");
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
          type: rackType || "RACK",
          shelfPrefix: shelfPrefix.trim() || "Shelf",
          numberOfShelves: totalShelves,
          binPrefix: binPrefix.trim() || "Bin",
          binsPerShelf: totalBinsPerShelf,
          customShelves: useCustomShelfLabels ? customShelfNames.slice(0, totalShelves) : undefined,
          branchId: selectedBranchId || undefined,
        }),
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to create rack");
      }

      const msg = `Successfully created rack "${rackName.trim()}" with ${totalShelves} shelves and ${totalBins} bins!`;
      setSuccessMsg(msg);
      showAlert.success("Rack Created Successfully!", msg);
    } catch (err: any) {
      const msg = err.message || "Failed to create rack";
      setErrorMsg(msg);
      showAlert.error("Creation Failed", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyPreset = (preset: RackPreset) => {
    setRackName(preset.code);
    setRackType(preset.type || "RACK");
    setNumberOfShelves(preset.shelves);
    setBinsPerShelf(preset.bins);
    setShelfPrefix("Shelf");
    setBinPrefix("Bin");
    setUseCustomShelfLabels(false);
    setCustomShelfNames([]);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleReset = () => {
    setRackName("");
    setRackType("RACK");
    setShelfPrefix("Shelf");
    setNumberOfShelves(6);
    setBinPrefix("Bin");
    setBinsPerShelf(0);
    setUseCustomShelfLabels(false);
    setCustomShelfNames([]);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <span>Rack Management</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Create Rack</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
            <Archive className="h-8 w-8 text-brand-primary" />
            Create Rack
          </h1>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate("loc_rack_list")}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs cursor-pointer"
          >
            <List className="h-4 w-4 text-slate-400" />
            <span>Rack List</span>
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
                onClick={() => onNavigate("loc_rack_list")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Go to Rack List
              </button>
            )}
            <button
              onClick={handleReset}
              className="h-10 px-4 rounded-xl border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100/50 transition cursor-pointer"
            >
              Create Another Rack
            </button>
          </div>
        </div>
      )}

      {/* ⚡ Quick Strategy Presets (1-Click Fill) */}
      <div className="bg-gradient-to-r from-brand-primary/5 via-blue-50/50 to-indigo-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-850 border border-brand-primary/20 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-brand-primary text-white flex items-center justify-center shrink-0 shadow-sm">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Fast Rack Setup Templates</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary font-black uppercase tracking-wider">
                  1-Click Fill
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose a pre-configured template for company-wise or generic therapy-wise pharmacy organization.
              </p>
            </div>
          </div>

          {/* Strategy Tabs */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto text-xs">
            <button
              type="button"
              onClick={() => setPresetTab("COMPANY")}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                presetTab === "COMPANY"
                  ? "bg-brand-primary text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Pharma Companies</span>
            </button>
            <button
              type="button"
              onClick={() => setPresetTab("GENERIC")}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                presetTab === "GENERIC"
                  ? "bg-brand-primary text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Pill className="h-3.5 w-3.5" />
              <span>Generic Therapy</span>
            </button>
            <button
              type="button"
              onClick={() => setPresetTab("SPECIAL")}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                presetTab === "SPECIAL"
                  ? "bg-brand-primary text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Snowflake className="h-3.5 w-3.5" />
              <span>Cold / Special</span>
            </button>
          </div>
        </div>

        {/* Preset Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
          {RACK_PRESETS.filter((p) => p.category === presetTab).map((preset) => {
            const isActive = rackName === preset.code;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={`p-3 rounded-xl border-2 text-left transition flex flex-col justify-between gap-1.5 cursor-pointer group ${
                  isActive
                    ? "border-brand-primary bg-white dark:bg-slate-800 shadow-md ring-2 ring-brand-primary/20"
                    : "border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 hover:border-brand-primary/40 hover:bg-white dark:hover:bg-slate-900"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {preset.badge}
                  </span>
                  {isActive && (
                    <div className="h-4 w-4 rounded-full bg-brand-primary text-white flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>
                  )}
                </div>

                <div className="space-y-0.5">
                  <div className="text-xs font-black text-slate-900 dark:text-white group-hover:text-brand-primary transition truncate">
                    {preset.name}
                  </div>
                  <div className="text-[11px] font-mono font-bold text-brand-primary">
                    {preset.code.split(" ")[0]}
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate" title={preset.description}>
                  {preset.shelves} Shelves • {preset.bins === 0 ? "Direct (0 Bins)" : `${preset.bins} Bins/Shelf`}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Form Left, Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Container */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 lg:p-7 shadow-xs space-y-6">
          <form onSubmit={handleCreate} className="space-y-6">
            {/* Storage Type & Rack Name */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8">
                <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Rack / Unit Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={rackName}
                  onChange={(e) => setRackName(e.target.value)}
                  placeholder="e.g. BEX-01 (Beximco), GST-01, Wall Rack 1"
                  required
                  className="w-full h-12 text-base font-bold px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-brand-primary outline-none transition"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Unit Type
                </label>
                <select
                  value={rackType}
                  onChange={(e) => setRackType(e.target.value)}
                  className="w-full h-12 text-sm font-bold px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-brand-primary outline-none transition cursor-pointer"
                >
                  <option value="RACK">Standard Rack</option>
                  <option value="REFRIGERATOR">Refrigerator (Cold)</option>
                  <option value="CABINET">Lockable Cabinet</option>
                  <option value="DRAWER">Counter Drawer</option>
                </select>
              </div>
            </div>

            {/* Shelves Setup */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Layers className="h-4 w-4 text-brand-primary" />
                Shelves Configuration
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                    Shelf Name Prefix
                  </label>
                  <input
                    type="text"
                    value={shelfPrefix}
                    onChange={(e) => setShelfPrefix(e.target.value)}
                    placeholder="e.g. Shelf, Level"
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

              {/* Custom Individual Shelf Labels Toggle */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Individual Shelf Names / Categories
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Assign specific company (Beximco, Square) or therapy to each shelf
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setUseCustomShelfLabels(!useCustomShelfLabels)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        useCustomShelfLabels
                          ? "bg-brand-primary text-white shadow-xs"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                      }`}
                    >
                      {useCustomShelfLabels ? "Custom Naming ON" : "+ Customize Shelves"}
                    </button>
                  </div>
                </div>

                {useCustomShelfLabels && (
                  <div className="space-y-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Quick Fill Each Shelf:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={fillCompanyShelves}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 hover:bg-blue-100 transition cursor-pointer"
                        >
                          🏢 Fill Top Companies
                        </button>
                        <button
                          type="button"
                          onClick={fillGenericShelves}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900 hover:bg-purple-100 transition cursor-pointer"
                        >
                          💊 Fill Generic Therapies
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1 divide-y divide-slate-100 dark:divide-slate-800">
                      {Array.from({ length: totalShelves }, (_, idx) => {
                        const sNum = idx + 1;
                        const currentVal = customShelfNames[idx] || "";
                        return (
                          <div key={idx} className="pt-2 first:pt-0 flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 w-16 shrink-0">
                              Shelf {sNum}:
                            </span>
                            <input
                              type="text"
                              value={currentVal}
                              placeholder={`e.g. Shelf ${sNum} - Beximco (Napa) or Gastric`}
                              onChange={(e) => {
                                const next = [...customShelfNames];
                                next[idx] = e.target.value;
                                setCustomShelfNames(next);
                              }}
                              className="flex-1 h-9 text-xs font-semibold px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white focus:border-brand-primary focus:bg-white outline-none"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bins Setup */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Box className="h-4 w-4 text-emerald-500" />
                Bins Configuration
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                    Bin Name Prefix
                  </label>
                  <input
                    type="text"
                    value={binPrefix}
                    onChange={(e) => setBinPrefix(e.target.value)}
                    placeholder="e.g. Bin, Slot"
                    className="w-full h-11 text-sm font-bold px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-brand-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                    Bins per Shelf (0 – 50)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={binsPerShelf}
                    onChange={(e) => setBinsPerShelf(parseInt(e.target.value, 10) || 0)}
                    className="w-full h-11 text-sm font-bold px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-brand-primary outline-none"
                  />
                </div>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 flex items-start gap-2">
                <span className="text-amber-500 font-bold shrink-0">💡 Note:</span>
                <span>
                  <strong>0 Bins (Recommended):</strong> Medicines are placed directly on each shelf (e.g., <em>{rackName || "Rack"} › Shelf 1</em>).
                  Only specify bins if you physically use plastic bin boxes or divided slots inside the shelf.
                </span>
              </div>
            </div>

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
                    <span>Creating Rack...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-5 w-5" />
                    <span>Create Rack</span>
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
              <span className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                {totalShelves} Shelves
              </span>
              <span className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                {totalBins} Total Bins
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[460px] pr-2 space-y-3 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 font-sans">
              <div className="flex items-center gap-2 font-black text-slate-900 dark:text-white text-base">
                <Archive className="h-5 w-5 text-brand-primary" />
                <span>{previewStructure.rackName}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary font-bold">
                  RACK
                </span>
              </div>
            </div>

            <div className="pl-4 space-y-2 border-l-2 border-brand-primary/30 ml-3">
              {previewStructure.shelves.slice(0, 8).map((sh, sIdx) => (
                <div
                  key={sIdx}
                  className="p-3 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800"
                >
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 font-sans text-sm">
                    <Layers className="h-4 w-4 text-blue-500" />
                    <span>{sh.name}</span>
                    <span className="text-xs text-slate-400 font-normal">
                      ({sh.bins.length} bins)
                    </span>
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
                  + {previewStructure.shelves.length - 8} more shelves will be generated...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
