-- Replace per-user/per-category hex colors with named presets so the app can
-- render light/dark variants from a fixed palette.

alter table public.profiles
  drop column if exists badge_bg_color,
  drop column if exists badge_fg_color,
  add column if not exists badge_preset text not null default 'indigo';

alter table public.categories
  drop column if exists color,
  add column if not exists preset text not null default 'indigo';
