-- R-PUB-9: at most 10 publishes per rolling 24h window, counted in publish_events.
-- publish_events rows are never removed when a wallpaper is deleted, so deleted
-- wallpapers keep counting.

create function public.publish_quota(p_user_id uuid)
returns table (lim int, used int, remaining int, next_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with recent as (
    select e.created_at
    from public.publish_events e
    where e.author_id = p_user_id
      and e.created_at > now() - interval '24 hours'
  ),
  agg as (
    select count(*)::int as used, min(created_at) as oldest from recent
  )
  select
    10,
    agg.used,
    greatest(10 - agg.used, 0),
    -- When the oldest publish in the window expires a slot frees up.
    case when agg.used >= 10 then agg.oldest + interval '24 hours' end
  from agg;
$$;

revoke execute on function public.publish_quota from public, anon, authenticated;
grant execute on function public.publish_quota to service_role;

-- The Publish screen reads the caller's own quota (never anyone else's).
create function public.my_publish_quota()
returns table (lim int, used int, remaining int, next_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.publish_quota(auth.uid());
$$;

revoke execute on function public.my_publish_quota from public, anon;
grant execute on function public.my_publish_quota to authenticated;

-- create_wallpaper now enforces the limit itself. A per-author advisory lock
-- serialises concurrent publishes so two requests cannot both take the last slot.
create or replace function public.create_wallpaper(
  p_id           uuid,
  p_author_id    uuid,
  p_title        text,
  p_categories   text[],
  p_original_key text,
  p_thumb_key    text,
  p_mime         text,
  p_width        int,
  p_height       int,
  p_size_bytes   int
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id    uuid := p_id;
  v_slugs text[] := array(select distinct unnest(coalesce(p_categories, '{}')));
begin
  if cardinality(v_slugs) not between 1 and 5 then
    raise exception 'a wallpaper needs 1 to 5 categories' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('publish:' || p_author_id::text, 0));
  if (select q.remaining from public.publish_quota(p_author_id) q) <= 0 then
    raise exception 'publish limit reached' using errcode = 'BP429';
  end if;

  insert into public.wallpapers
    (id, author_id, title, original_key, thumb_key, mime, width, height, size_bytes)
  values
    (v_id, p_author_id, nullif(btrim(p_title), ''), p_original_key, p_thumb_key, p_mime, p_width, p_height, p_size_bytes);

  -- An unknown slug violates the foreign key and rolls everything back.
  insert into public.wallpaper_categories (wallpaper_id, category_slug)
  select v_id, s from unnest(v_slugs) as s;

  insert into public.publish_events (author_id) values (p_author_id);

  return v_id;
end;
$$;
