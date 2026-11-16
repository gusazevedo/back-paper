-- R-FOLD-1..7: private folders of other users' wallpapers.

create table public.folders (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  -- R-FOLD-2: 1–40 characters, stored trimmed.
  name       text not null check (name = btrim(name) and char_length(name) between 1 and 40),
  created_at timestamptz not null default now()
);

-- R-FOLD-2: unique per user, whatever the letter case.
create unique index folders_owner_name_idx on public.folders (owner_id, lower(name));

create table public.folder_items (
  folder_id    uuid not null references public.folders (id) on delete cascade,
  wallpaper_id uuid not null references public.wallpapers (id) on delete cascade,
  added_at     timestamptz not null default now(),
  -- R-FOLD-5: in many folders, at most once per folder.
  primary key (folder_id, wallpaper_id)
);

create index folder_items_recent_idx on public.folder_items (folder_id, added_at desc, wallpaper_id desc);
create index folder_items_wallpaper_idx on public.folder_items (wallpaper_id);

-- RLS: R-FOLD-1, only the owner reads or writes ------------------------------

alter table public.folders enable row level security;
alter table public.folder_items enable row level security;

create policy "owners read their folders"
  on public.folders for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "owners create their folders"
  on public.folders for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "owners rename their folders"
  on public.folders for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "owners delete their folders"
  on public.folders for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "owners read their folder items"
  on public.folder_items for select to authenticated
  using (exists (
    select 1 from public.folders f
    where f.id = folder_id and f.owner_id = (select auth.uid())));

create policy "owners add to their folders"
  on public.folder_items for insert to authenticated
  with check (exists (
    select 1 from public.folders f
    where f.id = folder_id and f.owner_id = (select auth.uid())));

create policy "owners remove from their folders"
  on public.folder_items for delete to authenticated
  using (exists (
    select 1 from public.folders f
    where f.id = folder_id and f.owner_id = (select auth.uid())));

revoke all on public.folders, public.folder_items from anon, authenticated;
grant select, insert, delete on public.folders to authenticated;
grant update (name) on public.folders to authenticated;
grant select, insert, delete on public.folder_items to authenticated;

-- R-FOLD-6: your own wallpapers cannot go in your folders, whatever the client does.
create function public.folder_items_block_own()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.folders f
    join public.wallpapers w on w.id = new.wallpaper_id
    where f.id = new.folder_id and w.author_id = f.owner_id
  ) then
    raise exception 'you cannot save your own wallpaper' using errcode = 'BP403';
  end if;
  return new;
end;
$$;

create trigger folder_items_block_own
  before insert on public.folder_items
  for each row execute function public.folder_items_block_own();

-- Reads -------------------------------------------------------------------

-- The viewer's folders, oldest first, with their size and cover (R-FOLD-4:
-- the most recently added wallpaper). Security invoker: RLS does the filtering.
create function public.my_folders()
returns table (
  id              uuid,
  name            text,
  item_count      int,
  cover_thumb_key text,
  created_at      timestamptz
)
language sql
stable
set search_path = ''
as $$
  select f.id, f.name,
         (select count(*)::int from public.folder_items i where i.folder_id = f.id),
         (select w.thumb_key
            from public.folder_items i
            join public.wallpapers w on w.id = i.wallpaper_id
           where i.folder_id = f.id
           order by i.added_at desc, i.wallpaper_id desc
           limit 1),
         f.created_at
  from public.folders f
  order by f.created_at, f.id;
$$;

-- One folder's wallpapers, most recently added first, keyset on (added_at, id).
create function public.folder_wallpapers(
  p_folder_id uuid,
  p_cursor    jsonb default null,
  p_limit     int   default 20
)
returns table (
  id        uuid,
  title     text,
  thumb_key text,
  width     int,
  height    int,
  added_at  timestamptz
)
language sql
stable
set search_path = ''
as $$
  select w.id, w.title, w.thumb_key, w.width, w.height, i.added_at
  from public.folder_items i
  join public.wallpapers w on w.id = i.wallpaper_id
  where i.folder_id = p_folder_id
    and (p_cursor is null
         or (i.added_at, i.wallpaper_id)
            < ((p_cursor ->> 'added_at')::timestamptz, (p_cursor ->> 'id')::uuid))
  order by i.added_at desc, i.wallpaper_id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

revoke execute on function public.my_folders, public.folder_wallpapers from public, anon;
grant execute on function public.my_folders, public.folder_wallpapers to authenticated;
