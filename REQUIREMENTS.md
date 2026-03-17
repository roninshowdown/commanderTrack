# commanderTrack — Requirements Specification

> **Project:** commanderTrack — Magic: The Gathering Commander Life & Timer Tracker  
> **Version:** 1.0.0  
> **Date:** 2026-03-15  
> **Document Type:** Software Requirements Specification (SRS)

---

## Table of Contents

1. [Player Management](#1-player-management)
2. [Deck Management](#2-deck-management)
3. [Game Setup](#3-game-setup)
4. [Life Tracking](#4-life-tracking)
5. [Commander Damage](#5-commander-damage)
6. [Timer System](#6-timer-system)
7. [Turn Management](#7-turn-management)
8. [Game Completion](#8-game-completion)
9. [Analytics & Logging](#9-analytics--logging)
10. [Rankings](#10-rankings)
11. [Authentication & Authorization](#11-authentication--authorization)
12. [Data Persistence](#12-data-persistence)
13. [External Integrations](#13-external-integrations)
14. [Progressive Web App (PWA)](#14-progressive-web-app-pwa)
15. [User Interface & Experience](#15-user-interface--experience)
16. [Audio Feedback](#16-audio-feedback)
17. [Debug & Development Mode](#17-debug--development-mode)
18. [Deployment & Configuration](#18-deployment--configuration)

---

## 1. Player Management

**REQ-PLR-001:** The system shall allow authenticated users to create a new player profile with a mandatory unique name (case-insensitive) and an optional profile image.

**REQ-PLR-002:** The system shall allow authenticated users to edit an existing player's name and profile image.

**REQ-PLR-003:** The system shall allow authenticated users to delete a player. Deleting a player shall cascade-delete all decks belonging to that player.

**REQ-PLR-004:** The system shall enforce unique player names (case-insensitive comparison). Attempting to create or rename a player to an already-existing name shall display an error message.

**REQ-PLR-005:** The system shall display a list of all registered players with their name and avatar image (or a placeholder icon if no image is set).

**REQ-PLR-006:** The player form shall provide two methods for setting a profile image (both optional):
- **Image Upload** — the user can pick/upload an image file from their device (e.g., phone camera roll or file picker). The uploaded image shall be stored (e.g., as a base64 data URL in localStorage mode, or uploaded to Firebase Storage in Firebase mode) and used as the player's avatar.
- **Image URL** — the user can manually enter an external image URL.

**REQ-PLR-007:** The image upload input shall accept common image formats (JPEG, PNG, GIF, WebP) and display a preview of the selected/uploaded image before saving.

**REQ-PLR-008:** The player form shall provide a search button that uses the Scryfall API to look up a card art image by the player's name and auto-fill the image URL field.

**REQ-PLR-009:** When a player is successfully created or updated, the player form dialog/modal shall automatically close and the player list shall refresh to reflect the changes.

**REQ-PLR-010:** The system shall confirm with the user before deleting a player, displaying the player's name and informing them that all associated decks will also be removed.

---

## 2. Deck Management

**REQ-DECK-001:** The system shall allow authenticated users to create a new deck by specifying an owner (player), commander name, commander image URL, and zero or more MTG mana colors (white, blue, black, red, green).

**REQ-DECK-002:** The system shall allow authenticated users to edit an existing deck's owner, commander name, image URL, and colors.

**REQ-DECK-003:** The system shall allow authenticated users to delete a deck after confirmation.

**REQ-DECK-004:** Deck creation shall be disabled when no players exist. The UI shall display a prompt directing the user to add players first.

**REQ-DECK-005:** The deck creation/edit form shall provide a commander name input field with autocomplete functionality. As the user types (≥ 2 characters), the system shall query the Scryfall autocomplete API and display up to 8 suggestions.

**REQ-DECK-006:** When a commander name suggestion is selected or the search button is clicked, the system shall perform a Scryfall fuzzy search for the card. If found, the commander name, art-crop image URL, and color identity shall be auto-populated.

**REQ-DECK-007:** The deck form shall allow manual toggling of all five MTG mana colors (white, blue, black, red, green) via color pip selectors.

**REQ-DECK-008:** The system shall display a list of all decks showing the commander image (or placeholder), commander name, owner name, and color identity pips.

---

## 3. Game Setup

**REQ-SETUP-001:** The system shall allow the user to configure a new game by selecting a player count of 2, 3, 4, 5, or 6 players.

**REQ-SETUP-002:** For each player slot (up to the selected player count), the user shall select a player and one of that player's decks from dropdown selectors.

**REQ-SETUP-003:** The system shall prevent selecting the same player in multiple slots. Each player dropdown shall exclude players already selected in other slots.

**REQ-SETUP-004:** The system shall preload all players and decks from the data service on setup page load to avoid async race conditions in dropdown rendering.

**REQ-SETUP-005:** The user shall be able to select the starting life total from the options: 20, 25, 30, 40 (default), and 50.

**REQ-SETUP-006:** The user shall be able to select one of two timer variants: Variant A or Variant B (default).

**REQ-SETUP-007:** For **Timer Variant A**, the user shall configure:
- Pool Time (minutes, default 30, range 1–120)
- Shared Start Time (minutes, default 10, range 1–60)

**REQ-SETUP-008:** For **Timer Variant B**, the user shall configure:
- Pool Time (minutes, default 30, range 1–120)
- Player Time (minutes, default 2, range 0.5–30, step 0.5)
- Reaction Time (minutes, default 1, range 0.5–30, step 0.5)
- Scale Factor for Player Time (seconds/round, default 10, range 0–60)
- Scale Factor for Reaction Time (seconds/round, default 10, range 0–60)

**REQ-SETUP-009:** The system shall validate that all player slots have both a player and a deck selected before allowing the game to start. If validation fails, a toast error message shall identify the incomplete slot.

**REQ-SETUP-010:** Clicking "Start Game" shall initialize the game state in the game store and navigate the user to the game page.

---

## 4. Life Tracking

**REQ-LIFE-001:** The system shall display each player's current life total prominently on their player tile during an active game.

**REQ-LIFE-002:** Each player tile shall provide + and − buttons for adjusting life in increments of ±1.

**REQ-LIFE-003:** The system shall support a **long-press** gesture (hold ≥ 500ms) on the + or − buttons to apply ±10 life in a single action.

**REQ-LIFE-004:** When a player's life total reaches 0 or below, the system shall mark that player as dead (life clamped to 0, `isDead = true`).

**REQ-LIFE-005:** A dead player's tile shall be visually dimmed (reduced opacity, grayscale filter) and their interaction controls shall be disabled.

**REQ-LIFE-006:** The system shall track cumulative `totalLifeGained` and `totalLifeLost` for each player over the course of a game.

**REQ-LIFE-007:** Every life change event shall generate a log entry recording the game ID, player ID, player name, value (+/−), type (`life`), and timestamp.

---

## 5. Commander Damage

**REQ-CMD-001:** The system shall provide a "Commander Damage" toggle mode accessible via a button in the game controls.

**REQ-CMD-002:** When commander damage mode is activated, the user shall first tap a player tile to select the **source** (attacking) commander.

**REQ-CMD-003:** After the source is selected, the user shall use the − button on a **different** player (target) to apply commander damage from the selected source.

**REQ-CMD-004:** Commander damage shall reduce the target player's life total and be tracked per-source in the `commanderDamageTaken` map (keyed by source player ID).

**REQ-CMD-005:** If a player accumulates 21 or more commander damage from a single source, the system shall mark that player as dead (`isDead = true`).

**REQ-CMD-006:** Commander damage events shall generate a log entry with type `commander_damage` and the source player ID recorded.

**REQ-CMD-007:** Each player tile shall display a summary of accumulated commander damage pips when any commander damage has been taken.

**REQ-CMD-008:** The source commander tile shall be visually highlighted (amber border and glow) while commander damage mode is active.

**REQ-CMD-009:** The user shall be able to exit commander damage mode by clicking the toggle button again, which resets the source selection.

---

## 6. Timer System

### 6.1 General Timer Requirements

**REQ-TMR-001:** The system shall implement a timer engine as a pure-logic module with no UI dependencies, ticking at 1-second intervals.

**REQ-TMR-002:** The game timer shall support the following phases: `IDLE`, `SHARED_START` (Variant A only), `PLAYER_TIME`, `REACTION_TIME` (Variant B only), `POOL_TIME`.

**REQ-TMR-003:** The timer display shall show the current phase label, the active countdown value (formatted as MM:SS or HH:MM:SS), the current round number, and the current turn number.

**REQ-TMR-004:** The system shall provide Start, Pause, and Resume controls for the game timer. The first activation transitions from `IDLE` to the initial timer phase.

**REQ-TMR-005:** Each player shall have an individual pool time remaining counter, initialized to the configured pool time value at game start.

**REQ-TMR-006:** When the currently active timer value is ≤ 10 seconds and > 0, the system shall enter a "critical" state, triggering visual pulsing and an audio alert.

### 6.2 Variant A Timer

**REQ-TMR-A01:** Variant A shall begin in the `SHARED_START` phase, counting down a shared start timer visible to all players.

**REQ-TMR-A02:** When the shared start timer reaches 0, the system shall automatically transition to the `PLAYER_TIME` phase, which counts down the active player's pool time.

**REQ-TMR-A03:** In Variant A, there is no reaction time concept. Clicking a non-active player shall have no timer effect.

**REQ-TMR-A04:** When advancing to the next turn in Variant A, if shared start time remains, the new player's turn begins in `SHARED_START` phase; otherwise, it begins in `PLAYER_TIME` phase.

### 6.3 Variant B Timer

**REQ-TMR-B01:** Variant B shall begin in the `PLAYER_TIME` phase for the active player, using the configured player time as the initial countdown.

**REQ-TMR-B02:** Player time shall **scale per round** according to the formula: `playerTimeSeconds + scaleFactorPlayerTimeSeconds × (round − 1)`.

**REQ-TMR-B03:** When a player's player time reaches 0, the system shall automatically fall through to that player's `POOL_TIME` phase.

**REQ-TMR-B04:** The system shall allow passing priority to a **reactive player** (non-active, non-dead) by clicking their tile. This transitions the timer to `REACTION_TIME` for the selected reactive player.

**REQ-TMR-B05:** Reaction time shall be reset to the scaled value for the current round upon each activation: `reactionTimeSeconds + scaleFactorReactionTimeSeconds × (round − 1)`.

**REQ-TMR-B06:** When a reactive player's reaction time reaches 0, the system shall automatically fall through to that player's `POOL_TIME`.

**REQ-TMR-B07:** The system shall allow returning priority from the reactive player back to the active player. This resumes the active player's `PLAYER_TIME` if remaining, or `POOL_TIME` otherwise.

**REQ-TMR-B08:** The system shall provide a "Random Opponent" button that randomly selects a non-active, non-dead player and assigns them as the reactive player.

---

## 7. Turn Management

**REQ-TURN-001:** The system shall provide a "Next Turn" button to advance to the next player's turn. This button shall be disabled while in the `IDLE` phase.

**REQ-TURN-002:** Turn advancement shall skip dead players, advancing to the next alive player in clockwise (index) order.

**REQ-TURN-003:** The system shall track a `turnCount` counter, incrementing by 1 with each turn advancement.

**REQ-TURN-004:** The system shall track a `currentRound` counter. A new round is incremented when the number of turns taken equals a multiple of the number of alive players.

**REQ-TURN-005:** In Variant B, advancing to the next turn shall reset the new active player's `playerTimeRemaining` to the scaled player time for the current round.

**REQ-TURN-006:** Turn advancement shall clear any active reactive player state.

**REQ-TURN-007:** A sound effect shall play when a turn ends.

---

## 8. Game Completion

**REQ-GAME-001:** The system shall provide a "Finish Game" button that opens a modal for selecting the winner.

**REQ-GAME-002:** The winner selection modal shall display all non-dead players with their name, commander name, and commander image.

**REQ-GAME-003:** Selecting a winner shall stop the timer, mark the game as finished, and record the `winnerId`.

**REQ-GAME-004:** Upon game completion, a `GameRecord` shall be persisted containing: player IDs, deck IDs, max life, timer variant, winner ID, creation timestamp, and finish timestamp.

**REQ-GAME-005:** After a game is finished, the UI shall display a "Game Over" screen showing the winner's name and a "New Game" button.

**REQ-GAME-006:** The "New Game" action shall fully reset the game state (clear game state, log entries, and commander damage mode) and navigate to the setup page.

**REQ-GAME-007:** If the game page is loaded with no active game or a corrupted game state, the system shall display an appropriate message and a button to navigate to setup.

---

## 9. Analytics & Logging

### 9.1 Match Analytics

**REQ-LOG-001:** The analytics page shall provide a "Match" tab showing charts and event logs for the current or a selected historical game.

**REQ-LOG-002:** The system shall provide a dropdown to select a historical match from all recorded games, or view the current game.

**REQ-LOG-003:** Match analytics shall support three data views: Life Over Time, Damage Dealt, and Damage Taken, selectable via toggle buttons.

**REQ-LOG-004:** Match charts shall be renderable as either line or bar chart types, selectable via toggle buttons.

**REQ-LOG-005:** The "Life Over Time" chart shall display each player's life total as a line dataset, starting at the configured max life, with data points for each log event.

**REQ-LOG-006:** The "Damage Dealt" chart shall aggregate negative-value log entries by source player and display as a bar chart.

**REQ-LOG-007:** The "Damage Taken" chart shall aggregate negative-value log entries by target player and display as a bar chart.

**REQ-LOG-008:** The event log shall display a scrollable (max 400px height) list of log entries, each showing timestamp (HH:MM:SS), player name, event type badge (LIFE or CMD), and value with color coding (green for positive, red for negative).

### 9.2 Overall Dashboard (replaces Player + Global tabs)

**REQ-LOG-009:** The analytics page shall provide an "Overall" tab with a player filter dropdown (default: "All Players"). When "All Players" is selected, zone-wide statistics and rankings are shown. When a specific player is selected, that player's individual stats are shown.

**REQ-LOG-010:** Player statistics shall include: total games played, wins, losses, and win rate (percentage).

**REQ-LOG-011:** The player drill-down shall display a doughnut chart showing wins, losses, and draws distribution.

**REQ-LOG-012:** The player drill-down shall display a bar chart showing games played per deck.

**REQ-LOG-013:** The player drill-down shall display a detailed deck breakdown table showing each deck's name, games played, wins, and losses.

### 9.3 Global Statistics & Rankings (shown when "All Players" is selected in Overall tab)

**REQ-LOG-014:** The Overall tab with "All Players" selected shall show aggregate statistics across all games and players within the Commander Zone.

**REQ-LOG-015:** Global statistics shall display summary cards for total games, total players, and total decks.

**REQ-LOG-016:** The global view shall display a bar chart of "Most Wins" per player sorted descending.

**REQ-LOG-017:** The global view shall display a bar chart of "Games Per Player" sorted descending.

**REQ-LOG-018:** The global view shall display a doughnut chart of "Deck Usage" showing the top 10 most-used decks.

**REQ-LOG-019:** The global view shall display integrated rankings with Players/Decks sub-tabs and sort controls (Won, Played, Lost). The #1 ranked entry shall display a crown icon.

---

## 10. Rankings (integrated into Analytics — see REQ-LOG-019)

> Rankings are now displayed within the Analytics page "Overall" tab under "All Players" view. The standalone `/rank` route is deprecated.

**REQ-RANK-001:** Rankings shall be displayed within the Analytics "Overall" tab with two sub-tabs: Players and Decks.

**REQ-RANK-002:** Player rankings shall display each player's games played, games won, games lost, and win rate percentage.

**REQ-RANK-003:** Deck rankings shall display each deck's commander name, owner name, games played, games won, games lost, and win rate percentage.

**REQ-RANK-004:** Rankings shall be sortable by three criteria: Won (default), Played, or Lost — selectable via sort buttons.

**REQ-RANK-005:** The #1 ranked entry shall display a crown icon instead of the numeric rank position.

**REQ-RANK-006:** Win rate shall be calculated as `(wins / gamesPlayed) × 100` and displayed to one decimal place. Players with zero games shall show 0.0%.

**REQ-RANK-007:** A game counts as a "loss" for a player only if a winner was declared and it was not that player. Games without a declared winner do not count as losses.

---

## 11. Authentication & Authorization

**REQ-AUTH-001:** The application shall **always require Firebase Authentication** in production mode. Unauthenticated users shall not be able to access any application functionality beyond the login screen.

**REQ-AUTH-002:** The system shall support two authentication methods via Firebase Authentication:
- **Google Sign-In** — OAuth popup-based sign-in with a Google account.
- **Email/Password (Basic Auth)** — users can register and sign in with an email address and password.

**REQ-AUTH-003:** On initial application load in production mode, the **first screen** presented to the user shall be the authentication view (Firebase login), containing the Google Sign-In option and the Email/Password form. The home navigation tiles (e.g. "New Game", "Game", "Analytics", "Rankings", "Admin") shall be **hidden** until the user is successfully authenticated.

**REQ-AUTH-004:** The home page shall present a login screen with two options (Google Sign-In button and an Email/Password form) when the user is not authenticated. The navigation grid and all app features shall be hidden until the user is signed in.

**REQ-AUTH-005:** The Email/Password authentication shall support both registration (create account) and login flows. The UI shall provide a toggle or link to switch between "Sign In" and "Create Account" modes.

**REQ-AUTH-006:** In **Developer/Debug Mode** (`VITE_DEBUG_MODE=true`), the system shall bypass Firebase Authentication entirely, automatically providing a local dev user identity without requiring login. This is the only mode where authentication is not enforced.

**REQ-AUTH-007:** All application sections (Admin, Game Setup, Game, Analytics, Rankings) shall require authentication. Unauthenticated access attempts shall redirect the user to the login screen.

**REQ-AUTH-008:** The authenticated top bar shall display the current user's avatar with a dropdown menu containing: Profile link (navigating to `/profile`), and Sign Out button. The zone tag shall include a dropdown for zone switching and an "Edit" link (navigating to `/zones`).

**REQ-AUTH-009:** The home page shall display a "DEV MODE" badge when Developer/Debug Mode is active instead of requiring login.

**REQ-AUTH-010:** Firestore security rules shall enforce that only authenticated users (`request.auth != null`) can read or write any document.

**REQ-AUTH-011:** Sign-out shall clear the user session and return the user to the login screen.

---

## 12. Data Persistence

### 12.1 Data Service Architecture

**REQ-DATA-001:** The system shall define a `DataService` interface providing CRUD operations for Players, Decks, Game Records, and Log Entries.

**REQ-DATA-002:** The system shall provide two implementations of `DataService`: `FirebaseDataService` (Firestore-backed) and `LocalStorageService` (browser localStorage-backed).

**REQ-DATA-003:** The system shall auto-detect the appropriate data service at runtime. If valid Firebase credentials are present (API key is not a placeholder), `FirebaseDataService` shall be used; otherwise, `LocalStorageService`.

**REQ-DATA-004:** Data service initialization shall be lazy and singleton-based. A single instance shall be shared across the application.

**REQ-DATA-005:** Firebase module loading shall be guarded by a 5-second timeout. If Firebase fails to initialize within the timeout, the system shall fall back to `LocalStorageService`.

**REQ-DATA-006:** A synchronous data service getter shall be available for fire-and-forget persistence calls (e.g., during game state updates), returning the initialized instance or a temporary `LocalStorageService`.

### 12.2 LocalStorage Service

**REQ-DATA-007:** The `LocalStorageService` shall store data under namespaced keys: `ct_players`, `ct_decks`, `ct_games`, `ct_logs`.

**REQ-DATA-008:** All `LocalStorageService` methods shall return Promises for interface compatibility, though execution is synchronous.

**REQ-DATA-009:** Game records retrieved from localStorage shall be sorted by `createdAt` descending.

**REQ-DATA-010:** Log entries retrieved from localStorage shall be sorted by `timestamp` descending.

### 12.3 Firebase Service

**REQ-DATA-011:** The `FirebaseDataService` shall use Firestore collections: `players`, `decks`, `games`, `gameLogs`.

**REQ-DATA-012:** All Firestore operations shall be wrapped with an 8-second timeout to prevent indefinite hangs.

**REQ-DATA-013:** Firestore composite indexes shall be configured for: `gameLogs` (gameId ASC, timestamp DESC) to support per-game log queries.

**REQ-DATA-014:** Deleting a player via `FirebaseDataService` shall first delete all decks belonging to that player, then delete the player document.

### 12.4 Game State Persistence

**REQ-DATA-015:** Game record persistence and log entry persistence during gameplay shall be fire-and-forget. Storage errors shall be caught and logged as warnings, never crashing the game.

**REQ-DATA-016:** Log entries shall be persisted to the data service immediately upon creation, in addition to being stored in the in-memory game store.

---

## 13. External Integrations

### 13.1 Scryfall API

**REQ-EXT-001:** The system shall integrate with the Scryfall REST API (`https://api.scryfall.com`) for MTG card data lookup.

**REQ-EXT-002:** The system shall provide a fuzzy name search endpoint (`/cards/named?fuzzy=`) that returns the card's canonical name, art-crop image URL, and color identity.

**REQ-EXT-003:** The system shall provide an autocomplete endpoint (`/cards/autocomplete?q=`) that returns up to 20 matching card name suggestions for inputs ≥ 2 characters.

**REQ-EXT-004:** For double-faced cards, the system shall use the front face's image URIs.

**REQ-EXT-005:** Scryfall color identity letters (W, U, B, R, G) shall be mapped to the internal MTG color type (white, blue, black, red, green).

**REQ-EXT-006:** Scryfall API failures shall be handled gracefully — returning `null` for search and an empty array for autocomplete, without error dialogs.

### 13.2 Firebase

**REQ-EXT-007:** The system shall use Firebase SDK v11+ for authentication (Google Sign-In) and Firestore for cloud data persistence.

**REQ-EXT-008:** Firebase configuration shall be provided via environment variables (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`).

**REQ-EXT-009:** Firebase modules shall be dynamically imported to avoid bundling them when not in use.

### 13.3 DiceBear API

**REQ-EXT-010:** Mock player avatars shall use the DiceBear Avataaars API (`https://api.dicebear.com/7.x/avataaars/svg?seed=`) with the player name as seed for deterministic avatar generation.

---

## 14. Progressive Web App (PWA)

**REQ-PWA-001:** The application shall be installable as a Progressive Web App with a web manifest declaring: app name ("Commander Track"), short name ("CmdrTrack"), standalone display mode, portrait orientation, dark theme color (`#1a1a2e`), and icons (192×192 and 512×512 PNG).

**REQ-PWA-002:** The application shall include a service worker that caches all build assets and static files for offline use.

**REQ-PWA-003:** The service worker shall serve cached responses for previously fetched GET requests, falling back to network when not cached.

**REQ-PWA-004:** The service worker shall NOT cache requests to Firebase or Scryfall API domains, ensuring live data is always fetched from the network.

**REQ-PWA-005:** When offline and a navigation request cannot be fulfilled, the service worker shall serve `/index.html` as a fallback; if that is also unavailable, return a 503 "Offline" response.

**REQ-PWA-006:** On service worker activation, old caches (from previous versions) shall be purged.

---

## 15. User Interface & Experience

### 15.1 Visual Theme

**REQ-UI-001:** The application shall use a dark "cyberpunk" visual theme featuring a deep black background (`#0a0a0f`), crimson/neon-red primary color (`#e8193b`), and cyan accent color (`#00e5ff`).

**REQ-UI-002:** The application shall use the "Inter" font family for display text and a monospace font family ("JetBrains Mono" / "Fira Code") for numeric and timer displays with `tabular-nums` variant.

**REQ-UI-003:** UI elements shall use generously rounded border radii (12px–28px) for a bubbly/modern feel.

**REQ-UI-004:** Interactive elements shall include subtle neon glow effects on hover and active states (red glow for primary, cyan glow for secondary).

**REQ-UI-005:** The body background shall include a subtle scanline texture overlay using a repeating linear gradient.

**REQ-UI-006:** MTG mana colors shall be visually represented using dedicated CSS custom properties: white (`#f9faf4`), blue (`#0e68ab`), black (`#150b00`), red (`#d3202a`), green (`#00733e`).

### 15.2 Layout & Navigation

**REQ-UI-007:** The home page shall display the app title, authentication status, and a navigation layout with two cards: a primary card linking to New Game (setup) or Resume Game (game), and an Analytics card (log) that includes integrated rankings.

**REQ-UI-008:** All non-home pages shall display a sticky top bar with a "← Menu" back button that navigates to the home page.

**REQ-UI-009:** The application layout shall be capped at a max width of 600px and centered, optimized for mobile-first usage.

**REQ-UI-010:** The application shall respect `safe-area-inset-*` CSS environment variables for proper display on devices with notches or home indicators.

### 15.3 Game Screen Layout

**REQ-UI-011:** Player tiles shall be arranged in a responsive grid: 2 columns for 2 players, 2 columns for 3–4 players, 3 columns for 5–6 players (falling back to 2 columns on screens ≤ 480px).

**REQ-UI-012:** Each player tile shall display: commander background image (faded at 20% opacity), player name, commander name, life total with +/− controls, pool time remaining, active/reactive status badges, and commander damage pips.

**REQ-UI-013:** The active player's tile shall have a green border with a success glow. The reactive player's tile shall display a "Reacting" badge.

**REQ-UI-014:** The timer-ticking player's tile shall have a red border.

### 15.4 Components

**REQ-UI-015:** The system shall provide a reusable `Button` component supporting variants (primary, secondary, ghost, danger), sizes (sm, md, lg), full-width mode, and a disabled state.

**REQ-UI-016:** The system shall provide a reusable `Modal` component with a title, backdrop overlay, close-on-escape, and slotted content.

**REQ-UI-017:** The system shall provide a reusable `Toast` component for success and error notification messages with auto-dismissal or manual close.

**REQ-UI-018:** The system shall provide a reusable `Icon` component supporting configurable name, size, and color props.

**REQ-UI-019:** The system shall provide a reusable `ColorPip` component rendering MTG mana color symbols as visual pips.

**REQ-UI-020:** The system shall provide a `ChartWrapper` component integrating Chart.js to render line, bar, and doughnut chart types with configurable data and height.

### 15.5 Animations

**REQ-UI-021:** The system shall implement CSS animations for: fade-in (with upward translate), scale-in, pulse (opacity), pulse-border (expanding box-shadow), glow-green, and neon-flicker (on the logo ring).

**REQ-UI-022:** List items and cards shall use the `animate-fade-in` class for entry animations.

### 15.6 Accessibility

**REQ-UI-023:** All interactive elements shall have a minimum touch target of 44px height for mobile usability.

**REQ-UI-024:** Player tiles shall be keyboard-accessible with `role="button"` and `tabindex="0"`, responding to Enter key presses.

**REQ-UI-025:** Form inputs shall have associated `<label>` elements with matching `for`/`id` attributes.

---

## 16. Audio Feedback

**REQ-SND-001:** The system shall provide audio feedback using the Web Audio API (`AudioContext`) with synthesized sine-wave tones (no external audio files).

**REQ-SND-002:** A life gain event shall trigger a two-note ascending sequence (C5 → E5).

**REQ-SND-003:** A life loss event shall trigger a two-note descending sequence (E4 → C4).

**REQ-SND-004:** A critical timer warning (≤ 10 seconds remaining) shall trigger a repeating beep tone (A5).

**REQ-SND-005:** A turn end event shall trigger a three-note ascending sequence (A4 → C#5 → E5).

**REQ-SND-006:** All audio tones shall play at a low gain (0.1) with an exponential fade-out, each note lasting 120ms.

**REQ-SND-007:** The `AudioContext` shall be lazily initialized on first use.

---

## 17. Debug & Development Mode

**REQ-DBG-001:** The system shall support a debug mode activated by the environment variable `VITE_DEBUG_MODE=true`.

**REQ-DBG-002:** In debug mode, the `LocalStorageService` shall auto-initialize with a comprehensive mock dataset on first launch (when no previous data exists).

**REQ-DBG-003:** Mock data shall include: 6 players (with DiceBear avatars), 10–18 commander decks (with real Scryfall card images and colors), 10+ game records (with realistic timestamps spanning 0–30 days), and corresponding log entries.

**REQ-DBG-004:** Mock data initialization shall be idempotent — a `ct_mock_initialized` localStorage flag shall prevent re-initialization on subsequent page loads.

**REQ-DBG-005:** The system shall expose debug utilities on the `window.__debugUtils` object in debug mode, including: `logDebugInfo()` (data counts), `clearMockData()` (clear and regenerate), and `isDebugMode()`.

**REQ-DBG-006:** When debug mode is active, the console shall display a "🎮 DEBUG MODE ACTIVE" message with counts of loaded mock data.

**REQ-DBG-007:** A `dev:debug` npm script shall be provided that enables debug mode and starts the Vite dev server in a single command.

---

## 18. Deployment & Configuration

**REQ-DEPLOY-001:** The application shall be built as a static site using SvelteKit with the `@sveltejs/adapter-static` adapter, suitable for hosting on Firebase Hosting or any static file server.

**REQ-DEPLOY-002:** The system shall support two operational modes:
- **Production Mode** — Firebase Authentication required (Google Sign-In or Email/Password), Firestore persistence.
- **Developer/Debug Mode** (`VITE_DEBUG_MODE=true`) — localStorage with auto-populated mock data, authentication bypassed with a local dev user.

**REQ-DEPLOY-003:** Environment configuration shall use `.env` files with `VITE_`-prefixed variables, processed by Vite at build time.

**REQ-DEPLOY-004:** An `npm run deploy` script shall build the application and deploy to Firebase Hosting.

**REQ-DEPLOY-005:** An `npm run deploy:rules` script shall deploy Firestore security rules only.

**REQ-DEPLOY-006:** An `npm run deploy:all` script shall build the application and deploy both hosting and all Firebase configuration (rules, indexes).

**REQ-DEPLOY-007:** An environment switching script (`scripts/switch-env.js`) shall be provided to easily toggle between debug and firebase environment configurations.

**REQ-DEPLOY-008:** The system shall use Svelte 5 with runes reactivity (`$state`, `$derived`, `$props`, `$effect`), SvelteKit 2, Vite 5, and TypeScript 5.

---

## 19. Commander Zones

**REQ-ZONE-001:** Users can create, join, browse, leave, and delete Commander Zones. Zones scope all games, stats, and rankings.

**REQ-ZONE-002:** Zone names must be globally unique (case-insensitive). Users may belong to a maximum of 5 zones. Zones may have up to 20 members.

**REQ-ZONE-003:** Each zone member has a display name (unique within the zone) and a role (creator or member).

**REQ-ZONE-004:** The zone creator can delete the zone (cascade-deletes all games and logs). The creator cannot leave their own zone.

**REQ-ZONE-005:** The zone tag in the header shall include a dropdown for switching zones and an "Edit" link (with settings icon) navigating to the zones management page.

**REQ-ZONE-010:** Zone cards in the "My Zones" tab shall show an expand/collapse control that reveals a list of all member display names and roles.

**REQ-ZONE-011:** The zone creator shall be able to remove any non-creator member from the zone via a remove button in the expanded member list.

---

## 20. Landscape Game Optimization

**REQ-UI-027:** In landscape orientation on viewports ≤ 500px height, the game page shall fit within the viewport without vertical scrolling.

**REQ-UI-028:** In landscape game mode, the top navigation bar shall be hidden. A "Menu" button shall be added to the game controls to provide navigation back to the home page.

**REQ-UI-029:** In landscape game mode, player tiles, timer display, and game controls shall use compact sizing (reduced min-heights, smaller fonts, icon-only controls where appropriate).

---

## Data Model Summary

| Entity | Key Fields |
|---|---|
| **Player** | `id`, `name`, `imageUrl?` |
| **Deck** | `id`, `playerId`, `commanderName`, `commanderImageUrl`, `colors: MtgColor[]` |
| **GameConfig** | `id`, `maxLife`, `timerConfig: TimerConfigA \| TimerConfigB`, `createdAt` |
| **GamePlayerState** | `playerId`, `deckId`, `life`, `poolTimeRemaining`, `playerTimeRemaining`, `reactionTimeRemaining`, `commanderDamageTaken`, `isDead`, … |
| **GameState** | `config`, `players[]`, `activePlayerIndex`, `reactivePlayerIndex`, `currentRound`, `turnCount`, `isRunning`, `isFinished`, `winnerId`, `timerInfo` |
| **GameRecord** | `id`, `playerIds[]`, `deckIds[]`, `maxLife`, `timerVariant`, `winnerId`, `createdAt`, `finishedAt` |
| **LogEntry** | `id`, `gameId`, `playerId`, `playerName`, `value`, `type`, `sourcePlayerId?`, `timestamp` |
| **RankEntry** | `playerId`, `playerName`, `deckId?`, `commanderName?`, `gamesPlayed`, `gamesWon`, `gamesLost`, `winRate` |

---

*End of Requirements Specification*
