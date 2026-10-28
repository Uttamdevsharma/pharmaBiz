/**
 * Unified Print & PDF Engine for PharmaBiz Reports
 * Generates an isolated, ultra-clean formal A4 / Portrait document matching official invoice/audit layouts
 */

export interface ReportPrintColumn {
  header: string;
  align?: "left" | "center" | "right";
  width?: string;
}

export interface ReportPrintOptions {
  title: string;
  pharmacyName?: string;
  meta: Array<{ label: string; value: string }>;
  columns: ReportPrintColumn[];
  rows: Array<Array<string | number>>;
  footerRow?: Array<{ text: string | number; colSpan?: number; align?: "left" | "center" | "right" }>;
}

export function printReportDocument(options: ReportPrintOptions): void {
  const { title, pharmacyName, meta, columns, rows, footerRow } = options;

  const printIframe = document.createElement("iframe");
  printIframe.setAttribute("style", "position:fixed;top:0;left:0;width:0;height:0;border:0;visibility:hidden;");
  document.body.appendChild(printIframe);

  const doc = printIframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  const metaHtml = meta
    .map((m) => `<span><strong>${m.label}:</strong> ${m.value}</span>`)
    .join('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;');

  const headerCells = columns
    .map((c) => `<th style="text-align: ${c.align || "left"}; width: ${c.width || "auto"}; padding: 6px 8px; border: 1px solid #1f2937; background: #f3f4f6; font-size: 10px; font-weight: 800; text-transform: uppercase;">${c.header}</th>`)
    .join("");

  const bodyRows = rows
    .map((r) => {
      const cells = r
        .map((cell, idx) => {
          const col = columns[idx];
          const align = col ? col.align || "left" : "left";
          return `<td style="text-align: ${align}; padding: 5px 8px; border: 1px solid #374151; font-size: 10.5px;">${cell}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  let footerHtml = "";
  if (footerRow && footerRow.length > 0) {
    const fCells = footerRow
      .map(
        (f) =>
          `<td colspan="${f.colSpan || 1}" style="text-align: ${f.align || "left"}; padding: 6px 8px; border: 1px solid #1f2937; background: #f9fafb; font-weight: 800; font-size: 11px;">${f.text}</td>`
      )
      .join("");
    footerHtml = `<tfoot><tr>${fCells}</tr></tfoot>`;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title} - ${pharmacyName || "PharmaBiz"}</title>
        <style>
          @page {
            size: auto;
            margin: 12mm 10mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #000000;
            background: #ffffff;
            width: 100%;
            margin: 0 auto;
            padding: 10px;
            font-size: 11px;
            line-height: 1.35;
          }
          .title-section {
            text-align: center;
            margin-bottom: 14px;
          }
          .pharmacy-title {
            font-size: 18px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 3px;
          }
          .report-subtitle {
            font-size: 14px;
            font-weight: 800;
            color: #111827;
            margin-bottom: 6px;
          }
          .meta-bar {
            font-size: 10px;
            color: #374151;
            padding: 4px 0;
            border-top: 1px solid #d1d5db;
            border-bottom: 1px solid #d1d5db;
            margin-top: 4px;
            font-family: monospace;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th, td {
            color: #000000;
          }
        </style>
      </head>
      <body>
        <div class="title-section">
          <div class="pharmacy-title">${pharmacyName || "PharmaBiz Pharmacy"}</div>
          <div class="report-subtitle">${title}</div>
          <div class="meta-bar">${metaHtml}</div>
        </div>

        <table>
          <thead>
            <tr>${headerCells}</tr>
          </thead>
          <tbody>
            ${bodyRows}
          </tbody>
          ${footerHtml}
        </table>
      </body>
    </html>
  `;

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    printIframe.contentWindow?.focus();
    printIframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(printIframe)) {
        document.body.removeChild(printIframe);
      }
    }, 2000);
  }, 200);
}
