import { z } from "zod";
import { MAX_IMAGES } from "./constants";

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Tối đa ${max} ký tự`)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const optId = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .pipe(z.uuid().nullable());

/** Ô số không bắt buộc: "" → null, "2,5" → 2.5 */
const optNum = (opts: { min?: number; max?: number; positive?: boolean; label: string }) =>
  z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((v, ctx) => {
      if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) return null;
      const n = typeof v === "number" ? v : Number(v.replace(",", "."));
      if (!Number.isFinite(n)) {
        ctx.addIssue({ code: "custom", message: `${opts.label} phải là số` });
        return z.NEVER;
      }
      if (opts.positive && n <= 0) {
        ctx.addIssue({ code: "custom", message: `${opts.label} phải lớn hơn 0` });
        return z.NEVER;
      }
      if (opts.min !== undefined && n < opts.min) {
        ctx.addIssue({ code: "custom", message: `${opts.label} không nhỏ hơn ${opts.min}` });
        return z.NEVER;
      }
      if (opts.max !== undefined && n > opts.max) {
        ctx.addIssue({ code: "custom", message: `${opts.label} không lớn hơn ${opts.max}` });
        return z.NEVER;
      }
      return n;
    });

export const productImageSchema = z.object({
  url: z.url().refine((u) => u.startsWith("https://res.cloudinary.com/"), "Ảnh phải tải lên qua hệ thống"),
  publicId: z.string().min(1).max(300),
});
export type ProductImage = z.infer<typeof productImageSchema>;

export const productSchema = z
  .object({
    id: optId,
    sku: z
      .string()
      .trim()
      .min(2, "Mã mặt hàng tối thiểu 2 ký tự")
      .max(40, "Mã mặt hàng tối đa 40 ký tự")
      .regex(/^[A-Za-z0-9./_-]+$/, "Mã chỉ gồm chữ không dấu, số và các ký tự . / _ -"),
    partNumber: optText(60),
    name: z.string().trim().min(2, "Tên hàng tối thiểu 2 ký tự").max(200, "Tên hàng tối đa 200 ký tự"),
    originalName: optText(200),
    categoryId: z.uuid({ error: "Vui lòng chọn loại hàng" }),
    brandId: optId,
    countryId: optId,
    materialId: optId,
    unitId: z.uuid({ error: "Vui lòng chọn đơn vị tính" }),
    size: optText(40),
    qualityStandard: optText(100),
    connectionA: optText(40),
    connectionB: optText(40),
    tempMin: optNum({ label: "Nhiệt độ thấp nhất", min: -273, max: 2000 }),
    tempMax: optNum({ label: "Nhiệt độ cao nhất", min: -273, max: 2000 }),
    pressureMax: optNum({ label: "Áp suất", positive: true, max: 100000 }),
    media: z.array(z.string().trim().min(1).max(40)).max(20, "Tối đa 20 môi chất").default([]),
    lengthMm: optNum({ label: "Chiều dài", positive: true, max: 100000 }),
    widthMm: optNum({ label: "Chiều rộng", positive: true, max: 100000 }),
    heightMm: optNum({ label: "Chiều cao", positive: true, max: 100000 }),
    weightG: optNum({ label: "Khối lượng", positive: true, max: 10000000 }),
    minStock: optNum({ label: "Tồn tối thiểu", min: 0, max: 10000000 }).transform((v) => v ?? 0),
    specs: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
    images: z.array(productImageSchema).max(MAX_IMAGES, `Tối đa ${MAX_IMAGES} ảnh`).default([]),
    description: optText(4000),
    note: optText(1000),
  })
  .refine((v) => v.tempMin === null || v.tempMax === null || v.tempMin <= v.tempMax, {
    path: ["tempMax"],
    message: "Nhiệt độ cao nhất phải lớn hơn hoặc bằng nhiệt độ thấp nhất",
  });

export type ProductInput = z.input<typeof productSchema>;
export type ProductValues = z.output<typeof productSchema>;

export const setProductActiveSchema = z.object({ id: z.uuid(), active: z.boolean() });

/** Bộ lọc trang Tìm hàng (đọc từ URL) */
export const searchFiltersSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  kho: z.uuid().optional().catch(undefined),
  loai: z.uuid().optional().catch(undefined),
  hang: z.uuid().optional().catch(undefined),
  vatlieu: z.uuid().optional().catch(undefined),
  xuatxu: z.uuid().optional().catch(undefined),
  moichat: z.string().trim().max(40).optional().catch(undefined),
  nhietdo: z.coerce.number().min(-273).max(2000).optional().catch(undefined),
  daunoi: z.string().trim().max(40).optional().catch(undefined),
  conhang: z.enum(["1"]).optional().catch(undefined),
  saphet: z.enum(["1"]).optional().catch(undefined),
  so: z.coerce.number().int().min(30).max(100).optional().catch(undefined),
});
export type SearchFilters = z.infer<typeof searchFiltersSchema>;
