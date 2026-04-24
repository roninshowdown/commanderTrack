/* ============================================
   Data Models & Type Definitions
   ============================================ */

/** MTG mana colors */
export type MtgColor = 'white' | 'blue' | 'black' | 'red' | 'green';

/**
 * Player — runtime view model, NOT a stored entity.
 * Constructed from zone membership (name) + account profile (image).
 * `id` = auth UID.
 */
export interface Player {
	id: string;
	name: string;
	imageUrl?: string;
}

/** Account-level profile — no name (name is per-zone). */
export interface AccountProfile {
	imageUrl?: string;
}

/** Deck belonging to an account (playerId = auth UID) */
export interface Deck {
	id: string;
	playerId: string;
	commanderName: string;
	commanderImageUrl: string;
	colors: MtgColor[];
}

/** Timer variant identifier */
export type TimerVariant = 'A' | 'B' | 'none';

/** Variant A (Simple) timer config */
export interface TimerConfigA {
	variant: 'A';
	poolTimeSeconds: number;
	sharedStartTimeSeconds: number;
	/** If true, non-active players can claim reaction time that drains their pool time */
	enableReaction?: boolean;
}

/** Variant B (Progressive) timer config */
export interface TimerConfigB {
	variant: 'B';
	poolTimeSeconds: number;
	playerTimeSeconds: number;
	reactionTimeSeconds: number;
	scaleFactorPlayerTimeSeconds: number;
	scaleFactorReactionTimeSeconds: number;
}

/** No timer — turns and rounds are tracked but no countdown runs */
export interface TimerConfigNone {
	variant: 'none';
}

export type TimerConfig = TimerConfigA | TimerConfigB | TimerConfigNone;

/** Game configuration created during setup */
export interface GameConfig {
	id: string;
	maxLife: number;
	timerConfig: TimerConfig;
	createdAt: number;
}

/** In-game per-player state */
export interface GamePlayerState {
	playerId: string;
	deckId: string;
	playerName: string;
	commanderName: string;
	commanderImageUrl: string;
	life: number;
	poolTimeRemaining: number;
	playerTimeRemaining: number;
	reactionTimeRemaining: number;
	commanderDamageTaken: Record<string, number>;
	totalLifeGained: number;
	totalLifeLost: number;
	isDead: boolean;
}

/** Timer phase state machine */
export type TimerPhase =
	| 'IDLE'
	| 'SHARED_START'
	| 'PLAYER_TIME'
	| 'REACTION_TIME'
	| 'POOL_TIME';

/** Which timer source is actively counting down */
export interface ActiveTimerInfo {
	phase: TimerPhase;
	targetPlayerIndex: number;
}

/** Full game state kept in memory */
export interface GameState {
	config: GameConfig;
	players: GamePlayerState[];
	activePlayerIndex: number;
	reactivePlayerIndices: number[];
	eliminationOrder: string[];
	currentRound: number;
	turnCount: number;
	isRunning: boolean;
	isFinished: boolean;
	winnerId: string | null;
	timerInfo: ActiveTimerInfo;
	sharedStartTimeRemaining: number;
}

/** Log entry for life / commander-damage changes */
export interface LogEntry {
	id: string;
	gameId: string;
	playerId: string;
	playerName: string;
	value: number;
	type: 'life' | 'commander_damage';
	sourcePlayerId?: string;
	timestamp: number;
	zoneId?: string;
}

/** Analytics V2 event stream (isolated from LogEntry history) */
export type AnalyticsEventTypeV2 = 'reaction' | 'reaction_claimed' | 'reaction_dropped' | 'round_marker' | 'turn_start';

/** Analytics V2 event persisted for additional measures like reactions and rounds */
export interface AnalyticsEventV2 {
	id: string;
	gameId: string;
	zoneId: string;
	type: AnalyticsEventTypeV2;
	timestamp: number;
	playerId?: string;
	round?: number;
}

/** Rank entry (computed, not stored) */
export interface RankEntry {
	playerId: string;
	playerName: string;
	deckId?: string;
	commanderName?: string;
	gamesPlayed: number;
	gamesWon: number;
	gamesLost: number;
	winRate: number;
}

/** Game record persisted after a game ends */
export interface GameRecord {
	id: string;
	playerIds: string[];
	deckIds: string[];
	maxLife: number;
	timerVariant: TimerVariant;
	winnerId: string | null;
	secondPlaceId?: string | null;
	thirdPlaceId?: string | null;
	eliminationOrder?: string[];
	createdAt: number;
	finishedAt: number | null;
	zoneId: string;
	/** Pool time consumed per player (seconds), parallel to playerIds. Only present for timed games. */
	playerTimeConsumed?: number[];
}

/* ── Commander Zone ── */

/** Zone membership role */
export type ZoneRole = 'creator' | 'member';

/** Per-zone member info (stored inside the zone document) */
export interface ZoneMemberInfo {
	displayName: string;
	role: ZoneRole;
	joinedAt: number;
}

/** Commander Zone — a play group that scopes games, stats, and rankings */
export interface CommanderZone {
	id: string;
	name: string;
	password?: string;
	creatorId: string;
	memberIds: string[];
	members: Record<string, ZoneMemberInfo>;
	createdAt: number;
}

/* ── Active Game Persistence ── */

/** Persisted active game data (max one per account) */
export interface ActiveGameData {
	gameState: GameState;
	logEntries: LogEntry[];
	zoneId: string;
	updatedAt: number;
}

