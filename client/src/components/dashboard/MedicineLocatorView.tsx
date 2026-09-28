"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { fetchApi } from "@/lib/api";
import { useBranchContext } from "@/context/BranchContext";
import {
  Search,
  MapPin,
  Pill,
  RefreshCw,
  X,
  Compass,
  Store,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Eye,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Pagination } from "@/components/common/Pagination";

interface MedicineLocatorViewProps {
  selectedBranchId?: string;
  onNavigate?: (module: any) => void;
}

interface ProductItem {
  id: string;
  name: string;
  genericName?: string;
  manufacturer?: string;
  dosageForm?: string;
  category?: string;
  strength?: string;
  mrp?: number;
  sellingPrice?: number;
  inShopStock: number;
  inGodownStock: number;
  totalStock: number;
  locations: {
    rackName: string;
    locationDetails?: string;
    quantity: number;
  }[];
  primaryLocation: string;
}

// Bangladesh Common Brands to Generic Dictionary for Instant Prescriptions Matching
const BD_BRAND_TO_GENERIC_MAP: Record<string, { generic: string; commonStrength?: string }> = {
  // Paracetamol
  napa: { generic: "Paracetamol", commonStrength: "500mg" },
  "napa extra": { generic: "Paracetamol + Caffeine", commonStrength: "500mg+65mg" },
  ace: { generic: "Paracetamol", commonStrength: "500mg" },
  "ace plus": { generic: "Paracetamol + Caffeine", commonStrength: "500mg+65mg" },
  fast: { generic: "Paracetamol", commonStrength: "500mg" },
  pyrex: { generic: "Paracetamol", commonStrength: "500mg" },
  renova: { generic: "Paracetamol", commonStrength: "500mg" },
  reset: { generic: "Paracetamol", commonStrength: "500mg" },
  tamiphen: { generic: "Paracetamol", commonStrength: "500mg" },
  xcel: { generic: "Paracetamol", commonStrength: "500mg" },

  // Omeprazole
  seclo: { generic: "Omeprazole", commonStrength: "20mg" },
  losectil: { generic: "Omeprazole", commonStrength: "20mg" },
  omez: { generic: "Omeprazole", commonStrength: "20mg" },
  proceptin: { generic: "Omeprazole", commonStrength: "20mg" },
  extor: { generic: "Omeprazole", commonStrength: "20mg" },
  omecon: { generic: "Omeprazole", commonStrength: "20mg" },
  opton: { generic: "Omeprazole", commonStrength: "20mg" },

  // Esomeprazole
  maxpro: { generic: "Esomeprazole", commonStrength: "20mg" },
  sergel: { generic: "Esomeprazole", commonStrength: "20mg" },
  nexum: { generic: "Esomeprazole", commonStrength: "20mg" },
  nexpro: { generic: "Esomeprazole", commonStrength: "20mg" },
  esonix: { generic: "Esomeprazole", commonStrength: "20mg" },
  eso: { generic: "Esomeprazole", commonStrength: "20mg" },

  // Pantoprazole
  pantonix: { generic: "Pantoprazole", commonStrength: "20mg" },
  pantobex: { generic: "Pantoprazole", commonStrength: "20mg" },
  trupan: { generic: "Pantoprazole", commonStrength: "20mg" },
  protonix: { generic: "Pantoprazole", commonStrength: "20mg" },
  panto: { generic: "Pantoprazole", commonStrength: "20mg" },

  // Rabeprazole
  finix: { generic: "Rabeprazole", commonStrength: "20mg" },
  rabeca: { generic: "Rabeprazole", commonStrength: "20mg" },
  rabeloc: { generic: "Rabeprazole", commonStrength: "20mg" },
  acifix: { generic: "Rabeprazole", commonStrength: "20mg" },

  // Montelukast
  monas: { generic: "Montelukast", commonStrength: "10mg" },
  provair: { generic: "Montelukast", commonStrength: "10mg" },
  montene: { generic: "Montelukast", commonStrength: "10mg" },
  odmon: { generic: "Montelukast", commonStrength: "10mg" },
  lumona: { generic: "Montelukast", commonStrength: "10mg" },
  moncast: { generic: "Montelukast", commonStrength: "10mg" },
  aflast: { generic: "Montelukast", commonStrength: "10mg" },

  // Cetirizine
  alatrol: { generic: "Cetirizine", commonStrength: "10mg" },
  cetriz: { generic: "Cetirizine", commonStrength: "10mg" },
  triz: { generic: "Cetirizine", commonStrength: "10mg" },
  atriz: { generic: "Cetirizine", commonStrength: "10mg" },
  cetirin: { generic: "Cetirizine", commonStrength: "10mg" },

  // Fexofenadine
  fexo: { generic: "Fexofenadine", commonStrength: "120mg" },
  axodin: { generic: "Fexofenadine", commonStrength: "120mg" },
  fexofen: { generic: "Fexofenadine", commonStrength: "120mg" },
  dinfe: { generic: "Fexofenadine", commonStrength: "120mg" },

  // Bilastine
  bilaxten: { generic: "Bilastine", commonStrength: "20mg" },
  bilast: { generic: "Bilastine", commonStrength: "20mg" },
  bilarin: { generic: "Bilastine", commonStrength: "20mg" },

  // Antibiotics - Ciprofloxacin
  ciprocin: { generic: "Ciprofloxacin", commonStrength: "500mg" },
  neofloxin: { generic: "Ciprofloxacin", commonStrength: "500mg" },
  beuflox: { generic: "Ciprofloxacin", commonStrength: "500mg" },
  cipro: { generic: "Ciprofloxacin", commonStrength: "500mg" },

  // Antibiotics - Cefixime
  "cef-3": { generic: "Cefixime", commonStrength: "200mg" },
  triocid: { generic: "Cefixime", commonStrength: "200mg" },
  oricef: { generic: "Cefixime", commonStrength: "200mg" },
  denvar: { generic: "Cefixime", commonStrength: "200mg" },

  // Antibiotics - Azithromycin
  zimax: { generic: "Azithromycin", commonStrength: "500mg" },
  azithral: { generic: "Azithromycin", commonStrength: "500mg" },
  tridosil: { generic: "Azithromycin", commonStrength: "500mg" },
  zithrin: { generic: "Azithromycin", commonStrength: "500mg" },

  // Pain / NSAIDs - Aceclofenac
  flexi: { generic: "Aceclofenac", commonStrength: "100mg" },
  aceclo: { generic: "Aceclofenac", commonStrength: "100mg" },
  rez: { generic: "Aceclofenac", commonStrength: "100mg" },
  mover: { generic: "Aceclofenac", commonStrength: "100mg" },

  // Pain / NSAIDs - Ketorolac
  torax: { generic: "Ketorolac", commonStrength: "10mg" },
  rolac: { generic: "Ketorolac", commonStrength: "10mg" },
  minolac: { generic: "Ketorolac", commonStrength: "10mg" },

  // Domperidone
  motigut: { generic: "Domperidone", commonStrength: "10mg" },
  vidon: { generic: "Domperidone", commonStrength: "10mg" },
  omastin: { generic: "Domperidone", commonStrength: "10mg" },
  deflux: { generic: "Domperidone", commonStrength: "10mg" },

  // Metronidazole
  amodis: { generic: "Metronidazole", commonStrength: "400mg" },
  filmet: { generic: "Metronidazole", commonStrength: "400mg" },
  flamyd: { generic: "Metronidazole", commonStrength: "400mg" },

  // Calcium + Vit D3
  "coralcal-d": { generic: "Calcium Orotate + Vitamin D3", commonStrength: "Standard" },
  "calbo-d": { generic: "Calcium Carbonate + Vitamin D3", commonStrength: "500mg+200IU" },
  "ostocal-d": { generic: "Calcium Carbonate + Vitamin D3", commonStrength: "500mg+200IU" },
  "aristocal-d": { generic: "Calcium Carbonate + Vitamin D3", commonStrength: "500mg+200IU" },

  // Losartan
  osartil: { generic: "Losartan Potassium", commonStrength: "50mg" },
  angilock: { generic: "Losartan Potassium", commonStrength: "50mg" },
  losan: { generic: "Losartan Potassium", commonStrength: "50mg" },
  prosan: { generic: "Losartan Potassium", commonStrength: "50mg" },

  // Amlodipine
  amdocal: { generic: "Amlodipine", commonStrength: "5mg" },
  camlodin: { generic: "Amlodipine", commonStrength: "5mg" },
  amlopin: { generic: "Amlodipine", commonStrength: "5mg" },

  // Bisoprolol
  bisocor: { generic: "Bisoprolol Fumarate", commonStrength: "2.5mg" },
  concor: { generic: "Bisoprolol Fumarate", commonStrength: "5mg" },
  cardibis: { generic: "Bisoprolol Fumarate", commonStrength: "2.5mg" },

  // Atorvastatin
  atova: { generic: "Atorvastatin", commonStrength: "10mg" },
  anstat: { generic: "Atorvastatin", commonStrength: "10mg" },
  lipicon: { generic: "Atorvastatin", commonStrength: "10mg" },
  torvan: { generic: "Atorvastatin", commonStrength: "10mg" },
  lipitor: { generic: "Atorvastatin", commonStrength: "10mg" },

  // Rosuvastatin
  rosu: { generic: "Rosuvastatin", commonStrength: "10mg" },
  rovas: { generic: "Rosuvastatin", commonStrength: "10mg" },
  rosuva: { generic: "Rosuvastatin", commonStrength: "10mg" },

  // Clopidogrel
  anclog: { generic: "Clopidogrel", commonStrength: "75mg" },
  plagrin: { generic: "Clopidogrel", commonStrength: "75mg" },
  lopirel: { generic: "Clopidogrel", commonStrength: "75mg" },

  // Diabetes - Metformin
  combid: { generic: "Metformin + Teneligliptin", commonStrength: "500mg+20mg" },
  comet: { generic: "Metformin Hydrochloride", commonStrength: "500mg" },
  daomet: { generic: "Metformin Hydrochloride", commonStrength: "500mg" },
  oramet: { generic: "Metformin Hydrochloride", commonStrength: "500mg" },

  // Diabetes - Gliclazide
  diapro: { generic: "Gliclazide", commonStrength: "80mg" },
  glicron: { generic: "Gliclazide", commonStrength: "80mg" },
  diamicron: { generic: "Gliclazide", commonStrength: "30mg MR" },

  // Diabetes - Linagliptin
  trajenta: { generic: "Linagliptin", commonStrength: "5mg" },
  linaglip: { generic: "Linagliptin", commonStrength: "5mg" },

  // Respiratory - Doxofylline
  doxiva: { generic: "Doxofylline", commonStrength: "400mg" },
  pulmonext: { generic: "Doxofylline", commonStrength: "400mg" },

  // Respiratory - Salbutamol
  ventolin: { generic: "Salbutamol", commonStrength: "4mg" },
  sultolin: { generic: "Salbutamol", commonStrength: "4mg" },
  windel: { generic: "Salbutamol", commonStrength: "4mg" },

  // Antibiotics - Amoxicillin + Clavulanate
  moxaclav: { generic: "Amoxicillin + Clavulanic Acid", commonStrength: "625mg" },
  klavunat: { generic: "Amoxicillin + Clavulanic Acid", commonStrength: "625mg" },
  fimoxyl: { generic: "Amoxicillin", commonStrength: "500mg" },

  // Antibiotics - Cefuroxime
  kilbac: { generic: "Cefuroxime Axetil", commonStrength: "500mg" },
  "cerox-a": { generic: "Cefuroxime Axetil", commonStrength: "500mg" },
  cefur: { generic: "Cefuroxime Axetil", commonStrength: "500mg" },

  // Gastrointestinal - Antacid
  antacid: { generic: "Aluminium Hydroxide + Magnesium Hydroxide", commonStrength: "Chewable" },
  entacyd: { generic: "Aluminium Hydroxide + Magnesium Hydroxide", commonStrength: "Plus" },
  magfin: { generic: "Aluminium Hydroxide + Magnesium Hydroxide", commonStrength: "Suspension" },

  // Gastrointestinal - Timonium Methylsulphate (Spasm / Abdominal pain)
  visceralgine: { generic: "Timonium Methylsulphate", commonStrength: "50mg" },
  timon: { generic: "Timonium Methylsulphate", commonStrength: "50mg" },
  norvis: { generic: "Timonium Methylsulphate", commonStrength: "50mg" },

  // Zinc
  babyzinc: { generic: "Zinc Sulfate", commonStrength: "20mg" },
  "zif-ci": { generic: "Carbonyl Iron + Folic Acid + Zinc", commonStrength: "Capsule" },
  zes: { generic: "Zinc Sulfate", commonStrength: "20mg" },
};

export function MedicineLocatorView({
  selectedBranchId: propBranchId,
  onNavigate,
}: MedicineLocatorViewProps) {
  const { selectedBranchId: contextBranchId, currentBranch, isAllBranches } = useBranchContext();
  const effectiveBranchId = propBranchId !== undefined ? propBranchId : contextBranchId;

  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedModalProduct, setSelectedModalProduct] = useState<ProductItem | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener (/ to focus, Escape to clear)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === "Escape" && searchQuery) {
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (effectiveBranchId && effectiveBranchId !== "all") {
        params.append("branchId", effectiveBranchId);
      }
      params.append("limit", "2500");

      const res = await fetchApi<any>(`/inventory?${params.toString()}`);
      if (res?.success && Array.isArray(res.data)) {
        setInventory(res.data);
      } else if (Array.isArray(res)) {
        setInventory(res);
      } else {
        setInventory([]);
      }
    } catch (err) {
      console.error("Failed to load inventory for medicine locator", err);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [effectiveBranchId]);

  // Aggregate inventory items by distinct product
  const productsMap = useMemo(() => {
    const map = new Map<string, ProductItem>();

    inventory.forEach((item: any) => {
      const prod = item.product;
      const prodId = prod?.id || item.productId;
      if (!prodId) return;

      const totalBatchQty = item.quantity || 0;
      let allocatedQtyInBatch = 0;
      const batchLocations: { rackName: string; locationDetails?: string; quantity: number }[] = [];

      const locs = Array.isArray(item.locations) ? item.locations : [];
      locs.forEach((loc: any) => {
        const qty = Number(loc.quantity) || 0;
        allocatedQtyInBatch += qty;
        const rName = loc.rack?.name || (loc.rackName && loc.rackName !== "—" ? loc.rackName : "");
        const rLoc = loc.rack?.location || "";
        const sName = loc.shelf?.name || (loc.shelfName && loc.shelfName !== "—" ? loc.shelfName : "");
        const bName = loc.bin?.name || (loc.binName && loc.binName !== "—" ? loc.binName : "");

        const details = [rLoc, sName, bName].filter(Boolean).join(" • ");
        if (qty > 0 && rName) {
          batchLocations.push({
            rackName: rName,
            locationDetails: details || undefined,
            quantity: qty,
          });
        }
      });

      const godownQtyInBatch = Math.max(0, totalBatchQty - allocatedQtyInBatch);

      if (!map.has(prodId)) {
        const rawCat =
          prod?.category?.name ||
          prod?.categoryName ||
          (typeof prod?.category === "string" ? prod?.category : "") ||
          prod?.dosageForm ||
          "";
        map.set(prodId, {
          id: prodId,
          name: prod?.name || item.name || "Unknown Medicine",
          genericName: prod?.genericName || item.genericName || "",
          manufacturer: prod?.manufacturer || item.manufacturer || prod?.brandName || "",
          dosageForm: prod?.dosageForm || prod?.form || "Tablet",
          category: rawCat.trim() || undefined,
          strength: prod?.strength || "",
          mrp: prod?.mrp || item.mrp || item.sellingPrice || 0,
          sellingPrice: item.sellingPrice || prod?.mrp || 0,
          inShopStock: 0,
          inGodownStock: 0,
          totalStock: 0,
          locations: [],
          primaryLocation: "",
        });
      }

      const pEntry = map.get(prodId)!;
      pEntry.inShopStock += allocatedQtyInBatch;
      pEntry.inGodownStock += godownQtyInBatch;
      pEntry.totalStock += totalBatchQty;

      batchLocations.forEach((bl) => {
        const existingLoc = pEntry.locations.find((l) => l.rackName === bl.rackName);
        if (existingLoc) {
          existingLoc.quantity += bl.quantity;
        } else {
          pEntry.locations.push({ ...bl });
        }
      });
    });

    // Derive primary location string
    map.forEach((p) => {
      if (p.locations.length > 0) {
        const sorted = [...p.locations].sort((a, b) => b.quantity - a.quantity);
        const top = sorted[0];
        p.primaryLocation = top.locationDetails ? `${top.rackName} (${top.locationDetails})` : top.rackName;
        if (sorted.length > 1) {
          p.primaryLocation += ` +${sorted.length - 1} more`;
        }
      } else if (p.inGodownStock > 0) {
        p.primaryLocation = "Godown Only (Not in shop shelf)";
      } else {
        p.primaryLocation = "Out of Stock";
      }
    });

    return map;
  }, [inventory]);

  const allProducts = useMemo(() => Array.from(productsMap.values()), [productsMap]);

  // Index medicines by generic name for instant alternative lookup
  const genericGroupsMap = useMemo(() => {
    const map = new Map<string, ProductItem[]>();

    allProducts.forEach((p) => {
      const genKey = (p.genericName || "").trim().toLowerCase();
      if (!genKey) return;
      if (!map.has(genKey)) {
        map.set(genKey, []);
      }
      map.get(genKey)!.push(p);
    });

    return map;
  }, [allProducts]);

  // Smart Generic Discovery: If the user searches for a brand not in shop stock or unlisted, look up in BD Dictionary
  const smartGenericSuggestion = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q || q.length < 2) return null;

    // Check if the query matches a brand directly in BD Dictionary
    // Exact or prefix match in BD_BRAND_TO_GENERIC_MAP
    let foundEntry: { brand: string; generic: string; commonStrength?: string } | null = null;

    for (const [brandKey, val] of Object.entries(BD_BRAND_TO_GENERIC_MAP)) {
      if (brandKey === q || q.startsWith(brandKey) || brandKey.startsWith(q)) {
        foundEntry = { brand: brandKey, ...val };
        break;
      }
    }

    if (!foundEntry) return null;

    // Find available alternatives in our shop with this generic formula
    const genKey = foundEntry.generic.toLowerCase();
    const availableInShop = (genericGroupsMap.get(genKey) || []).filter((p) => p.inShopStock > 0);

    return {
      searchedTerm: q,
      matchedBrand: foundEntry.brand,
      genericFormula: foundEntry.generic,
      commonStrength: foundEntry.commonStrength,
      availableCount: availableInShop.length,
      availableProducts: availableInShop,
    };
  }, [searchQuery, genericGroupsMap]);

  // Available categories list
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    allProducts.forEach((p) => {
      if (p.category) set.add(p.category);
      if (p.dosageForm) set.add(p.dosageForm);
    });
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [allProducts]);

  // Filter products matching search query and selected category
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const cat = selectedCategory.toLowerCase();

    // Check if query matches generic directly
    const directGeneric = smartGenericSuggestion?.genericFormula.toLowerCase();

    return allProducts.filter((p) => {
      if (selectedCategory !== "all") {
        const prodCat = (p.category || "").toLowerCase();
        const prodForm = (p.dosageForm || "").toLowerCase();
        if (prodCat !== cat && prodForm !== cat) {
          return false;
        }
      }

      if (!q) return true;

      const nameMatch = p.name.toLowerCase().includes(q);
      const genMatch = (p.genericName || "").toLowerCase().includes(q);
      const mfgMatch = (p.manufacturer || "").toLowerCase().includes(q);
      const locMatch = p.locations.some(
        (l) => l.rackName.toLowerCase().includes(q) || (l.locationDetails || "").toLowerCase().includes(q)
      );

      // If smart generic was suggested, include all medicines sharing that generic formula too!
      const smartGenMatch = directGeneric ? (p.genericName || "").toLowerCase().includes(directGeneric) : false;

      return nameMatch || genMatch || mfgMatch || locMatch || smartGenMatch;
    });
  }, [allProducts, searchQuery, selectedCategory, smartGenericSuggestion]);

  // Reset page and modal when search or category changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedModalProduct(null);
  }, [searchQuery, selectedCategory]);

  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // Alternatives for the selected modal product
  const modalAlternatives = useMemo(() => {
    if (!selectedModalProduct) return [];
    const genKey = (selectedModalProduct.genericName || "").trim().toLowerCase();
    if (!genKey) return [];
    return (genericGroupsMap.get(genKey) || []).filter((alt) => alt.id !== selectedModalProduct.id);
  }, [selectedModalProduct, genericGroupsMap]);

  // Pagination page numbers window
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const startRecord = filteredProducts.length > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endRecord = Math.min(currentPage * pageSize, filteredProducts.length);

  return (
    <div className="space-y-4 pb-14 w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Compass className="h-6 w-6 text-brand-primary" />
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            Medicine Locator
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300">
            <Store className="h-3.5 w-3.5 text-emerald-600" />
            <span className="font-bold text-slate-900 dark:text-white">
              {isAllBranches ? "All Branches" : currentBranch?.name || "Selected Branch"}
            </span>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="h-8 px-3 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search Bar & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Prominent, wide, focused search bar */}
        <div className="relative flex-1 max-w-2xl">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search medicine brand (e.g. Napa, Seclo) or generic formula..."
            className="w-full h-11 sm:h-12 pl-11 pr-10 text-sm sm:text-base font-semibold rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 shadow-xs transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                searchInputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
              title="Clear search"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Category-wise Filter Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative min-w-[170px] sm:min-w-[200px]">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-11 sm:h-12 pl-3.5 pr-8 text-xs sm:text-sm font-semibold rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 cursor-pointer appearance-none shadow-xs"
            >
              <option value="all">All Categories</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {selectedCategory !== "all" && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("all");
                setCurrentPage(1);
              }}
              className="h-11 sm:h-12 px-3 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Smart Generic Discovery Notice (If an unstocked brand or known brand is searched) */}
      {smartGenericSuggestion && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-xs text-emerald-900 dark:text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <span>
                <strong>{smartGenericSuggestion.matchedBrand.toUpperCase()}</strong> is{" "}
                <strong className="underline underline-offset-2">
                  {smartGenericSuggestion.genericFormula}
                </strong>
                {smartGenericSuggestion.commonStrength ? ` (${smartGenericSuggestion.commonStrength})` : ""}
              </span>
              <span className="mx-1.5 text-emerald-400">•</span>
              <span className="text-emerald-700 dark:text-emerald-400">
                {smartGenericSuggestion.availableCount > 0
                  ? `${smartGenericSuggestion.availableCount} alternative brand(s) in shop`
                  : "No brands in shop"}
              </span>
            </div>
          </div>

          {smartGenericSuggestion.availableCount > 0 && (
            <button
              type="button"
              onClick={() => setSearchQuery(smartGenericSuggestion.genericFormula)}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs whitespace-nowrap transition cursor-pointer self-start sm:self-center"
            >
              Filter Formula
            </button>
          )}
        </div>
      )}

      {/* Medicine Locator Results Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
        {loading ? (
          /* Animated Skeleton Table */
          <div className="p-4 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse flex items-center justify-between py-4 px-4 border border-slate-100 dark:border-slate-800/80 rounded-lg bg-slate-50/50 dark:bg-slate-800/30"
              >
                <div className="h-5 w-12 bg-slate-200 dark:bg-slate-700 rounded-sm" />
                <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded-sm" />
                <div className="h-5 w-36 bg-slate-200 dark:bg-slate-700 rounded-sm" />
                <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded-sm" />
                <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded-sm" />
                <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded-lg" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-14 text-center text-slate-400 space-y-2">
            <Pill className="h-9 w-9 mx-auto text-slate-300 dark:text-slate-700 mb-1" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No medicines found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery
                ? `No medicine matched "${searchQuery}".`
                : "No inventory records in this branch."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-xs">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4">Medicine Name &amp; Company</th>
                  <th className="py-3.5 px-4">Generic Formula</th>
                  <th className="py-3.5 px-4">Location in Shop</th>
                  <th className="py-3.5 px-4">In Shop Stock</th>
                  <th className="py-3.5 px-4 text-center">Alternatives</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {paginatedProducts.map((p, idx) => {
                  const rowNum = (currentPage - 1) * pageSize + idx + 1;
                  const inStock = p.inShopStock > 0;
                  const unitLabel = p.dosageForm || "tablet";
                  const genKey = (p.genericName || "").trim().toLowerCase();
                  const alternatives = genKey
                    ? (genericGroupsMap.get(genKey) || []).filter((alt) => alt.id !== p.id)
                    : [];
                  const availableAltCount = alternatives.filter((alt) => alt.inShopStock > 0).length;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                        !inStock ? "bg-rose-50/20 dark:bg-rose-950/10" : ""
                      }`}
                    >
                      {/* Row Index */}
                      <td className="py-4 px-4 text-center text-slate-400 font-mono text-sm font-bold">
                        {rowNum}
                      </td>

                      {/* Medicine Name & Company */}
                      <td className="py-4 px-4">
                        <div className="font-black text-slate-900 dark:text-white text-base sm:text-lg">
                          {p.name}
                          {p.strength && (
                            <span className="ml-1.5 text-xs sm:text-sm font-bold text-slate-500">
                              ({p.strength})
                            </span>
                          )}
                        </div>
                        {p.manufacturer && (
                          <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                            {p.manufacturer}
                          </div>
                        )}
                      </td>

                      {/* Generic Formula (Clickable to instant filter) */}
                      <td className="py-4 px-4">
                        {p.genericName ? (
                          <button
                            type="button"
                            onClick={() => setSearchQuery(p.genericName || "")}
                            className="text-sm sm:text-base font-bold text-brand-primary hover:underline cursor-pointer text-left"
                            title="Click to search all medicines with this formula"
                          >
                            {p.genericName}
                          </button>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>

                      {/* Location in Shop */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {p.locations.length > 0 ? (
                          <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-black text-sm sm:text-base">
                            <MapPin className="h-4 w-4 text-brand-primary shrink-0" />
                            <span>{p.primaryLocation}</span>
                          </div>
                        ) : p.inGodownStock > 0 ? (
                          <span className="text-amber-700 dark:text-amber-400 text-xs sm:text-sm font-semibold">
                            Godown Only (Not in shop shelf)
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs sm:text-sm font-normal">
                            Not in rack
                          </span>
                        )}
                      </td>

                      {/* In Shop Stock */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {inStock ? (
                          <div>
                            <span className="inline-flex items-center gap-1.5 text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-400">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              {p.inShopStock.toLocaleString()} {unitLabel}
                            </span>
                            {p.inGodownStock > 0 && (
                              <div className="text-xs font-semibold text-slate-400 mt-0.5">
                                Godown: {p.inGodownStock.toLocaleString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1.5 text-sm font-black text-rose-600 dark:text-rose-400">
                              <span className="h-2 w-2 rounded-full bg-rose-500" />
                              Out of Stock
                            </span>
                            {p.inGodownStock > 0 && (
                              <div className="text-xs font-bold text-amber-600 mt-0.5">
                                In Godown: {p.inGodownStock.toLocaleString()}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Alternatives Eye Icon + Count */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        {alternatives.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setSelectedModalProduct(p)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-brand-primary hover:text-white dark:hover:bg-brand-primary dark:hover:text-white border border-slate-200 dark:border-slate-700 shadow-xs"
                            title="View alternative brands"
                          >
                            <Eye className="h-4 w-4 shrink-0 text-brand-primary group-hover:text-white" />
                            <span>{availableAltCount}</span>
                          </button>
                        ) : (
                          <span className="text-sm text-slate-300 dark:text-slate-600 font-mono">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Industry Standard Bottom Pagination Footer */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-white dark:bg-slate-900">
          {/* Left: Showing count & Show per page selector */}
          <div className="flex items-center gap-3 text-slate-500 font-medium">
            <span>
              Showing <strong className="text-slate-900 dark:text-white">{startRecord}</strong> to{" "}
              <strong className="text-slate-900 dark:text-white">{endRecord}</strong> of{" "}
              <strong className="text-slate-900 dark:text-white">{filteredProducts.length}</strong> records
            </span>

            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>

            <div className="flex items-center gap-1.5">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-7 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>per page</span>
            </div>
          </div>

          {/* Right: Previous / Page Numbers / Next */}
          <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold transition flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-1">
              {getPageNumbers().map((p, idx) => {
                if (p === "...") {
                  return (
                    <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 font-mono text-xs select-none">
                      ...
                    </span>
                  );
                }
                const isCurrent = p === currentPage;
                return (
                  <button
                    key={`page-${p}`}
                    type="button"
                    onClick={() => setCurrentPage(p as number)}
                    className={`min-w-[2rem] h-8 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                      isCurrent
                        ? "bg-brand-primary text-white font-black shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold transition flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Alternatives Popup Modal (With Scrollbar & only 4 columns: Product Name, Generic, Location, Available Stock) */}
      {selectedModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-brand-primary" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Alternative Brands ({modalAlternatives.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedModalProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body with Scrollbar: ONLY 4 columns */}
            <div className="p-4 overflow-y-auto max-h-[60vh] divide-y divide-slate-100 dark:divide-slate-800">
              {modalAlternatives.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">
                  No alternative brands found in inventory.
                </p>
              ) : (
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 sticky top-0 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Product Name</th>
                        <th className="py-2.5 px-3">Generic</th>
                        <th className="py-2.5 px-3">Location</th>
                        <th className="py-2.5 px-3 text-right">Available Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {modalAlternatives.map((alt) => {
                        const altInStock = alt.inShopStock > 0;
                        return (
                          <tr key={alt.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                            {/* Product Name */}
                            <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                              {alt.name}
                              {alt.strength && (
                                <span className="ml-1 text-slate-500 font-normal text-xs">
                                  ({alt.strength})
                                </span>
                              )}
                            </td>

                            {/* Generic */}
                            <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                              {alt.genericName || "—"}
                            </td>

                            {/* Location */}
                            <td className="py-3 px-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-brand-primary shrink-0" />
                                <span>{alt.primaryLocation}</span>
                              </div>
                            </td>

                            {/* Available Stock */}
                            <td className="py-3 px-3 text-right whitespace-nowrap font-bold">
                              {altInStock ? (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  {alt.inShopStock.toLocaleString()} {alt.dosageForm || "unit"}
                                </span>
                              ) : (
                                <span className="text-rose-500 text-xs">Out of Stock</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-800/20">
              <button
                type="button"
                onClick={() => setSelectedModalProduct(null)}
                className="px-4 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
