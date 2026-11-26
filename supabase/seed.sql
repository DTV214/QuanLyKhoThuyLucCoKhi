-- =====================================================================
-- Dữ liệu mẫu ban đầu (chạy sau migrations). An toàn khi chạy lại.
-- =====================================================================

-- Kho
insert into public.warehouses (code, name, description) values
  ('K1', 'Kho 1 – Trong nhà', 'Kho nhỏ trong văn phòng, hàng hay dùng'),
  ('K2', 'Kho 2 – Kho lớn',   'Kho chính, hàng số lượng lớn, ống dài')
on conflict (code) do nothing;

-- Khu vực mẫu
insert into public.zones (warehouse_id, code, name)
select w.id, z.code, z.name
  from public.warehouses w
  cross join (values ('A', 'Khu A – Fitting & hạt bắp'), ('B', 'Khu B – Van'), ('C', 'Khu C – Ống')) as z(code, name)
on conflict (warehouse_id, code) do nothing;

-- Kệ mẫu: mỗi khu 3 kệ, 4 tầng (trigger tự tạo tầng)
insert into public.racks (zone_id, code, levels)
select z.id, lpad(g::text, 2, '0'), 4
  from public.zones z cross join generate_series(1, 3) g
on conflict (zone_id, code) do nothing;

-- Đơn vị
insert into public.units (code, name, allow_decimal) values
  ('cai', 'Cái', false), ('bo', 'Bộ', false), ('m', 'Mét', true),
  ('cay', 'Cây (6m)', false), ('cuon', 'Cuộn', false), ('hop', 'Hộp', false)
on conflict (code) do nothing;

-- Vật liệu
insert into public.materials (code, name, description) values
  ('CS',     'Thép carbon',  'Carbon steel'),
  ('SS304',  'Inox 304',     'Stainless steel 304'),
  ('SS316',  'Inox 316',     'Stainless steel 316'),
  ('SS316L', 'Inox 316L',    '316 carbon thấp, chống ăn mòn mối hàn'),
  ('BRASS',  'Đồng thau',    'Brass'),
  ('AL',     'Nhôm',         'Aluminium'),
  ('PTFE',   'Nhựa PTFE',    'Teflon'),
  ('NBR',    'Cao su NBR',   'Ron, O-ring')
on conflict (code) do nothing;

-- Xuất xứ
insert into public.countries (code, name) values
  ('US', 'Mỹ'), ('KR', 'Hàn Quốc'), ('JP', 'Nhật Bản'), ('TW', 'Đài Loan'),
  ('CN', 'Trung Quốc'), ('DE', 'Đức'), ('GB', 'Anh'), ('IT', 'Ý'), ('VN', 'Việt Nam')
on conflict (code) do nothing;

-- Thương hiệu
insert into public.brands (name) values
  ('Swagelok'), ('Hy-Lok'), ('Parker'), ('DK-Lok'), ('SMC'), ('Festo'), ('Không thương hiệu')
on conflict (name) do nothing;

-- Loại hàng + thông số riêng
insert into public.categories (code, name, sort_order, spec_schema) values
  ('TUBE', 'Ống', 1, '[
     {"key":"od","label":"Đường kính ngoài (OD)","type":"text","unit":"inch/mm"},
     {"key":"wall","label":"Độ dày thành","type":"number","unit":"mm"},
     {"key":"length","label":"Chiều dài cây","type":"number","unit":"m"},
     {"key":"pressure","label":"Áp suất làm việc","type":"number","unit":"bar"},
     {"key":"seam","label":"Kiểu ống","type":"select","options":["Ống đúc (liền)","Ống hàn"]}
   ]'),
  ('FITTING', 'Co nối / Fitting', 2, '[
     {"key":"shape","label":"Kiểu","type":"select","options":["Co 90°","Co 45°","Tê","Nối thẳng","Nối giảm","Thập","Nút bịt"]},
     {"key":"connection","label":"Kiểu kết nối","type":"select","options":["Tube OD","NPT","BSPP","BSPT","JIC","ORFS","Hàn"]},
     {"key":"thread","label":"Cỡ ren","type":"text"},
     {"key":"gender","label":"Đực / Cái","type":"select","options":["Đực","Cái","Đực – Cái"]},
     {"key":"pressure","label":"Áp suất tối đa","type":"number","unit":"bar"}
   ]'),
  ('FERRULE', 'Hạt bắp', 3, '[
     {"key":"position","label":"Loại hạt","type":"select","options":["Hạt trước","Hạt sau","Bộ (trước + sau)"]},
     {"key":"tube_od","label":"Cho ống OD","type":"text"}
   ]'),
  ('NUT', 'Con tán', 4, '[
     {"key":"tube_od","label":"Cho ống OD","type":"text"},
     {"key":"thread","label":"Cỡ ren","type":"text"}
   ]'),
  ('VALVE', 'Van', 5, '[
     {"key":"valve_type","label":"Loại van","type":"select","options":["Van bi","Van kim","Van một chiều","Van xả","Van an toàn","Van cầu","Van điện từ"]},
     {"key":"connection","label":"Kiểu kết nối 2 đầu","type":"text"},
     {"key":"pressure","label":"Áp suất tối đa","type":"number","unit":"bar"},
     {"key":"temperature","label":"Nhiệt độ tối đa","type":"number","unit":"°C"},
     {"key":"handle","label":"Kiểu tay vặn","type":"text"}
   ]'),
  ('COUPLING', 'Đầu nối nhanh', 6, '[
     {"key":"connection","label":"Kiểu kết nối","type":"text"},
     {"key":"pressure","label":"Áp suất tối đa","type":"number","unit":"bar"}
   ]'),
  ('SEAL', 'Ron / Gioăng / O-ring', 7, '[
     {"key":"id_mm","label":"Đường kính trong","type":"number","unit":"mm"},
     {"key":"cs_mm","label":"Độ dày","type":"number","unit":"mm"}
   ]'),
  ('GAUGE', 'Đồng hồ áp suất', 8, '[
     {"key":"range","label":"Thang đo","type":"text","unit":"bar"},
     {"key":"dial","label":"Mặt đồng hồ","type":"number","unit":"mm"},
     {"key":"connection","label":"Chân kết nối","type":"text"}
   ]'),
  ('OTHER', 'Khác', 99, '[]')
on conflict (code) do nothing;

-- Mặt hàng mẫu (để thử tìm kiếm)
insert into public.products (sku, part_number, name, category_id, brand_id, country_id, material_id, unit_id, size, specs, min_stock)
select v.sku, v.pn, v.name,
       (select id from public.categories where code = v.cat),
       (select id from public.brands where name = v.brand),
       (select id from public.countries where code = v.country),
       (select id from public.materials where code = v.mat),
       (select id from public.units where code = v.unit),
       v.size, v.specs::jsonb, v.min
  from (values
    ('TD-FER-316-1/4', 'SS-400-SET', 'Hạt bắp inox 316 1/4"', 'FERRULE', 'Swagelok', 'US', 'SS316', 'bo',  '1/4"', '{"position":"Bộ (trước + sau)","tube_od":"1/4\""}', 20),
    ('TD-NUT-316-1/4', 'SS-402-1',   'Con tán inox 316 1/4"', 'NUT',     'Swagelok', 'US', 'SS316', 'cai', '1/4"', '{"tube_od":"1/4\""}', 20),
    ('TD-ELB-316L-3/8', 'CU-6',      'Co 90° inox 316L 3/8"', 'FITTING', 'Hy-Lok',   'KR', 'SS316L','cai', '3/8"', '{"shape":"Co 90°","connection":"Tube OD"}', 10),
    ('TD-BV-316-1/2', '4Z-B8LJ-SS',  'Van bi inox 316 1/2" NPT', 'VALVE', 'Parker',  'US', 'SS316', 'cai', '1/2"', '{"valve_type":"Van bi","connection":"NPT cái","pressure":206}', 5),
    ('TD-TUBE-316L-1/4', null,       'Ống inox 316L 1/4" x 0.035"', 'TUBE', 'Không thương hiệu', 'KR', 'SS316L', 'm', '1/4"', '{"od":"1/4\"","wall":0.89,"length":6,"seam":"Ống đúc (liền)"}', 30)
  ) as v(sku, pn, name, cat, brand, country, mat, unit, size, specs, min)
on conflict (sku) do nothing;

-- Mặt hàng mẫu theo phiếu thực tế (giai đoạn 3: đủ thông số chi tiết)
insert into public.products (sku, name, category_id, brand_id, material_id, unit_id, size, specs, min_stock,
                             description, quality_standard, temp_min, temp_max, media,
                             connection_a, connection_b, length_mm, width_mm)
select 'TD-VMC-PTFE-D8', 'Van một chiều nối nhanh Φ8–Φ8',
       (select id from public.categories where code = 'VALVE'),
       (select id from public.brands where name = 'Không thương hiệu'),
       (select id from public.materials where code = 'PTFE'),
       (select id from public.units where code = 'cai'),
       'Φ8', '{"valve_type":"Van một chiều","connection":"Nối nhanh ống OD 8mm","hex_mm":19}'::jsonb, 5,
       'Van một chiều kiểu nối nhanh, hai đầu dùng cho ống có đường kính ngoài 8 mm. Kích thước đai ốc lục giác 19 mm, thân van rộng 24 mm, tổng chiều dài 78 mm.',
       'Tiêu chuẩn Đức', -190, 280, array['Axit', 'Kiềm', 'Hoá chất ăn mòn'],
       'Φ8', 'Φ8', 78, 24
where exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'products' and column_name = 'temp_min')
on conflict (sku) do nothing;
