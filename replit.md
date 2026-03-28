# Cycle — Fertility Treatment Wellness App

A React + Vite + TypeScript mobile wellness companion for fertility treatment journeys (Egg Freezing, IVF, IUI).

## Architecture

- **Frontend:** React + Vite + TypeScript on port 5000 (`cycle-app/`)
- **Backend API:** Express on port 3001 (`server.js`) — serves Claude-generated daily content
- **AI:** Claude claude-haiku-4-5 via Replit AI Integrations (Anthropic) — no user API key needed
- **Backend DB:** Supabase (EU West Ireland) — auth, profiles, daily content, journal entries

## Workflows

1. `Start application` — `cd cycle-app && npm run dev` (port 5000)
2. `API server` — `node server.js` (port 3001)

Vite proxies `/api/*` calls to port 3001.

## Screens

1. **SplashScreen** — Dark intro screen, Begin/I have an account
2. **OnboardingName** — First name input
3. **OnboardingTreatment** — Treatment picker (Egg Freezing, IVF, IUI, Egg Donation, Other)
4. **OnboardingCycleLength** — Day slider (7-42 days)
5. **OnboardingComponents** — 7 daily component toggles (Quote, Anthem, Meditation, Journal, Affirmation, Gratitude, Breathing)
6. **OnboardingVibe** — 5 vibe pickers with live whole-app preview (Fierce, Nurturing, Calm, Lighthearted, Spiritual)
7. **OnboardingMusic** — Genre chips, pre-seeded from vibe
8. **Summary** — Journey preview on dark vibe bg, Day 1 sample card, Free/Unlock CTAs
9. **Paywall** — 3 plan cards: Free (£0), One Cycle (£5.99), Gift a Cycle (£12.99)
10. **CreateAccount** — Email/password + Google/Apple OAuth via Supabase
11. **DayScreen** — All 7 component types with live breathing animations + Spotify links
12. **Settings** — Journey summary + notification/restart options
13. **NotificationSettings** — Time picker with toggle
14. **EndOfCycle** — Celebration screen with WhatsApp share
15. **GiftFlow** — Compose + WhatsApp share gift message

## Design Tokens

- Splash bg: `#0E0E0E`
- Onboarding bg: `#FDF6F0`
- Terracotta accent: `#C4614A`
- Fonts: Cormorant Garamond (headings), Karla (body), DM Mono (labels)

### Vibes
- **Fierce** — bg:`#1C0F0C` accent:`#C4614A`
- **Nurturing** — bg:`#FDF0EC` accent:`#E8907A`
- **Calm** — bg:`#0D1F2D` accent:`#7FB5A0`
- **Lighthearted** — bg:`#FFFBF0` accent:`#F5A623`
- **Spiritual** — bg:`#120A2A` accent:`#C4A8E8`

## State & Persistence

- Onboarding data stored in `localStorage` as `cycle_onboarding_data`
- Current day stored in `localStorage` as `cycle_current_day`
- Daily content cached per day in `localStorage`
- Journal entries saved per day in `localStorage`
- Supabase used for auth + cloud sync (optional, degrades gracefully if env vars missing)

## AI Content Generation

`POST /api/generate-day` on the Express server takes:
```json
{ "name", "treatment", "dayNumber", "totalDays", "vibe", "genres" }
```
Returns personalized JSON: `{ quote, quoteAuthor, songTitle, songArtist, journalPrompt, affirmation, gratitudePrompt }`

Falls back to static vibe-appropriate content if Claude is unavailable.

## Supabase Tables (run in SQL Editor)

```sql
create table profiles (id uuid references auth.users primary key, name text, treatment text, cycle_days integer, components text[], vibe text, genres text[], current_day integer default 1, started_at timestamptz default now());
create table daily_content (id uuid default gen_random_uuid() primary key, user_id uuid references auth.users, day_number integer, quote text, quote_author text, song_title text, song_artist text, journal_prompt text, affirmation text, gratitude_prompt text, generated_at timestamptz default now(), unique(user_id, day_number));
create table journal_entries (id uuid default gen_random_uuid() primary key, user_id uuid references auth.users, day_number integer, content text, created_at timestamptz default now());
alter table profiles enable row level security;
alter table daily_content enable row level security;
alter table journal_entries enable row level security;
create policy "own" on profiles for all using (auth.uid() = id);
create policy "own" on daily_content for all using (auth.uid() = user_id);
create policy "own" on journal_entries for all using (auth.uid() = user_id);
```

## Environment Variables

- `VITE_SUPABASE_URL` — Supabase project URL (EU West Ireland)
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY` — Auto-set by Replit AI Integrations (do not modify)
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` — Auto-set by Replit AI Integrations (do not modify)

## Key Files

```
cycle-app/src/
  App.tsx                    — Full routing state machine
  types/index.ts             — OnboardingData, VibeKey, VIBES config
  lib/supabase.ts            — Supabase client (graceful fallback)
  lib/db.ts                  — Supabase CRUD helpers + SQL schema
  screens/
    SplashScreen.tsx
    OnboardingName.tsx
    OnboardingTreatment.tsx
    OnboardingCycleLength.tsx
    OnboardingComponents.tsx
    OnboardingVibe.tsx
    OnboardingMusic.tsx
    Summary.tsx
    Paywall.tsx
    CreateAccount.tsx
    DayScreen.tsx             — Core day experience with all 7 components
    Settings.tsx
    NotificationSettings.tsx
    EndOfCycle.tsx
    GiftFlow.tsx
  components/OnboardingLayout.tsx
server.js                    — Express API server (Claude content generation)
```
