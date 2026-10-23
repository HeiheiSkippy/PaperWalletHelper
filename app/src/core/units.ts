// Decimal text such as "2.5" to base units. Null when it is not a plain
// non-negative number or carries more decimals than the token has.
export function parseAmount(text: string, decimals: number): bigint | null {
  const trimmed = text.trim();
  if (!/^\d*(?:\.\d*)?$/.test(trimmed) || trimmed === '' || trimmed === '.') {
    return null;
  }
  const [whole, fraction = ''] = trimmed.split('.');
  if (fraction.length > decimals) {
    return null;
  }
  return BigInt((whole || '0') + fraction.padEnd(decimals, '0'));
}

// Base units to decimal text, cut (not rounded) to maxFraction digits.
export function formatAmount(
  value: bigint,
  decimals: number,
  maxFraction = decimals,
): string {
  const negative = value < 0n;
  const digits = (negative ? -value : value)
    .toString()
    .padStart(decimals + 1, '0');
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = digits
    .slice(digits.length - decimals)
    .slice(0, maxFraction)
    .replace(/0+$/, '');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (negative ? '-' : '') + grouped + (fraction ? '.' + fraction : '');
}
