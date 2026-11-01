"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBranchContext } from "@/context/BranchContext";
import { fetchApi } from "@/lib/api";
import { offlineDb } from "@/lib/offlineDb";
import { Barcode128 } from "@/components/common/Barcode128";
import {
  Printer,
  Search,
  CheckSquare,
  Plus,
  Minus,
  RotateCcw,
  CheckCircle2,
  Eye,
  Settings2,
} from "lucide-react";

interface ProductItem {
  id: string;
  name: string;
  genericName?: string | null;
  sku: string;
  barcode?: string | null;
  basePrice?: number | string | null;
  effectivePrice?: number | string | null;
  sellingPrice?: number | string | null;
  currentStock?: number;
  stock?: number;
  category?: string | null;
  categoryRef?: { name: string; productType?: string } | null;
  productType?: string | null;
  defaultPackType?: string | null;
  unit?: string | null;
  brand?: string | null;
  size?: string | null;
  strength?: string | null;
  stripsPerBox?: number | null;
  tabletsPerStrip?: number | null;
  batches?: Array<{
    id: string;
    batchNumber?: string;
    barcode?: string | null;
    quantity: number;
    sellingPrice?: number | string | null;
    boxSellingPrice?: number | string | null;
    stripsPerBox?: number | null;
    tabletsPerStrip?: number | null;
  }>;
}

interface SelectedLabelItem {
  product: ProductItem;
  quantity: number;
}

interface PrintBarcodeLabelsViewProps {
  onNavigate?: (module: any) => void;
}

type PriceCalculationMode = "AUTO" | "BOX_ONLY" | "UNIT_ONLY";

/**
 * Format barcode string to eliminate scientific notation (e.g. 6.40343E+11 -> 640343000000).
 */
export function formatBarcodeString(raw?: string | null): string {
  if (!raw) return "";
  const str = String(raw).trim();
  // Check if string is in scientific notation e.g. 6.40343E+11 or 1.55959e+11
  if (/^[+-]?\d+(\.\d+)?[eE][+-]?\d+$/.test(str)) {
    try {
      const num = Number(str);
      if (!isNaN(num)) {
        return BigInt(Math.round(num)).toString();
      }
    } catch {}
  }
  return str;
}

/**
 * Calculate display price:
 * - Medicines (tablets, capsules): Total Box Price
 * - Unit pieces (lifestyle like Pepsodent, syrup bottles): Unit piece price
 */
export function getProductDisplayPrice(
  p: ProductItem,
  mode: PriceCalculationMode = "AUTO"
): {
  amount: number;
  unitLabel: string;
  isBox: boolean;
} {
  const latestBatch = p.batches && p.batches.length > 0 ? p.batches[0] : null;

  const cat = (p.categoryRef?.name || p.category || "").toLowerCase();
  const prodType = (p.productType || "").toUpperCase();
  const defaultPack = (p.defaultPackType || "").toUpperCase();
  const unit = (p.unit || "").toLowerCase();

  const isLifestyleOrPiece =
    cat.includes("life style") ||
    cat.includes("lifestyle") ||
    cat.includes("syrup") ||
    cat.includes("cosmetic") ||
    cat.includes("personal") ||
    cat.includes("oral") ||
    cat.includes("device") ||
    cat.includes("equipment") ||
    cat.includes("baby") ||
    prodType === "SYRUP" ||
    prodType === "EQUIPMENT" ||
    prodType === "OTHER" ||
    defaultPack === "BOTTLE" ||
    defaultPack === "PIECE" ||
    unit.includes("bottle") ||
    unit.includes("piece") ||
    unit.includes("pcs");

  const isMedicine =
    !isLifestyleOrPiece &&
    (prodType === "MEDICINE" ||
      cat.includes("medicine") ||
      cat.includes("pharma") ||
      defaultPack === "BOX" ||
      defaultPack === "STRIP" ||
      defaultPack === "TABLET" ||
      unit.includes("tab") ||
      unit.includes("cap") ||
      unit.includes("strip"));

  // 1. Check batch sellingPrice or boxSellingPrice
  const batchBoxSelling = Number(latestBatch?.boxSellingPrice || 0);
  const batchUnitSelling = Number(latestBatch?.sellingPrice || 0);

  // 2. Base unit price (per tablet or per piece)
  const baseUnitPrice =
    batchUnitSelling > 0
      ? batchUnitSelling
      : Number(p.effectivePrice || 0) > 0
      ? Number(p.effectivePrice)
      : Number(p.basePrice || 0) > 0
      ? Number(p.basePrice)
      : Number(p.sellingPrice || 0);

  const strips = Number(p.stripsPerBox || latestBatch?.stripsPerBox || 10);
  const tabs = Number(p.tabletsPerStrip || latestBatch?.tabletsPerStrip || 10);
  const totalUnitsPerBox = strips * tabs;

  if (mode === "BOX_ONLY") {
    if (batchBoxSelling > 0) return { amount: batchBoxSelling, unitLabel: "Box", isBox: true };
    const boxAmt = baseUnitPrice * Math.max(1, totalUnitsPerBox);
    return { amount: Math.round(boxAmt * 100) / 100, unitLabel: "Box", isBox: true };
  }

  if (mode === "UNIT_ONLY") {
    return { amount: baseUnitPrice, unitLabel: "Unit", isBox: false };
  }

  // AUTO mode: Box price for medicines, Unit price for lifestyle/syrups
  if (isMedicine) {
    if (batchBoxSelling > 0) {
      return { amount: batchBoxSelling, unitLabel: "Box", isBox: true };
    }
    if (baseUnitPrice > 0 && totalUnitsPerBox > 1) {
      const boxAmt = baseUnitPrice * totalUnitsPerBox;
      return {
        amount: Math.round(boxAmt * 100) / 100,
        unitLabel: "Box",
        isBox: true,
      };
    }
    return { amount: baseUnitPrice, unitLabel: "Box", isBox: true };
  }

  // Lifestyle / Unit piece
  return { amount: baseUnitPrice, unitLabel: "Piece", isBox: false };
}

export function PrintBarcodeLabelsView({ onNavigate }: PrintBarcodeLabelsViewProps) {
  const { user } = useAuth();
  const { selectedBranchId } = useBranchContext();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [inStockOnly, setInStockOnly] = useState(false);

  // Selected products with their individual sticker copy count
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());

  // Label configuration & layout settings
  const [labelSize, setLabelSize] = useState<"38x25" | "50x30" | "a4_sheet">("38x25");
  const [pharmacyName, setPharmacyName] = useState("");
  const [showPharmacyName, setShowPharmacyName] = useState(true);
  const [showMedicineName, setShowMedicineName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [priceMode, setPriceMode] = useState<PriceCalculationMode>("AUTO");
  const [showBarcodeText, setShowBarcodeText] = useState(true);
  const [currencySymbol, setCurrencySymbol] = useState("৳");

  // Success toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.tenant?.name) {
      setPharmacyName(user.tenant.name);
    } else {
      setPharmacyName("Shapla Pharmacy");
    }
  }, [user]);

  // Load products from API / IndexedDB
  const loadProducts = async () => {
    try {
      setLoading(true);

      // 1. Fast load from offline IndexedDB first
      const cached = await offlineDb.getProducts(selectedBranchId || undefined);
      if (cached && cached.length > 0) {
        setProducts(cached as ProductItem[]);
      }

      // 2. Fetch fresh catalog from API
      const res = await fetchApi<any>(`/products?limit=500${selectedBranchId ? `&branchId=${selectedBranchId}` : ""}`);
      if (res?.success && Array.isArray(res.data)) {
        setProducts(res.data);
      } else if (res?.success && Array.isArray(res.data?.products)) {
        setProducts(res.data.products);
      }
    } catch (err) {
      console.error("[PrintLabels] Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [selectedBranchId]);

  // Categories list for filtering
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const cat = p.categoryRef?.name || p.category;
      if (cat) set.add(cat);
    });
    return ["ALL", ...Array.from(set).sort()];
  }, [products]);

  // Filtered medicines
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const generic = (p.genericName || "").toLowerCase();
      const sku = (p.sku || "").toLowerCase();
      const barcode = formatBarcodeString(p.barcode).toLowerCase();
      const brand = (p.brand || "").toLowerCase();
      const cat = (p.categoryRef?.name || p.category || "").toLowerCase();

      const matchesQuery =
        !q ||
        name.includes(q) ||
        generic.includes(q) ||
        sku.includes(q) ||
        barcode.includes(q) ||
        brand.includes(q);

      const matchesCat =
        selectedCategory === "ALL" ||
        (p.categoryRef?.name || p.category || "").toUpperCase() === selectedCategory.toUpperCase();

      const stockVal = p.currentStock ?? p.stock ?? 0;
      const matchesStock = !inStockOnly || Number(stockVal) > 0;

      return matchesQuery && matchesCat && matchesStock;
    });
  }, [products, search, selectedCategory, inStockOnly]);

  // Select / Deselect individual product
  const toggleSelectProduct = (product: ProductItem) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      if (next.has(product.id)) {
        next.delete(product.id);
      } else {
        next.set(product.id, 1);
      }
      return next;
    });
  };

  // Change quantity for a specific product
  const updateQuantity = (productId: string, qty: number) => {
    const validQty = Math.max(1, Math.min(9999, Math.floor(qty) || 1));
    setSelectedItems((prev) => {
      const next = new Map(prev);
      if (next.has(productId)) {
        next.set(productId, validQty);
      }
      return next;
    });
  };

  // Select all filtered products
  const handleSelectAllFiltered = () => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      filteredProducts.forEach((p) => {
        if (!next.has(p.id)) {
          next.set(p.id, 1);
        }
      });
      return next;
    });
  };

  // Clear all selections
  const handleClearAll = () => {
    setSelectedItems(new Map());
  };

  // Batch quantity setters
  const handleSetAllQuantities = (qty: number) => {
    setSelectedItems((prev) => {
      const next = new Map();
      prev.forEach((_, id) => {
        next.set(id, Math.max(1, qty));
      });
      return next;
    });
  };

  const handleMatchStockQuantities = () => {
    setSelectedItems((prev) => {
      const next = new Map();
      prev.forEach((_, id) => {
        const prod = products.find((p) => p.id === id);
        const stock = Math.max(1, Number(prod?.currentStock ?? prod?.stock ?? 1));
        next.set(id, stock);
      });
      return next;
    });
  };

  // Selected items list with full product objects
  const selectedProductsList: SelectedLabelItem[] = useMemo(() => {
    const list: SelectedLabelItem[] = [];
    selectedItems.forEach((qty, id) => {
      const prod = products.find((p) => p.id === id);
      if (prod) {
        list.push({ product: prod, quantity: qty });
      }
    });
    return list;
  }, [selectedItems, products]);

  // Total label stickers to print
  const totalStickerCount = useMemo(() => {
    let sum = 0;
    selectedItems.forEach((qty) => {
      sum += qty;
    });
    return sum;
  }, [selectedItems]);

  // Sample product for live preview (picks the first selected, or first in filtered list)
  const previewProduct = useMemo(() => {
    if (selectedProductsList.length > 0) {
      return selectedProductsList[0].product;
    }
    if (filteredProducts.length > 0) {
      return filteredProducts[0];
    }
    return null;
  }, [selectedProductsList, filteredProducts]);

  // Resolve scannable barcode string for a product (cleaned from scientific notation)
  const getProductBarcodeValue = (p: ProductItem): string => {
    const cleanRaw = formatBarcodeString(p.barcode);
    if (cleanRaw.length > 0) return cleanRaw;

    if (p.batches && p.batches.length > 0) {
      const batchWithCode = p.batches.find((b) => b.barcode && b.barcode.trim().length > 0);
      if (batchWithCode?.barcode) {
        return formatBarcodeString(batchWithCode.barcode);
      }
    }

    if (p.sku && p.sku.trim().length > 0) {
      return formatBarcodeString(p.sku.trim());
    }

    return `MED-${p.id.slice(-8).toUpperCase()}`;
  };

  // Print Barcode Labels via isolated high-resolution iframe
  const handlePrintLabels = () => {
    if (selectedProductsList.length === 0) {
      alert("Please select at least one medicine to print barcode labels.");
      return;
    }

    const existingFrame = document.getElementById("pharmabiz-labels-print-frame");
    if (existingFrame) {
      try {
        document.body.removeChild(existingFrame);
      } catch {}
    }

    const iframe = document.createElement("iframe");
    iframe.id = "pharmabiz-labels-print-frame";
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

    // Collect all stickers to print according to quantity
    const stickersToPrint: Array<{
      pharmacy: string;
      name: string;
      price: string;
      barcodeValue: string;
    }> = [];

    selectedProductsList.forEach(({ product, quantity }) => {
      const code = getProductBarcodeValue(product);
      const priceInfo = getProductDisplayPrice(product, priceMode);
      const priceFormatted = `${currencySymbol}${priceInfo.amount.toFixed(2)}`;

      for (let i = 0; i < quantity; i++) {
        stickersToPrint.push({
          pharmacy: pharmacyName.trim() || "Pharmacy",
          name: product.name,
          price: priceFormatted,
          barcodeValue: code,
        });
      }
    });

    // Build page style depending on size
    let pageCss = "";
    let stickerCss = "";

    if (labelSize === "38x25") {
      pageCss = `
        @page {
          size: 38mm 25mm;
          margin: 0mm;
        }
      `;
      stickerCss = `
        width: 38mm;
        height: 25mm;
        page-break-after: always;
        page-break-inside: avoid;
        box-sizing: border-box;
        padding: 1.5mm 1mm;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        text-align: center;
        overflow: hidden;
      `;
    } else if (labelSize === "50x30") {
      pageCss = `
        @page {
          size: 50mm 30mm;
          margin: 0mm;
        }
      `;
      stickerCss = `
        width: 50mm;
        height: 30mm;
        page-break-after: always;
        page-break-inside: avoid;
        box-sizing: border-box;
        padding: 2mm 1.5mm;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        text-align: center;
        overflow: hidden;
      `;
    } else {
      // A4 Sheet: 3 columns x 8 rows (24 labels per A4 page)
      pageCss = `
        @page {
          size: A4 portrait;
          margin: 8mm 6mm;
        }
      `;
      stickerCss = `
        width: 63.5mm;
        height: 33.9mm;
        box-sizing: border-box;
        padding: 2mm 2mm;
        border: 1px dashed #e2e8f0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        text-align: center;
        overflow: hidden;
        page-break-inside: avoid;
      `;
    }

    // Generate barcodes SVG using Code 128 algorithm
    const generateBarcodeSvg = (value: string, heightPx = 28) => {
      const CODE128_PATTERNS: Record<number, string> = {
        0: "212222", 1: "222122", 2: "222221", 3: "121223", 4: "121322",
        5: "131222", 6: "122213", 7: "122312", 8: "132212", 9: "221213",
        10: "221312", 11: "231212", 12: "112232", 13: "122132", 14: "122231",
        15: "113222", 16: "123122", 17: "123221", 18: "223211", 19: "221132",
        20: "221231", 21: "213212", 22: "223112", 23: "312131", 24: "311222",
        25: "321122", 26: "321221", 27: "312212", 28: "322112", 29: "322211",
        30: "212123", 31: "212321", 32: "232121", 33: "111323", 34: "131123",
        35: "131321", 36: "112313", 37: "132113", 38: "132311", 39: "211313",
        40: "231113", 41: "231311", 42: "112133", 43: "112331", 44: "132131",
        45: "113123", 46: "113321", 47: "133121", 48: "313121", 49: "211331",
        50: "231131", 51: "213113", 52: "213311", 53: "213131", 54: "311123",
        55: "311321", 56: "331121", 57: "312113", 58: "312311", 59: "332111",
        60: "314111", 61: "221411", 62: "431111", 63: "111224", 64: "111422",
        65: "121124", 66: "121421", 67: "141122", 68: "141221", 69: "112214",
        70: "112412", 71: "122114", 72: "122411", 73: "142112", 74: "142211",
        75: "241211", 76: "221114", 77: "413111", 78: "241112", 79: "134111",
        80: "111242", 81: "121142", 82: "121241", 83: "114212", 84: "124112",
        85: "124211", 86: "411212", 87: "421112", 88: "421211", 89: "212141",
        90: "214121", 91: "412121", 92: "111143", 93: "111341", 94: "131141",
        95: "114113", 96: "114311", 97: "411113", 98: "411311", 99: "113141",
        100: "114131", 101: "311141", 102: "411131", 103: "211412",
        104: "211214", 105: "211232", 106: "2331112",
      };

      const startCode = 104; // START B
      let checksum = startCode;
      const codes: number[] = [startCode];

      for (let i = 0; i < value.length; i++) {
        const codeVal = value.charCodeAt(i) - 32;
        if (codeVal >= 0 && codeVal <= 95) {
          codes.push(codeVal);
          checksum += codeVal * (i + 1);
        }
      }

      codes.push(checksum % 103);
      codes.push(106); // STOP

      let moduleString = "";
      for (const code of codes) {
        const pattern = CODE128_PATTERNS[code];
        if (!pattern) continue;
        let isBar = true;
        for (let j = 0; j < pattern.length; j++) {
          const count = parseInt(pattern[j], 10);
          moduleString += (isBar ? "1" : "0").repeat(count);
          isBar = !isBar;
        }
      }

      const rects: Array<{ x: number; w: number }> = [];
      let currentX = 6;
      let inBar = false;
      let barStartX = 0;

      for (let i = 0; i < moduleString.length; i++) {
        if (moduleString[i] === "1") {
          if (!inBar) {
            inBar = true;
            barStartX = currentX;
          }
        } else {
          if (inBar) {
            inBar = false;
            rects.push({ x: barStartX, w: currentX - barStartX });
          }
        }
        currentX++;
      }
      if (inBar) {
        rects.push({ x: barStartX, w: currentX - barStartX });
      }

      const totalModules = currentX + 6;
      const svgRects = rects
        .map((r) => `<rect x="${r.x}" y="0" width="${r.w}" height="${heightPx}" fill="#000000" />`)
        .join("");

      return `
        <svg viewBox="0 0 ${totalModules} ${heightPx}" width="95%" height="${heightPx}" style="display:block;margin:0 auto;shape-rendering:crispEdges;" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="${totalModules}" height="${heightPx}" fill="#ffffff" />
          ${svgRects}
        </svg>
      `;
    };

    const isA4 = labelSize === "a4_sheet";

    const stickerElements = stickersToPrint
      .map((stk) => {
        const svgBarcode = generateBarcodeSvg(stk.barcodeValue, labelSize === "38x25" ? 22 : 28);
        return `
          <div class="barcode-sticker" style="${stickerCss}">
            ${
              showPharmacyName
                ? `<div style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; color: #000000;">
                    ${stk.pharmacy}
                  </div>`
                : ""
            }
            ${
              showMedicineName
                ? `<div style="font-size: 9px; font-weight: 700; line-height: 1.15; max-height: 2.3em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; color: #000000;">
                    ${stk.name}
                  </div>`
                : ""
            }
            <div style="width: 100%; padding: 0.5mm 0;">
              ${svgBarcode}
              ${
                showBarcodeText
                  ? `<div style="font-family: monospace; font-size: 8px; font-weight: 700; letter-spacing: 0.15em; color: #000000; margin-top: 1px;">
                      ${stk.barcodeValue}
                    </div>`
                  : ""
              }
            </div>
            ${
              showPrice
                ? `<div style="font-size: 9.5px; font-weight: 800; color: #000000;">
                    MRP: ${stk.price}
                  </div>`
                : ""
            }
          </div>
        `;
      })
      .join("\n");

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Medicine Barcode Stickers</title>
          <style>
            ${pageCss}
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
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
            }
            .labels-container {
              ${
                isA4
                  ? `
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 0;
                width: 100%;
              `
                  : `
                display: block;
              `
              }
            }
          </style>
        </head>
        <body>
          <div class="labels-container">
            ${stickerElements}
          </div>
        </body>
      </html>
    `;

    doc.open();
    doc.write(fullHtml);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setToastMessage(`Sent ${stickersToPrint.length} labels to print dialog!`);
        setTimeout(() => setToastMessage(null), 4000);
      } catch (err) {
        console.error("Print failed", err);
      } finally {
        setTimeout(() => {
          try {
            if (iframe.parentNode) {
              document.body.removeChild(iframe);
            }
          } catch {}
        }, 3000);
      }
    }, 200);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950">
      {/* Top Clean Header (No short description) */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-none">
            <Printer className="h-5 w-5" />
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Barcode Label Printing
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadProducts}
            className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handlePrintLabels}
            disabled={selectedProductsList.length === 0}
            style={{ backgroundColor: "var(--primary-color, #059669)" }}
            className="px-5 py-2.5 bg-emerald-600 hover:brightness-95 disabled:opacity-50 text-white font-black rounded-none text-sm shadow-md transition flex items-center gap-2 cursor-pointer active:scale-99"
          >
            <Printer className="h-4 w-4" />
            <span>
              Print Labels {totalStickerCount > 0 ? `(${totalStickerCount})` : ""}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content: Two Columns (Left: Clean Medicines Table, Right: Layout Settings & Live Preview) */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* LEFT COLUMN: Search, Filters & Clean Medicines Table */}
        <div className="flex-1 flex flex-col min-h-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {/* Search & Filters Bar */}
          <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Medicine Name, Generic, SKU, or Barcode..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-none text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-none text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === "ALL" ? "All Categories" : c}
                  </option>
                ))}
              </select>

              {/* Stock Filter Checkbox */}
              <label className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-none text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded-none text-emerald-600 focus:ring-emerald-500"
                />
                <span>In Stock Only</span>
              </label>
            </div>

            {/* Quick Selection Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 cursor-pointer"
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  Select All ({filteredProducts.length})
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={selectedItems.size === 0}
                  className="font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 disabled:opacity-40 cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>

              {/* Batch Quantity Setters */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <span className="text-[11px] font-semibold">Set All Copies:</span>
                <button
                  type="button"
                  onClick={() => handleSetAllQuantities(1)}
                  className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-mono font-bold text-slate-800 dark:text-slate-200 rounded-none transition cursor-pointer"
                >
                  1
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllQuantities(5)}
                  className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-mono font-bold text-slate-800 dark:text-slate-200 rounded-none transition cursor-pointer"
                >
                  5
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllQuantities(10)}
                  className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-mono font-bold text-slate-800 dark:text-slate-200 rounded-none transition cursor-pointer"
                >
                  10
                </button>
                <button
                  type="button"
                  onClick={handleMatchStockQuantities}
                  className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold rounded-none hover:bg-emerald-200 transition cursor-pointer"
                >
                  = Stock
                </button>
              </div>
            </div>
          </div>

          {/* Clean Medicines Selection List Table (No short description lines) */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Loading medicines catalog...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No medicines found matching "{search}".
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 z-10 select-none">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredProducts.length > 0 &&
                          filteredProducts.every((p) => selectedItems.has(p.id))
                        }
                        onChange={(e) => {
                          if (e.target.checked) handleSelectAllFiltered();
                          else handleClearAll();
                        }}
                        className="rounded-none text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-3">Medicine Information</th>
                    <th className="py-2.5 px-3 w-36">Barcode / SKU</th>
                    <th className="py-2.5 px-3 w-28 text-right">Price</th>
                    <th className="py-2.5 px-3 w-20 text-center">Stock</th>
                    <th className="py-2.5 px-3 w-32 text-center">Sticker Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {filteredProducts.map((p) => {
                    const isSelected = selectedItems.has(p.id);
                    const qty = selectedItems.get(p.id) || 1;
                    const barcodeVal = getProductBarcodeValue(p);
                    const stockVal = Number(p.currentStock ?? p.stock ?? 0);
                    const priceInfo = getProductDisplayPrice(p, priceMode);

                    return (
                      <tr
                        key={p.id}
                        onClick={() => toggleSelectProduct(p)}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition select-none ${
                          isSelected ? "bg-emerald-50/40 dark:bg-emerald-950/20" : ""
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectProduct(p)}
                            className="rounded-none text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </td>
                        {/* Clean Medicine Name only (no short description) */}
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {p.name}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {barcodeVal}
                          </span>
                        </td>
                        {/* Price with Box/Piece Indicator */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                            {currencySymbol}{priceInfo.amount.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold">
                            {priceInfo.unitLabel}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-1.5 py-0.5 font-mono text-[10px] font-bold rounded-none ${
                              stockVal <= 0
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {stockVal}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          {isSelected ? (
                            <div className="inline-flex items-center border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-none shadow-2xs">
                              <button
                                type="button"
                                onClick={() => updateQuantity(p.id, qty - 1)}
                                className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                max="9999"
                                value={qty}
                                onChange={(e) => updateQuantity(p.id, parseInt(e.target.value, 10))}
                                className="w-12 text-center text-xs font-mono font-bold bg-transparent outline-none py-0.5 text-slate-900 dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={() => updateQuantity(p.id, qty + 1)}
                                className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Not selected</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Bottom Table Summary Footer */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400">
              Showing <strong>{filteredProducts.length}</strong> medicines • Selected:{" "}
              <strong className="text-emerald-600 dark:text-emerald-400">
                {selectedItems.size}
              </strong>{" "}
              medicines
            </span>
            <span className="font-bold text-slate-900 dark:text-white">
              Total Labels to Print:{" "}
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                {totalStickerCount}
              </strong>
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: Sticker Layout Options & Live Preview (~35% Width) */}
        <div className="w-full lg:w-[380px] xl:w-[420px] bg-slate-50 dark:bg-slate-900/50 p-4 sm:p-5 flex flex-col space-y-4 overflow-y-auto shrink-0 select-none">
          {/* Configuration Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3.5 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              <Settings2 className="h-4 w-4 text-emerald-600" />
              <span>Label Paper & Design Settings</span>
            </div>

            {/* Sticker Size Preset */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Sticker Paper Size:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setLabelSize("38x25")}
                  className={`p-2 text-center text-xs font-bold rounded-none border transition cursor-pointer ${
                    labelSize === "38x25"
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div>38mm × 25mm</div>
                  <div className="text-[10px] font-normal text-slate-500">Standard Roll</div>
                </button>

                <button
                  type="button"
                  onClick={() => setLabelSize("50x30")}
                  className={`p-2 text-center text-xs font-bold rounded-none border transition cursor-pointer ${
                    labelSize === "50x30"
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div>50mm × 30mm</div>
                  <div className="text-[10px] font-normal text-slate-500">Large Roll</div>
                </button>

                <button
                  type="button"
                  onClick={() => setLabelSize("a4_sheet")}
                  className={`p-2 text-center text-xs font-bold rounded-none border transition cursor-pointer ${
                    labelSize === "a4_sheet"
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div>A4 Sheet</div>
                  <div className="text-[10px] font-normal text-slate-500">24 / Sheet</div>
                </button>
              </div>
            </div>

            {/* Pharmacy Brand Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pharmacy Name on Label:
              </label>
              <input
                type="text"
                value={pharmacyName}
                onChange={(e) => setPharmacyName(e.target.value)}
                placeholder="Enter pharmacy name..."
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-xs text-slate-900 dark:text-white font-semibold outline-none focus:border-emerald-500"
              />
            </div>

            {/* Price Calculation Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Price Display Mode:
              </label>
              <select
                value={priceMode}
                onChange={(e) => setPriceMode(e.target.value as PriceCalculationMode)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
              >
                <option value="AUTO">Auto (Box for Medicines, Unit for Lifestyle)</option>
                <option value="BOX_ONLY">Total Box Price for All</option>
                <option value="UNIT_ONLY">Unit / Piece Price Only</option>
              </select>
            </div>

            {/* Elements Toggles (Includes Checkbox to Show/Hide Price) */}
            <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Include on Label:
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPharmacyName}
                    onChange={(e) => setShowPharmacyName(e.target.checked)}
                    className="rounded-none text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Pharmacy Name</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showMedicineName}
                    onChange={(e) => setShowMedicineName(e.target.checked)}
                    className="rounded-none text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Medicine Name</span>
                </label>
                {/* Price Checkbox: uncheck if user doesn't want price on label */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    className="rounded-none text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-bold text-slate-800 dark:text-slate-200">MRP Price</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBarcodeText}
                    onChange={(e) => setShowBarcodeText(e.target.checked)}
                    className="rounded-none text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Barcode Text</span>
                </label>
              </div>
            </div>
          </div>

          {/* LIVE STICKER PREVIEW CARD (Clean preview with no extra description text) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900 dark:text-white">
                <Eye className="h-4 w-4 text-emerald-600" />
                <span>Live Sticker Preview</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {labelSize === "38x25" ? "38mm × 25mm" : labelSize === "50x30" ? "50mm × 30mm" : "A4 Grid"}
              </span>
            </div>

            {/* Visual Representation of the Physical Sticker */}
            <div className="flex items-center justify-center p-3 bg-slate-100 dark:bg-slate-950/80 border border-dashed border-slate-300 dark:border-slate-700 min-h-[140px]">
              {previewProduct ? (
                <div
                  className="bg-white text-black p-2 shadow-md border border-slate-300 flex flex-col items-center justify-between text-center select-text"
                  style={{
                    width: labelSize === "38x25" ? "170px" : labelSize === "50x30" ? "210px" : "190px",
                    minHeight: labelSize === "38x25" ? "105px" : labelSize === "50x30" ? "125px" : "115px",
                  }}
                >
                  {showPharmacyName && (
                    <div className="text-[10px] font-black uppercase tracking-wider text-black truncate w-full">
                      {pharmacyName || "Shapla Pharmacy"}
                    </div>
                  )}

                  {showMedicineName && (
                    <div className="text-[11px] font-extrabold line-clamp-2 leading-tight text-black mt-0.5">
                      {previewProduct.name}
                    </div>
                  )}

                  <div className="my-1 w-full flex flex-col items-center">
                    <Barcode128
                      value={getProductBarcodeValue(previewProduct)}
                      width={1.2}
                      height={26}
                      showText={showBarcodeText}
                      textSize={9}
                    />
                  </div>

                  {showPrice && (
                    <div className="text-xs font-black text-black">
                      MRP: {currencySymbol}
                      {getProductDisplayPrice(previewProduct, priceMode).amount.toFixed(2)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-400 text-center">
                  Select a medicine to preview sticker
                </div>
              )}
            </div>
          </div>

          {/* Big Print Button */}
          <button
            type="button"
            onClick={handlePrintLabels}
            disabled={selectedProductsList.length === 0}
            style={{ backgroundColor: "var(--primary-color, #059669)" }}
            className="w-full h-12 bg-emerald-600 hover:brightness-95 disabled:opacity-50 text-white font-black rounded-none text-base shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-99"
          >
            <Printer className="h-5 w-5" />
            <span>Print {totalStickerCount} Barcode Labels</span>
          </button>
        </div>
      </div>

      {/* Floating Success Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-none shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in duration-150">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
