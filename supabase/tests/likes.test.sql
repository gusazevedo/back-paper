begin;
select plan(13);

-- Ignore whatever the local database holds; everything is rolled back at the end.
delete from auth.users;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@example.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@example.com'),
  ('00000000-0000-0000-0000-0000000000c3', 'c@example.com');

-- One wallpaper by a1.
insert into public.wallpapers (id, author_id, original_key, thumb_key, mime, width, height, size_bytes)
values ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000a1', 'o', 't', 'image/jpeg', 1080, 2340, 1);

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b2", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.likes (user_id, wallpaper_id) values ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000f001') $$,
  'a user likes someone else''s wallpaper');

select is((select like_count from public.wallpapers where id = '00000000-0000-0000-0000-00000000f001'), 1, 'the trigger counts the like');

select throws_ok(
  $$ insert into public.likes (user_id, wallpaper_id) values ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000f001') $$,
  '23505', null, 'a wallpaper is liked at most once per user');

select throws_ok(
  $$ insert into public.likes (user_id, wallpaper_id) values ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-00000000f001') $$,
  '42501', null, 'users cannot like on behalf of someone else');

select is(
  (select liked_by_me from public.feed() where id = '00000000-0000-0000-0000-00000000f001'),
  true, 'the feed says the viewer liked it');

-- c3 likes it too, then b2 can only see their own like.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000c3", "role": "authenticated"}';
insert into public.likes (user_id, wallpaper_id) values ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-00000000f001');
select is((select like_count from public.wallpapers where id = '00000000-0000-0000-0000-00000000f001'), 2, 'each like counts');
select is((select count(*)::int from public.likes), 1, 'users only read their own likes');

-- c3 cannot remove b2's like.
delete from public.likes where user_id = '00000000-0000-0000-0000-0000000000b2';
select is((select like_count from public.wallpapers where id = '00000000-0000-0000-0000-00000000f001'), 2, 'users cannot remove someone else''s like');

delete from public.likes where user_id = '00000000-0000-0000-0000-0000000000c3';
select is((select like_count from public.wallpapers where id = '00000000-0000-0000-0000-00000000f001'), 1, 'unliking decrements the count');
select is(
  (select liked_by_me from public.feed() where id = '00000000-0000-0000-0000-00000000f001'),
  false, 'the feed says the viewer no longer likes it');

-- The author cannot like their own wallpaper.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
select throws_ok(
  $$ insert into public.likes (user_id, wallpaper_id) values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000f001') $$,
  'BP403', null, 'liking your own wallpaper is rejected');

select throws_ok(
  $$ update public.wallpapers set like_count = 99 $$,
  '42501', null, 'users cannot set like_count directly');

reset role;
set local role anon;
select throws_ok($$ select * from public.likes $$, '42501', null, 'signed-out users cannot read likes');

select * from finish();
rollback;
