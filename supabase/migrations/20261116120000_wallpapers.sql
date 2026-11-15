-- Wallpapers, their categories and the publish log (R-PUB, R-CAT, §5).

create table public.categories (
  slug  text primary key,
  label text not null,
  sort  int  not null unique
);

create table public.wallpapers (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references public.profiles (id) on delete cascade,
  title        text check (title is null or char_length(title) between 1 and 60),
  original_key text not null,
  thumb_key    text not null,
  mime         text not null check (mime in ('image/jpeg', 'image/png', 'image/webp')),
  width        int  not null check (width > 0),
  height       int  not null check (height > 0),
  size_bytes   int  not null check (size_bytes > 0 and size_bytes <= 15728640),
  like_count   int  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index wallpapers_recent_idx on public.wallpapers (created_at desc, id desc);
create index wallpapers_liked_idx on public.wallpapers (like_count desc, created_at desc, id desc);
create index wallpapers_author_idx on public.wallpapers (author_id, created_at desc, id desc);

create table public.wallpaper_categories (
  wallpaper_id  uuid not null references public.wallpapers (id) on delete cascade,
  category_slug text not null references public.categories (slug),
  primary key (wallpaper_id, category_slug)
);

create index wallpaper_categories_slug_idx on public.wallpaper_categories (category_slug, wallpaper_id);

-- Counts publications for the 10-per-24h limit; survives wallpaper deletion on purpose.
create table public.publish_events (
  id         bigserial primary key,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index publish_events_author_idx on public.publish_events (author_id, created_at desc);

-- RLS --------------------------------------------------------------------

alter table public.categories enable row level security;
alter table public.wallpapers enable row level security;
alter table public.wallpaper_categories enable row level security;
alter table public.publish_events enable row level security;

create policy "categories are readable by signed-in users"
  on public.categories for select to authenticated using (true);

create policy "wallpapers are readable by signed-in users"
  on public.wallpapers for select to authenticated using (true);

create policy "wallpaper categories are readable by signed-in users"
  on public.wallpaper_categories for select to authenticated using (true);

revoke all on public.categories, public.wallpapers, public.wallpaper_categories, public.publish_events
  from anon, authenticated;
grant select on public.categories, public.wallpapers, public.wallpaper_categories to authenticated;

-- Publishing: called only by the publish-wallpaper Edge Function (service role) -------

create function public.create_wallpaper(
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

revoke execute on function public.create_wallpaper from public, anon, authenticated;
grant execute on function public.create_wallpaper to service_role;

-- Profile grid (own or public), newest first, keyset-paginated ----------------

create function public.user_wallpapers(
  p_user_id uuid,
  p_cursor  jsonb default null,
  p_limit   int   default 20
)
returns table (id uuid, title text, thumb_key text, width int, height int, created_at timestamptz)
language sql
stable
set search_path = ''
as $$
  select w.id, w.title, w.thumb_key, w.width, w.height, w.created_at
  from public.wallpapers w
  where w.author_id = p_user_id
    and (
      p_cursor is null
      or (w.created_at, w.id) < ((p_cursor ->> 'created_at')::timestamptz, (p_cursor ->> 'id')::uuid)
    )
  order by w.created_at desc, w.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

revoke execute on function public.user_wallpapers from public, anon;
grant execute on function public.user_wallpapers to authenticated;
