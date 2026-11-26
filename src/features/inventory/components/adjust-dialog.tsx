"use client";

import { ClipboardCheck } from "lucide-react";
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
import { adjustStock } from "../actions";
import type { LocationOption, ProductLite, StockRow } from "../types";
import { LocationSelect } from "./location-select";

/**
 * KIỂM KÊ (ông chủ / quản trị): nhập số đếm thực tế tại 1 vị trí, bắt buộc lý do.
 * `at` có sẵn = kiểm kê vị trí đang có hàng; không có = chọn vị trí (vd tìm thấy hàng ở chỗ chưa ghi).
 */
export function AdjustDialog({
  open,
  onOpenChange,
  product,
  at,
  stock,
  locations,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  product: ProductLite;
  at: StockRow | null;
  stock: StockRow[];
  locations: LocationOption[];
}) {
  const [locationId, setLocationId] = useState(at?.location_id ?? "");
  const [counted, setCounted] = useState(at ? String(at.quantity) : "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const unit = product.unitName.toLowerCase();

  const current = stock.find((s) => s.location_id === locationId)?.quantity ?? 0;
  const n = Number(counted.replace(",", "."));
  const valid = counted !== "" && Number.isFinite(n) && n >= 0 && (product.allowDecimal || Number.isInteger(n));
  const diff = valid ? n - current : 0;

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await adjustStock({ productId: product.id, locationId, counted, reason });
      if (!res.ok) return setError(res.error);
      toast.success(res.message ?? "Đã cập nhật");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-h-[92dvh] overflow-y-auto p-6 text-base sm:max-w-lg", DIALOG_MOBILE_FULL)}>
        <DialogHeader>
          <DialogTitle className="text-2xl">Kiểm kê</DialogTitle>
          <DialogDescription className="text-base font-medium text-foreground">{product.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-base">{error}</AlertDescription>
            </Alert>
          )}
          {at ? (
            <p className="font-mono text-xl font-bold">{at.code}</p>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="adj-loc" className="text-base font-medium">Vị trí kiểm kê</Label>
              <LocationSelect id="adj-loc" value={locationId} onChange={setLocationId} options={locations}
                suggested={stock.map((s) => ({ id: s.location_id, code: s.code, quantity: s.quantity }))} />
            </div>
          )}
          <p className="text-lg">Hệ thống đang ghi: <b>{formatQty(current)} {unit}</b></p>
          <div className="space-y-2">
            <Label htmlFor="adj-count" className="text-base font-medium">Đếm thực tế được bao nhiêu?</Label>
            <Input id="adj-count" value={counted} onChange={(e) => setCounted(e.target.value.replace(/[^\d.,]/g, ""))}
              inputMode={product.allowDecimal ? "decimal" : "numeric"} className="h-14 rounded-xl text-center text-2xl font-bold" />
            {valid && locationId && (
              <p className={cn("text-base font-semibold", diff === 0 ? "text-emerald-700" : diff > 0 ? "text-primary" : "text-destructive")}>
                {diff === 0 ? "Khớp với hệ thống" : diff > 0 ? `Thừa ${formatQty(diff)} ${unit} so với hệ thống` : `Thiếu ${formatQty(-diff)} ${unit} so với hệ thống`}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="adj-reason" className="text-base font-medium">Lý do (bắt buộc)</Label>
            <Input id="adj-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200}
              placeholder="VD: kiểm kê cuối tháng, hàng hỏng, nhập nhầm…" className="h-12 rounded-xl px-4 text-base" />
          </div>
          <div className={STICKY_ACTIONS}>
            <Button size="xl" className="w-full" disabled={!valid || !locationId || reason.trim().length < 3 || pending} onClick={submit}>
              <ClipboardCheck /> {pending ? "Đang lưu…" : "Lưu số kiểm kê"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
