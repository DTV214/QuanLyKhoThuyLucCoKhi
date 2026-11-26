"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Ô số lượng to, nút − / + lớn cho người lớn tuổi. Giá trị giữ dạng chuỗi để gõ "2,5" được. */
export function QuantityStepper({
  value,
  onChange,
  allowDecimal,
  max,
  unit,
  id,
  invalid,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  allowDecimal: boolean;
  max?: number;
  unit?: string;
  id?: string;
  invalid?: boolean;
  autoFocus?: boolean;
}) {
  const n = Number(value.replace(",", ".")) || 0;
  const step = 1;
  const clamp = (x: number) => Math.max(0, max !== undefined ? Math.min(max, x) : x);
  const fmt = (x: number) => String(allowDecimal ? Math.round(x * 1000) / 1000 : Math.round(x));

  return (
    <div className="flex items-stretch gap-2">
      <Button
        type="button"
        variant="outline"
        className="size-14 shrink-0 rounded-xl [&_svg]:size-6"
        aria-label="Bớt 1"
        disabled={n <= 1}
        onClick={() => onChange(fmt(clamp(n - step)))}
      >
        <Minus />
      </Button>
      <div className="relative min-w-0 flex-1">
        <Input
          id={id}
          value={value}
          autoFocus={autoFocus}
          inputMode={allowDecimal ? "decimal" : "numeric"}
          aria-invalid={invalid}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^\d.,]/g, "");
            onChange(allowDecimal ? raw : raw.replace(/[.,]/g, ""));
          }}
          onFocus={(e) => e.target.select()}
          className={cn("h-14 rounded-xl text-center text-2xl font-bold", unit && "pr-16")}
        />
        {unit && (
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-base text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        className="size-14 shrink-0 rounded-xl [&_svg]:size-6"
        aria-label="Thêm 1"
        disabled={max !== undefined && n >= max}
        onClick={() => onChange(fmt(clamp(n + step)))}
      >
        <Plus />
      </Button>
    </div>
  );
}
