/**
 * Convert numbers to English currency words (BDT / Taka)
 * Example: 15600 -> "Fifteen Thousand Six Hundred Taka Only"
 */

const a = [
  "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ",
  "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "
];
const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function numToWordsUnderThousand(num: number): string {
  let str = "";
  if (num > 99) {
    str += a[Math.floor(num / 100)] + "Hundred ";
    num %= 100;
  }
  if (num > 19) {
    str += b[Math.floor(num / 10)] + (num % 10 !== 0 ? " " + a[num % 10] : " ");
  } else if (num > 0) {
    str += a[num];
  }
  return str;
}

export function numberToWords(num: number): string {
  if (num === 0) return "Zero Taka Only";
  const numRound = Math.floor(Math.abs(num));
  const paisa = Math.round((Math.abs(num) - numRound) * 100);

  const crore = Math.floor(numRound / 10000000);
  const lakh = Math.floor((numRound % 10000000) / 100000);
  const thousand = Math.floor((numRound % 100000) / 1000);
  const remainder = numRound % 1000;

  let words = "";

  if (crore > 0) {
    words += numToWordsUnderThousand(crore) + "Crore ";
  }
  if (lakh > 0) {
    words += numToWordsUnderThousand(lakh) + "Lakh ";
  }
  if (thousand > 0) {
    words += numToWordsUnderThousand(thousand) + "Thousand ";
  }
  if (remainder > 0) {
    words += numToWordsUnderThousand(remainder);
  }

  words = words.trim() + " Taka";

  if (paisa > 0) {
    words += " and " + numToWordsUnderThousand(paisa).trim() + " Paisa";
  }

  words += " Only";
  return words;
}
