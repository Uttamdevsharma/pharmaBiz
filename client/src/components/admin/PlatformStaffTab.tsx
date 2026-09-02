"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/lib/api";
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Edit2,
  Lock,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  RefreshCw,
  Terminal,
  Cpu,
  FolderKanban,
  Save,
  Check,
} from "lucide-react";

interface PlatformStaff {
  id: string;
  name: string;
  username: string;
  email: string;
  phone?: string;
  role: "SUPER_ADMIN" | "CTO" | "PROJECT_MANAGER";
  isActive: boolean;
  createdAt: string;
}

export function PlatformStaffTab() {
  const { user: currentUser } = useAuth();
  const [staffList, setStaffList] = useState<PlatformStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Tab: "team" or "permissions"
  const [activeSection, setActiveSection] = useState<"team" | "permissions">("team");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<PlatformStaff | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    phone: "",
    password: "",
    role: "CTO" as "CTO" | "PROJECT_MANAGER" | "SUPER_ADMIN",
  });

  // Platform Permissions State
  const [permissionsHierarchy, setPermissionsHierarchy] = useState<any>(null);
  const [selectedRoleForPerms, setSelectedRoleForPerms] = useState<"CTO" | "PROJECT_MANAGER">("CTO");
  const [activeRolePerms, setActiveRolePerms] = useState<Record<string, string[]>>({});
  const [savingPerms, setSavingPerms] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const [staffRes, permRes] = await Promise.all([
        fetchApi<any>("/super-admin/staff"),
        fetchApi<any>("/super-admin/staff/permissions"),
      ]);

      if (staffRes.success) setStaffList(staffRes.data || []);
      if (permRes.success && permRes.data) {
        setPermissionsHierarchy(permRes.data);
        setActiveRolePerms(permRes.data.activePermissions || {});
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load platform staff team");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setFormData({
      name: "",
      email: "",
      username: "",
      phone: "",
      password: "",
      role: "CTO",
    });
    setErrorMsg(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (staff: PlatformStaff) => {
    if (staff.role === "SUPER_ADMIN" && currentUser?.role !== "SUPER_ADMIN") {
      alert("Super Admin root master account properties can only be altered by Super Admin.");
      return;
    }
    setEditingStaff(staff);
    setFormData({
      name: staff.name || "",
      email: staff.email || "",
      username: staff.username || "",
      phone: staff.phone || "",
      password: "",
      role: staff.role,
    });
    setErrorMsg(null);
    setIsAddModalOpen(true);
  };

  const handleSubmitStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrorMsg(null);

      if (editingStaff) {
        const res = await fetchApi<any>(`/super-admin/staff/${editingStaff.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            phone: formData.phone || undefined,
            role: formData.role,
            ...(formData.password ? { password: formData.password } : {}),
          }),
        });

        if (res.success) {
          setSuccessMsg(`Platform staff member ${formData.name} updated successfully.`);
          setIsAddModalOpen(false);
          loadData();
        } else {
          setErrorMsg(res.message || "Failed to update staff member");
        }
      } else {
        const res = await fetchApi<any>("/super-admin/staff", {
          method: "POST",
          body: JSON.stringify(formData),
        });

        if (res.success) {
          setSuccessMsg(`Platform staff member (${formData.role}) created successfully.`);
          setIsAddModalOpen(false);
          loadData();
        } else {
          setErrorMsg(res.message || "Failed to create staff member");
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error saving staff member");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (staff: PlatformStaff) => {
    if (staff.role === "SUPER_ADMIN") {
      alert("Super Admin account cannot be disabled.");
      return;
    }

    if (staff.id === currentUser?.id) {
      alert("You cannot disable your own active platform session.");
      return;
    }

    try {
      const res = await fetchApi<any>(`/super-admin/staff/${staff.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !staff.isActive }),
      });

      if (res.success) {
        setSuccessMsg(`Staff member ${staff.name} ${!staff.isActive ? "activated" : "deactivated"}.`);
        loadData();
      } else {
        setErrorMsg(res.message || "Failed to update status");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error toggling staff status");
    }
  };

  const handleDeleteStaff = async (staff: PlatformStaff) => {
    if (staff.role === "SUPER_ADMIN") {
      alert("Super Admin account cannot be removed under any circumstance.");
      return;
    }

    if (staff.id === currentUser?.id) {
      alert("You cannot delete your own active platform session.");
      return;
    }

    if (!confirm(`Are you sure you want to permanently remove platform staff account "${staff.username}"?`)) {
      return;
    }

    try {
      const res = await fetchApi<any>(`/super-admin/staff/${staff.id}`, {
        method: "DELETE",
      });

      if (res.success) {
        setSuccessMsg(`Account ${staff.username} deleted.`);
        loadData();
      } else {
        setErrorMsg(res.message || "Failed to delete staff account");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error deleting staff member");
    }
  };

  const handleTogglePerm = (permId: string) => {
    const current = activeRolePerms[selectedRoleForPerms] || [];
    const exists = current.includes(permId);
    const updated = exists ? current.filter((p) => p !== permId) : [...current, permId];

    setActiveRolePerms({
      ...activeRolePerms,
      [selectedRoleForPerms]: updated,
    });
  };

  const handleSaveRolePermissions = async () => {
    try {
      setSavingPerms(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetchApi<any>("/super-admin/staff/permissions", {
        method: "POST",
        body: JSON.stringify({
          role: selectedRoleForPerms,
          permissions: activeRolePerms[selectedRoleForPerms] || [],
        }),
      });

      if (res.success) {
        setSuccessMsg(`System permissions for ${selectedRoleForPerms} saved successfully.`);
      } else {
        setErrorMsg(res.message || "Failed to save permissions");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error saving permissions");
    } finally {
      setSavingPerms(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
        <span>Loading Platform Staff Console...</span>
      </div>
    );
  }

  const ctoCount = staffList.filter((s) => s.role === "CTO").length;
  const pmCount = staffList.filter((s) => s.role === "PROJECT_MANAGER").length;

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <ShieldCheck className="h-7 w-7 text-brand-primary" />
            Platform Staff & System Delegates
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Create and assign CTO and Project Manager platform roles with strict authorization boundaries under Super Admin control.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center gap-2 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Add Platform Staff
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Super Admin</span>
            <Lock className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">1 Root Owner</div>
          <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Immutable Master Account Protected
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Chief Technology Officers</span>
            <Cpu className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{ctoCount} Active CTOs</div>
          <div className="text-[11px] text-slate-400">Technical telemetry & logs management</div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Project Managers</span>
            <FolderKanban className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{pmCount} Managers</div>
          <div className="text-[11px] text-slate-400">Platform operations & tenant support</div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveSection("team")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeSection === "team"
              ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          Platform Staff Directory ({staffList.length})
        </button>
        <button
          onClick={() => setActiveSection("permissions")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeSection === "permissions"
              ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          CTO & PM System Permissions Matrix
        </button>
      </div>

      {/* SECTION 1: PLATFORM STAFF DIRECTORY */}
      {activeSection === "team" && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800 uppercase font-bold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Staff Member</th>
                  <th className="py-3.5 px-4">Platform Role</th>
                  <th className="py-3.5 px-4">Username / Login</th>
                  <th className="py-3.5 px-4">Phone</th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {staffList.map((member) => {
                  const isRootSuperAdmin = member.role === "SUPER_ADMIN";
                  const isCTO = member.role === "CTO";

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{member.name}</div>
                        <div className="text-xs text-slate-400">{member.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isRootSuperAdmin
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : isCTO
                              ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                              : "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                          }`}
                        >
                          {isRootSuperAdmin && <Lock className="h-3 w-3" />}
                          {member.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {member.username}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">{member.phone || "—"}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            member.isActive
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-red-500/10 text-red-600 dark:text-red-400"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${member.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                          {member.isActive ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {isRootSuperAdmin ? (
                          currentUser?.role === "SUPER_ADMIN" ? (
                            <button
                              onClick={() => handleOpenEdit(member)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 hover:bg-purple-100 transition"
                            >
                              Edit Profile
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 italic">
                              <Lock className="h-3 w-3" /> Root Protected
                            </span>
                          )
                        ) : (
                          <>
                            <button
                              onClick={() => handleOpenEdit(member)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleStatus(member)}
                              disabled={member.id === currentUser?.id}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition disabled:opacity-40 ${
                                member.isActive
                                  ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400"
                                  : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400"
                              }`}
                            >
                              {member.isActive ? "Disable" : "Enable"}
                            </button>
                            <button
                              onClick={() => handleDeleteStaff(member)}
                              disabled={member.id === currentUser?.id}
                              className="p-1 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition disabled:opacity-30"
                              title={member.id === currentUser?.id ? "Cannot delete own active session" : "Delete Account"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2: CTO & PROJECT MANAGER PERMISSIONS MATRIX */}
      {activeSection === "permissions" && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedRoleForPerms("CTO")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    selectedRoleForPerms === "CTO"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  CTO Permissions
                </button>
                <button
                  onClick={() => setSelectedRoleForPerms("PROJECT_MANAGER")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    selectedRoleForPerms === "PROJECT_MANAGER"
                      ? "bg-purple-600 text-white shadow-md"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Project Manager Permissions
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {selectedRoleForPerms === "CTO"
                  ? "Configure technical administration, system logs, and telemetry permissions for CTO delegates."
                  : "Configure platform operations, support assistance, and analytics permissions for Project Managers."}
              </p>
            </div>

            <button
              onClick={handleSaveRolePermissions}
              disabled={savingPerms}
              className="px-5 py-2.5 rounded-xl bg-brand-primary text-white text-xs sm:text-sm font-bold shadow-md transition flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {savingPerms ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Platform Permissions
            </button>
          </div>

          {/* Permissions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(permissionsHierarchy?.availablePermissions || []).map((perm: any) => {
              const currentList = activeRolePerms[selectedRoleForPerms] || [];
              const isGranted = currentList.includes(perm.id);

              return (
                <div
                  key={perm.id}
                  onClick={() => handleTogglePerm(perm.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                    isGranted
                      ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800/80"
                      : "bg-slate-50/40 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{perm.label}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{perm.id}</div>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {perm.category}
                    </span>
                  </div>

                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center transition shrink-0 ${
                      isGranted ? "bg-blue-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                    }`}
                  >
                    {isGranted ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT PLATFORM STAFF */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-brand-primary/10 text-brand-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                    {editingStaff ? "Edit Platform Delegate" : "Add Platform Delegate"}
                  </h3>
                  <p className="text-xs text-slate-400">CTO or Project Manager Account</p>
                </div>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitStaff} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Asif Mahmud"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="cto@platform.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingStaff}
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="asif_cto"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-brand-primary disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Platform Role *
                  </label>
                  <select
                    value={formData.role}
                    disabled={editingStaff?.role === "SUPER_ADMIN"}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-brand-primary disabled:opacity-50"
                  >
                    {editingStaff?.role === "SUPER_ADMIN" ? (
                      <option value="SUPER_ADMIN">Super Admin (Root Master)</option>
                    ) : (
                      <>
                        <option value="CTO">CTO (Tech & Logs)</option>
                        <option value="PROJECT_MANAGER">Project Manager (Operations)</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="01700000000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  {editingStaff ? "New Password (leave empty to keep current)" : "Password *"}
                </label>
                <input
                  type="password"
                  required={!editingStaff}
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min 6 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold shadow-lg transition flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingStaff ? "Update Staff" : "Create Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
