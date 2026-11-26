"use client";

import { Ban, Boxes, MapPin, Pencil, Plus, RotateCcw, Warehouse } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { FormDialog } from "@/components/common/form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DIALOG_MOBILE_FULL } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import { saveRack, saveWarehouse, saveZone, setActive } from "../actions";
import type { RackNode, WarehouseNode, ZoneNode } from "../types";

type DialogState =
  | { kind: "warehouse"; data?: WarehouseNode }
  | { kind: "zone"; warehouseId: string; data?: ZoneNode }
  | { kind: "rack"; zoneId: string; zones: ZoneNode[]; data?: RackNode }
  | { kind: "active"; entity: "warehouses" | "zones" | "racks"; id: string; active: boolean; label: string }
  | null;

export function WarehouseMap({ tree, canEdit }: { tree: WarehouseNode[]; canEdit: boolean }) {
  const [selectedId, setSelectedId] = useState(tree[0]?.id);
  const [showInactive, setShowInactive] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [openRack, setOpenRack] = useState<{ rack: RackNode; zone: ZoneNode } | null>(null);

  const visibleTree = tree.filter((w) => showInactive || w.isActive);
  const wh = visibleTree.find((w) => w.id === selectedId) ?? visibleTree[0];
  const zones = wh ? wh.zones.filter((z) => showInactive || z.isActive) : [];
  const close = () => setDialog(null);

  // Lấy lại kệ mới nhất sau khi trang được làm mới (revalidatePath)
  const liveRack =
    openRack &&
    tree.flatMap((w) => w.zones.flatMap((z) => z.racks.map((r) => ({ r, z })))).find((x) => x.r.id === openRack.rack.id);

  return (
    <div className="space-y-6">
      {/* Chọn kho */}
      <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center">
        {visibleTree.map((w) => {
          const rackCount = w.zones.reduce((a, z) => a + z.racks.filter((r) => r.isActive).length, 0);
          const active = w.id === wh?.id;
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => setSelectedId(w.id)}
              aria-pressed={active}
              className={cn(
                "flex min-h-16 items-center gap-3 rounded-2xl border-2 px-5 py-3 text-left transition-colors",
                active ? "border-primary bg-primary text-primary-foreground shadow-md" : "bg-background hover:border-primary/40",
                !w.isActive && "opacity-60",
              )}
            >
              <Warehouse className="size-6 shrink-0" />
              <span>
                <span className="block text-lg font-bold">{w.name}</span>
                <span className={cn("block text-sm", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  Mã {w.code} · {w.zones.length} khu · {rackCount} kệ
                </span>
              </span>
            </button>
          );
        })}
        {canEdit && (
          <Button variant="outline" size="xl" className="w-full sm:w-auto" onClick={() => setDialog({ kind: "warehouse" })}>
            <Plus /> Thêm kho
          </Button>
        )}
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-base text-muted-foreground sm:ml-auto">
          <input
            type="checkbox"
            className="size-5 accent-primary"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Hiện cả mục ngừng dùng
        </label>
      </div>

      {!wh ? (
        <p className="rounded-2xl border bg-background p-10 text-center text-lg text-muted-foreground">Chưa có kho nào.</p>
      ) : (
        <>
          {/* Thông tin kho */}
          <div className="flex flex-col gap-4 rounded-2xl border bg-background p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-bold">
                {wh.name} {!wh.isActive && <Badge variant="destructive">Ngừng dùng</Badge>}
              </h2>
              {wh.address && (
                <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="size-4" /> {wh.address}
                </p>
              )}
              {wh.description && <p className="mt-1 text-muted-foreground">{wh.description}</p>}
            </div>
            {canEdit && (
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <Button size="xl" className="col-span-2" onClick={() => setDialog({ kind: "zone", warehouseId: wh.id })}>
                  <Plus /> Thêm khu vực
                </Button>
                <Button variant="outline" size="xl" onClick={() => setDialog({ kind: "warehouse", data: wh })}>
                  <Pencil /> Sửa kho
                </Button>
                <ActiveButton
                  active={wh.isActive}
                  onClick={() =>
                    setDialog({ kind: "active", entity: "warehouses", id: wh.id, active: !wh.isActive, label: wh.name })
                  }
                />
              </div>
            )}
          </div>

          {zones.length === 0 && (
            <p className="rounded-2xl border bg-background p-10 text-center text-lg text-muted-foreground">
              Kho này chưa có khu vực nào{canEdit ? ". Bấm \"Thêm khu vực\" để bắt đầu." : "."}
            </p>
          )}

          {/* Các khu vực */}
          {zones.map((zone) => {
            const racks = zone.racks.filter((r) => showInactive || r.isActive);
            return (
              <section key={zone.id} className={cn("space-y-4 rounded-2xl border bg-background p-5", !zone.isActive && "opacity-70")}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <h3 className="flex flex-wrap items-center gap-3 text-xl font-bold">
                    <span className="rounded-lg bg-accent px-2.5 py-1 font-mono text-accent-foreground">
                      {wh.code}-{zone.code}
                    </span>
                    {zone.name}
                    {!zone.isActive && <Badge variant="destructive">Ngừng dùng</Badge>}
                  </h3>
                  {canEdit && (
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                      <Button
                        size="lg"
                        className="col-span-2"
                        onClick={() => setDialog({ kind: "rack", zoneId: zone.id, zones: wh.zones })}
                        disabled={!zone.isActive}
                      >
                        <Plus /> Thêm kệ
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => setDialog({ kind: "zone", warehouseId: wh.id, data: zone })}
                      >
                        <Pencil /> Sửa khu
                      </Button>
                      <ActiveButton
                        small
                        active={zone.isActive}
                        onClick={() =>
                          setDialog({ kind: "active", entity: "zones", id: zone.id, active: !zone.isActive, label: zone.name })
                        }
                      />
                    </div>
                  )}
                </div>

                {racks.length === 0 ? (
                  <p className="text-muted-foreground">Chưa có kệ nào trong khu này.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {racks.map((rack) => (
                      <button
                        key={rack.id}
                        type="button"
                        onClick={() => setOpenRack({ rack, zone })}
                        className={cn(
                          "group flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md",
                          !rack.isActive && "border-dashed opacity-60",
                        )}
                      >
                        <span className="font-mono text-lg font-bold text-primary">{rack.fullCode}</span>
                        {rack.name && <span className="line-clamp-1 text-sm">{rack.name}</span>}
                        <span className="text-sm text-muted-foreground">{rack.levels} tầng</span>
                        <span
                          className={cn(
                            "mt-1 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-medium",
                            rack.productCount > 0 ? "bg-emerald-50 text-emerald-800" : "bg-muted text-muted-foreground",
                          )}
                        >
                          <Boxes className="size-3.5" />
                          {rack.productCount > 0 ? `${rack.productCount} mặt hàng` : "Trống"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </>
      )}

      {/* Chi tiết kệ */}
      <Dialog open={!!liveRack} onOpenChange={(o) => !o && setOpenRack(null)}>
        <DialogContent className={cn("max-h-[92dvh] overflow-y-auto p-6 text-base sm:max-w-lg", DIALOG_MOBILE_FULL)}>
          {liveRack && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono text-2xl">Kệ {liveRack.r.fullCode}</DialogTitle>
                <DialogDescription className="text-base">
                  {liveRack.z.name}
                  {liveRack.r.levelWidthMm || liveRack.r.levelDepthMm || liveRack.r.levelMaxLoadKg
                    ? ` · Mỗi tầng: ${[liveRack.r.levelWidthMm, liveRack.r.levelDepthMm, liveRack.r.levelHeightMm].map((x) => x ?? "—").join(" × ")} mm${liveRack.r.levelMaxLoadKg ? `, tối đa ${liveRack.r.levelMaxLoadKg} kg` : ""}`
                    : ""}
                  {liveRack.r.name ? ` · ${liveRack.r.name}` : ""}
                  {liveRack.r.description ? ` · ${liveRack.r.description}` : ""}
                </DialogDescription>
              </DialogHeader>
              {/* Vẽ như kệ thật: tầng cao nhất ở trên */}
              <ol className="space-y-2 rounded-xl border-x-8 border-b-8 border-slate-300 bg-slate-50 p-3">
                {[...liveRack.r.locations]
                  .filter((l) => l.isActive || showInactive)
                  .sort((a, b) => b.level - a.level || (b.bin ?? 0) - (a.bin ?? 0))
                  .map((loc) => (
                    <li
                      key={loc.id}
                      className={cn(
                        "flex items-center justify-between rounded-lg border bg-background px-4 py-3",
                        !loc.isActive && "opacity-50",
                      )}
                    >
                      <span>
                        <span className="block font-semibold">
                          Tầng {loc.level}
                          {loc.bin ? ` · Ô ${loc.bin}` : ""}
                        </span>
                        <span className="font-mono text-sm text-muted-foreground">{loc.code}</span>
                      </span>
                      <span className={cn("text-sm font-medium", loc.productCount ? "text-emerald-700" : "text-muted-foreground")}>
                        {loc.productCount ? `${loc.productCount} mặt hàng` : "Trống"}
                      </span>
                    </li>
                  ))}
              </ol>
              <p className="text-sm text-muted-foreground">
                Mã vị trí (vd {liveRack.r.locations[0]?.code}) dùng để ghi lên nhãn kệ và tìm nhanh trong ô Tìm hàng.
              </p>
              {canEdit && (
                <div className="grid gap-2 sm:flex sm:flex-wrap">
                  <Button
                    size="xl"
                    variant="outline"
                    onClick={() =>
                      setDialog({
                        kind: "rack",
                        zoneId: liveRack.z.id,
                        zones: tree.find((w) => w.zones.some((z) => z.id === liveRack.z.id))?.zones ?? [],
                        data: liveRack.r,
                      })
                    }
                  >
                    <Pencil /> Sửa kệ / số tầng
                  </Button>
                  <ActiveButton
                    active={liveRack.r.isActive}
                    onClick={() =>
                      setDialog({
                        kind: "active",
                        entity: "racks",
                        id: liveRack.r.id,
                        active: !liveRack.r.isActive,
                        label: `kệ ${liveRack.r.fullCode}`,
                      })
                    }
                  />
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Form kho */}
      {dialog?.kind === "warehouse" && (
        <FormDialog
          open
          onOpenChange={(o) => !o && close()}
          title={dialog.data ? "Sửa thông tin kho" : "Thêm kho mới"}
          hidden={{ id: dialog.data?.id }}
          onSubmit={saveWarehouse}
          fields={[
            { name: "code", label: "Mã kho", required: true, uppercase: true, defaultValue: dialog.data?.code, placeholder: "VD: K3", hint: "Dùng làm đầu mã vị trí, vd K3-A-01-T2" },
            { name: "name", label: "Tên kho", required: true, defaultValue: dialog.data?.name, placeholder: "VD: Kho 3 – Xưởng" },
            { name: "address", label: "Địa chỉ", defaultValue: dialog.data?.address },
            { name: "description", label: "Ghi chú", type: "textarea", defaultValue: dialog.data?.description },
          ]}
        />
      )}

      {/* Form khu vực */}
      {dialog?.kind === "zone" && (
        <FormDialog
          open
          onOpenChange={(o) => !o && close()}
          title={dialog.data ? "Sửa khu vực" : "Thêm khu vực"}
          description={wh ? `Thuộc ${wh.name}` : undefined}
          hidden={{ id: dialog.data?.id, warehouseId: dialog.warehouseId }}
          onSubmit={saveZone}
          fields={[
            { name: "code", label: "Mã khu", required: true, uppercase: true, defaultValue: dialog.data?.code, placeholder: "VD: A, B, ONG" },
            { name: "name", label: "Tên khu", required: true, defaultValue: dialog.data?.name, placeholder: "VD: Khu A – Fitting & hạt bắp" },
            { name: "description", label: "Ghi chú", type: "textarea", defaultValue: dialog.data?.description },
          ]}
        />
      )}

      {/* Form kệ */}
      {dialog?.kind === "rack" && (
        <FormDialog
          open
          onOpenChange={(o) => !o && close()}
          title={dialog.data ? `Sửa kệ ${dialog.data.fullCode}` : "Thêm kệ"}
          description={
            dialog.data
              ? "Tăng số tầng sẽ thêm tầng mới. Chỉ giảm được số tầng khi các tầng bị bỏ đang trống."
              : "Các tầng sẽ được tạo tự động theo số tầng."
          }
          hidden={{ id: dialog.data?.id }}
          onSubmit={saveRack}
          fields={[
            {
              name: "zoneId",
              label: "Khu vực",
              type: "select",
              required: true,
              defaultValue: dialog.zoneId,
              options: dialog.zones.filter((z) => z.isActive || z.id === dialog.zoneId).map((z) => ({ value: z.id, label: `${z.code} – ${z.name}` })),
            },
            { name: "code", label: "Mã kệ", required: true, uppercase: true, defaultValue: dialog.data?.code, placeholder: "VD: 01, 02, 15" },
            { name: "levels", label: "Số tầng", type: "number", required: true, min: 1, max: 20, defaultValue: dialog.data?.levels ?? 4 },
            { name: "name", label: "Tên gợi nhớ", defaultValue: dialog.data?.name, placeholder: "VD: Kệ to gần cửa, kệ sắt xanh", hint: "Hiện cạnh mã kệ khi chọn chỗ cất / lấy hàng — giúp nhận ra kệ nhanh" },
            { name: "levelWidthMm", label: "Chiều ngang mỗi tầng (mm)", type: "number", min: 1, defaultValue: dialog.data?.levelWidthMm, placeholder: "VD: 1200", hint: "Đo 1 tầng. Dùng để cảnh báo hàng quá dài / quá nặng" },
            { name: "levelDepthMm", label: "Chiều sâu mỗi tầng (mm)", type: "number", min: 1, defaultValue: dialog.data?.levelDepthMm, placeholder: "VD: 600" },
            { name: "levelHeightMm", label: "Chiều cao mỗi tầng (mm)", type: "number", min: 1, defaultValue: dialog.data?.levelHeightMm, placeholder: "VD: 400" },
            { name: "levelMaxLoadKg", label: "Tải trọng tối đa mỗi tầng (kg)", type: "number", min: 1, defaultValue: dialog.data?.levelMaxLoadKg, placeholder: "VD: 150" },
            { name: "description", label: "Ghi chú vị trí kệ", type: "textarea", defaultValue: dialog.data?.description, placeholder: "VD: bên trái lối vào, cạnh máy cắt ống" },
          ]}
        />
      )}

      {/* Xác nhận ngừng / dùng lại */}
      {dialog?.kind === "active" && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && close()}
          title={dialog.active ? `Dùng lại ${dialog.label}?` : `Ngừng sử dụng ${dialog.label}?`}
          description={
            dialog.active
              ? "Mục này sẽ hiện lại để cất và lấy hàng."
              : "Mục này sẽ bị ẩn khỏi danh sách chọn vị trí. Chỉ ngừng được khi không còn hàng nằm ở đây. Dữ liệu và lịch sử vẫn được giữ."
          }
          confirmLabel={dialog.active ? "Dùng lại" : "Ngừng sử dụng"}
          destructive={!dialog.active}
          onConfirm={() => setActive({ entity: dialog.entity, id: dialog.id, active: dialog.active })}
        />
      )}
    </div>
  );
}

function ActiveButton({ active, onClick, small }: { active: boolean; onClick: () => void; small?: boolean }) {
  return (
    <Button variant={active ? "ghost" : "outline"} size={small ? "lg" : "xl"} onClick={onClick}>
      {active ? <Ban /> : <RotateCcw />}
      {active ? "Ngừng dùng" : "Dùng lại"}
    </Button>
  );
}
