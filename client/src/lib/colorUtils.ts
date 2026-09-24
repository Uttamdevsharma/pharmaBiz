// Helper to convert hex to RGB
export function hexToRgb(hex: string): string {
  const cleanHex = hex.replace("#", "");
  let r = 5, g = 150, b = 105;
  if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  } else if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  }
  return `${r}, ${g}, ${b}`;
}
