"use server";

import { revalidatePath } from "next/cache";
import { fail, fromZodError, mapDbError, ok, type ActionResult } from "@/lib/action-result";
import { MANAGER_ROLES } from "@/lib/roles";
import { authorizeAction } from "@/server/auth/guard";
import { destroyImages, isOwnProductImage } from "@/server/cloudinary";
import { createServerSupabase } from "@/server/supabase/server";
import type { SpecField } from "@/features/catalog";
import { productSchema, setProductActiveSchema } from "./schemas";

const NO_PERMISSION = "Chỉ ông chủ hoặc quản trị được thêm / sửa mặt hàng";

/** Giữ lại đúng các thông số mà loại hàng khai báo, ép đúng kiểu */
function cleanSpecs(
  raw: Record<string, string | number>,
  schema: SpecField[],
): { specs: Record<string, string | number>; errors: Record<string, string[]> } {
  const specs: Record<string, string | number> = {};
  const errors: Record<string, string[]> = {};
  for (const f of schema) {
    const v = raw[f.key];
    if (v === undefined || v === null || String(v).trim() === "") continue;
    const s = String(v).trim();
    if (f.type === "number") {
      const n = Number(s.replace(",", "."));
      if (!Number.isFinite(n)) {
        errors[`spec.${f.key}`] = [`${f.label} phải là số`];
        continue;
      }
      specs[f.key] = n;
    } else if (f.type === "select") {
      if (f.options && !f.options.includes(s)) {
        errors[`spec.${f.key}`] = [`${f.label}: lựa chọn không hợp lệ`];
        continue;
      }
      specs[f.key] = s;
    } else {
      specs[f.key] = s.slice(0, 200);
    }
  }
  return { specs, errors };
}

export async function saveProduct(input: unknown): Promise<ActionResult<{ id: string }>> {
  const actor = await authorizeAction(MANAGER_ROLES);
  if (!actor) return fail(NO_PERMISSION);
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const v = parsed.data;

  // Ảnh: chỉ chấp nhận ảnh đã tải vào thư mục của hệ thống
  if (v.images.some((img) => !isOwnProductImage(img.publicId))) return fail("Có ảnh không hợp lệ, vui lòng tải lại ảnh");

  const supabase = await createServerSupabase();
  const { data: category } = await supabase.from("categories").select("spec_schema").eq("id", v.categoryId).single();
  if (!category) return fail("Loại hàng không tồn tại", { categoryId: ["Loại hàng không tồn tại"] });
  const { specs, errors } = cleanSpecs(v.specs, (category.spec_schema ?? []) as SpecField[]);
  if (Object.keys(errors).length) return fail("Thông số kỹ thuật chưa đúng", errors);

  const row = {
    sku: v.sku,
    part_number: v.partNumber,
    name: v.name,
    original_name: v.originalName,
    category_id: v.categoryId,
    brand_id: v.brandId,
    country_id: v.countryId,
    material_id: v.materialId,
    unit_id: v.unitId,
    size: v.size,
    quality_standard: v.qualityStandard,
    connection_a: v.connectionA,
    connection_b: v.connectionB,
    temp_min: v.tempMin,
    temp_max: v.tempMax,
    pressure_max: v.pressureMax,
    media: v.media,
    length_mm: v.lengthMm,
    width_mm: v.widthMm,
    height_mm: v.heightMm,
    weight_g: v.weightG,
    min_stock: v.minStock,
    specs,
    images: v.images,
    description: v.description,
    note: v.note,
  };

  let oldImages: { publicId: string }[] = [];
  let id = v.id;
  if (id) {
    const { data: old } = await supabase.from("products").select("images").eq("id", id).single();
    oldImages = (old?.images ?? []) as { publicId: string }[];
    const { error } = await supabase.from("products").update(row).eq("id", id);
    if (error) return productError(error);
  } else {
    const { data, error } = await supabase
      .from("products")
      .insert({ ...row, created_by: actor.id })
      .select("id")
      .single();
    if (error || !data) return productError(error);
    id = data.id as string;
  }

  // Xoá trên Cloudinary những ảnh đã bị bỏ khỏi mặt hàng
  const kept = new Set(v.images.map((i) => i.publicId));
  await destroyImages(oldImages.map((i) => i.publicId).filter((p) => !kept.has(p)));

  revalidatePath("/tim-hang");
  revalidatePath(`/mat-hang/${id}`);
  return ok({ id: id! }, v.id ? "Đã lưu mặt hàng" : `Đã thêm "${v.name}"`);
}

function productError(error: { code?: string; message?: string } | null): ActionResult<never> {
  if (error?.code === "23505") {
    if (error.message?.includes("brand_part")) {
      return fail("Mã hãng này đã có ở một mặt hàng khác cùng thương hiệu", { partNumber: ["Đã tồn tại"] });
    }
    return fail("Mã mặt hàng đã tồn tại, vui lòng chọn mã khác", { sku: ["Mã đã tồn tại"] });
  }
  return fail(mapDbError(error));
}

/** Ngừng kinh doanh / kinh doanh lại (không xoá để giữ lịch sử) */
export async function setProductActive(input: unknown): Promise<ActionResult> {
  if (!(await authorizeAction(MANAGER_ROLES))) return fail(NO_PERMISSION);
  const parsed = setProductActiveSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("products").update({ is_active: parsed.data.active }).eq("id", parsed.data.id);
  if (error) return fail(mapDbError(error));
  revalidatePath("/tim-hang");
  revalidatePath(`/mat-hang/${parsed.data.id}`);
  return ok(undefined, parsed.data.active ? "Đã kinh doanh lại mặt hàng" : "Đã ngừng kinh doanh mặt hàng");
}

/** Bỏ ảnh vừa tải lên nhưng không lưu (người dùng bấm Huỷ) */
export async function discardUploadedImages(publicIds: unknown): Promise<ActionResult> {
  if (!(await authorizeAction(MANAGER_ROLES))) return fail(NO_PERMISSION);
  if (!Array.isArray(publicIds) || publicIds.length > 20 || !publicIds.every((p) => typeof p === "string")) {
    return fail("Dữ liệu không hợp lệ");
  }
  // Không xoá ảnh đang thuộc một mặt hàng đã lưu
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("products").select("images");
  const used = new Set((data ?? []).flatMap((p) => ((p.images ?? []) as { publicId: string }[]).map((i) => i.publicId)));
  await destroyImages((publicIds as string[]).filter((p) => !used.has(p)));
  return ok(undefined);
}
