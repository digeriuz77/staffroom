-- Stale-job reaper: reclaim jobs stuck in 'running' status for > 10 minutes.
-- The worker claims jobs via claim_next_job, which only selects status='queued'.
-- If the worker crashes mid-job, the job stays 'running' forever. This update,
-- prepended to claim_next_job, resets orphaned jobs back to 'queued' so they
-- get re-claimed on the next poll cycle.

create or replace function claim_next_job()
returns setof jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  reclaimed integer;
  claimed uuid;
begin
  -- Reclaim jobs stuck in 'running' for more than 10 minutes.
  update jobs
     set status = 'queued',
         locked_at = null,
         error = left(coalesce(error, '') || ' [reclaimed: stale lock]', 500)
   where status = 'running'
     and locked_at < now() - interval '10 minutes';

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
