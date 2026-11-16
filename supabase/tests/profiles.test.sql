begin;
select plan(11);

-- Ignore whatever the local database holds; everything is rolled back at the end.
delete from auth.users;

-- Signup trigger builds the profile from Google metadata.
insert into auth.users (id, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000001', 'ana@example.com',
   '{"full_name": "Ana Souza", "avatar_url": "https://example.com/a.png"}'),
  ('00000000-0000-0000-0000-000000000002', 'bruno@example.com',
   jsonb_build_object('name', repeat('B', 60), 'picture', 'https://example.com/b.png'));

select is(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-000000000001'),
  'Ana Souza', 'profile takes full_name');
select is(
  (select avatar_url from public.profiles where id = '00000000-0000-0000-0000-000000000002'),
  'https://example.com/b.png', 'avatar falls back to picture');
select is(
  (select char_length(display_name) from public.profiles where id = '00000000-0000-0000-0000-000000000002'),
  40, 'long names are cut to 40 characters');

-- RLS as Ana.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}';

select is((select count(*)::int from public.profiles), 2, 'signed-in users read all profiles');

update public.profiles set display_name = 'Ana S.' where id = '00000000-0000-0000-0000-000000000001';
select is(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-000000000001'),
  'Ana S.', 'user renames themself');

update public.profiles set display_name = 'Hacked' where id = '00000000-0000-0000-0000-000000000002';
select isnt(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-000000000002'),
  'Hacked', 'user cannot rename someone else');

select throws_ok(
  $$update public.profiles set avatar_url = 'x' where id = '00000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'avatar_url is not editable');

select throws_ok(
  $$insert into public.profiles (id, display_name) values (gen_random_uuid(), 'x')$$,
  '42501', null, 'users cannot insert profiles');

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select throws_ok(
  $$update public.profiles set display_name = '' where id = '00000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'a display name cannot be empty');
select throws_ok(
  $$update public.profiles set display_name = '   ' where id = '00000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'a display name cannot be only spaces');
select throws_ok(
  $$update public.profiles set display_name = repeat('x', 41) where id = '00000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'a display name has at most 40 characters');

select * from finish();
rollback;
