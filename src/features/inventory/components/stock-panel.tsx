"use client";

import { ArrowRightLeft, ClipboardCheck, History, MapPin, PackageMinus, PackagePlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LocationOption, ProductLite, StockRow } from "../types";
import { AdjustDialog } from "./adjust-dialog";
import { TakeStockDialog } from "./take-stock-dialog";
import { TransferDialog } from "./transfer-dialog";

type Op = { kind: "take" | "transfer"; row: StockRow } | { kind: "adjust"; row: StockRow | null } | null;

/** Tồn kho theo vị trí + nút Lấy hàng / Chuyển / Kiểm kê ngay tại từng vị trí */
export function StockPanel({
  product,
  stock,
  minStock,
  locations,
  canAdjust,
  active,
}: {
  product: ProductLite;
  stock: StockRow[];
  minStock: number;
  locations: LocationOption[];
  canAdjust: boolean;
  active: boolean;
}) {
  // Giữ bản chụp vị trí khi mở hộp thoại: trang làm mới sau khi trừ kho không làm hộp thoại biến mất
  const [op, setOp] = useState<Op>(null);
  const total = stock.reduce((a, s) => a + s.quantity, 0);
  const unit = product.unitName.toLowerCase();
  const low = minStock > 0 && total <= minStock;
  const close = () => setOp(null);

  return (
    <Card className={cn(low && "border-amber-300")}>
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-baseline gap-x-3 text-xl">
          Tồn kho:
          <span className={cn("text-3xl", total === 0 ? "text-destructive" : low ? "text-amber-700" : "text-emerald-700")}>
            {formatQty(total)} {unit}
          </span>
          {total === 0 ? (
            <span className="text-base font-medium text-destructive">Hết hàng</span>
          ) : (
            low && <span className="text-base font-medium text-amber-700">Sắp hết (tối thiểu {formatQty(minStock)})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stock.length === 0 ? (
          <p className="text-muted-foreground">Chưa có hàng trong kho.</p>
        ) : (
          <ul className="space-y-3">
            {stock.map((s) => (
              <li key={s.location_id} className="space-y-3 rounded-xl border p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 font-mono text-xl font-bold text-primary">
                      <MapPin className="size-5 shrink-0" /> {s.code}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {s.warehouse} › {s.zone} › Kệ {s.rack}
                      {s.rack_name ? <b className="text-foreground"> ({s.rack_name})</b> : null} › Tầng {s.level}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-2xl font-bold">{formatQty(s.quantity)}</span>
                    <span className="text-sm text-muted-foreground">{unit}</span>
                  </span>
                </div>
                {active && (
                  <div className={cn("grid grid-cols-2 gap-2", canAdjust ? "sm:grid-cols-[2fr_1fr_1fr]" : "sm:grid-cols-[2fr_1fr]")}>
                    <Button size="xl" className={cn(canAdjust ? "col-span-2 sm:col-span-1" : "")} onClick={() => setOp({ kind: "take", row: s })}>
                      <PackageMinus /> Lấy hàng
                    </Button>
                    <Button size="xl" variant="outline" className="px-2" onClick={() => setOp({ kind: "transfer", row: s })}>
                      <ArrowRightLeft /> Chuyển
                    </Button>
                    {canAdjust && (
                      <Button size="xl" variant="outline" className="px-2" onClick={() => setOp({ kind: "adjust", row: s })}>
                        <ClipboardCheck /> Kiểm kê
                      </Button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {active && (
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <Button asChild size="xl" variant={stock.length ? "outline" : "default"}>
              <Link href={`/nhap-hang?sp=${product.id}`}>
                <PackagePlus /> Nhập thêm hàng này
              </Link>
            </Button>
            <Button asChild size="xl" variant="ghost">
              <Link href={`/lich-su?sp=${product.id}`}>
                <History /> Lịch sử mặt hàng này
              </Link>
            </Button>
            {canAdjust && (
              <Button size="xl" variant="ghost" onClick={() => setOp({ kind: "adjust", row: null })}>
                <ClipboardCheck /> Kiểm kê ở vị trí khác
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {op?.kind === "take" && <TakeStockDialog open onOpenChange={(o) => !o && close()} product={product} location={op.row} />}
      {op?.kind === "transfer" && (
        <TransferDialog open onOpenChange={(o) => !o && close()} product={product} from={op.row} stock={stock} locations={locations} />
      )}
      {op?.kind === "adjust" && (
        <AdjustDialog open onOpenChange={(o) => !o && close()} product={product} at={op.row} stock={stock} locations={locations} />
      )}
    </Card>
  );
}
