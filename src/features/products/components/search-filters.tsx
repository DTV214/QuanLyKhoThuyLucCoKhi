"use client";

import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SCROLL_ROW } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import { CONNECTION_OPTIONS, MEDIA_OPTIONS } from "../constants";
import type { ProductFormOptions } from "../queries";

const SELECTS = [
  { key: "kho", label: "Kho", src: "warehouses" },
  { key: "loai", label: "Loại hàng", src: "categories" },
  { key: "hang", label: "Thương hiệu", src: "brands" },
  { key: "vatlieu", label: "Vật liệu", src: "materials" },
  { key: "xuatxu", label: "Xuất xứ", src: "countries" },
] as const;

const FILTER_KEYS = ["kho", "loai", "hang", "vatlieu", "xuatxu", "moichat", "nhietdo", "daunoi", "conhang", "saphet"];

/** Ô tìm + bộ lọc. Mọi lựa chọn lưu trên URL → gửi link cho người khác được, bấm Back vẫn giữ. */
export function SearchFilters({ options }: { options: ProductFormOptions }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const activeCount = FILTER_KEYS.filter((k) => params.get(k)).length;
  const [open, setOpen] = useState(activeCount > 0);
  const first = useRef(true);

  function update(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("so"); // đổi điều kiện → về trang đầu
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  // Gõ tới đâu tìm tới đó (chờ 400ms sau khi ngừng gõ)
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => update({ q: q.trim() || null }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const select = "h-12 w-full min-w-0 rounded-xl border border-input bg-background px-3 text-base";

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-4 size-6 -translate-y-1/2 text-primary" />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="VD: van phi8, hat bap 316"
            aria-label="Tìm hàng"
            className="h-14 rounded-2xl bg-background pr-12 pl-13 text-lg shadow-sm"
          />
          {pending && <Loader2 className="absolute top-1/2 right-4 size-5 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>
        <Button
          type="button"
          variant={open || activeCount ? "default" : "outline"}
          size="xl"
          className="h-14"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Bộ lọc"
        >
          <SlidersHorizontal />
          <span className="hidden sm:inline">Bộ lọc</span>
          {activeCount > 0 && <span className="rounded-full bg-background/25 px-2 text-sm">{activeCount}</span>}
        </Button>
      </div>

      {/* Lọc nhanh 1 chạm */}
      <div className={SCROLL_ROW}>
        {options.warehouses.map((w) => (
          <Toggle key={w.id} on={params.get("kho") === w.id} onClick={() => update({ kho: params.get("kho") === w.id ? null : w.id })}>
            {w.name}
          </Toggle>
        ))}
        <Toggle on={params.get("conhang") === "1"} onClick={() => update({ conhang: params.get("conhang") ? null : "1" })}>Còn hàng</Toggle>
        <Toggle on={params.get("saphet") === "1"} onClick={() => update({ saphet: params.get("saphet") ? null : "1" })}>Sắp hết</Toggle>
      </div>

      {open && (
        <div className="space-y-4 rounded-2xl border bg-background p-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
            {SELECTS.map((s) => (
              <div key={s.key} className="space-y-1">
                <Label htmlFor={`f-${s.key}`} className="text-sm">{s.label}</Label>
                <select id={`f-${s.key}`} className={select} value={params.get(s.key) ?? ""} onChange={(e) => update({ [s.key]: e.target.value || null })}>
                  <option value="">Tất cả</option>
                  {(options[s.src] as { id: string; name: string; parentId?: string | null }[]).map((o) => (
                    <option key={o.id} value={o.id}>{o.parentId ? `— ${o.name}` : o.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="f-moichat" className="text-sm">Môi chất sử dụng</Label>
              <select id="f-moichat" className={select} value={params.get("moichat") ?? ""} onChange={(e) => update({ moichat: e.target.value || null })}>
                <option value="">Tất cả</option>
                {MEDIA_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <DebouncedInput id="f-nhietdo" label="Chịu được nhiệt độ (°C)" placeholder="VD: 250" inputMode="decimal"
              value={params.get("nhietdo") ?? ""} onCommit={(x) => update({ nhietdo: x && Number.isFinite(Number(x)) ? x : null })} />
            <DebouncedInput id="f-daunoi" label="Cỡ đầu nối" placeholder='VD: Φ8, 1/4"' list="dl-daunoi"
              value={params.get("daunoi") ?? ""} onCommit={(x) => update({ daunoi: x || null })} />
            <datalist id="dl-daunoi">{CONNECTION_OPTIONS.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Toggle on={params.get("conhang") === "1"} onClick={() => update({ conhang: params.get("conhang") ? null : "1" })}>Chỉ hàng còn trong kho</Toggle>
            <Toggle on={params.get("saphet") === "1"} onClick={() => update({ saphet: params.get("saphet") ? null : "1" })}>Sắp hết hàng</Toggle>
            {activeCount > 0 && (
              <Button type="button" variant="ghost" size="lg" className="ml-auto" onClick={() => update(Object.fromEntries(FILTER_KEYS.map((k) => [k, null])))}>
                <X /> Bỏ hết bộ lọc
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={cn("h-11 shrink-0 rounded-full border px-4 text-base whitespace-nowrap", on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted")}>
      {on && "✓ "}{children}
    </button>
  );
}

function DebouncedInput({ id, label, value, onCommit, ...rest }: {
  id: string;
  label: string;
  value: string;
  onCommit: (v: string) => void;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "id">) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-sm">{label}</Label>
      <Input id={id} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && onCommit(v.trim())}
        onKeyDown={(e) => e.key === "Enter" && onCommit(v.trim())} className="h-12 rounded-xl px-3 text-base" {...rest} />
    </div>
  );
}
