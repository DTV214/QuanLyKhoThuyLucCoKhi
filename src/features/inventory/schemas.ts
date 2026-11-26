import { z } from "zod";

const id = (msg: string) => z.uuid({ error: msg });

/** Số lượng > 0, nhận cả "2,5" */
export const quantity = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === "number" ? v : Number(String(v).replace(",", "."))))
  .refine((n) => Number.isFinite(n) && n > 0, "Số lượng phải lớn hơn 0")
  .refine((n) => n <= 10_000_000, "Số lượng quá lớn");

/** Ngày dạng YYYY-MM-DD, bỏ trống = hôm nay (database kiểm tra không ở tương lai) */
const optDate = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Ngày không hợp lệ");

const optNote = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Tối đa ${max} ký tự`)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const takeStockSchema = z.object({
  productId: id("Thiếu mặt hàng"),
  locationId: id("Thiếu vị trí"),
  quantity,
  date: optDate,
  note: optNote(200),
});

export const transferSchema = z
  .object({
    productId: id("Thiếu mặt hàng"),
    fromLocationId: id("Thiếu vị trí đi"),
    toLocationId: id("Vui lòng chọn vị trí đến"),
    quantity,
    date: optDate,
    note: optNote(200),
  })
  .refine((v) => v.fromLocationId !== v.toLocationId, { path: ["toLocationId"], message: "Vị trí đến phải khác vị trí đi" });

export const adjustSchema = z.object({
  productId: id("Thiếu mặt hàng"),
  locationId: id("Vui lòng chọn vị trí"),
  counted: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === "number" ? v : Number(String(v).replace(",", "."))))
    .refine((n) => Number.isFinite(n) && n >= 0, "Số đếm phải từ 0 trở lên"),
  reason: z.string().trim().min(3, "Vui lòng ghi lý do (ít nhất 3 ký tự)").max(200),
});

export const receiptLineSchema = z.object({
  productId: id("Chưa chọn mặt hàng"),
  locationId: id("Chưa chọn vị trí cất"),
  quantity,
  note: optNote(200),
});

export const receiptSchema = z.object({
  date: optDate,
  supplierId: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? v : null))
    .pipe(z.uuid().nullable()),
  referenceNo: optNote(60),
  note: optNote(500),
  lines: z.array(receiptLineSchema).min(1, "Phiếu phải có ít nhất 1 dòng hàng").max(100, "Tối đa 100 dòng"),
});

export const quickSearchSchema = z.string().trim().min(1).max(100);
