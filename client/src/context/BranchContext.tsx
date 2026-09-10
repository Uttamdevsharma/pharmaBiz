"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "./AuthContext";
import { Branch } from "@/types";

interface BranchContextType {
  branches: Branch[];
  selectedBranchId: string;
  setSelectedBranchId: (branchId: string) => void;
  currentBranch: Branch | null;
  isAllBranches: boolean;
  canSwitchBranch: boolean;
  isBranchLocked: boolean;
  loading: boolean;
  refreshBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextType>({
  branches: [],
  selectedBranchId: "",
  setSelectedBranchId: () => {},
  currentBranch: null,
  isAllBranches: true,
  canSwitchBranch: false,
  isBranchLocked: false,
  loading: true,
  refreshBranches: async () => {},
});

const STORAGE_KEY = "pharmacy_selected_branch_id";

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchIdState] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Determine if this user role is permitted to switch branches globally
  const canSwitchBranch = useMemo(() => {
    if (!user) return false;
    const role = user.role;
    return (
      role === "COMPANY_OWNER" ||
      role === "SUPER_ADMIN" ||
      role === "REGIONAL_ADMIN" ||
      role === "CTO" ||
      role === "PROJECT_MANAGER"
    );
  }, [user]);

  const isBranchLocked = Boolean(!canSwitchBranch && user?.branchId);

  // Load branches for this organization
  const refreshBranches = useCallback(async () => {
    if (!isAuthenticated) {
      setBranches([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetchApi<Branch[]>("/branches");
      if (res.success && Array.isArray(res.data)) {
        const activeOnly = res.data.filter((b) => b.isActive !== false);
        setBranches(activeOnly);

        // Branch-locked staff is always strictly bound to their assigned branch
        if (isBranchLocked && user?.branchId) {
          setSelectedBranchIdState(user.branchId);
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY, user.branchId);
          }
        } else if (canSwitchBranch) {
          // If owner, check localStorage for last selected branch
          const savedBranchId = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
          if (savedBranchId && activeOnly.some((b) => b.id === savedBranchId)) {
            setSelectedBranchIdState(savedBranchId);
          } else {
            // Default to All Branches (empty string)
            setSelectedBranchIdState("");
            if (typeof window !== "undefined") {
              localStorage.setItem(STORAGE_KEY, "");
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to load branches in BranchContext", err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isBranchLocked, user?.branchId, canSwitchBranch]);

  useEffect(() => {
    refreshBranches();
  }, [refreshBranches]);

  // Handle branch switching
  const handleSetSelectedBranchId = useCallback(
    (newBranchId: string) => {
      // If staff is branch-locked, disallow switching
      if (isBranchLocked) {
        return;
      }

      const normalized = newBranchId === "all" ? "" : newBranchId;
      setSelectedBranchIdState(normalized);

      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, normalized);
      }
    },
    [isBranchLocked]
  );

  const isAllBranches = !selectedBranchId || selectedBranchId === "" || selectedBranchId === "all";

  const currentBranch = useMemo(() => {
    if (isAllBranches) return null;
    return branches.find((b) => b.id === selectedBranchId) || null;
  }, [branches, selectedBranchId, isAllBranches]);

  const value = useMemo(
    () => ({
      branches,
      selectedBranchId,
      setSelectedBranchId: handleSetSelectedBranchId,
      currentBranch,
      isAllBranches,
      canSwitchBranch,
      isBranchLocked,
      loading,
      refreshBranches,
    }),
    [
      branches,
      selectedBranchId,
      handleSetSelectedBranchId,
      currentBranch,
      isAllBranches,
      canSwitchBranch,
      isBranchLocked,
      loading,
      refreshBranches,
    ]
  );

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranchContext() {
  return useContext(BranchContext);
}
