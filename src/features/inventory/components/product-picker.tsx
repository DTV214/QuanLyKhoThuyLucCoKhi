"use client";

import { Loader2, Package, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cldUrl } from "@/lib/cloudinary-url";
import { formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";
import { quickSearchProducts } from "../actions";
import type { QuickProduct } from "../types";

/** Hook dùng chung: gõ → chờ 300ms → tìm trên server */
export function useProductSearch(q: string) {
  const [results, setResults] = useState<QuickProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);
  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults([]);
      return;
    }
    const my = ++seq.current;
    setLoading(true);
    const t = setTimeout(async () => {
      const r = await quickSearchProducts(term);
      if (my === seq.current) {
        setResults(r);
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  return { results, loading };
}

/* eslint-disable @next/next/no-img-element */
export function ProductThumb({ url, className }: { url: string | null; className?: string }) {
  return url ? (
    <img src={cldUrl(url, 120)!} alt="" className={cn("size-12 shrink-0 rounded-lg border bg-white object-contain", className)} />
  ) : (
    <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground", className)}>
      <Package className="size-6" />
    </span>
  );
}

/** Ô chọn mặt hàng: gõ tên / mã → chọn trong danh sách */
export function ProductPicker({
  value,
  onChange,
  invalid,
  autoFocus,
}: {
  value: QuickProduct | null;
  onChange: (p: QuickProduct | null) => void;
  invalid?: boolean;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const { results, loading } = useProductSearch(q);
  const listId = useId();

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-xl border-2 border-primary/30 bg-accent/40 p-2 pr-1">
        <ProductThumb url={value.imageUrl} />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-semibold">{value.name}</p>
          <p className="truncate text-sm text-muted-foreground">
            <span className="font-mono">{value.sku}</span> · đang có {formatQty(value.totalQuantity)} {value.unitName.toLowerCase()}
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon-lg" className="size-11 shrink-0" aria-label="Đổi mặt hàng" onClick={() => onChange(null)}>
          <X />
        </Button>
      </div>
    );
  }

  const choose = (p: QuickProduct) => {
    onChange(p);
    setQ("");
    setOpen(false);
  };

  return (
    <div className="relative">
      <Search className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && results[active]) {
            e.preventDefault();
            choose(results[active]);
          }
        }}
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-invalid={invalid}
        placeholder="Gõ tên hoặc mã hàng, vd: van phi8"
        className="h-14 rounded-xl pr-10 pl-12 text-base"
      />
      {loading && <Loader2 className="absolute top-1/2 right-4 size-5 -translate-y-1/2 animate-spin text-muted-foreground" />}
      {open && q.trim() && !loading && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-xl border bg-popover p-1 shadow-lg">
          {results.length === 0 && <li className="p-4 text-center text-muted-foreground">Không tìm thấy mặt hàng</li>}
          {results.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(p)}
                className={cn("flex w-full items-center gap-3 rounded-lg p-2 text-left", i === active ? "bg-accent" : "hover:bg-muted")}
              >
                <ProductThumb url={p.imageUrl} className="size-10" />
                <span className="min-w-0">
                  <span className="line-clamp-1 font-medium">{p.name}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    <span className="font-mono">{p.sku}</span> · có {formatQty(p.totalQuantity)} {p.unitName.toLowerCase()}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
