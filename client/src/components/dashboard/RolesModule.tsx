"use client";

import React from "react";
import { ShieldCheck, Check, X } from "lucide-react";

export function RolesModule() {
  const roles = [
    {
      role: "Company Owner",
      code: "COMPANY_OWNER",
      scope: "Tenant HQ (Full Platform Control)",
      description: "Controls billing, subscription, branches, staff hiring, and company-wide financial reports.",
    },
    {
      role: "Regional Admin",
      code: "REGIONAL_ADMIN",
      scope: "Assigned Region / Multi-Branch",
      description: "Approves inter-branch stock transfers and monitors regional store performance (Growth+ Plan).",
    },
    {
      role: "Branch Manager",
      code: "BRANCH_MANAGER",
      scope: "Single Assigned Branch",
      description: "Authorizes refunds/voids, controlled drug prescriptions, and manages local stock adjustments.",
    },
    {
      role: "Cashier",
      code: "CASHIER",
      scope: "Counter POS (Online & Offline)",
      description: "Executes POS checkout, barcode scans, accepts payments, and queues offline sales.",
    },
    {
      role: "Auditor",
      code: "AUDITOR",
      scope: "Read-Only Compliance",
      description: "Accesses audit trails, VAT records, and compliance reports without editing privileges.",
    },
  ];

  const permissions = [
    { name: "Execute POS Checkout", owner: true, regional: false, manager: true, cashier: true, auditor: false },
    { name: "Authorize Controlled Drugs", owner: true, regional: false, manager: true, cashier: false, auditor: false },
    { name: "Authorize Voids & Refunds", owner: true, regional: false, manager: true, cashier: false, auditor: false },
    { name: "Adjust Branch Stock", owner: true, regional: false, manager: true, cashier: false, auditor: false },
    { name: "Approve Inter-Branch Transfers", owner: true, regional: true, manager: false, cashier: false, auditor: false },
    { name: "Branch Price Overrides", owner: true, regional: true, manager: false, cashier: false, auditor: false },
    { name: "Add / Edit Staff & Assign Branches", owner: true, regional: false, manager: false, cashier: false, auditor: false },
    { name: "Manage Subscriptions & Invoicing", owner: true, regional: false, manager: false, cashier: false, auditor: false },
    { name: "View Audit Trails & VAT Reports", owner: true, regional: true, manager: true, cashier: false, auditor: true },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Role-Based Access Control (RBAC)</h2>
        <p className="text-xs text-slate-500">Security boundaries and permission matrix across operational roles</p>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {roles.map((r) => (
          <div
            key={r.code}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-subtle-bg text-brand-primary">
                {r.code}
              </span>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{r.role}</h3>
            <div className="text-xs font-semibold text-slate-500">Scope: {r.scope}</div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{r.description}</p>
          </div>
        ))}
      </div>

      {/* Permission Matrix Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">System Permission Matrix</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Capability</th>
                <th className="px-4 py-3 font-semibold text-center">Owner</th>
                <th className="px-4 py-3 font-semibold text-center">Regional Admin</th>
                <th className="px-4 py-3 font-semibold text-center">Branch Manager</th>
                <th className="px-4 py-3 font-semibold text-center">Cashier</th>
                <th className="px-4 py-3 font-semibold text-center">Auditor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {permissions.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-center">
                    {p.owner ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <X className="h-4 w-4 text-slate-300 mx-auto" />}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.regional ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <X className="h-4 w-4 text-slate-300 mx-auto" />}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.manager ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <X className="h-4 w-4 text-slate-300 mx-auto" />}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.cashier ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <X className="h-4 w-4 text-slate-300 mx-auto" />}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.auditor ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <X className="h-4 w-4 text-slate-300 mx-auto" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
