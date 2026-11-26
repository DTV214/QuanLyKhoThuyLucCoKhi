"use client";

import { MapPin, StickyNote } from "lucide-react";
import { useMemo, useState } from "react";
import { formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LocationOption } from "../types";

type Rack = {
  id: string;
  code: string;
  name: string | null;
  note: string | null;
  group: string;
  levels: LocationOption[];
};

/**
 * Chọn vị trí theo 2 bước cho dễ nhận ra:
 *  0. (nếu có) Bấm ngay "chỗ cũ" đang chứa mặt hàng này
 *  1. Chọn KỆ — hiện mã + tên gợi nhớ ("K1-A-01 · Kệ to gần cửa")
 *  2. Bấm TẦNG bằng nút to
 * Giá trị trả về vẫn là id vị trí (tầng).
 */
export function LocationSelect({
  id,
  value,
  onChange,
  options,
  suggested = [],
  exclude,
  invalid,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  options: LocationOption[];
  /** vị trí đang có hàng này: [{ id, code, quantity }] */
  suggested?: { id: string; code: string; quantity: number }[];
  exclude?: string;
  invalid?: boolean;
}) {
  const racks = useMemo(() => {
    const m = new Map<string, Rack>();
    for (const o of options) {
      const r = m.get(o.rackId) ?? { id: o.rackId, code: o.rackCode, name: o.rackName, note: o.rackNote, group: o.group, levels: [] };
      r.levels.push(o);
      m.set(o.rackId, r);
    }
    for (const r of m.values()) r.levels.sort((a, b) => b.level - a.level || (b.bin ?? 0) - (a.bin ?? 0));
    return m;
  }, [options]);

  const groups = useMemo(() => {
    const g = new Map<string, Rack[]>();
    for (const r of racks.values()) g.set(r.group, [...(g.get(r.group) ?? []), r]);
    return [...g.entries()];
  }, [racks]);

  const selected = options.find((o) => o.id === value);
  const [rackId, setRackId] = useState(selected?.rackId ?? "");
  const rack = racks.get(selected?.rackId ?? rackId);
  const qtyAt = new Map(suggested.map((s) => [s.id, s.quantity]));
  const sug = suggested.filter((s) => s.id !== exclude && options.some((o) => o.id === s.id));

  return (
    <div className="space-y-3">
      {sug.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-sm text-muted-foreground">Chỗ đang có hàng này (bấm để chọn nhanh):</p>
          <div className="flex flex-wrap gap-2">
            {sug.map((s) => {
              const o = options.find((x) => x.id === s.id)!;
              const on = value === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setRackId(o.rackId);
                    onChange(s.id);
                  }}
                  className={cn(
                    "min-h-11 rounded-xl border-2 px-3 py-1.5 text-left",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/50",
                  )}
                >
                  <span className="block font-mono font-bold">{s.code}</span>
                  <span className={cn("block text-sm", on ? "text-primary-foreground/80" : "text-muted-foreground")}>
                    {o.rackName ? `${o.rackName} · ` : ""}đang có {formatQty(s.quantity)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <select
        id={id}
        value={rack?.id ?? ""}
        onChange={(e) => {
          setRackId(e.target.value);
          const r = racks.get(e.target.value);
          // Kệ chỉ có 1 tầng dùng được → chọn luôn
          const usable = r?.levels.filter((l) => l.id !== exclude) ?? [];
          onChange(usable.length === 1 ? usable[0].id : "");
        }}
        aria-invalid={invalid && !value}
        aria-label="Chọn kệ"
        className="h-14 w-full min-w-0 rounded-xl border border-input bg-background px-3 text-base font-medium aria-invalid:border-destructive"
      >
        <option value="">— Bước 1: chọn kệ —</option>
        {groups.map(([g, list]) => (
          <optgroup key={g} label={g}>
            {list.map((r) => (
              <option key={r.id} value={r.id}>
                {r.code}
                {r.name ? ` · ${r.name}` : ""}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {rack && (
        <div className="space-y-2">
          {rack.note && (
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">
              <StickyNote className="mt-0.5 size-4 shrink-0" /> {rack.note}
            </p>
          )}
          <p className="text-sm text-muted-foreground">Bước 2: bấm tầng (tầng cao ở trên)</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label={`Tầng của kệ ${rack.code}`}>
            {rack.levels.map((l) => {
              const disabled = l.id === exclude;
              const on = value === l.id;
              const has = qtyAt.get(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={disabled}
                  onClick={() => onChange(l.id)}
                  className={cn(
                    "min-h-14 rounded-xl border-2 px-2 py-1.5 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/50",
                  )}
                >
                  <span className="block text-base font-bold">
                    Tầng {l.level}
                    {l.bin ? ` · Ô ${l.bin}` : ""}
                  </span>
                  <span className={cn("block text-xs", on ? "text-primary-foreground/80" : "text-muted-foreground")}>
                    {disabled ? "chỗ hiện tại" : has ? `đang có ${formatQty(has)}` : l.code}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selected && (
        <p className="flex items-start gap-1.5 text-base font-medium text-primary">
          <MapPin className="mt-1 size-4 shrink-0" /> {selected.code} — {selected.path}
        </p>
      )}
    </div>
  );
}
