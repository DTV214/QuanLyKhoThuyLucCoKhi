-- =====================================================================
-- Hàm tiện ích, trigger, và RPC thay đổi tồn kho (an toàn, 1 transaction)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Quyền của người đang gọi (NULL nếu chưa đăng nhập hoặc bị khoá)
-- ---------------------------------------------------------------------
create or replace function public.fn_my_role()
returns public.user_role
language sql stable security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and status = 'active'
$$;

create or replace function public.fn_is_manager()
returns boolean
language sql stable security definer
set search_path = public
as $$ select coalesce(public.fn_my_role() in ('owner', 'admin'), false) $$;

create or replace function public.fn_require_role(p_roles public.user_role[])
returns public.user_role
language plpgsql stable security definer
set search_path = public
as $$
declare v_role public.user_role := public.fn_my_role();
begin
  if v_role is null then
    raise exception 'Bạn chưa đăng nhập hoặc tài khoản đã bị khoá' using errcode = '42501';
  end if;
  if not (v_role = any (p_roles)) then
    raise exception 'Bạn không có quyền thực hiện thao tác này' using errcode = '42501';
  end if;
  return v_role;
end $$;

-- ---------------------------------------------------------------------
-- updated_at tự động
-- ---------------------------------------------------------------------
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.tg_set_updated_at();
create trigger products_updated_at before update on public.products
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------
-- Tạo profile khi owner/admin tạo user (qua Admin API, app_metadata)
-- ---------------------------------------------------------------------
create or replace function public.tg_handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, role, must_change_password, created_by)
  values (
    new.id,
    new.email,
    coalesce(new.raw_app_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    nullif(new.raw_app_meta_data ->> 'phone', ''),
    coalesce((new.raw_app_meta_data ->> 'role')::public.user_role, 'staff'),
    coalesce((new.raw_app_meta_data ->> 'must_change_password')::boolean, true),
    nullif(new.raw_app_meta_data ->> 'created_by', '')::uuid
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.tg_handle_new_user();

-- Không cho tự đổi role/status của chính mình qua client
create or replace function public.tg_protect_profile()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  -- service_role (server) được phép; client thường chỉ được sửa tên/SĐT của mình
  if coalesce(auth.role(), '') <> 'service_role' then
    if new.role is distinct from old.role
       or new.status is distinct from old.status
       or new.email is distinct from old.email
       or new.created_by is distinct from old.created_by then
      raise exception 'Không được tự thay đổi quyền hoặc trạng thái tài khoản' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger profiles_protect before update on public.profiles
  for each row execute function public.tg_protect_profile();

-- ---------------------------------------------------------------------
-- Mã vị trí tự sinh: K1-A-03-T2[-O4]
-- ---------------------------------------------------------------------
create or replace function public.tg_location_code()
returns trigger language plpgsql
set search_path = public
as $$
declare v_prefix text;
begin
  select w.code || '-' || z.code || '-' || r.code
    into v_prefix
    from public.racks r
    join public.zones z on z.id = r.zone_id
    join public.warehouses w on w.id = z.warehouse_id
   where r.id = new.rack_id;

  new.code := v_prefix || '-T' || new.level || coalesce('-O' || new.bin, '');
  return new;
end $$;

create trigger locations_code before insert or update of rack_id, level, bin on public.locations
  for each row execute function public.tg_location_code();

-- Tạo sẵn các tầng khi thêm kệ mới
create or replace function public.tg_rack_create_levels()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.locations (rack_id, level)
  select new.id, g from generate_series(1, new.levels) g
  on conflict do nothing;
  return new;
end $$;

create trigger racks_create_levels after insert on public.racks
  for each row execute function public.tg_rack_create_levels();

-- ---------------------------------------------------------------------
-- Chuỗi tìm kiếm không dấu cho mặt hàng
-- ---------------------------------------------------------------------
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

  new.search_text := public.f_unaccent(concat_ws(' ',
    new.sku, new.part_number, new.name, new.original_name, new.size, v_extra,
    (select string_agg(value, ' ') from jsonb_each_text(new.specs))
  ));
  return new;
end $$;

create trigger products_search_text before insert or update on public.products
  for each row execute function public.tg_product_search_text();

-- ---------------------------------------------------------------------
-- Lịch sử biến động: CẤM sửa / xoá (kể cả admin)
-- ---------------------------------------------------------------------
create or replace function public.tg_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'Bảng % chỉ được thêm mới, không được sửa hoặc xoá', tg_table_name
    using errcode = '42501';
end $$;

create trigger stock_movements_immutable before update or delete on public.stock_movements
  for each row execute function public.tg_immutable();
create trigger audit_logs_immutable before update or delete on public.audit_logs
  for each row execute function public.tg_immutable();

-- ---------------------------------------------------------------------
-- Nhật ký thay đổi dữ liệu danh mục
-- ---------------------------------------------------------------------
create or replace function public.tg_audit()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (actor_id, action, table_name, record_id, old_data, new_data)
  values (
    auth.uid(), tg_op, tg_table_name,
    coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id', ''),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','warehouses','zones','racks','locations','categories',
                           'brands','countries','materials','units','suppliers','products']
  loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I
                    for each row execute function public.tg_audit()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Hỗ trợ: gửi thông báo cho tất cả quản lý (owner + admin)
-- ---------------------------------------------------------------------
create or replace function public.fn_notify_managers(
  p_type text, p_title text, p_body text, p_payload jsonb, p_exclude uuid default null)
returns void language sql security definer
set search_path = public
as $$
  insert into public.notifications (recipient_id, type, title, body, payload)
  select id, p_type, p_title, p_body, p_payload
    from public.profiles
   where role in ('owner', 'admin') and status = 'active'
     and id is distinct from p_exclude
$$;

create or replace function public.fn_product_total(p_product uuid)
returns numeric language sql stable
set search_path = public
as $$ select coalesce(sum(quantity), 0) from public.inventory where product_id = p_product $$;

create or replace function public.fn_check_low_stock(p_product uuid)
returns void language plpgsql security definer
set search_path = public
as $$
declare v_p record; v_total numeric;
begin
  select id, sku, name, min_stock into v_p from public.products where id = p_product;
  if v_p.min_stock > 0 then
    v_total := public.fn_product_total(p_product);
    if v_total <= v_p.min_stock then
      perform public.fn_notify_managers(
        'low_stock',
        'Sắp hết hàng: ' || v_p.name,
        'Tổng tồn còn ' || trim_scale(v_total) || ' (mức tối thiểu ' || trim_scale(v_p.min_stock) || ')',
        jsonb_build_object('product_id', v_p.id, 'sku', v_p.sku, 'total', v_total));
    end if;
  end if;
end $$;

create or replace function public.fn_next_doc_no(p_type public.document_type)
returns text language sql volatile
set search_path = public
as $$
  select (case p_type when 'RECEIPT' then 'PN' when 'ISSUE' then 'PX'
                      when 'TRANSFER' then 'PC' else 'KK' end)
         || to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'YYMMDD') || '-'
         || lpad(nextval('public.document_no_seq')::text, 5, '0')
$$;

create or replace function public.fn_validate_qty(p_product uuid, p_qty numeric)
returns void language plpgsql stable
set search_path = public
as $$
declare v_decimal boolean;
begin
  if p_qty is null or p_qty <= 0 then
    raise exception 'Số lượng phải lớn hơn 0' using errcode = '22023';
  end if;
  select u.allow_decimal into v_decimal
    from public.products p join public.units u on u.id = p.unit_id
   where p.id = p_product and p.is_active;
  if not found then
    raise exception 'Mặt hàng không tồn tại hoặc đã ngừng sử dụng' using errcode = 'P0002';
  end if;
  if not v_decimal and p_qty <> trunc(p_qty) then
    raise exception 'Mặt hàng này chỉ nhập số lượng nguyên' using errcode = '22023';
  end if;
end $$;

-- =====================================================================
-- RPC: XUẤT KHO (lấy hàng) — mọi role đang hoạt động
-- =====================================================================
create or replace function public.fn_stock_out(
  p_product_id  uuid,
  p_location_id uuid,
  p_quantity    numeric,
  p_date        date default null,
  p_note        text default null,
  p_document_id uuid default null)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_current numeric;
  v_remaining numeric;
  v_mov_id bigint;
  v_product record;
  v_loc text;
  v_name text;
begin
  perform public.fn_require_role(array['owner','admin','staff']::public.user_role[]);
  perform public.fn_validate_qty(p_product_id, p_quantity);

  select quantity into v_current
    from public.inventory
   where product_id = p_product_id and location_id = p_location_id
   for update;                                  -- khoá dòng: 2 người lấy cùng lúc không bị sai

  if not found or v_current < p_quantity then
    raise exception 'Không đủ hàng tại vị trí này (còn %)', trim_scale(coalesce(v_current, 0))
      using errcode = 'P0001';
  end if;

  update public.inventory
     set quantity = quantity - p_quantity, updated_at = now()
   where product_id = p_product_id and location_id = p_location_id
  returning quantity into v_remaining;

  insert into public.stock_movements
    (document_id, type, product_id, from_location_id, quantity, balance_after, movement_date, note, user_id)
  values
    (p_document_id, 'OUT', p_product_id, p_location_id, p_quantity, v_remaining,
     coalesce(p_date, (now() at time zone 'Asia/Ho_Chi_Minh')::date), p_note, v_uid)
  returning id into v_mov_id;

  select sku, name into v_product from public.products where id = p_product_id;
  select code into v_loc from public.locations where id = p_location_id;
  select full_name into v_name from public.profiles where id = v_uid;

  perform public.fn_notify_managers(
    'stock_out',
    v_name || ' đã lấy ' || trim_scale(p_quantity) || ' × ' || v_product.name,
    'Tại ' || v_loc || '. Còn lại ' || trim_scale(v_remaining),
    jsonb_build_object('movement_id', v_mov_id, 'product_id', p_product_id, 'location', v_loc),
    v_uid);
  perform public.fn_check_low_stock(p_product_id);

  return jsonb_build_object(
    'movement_id', v_mov_id,
    'remaining_at_location', v_remaining,
    'total_remaining', public.fn_product_total(p_product_id),
    'location_code', v_loc);
end $$;

-- =====================================================================
-- RPC: NHẬP KHO — mọi role đang hoạt động
-- =====================================================================
create or replace function public.fn_stock_in(
  p_product_id  uuid,
  p_location_id uuid,
  p_quantity    numeric,
  p_date        date default null,
  p_note        text default null,
  p_document_id uuid default null)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_new numeric;
  v_mov_id bigint;
begin
  perform public.fn_require_role(array['owner','admin','staff']::public.user_role[]);
  perform public.fn_validate_qty(p_product_id, p_quantity);

  if not exists (select 1 from public.locations where id = p_location_id and is_active) then
    raise exception 'Vị trí không tồn tại hoặc đã ngừng sử dụng' using errcode = 'P0002';
  end if;

  insert into public.inventory (product_id, location_id, quantity)
  values (p_product_id, p_location_id, p_quantity)
  on conflict (product_id, location_id)
  do update set quantity = public.inventory.quantity + excluded.quantity, updated_at = now()
  returning quantity into v_new;

  insert into public.stock_movements
    (document_id, type, product_id, to_location_id, quantity, balance_after, movement_date, note, user_id)
  values
    (p_document_id, 'IN', p_product_id, p_location_id, p_quantity, v_new,
     coalesce(p_date, (now() at time zone 'Asia/Ho_Chi_Minh')::date), p_note, v_uid)
  returning id into v_mov_id;

  return jsonb_build_object(
    'movement_id', v_mov_id,
    'quantity_at_location', v_new,
    'total', public.fn_product_total(p_product_id));
end $$;

-- =====================================================================
-- RPC: CHUYỂN KHO / CHUYỂN KỆ — mọi role đang hoạt động
-- =====================================================================
create or replace function public.fn_transfer(
  p_product_id uuid,
  p_from_location_id uuid,
  p_to_location_id uuid,
  p_quantity numeric,
  p_date date default null,
  p_note text default null,
  p_document_id uuid default null)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_current numeric;
  v_from_left numeric;
  v_mov_id bigint;
begin
  perform public.fn_require_role(array['owner','admin','staff']::public.user_role[]);
  perform public.fn_validate_qty(p_product_id, p_quantity);
  if p_from_location_id = p_to_location_id then
    raise exception 'Vị trí đi và đến phải khác nhau' using errcode = '22023';
  end if;
  if not exists (select 1 from public.locations where id = p_to_location_id and is_active) then
    raise exception 'Vị trí đến không tồn tại' using errcode = 'P0002';
  end if;

  select quantity into v_current from public.inventory
   where product_id = p_product_id and location_id = p_from_location_id for update;
  if not found or v_current < p_quantity then
    raise exception 'Không đủ hàng để chuyển (còn %)', trim_scale(coalesce(v_current, 0)) using errcode = 'P0001';
  end if;

  update public.inventory set quantity = quantity - p_quantity, updated_at = now()
   where product_id = p_product_id and location_id = p_from_location_id
  returning quantity into v_from_left;

  insert into public.inventory (product_id, location_id, quantity)
  values (p_product_id, p_to_location_id, p_quantity)
  on conflict (product_id, location_id)
  do update set quantity = public.inventory.quantity + excluded.quantity, updated_at = now();

  insert into public.stock_movements
    (document_id, type, product_id, from_location_id, to_location_id, quantity, balance_after, movement_date, note, user_id)
  values
    (p_document_id, 'TRANSFER', p_product_id, p_from_location_id, p_to_location_id, p_quantity, v_from_left,
     coalesce(p_date, (now() at time zone 'Asia/Ho_Chi_Minh')::date), p_note, v_uid)
  returning id into v_mov_id;

  return jsonb_build_object('movement_id', v_mov_id, 'remaining_at_from', v_from_left);
end $$;

-- =====================================================================
-- RPC: KIỂM KÊ (đặt số lượng thực tế) — chỉ owner/admin, bắt buộc lý do
-- =====================================================================
create or replace function public.fn_adjust(
  p_product_id uuid,
  p_location_id uuid,
  p_counted numeric,
  p_reason text,
  p_document_id uuid default null)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_current numeric;
  v_diff numeric;
  v_mov_id bigint;
begin
  perform public.fn_require_role(array['owner','admin']::public.user_role[]);
  if p_counted is null or p_counted < 0 then
    raise exception 'Số đếm thực tế không hợp lệ' using errcode = '22023';
  end if;
  if coalesce(char_length(trim(p_reason)), 0) < 3 then
    raise exception 'Phải ghi lý do điều chỉnh' using errcode = '22023';
  end if;

  insert into public.inventory (product_id, location_id, quantity)
  values (p_product_id, p_location_id, 0)
  on conflict do nothing;

  select quantity into v_current from public.inventory
   where product_id = p_product_id and location_id = p_location_id for update;

  v_diff := p_counted - v_current;
  if v_diff = 0 then
    return jsonb_build_object('movement_id', null, 'difference', 0, 'quantity', v_current);
  end if;

  update public.inventory set quantity = p_counted, updated_at = now()
   where product_id = p_product_id and location_id = p_location_id;

  insert into public.stock_movements
    (document_id, type, product_id, from_location_id, to_location_id, quantity, balance_after, note, user_id)
  values
    (p_document_id, 'ADJUST', p_product_id,
     case when v_diff < 0 then p_location_id end,
     case when v_diff > 0 then p_location_id end,
     abs(v_diff), p_counted, p_reason, v_uid)
  returning id into v_mov_id;

  perform public.fn_notify_managers('adjust', 'Điều chỉnh kiểm kê',
    'Chênh lệch ' || trim_scale(v_diff) || '. Lý do: ' || p_reason,
    jsonb_build_object('movement_id', v_mov_id, 'product_id', p_product_id), v_uid);
  perform public.fn_check_low_stock(p_product_id);

  return jsonb_build_object('movement_id', v_mov_id, 'difference', v_diff, 'quantity', p_counted);
end $$;

-- =====================================================================
-- RPC: PHIẾU ĐẢO (huỷ một thao tác sai) — chỉ owner/admin
-- =====================================================================
create or replace function public.fn_reverse_movement(p_movement_id bigint, p_reason text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  m public.stock_movements;
  v_current numeric;
  v_new_id bigint;
begin
  perform public.fn_require_role(array['owner','admin']::public.user_role[]);
  if coalesce(char_length(trim(p_reason)), 0) < 3 then
    raise exception 'Phải ghi lý do huỷ' using errcode = '22023';
  end if;

  select * into m from public.stock_movements where id = p_movement_id;
  if not found then raise exception 'Không tìm thấy thao tác' using errcode = 'P0002'; end if;
  if m.type = 'REVERSAL' then raise exception 'Không thể đảo một phiếu đảo' using errcode = '22023'; end if;
  if exists (select 1 from public.stock_movements where reverses_id = m.id) then
    raise exception 'Thao tác này đã được huỷ trước đó' using errcode = '22023';
  end if;

  -- Đảo: trả lại nơi đã trừ, trừ lại nơi đã cộng
  if m.to_location_id is not null then
    select quantity into v_current from public.inventory
     where product_id = m.product_id and location_id = m.to_location_id for update;
    if coalesce(v_current, 0) < m.quantity then
      raise exception 'Không thể huỷ: hàng tại % đã được lấy bớt (còn %)',
        (select code from public.locations where id = m.to_location_id), coalesce(v_current, 0)
        using errcode = 'P0001';
    end if;
    update public.inventory set quantity = quantity - m.quantity, updated_at = now()
     where product_id = m.product_id and location_id = m.to_location_id;
  end if;

  if m.from_location_id is not null then
    insert into public.inventory (product_id, location_id, quantity)
    values (m.product_id, m.from_location_id, m.quantity)
    on conflict (product_id, location_id)
    do update set quantity = public.inventory.quantity + excluded.quantity, updated_at = now();
  end if;

  insert into public.stock_movements
    (type, product_id, from_location_id, to_location_id, quantity, note, reverses_id, user_id)
  values
    ('REVERSAL', m.product_id, m.to_location_id, m.from_location_id, m.quantity, p_reason, m.id, v_uid)
  returning id into v_new_id;

  perform public.fn_check_low_stock(m.product_id);
  return jsonb_build_object('movement_id', v_new_id);
end $$;

-- =====================================================================
-- RPC: TÌM KIẾM mặt hàng (không dấu, gõ sai nhẹ vẫn ra) + lọc
-- =====================================================================
create or replace function public.fn_search_products(
  p_query        text default null,
  p_warehouse_id uuid default null,
  p_category_id  uuid default null,
  p_brand_id     uuid default null,
  p_material_id  uuid default null,
  p_low_stock    boolean default false,
  p_limit        int default 30,
  p_offset       int default 0)
returns table (
  id uuid, sku text, part_number text, name text, size text, image_url text,
  category_name text, brand_name text, material_name text, country_name text, unit_name text,
  min_stock numeric, total_quantity numeric, locations jsonb, score real)
language sql stable security invoker
set search_path = public, extensions
as $$
  with q as (select nullif(public.f_unaccent(trim(coalesce(p_query, ''))), '') as t),
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
  )
  select p.id, p.sku, p.part_number, p.name, p.size, p.image_url,
         c.name as category_name, b.name as brand_name, m.name as material_name,
         co.name as country_name, u.name as unit_name,
         p.min_stock,
         coalesce(inv.total, 0) as total_quantity,
         coalesce(inv.locs, '[]'::jsonb) as locations,
         (case when q.t is null then 0
              else greatest(similarity(p.search_text, q.t), word_similarity(q.t, p.search_text)) end)::real as score
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
     and (not p_low_stock or (p.min_stock > 0 and coalesce(inv.total, 0) <= p.min_stock))
   order by score desc, p.name
   limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0)
$$;
