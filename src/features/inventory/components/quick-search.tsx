"use client";

import { MapPin, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { formatQty } from "@/lib/format";
import { ProductThumb, useProductSearch } from "./product-picker";

/**
 * Tìm nhanh từ bất kỳ trang nào: nút trên thanh đầu trang hoặc phím Ctrl+K (⌘K trên Mac).
 * Enter → mở trang mặt hàng; "Xem tất cả" → trang Tìm hàng với từ khoá.
 */
export function QuickSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const { results, loading } = useProductSearch(q);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        onClick={() => setOpen(true)}
        className="h-11 justify-start gap-2 text-muted-foreground max-sm:size-11 max-sm:justify-center sm:w-64"
        aria-label="Tìm nhanh mặt hàng"
      >
        <Search className="size-5 text-primary" />
        <span className="max-sm:sr-only">Tìm nhanh…</span>
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 text-xs lg:inline">Ctrl K</kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen} title="Tìm nhanh mặt hàng" description="Gõ tên, mã, cỡ hoặc mã kệ" className="max-sm:top-4 sm:max-w-xl">
        <Command shouldFilter={false}>
        <CommandInput value={q} onValueChange={setQ} placeholder="Gõ tên, mã, cỡ… vd: van phi8" className="h-14 text-base" />
        <CommandList className="max-h-[60dvh]">
          {q.trim() && !loading && <CommandEmpty className="py-8 text-center text-base">Không tìm thấy mặt hàng.</CommandEmpty>}
          {!q.trim() && <p className="p-6 text-center text-base text-muted-foreground">Gõ để tìm. Phím tắt: Ctrl + K</p>}
          {results.length > 0 && (
            <CommandGroup heading="Mặt hàng">
              {results.map((p) => (
                <CommandItem key={p.id} value={p.id} onSelect={() => go(`/mat-hang/${p.id}`)} className="gap-3 py-2">
                  <ProductThumb url={p.imageUrl} className="size-11" />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 text-base font-medium">{p.name}</span>
                    <span className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                      <span className="font-mono">{p.sku}</span>
                      <span>Còn {formatQty(p.totalQuantity)} {p.unitName.toLowerCase()}</span>
                      {p.locations[0] && (
                        <span className="flex items-center gap-1 font-mono">
                          <MapPin className="size-3" /> {p.locations[0].code}
                        </span>
                      )}
                    </span>
                  </span>
                </CommandItem>
              ))}
              <CommandItem value="__all" onSelect={() => go(`/tim-hang?q=${encodeURIComponent(q.trim())}`)} className="justify-center py-3 text-base font-medium text-primary">
                Xem tất cả kết quả cho “{q.trim()}”
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
