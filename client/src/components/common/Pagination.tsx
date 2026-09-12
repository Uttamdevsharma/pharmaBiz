"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
  showDetails?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 10,
  onPageChange,
  className = "",
  showDetails = true,
}: PaginationProps) {
  if (totalPages <= 1 && (!totalItems || totalItems <= pageSize)) {
    return null;
  }

  // Calculate page number range with ellipsis windowing
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push("...");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }
      pages.push(totalPages);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  const startRecord = totalItems !== undefined ? Math.min((currentPage - 1) * pageSize + 1, totalItems) : undefined;
  const endRecord = totalItems !== undefined ? Math.min(currentPage * pageSize, totalItems) : undefined;

  return (
    <div
      className={`px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 ${className}`}
    >
      {showDetails && (
        <div className="font-medium text-slate-600 dark:text-slate-400">
          {totalItems !== undefined && totalItems > 0 ? (
            <>
              Showing <span className="font-bold text-slate-900 dark:text-white">{startRecord}</span> to{" "}
              <span className="font-bold text-slate-900 dark:text-white">{endRecord}</span> of{" "}
              <span className="font-bold text-slate-900 dark:text-white">{totalItems}</span> records
            </>
          ) : (
            <>
              Page <span className="font-bold text-slate-900 dark:text-white">{currentPage}</span> of{" "}
              <span className="font-bold text-slate-900 dark:text-white">{totalPages}</span>
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5 ml-auto">
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold transition flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed text-xs shadow-xs"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Previous</span>
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1 px-1">
          {pageNumbers.map((p, idx) => {
            if (p === "...") {
              return (
                <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 font-mono text-xs select-none">
                  ...
                </span>
              );
            }
            const isCurrent = p === currentPage;
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange(p as number)}
                className={`min-w-[2rem] h-8 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center ${
                  isCurrent
                    ? "bg-brand-primary text-white font-black shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold transition flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed text-xs shadow-xs"
        >
          <span>Next</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
