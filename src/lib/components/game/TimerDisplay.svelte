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
		padding: var(--space-sm);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		transition: all var(--transition-normal);
	}

	.timer-display.critical {
		background: rgba(255, 71, 87, 0.15);
	}

	.timer-phase {
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-text-secondary);
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
		font-size: 0.6rem;
		color: var(--color-text-muted);
	}
</style>

