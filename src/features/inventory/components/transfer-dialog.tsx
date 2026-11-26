"use client";

import { ArrowRightLeft, MapPin } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatQty } from "@/lib/format";
import { DIALOG_MOBILE_FULL, STICKY_ACTIONS } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import { transferStock } from "../actions";
import type { LocationOption, ProductLite, StockRow } from "../types";
import { LocationSelect } from "./location-select";
import { QuantityStepper } from "./quantity-stepper";

/** CHUYỂN hàng từ vị trí này sang vị trí khác (khác kệ hoặc Kho 1 ↔ Kho 2) */
export function TransferDialog({
  open,
  onOpenChange,
  product,
  from,
  stock,
  locations,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  product: ProductLite;
  from: StockRow;
  stock: StockRow[];
  locations: LocationOption[];
}) {
  const [qty, setQty] = useState(String(from.quantity));
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const unit = product.unitName.toLowerCase();
  const n = Number(qty.replace(",", "."));
  const toCode = locations.find((l) => l.id === to)?.code;

  const problem =
    !to
      ? "Chọn vị trí đến"
      : !Number.isFinite(n) || n <= 0
        ? "Nhập số lượng lớn hơn 0"
        : !product.allowDecimal && !Number.isInteger(n)
          ? "Mặt hàng này chỉ chuyển số nguyên"
          : n > from.quantity
            ? `Chỉ còn ${formatQty(from.quantity)} ${unit}`
            : null;

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await transferStock({ productId: product.id, fromLocationId: from.location_id, toLocationId: to, quantity: qty, note });
      if (!res.ok) return setError(res.error);
      toast.success(`Đã chuyển ${formatQty(n)} ${unit} từ ${from.code} sang ${toCode}`);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-h-[92dvh] overflow-y-auto p-6 text-base sm:max-w-lg", DIALOG_MOBILE_FULL)}>
        <DialogHeader>
          <DialogTitle className="text-2xl">Chuyển vị trí</DialogTitle>
          <DialogDescription className="text-base font-medium text-foreground">{product.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-base">{error}</AlertDescription>
            </Alert>
          )}
          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">Từ</p>
            <p className="flex items-center gap-2 font-mono text-xl font-bold"><MapPin className="size-5" /> {from.code}</p>
            <p className="text-sm text-muted-foreground">Đang có {formatQty(from.quantity)} {unit}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tr-to" className="text-base font-medium">Đến vị trí</Label>
            <LocationSelect id="tr-to" value={to} onChange={setTo} options={locations} exclude={from.location_id}
              suggested={stock.map((s) => ({ id: s.location_id, code: s.code, quantity: s.quantity }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tr-qty" className="text-base font-medium">Số lượng chuyển</Label>
            <QuantityStepper id="tr-qty" value={qty} onChange={setQty} allowDecimal={product.allowDecimal} max={from.quantity} unit={unit} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tr-note" className="text-base font-medium">Ghi chú (không bắt buộc)</Label>
            <Input id="tr-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} className="h-12 rounded-xl px-4 text-base" placeholder="VD: dồn hàng về Kho 1" />
          </div>
          {!problem && (
            <p className="rounded-xl bg-accent p-3 text-base">
              Chuyển <b>{formatQty(n)} {unit}</b> từ <b className="font-mono">{from.code}</b> sang <b className="font-mono">{toCode}</b>.
            </p>
          )}
          {problem && to && <p className="text-sm font-medium text-destructive">{problem}</p>}
          <div className={STICKY_ACTIONS}>
            <Button size="xl" className="w-full" disabled={Boolean(problem) || pending} onClick={submit}>
              <ArrowRightLeft /> {pending ? "Đang chuyển…" : "Xác nhận chuyển"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
