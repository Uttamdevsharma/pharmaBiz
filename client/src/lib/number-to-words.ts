export function numberToWords(num: number | string | null | undefined): string {
  if (num === null || num === undefined) return "Zero Taka Only";
  const n = Math.round(Number(num) || 0);
  if (n === 0) return "Zero Taka Only";
  if (n < 0) return "Negative " + numberToWords(-n);

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function convertBelowThousand(val: number): string {
    let s = "";
    if (val >= 100) {
      s += ones[Math.floor(val / 100)] + " Hundred ";
      val %= 100;
    }
    if (val >= 20) {
      s += tens[Math.floor(val / 10)];
      if (val % 10 > 0) {
        s += "-" + ones[val % 10];
      }
      s += " ";
    } else if (val > 0) {
      s += ones[val] + " ";
    }
    return s.trim();
  }

  let result = "";
  let remaining = n;

  const crore = Math.floor(remaining / 10000000);
  if (crore > 0) {
    result += convertBelowThousand(crore) + " Crore ";
    remaining %= 10000000;
  }

  const lakh = Math.floor(remaining / 100000);
  if (lakh > 0) {
    result += convertBelowThousand(lakh) + " Lakh ";
    remaining %= 100000;
  }

  const thousand = Math.floor(remaining / 1000);
  if (thousand > 0) {
    result += convertBelowThousand(thousand) + " Thousand ";
    remaining %= 1000;
  }

  if (remaining > 0) {
    result += convertBelowThousand(remaining) + " ";
  }

  return result.trim() + " Taka Only";
}
