# AGENTS.md — commanderTrack

## Purpose

This file is a **short onboarding guide for AI agents**. Keep it lean and avoid repeating detailed policy that already lives elsewhere.

## Source of truth

- `REQUIREMENTS.md` — functional behavior, data model, REQ-IDs, and domain rules.
- `.github/copilot-instructions.md` — Copilot-specific coding/architecture conventions.

If a rule exists in those files, do not duplicate it here. Update the source doc instead.

## What to know quickly

- App: MTG Commander life/timer tracker PWA built with SvelteKit + TypeScript + Firebase.
- Architecture: routes → components → stores/services → `DataService` → Firebase or localStorage.
- Persistence must go through `src/lib/services/data-service.interface.ts` and one of its two implementations.
- Timer/game logic lives in `src/lib/services/timer-engine.ts` and `src/lib/stores/gameStore.ts`.
- Auth flow lives in `src/lib/firebase/auth.ts`; debug mode bypasses Firebase auth.
- Runtime diagnostics are stored in `localStorage` key `ct_log` via `src/lib/services/logger.ts` (ring buffer, max 500).
- Debug log viewer is on `src/routes/profile/+page.svelte` (debug mode only) via `src/lib/components/ui/LogViewer.svelte`.

## Debug log format

- Entry shape: `{ timestamp, level, source, message, context? }`
- Levels: `error | warn | info`
- If a user pastes a JSON dump from `ct_log`, prioritize newest entries first (the array is stored newest-first).

## Local commands

- Debug/mock dev: `npm run dev:debug`
- Firebase dev: `npm run dev:firebase`
- Type check: `npm run check`
- Build: `npm run build`
- Deploy hosting: `npm run deploy`
- Deploy Firestore rules: `npm run deploy:rules`
- Switch env: `node scripts/switch-env.js debug` or `firebase`

## Editing guidance

- Prefer small, targeted changes.
- Reuse existing UI primitives and service boundaries.
- Validate changes with `npm run check`.

