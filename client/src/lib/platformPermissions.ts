export interface PlatformPermissionDef {
  id: string;
  name: string;
  category: string;
}

export const PLATFORM_CATEGORIES = [
  "Pharmacies & Tenants",
  "Subscriptions & Billing",
  "Staff & Access Control",
  "Platform Administration",
] as const;

export const ALL_PLATFORM_PERMISSIONS: PlatformPermissionDef[] = [
  {
    id: "pharmacies.manage",
    name: "Manage Pharmacies",
    category: "Pharmacies & Tenants",
  },
  {
    id: "subscriptions.manage",
    name: "Manage Subscriptions",
    category: "Subscriptions & Billing",
  },
  {
    id: "plans.manage",
    name: "Manage Plans",
    category: "Subscriptions & Billing",
  },
  {
    id: "payments.view",
    name: "View Payments",
    category: "Subscriptions & Billing",
  },
  {
    id: "staff.create",
    name: "Create Staff",
    category: "Staff & Access Control",
  },
  {
    id: "staff.manage",
    name: "Manage Staff",
    category: "Staff & Access Control",
  },
  {
    id: "roles.manage",
    name: "Manage Roles & Permissions",
    category: "Staff & Access Control",
  },
  {
    id: "reports.view",
    name: "View Reports",
    category: "Platform Administration",
  },
  {
    id: "settings.manage",
    name: "Manage System Settings",
    category: "Platform Administration",
  },
  {
    id: "platform.data",
    name: "Manage Platform Data",
    category: "Platform Administration",
  },
];
