"use client";

import { ArrowLeft, CalendarDays, CheckCircle2, MapPin, PackageMinus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, todayISO } from "@/lib/date";
import { formatQty } from "@/lib/format";
import { DIALOG_MOBILE_FULL, STICKY_ACTIONS } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import { takeStock } from "../actions";
import type { ProductLite, StockRow } from "../types";
import { QuantityStepper } from "./quantity-stepper";

type Step = "nhap" | "xacnhan" | "xong";

/**
 * LẤY HÀNG — 3 bước rõ ràng:
 * 1. Nhập số lượng (nút −/+ to)  2. Xác nhận: vị trí + số lấy + số còn lại  3. Kết quả
 */
export function TakeStockDialog({
  open,
  onOpenChange,
  product,
  location,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  product: ProductLite;
  location: StockRow;
}) {
  const [step, setStep] = useState<Step>("nhap");
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());
  const [showDate, setShowDate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ remainingAtLocation: number; totalRemaining: number } | null>(null);
  const [pending, startTransition] = useTransition();

  const unit = product.unitName.toLowerCase();
  const n = Number(qty.replace(",", "."));
  const qtyError =
    !qty || !Number.isFinite(n) || n <= 0
      ? "Nhập số lượng lớn hơn 0"
      : !product.allowDecimal && !Number.isInteger(n)
        ? "Mặt hàng này chỉ lấy số nguyên"
        : n > location.quantity
          ? `Tại vị trí này chỉ còn ${formatQty(location.quantity)} ${unit}`
          : null;

  function reset(o: boolean) {
    if (!o) {
      setStep("nhap");
      setQty("1");
      setNote("");
      setDate(todayISO());
      setShowDate(false);
      setError(null);
      setResult(null);
    }
    onOpenChange(o);
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await takeStock({
        productId: product.id,
        locationId: location.location_id,
        quantity: qty,
        date: date === todayISO() ? null : date,
        note,
      });
      if (!res.ok) {
        setError(res.error);
        setStep("nhap");
        return;
      }
      setResult(res.data);
      setStep("xong");
      toast.success(`Đã lấy ${formatQty(n)} ${unit} — ${product.name}`);
    });
  }

  const where = (
    <div className="rounded-xl border-2 border-primary/30 bg-accent/50 p-4">
      <p className="flex items-center gap-2 font-mono text-2xl font-bold text-primary">
        <MapPin className="size-6" /> {location.code}
      </p>
      <p className="mt-1 text-base">
        {location.warehouse} › {location.zone} › <b>Kệ {location.rack}</b> › <b>Tầng {location.level}</b>
      </p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className={cn("max-h-[92dvh] overflow-y-auto p-6 text-base sm:max-w-lg", DIALOG_MOBILE_FULL)}>
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {step === "xong" ? "Đã lấy hàng" : step === "xacnhan" ? "Kiểm tra lại trước khi lấy" : "Lấy hàng"}
          </DialogTitle>
          <DialogDescription className="text-base font-medium text-foreground">{product.name}</DialogDescription>
        </DialogHeader>

        {step === "nhap" && (
          <div className="space-y-5">
            {error && (
              <Alert variant="destructive">
                <AlertDescription className="text-base">{error}</AlertDescription>
              </Alert>
            )}
            {where}
            <p className="text-lg">
              Hiện còn: <b>{formatQty(location.quantity)} {unit}</b>
            </p>
            <div className="space-y-2">
              <Label htmlFor="take-qty" className="text-base font-medium">Bạn lấy bao nhiêu?</Label>
              <QuantityStepper id="take-qty" value={qty} onChange={setQty} allowDecimal={product.allowDecimal} max={location.quantity} unit={unit} invalid={Boolean(qtyError)} autoFocus />
              {qtyError && <p className="text-sm font-medium text-destructive">{qtyError}</p>}
              {location.quantity > 1 && (
                <Button type="button" variant="link" className="h-auto p-0 text-base" onClick={() => setQty(String(location.quantity))}>
                  Lấy hết ({formatQty(location.quantity)})
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="take-note" className="text-base font-medium">Lấy cho việc gì? (không bắt buộc)</Label>
              <Input id="take-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200}
                placeholder="VD: công trình nhà máy A, khách anh Tuấn…" className="h-12 rounded-xl px-4 text-base" />
            </div>
            {showDate ? (
              <div className="space-y-2">
                <Label htmlFor="take-date" className="text-base font-medium">Ngày lấy</Label>
                <Input id="take-date" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value || todayISO())} className="h-12 rounded-xl px-4 text-base" />
              </div>
            ) : (
              <button type="button" onClick={() => setShowDate(true)} className="flex min-h-11 items-center gap-2 text-base text-muted-foreground underline">
                <CalendarDays className="size-4" /> Ngày lấy: hôm nay ({formatDate(new Date())}) — bấm để đổi
              </button>
            )}
            <div className={STICKY_ACTIONS}>
              <Button size="xl" className="w-full" disabled={Boolean(qtyError)} onClick={() => setStep("xacnhan")}>
                Tiếp tục
              </Button>
            </div>
          </div>
        )}

        {step === "xacnhan" && (
          <div className="space-y-5">
            {where}
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl border p-4 text-lg">
              <dt className="text-muted-foreground">Lấy ra</dt>
              <dd className="text-right text-2xl font-bold text-primary">{formatQty(n)} {unit}</dd>
              <dt className="text-muted-foreground">Còn lại tại đây</dt>
              <dd className="text-right font-semibold">{formatQty(location.quantity - n)} {unit}</dd>
              {note && (
                <>
                  <dt className="text-muted-foreground">Lấy cho</dt>
                  <dd className="text-right">{note}</dd>
                </>
              )}
              <dt className="text-muted-foreground">Ngày</dt>
              <dd className="text-right">{formatDate(date)}</dd>
            </dl>
            <div className={cn(STICKY_ACTIONS, "grid gap-2 sm:grid-cols-[auto_1fr]")}>
              <Button variant="outline" size="xl" onClick={() => setStep("nhap")} disabled={pending}>
                <ArrowLeft /> Sửa lại
              </Button>
              <Button size="xl" onClick={confirm} disabled={pending}>
                <PackageMinus /> {pending ? "Đang trừ kho…" : `Xác nhận lấy ${formatQty(n)} ${unit}`}
              </Button>
            </div>
          </div>
        )}

        {step === "xong" && result && (
          <div className="space-y-5 text-center">
            <CheckCircle2 className="mx-auto size-20 text-emerald-600" />
            <p className="text-xl">
              Bạn đã lấy <b className="text-primary">{formatQty(n)} {unit}</b>
              <br />
              tại <b className="font-mono">{location.code}</b>
            </p>
            <div className="rounded-xl bg-muted p-4 text-lg">
              Còn lại tại vị trí này: <b>{formatQty(result.remainingAtLocation)} {unit}</b>
              <br />
              Tổng còn trong kho: <b>{formatQty(result.totalRemaining)} {unit}</b>
            </div>
            <div className={STICKY_ACTIONS}>
              <Button size="xl" className="w-full" onClick={() => reset(false)}>
                Xong
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
