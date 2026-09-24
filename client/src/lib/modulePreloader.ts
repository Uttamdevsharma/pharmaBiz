import { fetchApi } from "./api";
import { OwnerModule } from "@/components/dashboard/DashboardSidebar";
import { setCachedSalesData } from "@/components/dashboard/SalesHistoryView";
import { setCachedDueSalesData } from "@/components/dashboard/DueSalesView";
import { setCachedProductData } from "@/components/dashboard/ProductListView";
import { setCachedStockData } from "@/components/dashboard/StockListView";
import { setCachedOverviewData } from "@/components/dashboard/OverviewModule";
import { setCachedSuppliersData } from "@/components/dashboard/SuppliersView";
import { setCachedBillsData } from "@/components/dashboard/BillListView";
import { setCachedEmployeesData } from "@/components/dashboard/EmployeeListView";
import { setCachedStaffData } from "@/components/dashboard/StaffModule";
import { setCachedBranchData } from "@/components/dashboard/BranchModule";

/**
 * Preloads all essential data for the destination dashboard module while
 * the user stays on the current page with a smooth crawling progress bar.
 * Once preloading resolves, the destination page is mounted directly with data populated.
 */
export async function preloadModuleData(mod: OwnerModule, branchId?: string): Promise<boolean> {
  try {
    const effectiveBranchId = branchId && branchId !== "all" ? branchId : undefined;

    switch (mod) {
      // 🛒 Sales History
      case "pos_history": {
        const today = new Date().toISOString().split("T")[0];
        const params = new URLSearchParams();
        params.append("page", "1");
        params.append("limit", "10");
        params.append("startDate", today);
        params.append("endDate", today);
        if (effectiveBranchId) params.append("branchId", effectiveBranchId);

        const res = await fetchApi<any>(`/sales?${params.toString()}`);
        if (res && res.success && res.data) {
          const pagination = (res as any).pagination || res.meta;
          setCachedSalesData(
            res.data,
            pagination?.totalPages || 1,
            pagination?.total || res.data.length || 0
          );
          return true;
        }
        return false;
      }

      // 🛒 Due Sales & Collections
      case "pos_due_sales": {
        const params = new URLSearchParams();
        params.append("page", "1");
        params.append("limit", "10");
        params.append("paymentStatus", "DUE");
        if (effectiveBranchId) params.append("branchId", effectiveBranchId);

        const res = await fetchApi<any>(`/sales?${params.toString()}`);
        if (res && res.success && res.data) {
          const pagination = (res as any).pagination || res.meta;
          setCachedDueSalesData(
            res.data,
            pagination?.totalPages || 1,
            pagination?.total || res.data.length || 0
          );
          return true;
        }
        return false;
      }

      // 📦 Product Catalog List
      case "inv_product_list": {
        const branchParam = effectiveBranchId ? `&branchId=${effectiveBranchId}` : "";
        const [pRes, cRes] = await Promise.all([
          fetchApi<any>(`/products?page=1&limit=10${branchParam}`),
          fetchApi<any>("/products/variants/categories"),
        ]);

        if (pRes && pRes.success && pRes.data) {
          const meta = pRes.meta;
          setCachedProductData(
            pRes.data,
            cRes?.data || [],
            meta?.totalPages || 1,
            meta?.total || pRes.data.length || 0
          );
          return true;
        }
        return false;
      }

      // 🔄 Branch Stock Batches List
      case "stock_stock_list": {
        const targetPath = effectiveBranchId
          ? `/inventory/branch/${effectiveBranchId}?limit=1000`
          : `/inventory/branch/all?limit=1000`;
        const res = await fetchApi<any>(targetPath);
        if (res && res.success && res.data) {
          setCachedStockData(res.data);
          return true;
        }
        return false;
      }

      // 📊 Overview / Dashboard Analytics
      case "overview": {
        const branchParam = effectiveBranchId ? `&branchId=${effectiveBranchId}` : "";
        const res = await fetchApi<any>(`/reports/dashboard?period=30d${branchParam}`);
        if (res && res.success && res.data) {
          setCachedOverviewData(res.data);
          return true;
        }
        return false;
      }

      // 🏭 Suppliers List
      case "sup_suppliers": {
        const res = await fetchApi<any>("/suppliers?page=1&limit=10");
        if (res && res.success && res.data) {
          const meta = (res as any).pagination || res.meta;
          const totalPages = meta?.totalPages || Math.max(1, Math.ceil((meta?.total || 0) / 10));
          const totalCount = meta?.total ?? res.data.length ?? 0;
          setCachedSuppliersData(res.data, totalPages, totalCount);
          return true;
        }
        return false;
      }

      // 💸 Bills & Recurring Expenses
      case "exp_list":
      case "exp_recurring":
      case "exp_history": {
        if (effectiveBranchId) {
          const res = await fetchApi<any>(
            `/accounting/recurring-expenses?branchId=${effectiveBranchId}&includeInactive=true`
          );
          if (res && res.success && res.data) {
            setCachedBillsData(res.data);
            return true;
          }
        }
        return true;
      }

      // 👥 Employee Salary & List
      case "sal_employees":
      case "sal_management": {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const queryParams = new URLSearchParams();
        if (effectiveBranchId) queryParams.append("branchId", effectiveBranchId);
        queryParams.append("month", currentMonth);
        queryParams.append("includeInactive", "true");

        const res = await fetchApi<any>(`/accounting/salaries/employees?${queryParams.toString()}`);
        if (res && res.success && res.data) {
          const branchStaff = res.data.filter(
            (emp: any) => emp.role !== "COMPANY_OWNER" && emp.role !== "SUPER_ADMIN"
          );
          setCachedEmployeesData(branchStaff);
          return true;
        }
        return false;
      }

      // 👥 Staff Administration & Roles
      case "staff": {
        const [sRes, bRes, rRes] = await Promise.all([
          fetchApi<any>("/users"),
          fetchApi<any>("/branches"),
          fetchApi<any>("/users/roles"),
        ]);
        if (sRes && sRes.success && sRes.data) {
          setCachedStaffData(sRes.data, rRes?.data || [], bRes?.data || []);
          return true;
        }
        return false;
      }

      // 🏪 Branch Network
      case "branches": {
        const [bRes, pRes] = await Promise.all([
          fetchApi<any>("/branches"),
          fetchApi<any>("/tenant/profile"),
        ]);
        if (bRes && bRes.success && bRes.data) {
          setCachedBranchData(bRes.data, pRes?.data || null);
          return true;
        }
        return false;
      }

      // 💳 Financial Accounts
      case "acc_financial_accounts":
      case "acc_overview": {
        const branchParam = effectiveBranchId ? `?branchId=${effectiveBranchId}` : "";
        await fetchApi<any>(`/accounting/accounts${branchParam}`);
        return true;
      }

      // 💳 Transaction History
      case "acc_transaction_history": {
        const branchParam = effectiveBranchId ? `?branchId=${effectiveBranchId}` : "";
        await fetchApi<any>(`/accounting/transactions${branchParam}`);
        return true;
      }

      // Default: immediate resolution (forms, static configuration, or self-contained POS)
      default:
        return true;
    }
  } catch (err) {
    console.warn(`[preloadModuleData] Warning for module ${mod}:`, err);
    return false;
  }
}
