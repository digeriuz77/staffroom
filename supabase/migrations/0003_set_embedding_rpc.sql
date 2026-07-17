-- Set a reddit post embedding from a float array (pgvector cast).

create or replace function set_post_embedding(p_id text, p_vec double precision[])
returns void
language sql
security definer
set search_path = public
as $$
  update reddit_posts
     set embedding = p_vec::vector
   where id = p_id;
$$;

grant execute on function set_post_embedding(text, double precision[]) to service_role;
