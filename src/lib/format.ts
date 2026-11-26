const qtyFormatter = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 });

/** 1250.5 → "1.250,5" — dùng cho mọi số lượng trên giao diện */
export function formatQty(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return qtyFormatter.format(Number.isFinite(n) ? n : 0);
}
