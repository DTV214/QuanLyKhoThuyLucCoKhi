"use server";

import { revalidatePath } from "next/cache";
import { fail, fromZodError, mapDbError, ok, type ActionResult } from "@/lib/action-result";
import { MANAGER_ROLES } from "@/lib/roles";
import { authorizeAction } from "@/server/auth/guard";
import { createServerSupabase } from "@/server/supabase/server";
import { adjustSchema, quickSearchSchema, receiptSchema, takeStockSchema, transferSchema } from "./schemas";
import type { QuickProduct } from "./types";

const LOGIN_AGAIN = "Phiên đăng nhập đã hết, vui lòng đăng nhập lại";

function refresh(productIds: string[]) {
  revalidatePath("/tim-hang");
  revalidatePath("/kho");
  for (const id of new Set(productIds)) revalidatePath(`/mat-hang/${id}`);
}

/** LẤY HÀNG — trừ kho tại 1 vị trí (mọi người) */
export async function takeStock(
  input: unknown,
): Promise<ActionResult<{ remainingAtLocation: number; totalRemaining: number; locationCode: string }>> {
  if (!(await authorizeAction())) return fail(LOGIN_AGAIN);
  const parsed = takeStockSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const v = parsed.data;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("fn_stock_out", {
    p_product_id: v.productId,
    p_location_id: v.locationId,
    p_quantity: v.quantity,
    p_date: v.date,
    p_note: v.note,
  });
  if (error) return fail(mapDbError(error));
  refresh([v.productId]);
  return ok({
    remainingAtLocation: Number(data.remaining_at_location),
    totalRemaining: Number(data.total_remaining),
    locationCode: data.location_code as string,
  });
}

/** CHUYỂN KỆ / CHUYỂN KHO (mọi người) */
export async function transferStock(input: unknown): Promise<ActionResult<{ remainingAtFrom: number }>> {
  if (!(await authorizeAction())) return fail(LOGIN_AGAIN);
  const parsed = transferSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const v = parsed.data;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("fn_transfer", {
    p_product_id: v.productId,
    p_from_location_id: v.fromLocationId,
    p_to_location_id: v.toLocationId,
    p_quantity: v.quantity,
    p_date: v.date,
    p_note: v.note,
  });
  if (error) return fail(mapDbError(error));
  refresh([v.productId]);
  return ok({ remainingAtFrom: Number(data.remaining_at_from) }, "Đã chuyển hàng");
}

/** KIỂM KÊ — đặt số đếm thực tế (chỉ ông chủ / quản trị) */
export async function adjustStock(input: unknown): Promise<ActionResult<{ difference: number }>> {
  if (!(await authorizeAction(MANAGER_ROLES))) return fail("Chỉ ông chủ hoặc quản trị được kiểm kê");
  const parsed = adjustSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const v = parsed.data;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("fn_adjust", {
    p_product_id: v.productId,
    p_location_id: v.locationId,
    p_counted: v.counted,
    p_reason: v.reason,
  });
  if (error) return fail(mapDbError(error));
  refresh([v.productId]);
  const diff = Number(data.difference);
  return ok({ difference: diff }, diff === 0 ? "Số đếm khớp, không cần điều chỉnh" : "Đã cập nhật số kiểm kê");
}

/** PHIẾU NHẬP nhiều dòng (mọi người) — tất cả hoặc không dòng nào */
export async function createReceipt(input: unknown): Promise<ActionResult<{ documentId: string; docNo: string; lines: number }>> {
  if (!(await authorizeAction())) return fail(LOGIN_AGAIN);
  const parsed = receiptSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const v = parsed.data;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("fn_create_receipt", {
    p_lines: v.lines.map((l) => ({ product_id: l.productId, location_id: l.locationId, quantity: l.quantity, note: l.note })),
    p_date: v.date,
    p_supplier_id: v.supplierId,
    p_reference_no: v.referenceNo,
    p_note: v.note,
  });
  if (error) return fail(mapDbError(error));
  refresh(v.lines.map((l) => l.productId));
  return ok(
    { documentId: data.document_id as string, docNo: data.doc_no as string, lines: Number(data.lines) },
    `Đã nhập kho phiếu ${data.doc_no}`,
  );
}

/** Tìm nhanh mặt hàng (ô chọn hàng trong phiếu nhập, Ctrl+K) */
export async function quickSearchProducts(q: unknown): Promise<QuickProduct[]> {
  if (!(await authorizeAction())) return [];
  const parsed = quickSearchSchema.safeParse(q);
  if (!parsed.success) return [];

  const supabase = await createServerSupabase();
  const { data } = await supabase.rpc("fn_search_products", { p_query: parsed.data, p_limit: 8 });
  const rows = (data ?? []) as {
    id: string;
    sku: string;
    name: string;
    image_url: string | null;
    unit_name: string;
    total_quantity: number;
    locations: { location_id: string; code: string; quantity: number }[];
  }[];
  if (rows.length === 0) return [];

  const { data: units } = await supabase
    .from("products")
    .select("id, units(allow_decimal)")
    .in("id", rows.map((r) => r.id));
  const decimal = new Map(
    ((units ?? []) as unknown as { id: string; units: { allow_decimal: boolean } | null }[]).map((u) => [u.id, Boolean(u.units?.allow_decimal)]),
  );

  return rows.map((r) => ({
    id: r.id,
    sku: r.sku,
    name: r.name,
    imageUrl: r.image_url,
    unitName: r.unit_name,
    allowDecimal: decimal.get(r.id) ?? false,
    totalQuantity: Number(r.total_quantity),
    locations: (r.locations ?? []).map((l) => ({ id: l.location_id, code: l.code, quantity: Number(l.quantity) })),
  }));
}
