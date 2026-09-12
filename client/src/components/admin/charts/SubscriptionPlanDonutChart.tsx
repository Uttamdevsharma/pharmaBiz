"use client";

import React, { useState } from "react";
import { Layers, PieChart } from "lucide-react";

export interface SubscriptionByPlanItem {
  tier: "STARTER" | "GROWTH" | "ENTERPRISE";
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface SubscriptionPlanDonutData {
  starter: number;
  growth: number;
  enterprise: number;
  total: number;
  breakdown: SubscriptionByPlanItem[];
}

interface SubscriptionPlanDonutChartProps {
  data?: SubscriptionPlanDonutData;
  loading?: boolean;
}

export function SubscriptionPlanDonutChart({ data, loading }: SubscriptionPlanDonutChartProps) {
  const [activeTier, setActiveTier] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-[360px] animate-pulse">
        <div className="space-y-2">
          <div className="h-5 w-44 bg-slate-200 dark:bg-slate-800 rounded-md" />
          <div className="h-3 w-56 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
        </div>
        <div className="h-44 w-44 mx-auto rounded-full bg-slate-100 dark:bg-slate-800/40" />
      </div>
    );
  }

  const breakdown = data?.breakdown || [
    { tier: "STARTER" as const, name: "Starter", count: 0, percentage: 0, color: "#3B82F6" },
    { tier: "GROWTH" as const, name: "Growth", count: 0, percentage: 0, color: "#10B981" },
    { tier: "ENTERPRISE" as const, name: "Enterprise", count: 0, percentage: 0, color: "#8B5CF6" },
  ];
  const total = data?.total || 0;

  // Donut geometry constants
  const size = 200;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2; // 87
  const circumference = 2 * Math.PI * radius; // ~546.6

  // Calculate arc offsets
  let accumulatedLength = 0;
  const slices = breakdown.map((item) => {
    const fraction = total > 0 ? item.count / total : 0;
    const strokeLength = fraction * circumference;
    const offset = accumulatedLength;
    accumulatedLength += strokeLength;

    return {
      ...item,
      fraction,
      strokeLength,
      offset,
    };
  });

  const activeItem = slices.find((s) => s.tier === activeTier);

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Subscriptions by Plan</h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Layers className="h-3 w-3" />
              {total} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Plan distribution among subscriptions started in this timeframe</p>
        </div>
      </div>

      {/* Donut Chart & Center Stats */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-3">
        <div className="relative flex items-center justify-center shrink-0">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="transform -rotate-90 overflow-visible"
          >
            {/* Background ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              className="text-slate-100 dark:text-slate-800"
              strokeWidth={strokeWidth}
            />

            {/* Slices */}
            {total > 0 &&
              slices.map((slice) => {
                if (slice.count === 0) return null;
                const isHovered = activeTier === slice.tier;
                return (
                  <circle
                    key={slice.tier}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={`${slice.strokeLength} ${circumference}`}
                    strokeDashoffset={-slice.offset}
                    strokeLinecap="butt"
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setActiveTier(slice.tier)}
                    onMouseLeave={() => setActiveTier(null)}
                  />
                );
              })}
          </svg>

          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            {activeItem ? (
              <>
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white leading-none">
                  {activeItem.count}
                </span>
                <span
                  className="text-[11px] font-bold mt-1"
                  style={{ color: activeItem.color }}
                >
                  {activeItem.name} ({activeItem.percentage}%)
                </span>
              </>
            ) : (
              <>
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white leading-none">
                  {total}
                </span>
                <span className="text-[11px] text-slate-400 font-medium mt-1">
                  Subscriptions
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend Breakdown */}
        <div className="flex flex-col gap-3 w-full sm:w-52">
          {slices.map((item) => {
            const isHovered = activeTier === item.tier;
            return (
              <div
                key={item.tier}
                onMouseEnter={() => setActiveTier(item.tier)}
                onMouseLeave={() => setActiveTier(null)}
                className={`p-2.5 rounded-xl border transition cursor-pointer ${
                  isHovered
                    ? "bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 shadow-xs"
                    : "border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {item.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {item.count}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1 font-medium">
                      ({item.percentage}%)
                    </span>
                  </div>
                </div>

                {/* Mini percentage bar */}
                <div className="mt-1.5 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
