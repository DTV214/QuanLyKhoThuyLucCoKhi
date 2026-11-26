"use client";

import { useMemo } from "react";
import type { LocationOption } from "../types";

/**
 * Chọn vị trí cất hàng. Nhóm theo Kho · Khu; các vị trí đang chứa mặt hàng này
 * hiện lên đầu để cất chung chỗ cũ cho dễ tìm.
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
  const groups = useMemo(() => {
    const m = new Map<string, LocationOption[]>();
    for (const o of options) {
      if (o.id === exclude) continue;
      m.set(o.group, [...(m.get(o.group) ?? []), o]);
    }
    return [...m.entries()];
  }, [options, exclude]);
  const sug = suggested.filter((s) => s.id !== exclude && options.some((o) => o.id === s.id));
  const pathOf = (lid: string) => options.find((o) => o.id === lid)?.path;

  return (
    <div className="space-y-1">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        className="h-14 w-full min-w-0 rounded-xl border border-input bg-background px-3 text-base font-medium aria-invalid:border-destructive"
      >
        <option value="">— Chọn vị trí —</option>
        {sug.length > 0 && (
          <optgroup label="Đang chứa mặt hàng này">
            {sug.map((s) => (
              <option key={`s-${s.id}`} value={s.id}>
                {s.code} (đang có {s.quantity})
              </option>
            ))}
          </optgroup>
        )}
        {groups.map(([g, list]) => (
          <optgroup key={g} label={g}>
            {list.map((o) => (
              <option key={o.id} value={o.id}>
                {o.code}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {value && <p className="text-sm text-muted-foreground">{pathOf(value)}</p>}
    </div>
  );
}
