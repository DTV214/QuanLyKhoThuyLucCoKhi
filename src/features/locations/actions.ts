"use server";

import { revalidatePath } from "next/cache";
import { fail, fromZodError, mapDbError, ok, type ActionResult } from "@/lib/action-result";
import { MANAGER_ROLES } from "@/lib/roles";
import { authorizeAction } from "@/server/auth/guard";
import { createServerSupabase } from "@/server/supabase/server";
import { rackSchema, setActiveSchema, warehouseSchema, zoneSchema } from "./schemas";

const NO_PERMISSION = "Chỉ ông chủ hoặc quản trị được sửa kho, khu, kệ";
const DUPLICATE = { code: ["Mã này đã được dùng"] };

type DbError = { code?: string; message?: string } | null;

function result(error: DbError, message: string): ActionResult {
  if (error) {
    if (error.code === "23505") return fail("Mã này đã được dùng, vui lòng chọn mã khác", DUPLICATE);
    return fail(mapDbError(error));
  }
  revalidatePath("/kho");
  return ok(undefined, message);
}

export async function saveWarehouse(input: unknown): Promise<ActionResult> {
  if (!(await authorizeAction(MANAGER_ROLES))) return fail(NO_PERMISSION);
  const parsed = warehouseSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { id, ...row } = parsed.data;

  const supabase = await createServerSupabase();
  const { error } = id
    ? await supabase.from("warehouses").update(row).eq("id", id)
    : await supabase.from("warehouses").insert(row);
  return result(error, id ? "Đã lưu thông tin kho" : `Đã thêm ${row.name}`);
}

export async function saveZone(input: unknown): Promise<ActionResult> {
  if (!(await authorizeAction(MANAGER_ROLES))) return fail(NO_PERMISSION);
  const parsed = zoneSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { id, warehouseId, ...rest } = parsed.data;

  const supabase = await createServerSupabase();
  const { error } = id
    ? await supabase.from("zones").update(rest).eq("id", id)
    : await supabase.from("zones").insert({ ...rest, warehouse_id: warehouseId });
  return result(error, id ? "Đã lưu khu vực" : `Đã thêm khu vực ${rest.name}`);
}

export async function saveRack(input: unknown): Promise<ActionResult> {
  if (!(await authorizeAction(MANAGER_ROLES))) return fail(NO_PERMISSION);
  const parsed = rackSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { id, zoneId, levelWidthMm, levelDepthMm, levelHeightMm, levelMaxLoadKg, ...base } = parsed.data;
  const rest = {
    ...base,
    level_width_mm: levelWidthMm,
    level_depth_mm: levelDepthMm,
    level_height_mm: levelHeightMm,
    level_max_load_kg: levelMaxLoadKg,
  };

  const supabase = await createServerSupabase();
  // Thêm kệ: trigger tự tạo các tầng. Sửa số tầng: trigger thêm tầng / chặn bớt tầng còn hàng.
  const { error } = id
    ? await supabase.from("racks").update({ ...rest, zone_id: zoneId }).eq("id", id)
    : await supabase.from("racks").insert({ ...rest, zone_id: zoneId });
  return result(error, id ? "Đã lưu kệ" : `Đã thêm kệ ${rest.code} (${rest.levels} tầng)`);
}

const ENTITY_LABEL = { warehouses: "kho", zones: "khu vực", racks: "kệ" } as const;

export async function setActive(input: unknown): Promise<ActionResult> {
  if (!(await authorizeAction(MANAGER_ROLES))) return fail(NO_PERMISSION);
  const parsed = setActiveSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { entity, id, active } = parsed.data;

  const supabase = await createServerSupabase();
  const { error } = await supabase.from(entity).update({ is_active: active }).eq("id", id);
  return result(error, active ? `Đã dùng lại ${ENTITY_LABEL[entity]}` : `Đã ngừng sử dụng ${ENTITY_LABEL[entity]}`);
}
