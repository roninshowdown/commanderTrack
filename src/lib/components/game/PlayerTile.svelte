<script lang="ts">
	import type { GamePlayerState } from '$lib/models/types';
	import { formatTime } from '$lib/utils/format';

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

	const colorSymbols: Record<string, string> = {
		white: '⚪',
		blue: '🔵',
		black: '⚫',
		red: '🔴',
		green: '🟢'
	};
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
				<span class="dead-icon">💀</span>
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
		border: 2px solid transparent;
		transition: all var(--transition-normal);
		cursor: pointer;
		min-height: 160px;
		display: flex;
		flex-direction: column;
	}

	.player-tile.active {
		border-color: var(--color-success);
		box-shadow: var(--shadow-glow-success);
	}

	.player-tile.ticking {
		border-color: var(--color-danger);
	}

	.player-tile.pulsing {
		animation: pulse-border 1s infinite;
	}

	.player-tile.dead {
		opacity: 0.5;
		filter: grayscale(0.8);
		pointer-events: none;
	}

	.player-tile.cmd-mode {
		cursor: crosshair;
	}

	.player-tile.cmd-source {
		border-color: var(--color-warning);
		box-shadow: 0 0 16px rgba(255, 165, 2, 0.4);
	}

	.tile-bg {
		position: absolute;
		inset: 0;
		background-size: cover;
		background-position: center top;
		opacity: 0.25;
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
		gap: 2px;
	}

	.player-name {
		font-size: 0.8rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.commander-name {
		font-size: 0.65rem;
		color: var(--color-text-secondary);
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
		width: 44px;
		height: 44px;
		border-radius: var(--radius-full);
		font-size: 1.4rem;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all var(--transition-fast);
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
	}

	.life-btn.decrease {
		background: rgba(255, 71, 87, 0.2);
		color: var(--color-danger);
	}

	.life-btn.decrease:active {
		background: rgba(255, 71, 87, 0.4);
		transform: scale(0.9);
	}

	.life-btn.increase {
		background: rgba(46, 213, 115, 0.2);
		color: var(--color-success);
	}

	.life-btn.increase:active {
		background: rgba(46, 213, 115, 0.4);
		transform: scale(0.9);
	}

	.life-display {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.life-value {
		font-size: 2.2rem;
		font-weight: 800;
		line-height: 1;
		font-variant-numeric: tabular-nums;
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
		font-size: 0.9rem;
		font-weight: 800;
		color: var(--color-danger);
		letter-spacing: 0.1em;
	}

	.tile-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-xs);
	}

	.pool-time {
		font-size: 0.75rem;
		font-family: var(--font-mono);
		color: var(--color-text-secondary);
	}

	.status-badge {
		font-size: 0.6rem;
		font-weight: 700;
		text-transform: uppercase;
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		letter-spacing: 0.05em;
	}

	.active-badge {
		background: rgba(46, 213, 115, 0.2);
		color: var(--color-success);
	}

	.reactive-badge {
		background: rgba(255, 165, 2, 0.2);
		color: var(--color-warning);
	}

	.cmd-damage-bar {
		display: flex;
		gap: 4px;
		margin-top: 4px;
	}

	.cmd-dmg-pip {
		font-size: 0.6rem;
		background: rgba(233, 69, 96, 0.3);
		color: var(--color-primary);
		padding: 1px 5px;
		border-radius: var(--radius-sm);
		font-weight: 700;
	}
</style>

