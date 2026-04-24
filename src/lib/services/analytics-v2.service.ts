import type { Player, GameRecord, LogEntry, AnalyticsEventV2 } from '$lib/models/types';
import type { AnalyticsOverviewV2, AnalyticsV2Result, PlayerAnalyticsV2 } from '$lib/models/analytics-v2';

function round1(n: number): number {
	return Math.round(n * 10) / 10;
}

function buildRoundMap(events: AnalyticsEventV2[]): Record<string, number> {
	const roundsByGame: Record<string, number> = {};
	for (const event of events) {
		if (event.type !== 'round_marker') continue;
		const r = event.round ?? 0;
		if (r > (roundsByGame[event.gameId] ?? 0)) roundsByGame[event.gameId] = r;
	}
	return roundsByGame;
}

export function computeAnalyticsV2(
	players: Player[],
	gameRecords: GameRecord[],
	logEntries: LogEntry[],
	events: AnalyticsEventV2[]
): AnalyticsV2Result {
	const roundsByGame = buildRoundMap(events);
	const playerNameById = Object.fromEntries(players.map((p) => [p.id, p.name]));
	const reactionsByPlayer: Record<string, number> = {};
	const reactionsByGame: Record<string, number> = {};
	for (const event of events) {
		if (event.type !== 'reaction') continue;
		reactionsByGame[event.gameId] = (reactionsByGame[event.gameId] ?? 0) + 1;
		if (event.playerId) reactionsByPlayer[event.playerId] = (reactionsByPlayer[event.playerId] ?? 0) + 1;
	}

	const totalDurationMs = gameRecords.reduce((sum, game) => {
		if (!game.finishedAt) return sum;
		return sum + Math.max(0, game.finishedAt - game.createdAt);
	}, 0);

	const totalRounds = gameRecords.reduce((sum, game) => sum + (roundsByGame[game.id] ?? 0), 0);
	const totalDamage = logEntries.reduce((sum, log) => (log.value < 0 ? sum + Math.abs(log.value) : sum), 0);
	const totalHealing = logEntries.reduce((sum, log) => (log.value > 0 ? sum + log.value : sum), 0);
	const totalCommanderDamage = logEntries.reduce((sum, log) => {
		if (log.type !== 'commander_damage' || log.value >= 0) return sum;
		return sum + Math.abs(log.value);
	}, 0);

	const totalReactions = Object.values(reactionsByPlayer).reduce((a, b) => a + b, 0);
	const totalTurns = gameRecords.reduce((sum, g) => sum + Math.max(1, g.playerIds.length * Math.max(1, roundsByGame[g.id] ?? 1)), 0);

	const overview: AnalyticsOverviewV2 = {
		totalGames: gameRecords.length,
		avgGameMinutes: gameRecords.length ? round1(totalDurationMs / gameRecords.length / 60000) : 0,
		avgRoundsPerGame: gameRecords.length ? round1(totalRounds / gameRecords.length) : 0,
		avgDamagePerTurn: totalTurns > 0 ? round1(totalDamage / totalTurns) : 0,
		avgHealingPerTurn: totalTurns > 0 ? round1(totalHealing / totalTurns) : 0,
		commanderDamageSharePct: totalDamage > 0 ? round1((totalCommanderDamage / totalDamage) * 100) : 0,
		reactionsPerRound: totalRounds > 0 ? round1(totalReactions / totalRounds) : 0,
		totalDamage,
		totalHealing,
		totalCommanderDamage,
		totalReactions
	};

	const playerStats: PlayerAnalyticsV2[] = players.map((player) => {
		const games = gameRecords.filter((game) => game.playerIds.includes(player.id));
		const wins = games.filter((game) => game.winnerId === player.id).length;
		const losses = games.filter((game) => !!game.winnerId && game.winnerId !== player.id).length;
		const playerLogs = logEntries.filter((log) => log.playerId === player.id);
		const dealtLogs = logEntries.filter((log) => log.value < 0 && log.sourcePlayerId === player.id);
		const damageDealt = dealtLogs.reduce((sum, log) => sum + Math.abs(log.value), 0);
		const damageTaken = playerLogs.reduce((sum, log) => (log.value < 0 ? sum + Math.abs(log.value) : sum), 0);
		const healingDone = playerLogs.reduce((sum, log) => (log.value > 0 ? sum + log.value : sum), 0);
		const commanderDamageDealt = dealtLogs.reduce((sum, log) => {
			if (log.type !== 'commander_damage') return sum;
			return sum + Math.abs(log.value);
		}, 0);
		const gameDurationMs = games.reduce((sum, game) => {
			if (!game.finishedAt) return sum;
			return sum + Math.max(0, game.finishedAt - game.createdAt);
		}, 0);
		const rounds = games.reduce((sum, game) => sum + (roundsByGame[game.id] ?? 0), 0);
		const turns = games.reduce((sum, g) => sum + Math.max(1, g.playerIds.length * Math.max(1, roundsByGame[g.id] ?? 1)), 0);

		return {
			playerId: player.id,
			playerName: player.name,
			gamesPlayed: games.length,
			wins,
			losses,
			winRate: games.length ? round1((wins / games.length) * 100) : 0,
			damageDealt,
			damageTaken,
			healingDone,
			commanderDamageDealt,
			reactions: reactionsByPlayer[player.id] ?? 0,
			reactionsPerGame: games.length ? round1((reactionsByPlayer[player.id] ?? 0) / games.length) : 0,
			avgRoundsPerGame: games.length ? round1(rounds / games.length) : 0,
			avgGameMinutes: games.length ? round1(gameDurationMs / games.length / 60000) : 0,
			damagePerTurn: turns > 0 ? round1(damageDealt / turns) : 0,
			healingPerTurn: turns > 0 ? round1(healingDone / turns) : 0,
			commanderDamageSharePct: damageDealt > 0 ? round1((commanderDamageDealt / damageDealt) * 100) : 0
		};
	}).sort((a, b) => b.winRate - a.winRate || b.wins - a.wins);

	const playerWinRateBars = playerStats
		.filter((p) => p.gamesPlayed > 0)
		.map((p) => ({ playerId: p.playerId, playerName: p.playerName, winRate: p.winRate, gamesPlayed: p.gamesPlayed }))
		.sort((a, b) => b.winRate - a.winRate || b.gamesPlayed - a.gamesPlayed);

	const winMap: Record<string, number> = {};
	for (const game of gameRecords) {
		if (!game.winnerId) continue;
		winMap[game.winnerId] = (winMap[game.winnerId] ?? 0) + 1;
	}
	const winLeaderboard = Object.entries(winMap)
		.map(([playerId, value]) => ({ playerId, playerName: playerNameById[playerId] ?? '?', value }))
		.sort((a, b) => b.value - a.value);

	const damageTakenMap: Record<string, number> = {};
	for (const log of logEntries) {
		if (log.value >= 0) continue;
		damageTakenMap[log.playerId] = (damageTakenMap[log.playerId] ?? 0) + Math.abs(log.value);
	}
	const damageTakenLeaderboard = Object.entries(damageTakenMap)
		.map(([playerId, value]) => ({ playerId, playerName: playerNameById[playerId] ?? '?', value }))
		.sort((a, b) => b.value - a.value);

	const gamesByDayMap: Record<string, number> = {};
	for (const game of gameRecords) {
		const d = new Date(game.createdAt);
		const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
		gamesByDayMap[key] = (gamesByDayMap[key] ?? 0) + 1;
	}
	const gamesByDay = Object.entries(gamesByDayMap)
		.map(([label, games]) => ({ label, games }))
		.sort((a, b) => a.label.localeCompare(b.label));

	const logsByGame: Record<string, LogEntry[]> = {};
	for (const log of logEntries) {
		(logsByGame[log.gameId] ??= []).push(log);
	}
	const recentGames = [...gameRecords]
		.sort((a, b) => b.createdAt - a.createdAt)
		.slice(0, 8)
		.map((game) => {
			const gameLogs = logsByGame[game.id] ?? [];
			const damage = gameLogs.reduce((sum, log) => (log.value < 0 ? sum + Math.abs(log.value) : sum), 0);
			const heal = gameLogs.reduce((sum, log) => (log.value > 0 ? sum + log.value : sum), 0);
			const commanderDamage = gameLogs.reduce((sum, log) => {
				if (log.type !== 'commander_damage' || log.value >= 0) return sum;
				return sum + Math.abs(log.value);
			}, 0);
			return {
				gameId: game.id,
				createdAt: game.createdAt,
				durationMinutes: game.finishedAt ? round1(Math.max(0, game.finishedAt - game.createdAt) / 60000) : 0,
				rounds: roundsByGame[game.id] ?? 0,
				damage,
				heal,
				commanderDamage,
				reactions: reactionsByGame[game.id] ?? 0,
				winnerName: game.winnerId ? (playerNameById[game.winnerId] ?? '?') : 'Draw/None'
			};
		});

	return { overview, players: playerStats, playerWinRateBars, winLeaderboard, damageTakenLeaderboard, gamesByDay, recentGames };
}

