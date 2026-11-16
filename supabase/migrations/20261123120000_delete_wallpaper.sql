-- R-DEL-1, §5.1: authors delete their wallpapers; the objects leave R2 through a queue.

-- Only the author deletes. Categories, likes and folder items cascade (FKs);
-- publish_events has no FK on purpose, so the deletion still counts toward the
-- 10-per-24h limit.
create policy "authors delete their wallpapers"
  on public.wallpapers for delete to authenticated
  using (author_id = (select auth.uid()));

grant delete on public.wallpapers to authenticated;

-- No FK on purpose: rows outlive the wallpaper. Service role only.
create table public.r2_deletion_queue (
  id         bigserial primary key,
  object_key text not null,
  created_at timestamptz not null default now(),
  attempts   int not null default 0
);

create index r2_deletion_queue_pending_idx on public.r2_deletion_queue (attempts, id);

alter table public.r2_deletion_queue enable row level security;
revoke all on public.r2_deletion_queue from anon, authenticated;

-- Every deletion path (author, reports, account deletion cascade) ends here.
create function public.wallpapers_enqueue_r2_deletion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.r2_deletion_queue (object_key)
  values (old.original_key), (old.thumb_key);
  return null;
end;
$$;

create trigger wallpapers_enqueue_r2_deletion
  after delete on public.wallpapers
  for each row execute function public.wallpapers_enqueue_r2_deletion();

-- process-r2-deletions reports the keys it could not delete; they are retried
-- on later runs until they reach the attempt limit the function applies.
create function public.r2_deletions_failed(p_ids bigint[])
returns void
language sql
security definer
set search_path = ''
as $$
  update public.r2_deletion_queue set attempts = attempts + 1 where id = any (p_ids);
$$;

revoke execute on function public.r2_deletions_failed from public, anon, authenticated;
grant execute on function public.r2_deletions_failed to service_role;

-- Every 5 minutes, when there is something queued, call process-r2-deletions.
-- The URL and the shared secret live in Vault, set once per environment:
--   select vault.create_secret('<functions base url>', 'functions_url');
--   select vault.create_secret('<R2_DELETIONS_SECRET>', 'r2_deletions_secret');
create extension if not exists pg_cron;
create extension if not exists pg_net;

create function public.run_r2_deletions()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text := (select decrypted_secret from vault.decrypted_secrets where name = 'functions_url');
  v_secret text := (select decrypted_secret from vault.decrypted_secrets where name = 'r2_deletions_secret');
begin
  if v_url is null or v_secret is null then
    return;
  end if;
  if not exists (select 1 from public.r2_deletion_queue where attempts < 10) then
    return;
  end if;
  perform net.http_post(
    url := v_url || '/process-r2-deletions',
    headers := jsonb_build_object('content-type', 'application/json', 'x-r2-deletions-secret', v_secret),
    body := '{}'::jsonb
  );
end;
$$;

revoke execute on function public.run_r2_deletions from public, anon, authenticated;

select cron.schedule('process-r2-deletions', '*/5 * * * *', 'select public.run_r2_deletions()');
