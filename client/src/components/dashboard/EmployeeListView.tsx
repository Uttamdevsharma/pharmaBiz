"use client";

import React, { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { OwnerModule } from "./DashboardSidebar";
import {
  Users,
  Search,
  Phone,
  Mail,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Briefcase,
  UserX,
  UserCheck,
} from "lucide-react";
import { Pagination } from "@/components/common/Pagination";
import { useBranchContext } from "@/context/BranchContext";

interface EmployeeListViewProps {
  selectedBranchId?: string;
  onSelectEmployee: (employeeId: string) => void;
  onNavigate?: (module: OwnerModule) => void;
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
  isPermanent?: boolean;
  documentsSubmitted?: boolean;
  nidNumber?: string | null;
  nidFrontUrl?: string | null;
  resignationDate?: string | null;
}

function EmployeeListSkeleton() {
  return (
    <div className="space-y-4 w-full mx-auto animate-pulse">
      <div className="h-10 bg-slate-200 dark:bg-slate-800 w-1/3 rounded-none" />
      <div className="h-12 bg-slate-100 dark:bg-slate-800/60 rounded-none border border-slate-200 dark:border-slate-800" />
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-none overflow-hidden">
        <div className="h-11 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800" />
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-14 flex items-center px-4 gap-6">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 w-8" />
              <div className="h-9 w-9 bg-slate-200 dark:bg-slate-800 shrink-0" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 flex-1" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 w-24" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 w-16" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 w-32" />
              <div className="h-7 bg-slate-200 dark:bg-slate-800 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EmployeeListView({
  selectedBranchId: propBranchId,
  onSelectEmployee,
  onNavigate,
}: EmployeeListViewProps) {
  const { selectedBranchId: contextBranchId } = useBranchContext();
  const effectiveBranchId = propBranchId !== undefined ? propBranchId : contextBranchId;

  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [error, setError] = useState<string | null>(null);

  const loadEmployees = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const currentMonth = new Date().toISOString().slice(0, 7);
      const queryParams = new URLSearchParams();
      if (effectiveBranchId && effectiveBranchId !== "all") {
        queryParams.append("branchId", effectiveBranchId);
      }
      queryParams.append("month", currentMonth);
      queryParams.append("includeInactive", "true");

      const res = await fetchApi<EmployeeItem[]>(
        `/accounting/salaries/employees?${queryParams.toString()}`
      );
      if (res.success && res.data) {
        // Exclude Company Owner and Super Admin from branch staff list
        const branchStaff = res.data.filter(
          (emp) => emp.role !== "COMPANY_OWNER" && emp.role !== "SUPER_ADMIN"
        );
        setEmployees(branchStaff);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load employee list");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [effectiveBranchId]);

  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const q = searchQuery.toLowerCase().trim();
    return employees.filter((emp) => {
      const nameMatch = emp.name && emp.name.toLowerCase().includes(q);
      const usernameMatch = emp.username && emp.username.toLowerCase().includes(q);
      const emailMatch = emp.email && emp.email.toLowerCase().includes(q);
      const phoneMatch = emp.phone && emp.phone.includes(q);
      const roleMatch =
        (emp.customRoleName && emp.customRoleName.toLowerCase().includes(q)) ||
        (emp.pharmacyRoleName && emp.pharmacyRoleName.toLowerCase().includes(q)) ||
        emp.role.toLowerCase().includes(q);

      return nameMatch || usernameMatch || emailMatch || phoneMatch || roleMatch;
    });
  }, [employees, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const paginatedEmployees = filteredEmployees.slice((page - 1) * pageSize, page * pageSize);

  if (loading && employees.length === 0) {
    return <EmployeeListSkeleton />;
  }

  return (
    <div className="space-y-4 w-full mx-auto">
      {/* Top Header - Compact, Clean Typography */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-primary" />
            Employee List
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Staff members assigned to this branch.
          </p>
        </div>

        <button
          onClick={() => loadEmployees(true)}
          disabled={refreshing}
          className="p-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition rounded-none disabled:opacity-50 cursor-pointer self-start sm:self-auto"
          title="Refresh List"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-brand-primary" : ""}`} />
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-medium flex items-center gap-2 rounded-none">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Clean Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 sm:p-4 rounded-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee by name, username, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm outline-none focus:border-brand-primary dark:text-white"
            />
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            Total Staff: <span className="font-bold text-slate-800 dark:text-slate-200">{filteredEmployees.length}</span>
          </div>
        </div>
      </div>

      {/* Table Section: Columns = SL, Employee Name, Role, Status, Contact, Action */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-xs sm:text-sm">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-brand-primary" />
            Loading employees...
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs sm:text-sm">
            No employees found for this branch.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/75 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">SL</th>
                  <th className="py-3 px-4">Employee Name</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300">
                {paginatedEmployees.map((emp, index) => {
                  const sl = (page - 1) * pageSize + index + 1;
                  const initial = (emp.name || emp.username || "E").charAt(0).toUpperCase();

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* SL */}
                      <td className="py-3 px-4 text-center text-xs text-slate-400">
                        {sl}
                      </td>

                      {/* Employee Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-none bg-brand-primary/10 text-brand-primary font-bold flex items-center justify-center text-xs border border-brand-primary/20 shrink-0">
                            {initial}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {emp.name || emp.username}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              @{emp.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-none">
                          <Briefcase className="h-3 w-3 text-slate-400" />
                          <span>{emp.customRoleName || emp.pharmacyRoleName || emp.role.replace(/_/g, " ")}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          {emp.isActive === false ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-none">
                              <UserX className="h-3 w-3" />
                              <span>Resigned</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-none">
                              <UserCheck className="h-3 w-3" />
                              <span>Active</span>
                            </span>
                          )}

                          {emp.isPermanent ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-none">
                              Permanent
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700 rounded-none">
                              Contractual
                            </span>
                          )}

                          {emp.documentsSubmitted || emp.nidNumber || emp.nidFrontUrl ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                              <span>Docs Uploaded</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                              <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                              <span>Docs Pending</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4 text-xs font-mono text-slate-600 dark:text-slate-400">
                        {emp.phone && (
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{emp.phone}</span>
                          </div>
                        )}
                        {emp.email && (
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                            <Mail className="h-3 w-3 text-slate-400" />
                            <span>{emp.email}</span>
                          </div>
                        )}
                        {!emp.phone && !emp.email && <span className="text-slate-400">—</span>}
                      </td>

                      {/* Action: Strictly just Details */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onSelectEmployee(emp.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold rounded-none transition cursor-pointer"
                          title="View Employee Details"
                        >
                          <Eye className="h-3.5 w-3.5 text-brand-primary" />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={filteredEmployees.length}
          pageSize={pageSize}
          onPageChange={setPage}
          alwaysShow={true}
          rounded="none"
        />
      </div>
    </div>
  );
}
