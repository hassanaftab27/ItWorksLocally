-- Give due dates a time component. Existing date values become midnight in the
-- database session's timezone.
alter table public.tickets
  alter column due_date type timestamptz using due_date::timestamptz;
