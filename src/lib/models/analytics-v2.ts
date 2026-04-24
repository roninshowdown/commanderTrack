import type { GameRecord, LogEntry, AnalyticsEventV2 } from '$lib/models/types';

export interface AnalyticsV2DataBundle {
	gameRecords: GameRecord[];
	logEntries: LogEntry[];
	events: AnalyticsEventV2[];
}

export interface PlayerAnalyticsV2 {
	playerId: string;
	playerName: string;
	gamesPlayed: number;
	wins: number;
	losses: number;
	winRate: number;
	damageDealt: number;
	damageTaken: number;
	healingDone: number;
	commanderDamageDealt: number;
	reactions: number;
	reactionsPerGame: number;
	avgRoundsPerGame: number;
	avgGameMinutes: number;
	damagePerTurn: number;
	healingPerTurn: number;
	commanderDamageSharePct: number;
}

export interface AnalyticsOverviewV2 {
	totalGames: number;
	avgGameMinutes: number;
	avgRoundsPerGame: number;
	avgDamagePerTurn: number;
	avgHealingPerTurn: number;
	commanderDamageSharePct: number;
	reactionsPerRound: number;
	totalDamage: number;
	totalHealing: number;
	totalCommanderDamage: number;
	totalReactions: number;
}

export interface AnalyticsLeaderboardEntryV2 {
	playerId: string;
	playerName: string;
	value: number;
}

export interface AnalyticsGamesByMonthV2 {
	label: string;
	games: number;
}

export interface AnalyticsRecentGameV2 {
	gameId: string;
	createdAt: number;
	durationMinutes: number;
	rounds: number;
	damage: number;
	heal: number;
	commanderDamage: number;
	reactions: number;
	winnerName: string;
}

export interface AnalyticsV2Result {
	overview: AnalyticsOverviewV2;
	players: PlayerAnalyticsV2[];
	playerWinRateBars: { playerId: string; playerName: string; winRate: number; gamesPlayed: number }[];
	winLeaderboard: AnalyticsLeaderboardEntryV2[];
	damageTakenLeaderboard: AnalyticsLeaderboardEntryV2[];
	gamesByDay: AnalyticsGamesByMonthV2[];
	recentGames: AnalyticsRecentGameV2[];
}

