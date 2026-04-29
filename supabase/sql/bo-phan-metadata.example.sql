-- Gợi ý: khi muốn quản lý intro bộ phận trong Supabase thay vì map trong code,
-- tạo bảng lookup và join theo `bo_phan` (hoặc slug chuẩn), ví dụ:

/*
create table if not exists public.cins_bo_phan_meta (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  intro_vi text not null,
  sort_hint int,
  updated_at timestamptz default now()
);

alter table public.cins_bo_phan_meta enable row level security;
create policy "read anon"
  on public.cins_bo_phan_meta for select
  to anon
  using (true);
*/
