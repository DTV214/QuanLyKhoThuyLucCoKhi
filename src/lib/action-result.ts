import { z } from "zod";

/** Kết quả chuẩn của mọi Server Action — không throw lỗi ra client */
export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export const ok = <T>(data: T, message?: string): ActionResult<T> => ({ ok: true, data, message });

export const fail = (error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> => ({
  ok: false,
  error,
  fieldErrors,
});

export function fromZodError(error: z.ZodError): ActionResult<never> {
  return fail("Thông tin nhập chưa đúng, vui lòng kiểm tra lại", z.flattenError(error).fieldErrors as Record<string, string[]>);
}

type DbError = { code?: string; message?: string } | null | undefined;

/** Đổi lỗi Postgres/Supabase sang câu tiếng Việt dễ hiểu */
export function mapDbError(error: DbError): string {
  if (!error) return "Có lỗi xảy ra, vui lòng thử lại";
  switch (error.code) {
    // Lỗi do RPC tự raise đã là tiếng Việt → giữ nguyên
    case "P0001":
    case "P0002":
    case "22023":
      return error.message ?? "Dữ liệu không hợp lệ";
    case "42501":
      return error.message?.match(/[À-ỹ]/) ? error.message : "Bạn không có quyền thực hiện thao tác này";
    case "23505":
      return "Dữ liệu bị trùng (mã đã tồn tại)";
    case "23503":
      return "Dữ liệu đang được sử dụng ở nơi khác, không thể thực hiện";
    case "23514":
      return "Giá trị không hợp lệ";
    default:
      return "Có lỗi xảy ra, vui lòng thử lại";
  }
}
