# CLAUDE.md — Betting Research Platform

## Project Overview

This is a horse racing odds aggregation and value detection platform. It identifies lay betting opportunities on Betfair by comparing initial bookmaker odds (the "truth anchor") against current market prices to detect crowd-driven price compression.

**This is a data analysis tool, not a betting app.** Phase 1 is purely about odds aggregation and analysis.

Repository: `betting-research` on GitHub, deployed via Vercel.

---

## Tech Stack

```
Frontend + API:    Next.js 14+ (App Router) on Vercel
Database:          Supabase (PostgreSQL)
Odds Data:         The Odds API (https://the-odds-api.com)
Styling:           Tailwind CSS
Data Fetching:     React Query (@tanstack/react-query)
Cache:             Upstash Redis (optional Phase 1)
Language:          TypeScript
```

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                     # Main dashboard
│   ├── layout.tsx                   # Root layout with providers
│   ├── races/[raceId]/page.tsx      # Race detail view
│   └── api/
│       ├── odds/route.ts            # Proxy to The Odds API
│       ├── snapshot/route.ts        # Save odds snapshot to Supabase
│       ├── history/route.ts         # Retrieve historical snapshots
│       └── health/route.ts          # Health check
├── components/
│   ├── RaceCard.tsx                 # Race display with all runners
│   ├── RunnerRow.tsx                # Single horse row with odds
│   ├── ValueAlert.tsx               # Alert when threshold triggers
│   ├── OddsCell.tsx                 # Formatted odds (decimal + implied %)
│   ├── CompressionBadge.tsx         # Colour-coded compression indicator
│   ├── KellyCalculator.tsx          # Interactive Kelly stake calculator
│   ├── DashboardHeader.tsx          # Filters, refresh, API status
│   ├── DashboardStats.tsx           # Summary stats
│   └── SettingsPanel.tsx            # Configurable thresholds + bankroll
├── lib/
│   ├── odds-api.ts                  # The Odds API client
│   ├── supabase.ts                  # Supabase client setup
│   ├── calculations.ts             # Implied probability, compression %, Kelly
│   ├── types.ts                     # TypeScript interfaces
│   └── constants.ts                # Default thresholds, config values
└── hooks/
    ├── useOdds.ts                   # React Query hook for odds data
    ├── useSnapshots.ts             # React Query hook for historical data
    └── useSettings.ts              # Local state for user settings
```

---

## Commands

```bash
npm run dev          # Local development server
npm run build        # Production build
npm run lint         # Run linter
npm run start        # Start production server
```

---

## Environment Variables

```
ODDS_API_KEY                       # The Odds API key
NEXT_PUBLIC_SUPABASE_URL           # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY      # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY          # Supabase service role key
UPSTASH_REDIS_REST_URL             # Upstash Redis URL (optional Phase 1)
UPSTASH_REDIS_REST_TOKEN           # Upstash Redis token (optional Phase 1)
NEXT_PUBLIC_DEFAULT_SPORT          # Default: horseracing
NEXT_PUBLIC_DEFAULT_REGION         # Default: uk
```

---

## Core Strategy Logic

The platform's value detection is built on these principles:

**Opening odds = truth anchor.** Initial bookmaker odds are set by professional traders before emotional market forces act. They represent the most accurate probability baseline.

**Price compression = potential opportunity.** When current odds drop below initial odds, calculate:
```
Compression % = (initial_odds - current_odds) / initial_odds × 100
```

**Compression thresholds:**
- ≥15% → Conservative signal (green)
- ≥25% → Strong signal (amber)
- ≥40% → Premium signal (red) — rare, high quality

**Implied probability:** `1 / decimal_odds`

**Target races:** UK horse racing, 8–14 runners. Avoid ≤5 or >16 runner fields. One horse per race for lay betting.

---

## Kelly Criterion — Lay Betting Adaptation

IMPORTANT: The Kelly formula for this project applies to **liability**, not stake. This is critical.

```
f = (P_true × (Lay_Odds - 1) - P_current) / (Lay_Odds - 1)
```

Where:
- `P_true` = 1 / initial_odds (true probability from opening price)
- `P_current` = 1 / current_odds (market-implied probability)
- `Lay_Odds` = current exchange odds
- `f` = fraction of bankroll to risk as **liability**

Then:
- `Liability = f × Bankroll`
- `Lay Stake = Liability / (Lay_Odds - 1)`

**Validation rules:**
- Only bet when current odds < initial odds (compression exists)
- Minimum 5% difference between P_true and P_current to avoid marginal bets
- Use fractional Kelly (half Kelly recommended) for real-world variance
- Cap max liability at a configurable % of bankroll

**Comment the Kelly implementation thoroughly — the math matters and needs to be verifiable.**

---

## Odds Snapshot Logic

1. On data fetch, check Supabase: does an `is_opening = true` snapshot exist for this event+runner?
2. If NO → save current odds as opening snapshot (`is_opening = true`)
3. If YES → save new snapshot with `is_opening = false`
4. First captured odds become the "initial" anchor for that race
5. Subsequent fetches build price history
6. Auto-refresh every 60 seconds via React Query `refetchInterval: 60000`

---

## Phase Boundaries

### Phase 1 (Current) — Odds Aggregation & Analysis
- The Odds API integration for UK horse racing
- Dashboard with compression detection and value signals
- Supabase for odds snapshots and price history
- Kelly calculator in UI
- Deployed on Vercel

### ❌ NOT in Phase 1
- No Betfair API integration (Phase 2)
- No bet placement or execution
- No WebSocket/real-time streaming
- No news/social media monitoring (Phase 3)
- No user authentication
- No Railway WebSocket server
- No complex state management beyond React Query

### Phase 2 (Future) — Betfair Exchange Integration
- Betfair Exchange API (session auth, `listMarketCatalogue`, `listMarketBook`)
- Live Betfair lay odds alongside bookmaker odds
- Railway WebSocket server for streaming
- Upstash Redis caching layer

### Phase 3 (Future) — Information Filtering & Execution
- Non-runner detection, going changes, social media monitoring
- Traffic light system: Green (trade) / Amber (caution) / Red (skip)
- Execution modes: Observe → Assist → Execute
- Strategy analytics and performance tracking

**Architecture in Phase 1 must be clean enough that Phase 2/3 additions don't require ripping things apart.**

---

## Coding Conventions

- TypeScript strict mode
- Use descriptive variable names — future me needs to understand this months from now
- Functional components with hooks
- React Query for all data fetching (no raw useEffect for API calls)
- Tailwind CSS for styling, desktop-first
- Keep calculations in `lib/calculations.ts` as pure functions — easy to test
- All API calls go through Next.js API routes (never call external APIs from client)

---

## Database Schema (Supabase)

Primary table: `odds_snapshots`
```sql
id UUID PRIMARY KEY
event_id TEXT NOT NULL              -- The Odds API event ID
event_name TEXT NOT NULL            -- e.g. "Cheltenham 14:30"
sport_key TEXT NOT NULL             -- e.g. "horse_racing"
commence_time TIMESTAMPTZ NOT NULL  -- Race start time
snapshot_time TIMESTAMPTZ DEFAULT NOW()
bookmaker TEXT NOT NULL             -- e.g. "bet365"
runner_name TEXT NOT NULL           -- Horse name
back_price DECIMAL(10,4)
lay_price DECIMAL(10,4)
is_opening BOOLEAN DEFAULT FALSE   -- First snapshot flag
```

---

## Error Handling

- No horse racing data (outside race days) → show "No races available" message
- Missing/invalid API key → show setup instructions
- Supabase unreachable → still show live odds from The Odds API without historical comparison
- Log all API errors to console with context

---

## Deployment

GitHub → Vercel auto-deploy. Same pattern as previous "Feel Understood" project.

1. Push to `main` branch on GitHub
2. Vercel auto-deploys
3. Environment variables configured in Vercel dashboard
4. Supabase project configured separately

---

## Key Reference Documents

For detailed strategy research and mathematical validation, see the project knowledge documents. For Betfair API specifics (Phase 2+), see `betfair-api-guide.html` and `betfair-platform-setup-guide.md` in the project docs.
