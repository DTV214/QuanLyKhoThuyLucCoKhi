import "server-only";

import type { SpecField } from "@/features/catalog";
import { createServerSupabase } from "@/server/supabase/server";
import type { SearchFilters, ProductImage } from "./schemas";

export type Option = { id: string; name: string; code?: string };
export type CategoryOption = Option & { code: string; parentId: string | null; specSchema: SpecField[] };
export type UnitOption = Option & { allowDecimal: boolean };

export type ProductFormOptions = {
  categories: CategoryOption[];
  brands: Option[];
  countries: Option[];
  materials: Option[];
  units: UnitOption[];
  warehouses: Option[];
};

/** Danh sách lựa chọn cho form mặt hàng và bộ lọc */
export async function getProductFormOptions(): Promise<ProductFormOptions> {
  const supabase = await createServerSupabase();
  const [c, b, co, m, u, w] = await Promise.all([
    supabase.from("categories").select("id, code, name, parent_id, spec_schema").order("sort_order").order("name"),
    supabase.from("brands").select("id, name").order("name"),
    supabase.from("countries").select("id, code, name").order("name"),
    supabase.from("materials").select("id, code, name").order("name"),
    supabase.from("units").select("id, code, name, allow_decimal").order("name"),
    supabase.from("warehouses").select("id, code, name").eq("is_active", true).order("code"),
  ]);
  const err = c.error ?? b.error ?? co.error ?? m.error ?? u.error ?? w.error;
  if (err) throw new Error(`Không tải được danh mục: ${err.message}`);
  return {
    categories: (c.data ?? []).map((x) => ({
      id: x.id,
      code: x.code,
      name: x.name,
      parentId: x.parent_id,
      specSchema: (x.spec_schema ?? []) as SpecField[],
    })),
    brands: b.data ?? [],
    countries: co.data ?? [],
    materials: m.data ?? [],
    units: (u.data ?? []).map((x) => ({ id: x.id, code: x.code, name: x.name, allowDecimal: x.allow_decimal })),
    warehouses: w.data ?? [],
  };
}

export type StockLocation = {
  location_id: string;
  code: string;
  warehouse: string;
  warehouse_code: string;
  zone: string;
  rack: string;
  level: number;
  bin: number | null;
  quantity: number;
};

export type ProductHit = {
  id: string;
  sku: string;
  part_number: string | null;
  name: string;
  image_url: string | null;
  category_name: string;
  brand_name: string | null;
  material_name: string | null;
  country_name: string | null;
  unit_name: string;
  quality_standard: string | null;
  temp_min: number | null;
  temp_max: number | null;
  pressure_max: number | null;
  media: string[];
  connection_a: string | null;
  connection_b: string | null;
  min_stock: number;
  total_quantity: number;
  locations: StockLocation[];
  total_count: number;
};

export async function searchProducts(f: SearchFilters): Promise<{ hits: ProductHit[]; total: number; limit: number }> {
  const limit = f.so ?? 30;
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("fn_search_products", {
    p_query: f.q ?? null,
    p_warehouse_id: f.kho ?? null,
    p_category_id: f.loai ?? null,
    p_brand_id: f.hang ?? null,
    p_material_id: f.vatlieu ?? null,
    p_low_stock: f.saphet === "1",
    p_limit: limit,
    p_offset: 0,
    p_country_id: f.xuatxu ?? null,
    p_media: f.moichat ?? null,
    p_temperature: f.nhietdo ?? null,
    p_connection: f.daunoi ?? null,
    p_in_stock: f.conhang === "1",
  });
  if (error) throw new Error(`Không tìm được: ${error.message}`);
  const hits = ((data ?? []) as ProductHit[]).map((h) => ({
    ...h,
    total_quantity: Number(h.total_quantity),
    min_stock: Number(h.min_stock),
    total_count: Number(h.total_count),
    temp_min: h.temp_min === null ? null : Number(h.temp_min),
    temp_max: h.temp_max === null ? null : Number(h.temp_max),
    pressure_max: h.pressure_max === null ? null : Number(h.pressure_max),
    locations: (h.locations ?? []).map((l) => ({ ...l, quantity: Number(l.quantity) })),
  }));
  return { hits, total: hits[0]?.total_count ?? 0, limit };
}

export type ProductDetail = {
  id: string;
  sku: string;
  partNumber: string | null;
  name: string;
  originalName: string | null;
  categoryId: string;
  categoryName: string;
  brandId: string | null;
  brandName: string | null;
  countryId: string | null;
  countryName: string | null;
  materialId: string | null;
  materialName: string | null;
  unitId: string;
  unitName: string;
  allowDecimal: boolean;
  size: string | null;
  qualityStandard: string | null;
  connectionA: string | null;
  connectionB: string | null;
  tempMin: number | null;
  tempMax: number | null;
  pressureMax: number | null;
  media: string[];
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  weightG: number | null;
  minStock: number;
  specs: Record<string, string | number>;
  specSchema: SpecField[];
  images: ProductImage[];
  description: string | null;
  note: string | null;
  isActive: boolean;
  updatedAt: string;
  stock: StockLocation[];
  totalQuantity: number;
};

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export async function getProduct(id: string): Promise<ProductDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createServerSupabase();
  const { data: p } = await supabase
    .from("products")
    .select(
      `*, categories(name, spec_schema), brands(name), countries(name), materials(name), units(name, allow_decimal)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!p) return null;

  const { data: inv } = await supabase
    .from("inventory")
    .select("quantity, locations(id, code, level, bin, racks(code, zones(name, warehouses(code, name))))")
    .eq("product_id", id)
    .gt("quantity", 0)
    .order("quantity", { ascending: false });

  type InvRow = {
    quantity: number;
    locations: {
      id: string;
      code: string;
      level: number;
      bin: number | null;
      racks: { code: string; zones: { name: string; warehouses: { code: string; name: string } } };
    };
  };
  const stock: StockLocation[] = ((inv ?? []) as unknown as InvRow[]).map((r) => ({
    location_id: r.locations.id,
    code: r.locations.code,
    level: r.locations.level,
    bin: r.locations.bin,
    rack: r.locations.racks.code,
    zone: r.locations.racks.zones.name,
    warehouse: r.locations.racks.zones.warehouses.name,
    warehouse_code: r.locations.racks.zones.warehouses.code,
    quantity: Number(r.quantity),
  }));

  return {
    id: p.id,
    sku: p.sku,
    partNumber: p.part_number,
    name: p.name,
    originalName: p.original_name,
    categoryId: p.category_id,
    categoryName: p.categories?.name ?? "",
    brandId: p.brand_id,
    brandName: p.brands?.name ?? null,
    countryId: p.country_id,
    countryName: p.countries?.name ?? null,
    materialId: p.material_id,
    materialName: p.materials?.name ?? null,
    unitId: p.unit_id,
    unitName: p.units?.name ?? "",
    allowDecimal: Boolean(p.units?.allow_decimal),
    size: p.size,
    qualityStandard: p.quality_standard,
    connectionA: p.connection_a,
    connectionB: p.connection_b,
    tempMin: num(p.temp_min),
    tempMax: num(p.temp_max),
    pressureMax: num(p.pressure_max),
    media: p.media ?? [],
    lengthMm: num(p.length_mm),
    widthMm: num(p.width_mm),
    heightMm: num(p.height_mm),
    weightG: num(p.weight_g),
    minStock: Number(p.min_stock),
    specs: p.specs ?? {},
    specSchema: (p.categories?.spec_schema ?? []) as SpecField[],
    images: (p.images ?? []) as ProductImage[],
    description: p.description,
    note: p.note,
    isActive: p.is_active,
    updatedAt: p.updated_at,
    stock,
    totalQuantity: stock.reduce((a, s) => a + s.quantity, 0),
  };
}
