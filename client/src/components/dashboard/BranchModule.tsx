"use client";

import React, { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { showAlert } from "@/lib/swal";
import { getClientPlanConfig } from "@/lib/planLimits";
import { Pagination } from "@/components/common/Pagination";
import {
  Store,
  Plus,
  Edit2,
  Eye,
  Loader2,
  MapPin,
  Phone,
  Mail,
  AlertCircle,
  Users,
  Package,
  ShoppingCart,
  Search,
  X,
  Save,
  CheckCircle2,
  Power,
  Calendar,
  Shield,
  Building,
} from "lucide-react";

interface BranchModuleProps {
  onNavigate?: (module: any) => void;
}

// Module cache
let cachedBranchList: any[] = [];
let cachedBranchProfile: any = null;

export function setCachedBranchData(branches: any[], profile: any = null) {
  cachedBranchList = branches;
  if (profile) cachedBranchProfile = profile;
}

export function BranchModule({ onNavigate }: BranchModuleProps) {
  const [branches, setBranches] = useState<any[]>(() => cachedBranchList);
  const [profile, setProfile] = useState<any>(() => cachedBranchProfile);
  const [loading, setLoading] = useState(() => cachedBranchList.length === 0);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Pagination for Branch List Table
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    location: "",
    phone: "",
    email: "",
    isActive: true,
  });

  // Branch Details Modal State
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsBranch, setDetailsBranch] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [staffPage, setStaffPage] = useState(1);
  const staffPageSize = 5;

  const loadData = async () => {
    try {
      if (cachedBranchList.length === 0) setLoading(true);
      const [bRes, pRes] = await Promise.all([
        fetchApi("/branches"),
        fetchApi("/tenant/profile"),
      ]);

      if (bRes.success) {
        setBranches(bRes.data || []);
        cachedBranchList = bRes.data || [];
      }
      if (pRes.success) {
        setProfile(pRes.data);
        cachedBranchProfile = pRes.data;
      }
    } catch (err) {
      console.error("Failed to load branches", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const tier = (profile?.tier || "TRIAL").toUpperCase();
  const planConfig = getClientPlanConfig(tier);
  const maxBranches = planConfig.maxBranches;
  const isLimitReached = branches.length >= maxBranches;

  // Filtered & Paginated Branches
  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      const matchSearch =
        !searchTerm.trim() ||
        b.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && b.isActive) ||
        (statusFilter === "INACTIVE" && !b.isActive);

      return matchSearch && matchStatus;
    });
  }, [branches, searchTerm, statusFilter]);

  const totalItems = filteredBranches.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const paginatedBranches = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBranches.slice(start, start + pageSize);
  }, [filteredBranches, currentPage, pageSize]);

  // Open Details Modal & Fetch Full Details
  const handleOpenDetails = async (branch: any) => {
    try {
      setDetailsLoading(true);
      setStaffPage(1);
      setDetailsModalOpen(true);
      setDetailsBranch(branch); // show preliminary data while loading full details

      const res = await fetchApi(`/branches/${branch.id}`);
      if (res.success && res.data) {
        setDetailsBranch(res.data);
      }
    } catch (err) {
      console.error("Failed to load branch details", err);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Staff Pagination for Details View (excluding pharmacy owner / super admin)
  const staffList = useMemo(() => {
    const rawUsers = detailsBranch?.users || [];
    return rawUsers.filter(
      (u: any) => u.role !== "COMPANY_OWNER" && u.role !== "SUPER_ADMIN"
    );
  }, [detailsBranch]);
  const totalStaffItems = staffList.length;
  const totalStaffPages = Math.ceil(totalStaffItems / staffPageSize) || 1;
  const paginatedStaff = useMemo(() => {
    const start = (staffPage - 1) * staffPageSize;
    return staffList.slice(start, start + staffPageSize);
  }, [staffList, staffPage, staffPageSize]);

  // Open Edit Modal
  const handleOpenEdit = (b: any) => {
    setEditingBranch(b);
    setEditFormData({
      name: b.name,
      location: b.location || "",
      phone: b.phone || "",
      email: b.email || "",
      isActive: b.isActive,
    });
    setEditError(null);
    setEditModalOpen(true);
  };

  // Save Edit Changes
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch) return;

    try {
      setEditSaving(true);
      setEditError(null);

      const res = await fetchApi(`/branches/${editingBranch.id}`, {
        method: "PATCH",
        body: JSON.stringify(editFormData),
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to update branch");
      }

      await loadData();
      setEditModalOpen(false);
      setEditingBranch(null);
      showAlert.success("Branch Updated!", `"${editFormData.name}" has been updated successfully.`, {
        timer: 1500,
      });
    } catch (err: any) {
      setEditError(err.message || "Failed to save branch changes");
    } finally {
      setEditSaving(false);
    }
  };

  // Toggle Active/Inactive Status
  const handleToggleStatus = async (b: any) => {
    const newStatus = !b.isActive;
    const actionText = newStatus ? "activate" : "deactivate";

    if (!confirm(`Are you sure you want to ${actionText} "${b.name}"?`)) return;

    try {
      const res = await fetchApi(`/branches/${b.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: newStatus }),
      });
      if (res.success) {
        await loadData();
        showAlert.success(
          newStatus ? "Branch Activated" : "Branch Deactivated",
          `"${b.name}" status changed to ${newStatus ? "Active" : "Inactive"}.`,
          { timer: 1500 }
        );
      } else {
        showAlert.error("Action Failed", res.message || "Failed to change branch status");
      }
    } catch (err: any) {
      showAlert.error("Action Failed", err.message || "Error occurred");
    }
  };

  const formatRoleName = (role: string) => {
    switch (role) {
      case "COMPANY_OWNER":
        return "Company Owner";
      case "BRANCH_MANAGER":
        return "Branch Manager";
      case "INVENTORY_EXECUTIVE":
        return "Inventory Executive";
      case "CASHIER":
        return "Cashier";
      case "ACCOUNTS":
        return "Accounts";
      case "REGIONAL_ADMIN":
        return "Regional Admin";
      case "AUDITOR":
        return "Auditor";
      default:
        return role ? role.replace(/_/g, " ") : "Staff";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-400 mb-1">
            <span>Branch Management</span>
            <span>/</span>
            <span className="text-brand-primary">Branch List</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Store className="h-7 w-7 text-brand-primary" />
            Branch Store Network
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Managing <strong className="text-slate-800 dark:text-slate-200">{branches.length}</strong> of{" "}
            <strong>{maxBranches >= 999 ? "Unlimited" : maxBranches}</strong> physical branch stores ({planConfig.name})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate && onNavigate("branch_create")}
            disabled={isLimitReached}
            className="h-11 px-5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            Create Branch
          </button>
        </div>
      </div>

      {/* Plan Capacity Alert */}
      {isLimitReached && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <strong>Branch Limit Reached ({branches.length}/{maxBranches >= 999 ? "Unlimited" : maxBranches})</strong>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                Your <strong>{planConfig.name}</strong> allows up to {maxBranches >= 999 ? "Unlimited" : maxBranches} physical branch stores. Upgrade your subscription plan to add more.
              </p>
            </div>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate("subscription_plans")}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shrink-0"
            >
              Upgrade Plan
            </button>
          )}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search branches by name, address, or phone..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-12 pl-11 pr-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm sm:text-base font-semibold text-slate-900 dark:text-white placeholder:text-xs sm:placeholder:text-sm placeholder:text-slate-400 outline-none focus:border-brand-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="h-12 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-brand-primary"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>

          {(searchTerm || statusFilter !== "ALL") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("ALL");
                setCurrentPage(1);
              }}
              className="h-12 w-12 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl transition"
              title="Clear Filters"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Branches Table with Branch Name, Address, Staff Assigned, and Actions */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary mb-2" />
            <p className="text-sm font-semibold">Loading branch locations...</p>
          </div>
        ) : filteredBranches.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <Store className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-base font-bold text-slate-700 dark:text-slate-300">No branches found</p>
            <p className="text-xs text-slate-500 mt-1">
              {searchTerm || statusFilter !== "ALL"
                ? "Try clearing your search or status filter."
                : "Click 'Create Branch' above to register your first branch store."}
            </p>
          </div>
        ) : (
          <div className="table-responsive-container">
            <table className="w-full min-w-[750px] text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-black text-xs">
                  <th className="py-4 px-4 w-12 text-center">#</th>
                  <th className="py-4 px-5">Branch Name</th>
                  <th className="py-4 px-5">Address</th>
                  <th className="py-4 px-4 text-center">Staff Assigned</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {paginatedBranches.map((b, index) => {
                  const serialNo = (currentPage - 1) * pageSize + index + 1;

                  return (
                    <tr
                      key={b.id}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition ${
                        !b.isActive ? "opacity-60 bg-slate-50/30 dark:bg-slate-900/40" : ""
                      }`}
                    >
                      <td className="py-4 px-4 text-center text-xs font-bold text-slate-400">
                        {serialNo}
                      </td>

                      {/* 1. Branch Name */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <span className="h-9 w-9 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                            <Store className="h-5 w-5" />
                          </span>
                          <div>
                            <div className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                              <span>{b.name}</span>
                            </div>
                            <div className="text-xs text-slate-400 font-normal">
                              {b.phone ? b.phone : "No phone provided"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Address */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                          <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[260px]" title={b.location || "N/A"}>
                            {b.location || "No physical address provided"}
                          </span>
                        </div>
                      </td>

                      {/* 3. Staff Assigned */}
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                          <Users className="h-3.5 w-3.5 text-brand-primary" />
                          {b._count?.users || b.users?.length || 0} Staff
                        </span>
                      </td>

                      {/* 4. Actions: Exactly 3 buttons (Details, Edit, Deactivate/Activate) */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Button 1: Details */}
                          <button
                            onClick={() => handleOpenDetails(b)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 transition cursor-pointer"
                            title="View Branch Details & Staff"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Details</span>
                          </button>

                          {/* Button 2: Edit */}
                          <button
                            onClick={() => handleOpenEdit(b)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                            title="Edit Branch"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </button>

                          {/* Button 3: Deactivate / Activate */}
                          <button
                            onClick={() => handleToggleStatus(b)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                              b.isActive
                                ? "bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/50"
                                : "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50"
                            }`}
                            title={b.isActive ? "Deactivate Branch" : "Activate Branch"}
                          >
                            <Power className="h-3.5 w-3.5" />
                            <span>{b.isActive ? "Deactivate" : "Activate"}</span>
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

        {/* Branch List Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          alwaysShow={true}
        />
      </div>

      {/* ========================================================================= */}
      {/* 🌟 1. BRANCH DETAILS MODAL WITH INFORMATION & PAGINATED STAFF TABLE        */}
      {/* ========================================================================= */}
      {detailsModalOpen && detailsBranch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full my-auto overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                  <Store className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                      {detailsBranch.name}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        detailsBranch.isActive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          detailsBranch.isActive ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      />
                      {detailsBranch.isActive ? "Operating" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Branch Store Overview &amp; Assigned Personnel Profile
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDetailsModalOpen(false);
                  setDetailsBranch(null);
                }}
                className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {detailsLoading && (
                <div className="p-2 text-center text-xs text-brand-primary font-bold flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Refreshing real-time details...</span>
                </div>
              )}

              {/* Top Overview Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {/* Card 1: Address */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-brand-primary" />
                    <span>Location Address</span>
                  </div>
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    {detailsBranch.location || "No physical address provided"}
                  </div>
                </div>

                {/* Card 2: Contact */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-brand-primary" />
                    <span>Contact Info</span>
                  </div>
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    {detailsBranch.phone || "No phone"}
                  </div>
                  {detailsBranch.email && (
                    <div className="text-xs text-slate-500 truncate" title={detailsBranch.email}>
                      {detailsBranch.email}
                    </div>
                  )}
                </div>

                {/* Card 3: Total Staff */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-brand-primary" />
                    <span>Assigned Staff</span>
                  </div>
                  <div className="font-black text-xl text-slate-900 dark:text-white">
                    {staffList.length} <span className="text-xs font-semibold text-slate-400">Members</span>
                  </div>
                </div>
              </div>

              {/* Staff Members List Section with Table & Pagination */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-brand-primary" />
                    <h4 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                      Assigned Staff Profiles ({totalStaffItems})
                    </h4>
                  </div>
                  {onNavigate && (
                    <button
                      type="button"
                      onClick={() => {
                        setDetailsModalOpen(false);
                        onNavigate("staff_create");
                      }}
                      className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Assign New Staff
                    </button>
                  )}
                </div>

                {staffList.length === 0 ? (
                  <div className="p-10 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 space-y-2">
                    <Users className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700" />
                    <p className="font-bold text-slate-600 dark:text-slate-300 text-sm">
                      No staff members assigned to this branch yet.
                    </p>
                    <p className="text-xs text-slate-400">
                      You can assign employees to this branch from the Staff Management section.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="table-responsive-container">
                      <table className="w-full min-w-[600px] text-left text-sm border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-black text-xs">
                            <th className="py-3 px-3 w-10 text-center">#</th>
                            <th className="py-3 px-4">Staff Name &amp; Username</th>
                            <th className="py-3 px-4">Designation / Role</th>
                            <th className="py-3 px-4 text-right">Contact Info</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                          {paginatedStaff.map((user: any, idx: number) => {
                            const staffSerial = (staffPage - 1) * staffPageSize + idx + 1;
                            return (
                              <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                <td className="py-3 px-3 text-center text-xs font-bold text-slate-400">
                                  {staffSerial}
                                </td>

                                {/* Name & Username */}
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2.5">
                                    <div className="h-8 w-8 rounded-full bg-brand-primary/10 text-brand-primary font-bold text-xs flex items-center justify-center shrink-0">
                                      {(user.name || user.username || "S")[0].toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                                        {user.name || user.username}
                                      </div>
                                      <div className="text-xs text-slate-400">
                                        @{user.username}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Role */}
                                <td className="py-3 px-4">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                    <Shield className="h-3 w-3 text-brand-primary" />
                                    {user.pharmacyRoleName || user.customRoleName || formatRoleName(user.role)}
                                  </span>
                                </td>

                                {/* Contact */}
                                <td className="py-3 px-4 text-xs text-right">
                                  <div className="space-y-0.5 inline-block text-left">
                                    {user.phone ? (
                                      <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                                        <Phone className="h-3 w-3 text-slate-400" />
                                        <span>{user.phone}</span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 italic">No phone</span>
                                    )}
                                    {user.email && (
                                      <div className="flex items-center gap-1 text-slate-500">
                                        <Mail className="h-3 w-3 text-slate-400" />
                                        <span>{user.email}</span>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Staff List Pagination */}
                    <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                      <Pagination
                        currentPage={staffPage}
                        totalPages={totalStaffPages}
                        totalItems={totalStaffItems}
                        pageSize={staffPageSize}
                        onPageChange={setStaffPage}
                        alwaysShow={true}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
              <button
                type="button"
                onClick={() => {
                  setDetailsModalOpen(false);
                  setDetailsBranch(null);
                }}
                className="h-10 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs sm:text-sm font-bold transition"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🌟 2. IN-PLACE EDIT BRANCH MODAL POPUP                                     */}
      {/* ========================================================================= */}
      {editModalOpen && editingBranch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full my-auto overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Edit Branch Store
                  </h3>
                  <p className="text-xs text-slate-500">
                    Update information for <strong className="text-slate-700 dark:text-slate-300">{editingBranch.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditModalOpen(false);
                  setEditingBranch(null);
                }}
                className="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-sm">
              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200 dark:border-rose-900 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Branch Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="e.g. Dhanmondi Outlet #2"
                  className="w-full h-11 px-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Physical Address / Location <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.location}
                  onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                  placeholder="Street, Area, City"
                  className="w-full h-11 px-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-brand-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    placeholder="01700000000"
                    className="w-full h-11 px-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Branch Email
                  </label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    placeholder="branch@pharmacy.com"
                    className="w-full h-11 px-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="h-11 px-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between cursor-pointer">
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Active Operating Status
                  </span>
                  <input
                    type="checkbox"
                    checked={editFormData.isActive}
                    onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                    className="h-4 w-4 text-brand-primary rounded accent-brand-primary"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setEditModalOpen(false);
                    setEditingBranch(null);
                  }}
                  className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="h-10 px-5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-xs sm:text-sm shadow flex items-center gap-2 disabled:opacity-50"
                >
                  {editSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save Changes</span>
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
