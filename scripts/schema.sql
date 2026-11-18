-- DumpSpot database, for a fresh Supabase project.
-- Same tables and columns the site has always used (see js/data/db.js). Run it once in the
-- Supabase SQL editor, then set DB_URL and DB_KEY (the anon key) in Netlify and in config.js.
-- The site only ever SELECTs and INSERTs, so the policies below allow exactly that.

create table if not exists public.reports (
  id        text primary key,
  reporter  text not null,
  state     text not null,
  area      text not null,
  specific  text not null,
  type      text[] default '{}',
  cats      text[] default '{}',
  sev       text[] default '{}',
  notes     text,
  lat       double precision not null,
  lng       double precision not null,
  digipin   text,
  pluscode  text,
  ts        timestamptz not null default now()
);

create table if not exists public.report_photos (
  report_id text not null references public.reports(id) on delete cascade,
  url       text not null,
  position  int  not null,
  primary key (report_id, position)
);

create index if not exists reports_ts_idx on public.reports (ts desc);

alter table public.reports enable row level security;
alter table public.report_photos enable row level security;

drop policy if exists "read reports" on public.reports;
create policy "read reports" on public.reports for select to anon using (true);
drop policy if exists "file reports" on public.reports;
create policy "file reports" on public.reports for insert to anon with check (true);

drop policy if exists "read photos" on public.report_photos;
create policy "read photos" on public.report_photos for select to anon using (true);
drop policy if exists "add photos" on public.report_photos;
create policy "add photos" on public.report_photos for insert to anon with check (true);

-- Photos: a public bucket, upload-only for visitors.
insert into storage.buckets (id, name, public) values ('report-photos', 'report-photos', true)
  on conflict (id) do nothing;
drop policy if exists "upload report photos" on storage.objects;
create policy "upload report photos" on storage.objects for insert to anon
  with check (bucket_id = 'report-photos');
drop policy if exists "read report photos" on storage.objects;
create policy "read report photos" on storage.objects for select to anon
  using (bucket_id = 'report-photos');
