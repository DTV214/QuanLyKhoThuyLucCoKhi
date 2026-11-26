"use client";

import { Check, Copy, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Hiện mật khẩu tạm MỘT LẦN để quản lý đọc/gửi cho nhân viên */
export function TempPasswordCard({
  fullName,
  email,
  tempPassword,
}: {
  fullName: string;
  email: string;
  tempPassword: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const text = `Tài khoản kho Thành Danh VMC\nEmail: ${email}\nMật khẩu tạm: ${tempPassword}\n(Đăng nhập xong sẽ được yêu cầu đổi mật khẩu)`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Trình duyệt chặn clipboard → người dùng tự chép tay
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-base">
        Gửi thông tin này cho <b>{fullName}</b>:
      </p>
      <dl className="space-y-3 rounded-xl border bg-muted/50 p-4">
        <div>
          <dt className="text-sm text-muted-foreground">Email đăng nhập</dt>
          <dd className="text-lg font-semibold break-all">{email}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Mật khẩu tạm</dt>
          <dd className="font-mono text-2xl font-bold tracking-wider text-primary select-all">{tempPassword}</dd>
        </div>
      </dl>
      <p className="flex items-start gap-2 text-sm text-amber-700">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
        Mật khẩu chỉ hiện một lần. Lần đầu đăng nhập, người dùng bắt buộc phải đổi mật khẩu.
      </p>
      <Button type="button" variant="outline" size="xl" className="w-full" onClick={copy}>
        {copied ? <Check /> : <Copy />}
        {copied ? "Đã sao chép" : "Sao chép thông tin đăng nhập"}
      </Button>
    </div>
  );
}
