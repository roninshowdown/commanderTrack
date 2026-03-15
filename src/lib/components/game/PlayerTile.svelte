<script lang="ts">
	import type { GamePlayerState } from '$lib/models/types';
	import { formatTime } from '$lib/utils/format';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props {
		player: GamePlayerState;
		playerIndex: number;
		isActive: boolean;
		isReactive: boolean;
		isTimerTicking: boolean;
		isPulsing: boolean;
		isDead: boolean;
		commanderDamageMode: boolean;
		commanderDamageSource: boolean;
		onlifechange: (amount: number) => void;
		onclick: () => void;
	}

	let {
		player,
		playerIndex,
		isActive,
		isReactive,
		isTimerTicking,
		isPulsing,
		isDead,
		commanderDamageMode,
		commanderDamageSource,
		onlifechange,
		onclick
	}: Props = $props();

	let holdTimer: ReturnType<typeof setTimeout> | null = null;
	let holdTriggered = false;

	function handlePointerDown(amount: number) {
		holdTriggered = false;
		holdTimer = setTimeout(() => {
			holdTriggered = true;
			onlifechange(amount * 10);
		}, 500);
	}

	function handlePointerUp(amount: number) {
		if (holdTimer) {
			clearTimeout(holdTimer);
			holdTimer = null;
		}
		if (!holdTriggered) {
			onlifechange(amount);
		}
		holdTriggered = false;
	}

	function handlePointerLeave() {
		if (holdTimer) {
			clearTimeout(holdTimer);
			holdTimer = null;
		}
	}

	// No longer using emoji color symbols - SVG ColorPip is used instead
</script>

<div
	class="player-tile"
	class:active={isActive}
	class:reactive={isReactive}
	class:ticking={isTimerTicking}
	class:pulsing={isPulsing}
	class:dead={isDead}
	class:cmd-mode={commanderDamageMode}
	class:cmd-source={commanderDamageSource}
	role="button"
	tabindex="0"
	onclick={onclick}
	onkeydown={(e) => { if (e.key === 'Enter') onclick(); }}
>
	<!-- Commander image background -->
	{#if player.commanderImageUrl}
		<div class="tile-bg" style="background-image: url({player.commanderImageUrl})"></div>
	{/if}

	<div class="tile-content">
		<!-- Player name -->
		<div class="player-info">
			<span class="player-name">{player.playerName}</span>
			{#if player.commanderName}
				<span class="commander-name">{player.commanderName}</span>
			{/if}
		</div>

		<!-- Life controls -->
		{#if !isDead}
			<div class="life-controls">
				<button
					class="life-btn decrease"
					onpointerdown={() => handlePointerDown(-1)}
					onpointerup={() => handlePointerUp(-1)}
					onpointerleave={handlePointerLeave}
					disabled={isDead}
				>
					−
				</button>

				<div class="life-display">
					<span class="life-value">{player.life}</span>
				</div>

				<button
					class="life-btn increase"
					onpointerdown={() => handlePointerDown(1)}
					onpointerup={() => handlePointerUp(1)}
					onpointerleave={handlePointerLeave}
					disabled={isDead}
				>
					+
				</button>
			</div>
		{:else}
			<div class="dead-overlay">
				<span class="dead-icon"><Icon name="skull" size={36} color="var(--color-danger)" /></span>
				<span class="dead-text">DEAD</span>
			</div>
		{/if}

		<!-- Pool time at bottom -->
		<div class="tile-footer">
			<span class="pool-time">{formatTime(player.poolTimeRemaining)}</span>
			{#if isActive}
				<span class="status-badge active-badge">Active</span>
			{/if}
			{#if isReactive}
				<span class="status-badge reactive-badge">Reacting</span>
			{/if}
		</div>

		<!-- Commander damage summary -->
		{#if Object.keys(player.commanderDamageTaken).length > 0}
			<div class="cmd-damage-bar">
				{#each Object.entries(player.commanderDamageTaken) as [, dmg]}
					<span class="cmd-dmg-pip" title="Commander damage">{dmg}</span>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.player-tile {
		position: relative;
		border-radius: var(--radius-lg);
		overflow: hidden;
		background: var(--color-surface);
		border: 1px solid var(--color-surface-elevated);
		transition: all var(--transition-normal);
		cursor: pointer;
		min-height: 180px;
		display: flex;
		flex-direction: column;
	}

	.player-tile.active {
		border-color: rgba(0, 230, 118, 0.5);
		box-shadow: var(--glow-success);
	}

	.player-tile.ticking {
		border-color: var(--neon-red);
	}

	.player-tile.pulsing {
		animation: pulse-border 1s infinite;
	}

	.player-tile.dead {
		opacity: 0.4;
		filter: grayscale(0.8);
		pointer-events: none;
	}

	.player-tile.cmd-mode {
		cursor: crosshair;
	}

	.player-tile.cmd-source {
		border-color: rgba(255, 171, 0, 0.6);
		box-shadow: 0 0 16px rgba(255, 171, 0, 0.3);
	}

	.tile-bg {
		position: absolute;
		inset: 0;
		background-size: cover;
		background-position: center top;
		opacity: 0.2;
		z-index: 0;
	}

	.tile-content {
		position: relative;
		z-index: 1;
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: var(--space-sm);
	}

	.player-info {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.player-name {
		font-size: 0.75rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.commander-name {
		font-size: 0.6rem;
		color: var(--color-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.life-controls {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		flex: 1;
	}

	.life-btn {
		width: 48px;
		height: 48px;
		border-radius: var(--radius-full);
		font-size: 1.5rem;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all var(--transition-fast);
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
		border: 1px solid transparent;
	}

	.life-btn.decrease {
		background: rgba(255, 23, 68, 0.1);
		color: var(--color-danger);
		border-color: rgba(255, 23, 68, 0.2);
	}

	.life-btn.decrease:active {
		background: rgba(255, 23, 68, 0.3);
		box-shadow: var(--glow-danger);
		transform: scale(0.9);
	}

	.life-btn.increase {
		background: rgba(0, 230, 118, 0.1);
		color: var(--color-success);
		border-color: rgba(0, 230, 118, 0.2);
	}

	.life-btn.increase:active {
		background: rgba(0, 230, 118, 0.3);
		box-shadow: var(--glow-success);
		transform: scale(0.9);
	}

	.life-display {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.life-value {
		font-size: 2.5rem;
		font-weight: 800;
		line-height: 1;
		font-variant-numeric: tabular-nums;
		font-family: var(--font-mono);
	}

	.dead-overlay {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		flex: 1;
		gap: var(--space-xs);
	}

	.dead-icon {
		font-size: 2rem;
	}

	.dead-text {
		font-size: 0.8rem;
		font-weight: 800;
		color: var(--color-danger);
		letter-spacing: 0.15em;
		text-transform: uppercase;
	}

	.tile-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-xs);
	}

	.pool-time {
		font-size: 0.7rem;
		font-family: var(--font-mono);
		color: var(--color-text-muted);
	}

	.status-badge {
		font-size: 0.55rem;
		font-weight: 800;
		text-transform: uppercase;
		padding: 2px 8px;
		border-radius: var(--radius-full);
		letter-spacing: 0.06em;
	}

	.active-badge {
		background: rgba(0, 230, 118, 0.12);
		color: var(--color-success);
		border: 1px solid rgba(0, 230, 118, 0.25);
	}

	.reactive-badge {
		background: rgba(255, 171, 0, 0.12);
		color: var(--color-warning);
		border: 1px solid rgba(255, 171, 0, 0.25);
	}

	.cmd-damage-bar {
		display: flex;
		gap: 4px;
		margin-top: 4px;
	}

	.cmd-dmg-pip {
		font-size: 0.55rem;
		background: var(--color-primary-dim);
		color: var(--color-primary);
		padding: 1px 6px;
		border-radius: var(--radius-full);
		font-weight: 700;
		border: 1px solid var(--neon-red);
	}
</style>

