import { z } from "zod";

export const MOVEMENT_TYPES = ["IN", "OUT", "TRANSFER", "ADJUST", "REVERSAL"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const TYPE_LABEL: Record<MovementType, string> = {
  IN: "Nhập",
  OUT: "Lấy",
  TRANSFER: "Chuyển",
  ADJUST: "Kiểm kê",
  REVERSAL: "Huỷ thao tác",
};

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .catch(undefined);

/** Bộ lọc trang Lịch sử (đọc từ URL) */
export const historyFiltersSchema = z.object({
  tu: isoDate,
  den: isoDate,
  loai: z.enum(MOVEMENT_TYPES).optional().catch(undefined),
  sp: z.uuid().optional().catch(undefined),
  q: z.string().trim().max(100).optional().catch(undefined),
  nguoi: z.uuid().optional().catch(undefined),
  so: z.coerce.number().int().min(50).max(500).optional().catch(undefined),
});
export type HistoryFilters = z.infer<typeof historyFiltersSchema>;

export const reverseSchema = z.object({
  id: z.coerce.number().int().positive(),
  reason: z.string().trim().min(3, "Vui lòng ghi lý do huỷ (ít nhất 3 ký tự)").max(200),
});
