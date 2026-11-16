begin;
select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'e@example.com'),
  ('00000000-0000-0000-0000-0000000000f2', 'f@example.com');

-- 25 wallpapers, one per minute; the newest belongs to the viewer (f2).
insert into public.wallpapers (id, author_id, original_key, thumb_key, mime, width, height, size_bytes, created_at)
select
  ('00000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid,
  case when g = 25 then '00000000-0000-0000-0000-0000000000f2' else '00000000-0000-0000-0000-0000000000e1' end::uuid,
  'o' || g, 't' || g, 'image/jpeg', 1080, 2340, 1,
  '2026-11-01'::timestamptz + make_interval(mins => g)
from generate_series(1, 25) g;

-- Wallpaper 24 is nature + dark, 23 is dark, 22 is space.
insert into public.wallpaper_categories (wallpaper_id, category_slug) values
  ('00000000-0000-0000-0000-000000000024', 'nature'),
  ('00000000-0000-0000-0000-000000000024', 'dark'),
  ('00000000-0000-0000-0000-000000000023', 'dark'),
  ('00000000-0000-0000-0000-000000000022', 'space');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000f2", "role": "authenticated"}';

select is((select count(*)::int from public.feed()), 20, 'pages hold 20 by default');
select is((select thumb_key from public.feed() limit 1), 't25', 'newest first');
select is(
  (select author_id from public.feed() limit 1),
  '00000000-0000-0000-0000-0000000000f2'::uuid,
  'the viewer''s own wallpapers are in the feed');

select results_eq(
  $$ select thumb_key from public.feed(null, '{"created_at": "2026-11-01T00:06:00Z", "id": "00000000-0000-0000-0000-000000000006"}') $$,
  $$ values ('t5'), ('t4'), ('t3'), ('t2'), ('t1') $$,
  'the cursor continues strictly after the last row');

select is(
  (select count(*)::int from public.feed(p_cursor => null, p_limit => 500)), 25,
  'a larger page size is honoured (capped at 50)');

select is((select count(*)::int from public.feed('{}')), 20, 'an empty category list means all');

select results_eq(
  $$ select thumb_key from public.feed(array['dark', 'nature']) $$,
  $$ values ('t24'), ('t23') $$,
  'any selected category matches, without duplicates');

select results_eq(
  $$ select thumb_key from public.feed(array['dark', 'space'], '{"created_at": "2026-11-01T00:24:00Z", "id": "00000000-0000-0000-0000-000000000024"}') $$,
  $$ values ('t23'), ('t22') $$,
  'the category filter combines with the cursor');

reset role;
set local role anon;
select throws_ok($$ select * from public.feed() $$, '42501', null, 'signed-out users cannot read the feed');

select * from finish();
rollback;
