"use client";

import React, { useState } from "react";
import { TrendingUp, Calendar } from "lucide-react";

export interface GrowthPoint {
  label: string;
  date: string;
  count: number;
  cumulative: number;
}

interface PharmacyGrowthChartProps {
  data: GrowthPoint[];
  loading?: boolean;
}

export function PharmacyGrowthChart({ data, loading }: PharmacyGrowthChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-[360px] animate-pulse">
        <div className="space-y-2">
          <div className="h-5 w-44 bg-slate-200 dark:bg-slate-800 rounded-md" />
          <div className="h-3 w-64 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
        </div>
        <div className="h-44 w-full bg-slate-100 dark:bg-slate-800/40 rounded-xl" />
      </div>
    );
  }

  const points = data || [];
  const totalInPeriod = points.reduce((acc, p) => acc + (p.count || 0), 0);

  // SVG dimensions
  const width = 600;
  const height = 220;
  const padding = { top: 25, right: 25, bottom: 35, left: 35 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Compute scale max based on count or cumulative
  const maxVal = Math.max(
    ...points.map((p) => Math.max(p.count || 0, p.cumulative || 0)),
    3 // Minimum ceiling so grid looks good with 0 or 1
  );

  const getX = (idx: number) => {
    if (points.length <= 1) return padding.left + chartW / 2;
    return padding.left + (idx / (points.length - 1)) * chartW;
  };

  const getY = (val: number) => {
    return padding.top + chartH - (val / maxVal) * chartH;
  };

  // Build SVG path
  const coords = points.map((p, idx) => ({
    x: getX(idx),
    y: getY(p.count),
    cumulativeY: getY(p.cumulative),
    point: p,
    idx,
  }));

  const linePath = coords.length > 0
    ? coords.reduce((acc, curr, idx) => {
        if (idx === 0) return `M ${curr.x} ${curr.y}`;
        // Simple cubic bezier smoothing
        const prev = coords[idx - 1];
        const cx1 = prev.x + (curr.x - prev.x) / 2;
        const cy1 = prev.y;
        const cx2 = prev.x + (curr.x - prev.x) / 2;
        const cy2 = curr.y;
        return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${curr.x} ${curr.y}`;
      }, "")
    : "";

  const areaPath = coords.length > 0
    ? `${linePath} L ${coords[coords.length - 1].x} ${padding.top + chartH} L ${coords[0].x} ${padding.top + chartH} Z`
    : "";

  // Grid tick values (3 horizontal ticks)
  const yTicks = [0, Math.ceil(maxVal / 2), maxVal];

  // Smart label sampling to prevent crowding on large datasets (e.g. 31 days)
  const labelInterval = points.length > 15 ? Math.ceil(points.length / 8) : 1;

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Pharmacy Growth</h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="h-3 w-3" />
              +{totalInPeriod} in range
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Newly approved pharmacies trajectory over the selected timeframe</p>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
            <span className="text-[11px] font-medium">New Approvals</span>
          </div>
        </div>
      </div>

      {points.length === 0 ? (
        <div className="h-[220px] flex flex-col items-center justify-center text-slate-400 text-xs">
          <Calendar className="h-8 w-8 mb-2 stroke-1 text-slate-300 dark:text-slate-600" />
          <span>No pharmacy approvals recorded for this timeframe</span>
        </div>
      ) : (
        <div className="relative w-full">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-[220px] overflow-visible"
          >
            <defs>
              <linearGradient id="pharmacyGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {yTicks.map((tickVal, i) => {
              const yPos = getY(tickVal);
              return (
                <g key={i}>
                  <line
                    x1={padding.left}
                    y1={yPos}
                    x2={width - padding.right}
                    y2={yPos}
                    stroke="currentColor"
                    className="text-slate-100 dark:text-slate-800"
                    strokeDasharray={tickVal === 0 ? "0" : "3 3"}
                    strokeWidth="1"
                  />
                  <text
                    x={padding.left - 8}
                    y={yPos + 3}
                    textAnchor="end"
                    className="text-[10px] font-medium fill-slate-400 dark:fill-slate-500"
                  >
                    {tickVal}
                  </text>
                </g>
              );
            })}

            {/* Gradient Area Fill */}
            {areaPath && (
              <path
                d={areaPath}
                fill="url(#pharmacyGrowthGradient)"
                className="transition-all duration-300"
              />
            )}

            {/* Line Path */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#0ea5e9"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300 drop-shadow-xs"
              />
            )}

            {/* Data Dots & Interactive Areas */}
            {coords.map((c, i) => {
              const isHovered = hoveredIdx === i;
              return (
                <g key={i}>
                  {/* Invisible larger hover target */}
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r="12"
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />

                  {/* Visual Circle */}
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={isHovered ? "5.5" : "3.5"}
                    fill="#ffffff"
                    stroke="#0ea5e9"
                    strokeWidth={isHovered ? "3" : "2"}
                    className="transition-all duration-150 pointer-events-none"
                  />

                  {/* X-axis Label */}
                  {(i % labelInterval === 0 || i === coords.length - 1) && (
                    <text
                      x={c.x}
                      y={height - 8}
                      textAnchor="middle"
                      className="text-[10px] font-medium fill-slate-400 dark:fill-slate-500"
                    >
                      {c.point.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Floating Hover Tooltip */}
          {hoveredIdx !== null && coords[hoveredIdx] && (
            <div
              className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full z-20 px-3 py-2 rounded-xl bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 text-xs shadow-xl backdrop-blur-xs border border-white/10 dark:border-slate-800 transition-all duration-75"
              style={{
                left: `${(coords[hoveredIdx].x / width) * 100}%`,
                top: `${(coords[hoveredIdx].y / height) * 100 - 8}%`,
              }}
            >
              <div className="font-bold text-[11px] border-b border-white/10 dark:border-slate-200/50 pb-1 mb-1">
                {coords[hoveredIdx].point.label}
              </div>
              <div className="flex items-center justify-between gap-4 text-[10px]">
                <span className="text-slate-300 dark:text-slate-600">New Approved:</span>
                <span className="font-bold text-sky-400 dark:text-sky-600 text-[11px]">
                  {coords[hoveredIdx].point.count}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 text-[10px]">
                <span className="text-slate-400 dark:text-slate-500">Cumulative:</span>
                <span className="font-semibold text-slate-200 dark:text-slate-700">
                  {coords[hoveredIdx].point.cumulative}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
