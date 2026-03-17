# commanderTrack — Backlog

> Future ideas, deferred features, and known improvements.

---

## 🔴 High Priority

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

### Svelte 5 Warnings Cleanup
**Status:** Known  
**Description:** Fix pre-existing Svelte compiler warnings:
- `a11y_no_static_element_interactions` in `+layout.svelte` (3 instances)
- `state_referenced_locally` in `DeckForm.svelte` and `PlayerForm.svelte`

### Legacy Admin Routes
**Status:** Deprecated  
**Description:** `/admin`, `/admin/players`, `/admin/decks` routes are no longer linked from the UI. Consider removing the route files entirely or repurposing.

### Legacy `/rank` Route
**Status:** Deprecated  
**Description:** Rankings are now integrated into the Analytics page ("Overall" tab). The standalone `/rank` route is no longer linked. Consider removing or redirecting.

### REQ-UI-014 — Portrait-first Navigation Flow
**Status:** Idea  
**Description:** Revisit the orientation strategy so the app stays portrait in all navigation flows but presents the in-game view in landscape only when a new game is created. This affects the manifest/orientation settings, the CSS layout for `/game`, and any orientation locks or prompts (`REQ-UI-014`).

---

## 🟢 Low Priority / Ideas

### Fullscreen Game Mode
**Description:** Use the browser Fullscreen API on the game page to hide browser chrome entirely in landscape, gaining ~40px extra vertical space on mobile.

### Game History Detail View
**Description:** Allow tapping a historical game in the Matches tab to see a full match replay/timeline with play-by-play events.

### Deck Win Rate Trends
**Description:** Show win rate over time as a line chart in the Overall analytics tab for a selected player/deck.

### Export Game Data
**Description:** Allow exporting game history as CSV/JSON for external analysis.

### Notification Sound Toggle
**Description:** Add a setting to mute/unmute audio feedback (timer beeps, life change sounds).

---

*Last updated: 2025-03-18*

