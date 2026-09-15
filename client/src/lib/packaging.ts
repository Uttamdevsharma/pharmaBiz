export interface PackagingConfig {
  packageType?: string | null;
  boxesPerCarton?: number | null;
  stripsPerBox?: number | null;
  tabletsPerStrip?: number | null;
  unit?: string;
}

export interface PackagingBreakdown {
  isMedicine: boolean;
  tabletsPerStrip: number;
  stripsPerBox: number;
  boxesPerCarton: number;
  tabletsPerBox: number;
  tabletsPerCarton: number;
  totalTablets: number;
  totalBoxes: number;
  totalStrips: number;
  fullCartons: number;
  looseBoxes: number;
  remainingStrips: number;
  remainingTablets: number;
  displayText: string;
}

export interface LocationPackagingBreakdown {
  totalUnits: number;
  fullBoxes: number;
  openBoxes: number;
  openBoxRemainingStrips: number;
  openBoxRemainingTablets: number;
  displayText: string;
}

export interface BatchBulkPackagingBreakdown {
  fullCartons: number;
  boxesInsideCartons: number;
  looseBoxes: number;
  allocatedLooseBoxes: number;
  remainingLooseBoxes: number;
  totalEquivalentBoxes: number;
  totalStrips: number;
  totalTablets: number;
  remainingStrips: number;
  remainingTablets: number;
  unboxedStrips: number;
  unboxedTablets: number;
  formulaText: string;
}

/**
 * Accurately calculates Bulk Storage breakdown separating Full Cartons and Loose/Standalone Boxes.
 * Never double-counts boxes inside cartons and loose boxes.
 * Allocating loose boxes does not reduce the full carton count.
 */
export function calculateBatchBulkPackaging(
  batch: {
    quantity?: number;
    initialQuantity?: number;
    cartonQuantity?: number | null;
    cartonsReceived?: number | null;
    looseBoxesReceived?: number | null;
    allocatedCartons?: number | null;
    allocatedLooseBoxes?: number | null;
    boxesPerCarton?: number | null;
    stripsPerBox?: number | null;
    tabletsPerStrip?: number | null;
    packageType?: string | null;
    receivingRecords?: any[];
    fullCartons?: number | null;
    boxesInsideCartons?: number | null;
    remainingLooseBoxes?: number | null;
    totalEquivalentBoxes?: number | null;
    totalStrips?: number | null;
    totalTablets?: number | null;
    unboxedStrips?: number | null;
    unboxedTablets?: number | null;
    formulaText?: string | null;
  },
  unallocatedBulkUnits?: number,
  config?: PackagingConfig
): BatchBulkPackagingBreakdown {
  const tabsPerStrip = Math.max(1, batch.tabletsPerStrip || config?.tabletsPerStrip || 10);
  const stripsPerBox = Math.max(1, batch.stripsPerBox || config?.stripsPerBox || 10);
  const isMedicine =
    batch.packageType === "MEDICINE" ||
    config?.packageType === "MEDICINE" ||
    !config?.packageType ||
    Boolean((batch.stripsPerBox || config?.stripsPerBox) && (batch.tabletsPerStrip || config?.tabletsPerStrip));
  const tabletsPerBox = isMedicine ? stripsPerBox * tabsPerStrip : 1;
  const boxesPerCarton = Math.max(1, batch.boxesPerCarton || config?.boxesPerCarton || 10);
  const tabletsPerCarton = boxesPerCarton * tabletsPerBox;

  // 1. Tier 1: Aggregate receiving records if available
  let recCartons = 0;
  let recLooseBoxes = 0;
  let hasReceivingRecords = false;

  if (Array.isArray(batch.receivingRecords) && batch.receivingRecords.length > 0) {
    hasReceivingRecords = true;
    for (const rec of batch.receivingRecords) {
      if (rec.receivingUnit === "BOX") {
        recLooseBoxes += Number(rec.boxesReceived) || 0;
      } else {
        recCartons += Number(rec.cartonsReceived) || 0;
      }
    }
  }

  // 2. Determine inward received cartons & loose boxes
  let cartonsReceived = 0;
  let looseBoxesReceived = 0;

  if (hasReceivingRecords && (recCartons > 0 || recLooseBoxes > 0)) {
    cartonsReceived = recCartons;
    looseBoxesReceived = recLooseBoxes;
  } else if (Number(batch.cartonsReceived) > 0 || Number(batch.looseBoxesReceived) > 0) {
    cartonsReceived = Number(batch.cartonsReceived) || 0;
    looseBoxesReceived = Number(batch.looseBoxesReceived) || 0;
  } else if (Number(batch.cartonQuantity) > 0 || Number((batch as any).boxQuantity) > 0) {
    if (Number(batch.cartonQuantity) > 0) {
      cartonsReceived = Number(batch.cartonQuantity) + (Number(batch.allocatedCartons) || 0);
      looseBoxesReceived = Math.max(
        0,
        (Number((batch as any).boxQuantity) || 0) - (Number(batch.cartonQuantity) * boxesPerCarton)
      ) + (Number(batch.allocatedLooseBoxes) || 0);
    } else {
      cartonsReceived = 0;
      looseBoxesReceived = (Number((batch as any).boxQuantity) || 0) + (Number(batch.allocatedLooseBoxes) || 0);
    }
  } else {
    // Tier 4: Base units fallback
    const totalUnits = Math.max(0, Number(batch.initialQuantity) || Number(batch.quantity) || 0);
    const totalBoxes = Math.floor(totalUnits / tabletsPerBox);
    cartonsReceived = Math.floor(totalBoxes / boxesPerCarton);
    looseBoxesReceived = totalBoxes % boxesPerCarton;
  }

  // 3. Allocations
  const totalUnitsCurrent = Math.max(0, Number(batch.quantity) || 0);
  const currentBulkUnits = (unallocatedBulkUnits !== undefined && unallocatedBulkUnits !== null)
    ? Math.max(0, unallocatedBulkUnits)
    : totalUnitsCurrent;
  const totalAllocated = Math.max(0, totalUnitsCurrent - currentBulkUnits);
  const totalAllocatedBoxes = Math.floor(totalAllocated / tabletsPerBox);

  let allocatedCartons = Math.max(0, Number(batch.allocatedCartons) || 0);
  let allocatedLooseBoxes = Math.max(0, Number(batch.allocatedLooseBoxes) || 0);

  if (allocatedCartons === 0 && allocatedLooseBoxes === 0 && totalAllocated > 0) {
    allocatedLooseBoxes = Math.min(looseBoxesReceived, totalAllocatedBoxes);
    const remainingAllocatedBoxes = totalAllocatedBoxes - allocatedLooseBoxes;
    allocatedCartons = Math.min(cartonsReceived, Math.ceil(remainingAllocatedBoxes / boxesPerCarton));
  }

  // 4. Available Bulk Quantities
  let fullCartons = Math.max(0, cartonsReceived - allocatedCartons);
  if (batch.cartonQuantity !== undefined && batch.cartonQuantity !== null && Number(batch.cartonQuantity) > 0) {
    fullCartons = Math.max(0, Math.min(cartonsReceived, Number(batch.cartonQuantity)));
  }
  // Cap by available bulk
  fullCartons = Math.min(fullCartons, Math.floor(currentBulkUnits / tabletsPerCarton));
  const boxesInsideCartons = fullCartons * boxesPerCarton;

  // Remaining loose boxes
  const bulkUnitsAfterCartons = Math.max(0, currentBulkUnits - (fullCartons * tabletsPerCarton));
  const maxLooseBoxesInBulk = Math.floor(bulkUnitsAfterCartons / tabletsPerBox);
  let remainingLooseBoxes = Math.max(0, looseBoxesReceived - allocatedLooseBoxes);
  remainingLooseBoxes = Math.min(remainingLooseBoxes, maxLooseBoxesInBulk);

  if (cartonsReceived === 0 && looseBoxesReceived === 0) {
    remainingLooseBoxes = maxLooseBoxesInBulk;
  }

  // Total equivalent boxes (zero double-counting)
  const totalEquivalentBoxes = boxesInsideCartons + remainingLooseBoxes;

  // Loose unboxed strips & tablets in bulk
  const bulkUnitsAfterBoxes = Math.max(0, bulkUnitsAfterCartons - (remainingLooseBoxes * tabletsPerBox));
  const unboxedStrips = Math.floor(bulkUnitsAfterBoxes / tabsPerStrip);
  const unboxedTablets = bulkUnitsAfterBoxes % tabsPerStrip;

  const totalStrips = (totalEquivalentBoxes * stripsPerBox) + unboxedStrips;
  const totalTablets = (totalEquivalentBoxes * tabletsPerBox) + bulkUnitsAfterBoxes;

  const formulaText = `${fullCartons} Full Carton${fullCartons !== 1 ? "s" : ""} × ${boxesPerCarton} Boxes = ${boxesInsideCartons} Boxes Inside Cartons + ${remainingLooseBoxes} Loose Box${remainingLooseBoxes !== 1 ? "es" : ""} = ${totalEquivalentBoxes} Total Boxes`;

  return {
    fullCartons,
    boxesInsideCartons,
    looseBoxes: looseBoxesReceived,
    allocatedLooseBoxes,
    remainingLooseBoxes,
    totalEquivalentBoxes,
    totalStrips,
    totalTablets,
    remainingStrips: unboxedStrips,
    remainingTablets: unboxedTablets,
    unboxedStrips,
    unboxedTablets,
    formulaText,
  };
}


/**
 * Calculates complete hierarchical packaging breakdown for a given total base units.
 */
export function calculatePackaging(
  totalBaseUnits: number,
  config?: PackagingConfig
): PackagingBreakdown {
  const isMedicine =
    !config?.packageType ||
    config.packageType.toUpperCase() === "MEDICINE" ||
    Boolean(config.stripsPerBox && config.tabletsPerStrip);

  const tabsPerStrip = Math.max(1, config?.tabletsPerStrip || 10);
  const stripsPerBox = Math.max(1, config?.stripsPerBox || 10);
  const boxesPerCarton = Math.max(1, config?.boxesPerCarton || 10);

  const tabletsPerBox = stripsPerBox * tabsPerStrip;
  const tabletsPerCarton = boxesPerCarton * tabletsPerBox;

  const totalTablets = Math.max(0, totalBaseUnits || 0);

  if (!isMedicine) {
    return {
      isMedicine: false,
      tabletsPerStrip: 1,
      stripsPerBox: 1,
      boxesPerCarton: boxesPerCarton,
      tabletsPerBox: 1,
      tabletsPerCarton: boxesPerCarton,
      totalTablets,
      totalBoxes: totalTablets,
      totalStrips: totalTablets,
      fullCartons: Math.floor(totalTablets / boxesPerCarton),
      looseBoxes: totalTablets % boxesPerCarton,
      remainingStrips: 0,
      remainingTablets: 0,
      displayText: `${totalTablets} ${config?.unit || "units"}`,
    };
  }

  const fullCartons = Math.floor(totalTablets / tabletsPerCarton);
  const remainderAfterCartons = totalTablets % tabletsPerCarton;

  const totalBoxes = Math.floor(totalTablets / tabletsPerBox);
  const looseBoxes = Math.floor(remainderAfterCartons / tabletsPerBox);
  const remainderAfterBoxes = remainderAfterCartons % tabletsPerBox;

  const totalStrips = Math.floor(totalTablets / tabsPerStrip);
  const remainingStrips = Math.floor(remainderAfterBoxes / tabsPerStrip);
  const remainingTablets = remainderAfterBoxes % tabsPerStrip;

  const parts: string[] = [];
  if (fullCartons > 0) parts.push(`${fullCartons} Carton${fullCartons > 1 ? "s" : ""}`);
  if (looseBoxes > 0) parts.push(`${looseBoxes} Box${looseBoxes > 1 ? "es" : ""}`);
  if (remainingStrips > 0) parts.push(`${remainingStrips} Strip${remainingStrips > 1 ? "s" : ""}`);
  if (remainingTablets > 0 || parts.length === 0) parts.push(`${remainingTablets} Tab${remainingTablets !== 1 ? "s" : ""}`);

  return {
    isMedicine: true,
    tabletsPerStrip: tabsPerStrip,
    stripsPerBox,
    boxesPerCarton,
    tabletsPerBox,
    tabletsPerCarton,
    totalTablets,
    totalBoxes,
    totalStrips,
    fullCartons,
    looseBoxes,
    remainingStrips,
    remainingTablets,
    displayText: parts.join(", "),
  };
}

/**
 * Calculates physical location packaging details, distinguishing full boxes from open boxes.
 */
export function calculateLocationPackaging(
  locationQuantity: number,
  config?: PackagingConfig
): LocationPackagingBreakdown {
  const pType = (config?.packageType || "").toUpperCase();
  const unit = (config?.unit || "").toLowerCase();
  const isNonMedicine =
    pType === "BOTTLE" ||
    pType === "SYRUP" ||
    pType === "PIECE" ||
    pType === "EQUIPMENT" ||
    pType === "VIAL" ||
    pType === "SALINE" ||
    pType === "OTHER" ||
    unit === "bottle" ||
    unit === "piece" ||
    unit === "vial" ||
    unit === "ampoule" ||
    unit === "pack" ||
    unit === "tin";
  const isMedicine = !isNonMedicine && (
    !config?.packageType ||
    pType === "MEDICINE" ||
    pType === "TABLET"
  );

  const tabsPerStrip = Math.max(1, config?.tabletsPerStrip || 10);
  const stripsPerBox = Math.max(1, config?.stripsPerBox || 10);
  const tabletsPerBox = stripsPerBox * tabsPerStrip;

  const totalUnits = Math.max(0, locationQuantity || 0);

  if (!isMedicine) {
    return {
      totalUnits,
      fullBoxes: totalUnits,
      openBoxes: 0,
      openBoxRemainingStrips: 0,
      openBoxRemainingTablets: 0,
      displayText: `${totalUnits} ${config?.unit || "units"}`,
    };
  }

  const fullBoxes = Math.floor(totalUnits / tabletsPerBox);
  const looseTablets = totalUnits % tabletsPerBox;
  const openBoxes = looseTablets > 0 ? 1 : 0;
  const openBoxRemainingStrips = Math.floor(looseTablets / tabsPerStrip);
  const openBoxRemainingTablets = looseTablets % tabsPerStrip;

  const descParts: string[] = [];
  if (fullBoxes > 0) descParts.push(`${fullBoxes} Full Box${fullBoxes > 1 ? "es" : ""}`);
  if (openBoxes > 0) {
    const subParts: string[] = [];
    if (openBoxRemainingStrips > 0) subParts.push(`${openBoxRemainingStrips} Strip${openBoxRemainingStrips > 1 ? "s" : ""}`);
    if (openBoxRemainingTablets > 0) subParts.push(`${openBoxRemainingTablets} Tab${openBoxRemainingTablets !== 1 ? "s" : ""}`);
    descParts.push(`1 Open Box (${subParts.join(", ") || "0"})`);
  }
  if (descParts.length === 0) descParts.push("0 Tablets");

  return {
    totalUnits,
    fullBoxes,
    openBoxes,
    openBoxRemainingStrips,
    openBoxRemainingTablets,
    displayText: descParts.join(" • "),
  };
}

/**
 * Converts user selected unit quantity to lowest base units (tablets/pieces).
 */
export function convertUnitToBase(
  quantity: number,
  unitType: "CARTON" | "BOX" | "STRIP" | "TABLET" | "PIECE",
  config?: PackagingConfig
): number {
  const tabsPerStrip = Math.max(1, config?.tabletsPerStrip || 10);
  const stripsPerBox = Math.max(1, config?.stripsPerBox || 10);
  const boxesPerCarton = Math.max(1, config?.boxesPerCarton || 10);

  const tabletsPerBox = stripsPerBox * tabsPerStrip;
  const tabletsPerCarton = boxesPerCarton * tabletsPerBox;

  switch (unitType) {
    case "CARTON":
      return quantity * tabletsPerCarton;
    case "BOX":
      return quantity * tabletsPerBox;
    case "STRIP":
      return quantity * tabsPerStrip;
    case "TABLET":
    case "PIECE":
    default:
      return quantity;
  }
}
