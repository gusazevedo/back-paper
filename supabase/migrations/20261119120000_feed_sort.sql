-- R-FEED-2 Most liked + R-FEED-3: the feed takes a sort, combinable with the
-- category filter. Each sort has its own keyset:
--   recent: (created_at, id) desc
--   liked:  (like_count, created_at, id) desc, over the whole history
-- Rows now carry like_count so the client can build the "liked" cursor.
-- like_count can change between pages; a wallpaper may then repeat or be
-- skipped once, which is acceptable for the MVP.

drop function public.feed(text[], jsonb, int);

create function public.feed(
  p_categories text[] default null,
  p_sort       text   default 'recent',
  p_cursor     jsonb  default null,
  p_limit      int    default 20
)
returns table (
  id         uuid,
  author_id  uuid,
  title      text,
  thumb_key  text,
  width      int,
  height     int,
  like_count int,
  created_at timestamptz
)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 20), 1), 50);
  v_all   boolean := coalesce(cardinality(p_categories), 0) = 0;
begin
  if p_sort = 'recent' then
    return query
      select w.id, w.author_id, w.title, w.thumb_key, w.width, w.height, w.like_count, w.created_at
      from public.wallpapers w
      where (v_all or exists (
              select 1 from public.wallpaper_categories wc
              where wc.wallpaper_id = w.id and wc.category_slug = any (p_categories)))
        and (p_cursor is null
             or (w.created_at, w.id)
                < ((p_cursor ->> 'created_at')::timestamptz, (p_cursor ->> 'id')::uuid))
      order by w.created_at desc, w.id desc
      limit v_limit;
  elsif p_sort = 'liked' then
    return query
      select w.id, w.author_id, w.title, w.thumb_key, w.width, w.height, w.like_count, w.created_at
      from public.wallpapers w
      where (v_all or exists (
              select 1 from public.wallpaper_categories wc
              where wc.wallpaper_id = w.id and wc.category_slug = any (p_categories)))
        and (p_cursor is null
             or (w.like_count, w.created_at, w.id)
                < ((p_cursor ->> 'like_count')::int,
                   (p_cursor ->> 'created_at')::timestamptz,
                   (p_cursor ->> 'id')::uuid))
      order by w.like_count desc, w.created_at desc, w.id desc
      limit v_limit;
  else
    raise exception 'unknown sort %', p_sort using errcode = '22023';
  end if;
end;
$$;

revoke execute on function public.feed from public, anon;
grant execute on function public.feed to authenticated;

-- "Show N wallpapers" in the Categories sheet: how many the filter matches.
create function public.feed_count(p_categories text[] default null)
returns int
language sql
stable
set search_path = ''
as $$
  select count(*)::int
  from public.wallpapers w
  where coalesce(cardinality(p_categories), 0) = 0
     or exists (
       select 1 from public.wallpaper_categories wc
       where wc.wallpaper_id = w.id and wc.category_slug = any (p_categories));
$$;

revoke execute on function public.feed_count from public, anon;
grant execute on function public.feed_count to authenticated;
