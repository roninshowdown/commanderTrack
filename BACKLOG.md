# commanderTrack — Backlog

> Future ideas, deferred features, and known improvements.

---

## 🔴 High Priority

### REQ-GAME-021 — Game Interaction Reliability + Wheel UI Polish
**Status:** In Progress  
**Description:** Stabilize reaction selection, random-opponent transition timing, life/commander hold behavior, and wheel/time UI quality on the game screen.  
**Motivation:** Recent playtests show intermittent reaction toggling, unclear visual transitions, and inconsistent wheel/hold interaction behavior.

**Sub-tasks:**
- [x] Fix intermittent reaction selection reliability (`toggleReactivePlayer`) so tile taps always register when allowed
- [x] After Random Opp. roulette finishes, keep gold highlight on the chosen player for **2 seconds** before switching to Reacting
- [x] Make wheel action buttons perfectly circular on all supported viewports (remove "egg" distortion)
- [x] Commander damage hold-press must match life hold behavior: **step size 10** every **500 ms** after initial hold trigger
- [x] Improve time UI readability/clarity on the wheel (typography, spacing, contrast, and responsive sizing)
- [x] Update game tile/wheel text styling: life value in **green**, timer in **white** and visually larger (close to life-size emphasis)
- [x] Change wheel long-press animation ring from blue to **green** (same visual style as the reacting indicator) and increase overall wheel size

### REQ-OPS-001 — Structured Client-Side Logging System
**Status:** ✅ Done  
**Description:** Implement a lightweight structured logging service that captures runtime errors, warnings, and key operational events (e.g. Firestore failures, timer anomalies, auth errors, data service fallbacks) and persists them to a queryable store so an AI agent or developer can diagnose issues without requiring a live debugging session.  
**Motivation:** Several bugs have been identified post-deploy (index errors, storage upload failures, prefill regressions) that were only discoverable through manual testing. A structured log makes issues visible without a live session.  
**Requirements:**
- Log entries must include: `timestamp`, `level` (`error` | `warn` | `info`), `source` (module/function name), `message`, and optional `context` (any serialisable object)
- Logs must be stored in `localStorage` under a fixed key (`ct_log`) with a rolling cap (e.g. last 500 entries) to avoid unbounded growth
- A log viewer UI must be accessible from the profile page — **only visible in debug mode** (`VITE_DEBUG_MODE=true`)
- Replace all scattered `console.warn` / `console.error` calls across services and stores with calls to the logging service; the logger still forwards to `console` in dev mode
- The log viewer must support filtering by `level` and `source`, and provide a one-click **Copy JSON** export for pasting into an agent session

**Sub-tasks:**
- [x] Create `src/lib/services/logger.ts` — singleton with `info()`, `warn()`, `error()` methods, localStorage ring buffer (max 500 entries)
- [x] Create `src/lib/components/ui/LogViewer.svelte` — filterable table, copy-to-clipboard export
- [x] Integrate logger into `firebase-data.service.ts` (Firestore errors, timeouts)
- [x] Integrate logger into `local-storage.service.ts` (parse/write errors)
- [x] Integrate logger into `gameStore.ts` (persist/sync failures, restore errors)
- [x] Integrate logger into `auth.ts` (sign-in/out events, token errors)
- [x] Integrate logger into `scryfall.ts` (API failures)
- [x] Expose `LogViewer` in `/profile` page (debug mode only)
- [x] Document log format in `AGENTS.md` so agents know how to interpret a pasted log dump

### REQ-ZONE-012 — Zone-Scoped Active Game (1 per Zone, Shared)
**Status:** Deferred from v1  
**Description:** Each Commander Zone shall have at most one active game, shared across all zone members. Any member opening the zone sees the same game and can interact with it.  
**Impact:** Major architectural change — `ActiveGameData` storage key changes from `uid` to `zoneId`, cascading across `DataService`, `gameStore`, setup, game, and home pages.  
**Sub-tasks:**
- [ ] Change `DataService.saveActiveGame/getActiveGame/deleteActiveGame` parameter from `uid` to `zoneId`
- [ ] Update `FirebaseDataService` — Firestore doc path `activeGames/{zoneId}`
- [ ] Update `LocalStorageService` — key by `zoneId`
- [ ] Update `gameStore.ts` — `restoreActiveGame(zoneId)`, persist/sync by zone
- [ ] Update `setup/+page.svelte` — check zone-level active game
- [ ] Update `game/+page.svelte` and `+page.svelte` — restore by zone
- [ ] Change localStorage key `ct_activeGameState` to per-zone

### REQ-ZONE-013 — Real-Time Game Sync
**Status:** Deferred  
**Description:** When multiple zone members interact with the same shared game, use Firestore `onSnapshot` listeners for real-time state synchronization instead of last-write-wins.  
**Depends on:** REQ-ZONE-012

---

## 🟡 Medium Priority

### REQ-LOG-020 — Time Consumed Per Player Analytics
**Status:** ✅ Done  
**Description:** The analytics page shows how much **pool time** each player consumed over the course of a game. Displayed as a bar chart in the Matches tab alongside the existing life/damage views. Also surfaces as "Avg Time" in individual player stats.  
**Implementation:**
- Added `playerTimeConsumed?: number[]` to `GameRecord` (parallel to `playerIds`)
- `finishGame` calculates and stores consumed time per player
- Matches tab has a `time_consumed` chart type option
- Player drilldown shows average time consumed across timed games

### REQ-UI-014 — Portrait-first Navigation Flow
**Status:** Planned  
**Description:** Revisit the orientation strategy so the app stays portrait in all navigation flows but presents the in-game view in landscape only when a new game is created. This affects the manifest/orientation settings, the CSS layout for `/game`, and any orientation locks or prompts.

### REQ-CMD-020 — Redesign Commander Damage View
**Status:** Planned  
**Description:** Overhaul the commander damage interaction to be source-oriented instead of target-oriented.  
**Changes:**
- Hold-press (0.5 s) on a player tile selects that player's commander as the **damage SOURCE** (not the target).
- The hold-press triggers a circular fill animation identical to the wheel long-press, but in **yellow** instead of blue.
- Once triggered, the view shows a **commander tile** (with the commander image) representing the source, framed with a **yellow border** and labelled **"DAMAGE DEALER"**.
- Next to the source tile, one **damage counter tile per player** is displayed — the selected commander can deal damage to every player in the game, including its own owner.
- The per-player commander damage counters are arranged as a **grid that mirrors the players' seat positions** (2×2 / 2×3 layout), placed in the **top-left corner area** of each player's tile.
- Each counter starts at 0 and increments on tap. Reaching 21 commander damage from a single commander kills that player (`REQ-CMD-005`).
- Pressing the source tile or a dedicated close button exits the commander damage view.

**Sub-tasks:**
- [ ] Replace current hold-press → TARGET selection with hold-press → SOURCE selection logic
- [ ] Add yellow ring animation (reuse SVG ring component, parameterize color)
- [ ] Create `CommanderDamageOverlay.svelte` — shows source commander image + seat-grid of damage counters
- [ ] Wire damage counter taps to `gameStore.applyCommanderDamage` for each target player
- [ ] Ensure grid layout mirrors actual player seat positions (respect `upsideDown` and seat index)
- [ ] Update `PlayerTile.svelte` — display small commander damage circles on the left corner of each tile, reflecting accumulated damage per source commander

---

## 🟢 Low Priority / Ideas

### Fullscreen Game Mode
**Status:** Removed
**Description:** Fullscreen toggle was removed from game mode.

### Game History Detail View
**Description:** Allow tapping a historical game in the Matches tab to see a full match replay/timeline with play-by-play events.

### Deck Win Rate Trends
**Description:** Show win rate over time as a line chart in the Overall analytics tab for a selected player/deck.

### Export Game Data
**Description:** Allow exporting game history as CSV/JSON for external analysis.

### Notification Sound Toggle
**Description:** Add a setting to mute/unmute audio feedback (timer beeps, life change sounds).

---

*Last updated: 2026-04-13*
