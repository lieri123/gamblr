# Gamblr

A swipe-style sports betting app built with Next.js (App Router), Supabase, and
Stripe. Swipe right to back the home team, left for the away team, up to skip.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open http://localhost:3000.

## Environment variables

Every variable in `.env.example` is required. `SUPABASE_SECRET_KEY`,
`STRIPE_SECRET_KEY`, `ODDS_API_URL`, and `SYNC_SECRET` are server-only — never
prefix them with `NEXT_PUBLIC_`.

## Data model

| Table         | Notes                                                                   |
| ------------- | ----------------------------------------------------------------------- |
| `users`       | One row per auth user. `preferences` is a `text[]` of `sport_title`s, `stripe_id` is the Stripe customer. |
| `bets`        | One row per upcoming game, keyed by the odds provider's event id.        |
| `markets`     | One row per market (`h2h`, `spreads`, …) per bet.                        |
| `outcomes`    | One row per priced outcome; `name` matches a team name, `value` is American odds. |
| `predictions` | A user's bet: `from_user_id`, `bet_id`, `predicted`, `amount`.           |

**Required.** `placeBet` relies on this constraint to stop two simultaneous
requests from both placing a bet on the same game:

```sql
alter table predictions
  add constraint predictions_user_bet_unique unique (from_user_id, bet_id);
```

Recommended:

```sql
alter table outcomes
  add constraint outcomes_market_fk
  foreign key (market_id) references markets(id) on delete cascade;
```

## Syncing odds

`GET /api/sync` pulls the odds feed and replaces each game's markets and
outcomes. It requires an `x-sync-secret` header matching `SYNC_SECRET`:

```bash
curl -H "x-sync-secret: $SYNC_SECRET" https://your-app.vercel.app/api/sync
```

Run it on a schedule (Vercel Cron, GitHub Actions, Supabase pg_cron, …).

## Architecture notes

- `proxy.ts` refreshes the Supabase session on every request and gates
  `/bets` and `/profile` behind auth. Without it, server actions see expired
  cookies and every fetch fails with "Not authenticated."
- `lib/supabase/server.ts` is the only place that identifies the caller.
  `lib/supabase/service.ts` is the service-role client; it has no session, so
  `auth.getUser()` on it always returns null.
- Placing a bet is a single server action (`placeBet`) that validates the stake,
  charges the saved card, and inserts the prediction — refunding if the insert
  fails.

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```
