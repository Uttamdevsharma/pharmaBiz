"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { QuotationPrintSheet } from "@/components/admin/quotation/quotation-print-sheet";
import { Printer, RefreshCw } from "lucide-react";

export default function PublicQuotationViewPage() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/public/quotations/${params.id}`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success && resData.data) {
          setData(resData.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-slate-500 bg-slate-50">
        <RefreshCw className="w-8 h-8 animate-spin text-teal-600 mb-2" />
        <p className="text-sm font-medium">Loading official quotation...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-md mx-auto text-center py-24 text-slate-700">
        <h2 className="text-xl font-bold text-red-600 mb-2">Quotation Not Found</h2>
        <p className="text-xs text-slate-500">
          This document link may have expired or is invalid. Please contact the sender.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-16 print:bg-white print:p-0 print:pb-0">
      <div className="no-print sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 p-4 shadow-sm mb-6">
        <div className="max-w-[850px] mx-auto flex items-center justify-between">
          <div className="text-xs font-bold text-slate-600">
            Official Quotation <span className="text-teal-700 font-mono">({data.ref_no})</span>
          </div>
          <button
            onClick={() => window.print()}
            className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        </div>
      </div>

      <div className="print:m-0">
        <QuotationPrintSheet data={data} />
      </div>
    </div>
  );
}
