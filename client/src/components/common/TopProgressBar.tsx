"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { loadingProgress } from "@/lib/loadingProgress";

export function TopProgressBar() {
  const [state, setState] = useState({ active: false, progress: 0 });
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Subscribe to global progress manager (API calls & manual triggers)
  useEffect(() => {
    const unsubscribe = loadingProgress.subscribe((s) => {
      setState(s);
    });
    return () => unsubscribe();
  }, []);

  // Trigger quick progress on router pathname or query parameter changes
  useEffect(() => {
    loadingProgress.triggerQuick(300);
  }, [pathname, searchParams]);

  if (!state.active && state.progress === 0) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[999999] h-[3px] pointer-events-none"
      style={{
        opacity: state.progress === 100 ? 0 : 1,
        transition: state.progress === 100 ? "opacity 300ms ease" : "none",
      }}
    >
      {/* Main Track Bar */}
      <div
        className="h-full rounded-r-full relative"
        style={{
          width: `${Math.min(100, state.progress)}%`,
          background: "linear-gradient(90deg, var(--primary-color, #059669), #10b981, #34d399)",
          boxShadow: "0 0 10px rgba(16, 185, 129, 0.7), 0 0 5px rgba(5, 150, 105, 0.5)",
          transition: "width 220ms ease-out",
        }}
      >
        {/* Glowing Head Peg (YouTube/GitHub-like leading light effect) */}
        <div
          className="absolute right-0 top-0 bottom-0 w-24 -translate-y-1 h-2 opacity-100 rounded-full"
          style={{
            background: "radial-gradient(ellipse at right, #a7f3d0 0%, rgba(16, 185, 129, 0.8) 40%, transparent 80%)",
            boxShadow: "0 0 14px #34d399, 0 0 8px #10b981",
          }}
        />
      </div>
    </div>
  );
}
