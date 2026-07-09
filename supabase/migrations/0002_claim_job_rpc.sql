-- Job-claim RPC using FOR UPDATE SKIP LOCKED (atomic claim + mark running).

create or replace function claim_next_job()
returns setof jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed uuid;
begin
  -- Atomically pick the oldest queued job not locked by another worker.
  update jobs
     set status = 'running',
         locked_at = now(),
         attempts = attempts + 1
   where id = (
     select id from jobs
      where status = 'queued'
      order by created_at
      for update skip locked
      limit 1
   )
  returning id into claimed;

  if claimed is not null then
    return query select * from jobs where id = claimed;
  end if;
end;
$$;

grant execute on function claim_next_job() to authenticated, anon, service_role;
