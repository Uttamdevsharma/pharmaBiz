"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QuotationPrintSheet } from "@/components/admin/quotation/quotation-print-sheet";
import { Printer, Mail, ArrowLeft, RefreshCw } from "lucide-react";
import Swal from "sweetalert2";

export default function QuotationPrintPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/public/quotations/${params.id}`)
      .then((res) => {
        if (!res.ok) {
          return fetch(`/api/super-admin/quotations/${params.id}`);
        }
        return res;
      })
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success && resData.data) {
          setData(resData.data);
        } else {
          Swal.fire("Error", "Failed to load quotation data", "error");
        }
      })
      .catch(() => Swal.fire("Error", "Error fetching quotation", "error"))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = async () => {
    if (!data?.email) {
      Swal.fire("Missing Email", "Client email is missing in this quotation", "warning");
      return;
    }

    setIsSendingEmail(true);

    try {
      const res = await fetch(`/api/super-admin/quotations/${data.id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      const result = await res.json();

      if (result.success) {
        Swal.fire("Success", `Quotation successfully dispatched to ${data.email}`, "success");
      } else {
        Swal.fire("Failed", result.message || "Failed to send email", "error");
      }
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to send email", "error");
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-teal-600 mb-2" />
        <p className="text-sm font-medium">Preparing official document for print...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <h2 className="text-lg font-bold text-red-600 mb-2">Quotation Not Found</h2>
        <button
          onClick={() => router.push("/admin")}
          className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4 inline mr-1.5" /> Back to Admin
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 pb-16 print:bg-white print:p-0 print:pb-0">
      {/* Non-printable Floating Top Action Bar */}
      <div className="no-print sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-4 shadow-sm mb-6">
        <div className="max-w-[850px] mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push("/admin")}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSendEmail}
              disabled={isSendingEmail}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-950 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSendingEmail ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Mail className="w-3.5 h-3.5" />
              )}
              {isSendingEmail ? "Sending..." : "Email to Client"}
            </button>

            <button
              onClick={handlePrint}
              className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
          </div>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="print:m-0">
        <QuotationPrintSheet data={data} />
      </div>
    </div>
  );
}
