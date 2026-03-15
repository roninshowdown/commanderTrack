/* ============================================
   Game Store — Central state management
   ============================================ */

import { writable, derived, get } from 'svelte/store';
import type {
	GameState,
	GameConfig,
	GamePlayerState,
	LogEntry,
	TimerConfigA,
	TimerConfigB
} from '$lib/models/types';
import {
	tick,
	startGame,
	togglePause,
	passToReactivePlayer,
	returnToActivePlayer,
	nextTurn as engineNextTurn,
	isCritical,
	getCurrentTickingTime,
	getScaledPlayerTime,
	getScaledReactionTime
} from '$lib/services/timer-engine';
import { uid } from '$lib/utils/format';
import { playGainSound, playLossSound, playCriticalSound, playTurnEndSound } from '$lib/utils/sounds';
import { getDataServiceSync } from '$lib/services/data-service';

/** Internal writable store */
const _gameState = writable<GameState | null>(null);

/** Log entries for the current game */
const _logEntries = writable<LogEntry[]>([]);

/** Commander damage mode */
const _commanderDamageMode = writable(false);
const _commanderDamageSource = writable<number | null>(null);

/** Timer interval reference */
let timerInterval: ReturnType<typeof setInterval> | null = null;

/* ─── Public readable stores ─── */

export const gameState = derived(_gameState, ($s) => $s);
export const logEntries = derived(_logEntries, ($l) => $l);
export const commanderDamageMode = derived(_commanderDamageMode, ($v) => $v);
export const commanderDamageSource = derived(_commanderDamageSource, ($v) => $v);

export const isGameActive = derived(_gameState, ($s) => $s !== null && !$s.isFinished);
export const isGameRunning = derived(_gameState, ($s) => $s?.isRunning ?? false);

export const currentTickingTime = derived(_gameState, ($s) => {
	if (!$s) return 0;
	return getCurrentTickingTime($s);
});

export const isTimerCritical = derived(currentTickingTime, ($t) => isCritical($t));

/* ─── Actions ─── */

interface SetupPlayer {
	playerId: string;
	deckId: string;
	playerName: string;
	commanderName: string;
	commanderImageUrl: string;
}

export function initGame(
	setupPlayers: SetupPlayer[],
	config: GameConfig
): void {
	stopTimer();
	_logEntries.set([]);
	clearCommanderDamageMode();

	if (!setupPlayers || setupPlayers.length === 0) {
		console.error('[gameStore] initGame called with no players!');
		return;
	}

	console.log('[gameStore] initGame:', { players: setupPlayers.length, config: config.id });

	const tc = config.timerConfig;
	const poolTime = tc.poolTimeSeconds;

	const players: GamePlayerState[] = setupPlayers.map((sp) => ({
		playerId: sp.playerId,
		deckId: sp.deckId,
		playerName: sp.playerName,
		commanderName: sp.commanderName,
		commanderImageUrl: sp.commanderImageUrl,
		life: config.maxLife,
		poolTimeRemaining: poolTime,
		playerTimeRemaining: tc.variant === 'B' ? (tc as TimerConfigB).playerTimeSeconds : 0,
		reactionTimeRemaining: tc.variant === 'B' ? (tc as TimerConfigB).reactionTimeSeconds : 0,
		commanderDamageTaken: {},
		totalLifeGained: 0,
		totalLifeLost: 0,
		isDead: false
	}));

	const state: GameState = {
		config,
		players,
		activePlayerIndex: 0,
		reactivePlayerIndex: null,
		currentRound: 1,
		turnCount: 0,
		isRunning: false,
		isFinished: false,
		winnerId: null,
		timerInfo: { phase: 'IDLE', targetPlayerIndex: 0 },
		sharedStartTimeRemaining:
			tc.variant === 'A' ? (tc as TimerConfigA).sharedStartTimeSeconds : 0
	};

	_gameState.set(state);
}

export function toggleStartStop(): void {
	const state = get(_gameState);
	if (!state || state.isFinished) return;

	if (state.timerInfo.phase === 'IDLE') {
		// First start
		_gameState.set(startGame(state));
		startTimer();
	} else if (state.isRunning) {
		// Pause
		_gameState.set(togglePause(state));
		stopTimer();
	} else {
		// Resume
		_gameState.set(togglePause(state));
		startTimer();
	}
}

export function advanceNextTurn(): void {
	const state = get(_gameState);
	if (!state || state.isFinished) return;

	playTurnEndSound();
	const newState = engineNextTurn(state);
	_gameState.set(newState);
}

export function setReactivePlayer(playerIndex: number): void {
	const state = get(_gameState);
	if (!state || state.isFinished) return;
	if (playerIndex === state.activePlayerIndex) return;
	if (state.players[playerIndex].isDead) return;

	_gameState.set(passToReactivePlayer(state, playerIndex));
}

export function returnPriorityToActive(): void {
	const state = get(_gameState);
	if (!state || state.isFinished) return;

	_gameState.set(returnToActivePlayer(state));
}

export function pickRandomOpponent(): void {
	const state = get(_gameState);
	if (!state || state.isFinished) return;

	const candidates = state.players
		.map((p, i) => ({ index: i, dead: p.isDead }))
		.filter((p) => p.index !== state.activePlayerIndex && !p.dead);

	if (candidates.length === 0) return;

	const pick = candidates[Math.floor(Math.random() * candidates.length)];
	setReactivePlayer(pick.index);
}

/* ─── Life changes ─── */

export function changeLife(playerIndex: number, amount: number): void {
	_gameState.update((state) => {
		if (!state || state.isFinished) return state;

		const next = structuredClone(state);
		const player = next.players[playerIndex];

		player.life += amount;

		if (amount > 0) {
			player.totalLifeGained += amount;
			playGainSound();
		} else {
			player.totalLifeLost += Math.abs(amount);
			playLossSound();
		}

		// Check death
		if (player.life <= 0) {
			player.isDead = true;
			player.life = 0;
		}

		return next;
	});

	// Log entry AFTER state update to avoid nested store mutations
	const state = get(_gameState);
	if (state) {
		const player = state.players[playerIndex];
		addLogEntryLocal(state.config.id, player.playerId, player.playerName, amount, 'life');
	}
}

export function applyCommanderDamage(
	sourcePlayerIndex: number,
	targetPlayerIndex: number,
	amount: number
): void {
	_gameState.update((state) => {
		if (!state || state.isFinished) return state;

		const next = structuredClone(state);
		const source = next.players[sourcePlayerIndex];
		const target = next.players[targetPlayerIndex];

		const sourceId = source.playerId;

		// Initialize if needed
		if (!target.commanderDamageTaken[sourceId]) {
			target.commanderDamageTaken[sourceId] = 0;
		}

		target.commanderDamageTaken[sourceId] += amount;
		target.life -= amount;
		target.totalLifeLost += amount;

		if (amount > 0) playLossSound();

		// Check commander damage death (21+)
		if (target.commanderDamageTaken[sourceId] >= 21) {
			target.isDead = true;
		}

		if (target.life <= 0) {
			target.isDead = true;
			target.life = 0;
		}

		return next;
	});

	// Log entry AFTER state update to avoid nested store mutations
	const state = get(_gameState);
	if (state) {
		const source = state.players[sourcePlayerIndex];
		const target = state.players[targetPlayerIndex];
		addLogEntryLocal(
			state.config.id,
			target.playerId,
			target.playerName,
			-amount,
			'commander_damage',
			source.playerId
		);
	}
}

/* ─── Commander damage mode ─── */

export function toggleCommanderDamageMode(): void {
	_commanderDamageMode.update((v) => {
		if (v) {
			_commanderDamageSource.set(null);
		}
		return !v;
	});
}

export function setCommanderDamageSourcePlayer(index: number): void {
	_commanderDamageSource.set(index);
}

export function clearCommanderDamageMode(): void {
	_commanderDamageMode.set(false);
	_commanderDamageSource.set(null);
}

/* ─── Finish game ─── */

export function finishGame(winnerId: string): void {
	stopTimer();
	_gameState.update((state) => {
		if (!state) return state;

		// Persist game record to storage — fire-and-forget
		try {
			const ds = getDataServiceSync();
			ds.saveGameRecord({
				playerIds: state.players.map((p) => p.playerId),
				deckIds: state.players.map((p) => p.deckId),
				maxLife: state.config.maxLife,
				timerVariant: state.config.timerConfig.variant,
				winnerId,
				createdAt: state.config.createdAt,
				finishedAt: Date.now()
			});
		} catch (e) {
			console.warn('Failed to persist game record:', e);
		}

		return { ...state, isFinished: true, isRunning: false, winnerId };
	});
}

export function resetGame(): void {
	stopTimer();
	_gameState.set(null);
	_logEntries.set([]);
	clearCommanderDamageMode();
}

/* ─── Internal helpers ─── */

function startTimer(): void {
	if (timerInterval) return;
	timerInterval = setInterval(() => {
		_gameState.update((state) => {
			if (!state || !state.isRunning) return state;

			const newState = tick(state);

			// Check critical time for sound alert
			const tickingTime = getCurrentTickingTime(newState);
			if (isCritical(tickingTime) && tickingTime > 0) {
				playCriticalSound();
			}

			return newState;
		});
	}, 1000);
}

function stopTimer(): void {
	if (timerInterval) {
		clearInterval(timerInterval);
		timerInterval = null;
	}
}

function addLogEntryLocal(
	gameId: string,
	playerId: string,
	playerName: string,
	value: number,
	type: 'life' | 'commander_damage',
	sourcePlayerId?: string
): void {
	const entry: LogEntry = {
		id: uid(),
		gameId,
		playerId,
		playerName,
		value,
		type,
		sourcePlayerId,
		timestamp: Date.now()
	};

	_logEntries.update((entries) => [entry, ...entries]);

	// Fire-and-forget persistence — never let storage errors crash the game
	try {
		const ds = getDataServiceSync();
		ds.addLogEntry({
			gameId: entry.gameId,
			playerId: entry.playerId,
			playerName: entry.playerName,
			value: entry.value,
			type: entry.type,
			sourcePlayerId: entry.sourcePlayerId,
			timestamp: entry.timestamp
		});
	} catch (e) {
		console.warn('Failed to persist log entry:', e);
	}
}


