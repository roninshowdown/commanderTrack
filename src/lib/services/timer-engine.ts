/* ============================================
   Timer Engine — Pure logic, no UI deps
   ============================================ */

import type { GameState, TimerConfigB, GamePlayerState } from '$lib/models/types';

/* ── Scaling helpers ── */

export function getScaledPlayerTime(cfg: TimerConfigB, round: number): number {
	return cfg.playerTimeSeconds + cfg.scaleFactorPlayerTimeSeconds * (round - 1);
}

export function getScaledReactionTime(cfg: TimerConfigB, round: number): number {
	return cfg.reactionTimeSeconds + cfg.scaleFactorReactionTimeSeconds * (round - 1);
}

/* ── Tick (1 s) ── */

export function tick(state: GameState): GameState {
	if (!state.isRunning || state.isFinished) return state;
	const next = structuredClone(state);
	const cfg = next.config.timerConfig;
	const active = next.players[next.activePlayerIndex];
	const reactive = next.reactivePlayerIndex !== null ? next.players[next.reactivePlayerIndex] : null;

	if (cfg.variant === 'A') tickA(next, active);
	else tickB(next, cfg, active, reactive);

	return next;
}

function tickA(s: GameState, active: GamePlayerState): void {
	if (s.timerInfo.phase === 'SHARED_START') {
		if (s.sharedStartTimeRemaining > 0) s.sharedStartTimeRemaining--;
		if (s.sharedStartTimeRemaining <= 0) {
			s.timerInfo = { phase: 'PLAYER_TIME', targetPlayerIndex: s.activePlayerIndex };
		}
	} else {
		if (active.poolTimeRemaining > 0) active.poolTimeRemaining--;
		s.timerInfo = { phase: 'PLAYER_TIME', targetPlayerIndex: s.activePlayerIndex };
	}
}

function tickB(s: GameState, cfg: TimerConfigB, active: GamePlayerState, reactive: GamePlayerState | null): void {
	const phase = s.timerInfo.phase;
	if (phase === 'REACTION_TIME' && reactive) {
		if (reactive.reactionTimeRemaining > 0) reactive.reactionTimeRemaining--;
		if (reactive.reactionTimeRemaining <= 0) {
			s.timerInfo = { phase: 'POOL_TIME', targetPlayerIndex: s.reactivePlayerIndex! };
		}
	} else if (phase === 'POOL_TIME') {
		const t = s.players[s.timerInfo.targetPlayerIndex];
		if (t.poolTimeRemaining > 0) t.poolTimeRemaining--;
	} else {
		// PLAYER_TIME
		if (active.playerTimeRemaining > 0) active.playerTimeRemaining--;
		if (active.playerTimeRemaining <= 0) {
			s.timerInfo = { phase: 'POOL_TIME', targetPlayerIndex: s.activePlayerIndex };
		}
	}
}

/* ── State transitions ── */

export function startGame(state: GameState): GameState {
	const next = structuredClone(state);
	next.isRunning = true;
	if (next.config.timerConfig.variant === 'A') {
		next.timerInfo = { phase: 'SHARED_START', targetPlayerIndex: next.activePlayerIndex };
	} else {
		const cfg = next.config.timerConfig as TimerConfigB;
		next.players[next.activePlayerIndex].playerTimeRemaining = getScaledPlayerTime(cfg, 1);
		next.timerInfo = { phase: 'PLAYER_TIME', targetPlayerIndex: next.activePlayerIndex };
	}
	return next;
}

export function togglePause(state: GameState): GameState {
	const next = structuredClone(state);
	next.isRunning = !next.isRunning;
	return next;
}

export function passToReactivePlayer(state: GameState, idx: number): GameState {
	if (state.config.timerConfig.variant === 'A') return state;
	const next = structuredClone(state);
	const cfg = next.config.timerConfig as TimerConfigB;
	next.reactivePlayerIndex = idx;
	next.players[idx].reactionTimeRemaining = getScaledReactionTime(cfg, next.currentRound);
	next.timerInfo = { phase: 'REACTION_TIME', targetPlayerIndex: idx };
	return next;
}

export function returnToActivePlayer(state: GameState): GameState {
	if (state.config.timerConfig.variant === 'A') return state;
	const next = structuredClone(state);
	if (next.reactivePlayerIndex !== null) next.players[next.reactivePlayerIndex].reactionTimeRemaining = 0;
	next.reactivePlayerIndex = null;
	const active = next.players[next.activePlayerIndex];
	next.timerInfo = active.playerTimeRemaining > 0
		? { phase: 'PLAYER_TIME', targetPlayerIndex: next.activePlayerIndex }
		: { phase: 'POOL_TIME', targetPlayerIndex: next.activePlayerIndex };
	return next;
}

export function nextTurn(state: GameState): GameState {
	const next = structuredClone(state);
	next.reactivePlayerIndex = null;
	next.turnCount++;

	let idx = (next.activePlayerIndex + 1) % next.players.length;
	while (next.players[idx].isDead && idx !== next.activePlayerIndex) {
		idx = (idx + 1) % next.players.length;
	}
	next.activePlayerIndex = idx;

	const alive = next.players.filter((p) => !p.isDead).length;
	if (alive > 0 && next.turnCount % alive === 0) next.currentRound++;

	if (next.config.timerConfig.variant === 'A') {
		next.timerInfo = next.sharedStartTimeRemaining > 0
			? { phase: 'SHARED_START', targetPlayerIndex: idx }
			: { phase: 'PLAYER_TIME', targetPlayerIndex: idx };
	} else {
		const cfg = next.config.timerConfig as TimerConfigB;
		next.players[idx].playerTimeRemaining = getScaledPlayerTime(cfg, next.currentRound);
		next.timerInfo = { phase: 'PLAYER_TIME', targetPlayerIndex: idx };
	}
	return next;
}

/* ── Helpers ── */

export function isCritical(seconds: number): boolean {
	return seconds > 0 && seconds <= 10;
}

export function getCurrentTickingTime(state: GameState): number {
	const { phase, targetPlayerIndex } = state.timerInfo;
	const p = state.players[targetPlayerIndex];
	if (!p) return 0;
	switch (phase) {
		case 'SHARED_START': return state.sharedStartTimeRemaining;
		case 'PLAYER_TIME':
			return state.config.timerConfig.variant === 'A'
				? p.poolTimeRemaining
				: (p.playerTimeRemaining > 0 ? p.playerTimeRemaining : p.poolTimeRemaining);
		case 'REACTION_TIME': return p.reactionTimeRemaining;
		case 'POOL_TIME': return p.poolTimeRemaining;
		default: return 0;
	}
}

