begin;
select plan(19);

-- Ignore whatever the local database holds; everything is rolled back at the end.
delete from auth.users;
delete from public.r2_deletion_queue;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@example.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@example.com'),
  ('00000000-0000-0000-0000-0000000000c3', 'c@example.com'),
  ('00000000-0000-0000-0000-0000000000d4', 'd@example.com');

-- a1 published f001 and f002.
insert into public.wallpapers (id, author_id, original_key, thumb_key, mime, width, height, size_bytes) values
  ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000a1', 'w/f001/original.jpg', 'w/f001/thumb.webp', 'image/jpeg', 1080, 2340, 1),
  ('00000000-0000-0000-0000-00000000f002', '00000000-0000-0000-0000-0000000000a1', 'w/f002/original.jpg', 'w/f002/thumb.webp', 'image/jpeg', 1080, 2340, 1);

-- b2 saved f001 in a folder before reporting it.
insert into public.folders (id, owner_id, name) values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b2', 'Favorites');
insert into public.folder_items (folder_id, wallpaper_id) values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000f001');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b2", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.reports (reporter_id, wallpaper_id, reason) values ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000f001', 'spam_low_quality') $$,
  'a user reports someone else''s wallpaper');

select throws_ok(
  $$ insert into public.reports (reporter_id, wallpaper_id, reason) values ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000f001', 'other') $$,
  '23505', null, 'one report per user and wallpaper');

select throws_ok(
  $$ insert into public.reports (reporter_id, wallpaper_id, reason) values ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000f002', 'rude') $$,
  '22P02', null, 'only the fixed reasons are accepted');

select throws_ok(
  $$ insert into public.reports (reporter_id, wallpaper_id, reason) values ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-00000000f002', 'other') $$,
  '42501', null, 'users cannot report on behalf of someone else');

-- R-FEED-6: gone for b2 everywhere.
select is((select array_agg(id::text) from public.feed()), array['00000000-0000-0000-0000-00000000f002'], 'it leaves the reporter''s feed');
select is(public.feed_count(null), 1, 'and the feed count');
select is((select count(*)::int from public.user_wallpapers('00000000-0000-0000-0000-0000000000a1')), 1, 'and the author''s public profile');
select is((select count(*)::int from public.folder_wallpapers('00000000-0000-0000-0000-0000000000e1')), 0, 'and the reporter''s folders');
select results_eq($$ select item_count, cover_thumb_key from public.my_folders() $$, $$ values (0, null::text) $$, 'folder counts and covers skip it');
select is((select count(*)::int from public.wallpapers where id = '00000000-0000-0000-0000-00000000f001'), 0, 'and the detail');

-- Others still see it.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000c3", "role": "authenticated"}';
select is((select count(*)::int from public.feed()), 2, 'other users still see it');
select is((select count(*)::int from public.reports), 0, 'users only read their own reports');

-- The author cannot report their own.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
select throws_ok(
  $$ insert into public.reports (reporter_id, wallpaper_id, reason) values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000f001', 'other') $$,
  'BP403', null, 'reporting your own wallpaper is rejected');

-- Second report: still there.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000c3", "role": "authenticated"}';
insert into public.reports (reporter_id, wallpaper_id, reason) values ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-00000000f001', 'copyright');
reset role;
select is((select count(*)::int from public.wallpapers where id = '00000000-0000-0000-0000-00000000f001'), 1, 'two reports do not delete it');

-- Third report, any reason: deleted for everyone, the same way as the author deleting it.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d4", "role": "authenticated"}';
select lives_ok(
  $$ insert into public.reports (reporter_id, wallpaper_id, reason) values ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-00000000f001', 'violence_gore') $$,
  'the third report goes through');

reset role;
select is((select count(*)::int from public.wallpapers where id = '00000000-0000-0000-0000-00000000f001'), 0, 'the third report deletes the wallpaper');
select is((select count(*)::int from public.reports), 0, 'its reports go with it');
select is((select count(*)::int from public.folder_items), 0, 'and it leaves every folder');
select results_eq(
  $$ select object_key from public.r2_deletion_queue order by object_key $$,
  $$ values ('w/f001/original.jpg'::text), ('w/f001/thumb.webp'::text) $$,
  'its objects are queued for R2');

select * from finish();
rollback;
