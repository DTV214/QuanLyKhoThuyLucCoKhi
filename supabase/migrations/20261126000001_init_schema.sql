-- =====================================================================
-- Kho Công ty Thành Danh VMC — Schema khởi tạo
-- Bảng, ràng buộc, chỉ mục, tìm kiếm không dấu.
-- =====================================================================

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm  with schema extensions;

-- unaccent() không IMMUTABLE nên bọc lại để dùng trong index/trigger
create or replace function public.f_unaccent(text)
returns text
language sql immutable parallel safe strict
set search_path = public, extensions
as $$ select lower(extensions.unaccent('extensions.unaccent'::regdictionary, $1)) $$;

-- ---------------------------------------------------------------------
-- Kiểu dữ liệu
-- ---------------------------------------------------------------------
create type public.user_role     as enum ('owner', 'admin', 'staff');
create type public.user_status   as enum ('active', 'locked');
create type public.movement_type as enum ('IN', 'OUT', 'TRANSFER', 'ADJUST', 'REVERSAL');
create type public.document_type as enum ('RECEIPT', 'ISSUE', 'TRANSFER', 'ADJUSTMENT');

-- ---------------------------------------------------------------------
-- Người dùng
-- ---------------------------------------------------------------------
create table public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  email                 text not null unique,
  full_name             text not null check (char_length(full_name) between 2 and 100),
  phone                 text check (phone ~ '^[0-9+ ]{8,15}$'),
  role                  public.user_role   not null default 'staff',
  status                public.user_status not null default 'active',
  must_change_password  boolean not null default true,
  created_by            uuid references public.profiles(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Chỉ được có đúng 1 ông chủ
create unique index profiles_single_owner on public.profiles ((role)) where role = 'owner';

-- ---------------------------------------------------------------------
-- Vị trí: Kho → Khu vực → Kệ → Tầng/Ô (locations)
-- ---------------------------------------------------------------------
create table public.warehouses (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (code ~ '^[A-Z0-9]{1,6}$'),   -- K1, K2
  name        text not null,                                           -- Kho 1 – Trong nhà
  address     text,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.zones (
  id           uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  code         text not null check (code ~ '^[A-Z0-9]{1,6}$'),         -- A, B, ONG
  name         text not null,                                          -- Khu ống
  description  text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (warehouse_id, code)
);

create table public.racks (
  id          uuid primary key default gen_random_uuid(),
  zone_id     uuid not null references public.zones(id) on delete restrict,
  code        text not null check (code ~ '^[A-Z0-9]{1,6}$'),          -- 01, 02
  name        text,
  levels      smallint not null default 4 check (levels between 1 and 20),
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (zone_id, code)
);

-- Ô chứa hàng thực tế = (kệ, tầng, ô). Mã: K1-A-03-T2 hoặc K1-A-03-T2-O4
create table public.locations (
  id          uuid primary key default gen_random_uuid(),
  rack_id     uuid not null references public.racks(id) on delete restrict,
  level       smallint not null check (level between 1 and 20),
  bin         smallint check (bin between 1 and 99),
  code        text not null unique,
  note        text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create unique index locations_rack_level_bin on public.locations (rack_id, level, coalesce(bin, 0));

-- ---------------------------------------------------------------------
-- Danh mục tra cứu
-- ---------------------------------------------------------------------
create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  parent_id    uuid references public.categories(id) on delete restrict,
  code         text not null unique check (code ~ '^[A-Z0-9_]{2,20}$'),
  name         text not null,
  -- Định nghĩa thông số riêng: [{ "key":"od", "label":"Đường kính ngoài", "type":"text|number|select", "unit":"mm", "options":[...] }]
  spec_schema  jsonb not null default '[]'::jsonb check (jsonb_typeof(spec_schema) = 'array'),
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

create table public.brands (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  website    text,
  created_at timestamptz not null default now()
);

create table public.countries (
  id         uuid primary key default gen_random_uuid(),
  code       char(2) not null unique,      -- US, KR, JP
  name       text not null unique
);

create table public.materials (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,         -- SS316L
  name       text not null unique,         -- Inox 316L
  description text
);

create table public.units (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,       -- cai, bo, m, cay
  name         text not null,              -- Cái
  allow_decimal boolean not null default false
);

create table public.suppliers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  phone      text,
  address    text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Mặt hàng
-- ---------------------------------------------------------------------
create table public.products (
  id            uuid primary key default gen_random_uuid(),
  sku           text not null unique check (sku ~ '^[A-Za-z0-9./_\-]{2,40}$'),  -- mã nội bộ
  part_number   text,                                                          -- mã hãng, vd SS-400-6
  name          text not null check (char_length(name) between 2 and 200),
  original_name text,
  category_id   uuid not null references public.categories(id) on delete restrict,
  brand_id      uuid references public.brands(id) on delete restrict,
  country_id    uuid references public.countries(id) on delete restrict,
  material_id   uuid references public.materials(id) on delete restrict,
  unit_id       uuid not null references public.units(id) on delete restrict,
  size          text,                                -- 1/4", 6mm
  specs         jsonb not null default '{}'::jsonb check (jsonb_typeof(specs) = 'object'),
  min_stock     numeric(14,3) not null default 0 check (min_stock >= 0),
  image_url     text,
  image_public_id text,
  note          text,
  is_active     boolean not null default true,
  search_text   text not null default '',
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index products_brand_part on public.products (brand_id, part_number) where part_number is not null;
create index products_search_trgm on public.products using gin (search_text extensions.gin_trgm_ops);
create index products_category on public.products (category_id);
create index products_brand on public.products (brand_id);
create index products_material on public.products (material_id);

-- ---------------------------------------------------------------------
-- Tồn kho theo (mặt hàng × vị trí). KHÔNG ghi trực tiếp — chỉ qua RPC.
-- ---------------------------------------------------------------------
create table public.inventory (
  product_id  uuid not null references public.products(id) on delete restrict,
  location_id uuid not null references public.locations(id) on delete restrict,
  quantity    numeric(14,3) not null default 0 check (quantity >= 0),
  updated_at  timestamptz not null default now(),
  primary key (product_id, location_id)
);
create index inventory_location on public.inventory (location_id);

-- ---------------------------------------------------------------------
-- Phiếu (nhập / xuất / chuyển / kiểm kê) và dòng biến động
-- ---------------------------------------------------------------------
create sequence public.document_no_seq;

create table public.stock_documents (
  id            uuid primary key default gen_random_uuid(),
  doc_no        text not null unique,
  type          public.document_type not null,
  doc_date      date not null default (now() at time zone 'Asia/Ho_Chi_Minh')::date,
  supplier_id   uuid references public.suppliers(id),
  reference_no  text,            -- số hoá đơn / đơn hàng / công trình
  note          text,
  image_url     text,
  created_by    uuid not null references public.profiles(id),
  created_at    timestamptz not null default now()
);

create table public.stock_movements (
  id               bigint generated always as identity primary key,
  document_id      uuid references public.stock_documents(id),
  type             public.movement_type not null,
  product_id       uuid not null references public.products(id),
  from_location_id uuid references public.locations(id),
  to_location_id   uuid references public.locations(id),
  quantity         numeric(14,3) not null check (quantity > 0),
  balance_after    numeric(14,3),            -- tồn tại vị trí chính sau thao tác
  movement_date    date not null default (now() at time zone 'Asia/Ho_Chi_Minh')::date,
  note             text,
  reverses_id      bigint references public.stock_movements(id),
  user_id          uuid not null references public.profiles(id),
  created_at       timestamptz not null default now(),
  check (
    (type = 'IN'       and from_location_id is null and to_location_id is not null) or
    (type = 'OUT'      and from_location_id is not null and to_location_id is null) or
    (type = 'TRANSFER' and from_location_id is not null and to_location_id is not null and from_location_id <> to_location_id) or
    (type in ('ADJUST', 'REVERSAL') and (from_location_id is not null or to_location_id is not null))
  )
);
create unique index stock_movements_reversed_once on public.stock_movements (reverses_id) where reverses_id is not null;
create index stock_movements_product_date on public.stock_movements (product_id, movement_date desc);
create index stock_movements_user_date on public.stock_movements (user_id, created_at desc);
create index stock_movements_date on public.stock_movements (movement_date desc);

-- ---------------------------------------------------------------------
-- Thông báo & nhật ký
-- ---------------------------------------------------------------------
create table public.notifications (
  id           bigint generated always as identity primary key,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  type         text not null,       -- stock_out, stock_in, low_stock, adjust, account
  title        text not null,
  body         text,
  payload      jsonb not null default '{}'::jsonb,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index notifications_recipient on public.notifications (recipient_id, created_at desc);

create table public.audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  action      text not null,          -- INSERT / UPDATE / DELETE
  table_name  text not null,
  record_id   text,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);
create index audit_logs_table_record on public.audit_logs (table_name, record_id);
