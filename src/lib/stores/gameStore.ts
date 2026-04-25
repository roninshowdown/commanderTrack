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
	TimerConfigB,
	ActiveGameData,
	AnalyticsEventTypeV2
} from '$lib/models/types';
import {
	tick, startGame, togglePause, passToReactivePlayer, removeReactivePlayer, returnToActivePlayer,
	nextTurn as engineNextTurn, isCritical, getCurrentTickingTime, getScaledPlayerTime, getScaledReactionTime
} from '$lib/services/timer-engine';
import { uid } from '$lib/utils/format';
import { playGainSound, playLossSound, playCriticalSound, playTurnEndSound } from '$lib/utils/sounds';
import { getDataServiceSync } from '$lib/services/data-service';
import { logger } from '$lib/services/logger';

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
const MAX_UNDO = 20;

/* ── Undo history ── */
interface UndoSnapshot { gameState: GameState; logEntries: LogEntry[]; }
const _undoStack = writable<UndoSnapshot[]>([]);

function pushUndo(): void {
	const gs = get(_gameState);
	const logs = get(_logEntries);
	if (!gs) return;
	_undoStack.update((stack) => {
		const next = [...stack, { gameState: structuredClone(gs), logEntries: structuredClone(logs) }];
		if (next.length > MAX_UNDO) next.shift();
		return next;
	});
}

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
export const canUndo = derived(_undoStack, ($s) => $s.length > 0);

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
	_undoStack.set([]);
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
		poolTimeRemaining: tc.variant !== 'none' ? tc.poolTimeSeconds : 0,
		playerTimeRemaining: tc.variant === 'B' ? (tc as TimerConfigB).playerTimeSeconds : 0,
		reactionTimeRemaining: tc.variant === 'B' ? (tc as TimerConfigB).reactionTimeSeconds : 0,
		commanderDamageTaken: {},
		totalLifeGained: 0,
		totalLifeLost: 0,
		isDead: false
	}));

	const isNoneVariant = tc.variant === 'none';
	_gameState.set({
		config,
		players,
		activePlayerIndex: 0,
		reactivePlayerIndices: [],
		eliminationOrder: [],
		currentRound: 1,
		turnCount: 0,
		isRunning: isNoneVariant, // auto-start: no-timer games skip the IDLE phase
		isFinished: false,
		winnerId: null,
		timerInfo: isNoneVariant
			? { phase: 'PLAYER_TIME', targetPlayerIndex: 0 }
			: { phase: 'IDLE', targetPlayerIndex: 0 },
		sharedStartTimeRemaining: tc.variant === 'A' ? (tc as TimerConfigA).sharedStartTimeSeconds : 0
	});
	const initialState = get(_gameState);
	if (initialState) {
		addAnalyticsEventV2(initialState.config.id, 'round_marker', {
			playerId: initialState.players[initialState.activePlayerIndex]?.playerId,
			round: initialState.currentRound
		});
	}
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

/** Start the game with a specific player going first. */
export function startGameWithPlayer(playerIndex: number): void {
	const state = get(_gameState);
	if (!state || state.isFinished || state.timerInfo.phase !== 'IDLE') return;
	// Set the starting player, then start
	const withPlayer = structuredClone(state);
	withPlayer.activePlayerIndex = playerIndex;
	withPlayer.timerInfo = { ...withPlayer.timerInfo, targetPlayerIndex: playerIndex };
	_gameState.set(withPlayer);
	// Now start the game (reads current state)
	const updated = get(_gameState)!;
	_gameState.set(startGame(updated));
	const started = get(_gameState);
	if (started) {
		addAnalyticsEventV2(started.config.id, 'turn_start', {
			playerId: started.players[started.activePlayerIndex]?.playerId,
			round: started.currentRound
		});
	}
	startTimer();
}

/** Swap two player seats before the game starts (IDLE only). */
export function swapPlayerSeats(indexA: number, indexB: number): void {
	const state = get(_gameState);
	if (!state || state.isFinished || state.timerInfo.phase !== 'IDLE') return;
	if (indexA === indexB) return;
	if (indexA < 0 || indexB < 0 || indexA >= state.players.length || indexB >= state.players.length) return;

	const swapped = structuredClone(state);
	const tmp = swapped.players[indexA];
	swapped.players[indexA] = swapped.players[indexB];
	swapped.players[indexB] = tmp;

	const remapIndex = (idx: number): number => {
		if (idx === indexA) return indexB;
		if (idx === indexB) return indexA;
		return idx;
	};

	swapped.activePlayerIndex = remapIndex(swapped.activePlayerIndex);
	swapped.timerInfo = { ...swapped.timerInfo, targetPlayerIndex: remapIndex(swapped.timerInfo.targetPlayerIndex) };
	swapped.reactivePlayerIndices = (swapped.reactivePlayerIndices ?? []).map(remapIndex);

	_gameState.set(swapped);
	schedulePersist();
}

export function advanceNextTurn(): void {
	const state = get(_gameState);
	if (!state || state.isFinished) return;
	pushUndo();
	playTurnEndSound();
	_gameState.set(engineNextTurn(state));
	const updated = get(_gameState);
	if (updated) {
		addAnalyticsEventV2(updated.config.id, 'turn_start', {
			playerId: updated.players[updated.activePlayerIndex]?.playerId,
			round: updated.currentRound
		});
		addAnalyticsEventV2(updated.config.id, 'round_marker', {
			playerId: updated.players[updated.activePlayerIndex]?.playerId,
			round: updated.currentRound
		});
	}
}

export function setReactivePlayer(idx: number): void {
	const state = get(_gameState);
	if (!state || state.isFinished || idx === state.activePlayerIndex || state.players[idx].isDead) return;
	_gameState.set(passToReactivePlayer(state, idx));
	recordReactionEvent(state, idx);
}

export function toggleReactivePlayer(idx: number): void {
	const state = get(_gameState);
	if (!state || state.isFinished || idx === state.activePlayerIndex || state.players[idx].isDead) return;
	if ((state.reactivePlayerIndices ?? []).includes(idx)) {
		// Deselect — return to active player
		_gameState.set(removeReactivePlayer(state, idx));
		addAnalyticsEventV2(state.config.id, 'reaction_dropped', {
			playerId: state.players[idx]?.playerId,
			round: state.currentRound
		});
	} else {
		// Clear any existing reactive player first, then select the new one
		let s = state;
		for (const existing of [...(s.reactivePlayerIndices ?? [])]) {
			addAnalyticsEventV2(state.config.id, 'reaction_dropped', {
				playerId: s.players[existing]?.playerId,
				round: s.currentRound
			});
			s = removeReactivePlayer(s, existing);
		}
		_gameState.set(passToReactivePlayer(s, idx));
		addAnalyticsEventV2(state.config.id, 'reaction_claimed', {
			playerId: state.players[idx]?.playerId,
			round: state.currentRound
		});
		recordReactionEvent(state, idx);
	}
}

export function returnPriorityToActive(): void {
	const state = get(_gameState);
	if (!state || state.isFinished) return;
	for (const idx of state.reactivePlayerIndices ?? []) {
		addAnalyticsEventV2(state.config.id, 'reaction_dropped', {
			playerId: state.players[idx]?.playerId,
			round: state.currentRound
		});
	}
	_gameState.set(returnToActivePlayer(state));
}

export function pickRandomOpponent(): void {
	const state = get(_gameState);
	if (!state || state.isFinished) return;
	const cands = state.players
		.map((p, i) => ({ i, dead: p.isDead }))
		.filter((c) => c.i !== state.activePlayerIndex && !c.dead);
	if (!cands.length) return;
	const chosenIdx = cands[Math.floor(Math.random() * cands.length)].i;
	// Clear any existing reactive players first (only 1 allowed)
	let s = state;
	for (const existing of [...(s.reactivePlayerIndices ?? [])]) {
		s = removeReactivePlayer(s, existing);
	}
	_gameState.set(passToReactivePlayer(s, chosenIdx));
	recordReactionEvent(state, chosenIdx);
}

/** Returns candidate indices for random opponent selection (non-dead, non-active). */
export function getRandomOpponentCandidates(): number[] {
	const state = get(_gameState);
	if (!state || state.isFinished) return [];
	return state.players
		.map((p, i) => ({ i, dead: p.isDead }))
		.filter((c) => c.i !== state.activePlayerIndex && !c.dead)
		.map((c) => c.i);
}

/** Clear all reactive players, then set one as reactive. */
export function clearAndSetReactivePlayer(idx: number): void {
	const state = get(_gameState);
	if (!state || state.isFinished || idx === state.activePlayerIndex || state.players[idx].isDead) return;
	let s = state;
	for (const existing of [...(s.reactivePlayerIndices ?? [])]) {
		s = removeReactivePlayer(s, existing);
	}
	_gameState.set(passToReactivePlayer(s, idx));
	recordReactionEvent(state, idx);
}

/* ── Life ── */

export function changeLife(playerIndex: number, amount: number): void {
	const currentState = get(_gameState);
	if (!currentState || currentState.isFinished) return;
	// Don't allow negative changes on dead players
	if (currentState.players[playerIndex].isDead && amount < 0) return;
	pushUndo();
	_gameState.update((state) => {
		if (!state || state.isFinished) return state;
		const next = structuredClone(state);
		const p = next.players[playerIndex];
		p.life += amount;
		if (amount > 0) { p.totalLifeGained += amount; playGainSound(); }
		else { p.totalLifeLost += Math.abs(amount); playLossSound(); }
		if (p.life <= 0) {
			p.isDead = true;
			p.life = 0;
			markEliminated(next, p.playerId);
		}
		return next;
	});
	const state = get(_gameState);
	if (state) {
		const p = state.players[playerIndex];
		addLog(state.config.id, p.playerId, p.playerName, amount, 'life');
	}
}

export function applyCommanderDamage(srcIdx: number, tgtIdx: number, amount: number): void {
	const preState = get(_gameState);
	if (!preState || preState.isFinished) return;
	const src = preState.players[srcIdx];
	const tgt = preState.players[tgtIdx];
	// Dead players can only be changed via revive action.
	if (tgt.isDead) return;
	const current = tgt.commanderDamageTaken[src.playerId] ?? 0;
	let applied = amount;
	if (amount > 0) {
		const room = Math.max(0, 21 - current);
		applied = Math.min(amount, room);
		if (applied <= 0) return;
	} else if (amount < 0) {
		const heal = Math.min(Math.abs(amount), current);
		if (heal <= 0) return;
		applied = -heal;
	} else {
		return;
	}
	pushUndo();
	_gameState.update((state) => {
		if (!state || state.isFinished) return state;
		const next = structuredClone(state);
		const src = next.players[srcIdx];
		const tgt = next.players[tgtIdx];
		if (tgt.isDead) return state;
		if (!tgt.commanderDamageTaken[src.playerId]) tgt.commanderDamageTaken[src.playerId] = 0;
		const nextCmd = Math.max(0, Math.min(21, tgt.commanderDamageTaken[src.playerId] + applied));
		const deltaCmd = nextCmd - tgt.commanderDamageTaken[src.playerId];
		tgt.commanderDamageTaken[src.playerId] = nextCmd;
		if (deltaCmd > 0) {
			tgt.life = Math.max(0, tgt.life - deltaCmd);
			tgt.totalLifeLost += deltaCmd;
			playLossSound();
		} else if (deltaCmd < 0) {
			const heal = Math.abs(deltaCmd);
			tgt.life += heal;
			tgt.totalLifeGained += heal;
		}
		if (tgt.commanderDamageTaken[src.playerId] >= 21) tgt.isDead = true;
		if (tgt.life <= 0) { tgt.isDead = true; tgt.life = 0; }
		if (tgt.isDead) markEliminated(next, tgt.playerId);
		return next;
	});
	const state = get(_gameState);
	if (state) {
		const tgt = state.players[tgtIdx];
		const src = state.players[srcIdx];
		const logged = Math.max(-21, Math.min(21, -applied));
		if (logged !== 0) addLog(state.config.id, tgt.playerId, tgt.playerName, logged, 'commander_damage', src.playerId);
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

/* ── Undo ── */

export function undoLastAction(): void {
	_undoStack.update((stack) => {
		if (stack.length === 0) return stack;
		const next = [...stack];
		const snapshot = next.pop()!;
		const current = get(_gameState);
		// Restore game state values but preserve current isRunning (don't disrupt timer)
		const preservedRunning = current?.isRunning ?? false;
		_gameState.set({ ...snapshot.gameState, isRunning: preservedRunning });
		_logEntries.set(snapshot.logEntries);
		schedulePersist();
		return next;
	});
}

/* ── Revive ── */

export function revivePlayer(playerIndex: number): void {
	pushUndo();
	_gameState.update((state) => {
		if (!state || state.isFinished) return state;
		const next = structuredClone(state);
		const p = next.players[playerIndex];
		if (!p.isDead) return state;
		p.isDead = false;
		p.life = 1;
		// Full revive reset for player-specific life/commander impacts.
		p.commanderDamageTaken = {};
		p.totalLifeGained = 0;
		p.totalLifeLost = 0;
		next.eliminationOrder = (next.eliminationOrder ?? []).filter((id) => id !== p.playerId);
		return next;
	});
	schedulePersist();
}

/* ── Finish / Reset ── */

export function finishGame(winnerId: string, placements?: { playerId: string; place: number }[]): void {
	stopTimer();
	cancelPersist();
	flushPendingLog();
	const zoneId = get(_activeZoneId) ?? '';
	_gameState.update((state) => {
		if (!state) return state;
		try {
			const tc = state.config.timerConfig;
			const podium = computePodium(state, winnerId);
			const playerTimeConsumed = tc.variant !== 'none'
				? state.players.map(p => tc.poolTimeSeconds - p.poolTimeRemaining)
				: undefined;
			getDataServiceSync().saveGameRecord({
				playerIds: state.players.map((p) => p.playerId),
				deckIds: state.players.map((p) => p.deckId),
				maxLife: state.config.maxLife,
				timerVariant: state.config.timerConfig.variant,
				winnerId,
				secondPlaceId: podium[1] ?? null,
				thirdPlaceId: podium[2] ?? null,
				eliminationOrder: [...(state.eliminationOrder ?? [])],
				...(placements ? { placements } : {}),
				createdAt: state.config.createdAt,
				finishedAt: Date.now(),
				zoneId,
				...(playerTimeConsumed ? { playerTimeConsumed } : {})
			});
		} catch (e) { logger.warn('gameStore.finishGame', 'Failed to persist game record', e); }
		return { ...state, isFinished: true, isRunning: false, winnerId };
	});
	deletePersistedGame();
}

export function abandonGame(): void {
	stopTimer();
	cancelPersist();
	flushPendingLog();
	_gameState.set(null);
	_logEntries.set([]);
	_undoStack.set([]);
	_activeZoneId.set(null);
	clearCommanderDamageMode();
	deletePersistedGame();
}

export function resetGame(): void {
	stopTimer();
	cancelPersist();
	flushPendingLog();
	_gameState.set(null);
	_logEntries.set([]);
	_undoStack.set([]);
	_activeZoneId.set(null);
	clearCommanderDamageMode();
	deletePersistedGame();
}

/** Ensure a restored GameState has all required fields with safe defaults. */
function sanitizeGameState(gs: GameState): GameState {
	return {
		...gs,
		players: (gs.players ?? []).map((p) => ({
			...p,
			commanderDamageTaken: p.commanderDamageTaken ?? {},
			poolTimeRemaining: p.poolTimeRemaining ?? 0,
			playerTimeRemaining: p.playerTimeRemaining ?? 0,
			reactionTimeRemaining: p.reactionTimeRemaining ?? 0,
			totalLifeGained: p.totalLifeGained ?? 0,
			totalLifeLost: p.totalLifeLost ?? 0,
			isDead: p.isDead ?? false
		})),
		reactivePlayerIndices: gs.reactivePlayerIndices ?? [],
		eliminationOrder: gs.eliminationOrder ?? [],
		currentRound: gs.currentRound ?? 1,
		turnCount: gs.turnCount ?? 0,
		isFinished: gs.isFinished ?? false,
		winnerId: gs.winnerId ?? null,
		timerInfo: gs.timerInfo ?? { phase: 'IDLE', targetPlayerIndex: 0 },
		sharedStartTimeRemaining: gs.sharedStartTimeRemaining ?? 0
	};
}

/** Restore active game from localStorage or Firestore. Resumes in PAUSED state. */
export async function restoreActiveGame(userUid: string): Promise<boolean> {
	// Try localStorage first
	try {
		const raw = localStorage.getItem(ACTIVE_GAME_LS_KEY);
		if (raw) {
			const data: ActiveGameData = JSON.parse(raw);
			_gameState.set(sanitizeGameState({ ...data.gameState, isRunning: false }));
			_logEntries.set(data.logEntries ?? []);
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
			_gameState.set(sanitizeGameState({ ...data.gameState, isRunning: false }));
			_logEntries.set(data.logEntries ?? []);
			_activeZoneId.set(data.zoneId);
			_currentUid = userUid;
			persistToLocalStorage(); // cache locally
			return true;
		}
	} catch (e) { logger.warn('gameStore.restoreActiveGame', 'Failed to restore active game from Firestore', e); }
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
	const now = Date.now();

	// ── Event stacking: merge same-player + same-type + same-source while gaps stay <1s.
	// Sign-agnostic: signed sum of values. If sum reaches 0 the entry is removed entirely.
	const pending = _pendingLog;
	const canMerge =
		pending &&
		pending.entry.gameId === gameId &&
		pending.entry.playerId === playerId &&
		pending.entry.type === type &&
		(pending.entry.sourcePlayerId ?? undefined) === (sourcePlayerId ?? undefined) &&
		now - pending.entry.timestamp < 1000;

	if (canMerge && pending) {
		clearTimeout(pending.timer);
		pending.entry.value += value;
		pending.entry.timestamp = now;
		if (pending.entry.value === 0) {
			// Net zero → remove the entry from the visible log and discard the pending buffer
			const removeId = pending.entry.id;
			_logEntries.update((e) => e.filter((x) => x.id !== removeId));
			_pendingLog = null;
			schedulePersist();
			return;
		}
		// Reflect merged value (in-place mutation; force store update)
		_logEntries.update((e) => [...e]);
		pending.timer = setTimeout(() => flushPendingLog(), 1000);
		schedulePersist();
		return;
	}

	// Different target → flush prior pending immediately
	if (pending) flushPendingLog();

	const entry: LogEntry = { id: uid(), gameId, playerId, playerName, value, type, sourcePlayerId, timestamp: now, zoneId };
	_logEntries.update((e) => [entry, ...e]);
	const timer = setTimeout(() => flushPendingLog(), 1000);
	_pendingLog = { entry, zoneId, timer };
	schedulePersist();
}

/** Mutable merge buffer for log-entry stacking. */
let _pendingLog: { entry: LogEntry; zoneId: string | undefined; timer: ReturnType<typeof setTimeout> } | null = null;

function flushPendingLog(): void {
	const pending = _pendingLog;
	if (!pending) return;
	clearTimeout(pending.timer);
	_pendingLog = null;
	const { entry, zoneId } = pending;
	try {
		getDataServiceSync().addLogEntry({
			gameId: entry.gameId, playerId: entry.playerId, playerName: entry.playerName,
			value: entry.value, type: entry.type, sourcePlayerId: entry.sourcePlayerId,
			timestamp: entry.timestamp, zoneId
		});
	} catch (e) { logger.warn('gameStore.addLog', 'Failed to persist log entry', e); }
}

function addAnalyticsEventV2(
	gameId: string,
	type: AnalyticsEventTypeV2,
	extra?: { playerId?: string; round?: number }
): void {
	const zoneId = get(_activeZoneId);
	if (!zoneId) return;
	try {
		getDataServiceSync().addAnalyticsEventV2({
			gameId,
			zoneId,
			type,
			timestamp: Date.now(),
			...(extra ?? {})
		});
	} catch (e) {
		logger.warn('gameStore.addAnalyticsEventV2', 'Failed to persist analytics v2 event', e);
	}
}

function recordReactionEvent(state: GameState, playerIndex: number): void {
	addAnalyticsEventV2(state.config.id, 'reaction', {
		playerId: state.players[playerIndex]?.playerId,
		round: state.currentRound
	});
}

function markEliminated(state: GameState, playerId: string): void {
	state.eliminationOrder ??= [];
	if (!state.eliminationOrder.includes(playerId)) state.eliminationOrder.push(playerId);
}

function computePodium(state: GameState, winnerId: string): string[] {
	const eliminatedDesc = [...(state.eliminationOrder ?? [])]
		.filter((id) => id !== winnerId)
		.reverse();
	const aliveOthers = state.players
		.filter((p) => p.playerId !== winnerId && !eliminatedDesc.includes(p.playerId))
		.sort((a, b) => b.life - a.life)
		.map((p) => p.playerId);
	return [winnerId, ...eliminatedDesc, ...aliveOthers].slice(0, 3);
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
	} catch (e) { logger.warn('gameStore.persistToLocalStorage', 'Failed to persist game to localStorage', e); }
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
	} catch (e) { logger.warn('gameStore.syncActiveGameToFirestore', 'Failed to sync active game to Firestore', e); }
}

