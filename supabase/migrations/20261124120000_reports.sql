-- R-REP-1..4, R-FEED-6: reports with fixed reasons; 3 reports delete the wallpaper.

create type public.report_reason as enum (
  'nudity_sexual', 'violence_gore', 'hate_harassment', 'copyright', 'spam_low_quality', 'other'
);

create table public.reports (
  reporter_id  uuid not null references public.profiles (id) on delete cascade,
  wallpaper_id uuid not null references public.wallpapers (id) on delete cascade,
  reason       public.report_reason not null,
  created_at   timestamptz not null default now(),
  -- R-REP-2: one report per user and wallpaper.
  primary key (reporter_id, wallpaper_id)
);

create index reports_wallpaper_idx on public.reports (wallpaper_id);

alter table public.reports enable row level security;

create policy "users read their own reports"
  on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()));

create policy "users report as themselves"
  on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));

revoke all on public.reports from anon, authenticated;
grant select, insert on public.reports to authenticated;

-- R-REP-2: never your own wallpaper, whatever the client does.
create function public.reports_block_own()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.wallpapers w
    where w.id = new.wallpaper_id and w.author_id = new.reporter_id
  ) then
    raise exception 'you cannot report your own wallpaper' using errcode = 'BP403';
  end if;
  return new;
end;
$$;

create trigger reports_block_own
  before insert on public.reports
  for each row execute function public.reports_block_own();

-- R-REP-4: the third report (any reason) deletes the wallpaper for everyone,
-- the same way as the author deleting it: cascades plus the R2 queue trigger.
-- No notice to the author and no audit log (MVP decision).
create function public.reports_delete_at_three()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.reports where wallpaper_id = new.wallpaper_id) >= 3 then
    delete from public.wallpapers where id = new.wallpaper_id;
  end if;
  return null;
end;
$$;

create trigger reports_delete_at_three
  after insert on public.reports
  for each row execute function public.reports_delete_at_three();

-- R-FEED-6 / R-REP-3: a wallpaper you reported is gone for you everywhere
-- (feed, public profiles, folders, detail). Every read RPC runs as the caller,
-- so they all go through this policy.
drop policy "wallpapers are readable by signed-in users" on public.wallpapers;

create policy "signed-in users read wallpapers they have not reported"
  on public.wallpapers for select to authenticated
  using (not exists (
    select 1 from public.reports r
    where r.wallpaper_id = wallpapers.id and r.reporter_id = (select auth.uid())));

-- Folder counts now only count what the viewer can see.
create or replace function public.my_folders()
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
         (select count(*)::int
            from public.folder_items i
            join public.wallpapers w on w.id = i.wallpaper_id
           where i.folder_id = f.id),
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
