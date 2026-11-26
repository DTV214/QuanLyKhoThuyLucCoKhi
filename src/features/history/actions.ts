"use server";

import { revalidatePath } from "next/cache";
import { fail, fromZodError, mapDbError, ok, type ActionResult } from "@/lib/action-result";
import { MANAGER_ROLES } from "@/lib/roles";
import { authorizeAction } from "@/server/auth/guard";
import { createServerSupabase } from "@/server/supabase/server";
import { reverseSchema } from "./schemas";

/** HUỶ THAO TÁC SAI — tạo phiếu đảo (ông chủ / quản trị). Lịch sử cũ giữ nguyên. */
export async function reverseMovement(input: unknown): Promise<ActionResult> {
  if (!(await authorizeAction(MANAGER_ROLES))) return fail("Chỉ ông chủ hoặc quản trị được huỷ thao tác");
  const parsed = reverseSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createServerSupabase();
  const { data: m } = await supabase.from("stock_movements").select("product_id").eq("id", parsed.data.id).maybeSingle();
  const { error } = await supabase.rpc("fn_reverse_movement", { p_movement_id: parsed.data.id, p_reason: parsed.data.reason });
  if (error) return fail(mapDbError(error));

  revalidatePath("/lich-su");
  revalidatePath("/tim-hang");
  revalidatePath("/kho");
  if (m?.product_id) revalidatePath(`/mat-hang/${m.product_id}`);
  return ok(undefined, "Đã huỷ thao tác, số tồn đã được trả lại");
}
