-- Allow assigning tickets to admins. Admins are implicit channel members
-- (no row in channel_members), so the previous policy rejected the insert
-- with "new row violates row-level security" when the assignee was an admin.

drop policy if exists "ticket_assignees: members insert" on public.ticket_assignees;

create policy "ticket_assignees: members insert"
  on public.ticket_assignees for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.tickets t
      where t.id = ticket_id
        and public.is_channel_member(t.channel_id)
        and (
          exists (
            select 1 from public.channel_members cm
            where cm.channel_id = t.channel_id
              and cm.user_id    = ticket_assignees.user_id
          )
          or exists (
            select 1 from public.profiles p
            where p.id = ticket_assignees.user_id
              and p.role = 'admin'
          )
        )
    )
  );
