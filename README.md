# Milestones AI Running

Personlig treningsassistent for løping. Kombinerer Garmin Connect-data med Claude AI for daglige, konkrete treningsråd basert på dine målsetninger.

## Stack

- Next.js (App Router, TypeScript) + Tailwind CSS
- Supabase (Auth, Postgres, RLS)
- Anthropic Claude (`claude-sonnet-4-6`)
- Garmin Connect (server-side via `GARMIN_EMAIL` / `GARMIN_PASSWORD`)
- recharts for målfremdrift
- Deploy: Vercel

## Oppsett

### 1. Klone og installer

```bash
npm install
cp .env.example .env.local
```

### 2. Supabase

1. Opprett prosjekt (allerede: `milestones-AI-running`).
2. Kjør migrasjonen som oppretter `profiles`, `milestones`, `test_runs`, `daily_checkins`, `garmin_tokens` med RLS.
3. Auth → Providers: e-post/passord aktivert.
4. (Anbefalt) Auth → Settings: skru av «Confirm email» for enkel single-user setup.
5. Site URL / redirect: `http://localhost:3000` og Vercel-URL, callback `.../auth/callback`.

### 3. Miljøvariabler

I `.env.local` og Vercel → Project Settings → Environment Variables:

| Variabel | Hvor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | klient + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | klient + server |
| `SUPABASE_SERVICE_ROLE_KEY` | **kun server** (Garmin token-cache) |
| `ANTHROPIC_API_KEY` | **kun server** |
| `GARMIN_EMAIL` | **kun server** |
| `GARMIN_PASSWORD` | **kun server** |

`.env*` er i `.gitignore` (unntatt `.env.example`).

### 4. Kjør lokalt

```bash
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000), opprett konto, fyll ukestruktur under Innstillinger.

### 5. Deploy

Repo: https://github.com/Edbro78/milestones-AI-running  
Vercel-prosjekt: `milestones-ai-running` (koblet til GitHub). Push til `main` deployer automatisk.

## Sider

- `/dashboard` – trafikklys, daglig Claude-anbefaling, grafer
- `/milestones` – aktive mål (maks 3) + baseline via Claude/Garmin
- `/test-runs` – registrer testløp + kalibrering
- `/settings` – ukestruktur og maxpuls

## Garmin / MFA

Garmin logges inn kun server-side. Tokens caches i minne + `garmin_tokens` (ikke passord).  
Hvis Garmin krever MFA: se serverlogg – skru av MFA for kontoen eller løs manuelt.

## Repo

https://github.com/Edbro78/milestones-AI-running
