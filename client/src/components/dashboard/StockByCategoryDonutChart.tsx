"use client";

import React, { useState } from "react";
import { PieChart, Boxes, PackageCheck, Layers, Info } from "lucide-react";

export interface CategoryStockItem {
  categoryName: string;
  stockUnits: number;
  stockValue: number;
  itemCount: number;
  percentage: number;
}

interface StockByCategoryDonutChartProps {
  data?: CategoryStockItem[];
  loading?: boolean;
  totalStockUnits?: number;
  totalStockValue?: number;
  branchName?: string;
}

const CATEGORY_COLORS = [
  "#10B981", // Emerald
  "#6366F1", // Indigo
  "#F59E0B", // Amber
  "#06B6D4", // Cyan
  "#EC4899", // Pink
  "#8B5CF6", // Purple
  "#F97316", // Orange
  "#14B8A6", // Teal
  "#EF4444", // Red
  "#3B82F6", // Blue
  "#84CC16", // Lime
  "#64748B", // Slate
];

export function StockByCategoryDonutChart({
  data = [],
  loading = false,
  totalStockUnits = 0,
  totalStockValue = 0,
  branchName = "Selected Branch",
}: StockByCategoryDonutChartProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
        </div>
        <div className="h-64 bg-slate-100 dark:bg-slate-800/40 rounded-2xl" />
      </div>
    );
  }

  // Calculate totals if not directly passed
  const categories = data || [];
  const calculatedTotalUnits = totalStockUnits || categories.reduce((sum, item) => sum + (item.stockUnits || 0), 0);
  const calculatedTotalValue = totalStockValue || categories.reduce((sum, item) => sum + (item.stockValue || 0), 0);

  // SVG Donut geometry constants
  const size = 220;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2; // 96
  const circumference = 2 * Math.PI * radius; // ~603.18

  // Calculate arc slices
  let accumulatedLength = 0;
  const slices = categories.map((cat, idx) => {
    const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
    const fraction = calculatedTotalUnits > 0 ? (cat.stockUnits || 0) / calculatedTotalUnits : 0;
    const strokeLength = fraction * circumference;
    const offset = accumulatedLength;
    accumulatedLength += strokeLength;

    const percentage = cat.percentage ?? (calculatedTotalUnits > 0 ? Math.round(fraction * 1000) / 10 : 0);

    return {
      ...cat,
      color,
      fraction,
      strokeLength,
      offset,
      percentage,
    };
  });

  const activeSlice = slices.find((s) => s.categoryName === activeCategory);

  return (
    <div className="p-6 2xl:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <PieChart className="h-5 w-5 text-brand-primary" />
              Stock by Category
            </h3>
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
              <Boxes className="h-3.5 w-3.5" />
              {categories.length} Categories
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real inventory stock quantity and cost valuation breakdown by category for {branchName}
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 self-start sm:self-auto">
          <div>
            <span className="text-slate-400 font-medium mr-1">Total Stock:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {calculatedTotalUnits.toLocaleString()} units
            </span>
          </div>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <div>
            <span className="text-slate-400 font-medium mr-1">Total Valuation:</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              ৳{Math.round(calculatedTotalValue).toLocaleString("en-BD")}
            </span>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {categories.length === 0 || calculatedTotalUnits === 0 ? (
        <div className="py-16 text-center space-y-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
            <Boxes className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Inventory Stock Data</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              There are no available product stock items recorded in inventory for the selected scope.
            </p>
          </div>
        </div>
      ) : (
        /* Donut Chart & Category Breakdown Grid */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-center">
          {/* Donut Graphic (Left side) */}
          <div className="xl:col-span-5 flex flex-col items-center justify-center p-4 relative">
            <div className="relative flex items-center justify-center shrink-0">
              <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="transform -rotate-90 overflow-visible"
              >
                {/* Background Track Circle */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  className="text-slate-100 dark:text-slate-800"
                  strokeWidth={strokeWidth}
                />

                {/* Category Donut Slices */}
                {slices.map((slice) => {
                  if (slice.stockUnits === 0) return null;
                  const isHovered = activeCategory === slice.categoryName;
                  return (
                    <circle
                      key={slice.categoryName}
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      fill="none"
                      stroke={slice.color}
                      strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                      strokeDasharray={`${slice.strokeLength} ${circumference}`}
                      strokeDashoffset={-slice.offset}
                      strokeLinecap="butt"
                      className="cursor-pointer transition-all duration-200 drop-shadow-sm"
                      onMouseEnter={() => setActiveCategory(slice.categoryName)}
                      onMouseLeave={() => setActiveCategory(null)}
                    />
                  );
                })}
              </svg>

              {/* Donut Center Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-4">
                {activeSlice ? (
                  <>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {activeSlice.categoryName}
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
                      {activeSlice.stockUnits.toLocaleString()} <span className="text-xs text-slate-400 font-normal">units</span>
                    </span>
                    <span
                      className="text-xs font-extrabold mt-1 px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${activeSlice.color}20`, color: activeSlice.color }}
                    >
                      {activeSlice.percentage}% of stock
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Total Stock
                    </span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white font-mono leading-none mt-1">
                      {calculatedTotalUnits.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium mt-1">
                      {categories.length} Categories
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Category Legend & Breakdown Grid (Right side) */}
          <div className="xl:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[340px] content-scrollbar overflow-y-auto pr-1">
            {slices.map((item) => {
              const isHovered = activeCategory === item.categoryName;
              return (
                <div
                  key={item.categoryName}
                  onMouseEnter={() => setActiveCategory(item.categoryName)}
                  onMouseLeave={() => setActiveCategory(null)}
                  className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-2 ${
                    isHovered
                      ? "bg-slate-50 dark:bg-slate-800/90 border-slate-300 dark:border-slate-600 shadow-sm scale-[1.01]"
                      : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-3.5 w-3.5 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {item.categoryName}
                      </span>
                    </div>

                    <span
                      className="text-[10px] font-black px-2 py-0.5 rounded-full shrink-0"
                      style={{ backgroundColor: `${item.color}15`, color: item.color }}
                    >
                      {item.percentage}%
                    </span>
                  </div>

                  <div className="flex items-end justify-between pt-1 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">Stock Quantity</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {item.stockUnits.toLocaleString()} units
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-medium block">Cost Value</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ৳{Math.round(item.stockValue).toLocaleString("en-BD")}
                      </span>
                    </div>
                  </div>

                  {/* Percentage Progress Bar */}
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(2, item.percentage)}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
