-- tickets.position stores Date.now() values which overflow int4 (max ~2.1B).
-- bigint handles up to 9.2 * 10^18, plenty for ms-since-epoch ordering.
alter table public.tickets alter column position type bigint;
