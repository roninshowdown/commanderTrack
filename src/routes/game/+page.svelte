<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		gameState,
		logEntries,
		commanderDamageMode,
		commanderDamageSource,
		isGameRunning,
		currentTickingTime,
		isTimerCritical,
		toggleStartStop,
		advanceNextTurn,
		setReactivePlayer,
		returnPriorityToActive,
		pickRandomOpponent,
		changeLife,
		applyCommanderDamage,
		toggleCommanderDamageMode,
		setCommanderDamageSourcePlayer,
		clearCommanderDamageMode,
		finishGame,
		resetGame
	} from '$lib/stores/gameStore';
	import { isCritical } from '$lib/services/timer-engine';
	import PlayerTile from '$lib/components/game/PlayerTile.svelte';
	import TimerDisplay from '$lib/components/game/TimerDisplay.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	let game = $derived($gameState);
	let running = $derived($isGameRunning);
	let tickingTime = $derived($currentTickingTime);
	let timerCritical = $derived($isTimerCritical);
	let cmdMode = $derived($commanderDamageMode);
	let cmdSource = $derived($commanderDamageSource);
	let logs = $derived($logEntries);

	let showSetupModal = $state(false);
	let showWinnerModal = $state(false);

	function handleTileClick(index: number) {
		if (!game || game.isFinished) return;

		if (cmdMode) {
			if (cmdSource === null) {
				// First click: select source
				setCommanderDamageSourcePlayer(index);
			} else if (cmdSource !== index) {
				// Source already selected, this is the target — don't apply damage here
				// Damage is applied via +/- buttons
			}
			return;
		}

		// In Variant B: clicking a non-active player sets them as reactive
		if (game.config.timerConfig.variant === 'B') {
			if (index === game.activePlayerIndex) {
				// Clicking active player returns priority to them
				if (game.reactivePlayerIndex !== null) {
					returnPriorityToActive();
				}
			} else {
				setReactivePlayer(index);
			}
		}
	}

	function handleLifeChange(index: number, amount: number) {
		if (!game || game.isFinished) return;

		if (cmdMode && cmdSource !== null && cmdSource !== index) {
			// Commander damage mode: apply damage from source to target
			applyCommanderDamage(cmdSource, index, Math.abs(amount));
			return;
		}

		changeLife(index, amount);
	}

	function handleFinishGame() {
		showWinnerModal = true;
	}

	function selectWinner(playerId: string) {
		finishGame(playerId);
		showWinnerModal = false;
	}

	function handleNewGame() {
		resetGame();
		goto('/setup');
	}

	function isPlayerTimerTicking(index: number): boolean {
		if (!game || !game.isRunning) return false;
		return game.timerInfo.targetPlayerIndex === index;
	}

	function isPlayerPulsing(index: number): boolean {
		if (!game || !game.isRunning) return false;
		if (game.timerInfo.targetPlayerIndex !== index) return false;
		const phase = game.timerInfo.phase;
		const player = game.players[index];

		if (phase === 'PLAYER_TIME') return isCritical(player.playerTimeRemaining);
		if (phase === 'REACTION_TIME') return isCritical(player.reactionTimeRemaining);
		return false;
	}

	// Grid columns based on player count
	function getGridClass(count: number): string {
		if (count <= 2) return 'grid-2';
		if (count <= 4) return 'grid-4';
		return 'grid-6';
	}
</script>

<div class="game-page">
	{#if !game}
		<div class="no-game">
			<p>No active game. Set up a new game to begin.</p>
			<Button variant="primary" size="lg" onclick={() => goto('/setup')}>
				{#snippet children()}<Icon name="setup" size={16} /> Setup Game{/snippet}
			</Button>
		</div>
	{:else if !game.players || game.players.length === 0}
		<div class="no-game">
			<p>Game state is corrupted. Please start a new game.</p>
			<Button variant="primary" size="lg" onclick={handleNewGame}>
				{#snippet children()}<Icon name="setup" size={16} /> New Game{/snippet}
			</Button>
		</div>
	{:else}
		<!-- Player Tiles Grid -->
		<div class="tiles-grid {getGridClass(game.players.length)}">
			{#each game.players as player, i (player.playerId ?? i)}
				<PlayerTile
					{player}
					playerIndex={i}
					isActive={game.activePlayerIndex === i}
					isReactive={game.reactivePlayerIndex === i}
					isTimerTicking={isPlayerTimerTicking(i)}
					isPulsing={isPlayerPulsing(i)}
					isDead={player.isDead}
					commanderDamageMode={cmdMode}
					commanderDamageSource={cmdMode && cmdSource === i}
					onlifechange={(amount) => handleLifeChange(i, amount)}
					onclick={() => handleTileClick(i)}
				/>
			{/each}
		</div>

		<!-- Center Controls -->
		<div class="center-controls">
			{#if !game.isFinished}
				<!-- Timer Display -->
				<TimerDisplay state={game} currentTickingTime={tickingTime} isCritical={timerCritical} />

				<!-- Main Control Buttons -->
				<div class="control-buttons">
					<!-- Start/Stop -->
					<button
						class="big-btn"
						class:running
						onclick={toggleStartStop}
					>
						{#if game.timerInfo.phase === 'IDLE'}
						<Icon name="play" size={16} /> Start
					{:else if running}
						<Icon name="pause" size={16} /> Pause
					{:else}
						<Icon name="play" size={16} /> Resume
					{/if}
					</button>

					<!-- Next Turn -->
					<Button
						variant="secondary"
						size="md"
						onclick={advanceNextTurn}
						disabled={game.timerInfo.phase === 'IDLE'}
					>
						{#snippet children()}<Icon name="next" size={14} /> Next Turn{/snippet}
					</Button>
				</div>

				<div class="secondary-buttons">
					<!-- Random Opponent -->
					{#if game.config.timerConfig.variant === 'B'}
						<Button variant="ghost" size="sm" onclick={pickRandomOpponent}>
							{#snippet children()}<Icon name="dice" size={14} /> Random{/snippet}
						</Button>

						<!-- Return Priority -->
						{#if game.reactivePlayerIndex !== null}
							<Button variant="ghost" size="sm" onclick={returnPriorityToActive}>
								{#snippet children()}<Icon name="return" size={14} /> Return{/snippet}
							</Button>
						{/if}
					{/if}

					<!-- Commander Damage Toggle -->
					<Button
						variant={cmdMode ? 'danger' : 'ghost'}
						size="sm"
						onclick={toggleCommanderDamageMode}
					>
						{#snippet children()}{cmdMode ? '✕ Exit Cmd' : ''}{#if !cmdMode}<Icon name="crosshair" size={14} /> Cmd Dmg{/if}{/snippet}
					</Button>

					<!-- Setup -->
					<Button variant="ghost" size="sm" onclick={() => goto('/setup')}>
						{#snippet children()}<Icon name="settings" size={14} /> Setup{/snippet}
					</Button>

					<!-- Finish Game -->
					<Button variant="ghost" size="sm" onclick={handleFinishGame}>
						{#snippet children()}<Icon name="flag" size={14} /> Finish{/snippet}
					</Button>
				</div>

				{#if cmdMode}
					<div class="cmd-hint">
						{#if cmdSource === null}
							<p>Select the <strong>source</strong> commander (attacking player)</p>
						{:else}
							<p>Now use − / + on the <strong>target</strong> player to apply commander damage</p>
						{/if}
					</div>
				{/if}
			{:else}
				<!-- Game Finished -->
				<div class="game-finished">
					<h2><Icon name="trophy" size={28} color="var(--color-warning)" /> Game Over</h2>
					{#if game.winnerId}
						{@const winner = game.players.find(p => p.playerId === game.winnerId)}
						{#if winner}
							<p class="winner-name">{winner.playerName} wins!</p>
						{/if}
					{/if}
					<Button variant="primary" size="lg" onclick={handleNewGame}>
						{#snippet children()}New Game{/snippet}
					</Button>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Winner Selection Modal -->
<Modal bind:open={showWinnerModal} title="Select Winner">
	{#snippet children()}
	<div class="winner-list">
		{#if game}
			{#each game.players as player, i}
				{#if !player.isDead}
					<button class="winner-option" onclick={() => selectWinner(player.playerId)}>
						{#if player.commanderImageUrl}
							<img src={player.commanderImageUrl} alt={player.playerName} />
						{/if}
						<div>
							<strong>{player.playerName}</strong>
							<span>{player.commanderName}</span>
						</div>
					</button>
				{/if}
			{/each}
		{/if}
	</div>
	{/snippet}
</Modal>

<style>
	.game-page {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		padding-top: var(--space-sm);
	}

	.no-game {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-lg);
		padding: var(--space-2xl);
		text-align: center;
		min-height: 60vh;
	}

	.no-game p {
		color: var(--color-text-muted);
		font-size: 0.9rem;
	}

	/* Tile grid layouts */
	.tiles-grid {
		display: grid;
		gap: var(--space-sm);
	}

	.grid-2 {
		grid-template-columns: repeat(2, 1fr);
	}

	.grid-4 {
		grid-template-columns: repeat(2, 1fr);
	}

	.grid-6 {
		grid-template-columns: repeat(3, 1fr);
	}

	@media (max-width: 480px) {
		.grid-6 {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	/* Center Controls */
	.center-controls {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md) 0;
	}

	.control-buttons {
		display: flex;
		gap: var(--space-md);
		align-items: center;
	}

	.big-btn {
		padding: var(--space-md) var(--space-xl);
		border-radius: var(--radius-xl);
		font-size: 1rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		background: var(--color-primary);
		color: white;
		border: 1px solid var(--color-primary-light);
		transition: all var(--transition-fast);
		box-shadow: var(--glow-primary);
		min-width: 140px;
	}

	.big-btn:active {
		transform: scale(0.95);
	}

	.big-btn.running {
		background: rgba(255, 171, 0, 0.2);
		color: var(--color-warning);
		border-color: rgba(255, 171, 0, 0.5);
		box-shadow: 0 0 20px rgba(255, 171, 0, 0.25);
	}

	.secondary-buttons {
		display: flex;
		flex-wrap: nowrap;
		gap: var(--space-sm);
		justify-content: center;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		padding: 2px;
		width: 100%;
	}

	.cmd-hint {
		text-align: center;
		padding: var(--space-sm) var(--space-md);
		background: rgba(255, 171, 0, 0.08);
		border: 1px solid rgba(255, 171, 0, 0.2);
		border-radius: var(--radius-lg);
		font-size: 0.75rem;
		color: var(--color-warning);
		letter-spacing: 0.02em;
	}

	/* Game finished */
	.game-finished {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-xl);
	}

	.game-finished h2 {
		font-size: 1.3rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.winner-name {
		font-size: 1.2rem;
		font-weight: 800;
		color: var(--color-success);
		text-shadow: 0 0 16px rgba(0, 230, 118, 0.4);
	}

	/* Winner modal */
	.winner-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.winner-option {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md);
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-surface-hover);
		border-radius: var(--radius-lg);
		transition: all var(--transition-fast);
		text-align: left;
		width: 100%;
	}

	.winner-option:hover {
		border-color: var(--neon-red);
		box-shadow: var(--glow-primary);
	}

	.winner-option img {
		width: 48px;
		height: 36px;
		border-radius: var(--radius-sm);
		object-fit: cover;
	}

	.winner-option div {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.winner-option strong {
		font-size: 0.85rem;
		font-weight: 700;
	}

	.winner-option span {
		font-size: 0.7rem;
		color: var(--color-text-muted);
	}
</style>


