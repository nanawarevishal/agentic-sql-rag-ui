export function titleize(text: string): string {
  return text.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Low-risk heuristic: only prefix currency for columns that clearly are one -
// "total" alone is too broad (order counts are often "total_orders").
const MONEY_KEY_PATTERN = /revenue|price|amount|cost|payment|earnings|spend/i;

export function formatValue(value: number, key: string): string {
  const formatted = value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return MONEY_KEY_PATTERN.test(key) ? `$${formatted}` : formatted;
}
