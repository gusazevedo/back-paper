begin;
select plan(14);

-- Ignore whatever the local database holds; everything is rolled back at the end.
delete from auth.users;
delete from public.r2_deletion_queue;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@example.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@example.com');

-- a1 (the account to delete) published f001 and f002; b2 published f003.
insert into public.wallpapers (id, author_id, original_key, thumb_key, mime, width, height, size_bytes) values
  ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000a1', 'w/f001/original.jpg', 'w/f001/thumb.webp', 'image/jpeg', 1080, 2340, 1),
  ('00000000-0000-0000-0000-00000000f002', '00000000-0000-0000-0000-0000000000a1', 'w/f002/original.png', 'w/f002/thumb.webp', 'image/png', 1080, 2340, 1),
  ('00000000-0000-0000-0000-00000000f003', '00000000-0000-0000-0000-0000000000b2', 'w/f003/original.jpg', 'w/f003/thumb.webp', 'image/jpeg', 1080, 2340, 1);
insert into public.publish_events (author_id) values ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000a1');

-- Likes given and received.
insert into public.likes (user_id, wallpaper_id) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000f003'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000f001');

-- Folders: a1's own, and b2's holding a1's wallpaper and b2's own pick.
insert into public.folders (id, owner_id, name) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1', 'Mine'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000b2', 'Favorites');
insert into public.folder_items (folder_id, wallpaper_id) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000f003'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-00000000f001');

-- Reports made and received.
insert into public.reports (reporter_id, wallpaper_id, reason) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000f003', 'other'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000f002', 'spam_low_quality');

select is((select like_count from public.wallpapers where id = '00000000-0000-0000-0000-00000000f003'), 1, 'b2''s wallpaper starts with a1''s like');

-- What delete-account does through the Admin API.
delete from auth.users where id = '00000000-0000-0000-0000-0000000000a1';

select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'), 0, 'the profile is gone');
select is((select count(*)::int from public.wallpapers where author_id = '00000000-0000-0000-0000-0000000000a1'), 0, 'their wallpapers are gone');
select is((select count(*)::int from public.wallpapers), 1, 'other people''s wallpapers stay');
select is((select count(*)::int from public.likes), 0, 'likes given and received are gone');
select is((select like_count from public.wallpapers where id = '00000000-0000-0000-0000-00000000f003'), 0, 'like counts drop with the likes they gave');
select is((select count(*)::int from public.folders where owner_id = '00000000-0000-0000-0000-0000000000a1'), 0, 'their folders are gone');
select is((select count(*)::int from public.folders), 1, 'other people''s folders stay');
select is((select count(*)::int from public.folder_items where folder_id = '00000000-0000-0000-0000-0000000000e2'), 0, 'their wallpapers disappear from other people''s folders');
select is((select count(*)::int from public.reports), 0, 'reports made and received are gone');
select is((select count(*)::int from public.publish_events), 0, 'their publish log is gone');
select results_eq(
  $$ select object_key from public.r2_deletion_queue order by object_key $$,
  $$ values ('w/f001/original.jpg'::text), ('w/f001/thumb.webp'::text), ('w/f002/original.png'::text), ('w/f002/thumb.webp'::text) $$,
  'every object of every wallpaper they published is queued for R2');

-- Signed-in users cannot delete accounts themselves; only the Edge Function (service role) can.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b2", "role": "authenticated"}';
select throws_ok($$ delete from auth.users $$, '42501', null, 'users cannot delete auth users directly');
select throws_ok($$ delete from public.profiles $$, '42501', null, 'users cannot delete profiles directly');

select * from finish();
rollback;
