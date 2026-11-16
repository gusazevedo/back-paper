-- R-AUTH-3: a display name is 1–40 characters and never just spaces.
alter table public.profiles drop constraint profiles_display_name_check;
alter table public.profiles add constraint profiles_display_name_check
  check (char_length(display_name) between 1 and 40 and btrim(display_name) <> '');
