"use client";

import React, { useState, useEffect, useRef } from "react";
import { fetchApi } from "@/lib/api";
import { showAlert } from "@/lib/swal";
import { OwnerModule } from "./DashboardSidebar";
import {
  ArrowLeft,
  PlusCircle,
  Loader2,
  Check,
  Building2,
  Layers,
  Sparkles,
} from "lucide-react";

interface CreateStorageGroupViewProps {
  selectedBranchId: string;
  onNavigate: (module: OwnerModule) => void;
}

type GroupType = "COMPANY" | "GENERIC" | "SPECIAL" | "CUSTOM";

export function CreateStorageGroupView({
  selectedBranchId,
  onNavigate,
}: CreateStorageGroupViewProps) {
  const [groupName, setGroupName] = useState("");
  const [placementNote, setPlacementNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fetch unique manufacturers & generics in background to auto-detect type
  const [existingCompanies, setExistingCompanies] = useState<string[]>([]);
  const [existingGenerics, setExistingGenerics] = useState<string[]>([]);

  useEffect(() => {
    if (!selectedBranchId) return;
    const fetchInventoryData = async () => {
      try {
        const res = await fetchApi<any>(
          `/inventory/branch/${encodeURIComponent(selectedBranchId)}?limit=1000`
        );
        const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        const compSet = new Set<string>();
        const genSet = new Set<string>();

        items.forEach((item: any) => {
          const comp = item.product?.manufacturer || item.manufacturer || item.product?.brandName;
          if (comp && typeof comp === "string" && comp.trim()) compSet.add(comp.trim());

          const gen = item.product?.genericName || item.genericName;
          if (gen && typeof gen === "string" && gen.trim()) genSet.add(gen.trim());
        });

        setExistingCompanies(Array.from(compSet));
        setExistingGenerics(Array.from(genSet));
      } catch (err) {
        // Silently catch background hint error
      }
    };

    fetchInventoryData();
  }, [selectedBranchId]);

  // Form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      showAlert.error("Missing Name", "Please enter a storage group name.");
      return;
    }

    try {
      setSubmitting(true);

      const nameLower = groupName.trim().toLowerCase();

      // Automatically detect group type behind the scenes without bothering user
      let detectedType: GroupType = "CUSTOM";
      if (
        existingCompanies.some(
          (c) => nameLower.includes(c.toLowerCase()) || c.toLowerCase().includes(nameLower)
        )
      ) {
        detectedType = "COMPANY";
      } else if (
        existingGenerics.some(
          (g) => nameLower.includes(g.toLowerCase()) || g.toLowerCase().includes(nameLower)
        )
      ) {
        detectedType = "GENERIC";
      } else if (
        nameLower.includes("fridge") ||
        nameLower.includes("freeze") ||
        nameLower.includes("cold") ||
        nameLower.includes("ice") ||
        nameLower.includes("insulin")
      ) {
        detectedType = "SPECIAL";
      }

      // Store storage group as clean top-level rack (0 shelves, 0 bins)
      const payload = {
        name: groupName.trim(),
        branchId: selectedBranchId && selectedBranchId !== "all" ? selectedBranchId : undefined,
        type: detectedType,
        description: placementNote.trim() || undefined,
        numberOfShelves: 0,
        binsPerShelf: 0,
      };

      const res = await fetchApi<any>("/locations/quick-rack", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res?.success || (res as any)?.rack || (res as any)?.id) {
        showAlert.toast("Storage group created successfully!", "success");
        onNavigate("loc_group_list");
      } else {
        showAlert.error("Creation Failed", res.message || "Failed to create group.");
      }
    } catch (err: any) {
      console.error("Create group error:", err);
      showAlert.error("Error", err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate("loc_group_list")}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Group List</span>
        </button>

        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Storage Management
        </span>
      </div>

      {/* Main Clean Creation Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
        {/* Header */}
        <div className="border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-brand-primary/10 text-brand-primary">
              <PlusCircle className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Create Storage Group
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Just give your group a name. It can be a company, generic, or any store area.
              </p>
            </div>
          </div>
        </div>

        {/* Minimal 1-Input Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Storage Group Name */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Storage Group Name <span className="text-rose-500">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              required
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., Beximco, Square, Paracetamol, Gastric, Front Counter..."
              className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm sm:text-base font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition shadow-2xs"
            />
            <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
              Examples: Company corner (e.g. <em>Beximco</em>), Generic therapy (e.g. <em>Paracetamol</em>), or shop area (e.g. <em>Counter 1</em>, <em>Fridge</em>).
            </p>
          </div>

          {/* 2. Optional Placement Note */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
              Physical Location / Note <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <input
              type="text"
              value={placementNote}
              onChange={(e) => setPlacementNote(e.target.value)}
              placeholder="e.g., Behind Cash Counter, Right Wall Shelf, or Main Fridge"
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Helps sales counter staff locate medicines quickly without remembering shelf numbers.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => onNavigate("loc_group_list")}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || !groupName.trim()}
              className="px-6 py-2.5 rounded-xl bg-brand-primary hover:opacity-90 disabled:opacity-50 text-white text-xs sm:text-sm font-black transition flex items-center gap-2 cursor-pointer shadow-md shadow-brand-primary/20 active:scale-95"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 stroke-[3]" />
                  <span>Save Storage Group</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
