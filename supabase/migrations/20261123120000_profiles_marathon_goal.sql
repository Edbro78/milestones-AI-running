-- Maratonmålet lagres per bruker i profilen (tidligere bare i nettleseren).
alter table public.profiles
  add column if not exists goal_title text,
  add column if not exists goal_event_date date,
  add column if not exists goal_target_s integer;
