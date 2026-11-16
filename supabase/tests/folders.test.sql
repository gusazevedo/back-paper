begin;
select plan(24);

-- Ignore whatever the local database holds; everything is rolled back at the end.
delete from auth.users;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@example.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@example.com');

-- Two wallpapers by a1, one by b2.
insert into public.wallpapers (id, author_id, original_key, thumb_key, mime, width, height, size_bytes) values
  ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000a1', 'o1', 't1', 'image/jpeg', 1080, 2340, 1),
  ('00000000-0000-0000-0000-00000000f002', '00000000-0000-0000-0000-0000000000a1', 'o2', 't2', 'image/jpeg', 1080, 2340, 1),
  ('00000000-0000-0000-0000-00000000f003', '00000000-0000-0000-0000-0000000000b2', 'o3', 't3', 'image/jpeg', 1080, 2340, 1);

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b2", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.folders (id, owner_id, name) values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b2', 'Favorites') $$,
  'a user creates a folder');

select throws_ok(
  $$ insert into public.folders (owner_id, name) values ('00000000-0000-0000-0000-0000000000b2', 'FAVORITES') $$,
  '23505', null, 'folder names are unique per user, whatever the case');

select throws_ok(
  $$ insert into public.folders (owner_id, name) values ('00000000-0000-0000-0000-0000000000b2', '') $$,
  '23514', null, 'a folder name cannot be empty');

select throws_ok(
  $$ insert into public.folders (owner_id, name) values ('00000000-0000-0000-0000-0000000000b2', repeat('x', 41)) $$,
  '23514', null, 'a folder name has at most 40 characters');

select lives_ok(
  $$ insert into public.folders (id, owner_id, name) values ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000b2', repeat('x', 40)) $$,
  '40 characters is fine');

select throws_ok(
  $$ insert into public.folders (owner_id, name) values ('00000000-0000-0000-0000-0000000000a1', 'Mine now') $$,
  '42501', null, 'users cannot create folders for someone else');

insert into public.folders (id, owner_id, name) values ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b2', 'Lock screen');

select lives_ok(
  $$ insert into public.folder_items (folder_id, wallpaper_id, added_at) values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-00000000f001', now() - interval '1 hour') $$,
  'a user saves someone else''s wallpaper');

select throws_ok(
  $$ insert into public.folder_items (folder_id, wallpaper_id) values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-00000000f001') $$,
  '23505', null, 'a wallpaper is in a folder at most once');

select lives_ok(
  $$ insert into public.folder_items (folder_id, wallpaper_id) values ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-00000000f001') $$,
  'the same wallpaper can be in several folders');

select throws_ok(
  $$ insert into public.folder_items (folder_id, wallpaper_id) values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-00000000f003') $$,
  'BP403', null, 'saving your own wallpaper is rejected');

insert into public.folder_items (folder_id, wallpaper_id) values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-00000000f002');

select results_eq(
  $$ select name, item_count, cover_thumb_key from public.my_folders() $$,
  $$ values ('Favorites'::text, 2, 't2'::text), ('Lock screen'::text, 1, 't1'::text), (repeat('x', 40), 0, null) $$,
  'my_folders lists counts and the most recently added cover, oldest folder first');

select results_eq(
  $$ select id from public.folder_wallpapers('00000000-0000-0000-0000-0000000000d1') $$,
  $$ values ('00000000-0000-0000-0000-00000000f002'::uuid), ('00000000-0000-0000-0000-00000000f001'::uuid) $$,
  'folder_wallpapers lists the most recently added first');

select results_eq(
  $$ select id from public.folder_wallpapers('00000000-0000-0000-0000-0000000000d1',
       jsonb_build_object('added_at', (select added_at from public.folder_items where folder_id = '00000000-0000-0000-0000-0000000000d1' and wallpaper_id = '00000000-0000-0000-0000-00000000f002'),
                          'id', '00000000-0000-0000-0000-00000000f002'), 1) $$,
  $$ values ('00000000-0000-0000-0000-00000000f001'::uuid) $$,
  'folder_wallpapers pages with a keyset cursor');

select throws_ok(
  $$ update public.folders set name = 'lock SCREEN' where id = '00000000-0000-0000-0000-0000000000d1' $$,
  '23505', null, 'renaming follows the same uniqueness rule');

select lives_ok(
  $$ update public.folders set name = 'FAVORITES' where id = '00000000-0000-0000-0000-0000000000d1' $$,
  'a folder can change the case of its own name');

select throws_ok(
  $$ update public.folders set owner_id = '00000000-0000-0000-0000-0000000000a1' where id = '00000000-0000-0000-0000-0000000000d1' $$,
  '42501', null, 'a folder cannot be handed to someone else');

-- a1 sees none of b2's folders and cannot touch them.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';

select is((select count(*)::int from public.folders), 0, 'folders are invisible to other users');
select is((select count(*)::int from public.folder_items), 0, 'folder items are invisible to other users');
select is((select count(*)::int from public.my_folders()), 0, 'my_folders only lists the viewer''s folders');
select is((select count(*)::int from public.folder_wallpapers('00000000-0000-0000-0000-0000000000d1')), 0, 'folder_wallpapers shows nothing of someone else''s folder');

select throws_ok(
  $$ insert into public.folder_items (folder_id, wallpaper_id) values ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-00000000f002') $$,
  '42501', null, 'users cannot add to someone else''s folder');

update public.folders set name = 'Stolen' where id = '00000000-0000-0000-0000-0000000000d1';
delete from public.folders where id = '00000000-0000-0000-0000-0000000000d1';
reset role;
select is((select name from public.folders where id = '00000000-0000-0000-0000-0000000000d1'), 'FAVORITES', 'users cannot rename someone else''s folder');
select is((select count(*)::int from public.folders where id = '00000000-0000-0000-0000-0000000000d1'), 1, 'users cannot delete someone else''s folder');

set local role anon;
select throws_ok($$ select * from public.folders $$, '42501', null, 'signed-out users cannot read folders');

select * from finish();
rollback;
