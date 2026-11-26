"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { FormDialog, type FieldDef } from "@/components/common/form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SCROLL_ROW } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import { deleteCatalogItem, saveCategory, saveLookup } from "../actions";
import type { Catalog, CatalogRow, CategoryRow } from "../queries";
import type { LookupTable } from "../schemas";
import { fromDraft, SpecEditor, toDraft, type SpecDraft } from "./spec-editor";

type TabKey = "categories" | LookupTable;

type Column = { key: string; label: string; render?: (row: CatalogRow) => React.ReactNode };

/** Cấu hình hiển thị + form của từng danh mục đơn giản */
const LOOKUPS: Record<LookupTable, { label: string; singular: string; columns: Column[]; fields: (r?: CatalogRow) => FieldDef[] }> = {
  brands: {
    label: "Thương hiệu",
    singular: "thương hiệu",
    columns: [
      { key: "name", label: "Tên" },
      { key: "website", label: "Website" },
    ],
    fields: (r) => [
      { name: "name", label: "Tên thương hiệu", required: true, defaultValue: r?.name as string, placeholder: "VD: Swagelok" },
      { name: "website", label: "Website", defaultValue: r?.website as string },
    ],
  },
  materials: {
    label: "Vật liệu",
    singular: "vật liệu",
    columns: [
      { key: "code", label: "Mã" },
      { key: "name", label: "Tên" },
      { key: "description", label: "Ghi chú" },
    ],
    fields: (r) => [
      { name: "code", label: "Mã", required: true, uppercase: true, defaultValue: r?.code as string, placeholder: "VD: SS316L" },
      { name: "name", label: "Tên vật liệu", required: true, defaultValue: r?.name as string, placeholder: "VD: Inox 316L" },
      { name: "description", label: "Ghi chú", type: "textarea", defaultValue: r?.description as string },
    ],
  },
  countries: {
    label: "Xuất xứ",
    singular: "nước",
    columns: [
      { key: "code", label: "Mã" },
      { key: "name", label: "Tên nước" },
    ],
    fields: (r) => [
      { name: "code", label: "Mã nước (2 chữ)", required: true, uppercase: true, defaultValue: r?.code as string, placeholder: "VD: US, KR, JP" },
      { name: "name", label: "Tên nước", required: true, defaultValue: r?.name as string, placeholder: "VD: Mỹ" },
    ],
  },
  units: {
    label: "Đơn vị tính",
    singular: "đơn vị",
    columns: [
      { key: "code", label: "Mã" },
      { key: "name", label: "Tên" },
      { key: "allow_decimal", label: "Số lẻ", render: (r) => (r.allow_decimal ? "Cho phép (vd 2,5 mét)" : "Chỉ số nguyên") },
    ],
    fields: (r) => [
      { name: "code", label: "Mã", required: true, defaultValue: r?.code as string, placeholder: "VD: cai, bo, m" },
      { name: "name", label: "Tên đơn vị", required: true, defaultValue: r?.name as string, placeholder: "VD: Cái" },
      {
        name: "allow_decimal",
        label: "Cho nhập số lẻ?",
        type: "select",
        required: true,
        defaultValue: r?.allow_decimal ? "true" : "false",
        options: [
          { value: "false", label: "Không — chỉ số nguyên (cái, bộ, cây)" },
          { value: "true", label: "Có — được nhập số lẻ (mét, kg)" },
        ],
      },
    ],
  },
  suppliers: {
    label: "Nhà cung cấp",
    singular: "nhà cung cấp",
    columns: [
      { key: "name", label: "Tên" },
      { key: "phone", label: "Điện thoại" },
      { key: "address", label: "Địa chỉ" },
    ],
    fields: (r) => [
      { name: "name", label: "Tên nhà cung cấp", required: true, defaultValue: r?.name as string },
      { name: "phone", label: "Điện thoại", defaultValue: r?.phone as string },
      { name: "address", label: "Địa chỉ", type: "textarea", defaultValue: r?.address as string },
    ],
  },
};

const TABS: { key: TabKey; label: string }[] = [
  { key: "categories", label: "Loại hàng" },
  ...(Object.keys(LOOKUPS) as LookupTable[]).map((k) => ({ key: k, label: LOOKUPS[k].label })),
];

type Dialog =
  | { kind: "lookup"; table: LookupTable; row?: CatalogRow }
  | { kind: "category"; row?: CategoryRow }
  | { kind: "delete"; table: TabKey; id: string; name: string }
  | null;

export function CatalogView({ catalog, canDelete }: { catalog: Catalog; canDelete: boolean }) {
  const [tab, setTab] = useState<TabKey>("categories");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [specs, setSpecs] = useState<SpecDraft[]>([]);
  const close = () => setDialog(null);

  const openCategory = (row?: CategoryRow) => {
    setSpecs((row?.specSchema ?? []).map(toDraft));
    setDialog({ kind: "category", row });
  };

  const usageText = (n: number) => (n ? `${n} đang dùng` : "Chưa dùng");
  const catName = new Map(catalog.categories.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-5">
      <div className={SCROLL_ROW} role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "h-12 shrink-0 rounded-xl border px-5 text-base font-medium whitespace-nowrap transition-colors",
              tab === t.key ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
            )}
          >
            {t.label}
            <span className="ml-2 opacity-70">{catalog[t.key].length}</span>
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          size="xl"
          className="w-full sm:w-auto"
          onClick={() => (tab === "categories" ? openCategory() : setDialog({ kind: "lookup", table: tab }))}
        >
          <Plus /> Thêm {tab === "categories" ? "loại hàng" : LOOKUPS[tab].singular}
        </Button>
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border bg-background md:block">
        <Table className="text-base">
          {tab === "categories" ? (
            <>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="h-12 pl-5">Mã</TableHead>
                  <TableHead>Tên loại hàng</TableHead>
                  <TableHead>Thuộc loại</TableHead>
                  <TableHead>Thông số riêng</TableHead>
                  <TableHead>Sử dụng</TableHead>
                  <TableHead className="pr-5 text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catalog.categories.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="pl-5 font-mono">{c.code}</TableCell>
                    <TableCell className="font-semibold">{c.name}</TableCell>
                    <TableCell>{c.parentId ? catName.get(c.parentId) : "—"}</TableCell>
                    <TableCell className="max-w-md whitespace-normal">
                      <div className="flex flex-wrap gap-1">
                        {c.specSchema.length === 0 && <span className="text-muted-foreground">—</span>}
                        {c.specSchema.map((s) => (
                          <Badge key={s.key} variant="secondary" className="text-sm">
                            {s.label}
                            {s.unit ? ` (${s.unit})` : ""}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{usageText(c.usage)}</TableCell>
                    <TableCell className="pr-5">
                      <RowButtons
                        onEdit={() => openCategory(c)}
                        onDelete={canDelete && !c.usage ? () => setDialog({ kind: "delete", table: "categories", id: c.id, name: c.name }) : undefined}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          ) : (
            <>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {LOOKUPS[tab].columns.map((col, i) => (
                    <TableHead key={col.key} className={cn("h-12", i === 0 && "pl-5")}>
                      {col.label}
                    </TableHead>
                  ))}
                  <TableHead>Sử dụng</TableHead>
                  <TableHead className="pr-5 text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catalog[tab].map((row) => (
                  <TableRow key={row.id}>
                    {LOOKUPS[tab].columns.map((col, i) => (
                      <TableCell key={col.key} className={cn(i === 0 && "pl-5 font-semibold", "whitespace-normal")}>
                        {col.render ? col.render(row) : ((row[col.key] as string) ?? "—")}
                      </TableCell>
                    ))}
                    <TableCell className="text-muted-foreground">{usageText(row.usage)}</TableCell>
                    <TableCell className="pr-5">
                      <RowButtons
                        onEdit={() => setDialog({ kind: "lookup", table: tab, row })}
                        onDelete={
                          canDelete && !row.usage
                            ? () => setDialog({ kind: "delete", table: tab, id: row.id, name: String(row.name) })
                            : undefined
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          )}
        </Table>
        {catalog[tab].length === 0 && <p className="p-10 text-center text-lg text-muted-foreground">Chưa có dữ liệu.</p>}
      </div>

      {/* Điện thoại / máy tính bảng nhỏ: dạng thẻ */}
      <ul className="space-y-3 md:hidden">
        {catalog[tab].length === 0 && (
          <li className="rounded-2xl border bg-background p-8 text-center text-lg text-muted-foreground">Chưa có dữ liệu.</li>
        )}
        {tab === "categories"
          ? catalog.categories.map((c) => (
              <li key={c.id} className="space-y-3 rounded-2xl border bg-background p-4">
                <div>
                  <div className="text-lg font-semibold">{c.name}</div>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-mono">{c.code}</span>
                    {c.parentId && ` · thuộc ${catName.get(c.parentId)}`} · {usageText(c.usage)}
                  </div>
                </div>
                {c.specSchema.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {c.specSchema.map((s) => (
                      <Badge key={s.key} variant="secondary" className="text-sm">
                        {s.label}
                        {s.unit ? ` (${s.unit})` : ""}
                      </Badge>
                    ))}
                  </div>
                )}
                <RowButtons
                  stretch
                  onEdit={() => openCategory(c)}
                  onDelete={canDelete && !c.usage ? () => setDialog({ kind: "delete", table: "categories", id: c.id, name: c.name }) : undefined}
                />
              </li>
            ))
          : catalog[tab].map((row) => {
              const [first, ...rest] = LOOKUPS[tab].columns;
              return (
                <li key={row.id} className="space-y-3 rounded-2xl border bg-background p-4">
                  <div className="text-lg font-semibold">{(row[first.key] as string) ?? "—"}</div>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-base">
                    {rest.map((col) => (
                      <div key={col.key} className="contents">
                        <dt className="text-muted-foreground">{col.label}</dt>
                        <dd className="break-words">{col.render ? col.render(row) : ((row[col.key] as string) ?? "—")}</dd>
                      </div>
                    ))}
                    <dt className="text-muted-foreground">Sử dụng</dt>
                    <dd>{usageText(row.usage)}</dd>
                  </dl>
                  <RowButtons
                    stretch
                    onEdit={() => setDialog({ kind: "lookup", table: tab, row })}
                    onDelete={
                      canDelete && !row.usage
                        ? () => setDialog({ kind: "delete", table: tab, id: row.id, name: String(row.name) })
                        : undefined
                    }
                  />
                </li>
              );
            })}
      </ul>

      {dialog?.kind === "lookup" && (
        <FormDialog
          open
          onOpenChange={(o) => !o && close()}
          title={`${dialog.row ? "Sửa" : "Thêm"} ${LOOKUPS[dialog.table].singular}`}
          hidden={{ id: dialog.row?.id }}
          fields={LOOKUPS[dialog.table].fields(dialog.row)}
          onSubmit={(v) => saveLookup(dialog.table, v)}
        />
      )}

      {dialog?.kind === "category" && (
        <FormDialog
          open
          wide
          onOpenChange={(o) => !o && close()}
          title={dialog.row ? `Sửa loại hàng: ${dialog.row.name}` : "Thêm loại hàng"}
          hidden={{ id: dialog.row?.id }}
          extraValues={() => ({ specSchema: specs.filter((s) => s.label.trim()).map(fromDraft) })}
          onSubmit={saveCategory}
          fields={[
            { name: "code", label: "Mã", required: true, uppercase: true, defaultValue: dialog.row?.code, placeholder: "VD: VALVE_BALL" },
            { name: "name", label: "Tên loại hàng", required: true, defaultValue: dialog.row?.name, placeholder: "VD: Van bi" },
            {
              name: "parentId",
              label: "Thuộc loại (loại cha)",
              type: "select",
              defaultValue: dialog.row?.parentId ?? "",
              options: catalog.categories
                .filter((c) => c.id !== dialog.row?.id && !c.parentId)
                .map((c) => ({ value: c.id, label: c.name })),
            },
            { name: "sortOrder", label: "Thứ tự hiển thị", type: "number", min: 0, defaultValue: dialog.row?.sortOrder ?? 0, hint: "Số nhỏ hiện trước" },
          ]}
        >
          <SpecEditor value={specs} onChange={setSpecs} />
        </FormDialog>
      )}

      {dialog?.kind === "delete" && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && close()}
          title={`Xoá "${dialog.name}"?`}
          description="Xoá vĩnh viễn, không khôi phục được. Chỉ xoá được khi chưa có mặt hàng nào dùng mục này."
          confirmLabel="Xoá vĩnh viễn"
          destructive
          onConfirm={() => deleteCatalogItem({ table: dialog.table, id: dialog.id })}
        />
      )}
    </div>
  );
}

function RowButtons({ onEdit, onDelete, stretch }: { onEdit: () => void; onDelete?: () => void; stretch?: boolean }) {
  return (
    <div className={cn("flex gap-2", stretch ? "[&>button]:flex-1" : "justify-end")}>
      <Button variant="outline" size="lg" onClick={onEdit}>
        <Pencil /> Sửa
      </Button>
      {onDelete && (
        <Button variant="ghost" size="lg" className="text-destructive" onClick={onDelete}>
          <Trash2 /> Xoá
        </Button>
      )}
    </div>
  );
}
