-- =====================================================================
-- Giai đoạn 2: quản lý Kho & Kệ
-- - Đổi số tầng của kệ → tự thêm tầng / ngừng tầng thừa (chỉ khi tầng trống)
-- - Đổi mã kho / khu / kệ → tự cập nhật lại mã vị trí (K1-A-03-T2)
-- - View đếm hàng theo vị trí
-- =====================================================================

-- ---------- Đồng bộ tầng khi sửa racks.levels ----------
create or replace function public.tg_rack_sync_levels()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare v_busy text;
begin
  if new.levels > old.levels then
    -- bật lại tầng cũ đã ngừng, thêm tầng mới
    update public.locations set is_active = true
     where rack_id = new.id and bin is null and level <= new.levels and not is_active;
    insert into public.locations (rack_id, level)
    select new.id, g from generate_series(1, new.levels) g
     where not exists (select 1 from public.locations l
                        where l.rack_id = new.id and l.level = g and l.bin is null);
  elsif new.levels < old.levels then
    select string_agg(distinct l.code, ', ') into v_busy
      from public.locations l join public.inventory i on i.location_id = l.id
     where l.rack_id = new.id and l.level > new.levels and i.quantity > 0;
    if v_busy is not null then
      raise exception 'Không thể giảm số tầng: còn hàng tại %', v_busy using errcode = 'P0001';
    end if;
    update public.locations set is_active = false where rack_id = new.id and level > new.levels;
  end if;
  return new;
end $$;

create trigger racks_sync_levels after update of levels on public.racks
  for each row execute function public.tg_rack_sync_levels();

-- Kệ bị ngừng → không cho ngừng nếu còn hàng
create or replace function public.tg_guard_deactivate()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare v_busy text;
begin
  if old.is_active and not new.is_active then
    select string_agg(distinct l.code, ', ') into v_busy
      from public.locations l
      join public.racks r on r.id = l.rack_id
      join public.zones z on z.id = r.zone_id
      join public.inventory i on i.location_id = l.id
     where i.quantity > 0
       and case tg_table_name
             when 'racks' then r.id = new.id
             when 'zones' then z.id = new.id
             when 'warehouses' then z.warehouse_id = new.id
           end;
    if v_busy is not null then
      raise exception 'Không thể ngừng sử dụng: còn hàng tại %', v_busy using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

create trigger racks_guard_deactivate before update of is_active on public.racks
  for each row execute function public.tg_guard_deactivate();
create trigger zones_guard_deactivate before update of is_active on public.zones
  for each row execute function public.tg_guard_deactivate();
create trigger warehouses_guard_deactivate before update of is_active on public.warehouses
  for each row execute function public.tg_guard_deactivate();

-- ---------- Đổi mã → sinh lại mã vị trí ----------
create or replace function public.tg_refresh_location_codes()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if new.code is distinct from old.code then
    -- "set level = level" kích hoạt tg_location_code tính lại mã
    update public.locations l set level = l.level
      from public.racks r join public.zones z on z.id = r.zone_id
     where l.rack_id = r.id
       and case tg_table_name
             when 'racks' then r.id = new.id
             when 'zones' then z.id = new.id
             when 'warehouses' then z.warehouse_id = new.id
           end;
  end if;
  return new;
end $$;

create trigger racks_refresh_codes after update of code on public.racks
  for each row execute function public.tg_refresh_location_codes();
create trigger zones_refresh_codes after update of code on public.zones
  for each row execute function public.tg_refresh_location_codes();
create trigger warehouses_refresh_codes after update of code on public.warehouses
  for each row execute function public.tg_refresh_location_codes();

-- ---------- Đếm hàng theo vị trí (theo quyền người xem) ----------
create or replace view public.v_location_stock
with (security_invoker = true) as
select l.id as location_id,
       count(i.product_id) filter (where i.quantity > 0) as product_count,
       coalesce(sum(i.quantity), 0) as total_quantity
  from public.locations l
  left join public.inventory i on i.location_id = l.id
 group by l.id;

grant select on public.v_location_stock to authenticated;
revoke all on public.v_location_stock from anon;
