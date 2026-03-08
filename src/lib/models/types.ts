/* ============================================
   Data Models & Type Definitions
   ============================================ */

/** MTG mana colors */
export type MtgColor = 'white' | 'blue' | 'black' | 'red' | 'green';

/** Player profile */
export interface Player {
	id: string;
	name: string;
	imageUrl?: string;
}

/** Deck belonging to a player */
export interface Deck {
	id: string;
	playerId: string;
	commanderName: string;
	commanderImageUrl: string;
	colors: MtgColor[];
}

/** Timer variant */
export type TimerVariant = 'A' | 'B';

/** Variant A timer config */
export interface TimerConfigA {
	variant: 'A';
	poolTimeSeconds: number;       // default 1800 (30 min)
	sharedStartTimeSeconds: number; // default 600 (10 min)
}

/** Variant B timer config */
export interface TimerConfigB {
	variant: 'B';
	poolTimeSeconds: number;              // default 1800 (30 min)
	playerTimeSeconds: number;            // default 120 (2 min)
	reactionTimeSeconds: number;          // default 60 (1 min)
	scaleFactorPlayerTimeSeconds: number; // default 10
	scaleFactorReactionTimeSeconds: number; // default 10
}

export type TimerConfig = TimerConfigA | TimerConfigB;

/** Game configuration for setup */
export interface GameConfig {
	id: string;
	maxLife: number;       // default 40
	timerConfig: TimerConfig;
	createdAt: number;
}

/** In-game player state */
export interface GamePlayerState {
	playerId: string;
	deckId: string;
	playerName: string;
	commanderName: string;
	commanderImageUrl: string;
	life: number;
	poolTimeRemaining: number;        // in seconds
	playerTimeRemaining: number;      // Variant B only
	reactionTimeRemaining: number;    // Variant B only
	commanderDamageTaken: Record<string, number>; // key = source player id, value = damage
	totalLifeGained: number;
	totalLifeLost: number;
	isDead: boolean;
}

/** Timer state machine states */
export type TimerPhase =
	| 'IDLE'
	| 'SHARED_START'    // Variant A only
	| 'PLAYER_TIME'     // Active player's turn time (Variant B) or pool time (Variant A after shared)
	| 'REACTION_TIME'   // Reactive player's reaction budget (Variant B)
	| 'POOL_TIME';      // Fallback pool time

/** Which timer source is actively counting */
export interface ActiveTimerInfo {
	phase: TimerPhase;
	/** Index of the player whose timer is ticking */
	targetPlayerIndex: number;
}

/** Full game state */
export interface GameState {
	config: GameConfig;
	players: GamePlayerState[];
	activePlayerIndex: number;
	reactivePlayerIndex: number | null;
	currentRound: number;
	turnCount: number;
	isRunning: boolean;
	isFinished: boolean;
	winnerId: string | null;
	timerInfo: ActiveTimerInfo;
	/** Variant A: shared start time remaining */
	sharedStartTimeRemaining: number;
}

/** Log entry for life changes */
export interface LogEntry {
	id: string;
	gameId: string;
	playerId: string;
	playerName: string;
	value: number; // positive = gain, negative = loss
	type: 'life' | 'commander_damage';
	sourcePlayerId?: string; // for commander damage
	timestamp: number;
}

/** Rank entry for dashboard */
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

/** Game record for persistence */
export interface GameRecord {
	id: string;
	playerIds: string[];
	deckIds: string[];
	maxLife: number;
	timerVariant: TimerVariant;
	winnerId: string | null;
	createdAt: number;
	finishedAt: number | null;
}

