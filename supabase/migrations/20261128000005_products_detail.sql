-- =====================================================================
-- Giai đoạn 3: Mặt hàng chi tiết
-- Theo mẫu thực tế (vd "Van một chiều nối nhanh Φ8–Φ8"):
--   tiêu chuẩn chất lượng, môi chất sử dụng, nhiệt độ làm việc (min–max),
--   áp suất tối đa, 2 đầu nối (có thể khác cỡ), kích thước + khối lượng,
--   nhiều ảnh, mô tả chi tiết.
-- Kệ: kích thước + tải trọng mỗi tầng (để cảnh báo hàng quá dài / quá nặng).
-- Bộ lọc tìm kiếm mới: môi chất, nhiệt độ làm việc, cỡ đầu nối, xuất xứ.
-- =====================================================================

-- ---------- Mặt hàng ----------
alter table public.products
  add column description      text check (char_length(description) <= 4000),
  add column quality_standard text check (char_length(quality_standard) <= 100),
  add column temp_min         numeric(7,2) check (temp_min between -273 and 2000),
  add column temp_max         numeric(7,2) check (temp_max between -273 and 2000),
  add column pressure_max     numeric(10,2) check (pressure_max > 0),
  add column media            text[] not null default '{}',
  add column connection_a     text check (char_length(connection_a) <= 40),
  add column connection_b     text check (char_length(connection_b) <= 40),
  add column length_mm        numeric(10,2) check (length_mm > 0),
  add column width_mm         numeric(10,2) check (width_mm > 0),
  add column height_mm        numeric(10,2) check (height_mm > 0),
  add column weight_g         numeric(12,2) check (weight_g > 0),
  add column images           jsonb not null default '[]'::jsonb
                              check (jsonb_typeof(images) = 'array' and jsonb_array_length(images) <= 8),
  add constraint products_temp_range check (temp_min is null or temp_max is null or temp_min <= temp_max),
  add constraint products_media_limit check (cardinality(media) <= 20);

create index products_media_gin on public.products using gin (media);
create index products_temp on public.products (temp_min, temp_max);

comment on column public.products.connection_a is 'Đầu nối 1, vd: Φ8, 1/4" NPT đực';
comment on column public.products.connection_b is 'Đầu nối 2 (bỏ trống nếu giống đầu 1 hoặc chỉ có 1 đầu)';
comment on column public.products.images is '[{ "url": "...", "publicId": "kho-thanh-danh/..." }] — ảnh đầu tiên là ảnh chính';

-- ---------- Kệ: kích thước & tải trọng mỗi tầng ----------
alter table public.racks
  add column level_width_mm    numeric(10,2) check (level_width_mm > 0),
  add column level_depth_mm    numeric(10,2) check (level_depth_mm > 0),
  add column level_height_mm   numeric(10,2) check (level_height_mm > 0),
  add column level_max_load_kg numeric(10,2) check (level_max_load_kg > 0);

-- ---------- Chuẩn hoá chuỗi tìm kiếm: bỏ dấu + Φ/Ø → "phi" ----------
-- "Φ8" → "phi8", "Ø 10" → "phi10"; gõ "phi8", "phi 8" đều ra.
create or replace function public.f_norm(text)
returns text
language sql immutable parallel safe strict
set search_path = public, extensions
as $$
  select public.f_unaccent(regexp_replace($1, '[ΦφØø⌀]\s*', 'phi', 'g'))
$$;

-- Ảnh chính = ảnh đầu tiên trong danh sách
create or replace function public.tg_product_main_image()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.image_url := new.images -> 0 ->> 'url';
  new.image_public_id := new.images -> 0 ->> 'publicId';
  new.media := coalesce(array(select distinct trim(m) from unnest(new.media) m where trim(m) <> ''), '{}');
  return new;
end $$;

create trigger products_main_image before insert or update of images, media on public.products
  for each row execute function public.tg_product_main_image();

-- Chuỗi tìm kiếm có thêm: mô tả, tiêu chuẩn, môi chất, đầu nối
create or replace function public.tg_product_search_text()
returns trigger language plpgsql
set search_path = public
as $$
declare v_extra text;
begin
  select concat_ws(' ', c.name, b.name, m.name, m.code, co.name)
    into v_extra
    from (select 1) x
    left join public.categories c on c.id = new.category_id
    left join public.brands     b on b.id = new.brand_id
    left join public.materials  m on m.id = new.material_id
    left join public.countries co on co.id = new.country_id;

  new.search_text := public.f_norm(concat_ws(' ',
    new.sku, new.part_number, new.name, new.original_name, new.size, v_extra,
    new.quality_standard, new.connection_a, new.connection_b,
    array_to_string(new.media, ' '),
    (select string_agg(value, ' ') from jsonb_each_text(new.specs)),
    left(new.description, 1000)
  ));
  return new;
end $$;

-- Tính lại chuỗi tìm kiếm cho hàng có sẵn
update public.products set name = name;

-- ---------- Tìm kiếm + bộ lọc mới ----------
drop function if exists public.fn_search_products(text, uuid, uuid, uuid, uuid, boolean, int, int);

create function public.fn_search_products(
  p_query        text    default null,
  p_warehouse_id uuid    default null,
  p_category_id  uuid    default null,
  p_brand_id     uuid    default null,
  p_material_id  uuid    default null,
  p_low_stock    boolean default false,
  p_limit        int     default 30,
  p_offset       int     default 0,
  p_country_id   uuid    default null,
  p_media        text    default null,     -- "Axit" → hàng dùng được cho axit
  p_temperature  numeric default null,     -- 250 → hàng chịu được 250°C
  p_connection   text    default null,     -- "phi8" / "1/4" → khớp đầu nối 1 hoặc 2
  p_in_stock     boolean default false)
returns table (
  id uuid, sku text, part_number text, name text, size text, image_url text,
  category_id uuid, category_name text, brand_name text, material_name text, country_name text, unit_name text,
  quality_standard text, temp_min numeric, temp_max numeric, pressure_max numeric,
  media text[], connection_a text, connection_b text,
  min_stock numeric, total_quantity numeric, locations jsonb, score real, total_count bigint)
language sql stable security invoker
set search_path = public, extensions
as $$
  with q as (
    select nullif(public.f_norm(trim(coalesce(p_query, ''))), '') as t,
           nullif(public.f_norm(trim(coalesce(p_connection, ''))), '') as conn,
           nullif(public.f_norm(trim(coalesce(p_media, ''))), '') as media
  ),
  inv as (
    select i.product_id,
           sum(i.quantity) as total,
           jsonb_agg(jsonb_build_object(
             'location_id', l.id, 'code', l.code, 'warehouse', w.name, 'warehouse_code', w.code,
             'zone', z.name, 'rack', r.code, 'level', l.level, 'bin', l.bin, 'quantity', i.quantity)
             order by i.quantity desc) filter (where i.quantity > 0) as locs
      from public.inventory i
      join public.locations l on l.id = i.location_id
      join public.racks r on r.id = l.rack_id
      join public.zones z on z.id = r.zone_id
      join public.warehouses w on w.id = z.warehouse_id
     where p_warehouse_id is null or w.id = p_warehouse_id
     group by i.product_id
  ),
  hits as (
    select p.*, inv.total, inv.locs, q.t,
           c.name as c_name, b.name as b_name, m.name as m_name, co.name as co_name, u.name as u_name
      from public.products p
      cross join q
      join public.categories c on c.id = p.category_id
      join public.units u on u.id = p.unit_id
      left join public.brands b on b.id = p.brand_id
      left join public.materials m on m.id = p.material_id
      left join public.countries co on co.id = p.country_id
      left join inv on inv.product_id = p.id
     where p.is_active
       and (q.t is null
            or p.search_text like '%' || q.t || '%'
            or q.t <% p.search_text
            or exists (select 1 from jsonb_array_elements(inv.locs) e
                        where lower(e ->> 'code') like '%' || q.t || '%'))
       and (p_warehouse_id is null or inv.product_id is not null)
       and (p_category_id is null or p.category_id = p_category_id
            or p.category_id in (select id from public.categories where parent_id = p_category_id))
       and (p_brand_id is null or p.brand_id = p_brand_id)
       and (p_material_id is null or p.material_id = p_material_id)
       and (p_country_id is null or p.country_id = p_country_id)
       and (q.media is null or exists (select 1 from unnest(p.media) x where public.f_norm(x) like '%' || q.media || '%'))
       and (p_temperature is null or (coalesce(p.temp_min, -273) <= p_temperature
                                      and p.temp_max is not null and p.temp_max >= p_temperature))
       and (q.conn is null
            or replace(public.f_norm(coalesce(p.connection_a, '')), ' ', '') like '%' || replace(q.conn, ' ', '') || '%'
            or replace(public.f_norm(coalesce(p.connection_b, '')), ' ', '') like '%' || replace(q.conn, ' ', '') || '%')
       and (not p_low_stock or (p.min_stock > 0 and coalesce(inv.total, 0) <= p.min_stock))
       and (not p_in_stock or coalesce(inv.total, 0) > 0)
  )
  select h.id, h.sku, h.part_number, h.name, h.size, h.image_url,
         h.category_id, h.c_name, h.b_name, h.m_name, h.co_name, h.u_name,
         h.quality_standard, h.temp_min, h.temp_max, h.pressure_max,
         h.media, h.connection_a, h.connection_b,
         h.min_stock,
         coalesce(h.total, 0),
         coalesce(h.locs, '[]'::jsonb),
         (case when h.t is null then 0
               else greatest(similarity(h.search_text, h.t), word_similarity(h.t, h.search_text)) end)::real as score,
         count(*) over () as total_count
    from hits h
   order by score desc, h.name
   limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0)
$$;

-- Hàm mới mặc định cho PUBLIC gọi được → khoá lại
revoke execute on function public.f_norm(text) from public, anon;
revoke execute on function public.tg_product_main_image() from public, anon;
revoke execute on function public.fn_search_products(text, uuid, uuid, uuid, uuid, boolean, int, int, uuid, text, numeric, text, boolean) from public, anon;
grant execute on function public.f_norm(text) to authenticated;
grant execute on function public.fn_search_products(text, uuid, uuid, uuid, uuid, boolean, int, int, uuid, text, numeric, text, boolean) to authenticated;

-- Môi chất gợi ý (không bắt buộc dùng): đơn vị PTFE đã có trong seed ("Nhựa PTFE")
