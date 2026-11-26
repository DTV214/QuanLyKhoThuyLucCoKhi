"use client";

import { Plus, Save, Sparkles, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/common/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { discardUploadedImages, saveProduct } from "../actions";
import { CONNECTION_OPTIONS, MEDIA_OPTIONS, STANDARD_OPTIONS } from "../constants";
import type { ProductDetail, ProductFormOptions } from "../queries";
import type { ProductImage } from "../schemas";
import { ImageUploader } from "./image-uploader";

type State = {
  sku: string;
  partNumber: string;
  name: string;
  originalName: string;
  categoryId: string;
  brandId: string;
  countryId: string;
  materialId: string;
  unitId: string;
  size: string;
  qualityStandard: string;
  connectionA: string;
  connectionB: string;
  tempMin: string;
  tempMax: string;
  pressureMax: string;
  media: string[];
  lengthMm: string;
  widthMm: string;
  heightMm: string;
  weightG: string;
  minStock: string;
  specs: Record<string, string>;
  extraSpecs: { label: string; value: string }[];
  images: ProductImage[];
  description: string;
  note: string;
};

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));

function initialState(p: ProductDetail | null, options: ProductFormOptions): State {
  return {
    sku: s(p?.sku),
    partNumber: s(p?.partNumber),
    name: s(p?.name),
    originalName: s(p?.originalName),
    categoryId: s(p?.categoryId),
    brandId: s(p?.brandId),
    countryId: s(p?.countryId),
    materialId: s(p?.materialId),
    unitId: s(p?.unitId ?? options.units.find((u) => u.code === "cai")?.id),
    size: s(p?.size),
    qualityStandard: s(p?.qualityStandard),
    connectionA: s(p?.connectionA),
    connectionB: s(p?.connectionB),
    tempMin: s(p?.tempMin),
    tempMax: s(p?.tempMax),
    pressureMax: s(p?.pressureMax),
    media: p?.media ?? [],
    lengthMm: s(p?.lengthMm),
    widthMm: s(p?.widthMm),
    heightMm: s(p?.heightMm),
    weightG: s(p?.weightG),
    minStock: s(p?.minStock ?? 0),
    specs: Object.fromEntries(Object.entries(p?.specs ?? {}).map(([k, v]) => [k, String(v)])),
    extraSpecs: p?.extraSpecs ?? [],
    images: p?.images ?? [],
    description: s(p?.description),
    note: s(p?.note),
  };
}

/** "Φ8" → "PHI8", "Inox 316L" → "INOX316L" */
const codePart = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .replace(/[ΦφØø⌀]/g, "PHI")
    .replace(/"/g, "IN")
    .toUpperCase()
    .replace(/[^A-Z0-9./]+/g, "")
    .slice(0, 12);

export function ProductForm({ product, options }: { product: ProductDetail | null; options: ProductFormOptions }) {
  const router = useRouter();
  const [v, setV] = useState<State>(() => initialState(product, options));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [newUploads, setNewUploads] = useState<string[]>([]);
  const [customMedia, setCustomMedia] = useState("");
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof State>(k: K, val: State[K]) => setV((p) => ({ ...p, [k]: val }));

  const category = options.categories.find((c) => c.id === v.categoryId);
  const unit = options.units.find((u) => u.id === v.unitId);
  const mediaChoices = useMemo(() => [...new Set([...MEDIA_OPTIONS, ...v.media])], [v.media]);

  function suggestSku() {
    const mat = options.materials.find((m) => m.id === v.materialId);
    const parts = ["TD", category?.code, mat?.code, codePart(v.connectionA || v.size)].filter(Boolean);
    const sku = parts.join("-").slice(0, 40);
    if (parts.length < 3) toast.info("Chọn loại hàng, vật liệu và cỡ để mã gợi ý đầy đủ hơn");
    set("sku", sku);
  }

  function toggleMedia(m: string) {
    set("media", v.media.includes(m) ? v.media.filter((x) => x !== m) : [...v.media, m]);
  }

  function addCustomMedia() {
    const m = customMedia.trim();
    if (m && !v.media.includes(m)) set("media", [...v.media, m]);
    setCustomMedia("");
  }

  function cancel() {
    const initialIds = new Set((product?.images ?? []).map((i) => i.publicId));
    const orphan = newUploads.filter((id) => !initialIds.has(id));
    if (orphan.length) void discardUploadedImages(orphan);
    router.back();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const res = await saveProduct({
        ...v,
        id: product?.id,
        // Chỉ gửi thông số của loại hàng đang chọn
        specs: Object.fromEntries((category?.specSchema ?? []).map((f) => [f.key, v.specs[f.key] ?? ""])),
      });
      if (!res.ok) {
        setFormError(res.error);
        if (res.fieldErrors) setErrors(Object.fromEntries(Object.entries(res.fieldErrors).map(([k, m]) => [k, m[0]])));
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      toast.success(res.message);
      router.push(`/mat-hang/${res.data.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {formError && (
        <Alert variant="destructive">
          <AlertDescription className="text-base">{formError}</AlertDescription>
        </Alert>
      )}

      {/* 1. Thông tin chính */}
      <Section title="1. Thông tin chính" description="Tên, mã, loại hàng — bắt buộc phải có">
        <FormField label="Tên hàng" value={v.name} onChange={(e) => set("name", e.target.value)} error={errors.name} placeholder="VD: Van một chiều nối nhanh Φ8–Φ8" autoFocus={!product} />
        <Grid>
          <SelectField label="Loại hàng" required value={v.categoryId} onChange={(x) => set("categoryId", x)} error={errors.categoryId}
            options={options.categories.map((c) => ({ value: c.id, label: c.parentId ? `— ${c.name}` : c.name }))} />
          <SelectField label="Đơn vị tính" required value={v.unitId} onChange={(x) => set("unitId", x)} error={errors.unitId}
            options={options.units.map((u) => ({ value: u.id, label: u.name }))} />
        </Grid>
        <div className="space-y-2">
          <Grid>
            <FormField label="Mã mặt hàng (nội bộ)" value={v.sku} onChange={(e) => set("sku", e.target.value)} error={errors.sku}
              placeholder="VD: TD-VALVE-PTFE-PHI8" hint="Chữ không dấu, số, dấu - . / _" className="uppercase placeholder:normal-case" />
            <FormField label="Mã của hãng (không bắt buộc)" value={v.partNumber} onChange={(e) => set("partNumber", e.target.value)} error={errors.partNumber} placeholder="VD: SS-400-6" />
          </Grid>
          <Button type="button" variant="outline" size="lg" onClick={suggestSku}>
            <Sparkles /> Gợi ý mã tự động
          </Button>
        </div>
        <Grid>
          <SelectField label="Thương hiệu" value={v.brandId} onChange={(x) => set("brandId", x)} options={options.brands.map((b) => ({ value: b.id, label: b.name }))} />
          <SelectField label="Xuất xứ (nước sản xuất)" value={v.countryId} onChange={(x) => set("countryId", x)} options={options.countries.map((c) => ({ value: c.id, label: c.name }))} />
          <SelectField label="Vật liệu" value={v.materialId} onChange={(x) => set("materialId", x)} options={options.materials.map((m) => ({ value: m.id, label: m.name }))} />
          <DatalistField label="Tiêu chuẩn chất lượng" value={v.qualityStandard} onChange={(x) => set("qualityStandard", x)} list={STANDARD_OPTIONS} placeholder="VD: Tiêu chuẩn Đức (DIN)" />
        </Grid>
        <FormField label="Tên gốc / tên tiếng Anh (không bắt buộc)" value={v.originalName} onChange={(e) => set("originalName", e.target.value)} placeholder="VD: Check valve push-in 8mm" />
      </Section>

      {/* 2. Thông số kỹ thuật */}
      <Section title="2. Thông số kỹ thuật" description="Bỏ trống ô nào không biết. Dùng cho bộ lọc tìm hàng.">
        <Grid>
          <DatalistField label="Đầu nối 1" value={v.connectionA} onChange={(x) => set("connectionA", x)} list={CONNECTION_OPTIONS} placeholder='VD: Φ8 hoặc 1/4" NPT' error={errors.connectionA} />
          <DatalistField label="Đầu nối 2" value={v.connectionB} onChange={(x) => set("connectionB", x)} list={CONNECTION_OPTIONS} placeholder="Bỏ trống nếu chỉ có 1 đầu" hint="Khác đầu 1 nếu là hàng nối giảm" />
          <FormField label="Cỡ / quy cách khác (không bắt buộc)" value={v.size} onChange={(e) => set("size", e.target.value)} placeholder="VD: DN15, 1/4&quot; x 0.035&quot;" />
          <FormField label="Áp suất tối đa (bar)" inputMode="decimal" value={v.pressureMax} onChange={(e) => set("pressureMax", e.target.value)} error={errors.pressureMax} placeholder="VD: 206" />
        </Grid>
        <div className="space-y-2">
          <Label className="text-base font-medium">Nhiệt độ làm việc (°C)</Label>
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
            <Input inputMode="decimal" aria-label="Nhiệt độ thấp nhất" placeholder="Thấp nhất, vd -190" value={v.tempMin} onChange={(e) => set("tempMin", e.target.value)} className="h-12 rounded-xl px-4 text-base" />
            <span className="pt-3 text-muted-foreground">đến</span>
            <Input inputMode="decimal" aria-label="Nhiệt độ cao nhất" placeholder="Cao nhất, vd 280" value={v.tempMax} onChange={(e) => set("tempMax", e.target.value)} className="h-12 rounded-xl px-4 text-base" />
          </div>
          {(errors.tempMin || errors.tempMax) && <p className="text-sm font-medium text-destructive">{errors.tempMin ?? errors.tempMax}</p>}
        </div>
        <div className="space-y-2">
          <Label className="text-base font-medium">Môi chất sử dụng (bấm để chọn, chọn được nhiều)</Label>
          <div className="flex flex-wrap gap-2">
            {mediaChoices.map((m) => {
              const on = v.media.includes(m);
              return (
                <button key={m} type="button" aria-pressed={on} onClick={() => toggleMedia(m)}
                  className={cn("h-11 rounded-full border px-4 text-base transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted")}>
                  {on && "✓ "}{m}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Input value={customMedia} onChange={(e) => setCustomMedia(e.target.value)} placeholder="Môi chất khác…"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomMedia(); } }}
              className="h-11 max-w-xs rounded-xl px-4 text-base" />
            <Button type="button" variant="outline" size="lg" onClick={addCustomMedia}><Plus /> Thêm</Button>
          </div>
        </div>

        {category && category.specSchema.length > 0 && (
          <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
            <p className="font-semibold">Thông số riêng của loại “{category.name}”</p>
            <Grid>
              {category.specSchema.map((f) => {
                const label = f.unit ? `${f.label} (${f.unit})` : f.label;
                const val = v.specs[f.key] ?? "";
                const onChange = (x: string) => set("specs", { ...v.specs, [f.key]: x });
                return f.type === "select" ? (
                  <SelectField key={f.key} label={label} value={val} onChange={onChange} error={errors[`spec.${f.key}`]}
                    options={(f.options ?? []).map((o) => ({ value: o, label: o }))} />
                ) : (
                  <FormField key={f.key} label={label} value={val} onChange={(e) => onChange(e.target.value)} error={errors[`spec.${f.key}`]}
                    inputMode={f.type === "number" ? "decimal" : undefined} />
                );
              })}
            </Grid>
          </div>
        )}
        <div className="space-y-3">
          <div>
            <Label className="text-base font-medium">Thông số khác (không bắt buộc)</Label>
            <p className="text-sm text-muted-foreground">
              Hàng có thông số không nằm ở các ô trên? Thêm dòng “Tên – Giá trị”, hoặc ghi vào phần Mô tả. Vẫn tìm kiếm được.
            </p>
          </div>
          {v.extraSpecs.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto]">
              <Input aria-label={`Tên thông số ${i + 1}`} placeholder="Tên, vd: Kích thước lục giác" value={row.label}
                onChange={(e) => set("extraSpecs", v.extraSpecs.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)))}
                className="col-span-2 h-12 rounded-xl px-4 text-base sm:col-span-1" />
              <Input aria-label={`Giá trị thông số ${i + 1}`} placeholder="Giá trị, vd: 19 mm" value={row.value}
                onChange={(e) => set("extraSpecs", v.extraSpecs.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))}
                className="h-12 rounded-xl px-4 text-base" />
              <Button type="button" variant="ghost" size="icon-lg" className="size-12 text-destructive" aria-label={`Bỏ dòng ${i + 1}`}
                onClick={() => set("extraSpecs", v.extraSpecs.filter((_, j) => j !== i))}>
                <Trash2 />
              </Button>
            </div>
          ))}
          {errors.extraSpecs && <p className="text-sm font-medium text-destructive">{errors.extraSpecs}</p>}
          {v.extraSpecs.length < 30 && (
            <Button type="button" variant="outline" size="lg" onClick={() => set("extraSpecs", [...v.extraSpecs, { label: "", value: "" }])}>
              <Plus /> Thêm thông số khác
            </Button>
          )}
        </div>
      </Section>

      {/* 3. Kích thước */}
      <Section title="3. Kích thước & khối lượng (1 đơn vị)" description="Giúp cảnh báo khi hàng quá dài / quá nặng so với tầng kệ.">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <FormField label="Dài (mm)" inputMode="decimal" value={v.lengthMm} onChange={(e) => set("lengthMm", e.target.value)} error={errors.lengthMm} placeholder="78" />
          <FormField label="Rộng (mm)" inputMode="decimal" value={v.widthMm} onChange={(e) => set("widthMm", e.target.value)} error={errors.widthMm} placeholder="24" />
          <FormField label="Cao (mm)" inputMode="decimal" value={v.heightMm} onChange={(e) => set("heightMm", e.target.value)} error={errors.heightMm} />
          <FormField label="Nặng (gam)" inputMode="decimal" value={v.weightG} onChange={(e) => set("weightG", e.target.value)} error={errors.weightG} />
        </div>
      </Section>

      {/* 4. Ảnh */}
      <Section title="4. Hình ảnh" description="Ảnh sản phẩm, ảnh nhãn mác, ảnh phiếu thông số…">
        <ImageUploader value={v.images} onChange={(imgs) => set("images", imgs)} onUploaded={(id) => setNewUploads((p) => [...p, id])} />
        {errors.images && <p className="text-sm font-medium text-destructive">{errors.images}</p>}
      </Section>

      {/* 5. Mô tả */}
      <Section title="5. Mô tả & quản lý kho">
        <div className="space-y-2">
          <Label htmlFor="desc" className="text-base font-medium">Mô tả chi tiết (không bắt buộc)</Label>
          <Textarea id="desc" value={v.description} onChange={(e) => set("description", e.target.value)} className="min-h-32 rounded-xl px-4 py-3 text-base"
            placeholder={"VD:\n- Loại van: van một chiều kiểu nối nhanh\n- Kích thước đai ốc lục giác: 19 mm"} />
        </div>
        <Grid>
          <FormField label={`Tồn tối thiểu${unit ? ` (${unit.name.toLowerCase()})` : ""}`} inputMode="decimal" value={v.minStock} onChange={(e) => set("minStock", e.target.value)}
            error={errors.minStock} hint="Còn ít hơn hoặc bằng số này sẽ báo 'sắp hết'. Để 0 nếu không cần." />
          <FormField label="Ghi chú nội bộ (không bắt buộc)" value={v.note} onChange={(e) => set("note", e.target.value)} />
        </Grid>
      </Section>

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-4 flex gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:bottom-0">
        <Button type="button" variant="outline" size="xl" onClick={cancel} disabled={pending}>
          <X /> Huỷ
        </Button>
        <Button type="submit" size="xl" className="flex-1 sm:flex-none" disabled={pending}>
          <Save /> {pending ? "Đang lưu…" : product ? "Lưu thay đổi" : "Lưu mặt hàng"}
        </Button>
        {product && (
          <Link href={`/mat-hang/${product.id}`} className="hidden self-center text-muted-foreground underline sm:block">
            Xem trang mặt hàng
          </Link>
        )}
      </div>
    </form>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        {description && <CardDescription className="text-base">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

const Grid = ({ children }: { children: React.ReactNode }) => <div className="grid gap-5 md:grid-cols-2">{children}</div>;

function SelectField({ label, value, onChange, options, required, error }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  error?: string;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-base font-medium">{label}{!required && " (không bắt buộc)"}</Label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={Boolean(error)}
        className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive">
        <option value="">{required ? "— Chọn —" : "— Không chọn —"}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}

function DatalistField({ label, value, onChange, list, placeholder, hint, error }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  list: readonly string[];
  placeholder?: string;
  hint?: string;
  error?: string;
}) {
  const listId = useId();
  return (
    <>
      <FormField label={`${label} (không bắt buộc)`} value={value} onChange={(e) => onChange(e.target.value)} list={listId} placeholder={placeholder} hint={hint} error={error} />
      <datalist id={listId}>{list.map((x) => <option key={x} value={x} />)}</datalist>
    </>
  );
}
