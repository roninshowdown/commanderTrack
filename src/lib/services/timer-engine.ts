/* ============================================
   Timer Engine — Pure logic, no UI deps
   ============================================ */

import type { GameState, TimerConfigA, TimerConfigB, GamePlayerState } from '$lib/models/types';

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
	if (cfg.variant === 'none') return next; // no countdown
	const active = next.players[next.activePlayerIndex];
	const currentReactiveIdx = next.reactivePlayerIndices.length > 0
		? next.reactivePlayerIndices[next.reactivePlayerIndices.length - 1]
		: null;
	const reactive = currentReactiveIdx !== null ? next.players[currentReactiveIdx] : null;

	if (cfg.variant === 'A') tickA(next, cfg as TimerConfigA, active);
	else tickB(next, cfg as TimerConfigB, active, reactive);

	return next;
}

function tickA(s: GameState, cfg: TimerConfigA, active: GamePlayerState): void {
	if (s.timerInfo.phase === 'SHARED_START') {
		if (s.sharedStartTimeRemaining > 0) s.sharedStartTimeRemaining--;
		if (s.sharedStartTimeRemaining <= 0) {
			s.timerInfo = { phase: 'PLAYER_TIME', targetPlayerIndex: s.activePlayerIndex };
		}
	} else if (s.reactivePlayerIndices.length > 0) {
		const currentIdx = s.reactivePlayerIndices[s.reactivePlayerIndices.length - 1];
		const reactive = s.players[currentIdx];
		if (reactive.poolTimeRemaining > 0) reactive.poolTimeRemaining--;
		s.timerInfo = { phase: 'POOL_TIME', targetPlayerIndex: currentIdx };
	} else {
		if (active.poolTimeRemaining > 0) active.poolTimeRemaining--;
		s.timerInfo = { phase: 'PLAYER_TIME', targetPlayerIndex: s.activePlayerIndex };
	}
}

function tickB(s: GameState, cfg: TimerConfigB, active: GamePlayerState, reactive: GamePlayerState | null): void {
	const phase = s.timerInfo.phase;
	const currentReactiveIdx = s.reactivePlayerIndices.length > 0
		? s.reactivePlayerIndices[s.reactivePlayerIndices.length - 1]
		: null;
	if (phase === 'REACTION_TIME' && reactive) {
		if (reactive.reactionTimeRemaining > 0) reactive.reactionTimeRemaining--;
		if (reactive.reactionTimeRemaining <= 0) {
			s.timerInfo = { phase: 'POOL_TIME', targetPlayerIndex: currentReactiveIdx! };
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
	const cfg = next.config.timerConfig;
	if (cfg.variant === 'none') {
		next.timerInfo = { phase: 'PLAYER_TIME', targetPlayerIndex: next.activePlayerIndex };
	} else if (cfg.variant === 'A') {
		next.timerInfo = { phase: 'SHARED_START', targetPlayerIndex: next.activePlayerIndex };
	} else {
		const cfgB = cfg as TimerConfigB;
		next.players[next.activePlayerIndex].playerTimeRemaining = getScaledPlayerTime(cfgB, 1);
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
	const cfg = state.config.timerConfig;
	if (cfg.variant === 'none') return state;
	if (cfg.variant === 'A') {
		const next = structuredClone(state);
		next.reactivePlayerIndices = [...next.reactivePlayerIndices.filter(i => i !== idx), idx];
		next.timerInfo = next.sharedStartTimeRemaining > 0
			? { phase: 'SHARED_START', targetPlayerIndex: next.activePlayerIndex }
			: { phase: 'POOL_TIME', targetPlayerIndex: idx };
		return next;
	}
	// Variant B
	const next = structuredClone(state);
	const cfgB = next.config.timerConfig as TimerConfigB;
	next.reactivePlayerIndices = [...next.reactivePlayerIndices.filter(i => i !== idx), idx];
	next.players[idx].reactionTimeRemaining = getScaledReactionTime(cfgB, next.currentRound);
	next.timerInfo = { phase: 'REACTION_TIME', targetPlayerIndex: idx };
	return next;
}

export function removeReactivePlayer(state: GameState, idx: number): GameState {
	const cfg = state.config.timerConfig;
	if (cfg.variant === 'none') return state;
	const next = structuredClone(state);
	// Clear reaction time for the removed player
	if (cfg.variant === 'B') {
		next.players[idx].reactionTimeRemaining = 0;
	}
	next.reactivePlayerIndices = next.reactivePlayerIndices.filter(i => i !== idx);
	// If there are still reactive players, switch timer to the last one
	if (next.reactivePlayerIndices.length > 0) {
		const newCurrentIdx = next.reactivePlayerIndices[next.reactivePlayerIndices.length - 1];
		if (cfg.variant === 'A') {
			next.timerInfo = next.sharedStartTimeRemaining > 0
				? { phase: 'SHARED_START', targetPlayerIndex: next.activePlayerIndex }
				: { phase: 'POOL_TIME', targetPlayerIndex: newCurrentIdx };
		} else {
			const p = next.players[newCurrentIdx];
			next.timerInfo = p.reactionTimeRemaining > 0
				? { phase: 'REACTION_TIME', targetPlayerIndex: newCurrentIdx }
				: { phase: 'POOL_TIME', targetPlayerIndex: newCurrentIdx };
		}
	} else {
		// No reactive players left — return to active
		const active = next.players[next.activePlayerIndex];
		if (cfg.variant === 'A') {
			next.timerInfo = next.sharedStartTimeRemaining > 0
				? { phase: 'SHARED_START', targetPlayerIndex: next.activePlayerIndex }
				: { phase: 'PLAYER_TIME', targetPlayerIndex: next.activePlayerIndex };
		} else {
			next.timerInfo = active.playerTimeRemaining > 0
				? { phase: 'PLAYER_TIME', targetPlayerIndex: next.activePlayerIndex }
				: { phase: 'POOL_TIME', targetPlayerIndex: next.activePlayerIndex };
		}
	}
	return next;
}

export function returnToActivePlayer(state: GameState): GameState {
	const cfg = state.config.timerConfig;
	if (cfg.variant === 'none') return state;
	if (cfg.variant === 'A') {
		const next = structuredClone(state);
		next.reactivePlayerIndices = [];
		next.timerInfo = next.sharedStartTimeRemaining > 0
			? { phase: 'SHARED_START', targetPlayerIndex: next.activePlayerIndex }
			: { phase: 'PLAYER_TIME', targetPlayerIndex: next.activePlayerIndex };
		return next;
	}
	// Variant B
	const next = structuredClone(state);
	for (const idx of next.reactivePlayerIndices) {
		next.players[idx].reactionTimeRemaining = 0;
	}
	next.reactivePlayerIndices = [];
	const active = next.players[next.activePlayerIndex];
	next.timerInfo = active.playerTimeRemaining > 0
		? { phase: 'PLAYER_TIME', targetPlayerIndex: next.activePlayerIndex }
		: { phase: 'POOL_TIME', targetPlayerIndex: next.activePlayerIndex };
	return next;
}

export function nextTurn(state: GameState): GameState {
	const next = structuredClone(state);
	next.reactivePlayerIndices = [];
	next.turnCount++;

	let idx = (next.activePlayerIndex + 1) % next.players.length;
	while (next.players[idx].isDead && idx !== next.activePlayerIndex) {
		idx = (idx + 1) % next.players.length;
	}
	next.activePlayerIndex = idx;

	const alive = next.players.filter((p) => !p.isDead).length;
	if (alive > 0 && next.turnCount % alive === 0) next.currentRound++;

	const cfg = next.config.timerConfig;
	if (cfg.variant === 'none') {
		next.timerInfo = { phase: 'PLAYER_TIME', targetPlayerIndex: idx };
	} else if (cfg.variant === 'A') {
		next.timerInfo = next.sharedStartTimeRemaining > 0
			? { phase: 'SHARED_START', targetPlayerIndex: idx }
			: { phase: 'PLAYER_TIME', targetPlayerIndex: idx };
	} else {
		const cfgB = next.config.timerConfig as TimerConfigB;
		next.players[idx].playerTimeRemaining = getScaledPlayerTime(cfgB, next.currentRound);
		next.timerInfo = { phase: 'PLAYER_TIME', targetPlayerIndex: idx };
	}
	return next;
}

/* ── Helpers ── */

export function isCritical(seconds: number): boolean {
	return seconds > 0 && seconds <= 10;
}

export function getCurrentTickingTime(state: GameState): number {
	if (state.config.timerConfig.variant === 'none') return 0;
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

