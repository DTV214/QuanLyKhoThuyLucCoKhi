"use client";

import { Save } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/common/form-field";
import { Button } from "@/components/ui/button";
import { updateOwnProfile } from "../actions";

/** Tự sửa họ tên (hiện ở lời chào và lịch sử) và số điện thoại */
export function ProfileForm({ fullName, phone }: { fullName: string; phone: string | null }) {
  const [name, setName] = useState(fullName);
  const [tel, setTel] = useState(phone ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    startTransition(async () => {
      const res = await updateOwnProfile({ fullName: name, phone: tel });
      if (!res.ok) {
        if (res.fieldErrors) setErrors(Object.fromEntries(Object.entries(res.fieldErrors).map(([k, v]) => [k, v[0]])));
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
    });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Họ và tên" value={name} onChange={(e) => setName(e.target.value)} error={errors.fullName} autoComplete="name" />
        <FormField label="Số điện thoại (không bắt buộc)" type="tel" inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} error={errors.phone} autoComplete="tel" />
      </div>
      <Button type="submit" size="xl" disabled={pending || (name.trim() === fullName && tel.trim() === (phone ?? ""))}>
        <Save /> {pending ? "Đang lưu…" : "Lưu thông tin"}
      </Button>
    </form>
  );
}
