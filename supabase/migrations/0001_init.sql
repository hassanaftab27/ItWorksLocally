-- ItWorksLocally: initial schema, RLS, and triggers
-- Target: Supabase Postgres (hosted)

-- =========================================================================
-- Tables
-- =========================================================================

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  full_name   text,
  role        text not null check (role in ('admin', 'member')),
  created_at  timestamptz not null default now()
);

create table public.channels (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique
               check (name = lower(name) and name ~ '^[a-z0-9][a-z0-9_-]{0,49}$'),
  description  text,
  created_at   timestamptz not null default now(),
  created_by   uuid references public.profiles(id) on delete set null
);

create table public.channel_members (
  channel_id  uuid not null references public.channels(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  added_at    timestamptz not null default now(),
  primary key (channel_id, user_id)
);

create table public.tickets (
  id              uuid primary key default gen_random_uuid(),
  channel_id      uuid not null references public.channels(id) on delete cascade,
  title           text not null check (length(title) between 1 and 200),
  description     text,
  type            text not null check (type in ('task', 'bug')),
  status          text not null check (status in (
                    'work', 'working', 'working_q', 'works_locally', 'works_everywhere'
                  )),
  position        int  not null default 0,
  created_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id) on delete set null,
  last_edited_at  timestamptz,
  last_edited_by  uuid references public.profiles(id) on delete set null,
  last_moved_at   timestamptz,
  last_moved_by   uuid references public.profiles(id) on delete set null
);

create index tickets_channel_status_idx on public.tickets (channel_id, status, position);

create table public.ticket_assignees (
  ticket_id  uuid not null references public.tickets(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  primary key (ticket_id, user_id)
);

-- Reserved for future cloud-storage attachments. No UI in v1.
create table public.ticket_attachments (
  id           uuid primary key default gen_random_uuid(),
  ticket_id    uuid not null references public.tickets(id) on delete cascade,
  provider     text,
  external_id  text,
  name         text,
  added_by     uuid references public.profiles(id) on delete set null,
  added_at     timestamptz not null default now()
);

-- =========================================================================
-- Helper functions (SECURITY DEFINER so they can read profiles inside RLS)
-- =========================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_channel_member(p_channel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1 from public.channel_members
      where channel_id = p_channel_id and user_id = auth.uid()
    );
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_channel_member(uuid) to authenticated;

-- =========================================================================
-- Triggers: auto-fill audit columns on tickets
-- =========================================================================

create or replace function public.tickets_before_insert()
returns trigger
language plpgsql
as $$
begin
  new.created_by := coalesce(new.created_by, auth.uid());
  new.created_at := now();
  new.last_edited_at := null;
  new.last_edited_by := null;
  new.last_moved_at := null;
  new.last_moved_by := null;
  return new;
end;
$$;

create trigger tickets_before_insert
  before insert on public.tickets
  for each row execute function public.tickets_before_insert();

create or replace function public.tickets_before_update()
returns trigger
language plpgsql
as $$
begin
  -- column moves
  if new.status is distinct from old.status then
    new.last_moved_at := now();
    new.last_moved_by := auth.uid();
  end if;

  -- content edits (ignore pure reorders and column moves)
  if new.title is distinct from old.title
     or new.description is distinct from old.description
     or new.type is distinct from old.type then
    new.last_edited_at := now();
    new.last_edited_by := auth.uid();
  end if;

  return new;
end;
$$;

create trigger tickets_before_update
  before update on public.tickets
  for each row execute function public.tickets_before_update();

-- =========================================================================
-- Trigger: when a user is removed from a channel, drop their assignments
-- on that channel's tickets (history stays in last_*_by, only live
-- assignments are cleared)
-- =========================================================================

create or replace function public.channel_members_after_delete()
returns trigger
language plpgsql
as $$
begin
  delete from public.ticket_assignees ta
  using public.tickets t
  where ta.ticket_id = t.id
    and ta.user_id   = old.user_id
    and t.channel_id = old.channel_id;
  return old;
end;
$$;

create trigger channel_members_after_delete
  after delete on public.channel_members
  for each row execute function public.channel_members_after_delete();

-- =========================================================================
-- Row Level Security
-- =========================================================================

alter table public.profiles          enable row level security;
alter table public.channels          enable row level security;
alter table public.channel_members   enable row level security;
alter table public.tickets           enable row level security;
alter table public.ticket_assignees  enable row level security;
alter table public.ticket_attachments enable row level security;

-- profiles ----------------------------------------------------------------
create policy "profiles: read by any authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles: self update limited fields"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (
    -- role can only be changed by admins
    (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()))
    or public.is_admin()
  );

-- INSERT/DELETE on profiles is done by the admin-ops Edge Function using
-- the service role key, which bypasses RLS entirely. No public policies.

-- channels ----------------------------------------------------------------
create policy "channels: read by any authenticated"
  on public.channels for select
  to authenticated
  using (true);

create policy "channels: admin insert"
  on public.channels for insert
  to authenticated
  with check (public.is_admin());

create policy "channels: admin update"
  on public.channels for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "channels: admin delete"
  on public.channels for delete
  to authenticated
  using (public.is_admin());

-- channel_members ---------------------------------------------------------
create policy "channel_members: read by any authenticated"
  on public.channel_members for select
  to authenticated
  using (true);

create policy "channel_members: admin insert"
  on public.channel_members for insert
  to authenticated
  with check (public.is_admin());

create policy "channel_members: admin delete"
  on public.channel_members for delete
  to authenticated
  using (public.is_admin());

-- tickets -----------------------------------------------------------------
create policy "tickets: read by any authenticated"
  on public.tickets for select
  to authenticated
  using (true);

create policy "tickets: members insert"
  on public.tickets for insert
  to authenticated
  with check (public.is_channel_member(channel_id));

create policy "tickets: members update"
  on public.tickets for update
  to authenticated
  using (public.is_channel_member(channel_id))
  with check (public.is_channel_member(channel_id));

create policy "tickets: admin delete"
  on public.tickets for delete
  to authenticated
  using (public.is_admin());

-- ticket_assignees --------------------------------------------------------
create policy "ticket_assignees: read by any authenticated"
  on public.ticket_assignees for select
  to authenticated
  using (true);

create policy "ticket_assignees: members insert"
  on public.ticket_assignees for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.tickets t
      where t.id = ticket_id
        and public.is_channel_member(t.channel_id)
        and exists (
          select 1 from public.channel_members cm
          where cm.channel_id = t.channel_id
            and cm.user_id    = ticket_assignees.user_id
        )
    )
  );

create policy "ticket_assignees: members delete"
  on public.ticket_assignees for delete
  to authenticated
  using (
    exists (
      select 1
      from public.tickets t
      where t.id = ticket_id
        and public.is_channel_member(t.channel_id)
    )
  );

-- ticket_attachments (stub) ----------------------------------------------
create policy "ticket_attachments: read by any authenticated"
  on public.ticket_attachments for select
  to authenticated
  using (true);

create policy "ticket_attachments: members insert"
  on public.ticket_attachments for insert
  to authenticated
  with check (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_id and public.is_channel_member(t.channel_id)
    )
  );

create policy "ticket_attachments: members delete"
  on public.ticket_attachments for delete
  to authenticated
  using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_id and public.is_channel_member(t.channel_id)
    )
  );
