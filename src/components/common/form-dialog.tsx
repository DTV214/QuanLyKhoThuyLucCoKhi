"use client";

import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/common/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import { DIALOG_MOBILE_FULL, STICKY_ACTIONS } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "number" | "textarea" | "select";
  defaultValue?: string | number | null;
  placeholder?: string;
  hint?: string;
  /** Tự viết hoa khi gõ (mã kho, mã kệ…) */
  uppercase?: boolean;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  required?: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: FieldDef[];
  submitLabel?: string;
  /** Giá trị ẩn gửi kèm (id, warehouseId…) */
  hidden?: Record<string, string | undefined>;
  onSubmit: (values: Record<string, unknown>) => Promise<ActionResult<unknown>>;
  /** Nội dung thêm dưới các ô (vd: trình sửa thông số) */
  children?: ReactNode;
  /** Lấy thêm giá trị từ children khi submit */
  extraValues?: () => Record<string, unknown>;
  wide?: boolean;
};

/** Hộp thoại form chuẩn: ô to, lỗi tiếng Việt từng ô, nút lớn */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  submitLabel = "Lưu",
  hidden,
  onSubmit,
  children,
  extraValues,
  wide,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  function handleOpenChange(o: boolean) {
    if (!o) {
      setErrors({});
      setFormError(null);
    }
    onOpenChange(o);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const values: Record<string, unknown> = { ...hidden };
    for (const f of fields) {
      const raw = String(fd.get(f.name) ?? "").trim();
      values[f.name] = f.type === "number" ? (raw === "" ? undefined : Number(raw)) : raw;
    }
    Object.assign(values, extraValues?.());
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const res = await onSubmit(values);
      if (!res.ok) {
        setFormError(res.error);
        if (res.fieldErrors) {
          setErrors(Object.fromEntries(Object.entries(res.fieldErrors).map(([k, v]) => [k, v[0]])));
        }
        return;
      }
      toast.success(res.message ?? "Đã lưu");
      handleOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn("max-h-[92dvh] overflow-y-auto p-6 text-base", DIALOG_MOBILE_FULL, wide ? "sm:max-w-3xl" : "sm:max-w-lg")}>
        <DialogHeader>
          <DialogTitle className="text-2xl">{title}</DialogTitle>
          {description && <DialogDescription className="text-base">{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-5">
          {formError && (
            <Alert variant="destructive">
              <AlertDescription className="text-base">{formError}</AlertDescription>
            </Alert>
          )}
          {fields.map((f) => {
            const label = f.required ? f.label : `${f.label} (không bắt buộc)`;
            if (f.type === "textarea") {
              return (
                <div key={f.name} className="space-y-2">
                  <Label htmlFor={`fd-${f.name}`} className="text-base font-medium">
                    {label}
                  </Label>
                  <Textarea
                    id={`fd-${f.name}`}
                    name={f.name}
                    defaultValue={f.defaultValue ?? ""}
                    placeholder={f.placeholder}
                    className="min-h-24 rounded-xl px-4 py-3 text-base"
                  />
                  {errors[f.name] && <p className="text-sm font-medium text-destructive">{errors[f.name]}</p>}
                </div>
              );
            }
            if (f.type === "select") {
              return (
                <div key={f.name} className="space-y-2">
                  <Label htmlFor={`fd-${f.name}`} className="text-base font-medium">
                    {label}
                  </Label>
                  <select
                    id={`fd-${f.name}`}
                    name={f.name}
                    defaultValue={f.defaultValue ?? ""}
                    className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {!f.required && <option value="">— Không chọn —</option>}
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {errors[f.name] && <p className="text-sm font-medium text-destructive">{errors[f.name]}</p>}
                </div>
              );
            }
            return (
              <FormField
                key={f.name}
                label={label}
                name={f.name}
                type={f.type === "number" ? "number" : "text"}
                inputMode={f.type === "number" ? "numeric" : undefined}
                min={f.min}
                max={f.max}
                defaultValue={f.defaultValue ?? ""}
                placeholder={f.placeholder}
                hint={f.hint}
                error={errors[f.name]}
                autoComplete="off"
                className={f.uppercase ? "uppercase placeholder:normal-case" : undefined}
              />
            );
          })}
          {children}
          <div className={STICKY_ACTIONS}>
            <Button type="submit" size="xl" className="w-full" disabled={pending}>
              {pending ? "Đang lưu…" : submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
