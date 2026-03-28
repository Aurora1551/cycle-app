# Cycle App

## Overview
A React mobile web app built with Vite + TypeScript + Supabase. A daily companion for individuals going through fertility treatments (Egg Freezing, IVF, IUI). Matches the design reference from `cycle-app-final.html`.

## Design Language
- **Background (splash):** `#0E0E0E`
- **Background (onboarding):** `#FDF6F0` (cream)
- **Primary accent:** `#C4614A` (terracotta)
- **Body text / warm tones:** `#9B7B74`, `#1C0F0C`
- **Fonts:** Cormorant Garamond (headings), Karla (body), DM Mono (labels/mono)

## Project Structure
```
cycle-app/          ← React + Vite app
  src/
    screens/
      SplashScreen.tsx      ← Splash screen (dark, animated cherry blossom)
      OnboardingName.tsx    ← Step 1: name input
    lib/
      supabase.ts           ← Supabase client
    App.tsx                 ← Root with screen routing
    main.tsx
    index.css
  vite.config.ts            ← Port 5000, host 0.0.0.0, allowedHosts: true
cycle-app-final.html        ← Original design reference (static prototype)
index.html                  ← Legacy static entry (not used by app)
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
Set these environment variables (Secrets):
- `VITE_SUPABASE_URL` — your Supabase project URL (EU West Ireland region)
- `VITE_SUPABASE_ANON_KEY` — your Supabase project anon key

## Current Screens
1. **Splash** — Dark `#0E0E0E` background, animated 🌸 logo, "Begin →" and "I have an account" buttons
2. **Onboarding Step 1** — Name input on cream background, progress bar at 16%, Cormorant Garamond heading

## Deployment
Static deployment — build with `cd cycle-app && npm run build`, serve from `cycle-app/dist`.
