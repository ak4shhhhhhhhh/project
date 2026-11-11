# Verdant — Smart Plant Monitoring & Automation Platform

## Project Progress Document

This document tracks completed milestones, architecture decisions, important files, required environment variables, outstanding issues, and next actions.

---

## Completed Milestones

### Milestone 1 — Foundation and Authentication (COMPLETE)

**What was built:**
- Application foundation using Vite + React + TypeScript + Tailwind CSS.
- Supabase client singleton reading from environment variables.
- Email/password authentication: sign-up, login, logout (Supabase Auth).
- Auth context provider with session state and `onAuthStateChange` listener.
- Route protection — all app pages require an authenticated session.
- Responsive app layout with sidebar navigation (desktop) and mobile drawer.
- Placeholder pages for all 7 required sections: Overview, Sensor History, Pump Control, Automation, Schedules, Alerts, Settings.
- Nature-inspired design system (green/clay/sky palette, Inter + Sora fonts, 8px spacing, cards, buttons, inputs).
- Hash-based section routing (no extra dependencies).
- Build and typecheck pass clean.

**Files created:**
- `src/lib/supabase.ts` — Supabase client singleton.
- `src/lib/types.ts` — shared auth types.
- `src/auth/AuthContext.tsx` — auth provider (signUp, signIn, signOut, session state).
- `src/auth/RequireAuth.tsx` — route guard, redirects to auth page when not signed in.
- `src/auth/AuthPage.tsx` — login + sign-up screen with branded split layout.
- `src/app/navigation.ts` — navigation item definitions for 7 sections.
- `src/app/AppLayout.tsx` — responsive shell: sidebar, top bar, mobile drawer.
- `src/components/PagePlaceholder.tsx` — reusable placeholder section component.
- `src/pages/sectionPages.tsx` — all 7 section placeholder pages.
- `src/App.tsx` — root component: AuthProvider + RequireAuth + layout + routing.
- `src/index.css` — design system (fonts, base styles, component classes).
- `tailwind.config.js` — extended theme (nature/clay/sky colors, shadows, animations).
- `index.html` — updated page title.

**Build status:** PASS (build + typecheck)

---

## Architecture Decisions

| Decision | Choice | Reason |
|---|---|---|
| Frontend stack | Vite + React + TypeScript + Tailwind | Provided template, zero cost |
| Backend / database / auth | Supabase (managed) | Zero cost, integrated auth + DB + edge functions |
| Routing | Hash-based state routing (no dependency) | Simple, sufficient for single-owner dashboard |
| Auth method | Supabase email/password | Per requirements; email confirmation OFF |
| Design palette | Nature greens + clay + sky (no purple) | Nature-inspired, professional |
| Fonts | Inter (body), Sora (display), JetBrains Mono (data) | Clean, modern, readable |

---

## Environment Variables

These are already configured in `.env` (gitignored) and must NOT be shared or committed:

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL (browser-safe) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public key (browser-safe) |

Server-only secrets (not in browser code, added in later milestones):
- `SUPABASE_SERVICE_ROLE_KEY` — used only in edge functions (device auth, telemetry).
- `SUPABASE_DB_URL` — used for migrations via MCP tools.

---

## Outstanding Issues

- None for Milestone 1.

---

## Next Actions

**Milestone 2 — Database and Security** (awaiting approval):
1. Create database schema (devices, credentials, sensor readings, current state, commands, automation config, schedules, alerts, events).
2. Enable RLS with owner-scoped policies on every table.
3. Device registration and credential management UI.
4. Server-side device authentication edge function.
5. Telemetry ingestion edge function.
6. Command polling + acknowledgement edge function.
7. Command expiry and duplicate-execution protection.

**Hardware needed for Milestone 3+:**
- Provide existing Arduino Uno and ESP8266 sketches for inspection.
- Confirm UART protocol and pin assignments before any firmware changes.
