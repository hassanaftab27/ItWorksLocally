-- Replace tags (multi-select per ticket) with categories (single-select per ticket).
drop table if exists public.ticket_tags;
drop table if exists public.tags;

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  color       text not null default '#6366f1',
  created_at  timestamptz not null default now(),
  created_by  uuid references public.profiles(id) on delete set null
);

create unique index if not exists categories_name_lower_unique
  on public.categories (lower(name));

create or replace function public.categories_before_insert()
returns trigger
language plpgsql
as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists categories_before_insert on public.categories;
create trigger categories_before_insert
  before insert on public.categories
  for each row execute function public.categories_before_insert();

alter table public.tickets
  add column if not exists category_id uuid references public.categories(id) on delete set null,
  add column if not exists progress int not null default 0
    check (progress >= 0 and progress <= 100);

alter table public.categories enable row level security;

create policy "categories: read by any authenticated"
  on public.categories for select
  to authenticated
  using (true);

create policy "categories: admin insert"
  on public.categories for insert
  to authenticated
  with check (public.is_admin());

create policy "categories: admin update"
  on public.categories for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "categories: admin delete"
  on public.categories for delete
  to authenticated
  using (public.is_admin());
