"use server";

import { revalidatePath } from "next/cache";
import { fail, fromZodError, mapDbError, ok, type ActionResult } from "@/lib/action-result";
import { MANAGER_ROLES } from "@/lib/roles";
import { authorizeAction } from "@/server/auth/guard";
import { createServerSupabase } from "@/server/supabase/server";
import { categorySchema, deleteSchema, LOOKUP_SCHEMAS, type LookupTable } from "./schemas";

const NO_PERMISSION = "Chỉ ông chủ hoặc quản trị được sửa danh mục";

function done(error: { code?: string; message?: string } | null, message: string): ActionResult {
  if (error) {
    if (error.code === "23505") {
      return fail("Mã hoặc tên này đã có, vui lòng kiểm tra lại", { code: ["Đã tồn tại"], name: ["Đã tồn tại"] });
    }
    return fail(mapDbError(error));
  }
  revalidatePath("/danh-muc");
  return ok(undefined, message);
}

export async function saveLookup(table: LookupTable, input: unknown): Promise<ActionResult> {
  if (!(await authorizeAction(MANAGER_ROLES))) return fail(NO_PERMISSION);
  // table đến từ client → chỉ chấp nhận đúng các khoá đã khai báo
  if (typeof table !== "string" || !Object.hasOwn(LOOKUP_SCHEMAS, table)) return fail("Danh mục không hợp lệ");
  const schema = LOOKUP_SCHEMAS[table];
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { id, ...row } = parsed.data as { id?: string } & Record<string, unknown>;

  const supabase = await createServerSupabase();
  const { error } = id ? await supabase.from(table).update(row).eq("id", id) : await supabase.from(table).insert(row);
  return done(error, id ? "Đã lưu" : "Đã thêm");
}

export async function saveCategory(input: unknown): Promise<ActionResult> {
  if (!(await authorizeAction(MANAGER_ROLES))) return fail(NO_PERMISSION);
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { id, parentId, sortOrder, specSchema, ...rest } = parsed.data;
  if (id && parentId === id) return fail("Loại hàng không thể là cha của chính nó");

  const row = { ...rest, parent_id: parentId ?? null, sort_order: sortOrder, spec_schema: specSchema };
  const supabase = await createServerSupabase();
  const { error } = id
    ? await supabase.from("categories").update(row).eq("id", id)
    : await supabase.from("categories").insert(row);
  return done(error, id ? "Đã lưu loại hàng" : `Đã thêm loại hàng ${rest.name}`);
}

/** Xoá hẳn — chỉ ông chủ (RLS), và chỉ khi chưa mặt hàng nào dùng (khoá ngoại chặn) */
export async function deleteCatalogItem(input: unknown): Promise<ActionResult> {
  if (!(await authorizeAction(["owner"]))) return fail("Chỉ ông chủ được xoá danh mục");
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createServerSupabase();
  const { error, count } = await supabase
    .from(parsed.data.table)
    .delete({ count: "exact" })
    .eq("id", parsed.data.id);
  if (!error && count === 0) return fail("Không xoá được (không tìm thấy hoặc không có quyền)");
  if (error?.code === "23503") return fail("Đang có mặt hàng hoặc loại hàng con dùng mục này, không thể xoá");
  return done(error, "Đã xoá");
}
