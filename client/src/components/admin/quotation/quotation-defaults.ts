export interface QuotationColumn {
  key: string;
  label: string;
  width?: string;
}

export interface SoftwareRow {
  sl: number | string;
  scope: string;
  particulars: string;
  amount?: number | string;
}

export interface HardwareRow {
  sl: number | string;
  product: string;
  specifications: string;
  amount: number | string;
}

export const DEFAULT_SOFTWARE_COLUMNS: QuotationColumn[] = [
  { key: "sl", label: "SL", width: "8%" },
  { key: "scope", label: "SCOPE OF WORK / MODULE", width: "32%" },
  { key: "particulars", label: "TECHNICAL PARTICULARS & FEATURES", width: "60%" },
];

export const DEFAULT_HARDWARE_COLUMNS: QuotationColumn[] = [
  { key: "sl", label: "SL", width: "8%" },
  { key: "product", label: "PRODUCT / ITEM", width: "32%" },
  { key: "specifications", label: "SPECIFICATIONS", width: "45%" },
  { key: "amount", label: "AMOUNT (BDT)", width: "15%" },
];

export const DEFAULT_SOFTWARE_ROWS: SoftwareRow[] = [
  {
    sl: 1,
    scope: "Pharmacy POS & Billing Terminal",
    particulars:
      "High-speed medicine search by generic & brand, batch/lot tracking, barcode scanner support, and instant thermal receipt printing",
  },
  {
    sl: 2,
    scope: "Medicine Inventory & Expiry Management",
    particulars:
      "Auto alert for near-expiry and expired medicines, stock level notifications, multi-shelf/rack management",
  },
  {
    sl: 3,
    scope: "Supplier & Purchase Order System",
    particulars:
      "Supplier ledger, automated PO generation, purchase return handling and accounts payable synchronization",
  },
  {
    sl: 4,
    scope: "Customer Ledger & Prescription Management",
    particulars:
      "Customer credit/due management, digital prescription upload and patient purchase history lookup",
  },
  {
    sl: 5,
    scope: "Multi-Branch & Central Control",
    particulars:
      "Centralized super-admin control, inter-branch medicine transfer, and unified financial analytics",
  },
  {
    sl: 6,
    scope: "Accounts & Financial Reporting",
    particulars:
      "Daily sales summaries, profit & loss statement, expense tracking, and VAT/tax calculation reports",
  },
  {
    sl: 7,
    scope: "Security, Role-Based Access & Cloud Backup",
    particulars:
      "Granular permissions for cashier, pharmacist and manager. Automatic daily cloud database backup and SSL protection",
  },
];

export const DEFAULT_HARDWARE_ROWS: HardwareRow[] = [
  {
    sl: 1,
    product: "POS Thermal Receipt Printer (80mm)",
    specifications: "High-speed thermal printing with auto-cutter, USB + LAN dual interface",
    amount: 6500,
  },
  {
    sl: 2,
    product: "Heavy-Duty Cash Drawer",
    specifications: "5 bill / 8 coin compartments with RJ11 auto kick-out interface",
    amount: 4500,
  },
  {
    sl: 3,
    product: "1D / 2D Omnidirectional Barcode Scanner",
    specifications: "High-speed hands-free scanning for blister packs, boxes & digital screens",
    amount: 3800,
  },
  {
    sl: 4,
    product: "Thermal Paper Rolls (Pack of 10)",
    specifications: "80mm x 70mm premium BPA-free thermal receipt rolls",
    amount: 800,
  },
];

export const DEFAULT_UNIFIED_TERMS_AND_CONDITIONS = `
<h3>Project Implementation & Deployment Timeline</h3>
<p><strong>Step 1: Planning & Pharmacy Configuration</strong><br/>System setup, database isolation, medicine generic database indexing, branch and user profile setup.</p>
<p><strong>Step 2: Training & Hardware Integration</strong><br/>Barcode scanner, thermal printer, and cash drawer configuration with on-site or remote staff training.</p>
<p><strong>Step 3: Data Migration & Go-Live</strong><br/>Opening stock import via Excel, live billing validation, and official deployment.</p>
<p><strong>Technology Stack:</strong> Enterprise Next.js, React, Node.js, Express, PostgreSQL, Prisma ORM, Tailwind CSS.</p>
<h3>Terms & Conditions:</h3>
<ol>
  <li>This price quotation is exclusive of applicable VAT and government taxes unless stated.</li>
  <li>To commence onboarding, a 50% advance payment is required, with remaining balance payable upon successful software handover.</li>
  <li>This official quotation is valid for 15 days from the date of issuance.</li>
  <li>Free technical support and updates are provided for the initial 3 months.</li>
  <li>Custom feature requests beyond the agreed scope will be evaluated and charged on an hourly milestone basis.</li>
</ol>
`.trim();
