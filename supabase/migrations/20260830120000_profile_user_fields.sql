-- Brukerfelter på profiles + cache for Garmin-baselines.
-- Produksjon hadde allerede max_hr; resten legges til her.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS weight_kg numeric,
  ADD COLUMN IF NOT EXISTS hr_threshold integer,
  ADD COLUMN IF NOT EXISTS weekly_km numeric,
  ADD COLUMN IF NOT EXISTS hrv_baseline numeric,
  ADD COLUMN IF NOT EXISTS rhr_baseline integer;

COMMENT ON COLUMN public.profiles.name IS 'Visningsnavn satt av bruker';
COMMENT ON COLUMN public.profiles.birth_date IS 'Fødselsdato; alder beregnes fra denne';
COMMENT ON COLUMN public.profiles.weight_kg IS 'Kroppsvekt (kg) satt av bruker';
COMMENT ON COLUMN public.profiles.max_hr IS 'Makspuls (bpm) satt av bruker';
COMMENT ON COLUMN public.profiles.hr_threshold IS 'Terskelpuls (bpm) satt av bruker';
COMMENT ON COLUMN public.profiles.weekly_km IS 'Ønsket ukentlig treningsvolum (km) satt av bruker';
COMMENT ON COLUMN public.profiles.hrv_baseline IS 'HRV-baseline (ms) hentet fra Garmin';
COMMENT ON COLUMN public.profiles.rhr_baseline IS 'Hvilepuls-baseline (bpm) hentet fra Garmin';
