begin;
select plan(11);

-- Ignore whatever the local database holds; everything is rolled back at the end.
delete from auth.users;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@example.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@example.com');

-- a1 published f001 an hour ago and f002 25 hours ago.
insert into public.wallpapers (id, author_id, title, original_key, thumb_key, mime, width, height, size_bytes, created_at) values
  ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000a1', 'Old title', 'o1', 't1', 'image/jpeg', 1080, 2340, 1, now() - interval '1 hour'),
  ('00000000-0000-0000-0000-00000000f002', '00000000-0000-0000-0000-0000000000a1', 'Too late', 'o2', 't2', 'image/jpeg', 1080, 2340, 1, now() - interval '25 hours');
insert into public.wallpaper_categories (wallpaper_id, category_slug) values
  ('00000000-0000-0000-0000-00000000f001', 'nature'),
  ('00000000-0000-0000-0000-00000000f002', 'nature');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';

select lives_ok(
  $$ select public.update_wallpaper('00000000-0000-0000-0000-00000000f001', '  New title  ', array['dark', 'ai', 'dark']) $$,
  'the author edits within 24 hours');

select is((select title from public.wallpapers where id = '00000000-0000-0000-0000-00000000f001'), 'New title', 'the title is trimmed and saved');
select results_eq(
  $$ select category_slug from public.wallpaper_categories where wallpaper_id = '00000000-0000-0000-0000-00000000f001' order by 1 $$,
  $$ values ('ai'::text), ('dark'::text) $$,
  'the categories are replaced, without duplicates');

select lives_ok(
  $$ select public.update_wallpaper('00000000-0000-0000-0000-00000000f001', '', array['ai']) $$,
  'editing again is fine, and the title can be cleared');
select is((select title from public.wallpapers where id = '00000000-0000-0000-0000-00000000f001'), null, 'a blank title means no title');

select throws_ok(
  $$ select public.update_wallpaper('00000000-0000-0000-0000-00000000f001', 'x', '{}') $$,
  '22023', null, 'at least one category');
select throws_ok(
  $$ select public.update_wallpaper('00000000-0000-0000-0000-00000000f001', 'x', array['ai', 'dark', 'nature', 'light', 'abstract', 'space']) $$,
  '22023', null, 'at most five categories');
select throws_ok(
  $$ select public.update_wallpaper('00000000-0000-0000-0000-00000000f001', repeat('x', 61), array['ai']) $$,
  '23514', null, 'titles have at most 60 characters');

select throws_ok(
  $$ select public.update_wallpaper('00000000-0000-0000-0000-00000000f002', 'x', array['ai']) $$,
  'BP410', null, 'after 24 hours the edit is rejected');

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b2", "role": "authenticated"}';
select throws_ok(
  $$ select public.update_wallpaper('00000000-0000-0000-0000-00000000f001', 'Mine now', array['ai']) $$,
  'P0002', null, 'only the author can edit');

reset role;
set local role anon;
select throws_ok(
  $$ select public.update_wallpaper('00000000-0000-0000-0000-00000000f001', 'x', array['ai']) $$,
  '42501', null, 'signed-out users cannot edit');

select * from finish();
rollback;
