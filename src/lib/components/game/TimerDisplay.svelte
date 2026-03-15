<script lang="ts">
	import { formatTime } from '$lib/utils/format';
	import type { GameState } from '$lib/models/types';

	interface Props {
		state: GameState;
		currentTickingTime: number;
		isCritical: boolean;
	}

	let { state, currentTickingTime, isCritical }: Props = $props();

	const phaseLabels: Record<string, string> = {
		IDLE: 'Ready',
		SHARED_START: 'Shared Start',
		PLAYER_TIME: 'Player Time',
		REACTION_TIME: 'Reaction Time',
		POOL_TIME: 'Pool Time'
	};
</script>

<div class="timer-display" class:critical={isCritical}>
	<div class="timer-phase">{phaseLabels[state.timerInfo.phase] ?? state.timerInfo.phase}</div>
	<div class="timer-value" class:pulsing={isCritical}>
		{formatTime(currentTickingTime)}
	</div>
	<div class="timer-meta">
		Round {state.currentRound} · Turn {state.turnCount + 1}
	</div>
</div>

<style>
	.timer-display {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-elevated);
		transition: all var(--transition-normal);
	}

	.timer-display.critical {
		background: rgba(232, 25, 59, 0.1);
		border-color: var(--neon-red);
		box-shadow: var(--glow-primary);
	}

	.timer-phase {
		font-size: 0.6rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-text-muted);
	}

	.timer-value {
		font-size: 1.8rem;
		font-weight: 800;
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}

	.timer-value.pulsing {
		color: var(--color-danger);
		animation: pulse 1s infinite;
	}

	.timer-meta {
		font-size: 0.55rem;
		font-weight: 600;
		color: var(--color-text-muted);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
</style>

