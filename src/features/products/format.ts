import { formatQty } from "@/lib/format";

/** "Φ8" / "Φ8 – Φ8" / "Φ8 → Φ6" */
export function connectionText(a: string | null, b: string | null): string | null {
  if (!a && !b) return null;
  if (!b || a === b) return a && b ? `${a} – ${b}` : (a ?? b);
  if (!a) return b;
  return `${a} → ${b}`;
}

/** "-190 °C đến 280 °C" */
export function tempText(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null;
  if (min !== null && max !== null) return `${formatQty(min)} °C đến ${formatQty(max)} °C`;
  return max !== null ? `tối đa ${formatQty(max)} °C` : `từ ${formatQty(min)} °C`;
}

/** "78 × 24 × — mm" */
export function dimsText(l: number | null, w: number | null, h: number | null): string | null {
  if (l === null && w === null && h === null) return null;
  return `${[l, w, h].map((x) => (x === null ? "—" : formatQty(x))).join(" × ")} mm`;
}

export function weightText(g: number | null): string | null {
  if (g === null) return null;
  return g >= 1000 ? `${formatQty(g / 1000)} kg` : `${formatQty(g)} g`;
}
