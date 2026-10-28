"use client";

import React from "react";
import { X, Printer, Download, FileText } from "lucide-react";
import { numberToWords } from "@/lib/numberToWords";

export interface PurchaseItemDetail {
  id: string;
  name: string;
  genericName?: string | null;
  batchNumber: string;
  expiryDate: string;
  boxQuantity?: number;
  stripsPerBox?: number;
  quantity: number;
  unitPurchasePrice: number;
  totalAmount: number;
  categoryId?: string;
  categoryName?: string;
  subcategoryId?: string;
  subcategoryName?: string;
  brandName?: string;
}

export interface PurchaseBillData {
  id: string;
  invoiceNo: string;
  purchaseDate: string;
  supplierName: string;
  supplierPhone?: string | null;
  totalAmount: number;
  paidAmount: number;
  paymentStatus?: string;
  paymentMethod: string;
  notes?: string | null;
  branchName?: string;
  itemsCount?: number;
  items: PurchaseItemDetail[];
}

interface PurchaseBillDetailModalProps {
  purchase: PurchaseBillData | null;
  pharmacyName?: string;
  branchName?: string;
  receiverName?: string;
  logoUrl?: string | null;
  onClose: () => void;
}

export function PurchaseBillDetailModal({
  purchase,
  pharmacyName,
  branchName,
  receiverName,
  logoUrl,
  onClose,
}: PurchaseBillDetailModalProps) {
  if (!purchase) return null;

  const formatCurrency = (val: number) => {
    return Number(val || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const d = new Date(purchase.purchaseDate);
  const formattedDateTime = !isNaN(d.getTime())
    ? d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) + ` (${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })})`
    : purchase.purchaseDate;

  const dateOnly = !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : purchase.purchaseDate;

  const totalQty = purchase.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  const pharmacyDisplayName = pharmacyName || "PharmaBiz Pharmacy";
  const branchDisplayName = branchName || purchase.branchName || "Main Branch";
  const receiverDisplayName = receiverName || "Store Manager";

  // Dedicated Print Engine: Generates bulletproof, self-contained HTML with 100% inline CSS
  const handlePrint = () => {
    const printIframe = document.createElement("iframe");
    printIframe.setAttribute(
      "style",
      "position:fixed;top:0;left:0;width:0;height:0;border:0;visibility:hidden;"
    );
    document.body.appendChild(printIframe);

    const doc = printIframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const itemRowsHtml = purchase.items
      .map(
        (item, idx) => `
        <tr>
          <td style="padding: 7px 8px; text-align: center; border: 1px solid #cbd5e1; font-family: monospace; color: #475569;">
            ${idx + 1}
          </td>
          <td style="padding: 7px 8px; border: 1px solid #cbd5e1; font-weight: 700; color: #0f172a;">
            ${item.name}
            ${
              item.genericName
                ? `<div style="font-size: 9.5px; color: #64748b; font-weight: normal; margin-top: 1px;">${item.genericName}</div>`
                : ""
            }
          </td>
          <td style="padding: 7px 8px; text-align: center; border: 1px solid #cbd5e1; font-family: monospace; font-size: 10px; color: #334155;">
            ${item.batchNumber || "—"}
          </td>
          <td style="padding: 7px 8px; text-align: center; border: 1px solid #cbd5e1; font-family: monospace; font-size: 10px; color: #475569;">
            ${item.expiryDate || "—"}
          </td>
          <td style="padding: 7px 8px; text-align: center; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 700;">
            ${item.quantity}
          </td>
          <td style="padding: 7px 8px; text-align: right; border: 1px solid #cbd5e1; font-family: monospace;">
            ${formatCurrency(item.unitPurchasePrice)}
          </td>
          <td style="padding: 7px 8px; text-align: right; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 700;">
            ${formatCurrency(item.totalAmount)}
          </td>
        </tr>`
      )
      .join("");

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Purchase Bill - ${purchase.invoiceNo}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #0f172a;
              background: #ffffff;
              padding: 12px;
              font-size: 11px;
              line-height: 1.4;
            }
            .invoice-container {
              width: 100%;
              max-width: 760px;
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <!-- Header Table: 2 Columns (Pharmacy Left, Chalan / Bill Right) -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px;">
              <tr>
                <td style="vertical-align: top; width: 55%;">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <span style="height: 18px; width: 18px; border-radius: 50%; background: #2563eb; display: inline-block;"></span>
                    <span style="font-size: 20px; font-weight: 900; color: #1e3a8a; letter-spacing: -0.5px;">${pharmacyDisplayName}</span>
                  </div>
                  <div style="font-size: 16px; font-weight: 800; color: #1d4ed8; margin-bottom: 4px;">${branchDisplayName}</div>
                  <div style="font-size: 11px; color: #475569;">
                    <strong>Received By:</strong> ${receiverDisplayName} · ${branchDisplayName}
                  </div>
                </td>
                <td style="vertical-align: top; width: 45%; text-align: right;">
                  <div style="font-size: 26px; font-weight: 900; color: #1d4ed8; line-height: 1; margin-bottom: 4px; letter-spacing: -0.5px;">PURCHASE BILL</div>
                  <div style="font-size: 11px; color: #334155; margin-bottom: 2px;">
                    Chalan / Bill No: <strong style="font-family: monospace; font-size: 12px; color: #0f172a;">${purchase.invoiceNo}</strong>
                  </div>
                  <div style="font-size: 10.5px; color: #64748b; margin-bottom: 6px;">
                    Date: ${formattedDateTime}
                  </div>
                  <div style="margin-top: 4px;">
                    <span style="display: inline-block; padding: 2px 8px; border: 1.5px solid #10b981; color: #047857; font-size: 10px; font-weight: 800; border-radius: 4px; margin-bottom: 3px;">Supplier Info</span>
                    <div style="font-size: 12px; font-weight: 800; color: #0f172a;">${purchase.supplierName}</div>
                    <div style="font-size: 11px; color: #64748b;">Mobile: ${purchase.supplierPhone || "—"}</div>
                  </div>
                </td>
              </tr>
            </table>

            <!-- Items Table (Blue Header matching Image 1) -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px;">
              <thead>
                <tr style="background: #0052cc !important; color: #ffffff !important; -webkit-print-color-adjust: exact;">
                  <th style="padding: 8px; text-align: center; width: 40px; color: #ffffff !important; font-weight: 800; border: 1px solid #0052cc;">SL.</th>
                  <th style="padding: 8px; text-align: left; color: #ffffff !important; font-weight: 800; border: 1px solid #0052cc;">Medicine / Item</th>
                  <th style="padding: 8px; text-align: center; width: 90px; color: #ffffff !important; font-weight: 800; border: 1px solid #0052cc;">Batch #</th>
                  <th style="padding: 8px; text-align: center; width: 85px; color: #ffffff !important; font-weight: 800; border: 1px solid #0052cc;">Expiry</th>
                  <th style="padding: 8px; text-align: center; width: 65px; color: #ffffff !important; font-weight: 800; border: 1px solid #0052cc;">Quantity</th>
                  <th style="padding: 8px; text-align: right; width: 95px; color: #ffffff !important; font-weight: 800; border: 1px solid #0052cc;">Cost Price</th>
                  <th style="padding: 8px; text-align: right; width: 105px; color: #ffffff !important; font-weight: 800; border: 1px solid #0052cc;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemRowsHtml}
                <!-- Total Qty Row -->
                <tr style="background: #f8fafc; font-weight: 800;">
                  <td colspan="4" style="padding: 7px 8px; text-align: right; border: 1px solid #cbd5e1; font-weight: 900;">Total Qty:</td>
                  <td style="padding: 7px 8px; text-align: center; font-family: monospace; border: 1px solid #cbd5e1; font-weight: 900;">${totalQty}</td>
                  <td colspan="2" style="border: 1px solid #cbd5e1;"></td>
                </tr>
              </tbody>
            </table>

            <!-- Totals Box (Right Aligned matching Image 1) -->
            <div style="width: 100%; margin-bottom: 14px; overflow: hidden;">
              <table style="width: 250px; border-collapse: collapse; font-size: 11px; float: right;">
                <tr>
                  <td style="padding: 6px 10px; font-weight: 800; background: #f8fafc; border: 1px solid #cbd5e1; text-align: right; width: 45%;">Subtotal :</td>
                  <td style="padding: 6px 10px; font-family: monospace; font-weight: 800; border: 1px solid #cbd5e1; text-align: right;">BDT ${formatCurrency(purchase.totalAmount)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 10px; font-weight: 800; background: #f8fafc; border: 1px solid #cbd5e1; text-align: right;">Total :</td>
                  <td style="padding: 6px 10px; font-family: monospace; font-weight: 800; border: 1px solid #cbd5e1; text-align: right;">BDT ${formatCurrency(purchase.totalAmount)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 10px; font-weight: 800; background: #f8fafc; border: 1px solid #cbd5e1; text-align: right;">Paid :</td>
                  <td style="padding: 6px 10px; font-family: monospace; font-weight: 800; color: #047857; border: 1px solid #cbd5e1; text-align: right;">BDT ${formatCurrency(purchase.paidAmount)}</td>
                </tr>
              </table>
            </div>

            <!-- In Words -->
            <div style="clear: both; font-size: 11px; font-weight: 800; color: #0f172a; margin-bottom: 16px; padding-top: 4px;">
              <span>In Words: </span>
              <span style="color: #1d4ed8; font-weight: 900;">${numberToWords(purchase.totalAmount)}</span>
            </div>

            <!-- Payment Details Table -->
            <div style="max-width: 480px; margin-bottom: 24px;">
              <div style="font-size: 11px; font-weight: 800; text-decoration: underline; margin-bottom: 6px;">Payment Details:</div>
              <table style="width: 100%; border-collapse: collapse; font-size: 10.5px;">
                <thead>
                  <tr style="background: #f1f5f9;">
                    <th style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: center; width: 35px;">SI</th>
                    <th style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: left;">Date</th>
                    <th style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: left;">Payment Method</th>
                    <th style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: center; width: 80px;">Payment By</th>
                    <th style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: right; width: 110px;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace;">1</td>
                    <td style="padding: 5px 8px; border: 1px solid #cbd5e1; font-family: monospace;">${dateOnly}</td>
                    <td style="padding: 5px 8px; border: 1px solid #cbd5e1; font-weight: 700;">${purchase.paymentMethod || "CASH"}</td>
                    <td style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: center; color: #94a3b8;">-</td>
                    <td style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace; font-weight: 700;">BDT ${formatCurrency(purchase.paidAmount)}</td>
                  </tr>
                  <tr style="background: #f8fafc; font-weight: 800;">
                    <td colspan="4" style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: right;">Total:</td>
                    <td style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace; font-weight: 900;">BDT ${formatCurrency(purchase.paidAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Created at Footer -->
            <div style="text-align: center; font-size: 10px; color: #64748b; margin-top: 24px;">
              Created at : ${formattedDateTime}
            </div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(printIframe);
      }, 1000);
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl shadow-2xl rounded-none my-6 overflow-hidden flex flex-col">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-blue-600" />
            <span>Chalan / Bill Details · {purchase.invoiceNo}</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 rounded transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* BILL CONTENT (Exact Replica of Uploaded Image Layout) */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh] bg-white text-slate-900 select-text">
          <div className="space-y-3.5">
            {/* Header: Left Shop Info, Right Chalan & Supplier Info */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              {/* Left Brand & Shop */}
              <div>
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-10 object-contain mb-1.5" />
                ) : (
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="h-5 w-5 rounded-full bg-blue-600 inline-block shrink-0" />
                    <span className="text-xl font-black text-blue-900 tracking-tight">
                      {pharmacyDisplayName}
                    </span>
                  </div>
                )}
                <h2 className="text-base font-black text-blue-700">
                  {branchDisplayName}
                </h2>
                <p className="text-[11px] text-slate-600 font-medium">
                  <strong>Received By:</strong> {receiverDisplayName} · {branchDisplayName}
                </p>
              </div>

              {/* Right Bill & Supplier Info */}
              <div className="text-left sm:text-right">
                <h1 className="text-2xl sm:text-3xl font-black text-blue-700 tracking-tight">
                  PURCHASE BILL
                </h1>
                <p className="text-xs text-slate-800">
                  Chalan / Bill: <strong className="font-mono text-slate-900">{purchase.invoiceNo}</strong>
                </p>
                <p className="text-[11px] text-slate-600">
                  Date: {formattedDateTime}
                </p>

                <div className="mt-1.5">
                  <span className="inline-block px-2 py-0.5 border border-emerald-500 text-emerald-700 text-[10px] font-bold rounded">
                    Supplier Info
                  </span>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">
                    {purchase.supplierName}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Mobile: {purchase.supplierPhone || "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Items Table (Navy/Blue Header matching Image) */}
            <div className="overflow-x-auto pt-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0052cc] text-white font-bold text-[11px]">
                    <th className="py-2 px-3 w-10 text-center border border-[#0052cc]">SL.</th>
                    <th className="py-2 px-3 border border-[#0052cc]">Medicine / Item</th>
                    <th className="py-2 px-2 text-center border border-[#0052cc] w-24">Batch #</th>
                    <th className="py-2 px-2 text-center border border-[#0052cc] w-24">Expiry</th>
                    <th className="py-2 px-2 text-center border border-[#0052cc] w-16">Qty</th>
                    <th className="py-2 px-3 text-right border border-[#0052cc] w-24">Cost (৳)</th>
                    <th className="py-2 px-3 text-right border border-[#0052cc] w-24">Total (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  {purchase.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-center border border-slate-200 font-mono text-slate-600">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 border border-slate-200 font-bold text-slate-900">
                        {item.name}
                        {item.genericName && (
                          <span className="text-[10px] text-slate-400 font-normal block">
                            {item.genericName}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center border border-slate-200 font-mono text-[11px] text-slate-600">
                        {item.batchNumber || "—"}
                      </td>
                      <td className="py-2 px-2 text-center border border-slate-200 font-mono text-[11px] text-slate-600">
                        {item.expiryDate || "—"}
                      </td>
                      <td className="py-2 px-2 text-center border border-slate-200 font-mono font-bold">
                        {item.quantity}
                      </td>
                      <td className="py-2 px-3 text-right border border-slate-200 font-mono">
                        {formatCurrency(item.unitPurchasePrice)}
                      </td>
                      <td className="py-2 px-3 text-right border border-slate-200 font-mono font-bold">
                        {formatCurrency(item.totalAmount)}
                      </td>
                    </tr>
                  ))}
                  {/* Total Qty Row */}
                  <tr className="bg-slate-50 font-bold">
                    <td colSpan={4} className="py-2 px-3 text-right border border-slate-200 font-black">
                      Total Qty:
                    </td>
                    <td className="py-2 px-2 text-center border border-slate-200 font-mono font-black">
                      {totalQty}
                    </td>
                    <td colSpan={2} className="border border-slate-200"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Subtotal, Total, Paid Box (Aligned Right matching Image) */}
            <div className="flex justify-end pt-1">
              <table className="w-56 text-xs border-collapse border border-slate-300">
                <tbody>
                  <tr>
                    <td className="py-1.5 px-3 bg-slate-50 font-bold text-slate-700 border border-slate-300 text-right">
                      Subtotal :
                    </td>
                    <td className="py-1.5 px-3 font-mono font-bold text-slate-900 border border-slate-300 text-right">
                      BDT {formatCurrency(purchase.totalAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 bg-slate-50 font-bold text-slate-700 border border-slate-300 text-right">
                      Total :
                    </td>
                    <td className="py-1.5 px-3 font-mono font-bold text-slate-900 border border-slate-300 text-right">
                      BDT {formatCurrency(purchase.totalAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 bg-slate-50 font-bold text-slate-700 border border-slate-300 text-right">
                      Paid :
                    </td>
                    <td className="py-1.5 px-3 font-mono font-bold text-emerald-700 border border-slate-300 text-right">
                      BDT {formatCurrency(purchase.paidAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* In Words */}
            <div className="text-xs font-bold text-slate-900 pt-1">
              <span>In Words: </span>
              <span className="font-extrabold text-blue-900">{numberToWords(purchase.totalAmount)}</span>
            </div>

            {/* Bottom Section: Payment Details */}
            <div className="pt-1 max-w-lg">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900 underline">
                  Payment Details:
                </h4>
                <table className="w-full text-[11px] border-collapse border border-slate-300 text-left">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-700">
                      <th className="py-1 px-2 border border-slate-300 text-center">SI</th>
                      <th className="py-1 px-2 border border-slate-300">Date</th>
                      <th className="py-1 px-2 border border-slate-300">Payment Method</th>
                      <th className="py-1 px-2 border border-slate-300 text-center">Payment By</th>
                      <th className="py-1 px-2 border border-slate-300 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-1 px-2 border border-slate-300 text-center font-mono">1</td>
                      <td className="py-1 px-2 border border-slate-300 font-mono text-[10px]">{dateOnly}</td>
                      <td className="py-1 px-2 border border-slate-300 font-semibold">{purchase.paymentMethod || "CASH"}</td>
                      <td className="py-1 px-2 border border-slate-300 text-center text-slate-400">-</td>
                      <td className="py-1 px-2 border border-slate-300 text-right font-mono font-bold">
                        BDT {formatCurrency(purchase.paidAmount)}
                      </td>
                    </tr>
                    <tr className="font-bold bg-slate-50">
                      <td colSpan={4} className="py-1 px-2 border border-slate-300 text-right">
                        Total:
                      </td>
                      <td className="py-1 px-2 border border-slate-300 text-right font-mono font-black">
                        BDT {formatCurrency(purchase.paidAmount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Created At Footer */}
            <div className="text-center text-[10px] text-slate-500 pt-3">
              Created at : {formattedDateTime}
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS: Download PDF (Red) & Print (Blue) */}
        <div className="flex items-center gap-0 border-t border-slate-200">
          <button
            type="button"
            onClick={handlePrint}
            className="w-1/2 py-3 bg-[#b91c1c] hover:bg-[#991b1b] text-white text-xs font-bold flex items-center justify-center gap-2 transition"
          >
            <Download className="h-4 w-4" />
            <span>Download PDF</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="w-1/2 py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold flex items-center justify-center gap-2 transition"
          >
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </button>
        </div>
      </div>
    </div>
  );
}
