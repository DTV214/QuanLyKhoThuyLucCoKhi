import "server-only";

import { createServerSupabase } from "@/server/supabase/server";
import type { WarehouseNode } from "./types";

/** Toàn bộ sơ đồ kho: Kho → Khu → Kệ → Tầng, kèm số mặt hàng đang nằm trên mỗi tầng */
export async function getWarehouseTree(): Promise<WarehouseNode[]> {
  const supabase = await createServerSupabase();
  const [w, z, r, l, s] = await Promise.all([
    supabase.from("warehouses").select("id, code, name, address, description, is_active").order("code"),
    supabase.from("zones").select("id, warehouse_id, code, name, description, is_active").order("code"),
    supabase.from("racks").select("id, zone_id, code, name, levels, description, is_active").order("code"),
    supabase.from("locations").select("id, rack_id, level, bin, code, is_active").order("level"),
    supabase.from("v_location_stock").select("location_id, product_count, total_quantity"),
  ]);
  const err = w.error ?? z.error ?? r.error ?? l.error ?? s.error;
  if (err) throw new Error(`Không tải được sơ đồ kho: ${err.message}`);

  const stock = new Map((s.data ?? []).map((x) => [x.location_id as string, Number(x.product_count)]));

  return (w.data ?? []).map((wh) => ({
    id: wh.id,
    code: wh.code,
    name: wh.name,
    address: wh.address,
    description: wh.description,
    isActive: wh.is_active,
    zones: (z.data ?? [])
      .filter((zn) => zn.warehouse_id === wh.id)
      .map((zn) => ({
        id: zn.id,
        code: zn.code,
        name: zn.name,
        description: zn.description,
        isActive: zn.is_active,
        racks: (r.data ?? [])
          .filter((rk) => rk.zone_id === zn.id)
          .map((rk) => {
            const levels = (l.data ?? [])
              .filter((loc) => loc.rack_id === rk.id)
              .map((loc) => ({
                id: loc.id,
                level: loc.level,
                bin: loc.bin,
                code: loc.code,
                isActive: loc.is_active,
                productCount: stock.get(loc.id) ?? 0,
              }));
            return {
              id: rk.id,
              code: rk.code,
              fullCode: `${wh.code}-${zn.code}-${rk.code}`,
              name: rk.name,
              levels: rk.levels,
              description: rk.description,
              isActive: rk.is_active,
              locations: levels,
              productCount: levels.reduce((a, x) => a + x.productCount, 0),
            };
          }),
      })),
  }));
}
