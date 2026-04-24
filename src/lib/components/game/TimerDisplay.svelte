<script lang="ts">
	import { formatTime } from '$lib/utils/format';
	import type { GameState, TimerConfigA } from '$lib/models/types';

	interface Props { state: GameState; currentTickingTime: number; isCritical: boolean; }
	let { state, currentTickingTime, isCritical }: Props = $props();

	const isVariantA = $derived(state.config.timerConfig.variant === 'A');

	// Rename phase labels: Player Time = "Player Pool Time" (A) or "Player Turn Time" (B)
	const phaseLabel = $derived((): string => {
		const phase = state.timerInfo.phase;
		if (phase === 'PLAYER_TIME') return isVariantA ? 'Player Pool Time' : 'Player Turn Time';
		if (phase === 'POOL_TIME') return 'Player Pool Time';
		if (phase === 'SHARED_START') return 'Shared Start';
		if (phase === 'REACTION_TIME') return 'Reaction Time';
		return 'Ready';
	});
</script>

<div class="timer" class:critical={isCritical}>
	<div class="phase">{phaseLabel()}</div>
	<div class="value" class:pulsing={isCritical}>{formatTime(currentTickingTime)}</div>
	<div class="meta">Round {state.currentRound} · Turn {state.turnCount + 1}</div>
</div>

<style>
	.timer{display:flex;flex-direction:column;align-items:center;gap:2px;padding:var(--space-sm) var(--space-md);border-radius:var(--radius-lg);background:var(--color-surface);border:1px solid var(--color-surface-elevated);transition:all var(--transition-normal)}
	.timer.critical{background:rgba(232,25,59,.1);border-color:var(--neon-red);box-shadow:var(--glow-primary)}
	.phase{font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--color-text-muted)}
	.value{font-size:1.8rem;font-weight:800;font-family:var(--font-mono);font-variant-numeric:tabular-nums;line-height:1}
	.value.pulsing{color:var(--color-danger);animation:pulse 1s infinite}
	.meta{font-size:.55rem;font-weight:600;color:var(--color-text-muted);letter-spacing:.06em;text-transform:uppercase}

	/* ── Mobile compact (rotated landscape) ── */
	@media (max-width: 768px) {
		.timer { flex-direction: row; gap: var(--space-sm); padding: 3px var(--space-sm); align-items: center; }
		.phase { font-size: .48rem; }
		.value { font-size: .9rem; }
		.meta { font-size: .42rem; }
	}
</style>
