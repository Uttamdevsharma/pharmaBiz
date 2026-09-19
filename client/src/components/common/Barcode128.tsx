"use client";

import React, { useMemo } from "react";

// Code 128 Pattern tables (Subset B)
// Each number string represents width of alternating bars and spaces [b1, s1, b2, s2, b3, s3]
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
  100: "114131", 101: "311141", 102: "411131", 103: "211412", // Start A
  104: "211214", // Start B
  105: "211232", // Start C
  106: "2331112", // STOP
};

interface Barcode128Props {
  value: string;
  width?: number; // scale width per module
  height?: number; // height in px
  showText?: boolean;
  className?: string;
  textSize?: number;
}

export function Barcode128({
  value,
  width = 1.6,
  height = 44,
  showText = true,
  className = "",
  textSize = 12,
}: Barcode128Props) {
  const { bars, totalModules } = useMemo(() => {
    if (!value || typeof value !== "string") {
      return { bars: [], totalModules: 0 };
    }

    // Use Code 128 Subset B
    const startCode = 104; // START B
    let checksum = startCode;
    const codes: number[] = [startCode];

    for (let i = 0; i < value.length; i++) {
      const charCode = value.charCodeAt(i);
      const codeVal = charCode - 32;
      if (codeVal >= 0 && codeVal <= 95) {
        codes.push(codeVal);
        checksum += codeVal * (i + 1);
      }
    }

    const checkDigit = checksum % 103;
    codes.push(checkDigit);
    codes.push(106); // STOP

    // Build modules string ("1" = bar, "0" = space)
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

    // Group adjacent "1"s into rects
    const rects: Array<{ x: number; w: number }> = [];
    let currentX = 10; // Quiet zone (10 modules)
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

    const total = currentX + 10; // Extra 10 modules for right quiet zone
    return { bars: rects, totalModules: total };
  }, [value]);

  if (!value || bars.length === 0) return null;

  const svgWidth = Math.round(totalModules * width);

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <svg
        viewBox={`0 0 ${totalModules} ${height}`}
        width={svgWidth}
        height={height}
        style={{ display: "block", shapeRendering: "crispEdges" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="0" y="0" width={totalModules} height={height} fill="#ffffff" />
        {bars.map((bar, idx) => (
          <rect key={idx} x={bar.x} y="0" width={bar.w} height={height} fill="#000000" />
        ))}
      </svg>
      {showText && (
        <span
          className="font-mono tracking-widest text-black text-center font-bold mt-1"
          style={{ fontSize: `${textSize}px`, letterSpacing: "0.2em" }}
        >
          {value}
        </span>
      )}
    </div>
  );
}
