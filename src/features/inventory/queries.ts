import "server-only";

import { createServerSupabase } from "@/server/supabase/server";
import type { LocationOption } from "./types";

type Row = {
  id: string;
  code: string;
  level: number;
  bin: number | null;
  racks: {
    id: string;
    code: string;
    name: string | null;
    description: string | null;
    is_active: boolean;
    zones: { code: string; name: string; is_active: boolean; warehouses: { code: string; name: string; is_active: boolean } };
  };
};

/** Mọi vị trí đang dùng được (kho, khu, kệ, tầng đều đang hoạt động), sắp theo mã */
export async function getLocationOptions(): Promise<LocationOption[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("locations")
    .select("id, code, level, bin, racks(id, code, name, description, is_active, zones(code, name, is_active, warehouses(code, name, is_active)))")
    .eq("is_active", true)
    .order("code");
  if (error) throw new Error(`Không tải được danh sách vị trí: ${error.message}`);

  return ((data ?? []) as unknown as Row[])
    .filter((l) => l.racks.is_active && l.racks.zones.is_active && l.racks.zones.warehouses.is_active)
    .map((l) => {
      const w = l.racks.zones.warehouses;
      const z = l.racks.zones;
      return {
        id: l.id,
        code: l.code,
        path: `${w.name} › ${z.name} › Kệ ${l.racks.code}${l.racks.name ? ` (${l.racks.name})` : ""} › Tầng ${l.level}${l.bin ? ` › Ô ${l.bin}` : ""}`,
        group: `${w.name} · ${z.name}`,
        rackId: l.racks.id,
        rackCode: `${w.code}-${z.code}-${l.racks.code}`,
        rackName: l.racks.name,
        rackNote: l.racks.description,
        level: l.level,
        bin: l.bin,
      };
    });
}

export async function getSuppliers(): Promise<{ id: string; name: string }[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("suppliers").select("id, name").order("name");
  return data ?? [];
}
