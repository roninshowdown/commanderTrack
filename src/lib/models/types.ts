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

/** Timer variant identifier */
export type TimerVariant = 'A' | 'B';

/** Variant A timer config */
export interface TimerConfigA {
	variant: 'A';
	poolTimeSeconds: number;
	sharedStartTimeSeconds: number;
}

/** Variant B timer config */
export interface TimerConfigB {
	variant: 'B';
	poolTimeSeconds: number;
	playerTimeSeconds: number;
	reactionTimeSeconds: number;
	scaleFactorPlayerTimeSeconds: number;
	scaleFactorReactionTimeSeconds: number;
}

export type TimerConfig = TimerConfigA | TimerConfigB;

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
	reactivePlayerIndex: number | null;
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
	createdAt: number;
	finishedAt: number | null;
}

