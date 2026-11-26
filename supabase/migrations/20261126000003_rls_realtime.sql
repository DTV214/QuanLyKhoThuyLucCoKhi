-- =====================================================================
-- Row Level Security + Realtime
-- Nguyên tắc: mặc định CẤM. Chỉ mở đúng những gì cần.
-- inventory / stock_movements KHÔNG có policy ghi → chỉ RPC SECURITY DEFINER ghi được.
-- =====================================================================

do $$
declare t text;
begin
  foreach t in array array['profiles','warehouses','zones','racks','locations','categories','brands',
                           'countries','materials','units','suppliers','products','inventory',
                           'stock_documents','stock_movements','notifications','audit_logs']
  loop
    -- (không FORCE: hàm SECURITY DEFINER chạy bằng quyền chủ bảng cần bỏ qua RLS)
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------- profiles ----------
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.fn_is_manager());
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- Tạo / khoá / đổi role: chỉ qua server (service_role) sau khi requireRole()

-- ---------- danh mục & vị trí: ai đăng nhập cũng xem; quản lý mới sửa ----------
do $$
declare t text;
begin
  foreach t in array array['warehouses','zones','racks','locations','categories','brands',
                           'countries','materials','units','suppliers','products']
  loop
    execute format('create policy %I_select on public.%I for select to authenticated
                    using (public.fn_my_role() is not null)', t, t);
    execute format('create policy %I_insert on public.%I for insert to authenticated
                    with check (public.fn_is_manager())', t, t);
    execute format('create policy %I_update on public.%I for update to authenticated
                    using (public.fn_is_manager()) with check (public.fn_is_manager())', t, t);
  end loop;
end $$;

-- Xoá cứng: chỉ ông chủ (thường nên dùng is_active = false thay vì xoá)
do $$
declare t text;
begin
  foreach t in array array['warehouses','zones','racks','locations','categories','brands',
                           'countries','materials','units','suppliers','products']
  loop
    execute format('create policy %I_delete on public.%I for delete to authenticated
                    using (public.fn_my_role() = ''owner'')', t, t);
  end loop;
end $$;

-- ---------- inventory: chỉ đọc ----------
create policy inventory_select on public.inventory for select to authenticated
  using (public.fn_my_role() is not null);

-- ---------- phiếu ----------
create policy stock_documents_select on public.stock_documents for select to authenticated
  using (public.fn_is_manager() or created_by = auth.uid());
create policy stock_documents_insert on public.stock_documents for insert to authenticated
  with check (public.fn_my_role() is not null and created_by = auth.uid());

-- ---------- lịch sử biến động ----------
create policy stock_movements_select on public.stock_movements for select to authenticated
  using (public.fn_is_manager() or user_id = auth.uid());

-- ---------- thông báo ----------
create policy notifications_select on public.notifications for select to authenticated
  using (recipient_id = auth.uid());
create policy notifications_mark_read on public.notifications for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- ---------- nhật ký ----------
create policy audit_logs_select on public.audit_logs for select to authenticated
  using (public.fn_is_manager());

-- ---------- quyền thực thi RPC ----------
revoke execute on all functions in schema public from anon, public;
grant execute on function
  public.fn_my_role(), public.fn_is_manager(), public.f_unaccent(text),
  public.fn_stock_out(uuid, uuid, numeric, date, text, uuid),
  public.fn_stock_in(uuid, uuid, numeric, date, text, uuid),
  public.fn_transfer(uuid, uuid, uuid, numeric, date, text, uuid),
  public.fn_adjust(uuid, uuid, numeric, text, uuid),
  public.fn_reverse_movement(bigint, text),
  public.fn_search_products(text, uuid, uuid, uuid, uuid, boolean, int, int),
  public.fn_next_doc_no(public.document_type),
  public.fn_product_total(uuid)
to authenticated;

grant usage on sequence public.document_no_seq to authenticated;

-- ---------- Realtime ----------
alter publication supabase_realtime add table public.inventory;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.stock_movements;

-- ---------- Thu hồi hẳn quyền ghi trực tiếp vào bảng số liệu ----------
revoke insert, update, delete on public.inventory       from anon, authenticated;
revoke insert, update, delete on public.stock_movements from anon, authenticated;
revoke insert, update, delete on public.audit_logs      from anon, authenticated;
revoke all on all tables in schema public from anon;
