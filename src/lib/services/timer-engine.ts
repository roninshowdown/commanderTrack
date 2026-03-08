/* ============================================
   Timer Engine — Pure logic, no UI dependencies
   Handles Variant A and Variant B timer flows
   ============================================ */

import type {
	GameState,
	TimerConfigA,
	TimerConfigB,
	TimerPhase,
	GamePlayerState
} from '$lib/models/types';

/** Determine the scaled player time for a given round (Variant B) */
export function getScaledPlayerTime(config: TimerConfigB, round: number): number {
	return config.playerTimeSeconds + config.scaleFactorPlayerTimeSeconds * (round - 1);
}

/** Determine the scaled reaction time for a given round (Variant B) */
export function getScaledReactionTime(config: TimerConfigB, round: number): number {
	return config.reactionTimeSeconds + config.scaleFactorReactionTimeSeconds * (round - 1);
}

/**
 * Tick the timer by 1 second. Returns updated game state.
 * This is the core tick function called every second while the game is running.
 */
export function tick(state: GameState): GameState {
	if (!state.isRunning || state.isFinished) return state;

	const next = structuredClone(state);
	const config = next.config.timerConfig;
	const activePlayer = next.players[next.activePlayerIndex];
	const reactivePlayer =
		next.reactivePlayerIndex !== null ? next.players[next.reactivePlayerIndex] : null;

	if (config.variant === 'A') {
		tickVariantA(next, activePlayer);
	} else {
		tickVariantB(next, config, activePlayer, reactivePlayer);
	}

	return next;
}

function tickVariantA(state: GameState, activePlayer: GamePlayerState): void {
	if (state.timerInfo.phase === 'SHARED_START') {
		// Shared start time phase
		if (state.sharedStartTimeRemaining > 0) {
			state.sharedStartTimeRemaining--;
		}
		if (state.sharedStartTimeRemaining <= 0) {
			// Transition to pool time (player time = pool time in Variant A)
			state.timerInfo = {
				phase: 'PLAYER_TIME',
				targetPlayerIndex: state.activePlayerIndex
			};
		}
	} else {
		// Pool time phase (active player's pool time)
		if (activePlayer.poolTimeRemaining > 0) {
			activePlayer.poolTimeRemaining--;
		}
		state.timerInfo = {
			phase: 'PLAYER_TIME',
			targetPlayerIndex: state.activePlayerIndex
		};
	}
}

function tickVariantB(
	state: GameState,
	config: TimerConfigB,
	activePlayer: GamePlayerState,
	reactivePlayer: GamePlayerState | null
): void {
	const phase = state.timerInfo.phase;

	if (phase === 'REACTION_TIME' && reactivePlayer) {
		// Reactive player's reaction time is ticking
		if (reactivePlayer.reactionTimeRemaining > 0) {
			reactivePlayer.reactionTimeRemaining--;
		}
		if (reactivePlayer.reactionTimeRemaining <= 0) {
			// Reaction time exhausted → fall through to reactive player's pool time
			state.timerInfo = {
				phase: 'POOL_TIME',
				targetPlayerIndex: state.reactivePlayerIndex!
			};
		}
	} else if (phase === 'POOL_TIME') {
		// Someone's pool time is ticking
		const targetPlayer = state.players[state.timerInfo.targetPlayerIndex];
		if (targetPlayer.poolTimeRemaining > 0) {
			targetPlayer.poolTimeRemaining--;
		}
	} else {
		// PLAYER_TIME: active player's turn time
		if (activePlayer.playerTimeRemaining > 0) {
			activePlayer.playerTimeRemaining--;
		}
		if (activePlayer.playerTimeRemaining <= 0) {
			// Player time exhausted → fall through to active player's pool time
			state.timerInfo = {
				phase: 'POOL_TIME',
				targetPlayerIndex: state.activePlayerIndex
			};
		}
	}
}

/** Start the game — initializes timer phase */
export function startGame(state: GameState): GameState {
	const next = structuredClone(state);
	next.isRunning = true;

	if (next.config.timerConfig.variant === 'A') {
		next.timerInfo = { phase: 'SHARED_START', targetPlayerIndex: next.activePlayerIndex };
	} else {
		next.timerInfo = { phase: 'PLAYER_TIME', targetPlayerIndex: next.activePlayerIndex };
		// Initialize player time for the first turn
		const config = next.config.timerConfig as TimerConfigB;
		next.players[next.activePlayerIndex].playerTimeRemaining = getScaledPlayerTime(config, 1);
	}

	return next;
}

/** Pause/unpause the game */
export function togglePause(state: GameState): GameState {
	const next = structuredClone(state);
	next.isRunning = !next.isRunning;
	return next;
}

/**
 * Pass priority to a reactive player (non-active).
 * Resets the reactive player's reaction time to the current scaled value.
 */
export function passToReactivePlayer(state: GameState, reactivePlayerIndex: number): GameState {
	if (state.config.timerConfig.variant === 'A') return state; // No reaction time in Variant A

	const next = structuredClone(state);
	const config = next.config.timerConfig as TimerConfigB;

	next.reactivePlayerIndex = reactivePlayerIndex;

	// Reset reaction time to scaled value for this round
	next.players[reactivePlayerIndex].reactionTimeRemaining = getScaledReactionTime(
		config,
		next.currentRound
	);

	next.timerInfo = {
		phase: 'REACTION_TIME',
		targetPlayerIndex: reactivePlayerIndex
	};

	return next;
}

/**
 * Return priority from reactive player back to active player.
 * Resets reaction time but continues player time without resetting.
 */
export function returnToActivePlayer(state: GameState): GameState {
	if (state.config.timerConfig.variant === 'A') return state;

	const next = structuredClone(state);

	// Reset the reactive player's reaction time
	if (next.reactivePlayerIndex !== null) {
		next.players[next.reactivePlayerIndex].reactionTimeRemaining = 0;
	}

	next.reactivePlayerIndex = null;

	// If active player still has player time, resume it; otherwise pool time
	const activePlayer = next.players[next.activePlayerIndex];
	if (activePlayer.playerTimeRemaining > 0) {
		next.timerInfo = { phase: 'PLAYER_TIME', targetPlayerIndex: next.activePlayerIndex };
	} else {
		next.timerInfo = { phase: 'POOL_TIME', targetPlayerIndex: next.activePlayerIndex };
	}

	return next;
}

/**
 * Advance to the next player's turn.
 * Increments round counter when all players have had a turn.
 */
export function nextTurn(state: GameState): GameState {
	const next = structuredClone(state);

	// Clear reactive player
	next.reactivePlayerIndex = null;
	next.turnCount++;

	// Find next alive player
	let nextIndex = (next.activePlayerIndex + 1) % next.players.length;
	while (next.players[nextIndex].isDead && nextIndex !== next.activePlayerIndex) {
		nextIndex = (nextIndex + 1) % next.players.length;
	}

	next.activePlayerIndex = nextIndex;

	// Check if a full round has been completed
	const alivePlayers = next.players.filter((p) => !p.isDead).length;
	if (alivePlayers > 0 && next.turnCount % alivePlayers === 0) {
		next.currentRound++;
	}

	// Set up timer for the new active player
	if (next.config.timerConfig.variant === 'A') {
		if (next.sharedStartTimeRemaining > 0) {
			next.timerInfo = { phase: 'SHARED_START', targetPlayerIndex: nextIndex };
		} else {
			next.timerInfo = { phase: 'PLAYER_TIME', targetPlayerIndex: nextIndex };
		}
	} else {
		const config = next.config.timerConfig as TimerConfigB;
		// Reset player time for the new active player based on current round scaling
		next.players[nextIndex].playerTimeRemaining = getScaledPlayerTime(config, next.currentRound);
		next.timerInfo = { phase: 'PLAYER_TIME', targetPlayerIndex: nextIndex };
	}

	return next;
}

/** Check if a timer value is in the critical warning zone (≤10s) */
export function isCritical(seconds: number): boolean {
	return seconds > 0 && seconds <= 10;
}

/** Get the currently ticking time value from the game state */
export function getCurrentTickingTime(state: GameState): number {
	const phase = state.timerInfo.phase;
	const targetPlayer = state.players[state.timerInfo.targetPlayerIndex];

	switch (phase) {
		case 'SHARED_START':
			return state.sharedStartTimeRemaining;
		case 'PLAYER_TIME':
			return targetPlayer?.playerTimeRemaining ?? targetPlayer?.poolTimeRemaining ?? 0;
		case 'REACTION_TIME':
			return targetPlayer?.reactionTimeRemaining ?? 0;
		case 'POOL_TIME':
			return targetPlayer?.poolTimeRemaining ?? 0;
		default:
			return 0;
	}
}

