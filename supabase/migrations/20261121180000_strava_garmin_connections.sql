-- Garmin må kobles til og bekreftes før appen låses opp.
-- strava_connections er ubrukt foreløpig (Strava API krever betalt abonnement),
-- men beholdes slik at Strava kan kobles på igjen senere.
-- Begge tabeller er kun for service-role (RLS på, ingen policies).

create table if not exists public.strava_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  athlete_id bigint not null unique,
  athlete_name text,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.strava_connections enable row level security;

-- Garmin: knytt token-raden til brukeren som bekreftet tilkoblingen.
alter table public.garmin_tokens
  add column if not exists user_id uuid references auth.users (id) on delete set null,
  add column if not exists display_name text,
  add column if not exists verified_at timestamptz;
