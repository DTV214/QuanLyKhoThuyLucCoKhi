"use client";

import { ShieldCheck, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ASSIGNABLE_ROLES } from "../schemas";

type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

const OPTIONS: { value: AssignableRole; label: string; desc: string; icon: typeof UserRound }[] = [
  { value: "staff", label: "Nhân viên", desc: "Tìm hàng, lấy hàng, nhập hàng", icon: UserRound },
  { value: "admin", label: "Quản trị", desc: "Thêm như Nhân viên + quản lý hàng, kệ, kiểm kê, tài khoản nhân viên", icon: ShieldCheck },
];

/** Chọn quyền bằng thẻ lớn — dễ bấm hơn dropdown */
export function RolePicker({
  value,
  onChange,
  allowAdmin,
  error,
}: {
  value: AssignableRole;
  onChange: (v: AssignableRole) => void;
  allowAdmin: boolean;
  error?: string;
}) {
  const options = allowAdmin ? OPTIONS : OPTIONS.filter((o) => o.value === "staff");
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-base font-medium">Quyền</legend>
      <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
        {options.map(({ value: v, label, desc, icon: Icon }) => {
          const selected = value === v;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(v)}
              className={cn(
                "flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors",
                selected ? "border-primary bg-accent" : "border-border hover:border-primary/40",
              )}
            >
              <Icon className={cn("mt-0.5 size-5 shrink-0", selected ? "text-primary" : "text-muted-foreground")} />
              <span>
                <span className="block font-semibold">{label}</span>
                <span className="block text-sm text-muted-foreground">{desc}</span>
              </span>
            </button>
          );
        })}
      </div>
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </fieldset>
  );
}
