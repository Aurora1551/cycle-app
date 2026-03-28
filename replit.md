# Cycle App

## Overview
A React mobile web app (Vite + TypeScript + Supabase). A daily companion for fertility treatment journeys (Egg Freezing, IVF, IUI). Design matches the reference in `cycle-app-final.html`.

## Design Language
- **Background (splash):** `#0E0E0E`
- **Background (onboarding 1-4):** `#FDF6F0` (cream)
- **Primary accent:** `#C4614A` (terracotta)
- **Fonts:** Cormorant Garamond (headings), Karla (body), DM Mono (labels)
- **Vibe themes:** Fierce, Nurturing, Calm, Lighthearted, Spiritual — each with their own bg/accent/text

## Project Structure
```
cycle-app/
  src/
    types/
      index.ts              ← VibeTheme, OnboardingData, VIBES[], ALL_EXTRA_GENRES[]
    components/
      OnboardingLayout.tsx  ← Shared progress bar + back button + content wrapper
    screens/
      SplashScreen.tsx      ← Dark splash, animated 🌸, Begin / I have an account
      OnboardingName.tsx    ← Step 1: name input
      OnboardingTreatment.tsx     ← Step 2: treatment selector (Egg Freezing, IVF, IUI…)
      OnboardingCycleLength.tsx   ← Step 3: day counter with dot preview
      OnboardingComponents.tsx    ← Step 4: 7-component toggle grid
      OnboardingVibe.tsx          ← Step 5: vibe picker with live whole-app colour preview
      OnboardingMusic.tsx         ← Step 6: genre chips, pre-seeded from vibe, add more
    lib/
      supabase.ts           ← Supabase client
    App.tsx                 ← Root router, vibe state, live preview background
    main.tsx
    index.css
  vite.config.ts            ← Port 5000, host 0.0.0.0, allowedHosts: true
cycle-app-final.html        ← Original design reference (static prototype)
```

## Tech Stack
- React 18 + TypeScript
- Vite (dev server on port 5000, host 0.0.0.0)
- Supabase JS client (`@supabase/supabase-js`)
- Google Fonts (Cormorant Garamond, Karla, DM Mono)
- Node.js 20

## Running the App
**Workflow:** "Start application"  
**Command:** `cd cycle-app && npm run dev`  
**Port:** 5000

## Supabase Setup
Environment secrets:
- `VITE_SUPABASE_URL` — Supabase project URL (EU West Ireland)
- `VITE_SUPABASE_ANON_KEY` — Supabase project anon key

## Onboarding Flow
1. **Splash** — dark `#0E0E0E`, floating 🌸 with glow, Begin → / I have an account
2. **Name** — cream bg, Cormorant input, progress at 16%
3. **Treatment** — 5 options with icons (Egg Freezing, IVF, IUI, Egg Donation, Other)
4. **Cycle Length** — +/- counter, dot journey preview, 1–60 days
5. **Daily Content** — 2-col grid toggle: Quote, Anthem, Meditation, Journal, Affirmation, Gratitude, Breathing
6. **Vibe** — 5 vibes, hover previews whole-app colour scheme instantly, selection locks it in
7. **Music** — pre-seeded genres from vibe choice, add-more chip list, everything toggleable

## Vibe Themes
| Vibe | BG | Accent |
|---|---|---|
| Fierce 🔥 | `#1C0F0C` | `#C4614A` |
| Nurturing 🌸 | `#FDF0EC` | `#E8907A` |
| Calm 🌊 | `#0D1F2D` | `#7FB5A0` |
| Lighthearted 😂 | `#FFFBF0` | `#F5A623` |
| Spiritual 🙏 | `#120A2A` | `#C4A8E8` |

## Deployment
Static deployment — build: `cd cycle-app && npm run build`, serve from `cycle-app/dist`.
