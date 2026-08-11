# Milestones AI Running

Mobil web-app for én bruker (Edvard) som styrer daglig løpstrening etter en
trafikklys-algoritme basert på Garmin-data, med Gemini som treningsrådgiver.

Bygget med Next.js 16 (App Router, TypeScript), Supabase (Postgres + Auth + RLS)
og Tailwind CSS. Designet for iPhone-klassen mobil; desktop viser appen i en
telefon-ramme.

## Kom i gang

```bash
npm install
cp .env.example .env.local   # fyll inn verdier
npm run dev
```

Åpne http://localhost:3000 — landingssiden. Logg inn på `/login`, appen ligger
på `/dashboard`.

## Skript

| Kommando            | Hva                                             |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Utviklingsserver                                |
| `npm run build`     | Produksjonsbygg                                 |
| `npm run test`      | Vitest — algoritme- og avledningstester         |
| `npm run test:watch`| Vitest i watch-modus                            |
| `npx tsx scripts/seed.ts` | Fyller 28 dagers mock-historikk i Supabase |

## Arkitektur

```
lib/
  trafficLight.ts   Kjernealgoritmen: evaluate(metrics) → { category, score, subscores, triggers, saturated }
  categories.ts     Kategori-metadata (palett, råd, ramme) + metric-metadata
  derive.ts         Avledede felt: hrv_z (90d), d_rhr (60d), acwr (7d/28d)
  format.ts         Norsk formatering (nb-NO, DD.MM.ÅÅÅÅ)
  prognosis.ts      Enkel tidsprognose mot mål
  coach.ts          Deterministisk trener-tekst (fallback + Gemini-sete)
  garmin/
    provider.ts     GarminProvider-grensesnitt
    mock.ts         MockGarminProvider — realistisk 28d historikk (deterministisk PRNG)
  mockData.ts       Profil + mål + mock-records
components/app/     6-fane mobil-UI (AppShell, screens, ui-primitiver)
supabase/migrations Skjema + RLS
scripts/seed.ts     Seed-skript
```

## Algoritmen

Åtte daglige inndata (HRV z-skår, ΔRHR, Body Battery, søvnskår, ACWR,
restitusjonstimer, skritt, stress) vektes til en totalskår 0–100 og en
kategori i sju trinn (grønt pluss → rødt 3). Harde regler kan overstyre
skåren **nedover** (aldri oppover) — strengeste kategori vinner alltid, og hver
utløst regel lagres som lesbar begrunnelse.

Alt ligger i `lib/trafficLight.ts` som ren, testbar funksjon. Grenseverdiene er
dekket av Vitest-tester (`npm run test`).

## Garmin

All Garmin-logikk ligger bak `GarminProvider`. Sett `GARMIN_MOCK=true` for å
bruke `MockGarminProvider` slik at hele appen kan utvikles og demoes uten
Garmin-godkjenning. Live-integrasjon (Health API, OAuth, webhooks) kobles på til
slutt via route handlers under `/api/garmin/*`.

## Gemini (kommer)

AI-rådgiveren er forberedt via `lib/coach.ts`, som i dag gir deterministiske
svar (øktforslag, ukesrapport, chat). Når Gemini kobles på, sendes dagens åtte
målinger, totalskår, kategori, ramme og mål til modellen server-side, med
`lib/coach.ts` som fallback hvis kallet feiler. Appen skal aldri stå tom.

## Deploy

- **Vercel:** koble repoet, sett miljøvariablene fra `.env.example`.
- **Supabase:** kjør migrasjonen i `supabase/migrations/` (via Supabase CLI
  eller SQL-editor), deretter `npx tsx scripts/seed.ts` for mock-data.
