-- Public feed (R-FEED-1, R-FEED-2 Recent, R-FEED-4, R-FEED-5), newest first,
-- keyset-paginated on (created_at, id). The author's own wallpapers are included.
-- p_categories: null or empty = all; otherwise wallpapers in at least one of them
-- (R-CAT-2, OR semantics), without duplicate rows.
-- Sorting by likes and hiding reported wallpapers arrive with those features.
create index if not exists wallpapers_feed_idx on public.wallpapers (created_at desc, id desc);

create function public.feed(
  p_categories text[] default null,
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
  created_at timestamptz
)
language sql
stable
set search_path = ''
as $$
  select w.id, w.author_id, w.title, w.thumb_key, w.width, w.height, w.created_at
  from public.wallpapers w
  where (
      coalesce(cardinality(p_categories), 0) = 0
      or exists (
        select 1 from public.wallpaper_categories wc
        where wc.wallpaper_id = w.id and wc.category_slug = any (p_categories)
      )
    )
    and (
      p_cursor is null
      or (w.created_at, w.id) < ((p_cursor ->> 'created_at')::timestamptz, (p_cursor ->> 'id')::uuid)
    )
  order by w.created_at desc, w.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

revoke execute on function public.feed from public, anon;
grant execute on function public.feed to authenticated;
