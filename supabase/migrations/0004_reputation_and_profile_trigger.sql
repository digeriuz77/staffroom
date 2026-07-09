-- Reputation increment RPC + profile auto-creation on signup.

-- Award reputation points to a user (idempotent add).
create or replace function increment_reputation(p_user uuid, p_points integer)
returns void
language sql
security definer
set search_path = public
as $$
  insert into profiles (id, reputation_points)
  values (p_user, p_points)
  on conflict (id) do update
    set reputation_points = profiles.reputation_points + excluded.reputation_points;
$$;

grant execute on function increment_reputation(uuid, integer) to service_role;

-- Auto-create a profile row when a new auth user signs up.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
