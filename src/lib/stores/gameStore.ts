/* ============================================
   Game Store — Central state management
   ============================================ */

import { writable, derived, get } from 'svelte/store';
import type { GameState, GameConfig, GamePlayerState, LogEntry, TimerConfigA, TimerConfigB, ActiveGameData } from '$lib/models/types';
import {
	tick, startGame, togglePause, passToReactivePlayer, returnToActivePlayer,
	nextTurn as engineNextTurn, isCritical, getCurrentTickingTime, getScaledPlayerTime, getScaledReactionTime
} from '$lib/services/timer-engine';
import { uid } from '$lib/utils/format';
import { playGainSound, playLossSound, playCriticalSound, playTurnEndSound } from '$lib/utils/sounds';
import { getDataServiceSync } from '$lib/services/data-service';

/* ── Internal stores ── */
const _gameState = writable<GameState | null>(null);
const _logEntries = writable<LogEntry[]>([]);
const _commanderDamageMode = writable(false);
const _commanderDamageSource = writable<number | null>(null);
const _activeZoneId = writable<string | null>(null);
let timerInterval: ReturnType<typeof setInterval> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let _currentUid: string | null = null;

const ACTIVE_GAME_LS_KEY = 'ct_activeGameState';

/* ── Public derived stores ── */
export const gameState = derived(_gameState, ($s) => $s);
export const logEntries = derived(_logEntries, ($l) => $l);
export const commanderDamageMode = derived(_commanderDamageMode, ($v) => $v);
export const commanderDamageSource = derived(_commanderDamageSource, ($v) => $v);
export const isGameActive = derived(_gameState, ($s) => $s !== null && !$s.isFinished);
export const isGameRunning = derived(_gameState, ($s) => $s?.isRunning ?? false);
export const currentTickingTime = derived(_gameState, ($s) => ($s ? getCurrentTickingTime($s) : 0));
export const isTimerCritical = derived(currentTickingTime, ($t) => isCritical($t));
export const activeZoneId = derived(_activeZoneId, ($z) => $z);
export const hasActiveGame = derived(_gameState, ($s) => $s !== null && !$s.isFinished);

/* ── Setup player shape ── */
interface SetupPlayer {
	playerId: string;
	deckId: string;
	playerName: string;
	commanderName: string;
	commanderImageUrl: string;
}

/* ── Actions ── */

export function initGame(setupPlayers: SetupPlayer[], config: GameConfig, zoneId: string, userUid: string): void {
	stopTimer();
	_logEntries.set([]);
	clearCommanderDamageMode();
	_activeZoneId.set(zoneId);
	_currentUid = userUid;
	if (!setupPlayers?.length) return;

	const tc = config.timerConfig;
	const players: GamePlayerState[] = setupPlayers.map((sp) => ({
		playerId: sp.playerId,
		deckId: sp.deckId,
		playerName: sp.playerName,
		commanderName: sp.commanderName,
		commanderImageUrl: sp.commanderImageUrl,
		life: config.maxLife,
		poolTimeRemaining: tc.poolTimeSeconds,
		playerTimeRemaining: tc.variant === 'B' ? (tc as TimerConfigB).playerTimeSeconds : 0,
		reactionTimeRemaining: tc.variant === 'B' ? (tc as TimerConfigB).reactionTimeSeconds : 0,
		commanderDamageTaken: {},
		totalLifeGained: 0,
		totalLifeLost: 0,
		isDead: false
	}));

	_gameState.set({
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
		sharedStartTimeRemaining: tc.variant === 'A' ? (tc as TimerConfigA).sharedStartTimeSeconds : 0
	});
	schedulePersist();
}

export function toggleStartStop(): void {
	const state = get(_gameState);
	if (!state || state.isFinished) return;
	if (state.timerInfo.phase === 'IDLE') {
		_gameState.set(startGame(state));
		startTimer();
	} else if (state.isRunning) {
		_gameState.set(togglePause(state));
		stopTimer();
		persistToLocalStorage();
		syncActiveGameToFirestore();
	} else {
		_gameState.set(togglePause(state));
		startTimer();
	}
}

export function advanceNextTurn(): void {
	const state = get(_gameState);
	if (!state || state.isFinished) return;
	playTurnEndSound();
	_gameState.set(engineNextTurn(state));
}

export function setReactivePlayer(idx: number): void {
	const state = get(_gameState);
	if (!state || state.isFinished || idx === state.activePlayerIndex || state.players[idx].isDead) return;
	_gameState.set(passToReactivePlayer(state, idx));
}

export function returnPriorityToActive(): void {
	const state = get(_gameState);
	if (!state || state.isFinished) return;
	_gameState.set(returnToActivePlayer(state));
}

export function pickRandomOpponent(): void {
	const state = get(_gameState);
	if (!state || state.isFinished) return;
	const cands = state.players
		.map((p, i) => ({ i, dead: p.isDead }))
		.filter((c) => c.i !== state.activePlayerIndex && !c.dead);
	if (!cands.length) return;
	setReactivePlayer(cands[Math.floor(Math.random() * cands.length)].i);
}

/* ── Life ── */

export function changeLife(playerIndex: number, amount: number): void {
	_gameState.update((state) => {
		if (!state || state.isFinished) return state;
		const next = structuredClone(state);
		const p = next.players[playerIndex];
		p.life += amount;
		if (amount > 0) { p.totalLifeGained += amount; playGainSound(); }
		else { p.totalLifeLost += Math.abs(amount); playLossSound(); }
		if (p.life <= 0) { p.isDead = true; p.life = 0; }
		return next;
	});
	const state = get(_gameState);
	if (state) {
		const p = state.players[playerIndex];
		addLog(state.config.id, p.playerId, p.playerName, amount, 'life');
	}
}

export function applyCommanderDamage(srcIdx: number, tgtIdx: number, amount: number): void {
	_gameState.update((state) => {
		if (!state || state.isFinished) return state;
		const next = structuredClone(state);
		const src = next.players[srcIdx];
		const tgt = next.players[tgtIdx];
		if (!tgt.commanderDamageTaken[src.playerId]) tgt.commanderDamageTaken[src.playerId] = 0;
		tgt.commanderDamageTaken[src.playerId] += amount;
		tgt.life -= amount;
		tgt.totalLifeLost += amount;
		if (amount > 0) playLossSound();
		if (tgt.commanderDamageTaken[src.playerId] >= 21) tgt.isDead = true;
		if (tgt.life <= 0) { tgt.isDead = true; tgt.life = 0; }
		return next;
	});
	const state = get(_gameState);
	if (state) {
		const tgt = state.players[tgtIdx];
		const src = state.players[srcIdx];
		addLog(state.config.id, tgt.playerId, tgt.playerName, -amount, 'commander_damage', src.playerId);
	}
}

/* ── Commander damage mode ── */

export function toggleCommanderDamageMode(): void {
	_commanderDamageMode.update((v) => { if (v) _commanderDamageSource.set(null); return !v; });
}
export function setCommanderDamageSourcePlayer(idx: number): void {
	_commanderDamageSource.set(idx);
}
export function clearCommanderDamageMode(): void {
	_commanderDamageMode.set(false);
	_commanderDamageSource.set(null);
}

/* ── Finish / Reset ── */

export function finishGame(winnerId: string): void {
	stopTimer();
	cancelPersist();
	const zoneId = get(_activeZoneId) ?? '';
	_gameState.update((state) => {
		if (!state) return state;
		try {
			getDataServiceSync().saveGameRecord({
				playerIds: state.players.map((p) => p.playerId),
				deckIds: state.players.map((p) => p.deckId),
				maxLife: state.config.maxLife,
				timerVariant: state.config.timerConfig.variant,
				winnerId,
				createdAt: state.config.createdAt,
				finishedAt: Date.now(),
				zoneId
			});
		} catch (e) { console.warn('Failed to persist game record:', e); }
		return { ...state, isFinished: true, isRunning: false, winnerId };
	});
	deletePersistedGame();
}

export function abandonGame(): void {
	stopTimer();
	cancelPersist();
	_gameState.set(null);
	_logEntries.set([]);
	_activeZoneId.set(null);
	clearCommanderDamageMode();
	deletePersistedGame();
}

export function resetGame(): void {
	stopTimer();
	cancelPersist();
	_gameState.set(null);
	_logEntries.set([]);
	_activeZoneId.set(null);
	clearCommanderDamageMode();
	deletePersistedGame();
}

/** Restore active game from localStorage or Firestore. Resumes in PAUSED state. */
export async function restoreActiveGame(userUid: string): Promise<boolean> {
	// Try localStorage first
	try {
		const raw = localStorage.getItem(ACTIVE_GAME_LS_KEY);
		if (raw) {
			const data: ActiveGameData = JSON.parse(raw);
			_gameState.set({ ...data.gameState, isRunning: false });
			_logEntries.set(data.logEntries);
			_activeZoneId.set(data.zoneId);
			_currentUid = userUid;
			return true;
		}
	} catch { /* ignore parse errors */ }
	// Try Firestore
	try {
		const { getDataService } = await import('$lib/services/data-service');
		const ds = await getDataService();
		const data = await ds.getActiveGame(userUid);
		if (data) {
			_gameState.set({ ...data.gameState, isRunning: false });
			_logEntries.set(data.logEntries);
			_activeZoneId.set(data.zoneId);
			_currentUid = userUid;
			persistToLocalStorage(); // cache locally
			return true;
		}
	} catch (e) { console.warn('Failed to restore from Firestore:', e); }
	return false;
}

/* ── Internal helpers ── */

function startTimer(): void {
	if (timerInterval) return;
	timerInterval = setInterval(() => {
		_gameState.update((state) => {
			if (!state || !state.isRunning) return state;
			const next = tick(state);
			const t = getCurrentTickingTime(next);
			if (isCritical(t) && t > 0) playCriticalSound();
			return next;
		});
	}, 1000);
}

function stopTimer(): void {
	if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function addLog(
	gameId: string, playerId: string, playerName: string,
	value: number, type: 'life' | 'commander_damage', sourcePlayerId?: string
): void {
	const zoneId = get(_activeZoneId) ?? undefined;
	const entry: LogEntry = { id: uid(), gameId, playerId, playerName, value, type, sourcePlayerId, timestamp: Date.now(), zoneId };
	_logEntries.update((e) => [entry, ...e]);
	try {
		getDataServiceSync().addLogEntry({
			gameId, playerId, playerName, value, type, sourcePlayerId, timestamp: entry.timestamp, zoneId
		});
	} catch (e) { console.warn('Failed to persist log entry:', e); }
	schedulePersist();
}

/* ── Persistence helpers ── */

function schedulePersist(): void {
	if (persistTimer) return;
	persistTimer = setTimeout(() => {
		persistTimer = null;
		persistToLocalStorage();
	}, 2000);
}

function cancelPersist(): void {
	if (persistTimer) { clearTimeout(persistTimer); persistTimer = null; }
}

function persistToLocalStorage(): void {
	const state = get(_gameState);
	const logs = get(_logEntries);
	const zoneId = get(_activeZoneId) ?? '';
	if (!state || state.isFinished) {
		localStorage.removeItem(ACTIVE_GAME_LS_KEY);
		return;
	}
	const data: ActiveGameData = { gameState: state, logEntries: logs, zoneId, updatedAt: Date.now() };
	try {
		localStorage.setItem(ACTIVE_GAME_LS_KEY, JSON.stringify(data));
	} catch (e) { console.warn('Failed to persist game to localStorage:', e); }
}

function deletePersistedGame(): void {
	localStorage.removeItem(ACTIVE_GAME_LS_KEY);
	if (_currentUid) {
		try {
			getDataServiceSync().deleteActiveGame(_currentUid);
		} catch { /* fire-and-forget */ }
	}
	_currentUid = null;
}

/** Sync to Firestore (called on pause and debounced) */
export function syncActiveGameToFirestore(): void {
	const state = get(_gameState);
	const logs = get(_logEntries);
	const zoneId = get(_activeZoneId) ?? '';
	if (!state || state.isFinished || !_currentUid) return;
	const data: ActiveGameData = { gameState: state, logEntries: logs, zoneId, updatedAt: Date.now() };
	try {
		getDataServiceSync().saveActiveGame(_currentUid, data);
	} catch (e) { console.warn('Failed to sync to Firestore:', e); }
}

