import "server-only";

import { createServerSupabase } from "@/server/supabase/server";
import type { SpecField } from "./schemas";

export type CatalogRow = Record<string, string | number | boolean | null> & { id: string; usage: number };
export type CategoryRow = {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  specSchema: SpecField[];
  usage: number;
};

export type Catalog = {
  categories: CategoryRow[];
  brands: CatalogRow[];
  materials: CatalogRow[];
  countries: CatalogRow[];
  units: CatalogRow[];
  suppliers: CatalogRow[];
};

/** Toàn bộ danh mục + số mặt hàng đang dùng mỗi mục (để biết có xoá được không) */
export async function getCatalog(): Promise<Catalog> {
  const supabase = await createServerSupabase();
  const [cat, br, ma, co, un, su, pr, doc] = await Promise.all([
    supabase.from("categories").select("id, code, name, parent_id, sort_order, spec_schema").order("sort_order").order("name"),
    supabase.from("brands").select("id, name, website").order("name"),
    supabase.from("materials").select("id, code, name, description").order("name"),
    supabase.from("countries").select("id, code, name").order("name"),
    supabase.from("units").select("id, code, name, allow_decimal").order("name"),
    supabase.from("suppliers").select("id, name, phone, address").order("name"),
    supabase.from("products").select("category_id, brand_id, material_id, country_id, unit_id"),
    supabase.from("stock_documents").select("supplier_id").not("supplier_id", "is", null),
  ]);
  const err = cat.error ?? br.error ?? ma.error ?? co.error ?? un.error ?? su.error ?? pr.error ?? doc.error;
  if (err) throw new Error(`Không tải được danh mục: ${err.message}`);

  const count = (rows: Record<string, unknown>[] | null, key: string) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) {
      const v = r[key] as string | null;
      if (v) m.set(v, (m.get(v) ?? 0) + 1);
    }
    return m;
  };
  const products = pr.data ?? [];
  const byCat = count(products, "category_id");
  const childCount = count(cat.data ?? [], "parent_id");
  const withUsage = (rows: Record<string, unknown>[] | null, usage: Map<string, number>) =>
    (rows ?? []).map((r) => ({ ...r, usage: usage.get(r.id as string) ?? 0 }) as CatalogRow);

  return {
    categories: (cat.data ?? []).map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      parentId: c.parent_id,
      sortOrder: c.sort_order,
      specSchema: (c.spec_schema ?? []) as SpecField[],
      usage: (byCat.get(c.id) ?? 0) + (childCount.get(c.id) ?? 0),
    })),
    brands: withUsage(br.data, count(products, "brand_id")),
    materials: withUsage(ma.data, count(products, "material_id")),
    countries: withUsage(co.data, count(products, "country_id")),
    units: withUsage(un.data, count(products, "unit_id")),
    suppliers: withUsage(su.data, count(doc.data, "supplier_id")),
  };
}
