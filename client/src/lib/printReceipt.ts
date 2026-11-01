import { triggerCashDrawer } from "./cashDrawer";

/**
 * Utility to print receipts cleanly from the very top of the page.
 * Uses an isolated hidden iframe so that main application headers, sidebars,
 * table rows, and layout wrappers never push or offset the receipt down the page.
 */
export function printReceiptNode(node: HTMLElement, title = "Sales Receipt") {
  if (!node) return;

  // Remove any prior print iframes if present
  const existing = document.getElementById("pharmabiz-print-frame");
  if (existing) {
    try {
      document.body.removeChild(existing);
    } catch {}
  }

  const iframe = document.createElement("iframe");
  iframe.id = "pharmabiz-print-frame";
  iframe.style.position = "fixed";
  iframe.style.top = "0";
  iframe.style.left = "0";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.opacity = "0.01";
  iframe.style.pointerEvents = "none";
  iframe.style.border = "none";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  // Clone styles and Tailwind stylesheets
  const styleElements = Array.from(
    document.querySelectorAll("style, link[rel='stylesheet']")
  )
    .map((el) => el.outerHTML)
    .join("\n");

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        ${styleElements}
        <style>
          @page {
            margin: 2mm 3mm;
            size: auto;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            font-size: 12pt !important;
            line-height: 1.4 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
          .receipt-print-wrapper {
            margin: 0 auto !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          /* Hide non-printable controls */
          button, .print\\:hidden, .no-print {
            display: none !important;
          }
          /* Ensure crisp borders and readability */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          thead, tbody, tr, td, th {
            page-break-inside: avoid !important;
          }
        </style>
      </head>
      <body>
        <div class="receipt-print-wrapper">
          ${node.innerHTML}
        </div>
      </body>
    </html>
  `);
  doc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error("[printReceiptNode] Print invocation failed:", err);
    } finally {
      setTimeout(() => {
        try {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        } catch {}
      }, 2000);
    }
  };

  // Wait for images (e.g. Cloudinary logo) to load inside the iframe before opening print dialog
  const images = Array.from(doc.querySelectorAll("img"));
  if (images.length === 0) {
    setTimeout(triggerPrint, 100);
  } else {
    let loadedCount = 0;
    const totalImages = images.length;
    let printed = false;

    const onImageDone = () => {
      loadedCount++;
      if (loadedCount >= totalImages && !printed) {
        printed = true;
        setTimeout(triggerPrint, 100);
      }
    };

    images.forEach((img) => {
      if (img.complete && img.naturalHeight !== 0) {
        onImageDone();
      } else {
        img.onload = onImageDone;
        img.onerror = onImageDone;
      }
    });

    setTimeout(() => {
      if (!printed) {
        printed = true;
        triggerPrint();
      }
    }, 1000);
  }
}

/**
 * Dedicated 80mm Thermal Receipt Printer with Automatic Cash Drawer Triggering.
 * Formatted specifically for standard POS 80mm continuous roll receipt printers.
 */
export async function printThermalReceipt80mm(
  content: HTMLElement | string,
  title = "Sales Receipt 80mm"
) {
  if (!content) return;

  // Trigger cash drawer kick concurrently with receipt print
  triggerCashDrawer().catch(() => {});

  const existing = document.getElementById("pharmabiz-thermal-print-frame");
  if (existing) {
    try {
      document.body.removeChild(existing);
    } catch {}
  }

  const iframe = document.createElement("iframe");
  iframe.id = "pharmabiz-thermal-print-frame";
  iframe.style.position = "fixed";
  iframe.style.top = "0";
  iframe.style.left = "0";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.opacity = "0.01";
  iframe.style.pointerEvents = "none";
  iframe.style.border = "none";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  // Clone Tailwind & inline style tags
  const styleElements = Array.from(
    document.querySelectorAll("style, link[rel='stylesheet']")
  )
    .map((el) => el.outerHTML)
    .join("\n");

  const innerMarkup = typeof content === "string" ? content : content.innerHTML;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        ${styleElements}
        <style>
          @page {
            size: 80mm auto;
            margin: 0mm;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            font-size: 11px !important;
            line-height: 1.35 !important;
            width: 80mm !important;
            height: auto !important;
            overflow: visible !important;
          }
          .thermal-80mm-wrapper {
            width: 72mm !important;
            max-width: 72mm !important;
            margin: 0 auto !important;
            padding: 3mm 1mm 6mm 1mm !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          button, .print\\:hidden, .no-print {
            display: none !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          thead, tbody, tr, td, th {
            page-break-inside: avoid !important;
          }
          svg, img {
            max-width: 100% !important;
          }
        </style>
      </head>
      <body>
        <div class="thermal-80mm-wrapper">
          ${innerMarkup}
        </div>
      </body>
    </html>
  `);
  doc.close();

  const executePrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error("[printThermalReceipt80mm] Print failed:", err);
    } finally {
      setTimeout(() => {
        try {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        } catch {}
      }, 2500);
    }
  };

  const images = Array.from(doc.querySelectorAll("img"));
  if (images.length === 0) {
    setTimeout(executePrint, 120);
  } else {
    let loadedCount = 0;
    const totalImages = images.length;
    let finished = false;

    const onImageDone = () => {
      loadedCount++;
      if (loadedCount >= totalImages && !finished) {
        finished = true;
        setTimeout(executePrint, 120);
      }
    };

    images.forEach((img) => {
      if (img.complete && img.naturalHeight !== 0) {
        onImageDone();
      } else {
        img.onload = onImageDone;
        img.onerror = onImageDone;
      }
    });

    setTimeout(() => {
      if (!finished) {
        finished = true;
        executePrint();
      }
    }, 1200);
  }
}
