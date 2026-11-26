// Chạy migration + seed lên Supabase. Chạy: npm run db:migrate
// Đọc DATABASE_URL từ .env.local (Supabase → Connect → Session pooler → URI).
// Mỗi file migration chỉ chạy 1 lần (ghi lại trong bảng public._migrations). seed.sql an toàn khi chạy lại.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url || url.includes("[YOUR-")) {
  console.error("Thiếu DATABASE_URL trong .env.local (xem .env.example).");
  process.exit(1);
}

const root = path.resolve(import.meta.dirname, "..");
const migDir = path.join(root, "supabase", "migrations");
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(`create table if not exists public._migrations (
    name text primary key, applied_at timestamptz not null default now())`);
  await client.query(`alter table public._migrations enable row level security`);

  const done = new Set((await client.query("select name from public._migrations")).rows.map((r) => r.name));
  const files = fs.readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort();

  for (const f of files) {
    if (done.has(f)) {
      console.log(`  bỏ qua  ${f} (đã chạy)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(migDir, f), "utf8");
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into public._migrations (name) values ($1)", [f]);
      await client.query("commit");
      console.log(`  ✓ chạy  ${f}`);
    } catch (e) {
      await client.query("rollback");
      console.error(`  ✗ LỖI   ${f}: ${e.message}`);
      process.exit(1);
    }
  }

  if (!process.argv.includes("--no-seed")) {
    await client.query(fs.readFileSync(path.join(root, "supabase", "seed.sql"), "utf8"));
    console.log("  ✓ seed.sql");
  }

  const { rows } = await client.query(`select
    (select count(*) from public.warehouses) kho, (select count(*) from public.locations) vi_tri,
    (select count(*) from public.categories) loai, (select count(*) from public.products) mat_hang`);
  console.log("Xong:", rows[0]);
} finally {
  await client.end();
}
