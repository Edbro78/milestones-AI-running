-- Milestones AI Running — skjema + RLS
-- Én bruker (Edvard). All data radlåses på auth.uid().

-- ============================ profiles ============================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  birth_date date,
  weight_kg numeric,
  hr_max int,
  hr_threshold int,
  hrv_baseline numeric,
  rhr_baseline int,
  weekly_km numeric,
  created_at timestamptz not null default now()
);

-- ============================ garmin_tokens ============================
-- Kun service-role. Aldri eksponert mot klient.
create table if not exists public.garmin_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  garmin_user_id text
);

-- ============================ daily_metrics ============================
create table if not exists public.daily_metrics (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  hrv_z numeric,
  d_rhr int,
  sleep_score int,
  body_battery int,
  acwr numeric,
  recovery_hours int,
  steps int,
  stress int,
  source text check (source in ('garmin', 'manual')),
  category text,
  score int,
  triggers jsonb,
  primary key (user_id, date)
);

-- ============================ activities ============================
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date,
  type text,
  duration_s int,
  distance_m int,
  avg_hr int,
  training_load numeric,
  garmin_activity_id text unique
);

-- ============================ goals ============================
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  event_date date,
  target_time_s int,
  is_main boolean not null default false
);

-- ============================ coach_messages ============================
create table if not exists public.coach_messages (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date,
  role text check (role in ('user', 'coach')),
  content text,
  kind text,
  created_at timestamptz not null default now()
);

-- ============================ weekly_reports ============================
create table if not exists public.weekly_reports (
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  content text,
  generated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

-- ============================ RLS ============================
alter table public.profiles enable row level security;
alter table public.garmin_tokens enable row level security;
alter table public.daily_metrics enable row level security;
alter table public.activities enable row level security;
alter table public.goals enable row level security;
alter table public.coach_messages enable row level security;
alter table public.weekly_reports enable row level security;

-- profiles: eier = auth.uid() (id-kolonnen er brukerens id)
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- daily_metrics
create policy "daily_metrics_all_own" on public.daily_metrics
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- activities
create policy "activities_all_own" on public.activities
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- goals
create policy "goals_all_own" on public.goals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- coach_messages
create policy "coach_messages_all_own" on public.coach_messages
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- weekly_reports
create policy "weekly_reports_all_own" on public.weekly_reports
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- garmin_tokens: ingen policy for vanlige brukere.
-- Kun service-role (som omgår RLS) kan lese/skrive tokens.
