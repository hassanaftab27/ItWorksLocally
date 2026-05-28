-- Single-row organization settings + a public storage bucket for the company
-- logo. Admins upload one logo file; everyone can read it via the public URL.

create table if not exists public.organization (
  id          int primary key default 1,
  logo_path   text,
  updated_at  timestamptz not null default now(),
  constraint organization_singleton check (id = 1)
);

insert into public.organization (id) values (1) on conflict (id) do nothing;

alter table public.organization enable row level security;

drop policy if exists "organization: read by authenticated" on public.organization;
create policy "organization: read by authenticated"
  on public.organization for select
  to authenticated
  using (true);

drop policy if exists "organization: admin update" on public.organization;
create policy "organization: admin update"
  on public.organization for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Public storage bucket for branding assets (just the logo for now).
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

drop policy if exists "branding: public read" on storage.objects;
create policy "branding: public read"
  on storage.objects for select
  using (bucket_id = 'branding');

drop policy if exists "branding: admin insert" on storage.objects;
create policy "branding: admin insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'branding' and public.is_admin());

drop policy if exists "branding: admin update" on storage.objects;
create policy "branding: admin update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'branding' and public.is_admin())
  with check (bucket_id = 'branding' and public.is_admin());

drop policy if exists "branding: admin delete" on storage.objects;
create policy "branding: admin delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'branding' and public.is_admin());
