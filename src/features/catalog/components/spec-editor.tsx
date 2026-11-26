"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SpecField } from "../schemas";

export type SpecDraft = { key: string; label: string; type: SpecField["type"]; unit: string; options: string };

const TYPE_LABEL: Record<SpecField["type"], string> = { text: "Chữ", number: "Số", select: "Chọn từ danh sách" };

/** "Đường kính ngoài (OD)" → "duong_kinh_ngoai_od" */
export function slugKey(label: string) {
  const s = label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
  return /^[a-z]/.test(s) ? s : `f_${s}`.slice(0, 30);
}

export const toDraft = (f: SpecField): SpecDraft => ({
  key: f.key,
  label: f.label,
  type: f.type,
  unit: f.unit ?? "",
  options: (f.options ?? []).join(", "),
});

export const fromDraft = (d: SpecDraft): SpecField => ({
  key: d.key || slugKey(d.label),
  label: d.label.trim(),
  type: d.type,
  unit: d.unit.trim() || undefined,
  options:
    d.type === "select"
      ? d.options
          .split(",")
          .map((o) => o.trim())
          .filter(Boolean)
      : undefined,
});

/** Danh sách thông số riêng của một loại hàng (form mặt hàng sẽ tự hiện các ô này) */
export function SpecEditor({ value, onChange }: { value: SpecDraft[]; onChange: (v: SpecDraft[]) => void }) {
  const update = (i: number, patch: Partial<SpecDraft>) => onChange(value.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const move = (i: number, dir: -1 | 1) => {
    const next = [...value];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };

  return (
    <fieldset className="space-y-3">
      <legend className="text-base font-medium">Thông số kỹ thuật riêng của loại hàng này</legend>
      <p className="text-sm text-muted-foreground">
        Khi thêm mặt hàng thuộc loại này, form sẽ hiện các ô dưới đây (vd: Đường kính ngoài, Áp suất, Kiểu ren…).
      </p>
      {value.length === 0 && <p className="rounded-xl border border-dashed p-4 text-center text-muted-foreground">Chưa có thông số nào.</p>}
      {value.map((d, i) => (
        <div key={i} className="space-y-3 rounded-xl border bg-muted/30 p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_220px_110px]">
            <Input
              aria-label="Tên thông số"
              placeholder="Tên thông số, vd: Áp suất tối đa"
              value={d.label}
              onChange={(e) => update(i, { label: e.target.value })}
              className="h-11 rounded-lg text-base"
            />
            <select
              aria-label="Kiểu dữ liệu"
              value={d.type}
              onChange={(e) => update(i, { type: e.target.value as SpecField["type"] })}
              className="h-11 rounded-lg border border-input bg-background px-3 text-base"
            >
              {(Object.keys(TYPE_LABEL) as SpecField["type"][]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
            <Input
              aria-label="Đơn vị"
              placeholder="Đơn vị"
              value={d.unit}
              onChange={(e) => update(i, { unit: e.target.value })}
              className="h-11 rounded-lg text-base"
            />
          </div>
          {d.type === "select" && (
            <Input
              aria-label="Các lựa chọn"
              placeholder="Các lựa chọn, cách nhau bằng dấu phẩy: Van bi, Van kim, Van một chiều"
              value={d.options}
              onChange={(e) => update(i, { options: e.target.value })}
              className="h-11 rounded-lg text-base"
            />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="lg" disabled={i === 0} onClick={() => move(i, -1)}>
              <ArrowUp /> Lên
            </Button>
            <Button type="button" variant="ghost" size="lg" disabled={i === value.length - 1} onClick={() => move(i, 1)}>
              <ArrowDown /> Xuống
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="ml-auto text-destructive"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
              <Trash2 /> Bỏ
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={() => onChange([...value, { key: "", label: "", type: "text", unit: "", options: "" }])}
      >
        <Plus /> Thêm thông số
      </Button>
    </fieldset>
  );
}
