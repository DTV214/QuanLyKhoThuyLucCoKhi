-- =====================================================================
-- Giai đoạn 7: Báo cáo
-- Tất cả là SECURITY INVOKER → RLS áp dụng (trang Báo cáo chỉ owner/admin).
-- Thao tác đã bị huỷ (có phiếu đảo) và chính phiếu đảo KHÔNG tính vào thống kê.
-- =====================================================================

-- Các biến động "còn hiệu lực": không phải phiếu đảo, và chưa bị đảo
create or replace view public.v_effective_movements
with (security_invoker = true) as
select m.*
  from public.stock_movements m
 where m.type <> 'REVERSAL'
   and not exists (select 1 from public.stock_movements r where r.reverses_id = m.id);

grant select on public.v_effective_movements to authenticated;
revoke all on public.v_effective_movements from anon;

-- ---------- Số liệu tổng quan ----------
create or replace function public.fn_report_summary()
returns jsonb
language sql stable security invoker
set search_path = public
as $$
  with today as (select (now() at time zone 'Asia/Ho_Chi_Minh')::date as d),
  totals as (
    select p.id, p.min_stock, coalesce(sum(i.quantity), 0) as total
      from public.products p
      left join public.inventory i on i.product_id = p.id
     where p.is_active
     group by p.id
  )
  select jsonb_build_object(
    'products_active', (select count(*) from totals),
    'out_of_stock',    (select count(*) from totals where total = 0),
    'low_stock',       (select count(*) from totals where total > 0 and min_stock > 0 and total <= min_stock),
    'locations_used',  (select count(distinct location_id) from public.inventory where quantity > 0),
    'today_in_docs',   (select count(*) from public.stock_documents, today where type = 'RECEIPT' and doc_date = today.d),
    'today_in_lines',  (select count(*) from public.v_effective_movements, today where type = 'IN' and movement_date = today.d),
    'today_out_count', (select count(*) from public.v_effective_movements, today where type = 'OUT' and movement_date = today.d),
    'today_out_people',(select count(distinct user_id) from public.v_effective_movements, today where type = 'OUT' and movement_date = today.d)
  )
$$;

-- ---------- Số lượt nhập / lấy / chuyển theo ngày ----------
create or replace function public.fn_report_daily(p_from date, p_to date)
returns table (day date, in_count bigint, out_count bigint, transfer_count bigint)
language sql stable security invoker
set search_path = public
as $$
  select d::date,
         count(m.id) filter (where m.type = 'IN'),
         count(m.id) filter (where m.type = 'OUT'),
         count(m.id) filter (where m.type = 'TRANSFER')
    from generate_series(p_from, least(p_to, p_from + 366), interval '1 day') d
    left join public.v_effective_movements m on m.movement_date = d::date
   group by d
   order by d
$$;

-- ---------- Mặt hàng lấy ra nhiều nhất ----------
create or replace function public.fn_report_top_out(p_from date, p_to date, p_limit int default 10)
returns table (product_id uuid, sku text, name text, unit_name text, total_out numeric, times bigint, total_now numeric)
language sql stable security invoker
set search_path = public
as $$
  select p.id, p.sku, p.name, u.name,
         sum(m.quantity), count(*),
         (select coalesce(sum(quantity), 0) from public.inventory i where i.product_id = p.id)
    from public.v_effective_movements m
    join public.products p on p.id = m.product_id
    join public.units u on u.id = p.unit_id
   where m.type = 'OUT' and m.movement_date between p_from and p_to
   group by p.id, p.sku, p.name, u.name
   order by count(*) desc, sum(m.quantity) desc
   limit least(greatest(p_limit, 1), 50)
$$;

-- ---------- Hàng hết / sắp hết ----------
create or replace function public.fn_report_low_stock(p_limit int default 50)
returns table (product_id uuid, sku text, name text, unit_name text, total numeric, min_stock numeric)
language sql stable security invoker
set search_path = public
as $$
  select p.id, p.sku, p.name, u.name, coalesce(sum(i.quantity), 0) as total, p.min_stock
    from public.products p
    join public.units u on u.id = p.unit_id
    left join public.inventory i on i.product_id = p.id
   where p.is_active
   group by p.id, p.sku, p.name, u.name, p.min_stock
  having coalesce(sum(i.quantity), 0) = 0
      or (p.min_stock > 0 and coalesce(sum(i.quantity), 0) <= p.min_stock)
   order by coalesce(sum(i.quantity), 0) / nullif(p.min_stock, 0) nulls first, p.name
   limit least(greatest(p_limit, 1), 200)
$$;

revoke execute on function public.fn_report_summary() from public, anon;
revoke execute on function public.fn_report_daily(date, date) from public, anon;
revoke execute on function public.fn_report_top_out(date, date, int) from public, anon;
revoke execute on function public.fn_report_low_stock(int) from public, anon;
grant execute on function public.fn_report_summary() to authenticated;
grant execute on function public.fn_report_daily(date, date) to authenticated;
grant execute on function public.fn_report_top_out(date, date, int) to authenticated;
grant execute on function public.fn_report_low_stock(int) to authenticated;

-- ---------- Lịch sử: thao tác nào đã bị huỷ ----------
-- Nhân viên không thấy phiếu đảo do quản lý tạo (RLS) → hàm này cho biết
-- trong các thao tác mình xem được, cái nào đã bị huỷ (chỉ trả id, không lộ nội dung).
create or replace function public.fn_reversed_ids(p_ids bigint[])
returns setof bigint
language sql stable security definer
set search_path = public
as $$
  select r.reverses_id
    from public.stock_movements r
    join public.stock_movements x on x.id = r.reverses_id
   where r.reverses_id = any(p_ids[1:500])
     and (public.fn_is_manager() or x.user_id = auth.uid())
$$;

revoke execute on function public.fn_reversed_ids(bigint[]) from public, anon;
grant execute on function public.fn_reversed_ids(bigint[]) to authenticated;
