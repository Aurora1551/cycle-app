# Cycle App

## Overview
A static HTML prototype for the "Cycle" mobile app — a daily companion for individuals going through fertility treatments (Egg Freezing, IVF, IUI). It showcases the full app UI flow including onboarding, daily content (quotes, meditations, music), vibes/themes, and a paywall/subscription model.

## Project Structure
- `cycle-app-final.html` — The original source file with the full UI prototype
- `index.html` — Copy of the above, served as the entry point by the web server
- `README.md` — Minimal project readme

## Tech Stack
- Pure static HTML/CSS (no build system, no JavaScript framework)
- External fonts via Google Fonts CDN
- No backend, no database, no package manager

## Running the App
The app is served via Python's built-in HTTP server on port 5000.

**Workflow:** "Start application"  
**Command:** `python3 -m http.server 5000`  
**Port:** 5000

## Deployment
Configured as a static site deployment with the project root (`.`) as the public directory.
