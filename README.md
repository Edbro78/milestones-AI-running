# Milestones AI Running

Personlig treningsassistent for løping. Kombinerer Garmin Connect-data med Claude AI for daglige, konkrete treningsråd basert på dine målsetninger.

## Stack

- **Next.js** (App Router, TypeScript) + Tailwind CSS
- **Supabase** (Auth, Postgres, RLS)
- **Anthropic Claude** (`@anthropic-ai/sdk`)
- **Garmin Connect** (server-side via miljøvariabler)
- Deploy: **Vercel**

## Kom i gang

```bash
npm install
cp .env.example .env.local
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000).

## Miljøvariabler

Kopier `.env.example` til `.env.local` og fyll inn:

| Variabel | Beskrivelse |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Kun server-side |
| `ANTHROPIC_API_KEY` | Claude API-nøkkel |
| `GARMIN_EMAIL` | Garmin Connect e-post |
| `GARMIN_PASSWORD` | Garmin Connect passord |

Hemmeligheter skal aldri committes. `.env*` er i `.gitignore`.

## Repo

https://github.com/Edbro78/milestones-AI-running
