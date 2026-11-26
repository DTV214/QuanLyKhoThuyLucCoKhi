export type LocationNode = {
  id: string;
  level: number;
  bin: number | null;
  code: string;
  isActive: boolean;
  productCount: number;
};

export type RackNode = {
  id: string;
  code: string;
  /** K1-A-03 */
  fullCode: string;
  name: string | null;
  levels: number;
  description: string | null;
  isActive: boolean;
  locations: LocationNode[];
  productCount: number;
};

export type ZoneNode = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  racks: RackNode[];
};

export type WarehouseNode = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  description: string | null;
  isActive: boolean;
  zones: ZoneNode[];
};
