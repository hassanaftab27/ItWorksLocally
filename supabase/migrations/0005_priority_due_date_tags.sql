-- Restore tickets.description (kept hidden on the kanban card, shown in modal/list).
alter table public.tickets add column if not exists description text;

-- Priority (low | medium | high | critical), default medium.
alter table public.tickets
  add column if not exists priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'critical'));

-- Optional due date.
alter table public.tickets add column if not exists due_date date;

-- Global tag pool (shared across all channels).
create table if not exists public.tags (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  color       text not null default '#6366f1',
  created_at  timestamptz not null default now(),
  created_by  uuid references public.profiles(id) on delete set null
);

create unique index if not exists tags_name_lower_unique on public.tags (lower(name));

-- Junction: which tags are on which tickets.
create table if not exists public.ticket_tags (
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  tag_id    uuid not null references public.tags(id)    on delete cascade,
  primary key (ticket_id, tag_id)
);

create index if not exists ticket_tags_tag_idx    on public.ticket_tags (tag_id);
create index if not exists ticket_tags_ticket_idx on public.ticket_tags (ticket_id);

-- Auto-fill tags.created_by with auth.uid() on insert.
create or replace function public.tags_before_insert()
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

drop trigger if exists tags_before_insert on public.tags;
create trigger tags_before_insert
  before insert on public.tags
  for each row execute function public.tags_before_insert();

-- RLS
alter table public.tags        enable row level security;
alter table public.ticket_tags enable row level security;

-- tags: anyone signed in can read and create; only admins can edit/delete.
create policy "tags: read any authenticated"
  on public.tags for select
  to authenticated
  using (true);

create policy "tags: insert any authenticated"
  on public.tags for insert
  to authenticated
  with check (true);

create policy "tags: admin update"
  on public.tags for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "tags: admin delete"
  on public.tags for delete
  to authenticated
  using (public.is_admin());

-- ticket_tags: anyone signed in can read; channel members (incl. admins) can insert/delete
-- tags on tickets in their channel.
create policy "ticket_tags: read any authenticated"
  on public.ticket_tags for select
  to authenticated
  using (true);

create policy "ticket_tags: members insert"
  on public.ticket_tags for insert
  to authenticated
  with check (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_id
        and public.is_channel_member(t.channel_id)
    )
  );

create policy "ticket_tags: members delete"
  on public.ticket_tags for delete
  to authenticated
  using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_id
        and public.is_channel_member(t.channel_id)
    )
  );
