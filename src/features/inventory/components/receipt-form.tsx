"use client";

import { CheckCircle2, PackagePlus, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, todayISO } from "@/lib/date";
import { formatQty } from "@/lib/format";
import { DIALOG_MOBILE_FULL, STICKY_ACTIONS } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import { createReceipt } from "../actions";
import type { LocationOption, QuickProduct } from "../types";
import { LocationSelect } from "./location-select";
import { ProductPicker } from "./product-picker";
import { QuantityStepper } from "./quantity-stepper";

type Line = { key: number; product: QuickProduct | null; locationId: string; qty: string; note: string };

let seq = 0;
const newLine = (product: QuickProduct | null = null): Line => ({
  key: ++seq,
  product,
  // cất chung chỗ đang có nhiều hàng nhất cho dễ tìm
  locationId: product?.locations[0]?.id ?? "",
  qty: "1",
  note: "",
});

function lineProblem(l: Line): string | null {
  if (!l.product) return "Chưa chọn mặt hàng";
  if (!l.locationId) return "Chưa chọn vị trí cất";
  const n = Number(l.qty.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return "Số lượng phải lớn hơn 0";
  if (!l.product.allowDecimal && !Number.isInteger(n)) return "Mặt hàng này chỉ nhập số nguyên";
  return null;
}

/** PHIẾU NHẬP: nhiều dòng (mặt hàng – vị trí cất – số lượng), ngày mặc định hôm nay */
export function ReceiptForm({
  locations,
  suppliers,
  initialProduct,
}: {
  locations: LocationOption[];
  suppliers: { id: string; name: string }[];
  initialProduct: QuickProduct | null;
}) {
  const [date, setDate] = useState(todayISO());
  const [supplierId, setSupplierId] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>(() => [newLine(initialProduct)]);
  const [showErrors, setShowErrors] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ docNo: string; lines: Line[] } | null>(null);
  const [pending, startTransition] = useTransition();

  const update = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const problems = lines.map(lineProblem);
  const hasProblem = problems.some(Boolean);
  const codeOf = (id: string) => locations.find((l) => l.id === id)?.code ?? "";

  function review() {
    setShowErrors(true);
    setError(null);
    if (hasProblem) {
      toast.error("Còn dòng chưa điền đủ, xem chữ đỏ bên dưới");
      return;
    }
    setConfirming(true);
  }

  function submit() {
    startTransition(async () => {
      const res = await createReceipt({
        date: date === todayISO() ? null : date,
        supplierId,
        referenceNo,
        note,
        lines: lines.map((l) => ({ productId: l.product!.id, locationId: l.locationId, quantity: l.qty, note: l.note })),
      });
      setConfirming(false);
      if (!res.ok) {
        setError(res.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      toast.success(res.message);
      setDone({ docNo: res.data.docNo, lines });
    });
  }

  function startOver() {
    setDone(null);
    setLines([newLine()]);
    setReferenceNo("");
    setNote("");
    setShowErrors(false);
    setError(null);
  }

  if (done) {
    return (
      <Card>
        <CardContent className="space-y-5 py-8 text-center">
          <CheckCircle2 className="mx-auto size-20 text-emerald-600" />
          <div>
            <p className="text-2xl font-bold">Đã nhập kho</p>
            <p className="text-lg text-muted-foreground">
              Phiếu <b className="font-mono text-foreground">{done.docNo}</b> · {done.lines.length} dòng
            </p>
          </div>
          <ul className="mx-auto max-w-xl space-y-2 text-left">
            {done.lines.map((l) => (
              <li key={l.key} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                <Link href={`/mat-hang/${l.product!.id}`} className="min-w-0 font-medium underline-offset-4 hover:underline">
                  <span className="line-clamp-1">{l.product!.name}</span>
                  <span className="font-mono text-sm text-muted-foreground">→ {codeOf(l.locationId)}</span>
                </Link>
                <span className="shrink-0 text-lg font-bold text-emerald-700">
                  +{formatQty(Number(l.qty.replace(",", ".")))} {l.product!.unitName.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
          <Button size="xl" onClick={startOver}>
            <PackagePlus /> Nhập phiếu mới
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <Alert variant="destructive">
          <AlertDescription className="text-base">{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Thông tin phiếu</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rc-date" className="text-base font-medium">Ngày nhập</Label>
            <Input id="rc-date" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value || todayISO())} className="h-12 rounded-xl px-4 text-base" />
            <p className="text-sm text-muted-foreground">Mặc định hôm nay. Chỉ đổi khi nhập bù cho ngày trước.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rc-sup" className="text-base font-medium">Nhà cung cấp (không bắt buộc)</Label>
            <select id="rc-sup" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base">
              <option value="">— Không chọn —</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {suppliers.length === 0 && <p className="text-sm text-muted-foreground">Quản trị thêm nhà cung cấp ở Kho & Kệ → Danh mục.</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="rc-ref" className="text-base font-medium">Số hoá đơn / chứng từ (không bắt buộc)</Label>
            <Input id="rc-ref" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} maxLength={60} placeholder="VD: HĐ 0001234" className="h-12 rounded-xl px-4 text-base" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rc-note" className="text-base font-medium">Ghi chú (không bắt buộc)</Label>
            <Input id="rc-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="h-12 rounded-xl px-4 text-base" />
          </div>
        </CardContent>
      </Card>

      {lines.map((l, i) => {
        const problem = showErrors ? problems[i] : null;
        const unit = l.product?.unitName.toLowerCase();
        return (
          <Card key={l.key} className={cn(problem && "border-destructive")}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl">Dòng {i + 1}</CardTitle>
              {lines.length > 1 && (
                <Button type="button" variant="ghost" size="lg" className="text-destructive" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>
                  <Trash2 /> Bỏ dòng
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-base font-medium">Mặt hàng</Label>
                <ProductPicker
                  value={l.product}
                  autoFocus={i > 0 && !l.product}
                  invalid={Boolean(problem && !l.product)}
                  onChange={(p) => update(l.key, { product: p, locationId: p?.locations[0]?.id ?? "" })}
                />
              </div>
              {l.product && (
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`loc-${l.key}`} className="text-base font-medium">Cất vào vị trí</Label>
                    <LocationSelect id={`loc-${l.key}`} value={l.locationId} onChange={(v) => update(l.key, { locationId: v })}
                      options={locations} suggested={l.product.locations} invalid={Boolean(problem && !l.locationId)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`qty-${l.key}`} className="text-base font-medium">Số lượng nhập</Label>
                    <QuantityStepper id={`qty-${l.key}`} value={l.qty} onChange={(v) => update(l.key, { qty: v })} allowDecimal={l.product.allowDecimal} unit={unit} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor={`note-${l.key}`} className="text-base font-medium">Ghi chú dòng (không bắt buộc)</Label>
                    <Input id={`note-${l.key}`} value={l.note} onChange={(e) => update(l.key, { note: e.target.value })} maxLength={200} className="h-12 rounded-xl px-4 text-base" />
                  </div>
                </div>
              )}
              {problem && <p className="text-base font-medium text-destructive">{problem}</p>}
            </CardContent>
          </Card>
        );
      })}

      <Button type="button" variant="outline" size="xl" className="w-full border-dashed" onClick={() => setLines((ls) => [...ls, newLine()])} disabled={lines.length >= 100}>
        <Plus /> Thêm dòng hàng
      </Button>

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:bottom-0">
        <Button size="xl" className="w-full sm:w-auto" onClick={review} disabled={pending}>
          <PackagePlus /> Kiểm tra & nhập kho ({lines.length} dòng)
        </Button>
      </div>

      <Dialog open={confirming} onOpenChange={(o) => !pending && setConfirming(o)}>
        <DialogContent className={cn("max-h-[92dvh] overflow-y-auto p-6 text-base sm:max-w-xl", DIALOG_MOBILE_FULL)}>
          <DialogHeader>
            <DialogTitle className="text-2xl">Xác nhận nhập kho</DialogTitle>
            <DialogDescription className="text-base">
              Ngày {formatDate(date)}
              {supplierId && ` · ${suppliers.find((s) => s.id === supplierId)?.name}`}
              {referenceNo && ` · ${referenceNo}`}
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2">
            {lines.map((l) => (
              <li key={l.key} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                <span className="min-w-0">
                  <span className="line-clamp-2 font-medium">{l.product!.name}</span>
                  <span className="font-mono text-base font-semibold text-primary">→ {codeOf(l.locationId)}</span>
                </span>
                <span className="shrink-0 text-xl font-bold">
                  +{formatQty(Number(l.qty.replace(",", ".")))} <span className="text-base font-normal">{l.product!.unitName.toLowerCase()}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className={cn(STICKY_ACTIONS, "grid gap-2 sm:grid-cols-[auto_1fr]")}>
            <Button variant="outline" size="xl" onClick={() => setConfirming(false)} disabled={pending}>
              Sửa lại
            </Button>
            <Button size="xl" onClick={submit} disabled={pending}>
              <PackagePlus /> {pending ? "Đang nhập kho…" : "Xác nhận nhập kho"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
