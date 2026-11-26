"use client";

import { Ban, RotateCcw } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { setProductActive } from "../actions";

export function ProductStatusButton({ id, active, name }: { id: string; active: boolean; name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={active ? "ghost" : "outline"} size="xl" onClick={() => setOpen(true)}>
        {active ? <Ban /> : <RotateCcw />}
        {active ? "Ngừng kinh doanh" : "Kinh doanh lại"}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={active ? `Ngừng kinh doanh "${name}"?` : `Kinh doanh lại "${name}"?`}
        description={
          active
            ? "Mặt hàng sẽ không hiện khi tìm hàng và không nhập/lấy được nữa. Lịch sử và số tồn vẫn được giữ."
            : "Mặt hàng sẽ hiện lại khi tìm hàng."
        }
        confirmLabel={active ? "Ngừng kinh doanh" : "Kinh doanh lại"}
        destructive={active}
        onConfirm={() => setProductActive({ id, active: !active })}
      />
    </>
  );
}
