"use client";

import { Loader2, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SCROLL_ROW } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import { MOVEMENT_TYPES, TYPE_LABEL } from "../schemas";

/** Lọc lịch sử: khoảng ngày, loại thao tác, mặt hàng, người làm (quản lý) — lưu trên URL */
export function HistoryFilters({
  defaultFrom,
  defaultTo,
  people,
  productName,
}: {
  defaultFrom: string;
  defaultTo: string;
  /** chỉ quản lý mới có danh sách người */
  people: { id: string; name: string }[] | null;
  /** đang lọc theo 1 mặt hàng cụ thể (từ trang mặt hàng) */
  productName: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const first = useRef(true);

  function update(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("so");
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => update({ q: q.trim() || null }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const type = params.get("loai");
  const hasFilter = ["tu", "den", "loai", "sp", "q", "nguoi"].some((k) => params.get(k));
  const input = "h-12 rounded-xl px-3 text-base";

  return (
    <div className="space-y-3 rounded-2xl border bg-background p-4">
      {productName && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-accent px-3 py-2">
          <span className="min-w-0 truncate">
            Mặt hàng: <b>{productName}</b>
          </span>
          <Button variant="ghost" size="lg" onClick={() => update({ sp: null })}>
            <X /> Bỏ
          </Button>
        </div>
      )}

      <div className={SCROLL_ROW} role="radiogroup" aria-label="Loại thao tác">
        {[null, ...MOVEMENT_TYPES].map((t) => {
          const on = type === t || (!type && t === null);
          return (
            <button
              key={t ?? "all"}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => update({ loai: t })}
              className={cn(
                "h-11 shrink-0 rounded-full border px-4 text-base whitespace-nowrap",
                on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
              )}
            >
              {t ? TYPE_LABEL[t] : "Tất cả"}
            </button>
          );
        })}
      </div>

      <div className={cn("grid gap-3", people ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2 lg:grid-cols-3")}>
        <div className="space-y-1">
          <Label htmlFor="h-tu" className="text-sm">Từ ngày</Label>
          <Input id="h-tu" type="date" className={input} value={params.get("tu") ?? defaultFrom} max={defaultTo}
            onChange={(e) => update({ tu: e.target.value || null })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="h-den" className="text-sm">Đến ngày</Label>
          <Input id="h-den" type="date" className={input} value={params.get("den") ?? defaultTo} max={defaultTo}
            onChange={(e) => update({ den: e.target.value || null })} />
        </div>
        <div className={cn("relative space-y-1", people ? "col-span-2 lg:col-span-1" : "col-span-2 lg:col-span-1")}>
          <Label htmlFor="h-q" className="text-sm">Mặt hàng</Label>
          <Search className="absolute bottom-3.5 left-3 size-5 text-muted-foreground" />
          <Input id="h-q" type="search" className={cn(input, "pl-10")} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tên hoặc mã hàng" />
          {pending && <Loader2 className="absolute right-3 bottom-3.5 size-5 animate-spin text-muted-foreground" />}
        </div>
        {people && (
          <div className="col-span-2 space-y-1 lg:col-span-1">
            <Label htmlFor="h-nguoi" className="text-sm">Người làm</Label>
            <select id="h-nguoi" className="h-12 w-full rounded-xl border border-input bg-background px-3 text-base"
              value={params.get("nguoi") ?? ""} onChange={(e) => update({ nguoi: e.target.value || null })}>
              <option value="">Tất cả mọi người</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {hasFilter && (
        <Button variant="ghost" size="lg" onClick={() => update({ tu: null, den: null, loai: null, sp: null, q: null, nguoi: null })}>
          <X /> Bỏ hết bộ lọc
        </Button>
      )}
    </div>
  );
}
