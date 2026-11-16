-- R-LIKE-1..3: one like per user and wallpaper, never on your own wallpaper,
-- with wallpapers.like_count kept by trigger.

create table public.likes (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  wallpaper_id uuid not null references public.wallpapers (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (user_id, wallpaper_id)
);

create index likes_wallpaper_idx on public.likes (wallpaper_id);

alter table public.likes enable row level security;

-- Users only see their own likes: that is all the app needs (liked_by_me) and
-- it keeps who liked what private.
create policy "users read their own likes"
  on public.likes for select to authenticated
  using (user_id = (select auth.uid()));

create policy "users like as themselves"
  on public.likes for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "users remove their own likes"
  on public.likes for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.likes from anon, authenticated;
grant select, insert, delete on public.likes to authenticated;

-- R-LIKE-2, checked on the server whatever the client does.
create function public.likes_block_own()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.wallpapers w
    where w.id = new.wallpaper_id and w.author_id = new.user_id
  ) then
    raise exception 'you cannot like your own wallpaper' using errcode = 'BP403';
  end if;
  return new;
end;
$$;

create trigger likes_block_own
  before insert on public.likes
  for each row execute function public.likes_block_own();

-- R-LIKE-3. Security definer because users cannot update wallpapers themselves.
create function public.likes_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.wallpapers set like_count = like_count + 1 where id = new.wallpaper_id;
  else
    update public.wallpapers set like_count = greatest(like_count - 1, 0) where id = old.wallpaper_id;
  end if;
  return null;
end;
$$;

create trigger likes_count
  after insert or delete on public.likes
  for each row execute function public.likes_count();

-- The feed now says whether the viewer liked each wallpaper.
drop function public.feed(text[], text, jsonb, int);

create function public.feed(
  p_categories text[] default null,
  p_sort       text   default 'recent',
  p_cursor     jsonb  default null,
  p_limit      int    default 20
)
returns table (
  id          uuid,
  author_id   uuid,
  title       text,
  thumb_key   text,
  width       int,
  height      int,
  like_count  int,
  created_at  timestamptz,
  liked_by_me boolean
)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 20), 1), 50);
  v_all   boolean := coalesce(cardinality(p_categories), 0) = 0;
  v_me    uuid := auth.uid();
begin
  if p_sort = 'recent' then
    return query
      select w.id, w.author_id, w.title, w.thumb_key, w.width, w.height, w.like_count, w.created_at,
             exists (select 1 from public.likes l where l.wallpaper_id = w.id and l.user_id = v_me)
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
      select w.id, w.author_id, w.title, w.thumb_key, w.width, w.height, w.like_count, w.created_at,
             exists (select 1 from public.likes l where l.wallpaper_id = w.id and l.user_id = v_me)
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
