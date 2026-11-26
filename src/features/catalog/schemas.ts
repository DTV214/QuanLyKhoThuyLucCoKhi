import { z } from "zod";

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Tối đa ${max} ký tự`)
    .optional()
    .transform((v) => (v ? v : null));
const name = (max = 100) => z.string().trim().min(1, "Vui lòng nhập tên").max(max, `Tối đa ${max} ký tự`);
const optId = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(z.uuid().optional());

/** Các bảng danh mục đơn giản và luật nhập của từng bảng */
export const LOOKUP_SCHEMAS = {
  brands: z.object({ id: optId, name: name(), website: optText(200) }),
  materials: z.object({
    id: optId,
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_]{1,12}$/, "Mã 1–12 ký tự: chữ không dấu, số, dấu _ (vd SS316L)"),
    name: name(),
    description: optText(300),
  }),
  countries: z.object({
    id: optId,
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, "Mã quốc gia gồm 2 chữ cái (vd US, KR, JP)"),
    name: name(),
  }),
  units: z.object({
    id: optId,
    code: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_]{1,10}$/, "Mã 1–10 ký tự không dấu (vd cai, bo, m)"),
    name: name(50),
    allow_decimal: z.enum(["true", "false"]).transform((v) => v === "true"),
  }),
  suppliers: z.object({
    id: optId,
    name: name(200),
    phone: optText(30),
    address: optText(300),
  }),
} as const;

export type LookupTable = keyof typeof LOOKUP_SCHEMAS;
export const LOOKUP_TABLES = Object.keys(LOOKUP_SCHEMAS) as LookupTable[];

// ---------- Loại hàng + thông số riêng ----------
export const SPEC_TYPES = ["text", "number", "select"] as const;

export const specFieldSchema = z
  .object({
    key: z
      .string()
      .trim()
      .regex(/^[a-z][a-z0-9_]{0,29}$/, "Khoá thông số không hợp lệ"),
    label: z.string().trim().min(1, "Thông số phải có tên").max(60),
    type: z.enum(SPEC_TYPES),
    unit: z
      .string()
      .trim()
      .max(20)
      .optional()
      .transform((v) => v || undefined),
    options: z.array(z.string().trim().min(1).max(60)).max(50).optional(),
  })
  .refine((f) => f.type !== "select" || (f.options?.length ?? 0) >= 2, {
    message: "Thông số dạng chọn cần ít nhất 2 lựa chọn",
    path: ["options"],
  });

export type SpecField = z.infer<typeof specFieldSchema>;

export const categorySchema = z.object({
  id: optId,
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_]{2,20}$/, "Mã 2–20 ký tự: chữ không dấu, số, dấu _ (vd VALVE)"),
  name: name(),
  parentId: optId,
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  specSchema: z
    .array(specFieldSchema)
    .max(30)
    .refine((arr) => new Set(arr.map((f) => f.key)).size === arr.length, "Hai thông số bị trùng tên"),
});

export const deleteSchema = z.object({
  table: z.enum(["brands", "materials", "countries", "units", "suppliers", "categories"]),
  id: z.uuid(),
});
