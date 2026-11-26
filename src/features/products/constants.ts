/** Gợi ý nhập nhanh — vẫn cho gõ giá trị khác */

export const MEDIA_OPTIONS = [
  "Nước",
  "Khí nén",
  "Dầu thuỷ lực",
  "Hơi nóng",
  "Gas / LPG",
  "Nhiên liệu",
  "Axit",
  "Kiềm",
  "Hoá chất ăn mòn",
  "Thực phẩm",
  "Chân không",
] as const;

export const STANDARD_OPTIONS = [
  "Tiêu chuẩn Đức (DIN)",
  "Tiêu chuẩn Nhật (JIS)",
  "Tiêu chuẩn Mỹ (ANSI / ASME)",
  "Tiêu chuẩn Anh (BS)",
  "ISO",
  "Tiêu chuẩn Hàn Quốc (KS)",
] as const;

export const CONNECTION_OPTIONS = [
  "Φ4", "Φ6", "Φ8", "Φ10", "Φ12", "Φ14", "Φ16", "Φ20", "Φ25",
  '1/8"', '1/4"', '3/8"', '1/2"', '3/4"', '1"',
  '1/4" NPT', '1/2" NPT', '1/4" BSPP', '1/2" BSPP', "M10x1", "M12x1.5",
] as const;

export const MAX_IMAGES = 8;
