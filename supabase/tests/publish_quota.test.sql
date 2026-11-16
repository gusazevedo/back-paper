begin;
select plan(10);

-- Ignore whatever the local database holds; everything is rolled back at the end.
delete from auth.users;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c1', 'c@example.com', '{"full_name": "Busy"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'd@example.com', '{"full_name": "Other"}');

-- 9 publishes inside the window and 3 old ones that no longer count.
insert into public.publish_events (author_id, created_at)
select '00000000-0000-0000-0000-0000000000c1', now() - make_interval(hours => g)
from generate_series(1, 9) g;
insert into public.publish_events (author_id, created_at)
select '00000000-0000-0000-0000-0000000000c1', now() - interval '25 hours'
from generate_series(1, 3);

select results_eq(
  $$ select used, remaining, next_at is null from public.publish_quota('00000000-0000-0000-0000-0000000000c1') $$,
  $$ values (9, 1, true) $$,
  'only publishes from the last 24h count');

select lives_ok($$
  select public.create_wallpaper(gen_random_uuid(), '00000000-0000-0000-0000-0000000000c1', null, array['ai'],
    'w/a/original.jpg', 'w/a/thumb.webp', 'image/jpeg', 1080, 2340, 1)
$$, 'the 10th publish is allowed');

select results_eq(
  $$ select remaining from public.publish_quota('00000000-0000-0000-0000-0000000000c1') $$,
  $$ values (0) $$,
  'no publishes left after the 10th');

select ok(
  (select next_at between now() + interval '14 hours' and now() + interval '16 hours'
   from public.publish_quota('00000000-0000-0000-0000-0000000000c1')),
  'next_at is when the oldest publish in the window expires');

select throws_ok($$
  select public.create_wallpaper(gen_random_uuid(), '00000000-0000-0000-0000-0000000000c1', null, array['ai'],
    'w/b/original.jpg', 'w/b/thumb.webp', 'image/jpeg', 1080, 2340, 1)
$$, 'BP429', null, 'the 11th publish is rejected');

-- Deleted wallpapers keep counting.
delete from public.wallpapers where author_id = '00000000-0000-0000-0000-0000000000c1';
select results_eq(
  $$ select remaining from public.publish_quota('00000000-0000-0000-0000-0000000000c1') $$,
  $$ values (0) $$,
  'deleting a wallpaper does not give the publish back');

-- As a signed-in user
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000d2", "role": "authenticated"}';

select results_eq(
  $$ select lim, used, remaining from public.my_publish_quota() $$,
  $$ values (10, 0, 10) $$,
  'users read their own quota');

select throws_ok(
  $$ select * from public.publish_quota('00000000-0000-0000-0000-0000000000c1') $$,
  '42501', null, 'users cannot read someone else''s quota');

select throws_ok(
  $$ select * from public.publish_events $$,
  '42501', null, 'users cannot read publish_events');

select throws_ok(
  $$ delete from public.publish_events $$,
  '42501', null, 'users cannot delete publish_events');

select * from finish();
rollback;
