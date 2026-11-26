-- =====================================================================
-- Giai đoạn 4–5
-- 1) "Thông số khác": danh sách tự do (tên – giá trị) cho mặt hàng có thông số
--    lạ, không cần tạo cột / thông số riêng. Vẫn tìm kiếm được.
-- 2) Phiếu nhập nhiều dòng: fn_create_receipt — tất cả dòng trong 1 giao dịch,
--    dòng nào lỗi thì huỷ cả phiếu và báo rõ "Dòng 3: ...".
-- 3) Chặn ngày nhập/xuất ở tương lai ngay trong database.
-- =====================================================================

-- ---------- 1. Thông số khác ----------
alter table public.products
  add column extra_specs jsonb not null default '[]'::jsonb
    check (jsonb_typeof(extra_specs) = 'array' and jsonb_array_length(extra_specs) <= 30);

comment on column public.products.extra_specs is '[{ "label": "Kích thước lục giác", "value": "19 mm" }]';

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
    (select string_agg(concat_ws(' ', e ->> 'label', e ->> 'value'), ' ')
       from jsonb_array_elements(new.extra_specs) e),
    left(new.description, 1000)
  ));
  return new;
end $$;

-- ---------- 3. Ngày không được ở tương lai ----------
create or replace function public.fn_check_date(p_date date)
returns date language plpgsql stable
set search_path = public
as $$
declare v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  if p_date is null then return v_today; end if;
  if p_date > v_today then
    raise exception 'Ngày không được sau hôm nay (%)', to_char(v_today, 'DD/MM/YYYY') using errcode = '22023';
  end if;
  if p_date < v_today - 366 then
    raise exception 'Ngày quá cũ (hơn 1 năm trước)' using errcode = '22023';
  end if;
  return p_date;
end $$;

create or replace function public.tg_movement_date()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.movement_date := public.fn_check_date(new.movement_date);
  return new;
end $$;

create trigger stock_movements_date before insert on public.stock_movements
  for each row execute function public.tg_movement_date();

-- ---------- 2. Phiếu nhập nhiều dòng ----------
create or replace function public.fn_create_receipt(
  p_lines        jsonb,                -- [{ "product_id", "location_id", "quantity", "note" }]
  p_date         date default null,
  p_supplier_id  uuid default null,
  p_reference_no text default null,
  p_note         text default null)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_date  date;
  v_doc   uuid;
  v_no    text;
  v_line  jsonb;
  v_i     int := 0;
  v_name  text;
begin
  perform public.fn_require_role(array['owner','admin','staff']::public.user_role[]);
  v_date := public.fn_check_date(p_date);

  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Phiếu nhập phải có ít nhất 1 dòng hàng' using errcode = '22023';
  end if;
  if jsonb_array_length(p_lines) > 100 then
    raise exception 'Một phiếu tối đa 100 dòng' using errcode = '22023';
  end if;
  if p_supplier_id is not null and not exists (select 1 from public.suppliers where id = p_supplier_id) then
    raise exception 'Nhà cung cấp không tồn tại' using errcode = 'P0002';
  end if;

  v_no := public.fn_next_doc_no('RECEIPT');
  insert into public.stock_documents (doc_no, type, doc_date, supplier_id, reference_no, note, created_by)
  values (v_no, 'RECEIPT', v_date, p_supplier_id,
          nullif(trim(left(p_reference_no, 60)), ''), nullif(trim(left(p_note, 500)), ''), v_uid)
  returning id into v_doc;

  for v_line in select value from jsonb_array_elements(p_lines) loop
    v_i := v_i + 1;
    begin
      perform public.fn_stock_in(
        (v_line ->> 'product_id')::uuid,
        (v_line ->> 'location_id')::uuid,
        (v_line ->> 'quantity')::numeric,
        v_date,
        nullif(trim(left(v_line ->> 'note', 200)), ''),
        v_doc);
    exception when others then
      -- Báo rõ dòng nào lỗi; lỗi này huỷ toàn bộ phiếu (không nhập dở dang)
      raise exception 'Dòng %: %', v_i, sqlerrm using errcode = sqlstate;
    end;
  end loop;

  select full_name into v_name from public.profiles where id = v_uid;
  perform public.fn_notify_managers(
    'stock_in',
    v_name || ' đã nhập kho phiếu ' || v_no,
    v_i || ' dòng hàng',
    jsonb_build_object('document_id', v_doc, 'doc_no', v_no),
    v_uid);

  return jsonb_build_object('document_id', v_doc, 'doc_no', v_no, 'lines', v_i);
end $$;

revoke execute on function public.fn_check_date(date) from public, anon;
revoke execute on function public.tg_movement_date() from public, anon;
revoke execute on function public.fn_create_receipt(jsonb, date, uuid, text, text) from public, anon;
grant execute on function public.fn_create_receipt(jsonb, date, uuid, text, text) to authenticated;

-- Tính lại chuỗi tìm kiếm
update public.products set name = name;
