-- Profile badge colors (drawn as colored circle with initials on tickets).
alter table public.profiles
  add column if not exists badge_bg_color text not null default '#3b82f6',
  add column if not exists badge_fg_color text not null default '#ffffff';

-- Tickets no longer carry a long-form description; title + type + status is enough.
alter table public.tickets drop column if exists description;

-- Keep profiles.email in sync with auth.users.email so that when a user
-- changes their email (auth.updateUser -> confirmation -> auth.users.email
-- updates), the profile mirror updates automatically.
create or replace function public.sync_profile_email_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.email is distinct from OLD.email then
    update public.profiles
      set email = NEW.email
      where id = NEW.id;
  end if;
  return NEW;
end;
$$;

drop trigger if exists on_auth_user_email_change on auth.users;
create trigger on_auth_user_email_change
  after update of email on auth.users
  for each row execute function public.sync_profile_email_from_auth();
