-- R-EDIT-1/2: the author changes title and categories during the first 24h.
-- Users cannot write wallpapers directly, so this is the only way in.

create function public.update_wallpaper(
  p_id         uuid,
  p_title      text,
  p_categories text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slugs   text[] := array(select distinct unnest(coalesce(p_categories, '{}')));
  v_author  uuid;
  v_created timestamptz;
begin
  select author_id, created_at into v_author, v_created
  from public.wallpapers where id = p_id
  for update;

  -- Someone else's wallpaper looks the same as a missing one.
  if v_author is null or v_author is distinct from auth.uid() then
    raise exception 'wallpaper not found' using errcode = 'P0002';
  end if;
  if v_created <= now() - interval '24 hours' then
    raise exception 'the 24-hour editing window has closed' using errcode = 'BP410';
  end if;
  if cardinality(v_slugs) not between 1 and 5 then
    raise exception 'a wallpaper needs 1 to 5 categories' using errcode = '22023';
  end if;

  -- The title check (1–60 characters) still applies; blank means no title.
  update public.wallpapers
  set title = nullif(btrim(p_title), ''), updated_at = now()
  where id = p_id;

  delete from public.wallpaper_categories where wallpaper_id = p_id;
  -- An unknown slug violates the foreign key and rolls everything back.
  insert into public.wallpaper_categories (wallpaper_id, category_slug)
  select p_id, s from unnest(v_slugs) as s;
end;
$$;

revoke execute on function public.update_wallpaper from public, anon;
grant execute on function public.update_wallpaper to authenticated;
