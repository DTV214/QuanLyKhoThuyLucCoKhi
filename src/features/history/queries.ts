import "server-only";

import { createServerSupabase } from "@/server/supabase/server";
import type { HistoryFilters, MovementType } from "./schemas";

export type MovementRow = {
  id: number;
  type: MovementType;
  quantity: number;
  balanceAfter: number | null;
  date: string;
  createdAt: string;
  note: string | null;
  reversesId: number | null;
  reversed: boolean;
  product: { id: string; sku: string; name: string; unit: string };
  from: string | null;
  to: string | null;
  userName: string | null;
  userId: string;
  docNo: string | null;
};

/** Chuẩn hoá chữ giống f_norm trong database: bỏ dấu, Φ → phi */
export function normText(s: string) {
  return s
    .replace(/[ΦφØø⌀]\s*/g, "phi")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim();
}

export const DEFAULT_DAYS = 30;

export async function listMovements(f: HistoryFilters, today: string): Promise<{ rows: MovementRow[]; hasMore: boolean; limit: number }> {
  const limit = f.so ?? 50;
  const from = f.tu ?? shiftDate(today, -DEFAULT_DAYS);
  const to = f.den ?? today;
  const supabase = await createServerSupabase();

  const productJoin = f.q ? "product:products!stock_movements_product_id_fkey!inner" : "product:products!stock_movements_product_id_fkey";
  let query = supabase
    .from("stock_movements")
    .select(
      `id, type, quantity, balance_after, movement_date, created_at, note, reverses_id, user_id,
       ${productJoin}(id, sku, name, search_text, units(name)),
       from_loc:locations!stock_movements_from_location_id_fkey(code),
       to_loc:locations!stock_movements_to_location_id_fkey(code),
       user:profiles!stock_movements_user_id_fkey(full_name),
       doc:stock_documents!stock_movements_document_id_fkey(doc_no)`,
    )
    .gte("movement_date", from)
    .lte("movement_date", to)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (f.loai) query = query.eq("type", f.loai);
  if (f.sp) query = query.eq("product_id", f.sp);
  if (f.nguoi) query = query.eq("user_id", f.nguoi);
  if (f.q) query = query.ilike("product.search_text", `%${normText(f.q).replace(/[%_]/g, "")}%`);

  const { data, error } = await query;
  if (error) throw new Error(`Không tải được lịch sử: ${error.message}`);

  type Raw = {
    id: number;
    type: MovementType;
    quantity: number;
    balance_after: number | null;
    movement_date: string;
    created_at: string;
    note: string | null;
    reverses_id: number | null;
    user_id: string;
    product: { id: string; sku: string; name: string; units: { name: string } | null } | null;
    from_loc: { code: string } | null;
    to_loc: { code: string } | null;
    user: { full_name: string } | null;
    doc: { doc_no: string } | null;
  };
  const raw = (data ?? []) as unknown as Raw[];
  const page = raw.slice(0, limit);

  const ids = page.map((r) => r.id);
  const { data: rev } = ids.length ? await supabase.rpc("fn_reversed_ids", { p_ids: ids }) : { data: [] };
  const reversed = new Set(((rev ?? []) as unknown[]).map((x) => Number(typeof x === "object" && x ? Object.values(x)[0] : x)));

  return {
    hasMore: raw.length > limit,
    limit,
    rows: page.map((r) => ({
      id: r.id,
      type: r.type,
      quantity: Number(r.quantity),
      balanceAfter: r.balance_after === null ? null : Number(r.balance_after),
      date: r.movement_date,
      createdAt: r.created_at,
      note: r.note,
      reversesId: r.reverses_id,
      reversed: reversed.has(r.id),
      product: { id: r.product?.id ?? "", sku: r.product?.sku ?? "", name: r.product?.name ?? "(đã xoá)", unit: r.product?.units?.name ?? "" },
      from: r.from_loc?.code ?? null,
      to: r.to_loc?.code ?? null,
      userName: r.user?.full_name ?? null,
      userId: r.user_id,
      docNo: r.doc?.doc_no ?? null,
    })),
  };
}

export async function listPeople(): Promise<{ id: string; name: string }[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("profiles").select("id, full_name").order("full_name");
  return (data ?? []).map((p) => ({ id: p.id, name: p.full_name }));
}

export function shiftDate(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
