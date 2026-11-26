"use client";

import { ArrowRight, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatDateTime } from "@/lib/date";
import { formatQty } from "@/lib/format";
import { DIALOG_MOBILE_FULL, STICKY_ACTIONS } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import { reverseMovement } from "../actions";
import type { MovementRow } from "../queries";
import { TYPE_LABEL } from "../schemas";

const TYPE_STYLE: Record<MovementRow["type"], string> = {
  IN: "border-emerald-300 bg-emerald-50 text-emerald-800",
  OUT: "border-blue-300 bg-blue-50 text-blue-800",
  TRANSFER: "border-violet-300 bg-violet-50 text-violet-800",
  ADJUST: "border-amber-300 bg-amber-50 text-amber-800",
  REVERSAL: "border-slate-300 bg-slate-100 text-slate-700",
};

/** "+12" / "−5" / "12" theo hướng thay đổi tồn kho */
function signed(m: MovementRow) {
  const q = formatQty(m.quantity);
  if (m.type === "IN" || (m.type === "ADJUST" && m.to)) return `+${q}`;
  if (m.type === "OUT" || (m.type === "ADJUST" && m.from)) return `−${q}`;
  return q;
}

function Where({ m }: { m: MovementRow }) {
  if (m.from && m.to)
    return (
      <span className="inline-flex flex-wrap items-center gap-1 font-mono">
        {m.from} <ArrowRight className="size-3.5" /> {m.to}
      </span>
    );
  return <span className="font-mono">{m.to ?? m.from ?? "—"}</span>;
}

function TypeBadge({ m }: { m: MovementRow }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      <Badge variant="outline" className={cn("text-sm", TYPE_STYLE[m.type])}>
        {TYPE_LABEL[m.type]}
      </Badge>
      {m.reversed && (
        <Badge variant="outline" className="border-destructive/40 text-sm text-destructive">
          Đã huỷ
        </Badge>
      )}
    </span>
  );
}

/** Danh sách thao tác: bảng trên máy tính, thẻ trên điện thoại. Quản lý có nút Huỷ (phiếu đảo). */
export function HistoryList({ rows, canReverse }: { rows: MovementRow[]; canReverse: boolean }) {
  const [target, setTarget] = useState<MovementRow | null>(null);
  const reversible = (m: MovementRow) => canReverse && m.type !== "REVERSAL" && !m.reversed;

  return (
    <>
      {/* Máy tính */}
      <div className="hidden overflow-x-auto rounded-2xl border bg-background lg:block">
        <Table className="text-base">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="h-12 pl-5">Thời gian</TableHead>
              <TableHead>Thao tác</TableHead>
              <TableHead>Mặt hàng</TableHead>
              <TableHead className="text-right">Số lượng</TableHead>
              <TableHead>Vị trí</TableHead>
              <TableHead>Người làm</TableHead>
              <TableHead>Ghi chú</TableHead>
              {canReverse && <TableHead className="pr-5" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((m) => (
              <TableRow key={m.id} className={cn(m.reversed && "opacity-60")}>
                <TableCell className="pl-5 whitespace-nowrap">
                  <span className="block">{formatDateTime(m.createdAt)}</span>
                  {m.date !== m.createdAt.slice(0, 10) && <span className="text-sm text-muted-foreground">Ngày ghi: {formatDate(m.date)}</span>}
                </TableCell>
                <TableCell><TypeBadge m={m} /></TableCell>
                <TableCell className="max-w-72 whitespace-normal">
                  <Link href={`/mat-hang/${m.product.id}`} className="font-medium hover:underline">{m.product.name}</Link>
                  <span className="block font-mono text-sm text-muted-foreground">{m.product.sku}</span>
                </TableCell>
                <TableCell className={cn("text-right text-lg font-bold whitespace-nowrap", signed(m).startsWith("+") ? "text-emerald-700" : signed(m).startsWith("−") ? "text-blue-700" : "")}>
                  {signed(m)} <span className="text-sm font-normal text-muted-foreground">{m.product.unit.toLowerCase()}</span>
                </TableCell>
                <TableCell><Where m={m} /></TableCell>
                <TableCell>{m.userName ?? "—"}</TableCell>
                <TableCell className="max-w-56 whitespace-normal text-muted-foreground">
                  {m.note}
                  {m.docNo && <span className="block font-mono text-sm">{m.docNo}</span>}
                </TableCell>
                {canReverse && (
                  <TableCell className="pr-5 text-right">
                    {reversible(m) && (
                      <Button variant="ghost" size="lg" onClick={() => setTarget(m)}>
                        <Undo2 /> Huỷ
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Điện thoại / máy tính bảng */}
      <ul className="space-y-3 lg:hidden">
        {rows.map((m) => (
          <li key={m.id} className={cn("space-y-2 rounded-2xl border bg-background p-4", m.reversed && "opacity-60")}>
            <div className="flex items-start justify-between gap-3">
              <TypeBadge m={m} />
              <span className="text-sm text-muted-foreground">{formatDateTime(m.createdAt)}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <Link href={`/mat-hang/${m.product.id}`} className="min-w-0 font-semibold">
                <span className="line-clamp-2">{m.product.name}</span>
              </Link>
              <span className={cn("shrink-0 text-xl font-bold", signed(m).startsWith("+") ? "text-emerald-700" : signed(m).startsWith("−") ? "text-blue-700" : "")}>
                {signed(m)} <span className="text-sm font-normal text-muted-foreground">{m.product.unit.toLowerCase()}</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <Where m={m} />
              {m.userName && <span>{m.userName}</span>}
              {m.docNo && <span className="font-mono">{m.docNo}</span>}
            </div>
            {m.note && <p className="text-sm">{m.note}</p>}
            {reversible(m) && (
              <Button variant="outline" size="lg" className="w-full" onClick={() => setTarget(m)}>
                <Undo2 /> Huỷ thao tác này
              </Button>
            )}
          </li>
        ))}
      </ul>

      {target && <ReverseDialog m={target} onClose={() => setTarget(null)} />}
    </>
  );
}

function ReverseDialog({ m, onClose }: { m: MovementRow; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const unit = m.product.unit.toLowerCase();

  const effect =
    m.type === "IN"
      ? `Trừ lại ${formatQty(m.quantity)} ${unit} tại ${m.to}`
      : m.type === "OUT"
        ? `Trả lại ${formatQty(m.quantity)} ${unit} vào ${m.from}`
        : m.type === "TRANSFER"
          ? `Chuyển ngược ${formatQty(m.quantity)} ${unit} từ ${m.to} về ${m.from}`
          : m.to
            ? `Trừ lại ${formatQty(m.quantity)} ${unit} tại ${m.to}`
            : `Cộng lại ${formatQty(m.quantity)} ${unit} tại ${m.from}`;

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await reverseMovement({ id: m.id, reason });
      if (!res.ok) return setError(res.error);
      toast.success(res.message);
      onClose();
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent className={cn("max-h-[92dvh] overflow-y-auto p-6 text-base sm:max-w-lg", DIALOG_MOBILE_FULL)}>
        <DialogHeader>
          <DialogTitle className="text-2xl">Huỷ thao tác này?</DialogTitle>
          <DialogDescription className="text-base">
            Dùng khi ghi nhầm. Lịch sử cũ vẫn giữ, hệ thống tạo thêm 1 dòng “Huỷ thao tác” để đưa số tồn về như trước.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-base">{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1 rounded-xl border p-4">
            <p className="font-semibold">{TYPE_LABEL[m.type]} · {m.product.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatDateTime(m.createdAt)} · {m.userName ?? "—"} · <Where m={m} />
            </p>
            <p className="pt-2 text-lg font-semibold text-primary">→ {effect}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rv-reason" className="text-base font-medium">Lý do huỷ (bắt buộc)</Label>
            <Input id="rv-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} autoFocus
              placeholder="VD: nhập nhầm số lượng, chọn sai mặt hàng…" className="h-12 rounded-xl px-4 text-base" />
          </div>
          <div className={cn(STICKY_ACTIONS, "grid gap-2 sm:grid-cols-[auto_1fr]")}>
            <Button variant="outline" size="xl" onClick={onClose} disabled={pending}>Không huỷ</Button>
            <Button variant="destructive" size="xl" onClick={submit} disabled={pending || reason.trim().length < 3}>
              <Undo2 /> {pending ? "Đang huỷ…" : "Huỷ thao tác"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
