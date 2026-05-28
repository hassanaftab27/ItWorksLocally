-- Failsafe for the bisect-based ordering scheme. Calling this RPC for a given
-- (channel, status) pair respaces every ticket in that column to clean
-- 1000, 2000, 3000... positions, preserving the current relative order.
--
-- The client invokes this when the gap between two adjacent positions has
-- shrunk to <= 1 (the only situation in which the next bisect midpoint
-- would collide). After respacing, the client recomputes the midpoint and
-- proceeds normally.
--
-- Idempotent: if positions are already correctly spaced, the WHERE clause
-- skips the no-op rows.

create or replace function public.renumber_column(
  p_channel_id uuid,
  p_status text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.tickets t
  set position = sub.new_pos
  from (
    select id, row_number() over (order by position) * 1000 as new_pos
    from public.tickets
    where channel_id = p_channel_id and status = p_status
  ) sub
  where t.id = sub.id
    and t.position is distinct from sub.new_pos;
end;
$$;

grant execute on function public.renumber_column(uuid, text) to authenticated;
