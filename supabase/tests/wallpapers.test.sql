begin;
select plan(13);

-- Ignore whatever the local database holds; everything is rolled back at the end.
delete from auth.users;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@example.com', '{"full_name": "Author"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@example.com', '{"full_name": "Viewer"}');

select is((select count(*)::int from public.categories), 12, '12 fixed categories are seeded');

-- create_wallpaper (service role path)
select lives_ok($$
  select public.create_wallpaper(gen_random_uuid(), '00000000-0000-0000-0000-0000000000a1', '  Dunes  ', array['nature','minimalist','nature'],
    'w/1/original.jpg', 'w/1/thumb.webp', 'image/jpeg', 1080, 2340, 900000)
$$, 'service role publishes a wallpaper');

select is((select title from public.wallpapers), 'Dunes', 'title is trimmed');
select is((select count(*)::int from public.wallpaper_categories), 2, 'duplicate categories collapse');
select is((select count(*)::int from public.publish_events), 1, 'publishing logs a publish event');

select throws_ok($$
  select public.create_wallpaper(gen_random_uuid(), '00000000-0000-0000-0000-0000000000a1', null, '{}',
    'k', 't', 'image/jpeg', 1080, 2340, 1)
$$, '22023', null, 'zero categories are rejected');

select throws_ok($$
  select public.create_wallpaper(gen_random_uuid(), '00000000-0000-0000-0000-0000000000a1', null,
    array['ai','dark','light','nature','space','amoled'], 'k', 't', 'image/jpeg', 1080, 2340, 1)
$$, '22023', null, 'six categories are rejected');

select throws_ok($$
  select public.create_wallpaper(gen_random_uuid(), '00000000-0000-0000-0000-0000000000a1', null, array['cats'],
    'k', 't', 'image/jpeg', 1080, 2340, 1)
$$, '23503', null, 'unknown categories are rejected');

select throws_ok($$
  select public.create_wallpaper(gen_random_uuid(), '00000000-0000-0000-0000-0000000000a1', repeat('x', 61), array['ai'],
    'k', 't', 'image/jpeg', 1080, 2340, 1)
$$, '23514', null, 'titles over 60 characters are rejected');

-- As a signed-in user
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b2", "role": "authenticated"}';

select is((select count(*)::int from public.wallpapers), 1, 'signed-in users read wallpapers');

select throws_ok($$
  select public.create_wallpaper(gen_random_uuid(), '00000000-0000-0000-0000-0000000000b2', null, array['ai'],
    'k', 't', 'image/jpeg', 1080, 2340, 1)
$$, '42501', null, 'users cannot call create_wallpaper directly');

select throws_ok($$
  insert into public.wallpapers (author_id, original_key, thumb_key, mime, width, height, size_bytes)
  values ('00000000-0000-0000-0000-0000000000b2', 'k', 't', 'image/jpeg', 1, 1, 1)
$$, '42501', null, 'users cannot insert wallpapers');

select is(
  (select count(*)::int from public.user_wallpapers('00000000-0000-0000-0000-0000000000a1')),
  1, 'user_wallpapers lists the author''s grid');

select * from finish();
rollback;
