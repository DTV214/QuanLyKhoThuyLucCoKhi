import { z } from "zod";

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Tối đa ${max} ký tự`)
    .optional()
    .transform((v) => (v ? v : null));

/** Mã kho/khu/kệ: 1–6 chữ in hoa hoặc số, vd K1, A, 03 */
const code = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{1,6}$/, "Mã gồm 1–6 chữ cái không dấu hoặc số, không khoảng trắng");

const name = z.string().trim().min(1, "Vui lòng nhập tên").max(100, "Tối đa 100 ký tự");
const optId = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(z.uuid().optional());

export const warehouseSchema = z.object({
  id: optId,
  code,
  name,
  address: optText(200),
  description: optText(500),
});

export const zoneSchema = z.object({
  id: optId,
  warehouseId: z.uuid({ error: "Vui lòng chọn kho" }),
  code,
  name,
  description: optText(500),
});

/** Ô số không bắt buộc, > 0 */
const optPositive = (label: string) =>
  z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((v) => (v === null || v === undefined || v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isFinite(v) && v > 0 && v < 1_000_000), `${label} phải là số lớn hơn 0`);

export const rackSchema = z.object({
  id: optId,
  zoneId: z.uuid({ error: "Vui lòng chọn khu vực" }),
  code,
  name: optText(100),
  levels: z.coerce
    .number({ error: "Nhập số tầng" })
    .int("Số tầng phải là số nguyên")
    .min(1, "Ít nhất 1 tầng")
    .max(20, "Tối đa 20 tầng"),
  description: optText(500),
  levelWidthMm: optPositive("Chiều ngang tầng"),
  levelDepthMm: optPositive("Chiều sâu tầng"),
  levelHeightMm: optPositive("Chiều cao tầng"),
  levelMaxLoadKg: optPositive("Tải trọng"),
});

export const setActiveSchema = z.object({
  entity: z.enum(["warehouses", "zones", "racks"]),
  id: z.uuid(),
  active: z.boolean(),
});
