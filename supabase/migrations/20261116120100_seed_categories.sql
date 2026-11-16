insert into public.categories (slug, label, sort) values
  ('ai',          'AI',                 1),
  ('dark',        'Dark',               2),
  ('light',       'Light',              3),
  ('minimalist',  'Minimalist',         4),
  ('nature',      'Nature',             5),
  ('abstract',    'Abstract',           6),
  ('anime',       'Anime/Illustration', 7),
  ('cityscape',   'Cityscape',          8),
  ('space',       'Space',              9),
  ('amoled',      'AMOLED',            10),
  ('gradient',    'Gradient',          11),
  ('photography', 'Photography',       12)
on conflict (slug) do nothing;
