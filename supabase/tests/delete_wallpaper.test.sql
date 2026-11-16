begin;
select plan(13);

-- Ignore whatever the local database holds; everything is rolled back at the end.
delete from auth.users;
delete from public.r2_deletion_queue;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@example.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@example.com');

-- a1 published f001 (counted in publish_events, as create_wallpaper does).
insert into public.wallpapers (id, author_id, original_key, thumb_key, mime, width, height, size_bytes) values
  ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000a1', 'w/f001/original.jpg', 'w/f001/thumb.webp', 'image/jpeg', 1080, 2340, 1);
insert into public.wallpaper_categories (wallpaper_id, category_slug) values ('00000000-0000-0000-0000-00000000f001', 'nature');
insert into public.publish_events (author_id) values ('00000000-0000-0000-0000-0000000000a1');

-- b2 likes it and saves it in a folder.
insert into public.likes (user_id, wallpaper_id) values ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000f001');
insert into public.folders (id, owner_id, name) values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b2', 'Favorites');
insert into public.folder_items (folder_id, wallpaper_id) values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-00000000f001');

set local role authenticated;

-- b2 cannot delete it: RLS hides the row from the delete.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b2", "role": "authenticated"}';
delete from public.wallpapers where id = '00000000-0000-0000-0000-00000000f001';
select is((select count(*)::int from public.wallpapers where id = '00000000-0000-0000-0000-00000000f001'), 1, 'only the author can delete');

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
select lives_ok(
  $$ delete from public.wallpapers where id = '00000000-0000-0000-0000-00000000f001' $$,
  'the author deletes their wallpaper');
select is((select count(*)::int from public.wallpapers where id = '00000000-0000-0000-0000-00000000f001'), 0, 'the wallpaper is gone');
select is((select count(*)::int from public.feed()), 0, 'it leaves the feed');

select throws_ok($$ select * from public.r2_deletion_queue $$, '42501', null, 'users cannot read the deletion queue');

-- b2's folder no longer holds it.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b2", "role": "authenticated"}';
select is((select count(*)::int from public.folder_items), 0, 'it disappears from other users'' folders');
select results_eq($$ select item_count from public.my_folders() $$, $$ values (0) $$, 'the folder is still there, now empty');

reset role;
select is((select count(*)::int from public.wallpaper_categories where wallpaper_id = '00000000-0000-0000-0000-00000000f001'), 0, 'its categories are removed');
select is((select count(*)::int from public.likes where wallpaper_id = '00000000-0000-0000-0000-00000000f001'), 0, 'its likes are removed');

select results_eq(
  $$ select object_key, attempts from public.r2_deletion_queue order by object_key $$,
  $$ values ('w/f001/original.jpg'::text, 0), ('w/f001/thumb.webp'::text, 0) $$,
  'the original and the thumbnail are queued for R2');

select is((select count(*)::int from public.publish_events where author_id = '00000000-0000-0000-0000-0000000000a1'), 1, 'the deleted publication still counts toward the daily limit');

select public.r2_deletions_failed(array(select id from public.r2_deletion_queue where object_key like '%thumb%'));
select is((select attempts from public.r2_deletion_queue where object_key = 'w/f001/thumb.webp'), 1, 'failed deletions count their attempts');

set local role authenticated;
select throws_ok($$ select public.r2_deletions_failed('{1}') $$, '42501', null, 'only the service role reports failures');

select * from finish();
rollback;
