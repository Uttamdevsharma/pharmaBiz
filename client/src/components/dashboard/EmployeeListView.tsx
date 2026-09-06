"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { OwnerModule } from "./DashboardSidebar";
import {
  Users,
  Search,
  Filter,
  DollarSign,
  Shield,
  Briefcase,
  Phone,
  Mail,
  Edit,
  Eye,
  CreditCard,
  Building,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  Sparkles,
  ArrowRight,
  Info,
  CalendarCheck,
  UserX,
  UserCheck,
} from "lucide-react";

interface EmployeeListViewProps {
  selectedBranchId?: string;
  onSelectEmployee: (employeeId: string) => void;
  onNavigate?: (module: OwnerModule) => void;
}

interface SalaryConfig {
  id?: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  paymentMethod?: string | null;
  paymentDetails?: string | null;
  effectiveDate?: string | null;
  notes?: string | null;
}

interface EmployeeItem {
  id: string;
  name?: string;
  username: string;
  email?: string;
  phone?: string;
  role: string;
  customRoleName?: string;
  pharmacyRoleName?: string;
  avatarUrl?: string;
  branchId?: string;
  branchName?: string;
  createdAt: string;
  isActive?: boolean;
  resignationDate?: string | null;
  resignationReason?: string | null;
  deactivatedAt?: string | null;
  salaryConfig?: SalaryConfig | null;
  monthStatus?: {
    month: string;
    netSalary: number;
    paidAmount: number;
    dueAmount: number;
    status: string;
  };
}

export function EmployeeListView({
  selectedBranchId,
  onSelectEmployee,
  onNavigate,
}: EmployeeListViewProps) {
  const { user } = useAuth();
  const isOwner = user?.role === "COMPANY_OWNER" || user?.role === "SUPER_ADMIN";
  const isBranchManager = user?.role === "BRANCH_MANAGER" || user?.pharmacyRoleName?.toLowerCase().includes("branch manager");
  const canSetBaseSalary = isOwner || isBranchManager;

  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "RESIGNED" | "ALL">("ACTIVE");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Salary Structure Modal
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [targetEmployee, setTargetEmployee] = useState<EmployeeItem | null>(null);
  const [baseSalary, setBaseSalary] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);

  const loadEmployees = async () => {
    if (!selectedBranchId) return;
    try {
      setLoading(true);
      setError(null);
      const currentMonth = new Date().toISOString().slice(0, 7);
      const res = await fetchApi<EmployeeItem[]>(
        `/accounting/salaries/employees?branchId=${selectedBranchId}&month=${currentMonth}&includeInactive=true`
      );
      if (res.success && res.data) {
        // Double-check Company Owner & Super Admin exclusion on client side
        const branchStaff = res.data.filter(
          (emp) => emp.role !== "COMPANY_OWNER" && emp.role !== "SUPER_ADMIN"
        );
        setEmployees(branchStaff);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load branch employee list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [selectedBranchId]);

  const handleOpenStructureModal = (emp: EmployeeItem) => {
    setTargetEmployee(emp);
    setBaseSalary(emp.salaryConfig?.baseSalary ?? "");
    setIsStructureModalOpen(true);
  };

  const handleSaveStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmployee || !selectedBranchId) return;
    if (baseSalary === "" || Number(baseSalary) < 0) {
      setError("Base salary cannot be negative");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await fetchApi("/accounting/salaries/config", {
        method: "POST",
        body: JSON.stringify({
          branchId: selectedBranchId,
          userId: targetEmployee.id,
          baseSalary: Number(baseSalary),
        }),
      });

      if (res.success) {
        setSuccessMsg(`Salary package for ${targetEmployee.name || targetEmployee.username} updated!`);
        setIsStructureModalOpen(false);
        setTargetEmployee(null);
        loadEmployees();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setError(res.message || "Failed to save salary configuration");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save salary configuration");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (emp.name && emp.name.toLowerCase().includes(q)) ||
      emp.username.toLowerCase().includes(q) ||
      (emp.email && emp.email.toLowerCase().includes(q)) ||
      (emp.phone && emp.phone.includes(q)) ||
      (emp.customRoleName && emp.customRoleName.toLowerCase().includes(q));

    const matchesRole = roleFilter === "ALL" || emp.role === roleFilter;

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && emp.isActive !== false) ||
      (statusFilter === "RESIGNED" && emp.isActive === false);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const activeStaff = employees.filter((e) => e.isActive !== false);
  const resignedCount = employees.filter((e) => e.isActive === false).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Employee List</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Staff members assigned to this branch and their salary package configurations. (Company Owner is excluded).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate?.("sal_attendance")}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl transition"
          >
            <CalendarCheck className="w-4 h-4 text-blue-500" />
            Attendance
          </button>
          <button
            onClick={() => onNavigate?.("sal_management")}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition shadow-md shadow-emerald-600/20"
          >
            <DollarSign className="w-4 h-4" />
            Salary Management
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-sm animate-fadeIn">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-xs font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="ml-auto text-xs font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Scope Banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-700 dark:text-blue-300">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Branch Staff Roster:</span> Only staff members assigned to this specific branch are displayed. Company Owner and Super Admin are strictly excluded from branch employee payroll. Resigned staff records and history are permanently preserved.
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, username, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            {[
              { id: "ACTIVE", label: "Active Staff" },
              { id: "RESIGNED", label: `Resigned (${resignedCount})` },
              { id: "ALL", label: `All (${employees.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  statusFilter === tab.id
                    ? "bg-white dark:bg-slate-900 text-emerald-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Role Filter Buttons */}
          <div className="flex items-center gap-1.5">
            {["ALL", "BRANCH_MANAGER", "PHARMACIST", "STAFF"].map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  roleFilter === role
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {role === "ALL" ? "All Roles" : role.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="mt-3 text-sm text-slate-500">Loading branch employees...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="p-4 bg-emerald-500/10 text-emerald-600 rounded-2xl mb-4">
              <Users className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No employees found</h3>
            <p className="mt-1 text-sm text-slate-500 max-w-md">
              {searchQuery ? "No staff match your search criteria." : "No staff members are assigned to this branch yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Role / Title</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">Salary Package</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filteredEmployees.map((emp) => {
                  const cfg = emp.salaryConfig;
                  const hasPackage = cfg && cfg.netSalary > 0;

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center text-sm">
                            {(emp.name || emp.username).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {emp.name || emp.username}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">@{emp.username}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <Briefcase className="w-3 h-3 text-slate-400" />
                          {emp.customRoleName || emp.pharmacyRoleName || emp.role.replace("_", " ")}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {emp.isActive === false ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <UserX className="w-3 h-3" />
                              Resigned
                            </span>
                            {emp.resignationDate && (
                              <div className="text-[10px] text-slate-400">
                                {new Date(emp.resignationDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <UserCheck className="w-3 h-3" />
                            Active
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 text-xs text-slate-600 dark:text-slate-400">
                          {emp.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {emp.phone}
                            </div>
                          )}
                          {emp.email && (
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {emp.email}
                            </div>
                          )}
                          {!emp.phone && !emp.email && <span className="text-slate-400">—</span>}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {hasPackage ? (
                          <div>
                            <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                              ৳{Number(cfg.netSalary).toLocaleString()}
                              <span className="text-[11px] font-normal text-slate-400 ml-1">/ mo</span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Base: ৳{Number(cfg.baseSalary).toLocaleString()}
                              {cfg.allowances > 0 && ` + ৳${Number(cfg.allowances).toLocaleString()}`}
                              {cfg.deductions > 0 && ` - ৳${Number(cfg.deductions).toLocaleString()}`}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                            Not Configured
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canSetBaseSalary && (
                            <button
                              onClick={() => handleOpenStructureModal(emp)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500/10 hover:text-emerald-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
                              title="Set or update Base Salary (Owner & Branch Manager only)"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              Base Salary
                            </button>
                          )}
                          <button
                            onClick={() => onSelectEmployee(emp.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                            title="View Full Profile & Salary History"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Details
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
      </div>

      {/* Salary Structure Modal */}
      {isStructureModalOpen && targetEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Configure Base Salary</h3>
                  <p className="text-xs text-slate-500">For {targetEmployee.name || targetEmployee.username}</p>
                </div>
              </div>
              <button
                onClick={() => setIsStructureModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStructure} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                  Base Salary (৳) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  placeholder="0.00"
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(e.target.value === "" ? "" : parseFloat(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="p-3 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-700 dark:text-blue-300">
                <span className="font-semibold">Note:</span> Only Pharmacy Owner and Branch Manager can set or update Base Salary. Payment account and method are selected when actually disbursing salary in Salary Management.
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsStructureModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Base Salary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
