"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = ComponentProps<typeof Input> & {
  label: string;
  error?: string;
  hint?: string;
};

/** Ô nhập to, nhãn rõ, lỗi tiếng Việt ngay bên dưới */
export function FormField({ label, error, hint, className, id, type, ...props }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId} className="text-base font-medium">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={inputId}
          type={isPassword && show ? "text" : type}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn("h-12 rounded-xl px-4 text-base", isPassword && "pr-24", className)}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 right-2 my-auto flex h-9 items-center gap-1 rounded-lg px-2 text-sm text-muted-foreground hover:bg-muted"
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {show ? "Ẩn" : "Hiện"}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
