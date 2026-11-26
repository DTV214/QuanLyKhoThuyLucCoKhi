/** Mặt hàng rút gọn cho ô chọn hàng / tìm nhanh */
export type QuickProduct = {
  id: string;
  sku: string;
  name: string;
  imageUrl: string | null;
  unitName: string;
  allowDecimal: boolean;
  totalQuantity: number;
  locations: { id: string; code: string; quantity: number }[];
};

/** Một vị trí (tầng kệ) đang dùng được, có đường dẫn dễ đọc */
export type LocationOption = {
  id: string;
  code: string;
  /** "Kho 1 – Trong nhà › Khu A › Kệ 01 › Tầng 2" */
  path: string;
  /** Nhóm hiển thị: "Kho 1 – Trong nhà · Khu A – Fitting" */
  group: string;
};

export type StockRow = {
  location_id: string;
  code: string;
  warehouse: string;
  zone: string;
  rack: string;
  level: number;
  quantity: number;
};

export type ProductLite = {
  id: string;
  name: string;
  sku: string;
  unitName: string;
  allowDecimal: boolean;
};
