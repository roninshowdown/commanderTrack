<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		gameState, logEntries, commanderDamageMode, commanderDamageSource,
		isGameActive, isGameRunning, currentTickingTime, isTimerCritical,
		toggleStartStop, advanceNextTurn, changeLife, applyCommanderDamage,
		toggleCommanderDamageMode, setCommanderDamageSourcePlayer, clearCommanderDamageMode,
		setReactivePlayer, returnPriorityToActive, pickRandomOpponent,
		finishGame, resetGame, abandonGame, restoreActiveGame
	} from '$lib/stores/gameStore';
	import { authUser } from '$lib/firebase/auth';
	import PlayerTile from '$lib/components/game/PlayerTile.svelte';
	import TimerDisplay from '$lib/components/game/TimerDisplay.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	let user = $derived($authUser);
	let showWinnerModal: boolean = $state(false);
	let restoring: boolean = $state(false);

	onMount(async () => {
		if (!$gameState && user?.uid) {
			restoring = true;
			await restoreActiveGame(user.uid);
			restoring = false;
		}
	});

	function handleTileClick(idx: number) {
		if (!$gameState) return;
		if ($commanderDamageMode) {
			if ($commanderDamageSource === null) { setCommanderDamageSourcePlayer(idx); return; }
			if (idx !== $commanderDamageSource) { applyCommanderDamage($commanderDamageSource, idx, 1); }
			return;
		}
		if ($gameState.config.timerConfig.variant === 'B' && idx !== $gameState.activePlayerIndex && !$gameState.players[idx].isDead) {
			setReactivePlayer(idx);
		}
	}

	function handleLifeChange(idx: number, amount: number) {
		if ($commanderDamageMode && $commanderDamageSource !== null && idx !== $commanderDamageSource && amount < 0) {
			applyCommanderDamage($commanderDamageSource, idx, Math.abs(amount));
		} else {
			changeLife(idx, amount);
		}
	}

	function selectWinner(id: string) { showWinnerModal = false; finishGame(id); }
	function newGame() { resetGame(); goto('/setup'); }
	function handleAbandon() {
		if (!confirm('Abandon this game? It will not be recorded.')) return;
		abandonGame();
		goto('/setup');
	}
</script>

<div class="game-page">
	{#if restoring}
		<div class="no-game"><p>Restoring game…</p></div>
	{:else if !$gameState}
		<div class="no-game"><p>No active game.</p><Button variant="primary" onclick={() => goto('/setup')}>{#snippet children()}<Icon name="play" size={16}/> Setup a Game{/snippet}</Button></div>
	{:else if $gameState.isFinished}
		<div class="finished animate-fade-in">
			<Icon name="trophy" size={48} color="var(--color-warning)" />
			<h1>Game Over</h1>
			{#if $gameState.winnerId}{@const w = $gameState.players.find((p: import('$lib/models/types').GamePlayerState) => p.playerId === $gameState.winnerId)}<p class="winner">{w?.playerName ?? 'Unknown'} wins!</p>{/if}
			<Button variant="primary" size="lg" onclick={newGame}>{#snippet children()}<Icon name="play" size={16}/> New Game{/snippet}</Button>
		</div>
	{:else}
		<TimerDisplay state={$gameState} currentTickingTime={$currentTickingTime} isCritical={$isTimerCritical} />

		<div class="controls">
			<Button variant="ghost" size="sm" onclick={() => goto('/')}>
				{#snippet children()}<Icon name="menu" size={14}/> Menu{/snippet}
			</Button>
			<Button variant={$isGameRunning?'danger':'primary'} size="sm" onclick={toggleStartStop}>
				{#snippet children()}<Icon name={$gameState.timerInfo.phase==='IDLE'?'play':$isGameRunning?'pause':'play'} size={14}/> {$gameState.timerInfo.phase==='IDLE'?'Start':$isGameRunning?'Pause':'Resume'}{/snippet}
			</Button>
			<Button variant="ghost" size="sm" onclick={advanceNextTurn} disabled={$gameState.timerInfo.phase==='IDLE'}>
				{#snippet children()}<Icon name="next" size={14}/> Next Turn{/snippet}
			</Button>
			{#if $gameState.config.timerConfig.variant==='B'}
				{#if $gameState.reactivePlayerIndex!==null}
					<Button variant="secondary" size="sm" onclick={returnPriorityToActive}>{#snippet children()}<Icon name="return" size={14}/> Return{/snippet}</Button>
				{:else}
					<Button variant="ghost" size="sm" onclick={pickRandomOpponent}>{#snippet children()}<Icon name="dice" size={14}/> Random{/snippet}</Button>
				{/if}
			{/if}
			<Button variant={$commanderDamageMode?'danger':'ghost'} size="sm" onclick={toggleCommanderDamageMode}>
				{#snippet children()}<Icon name="crosshair" size={14}/> CMD{/snippet}
			</Button>
			<Button variant="danger" size="sm" onclick={()=>showWinnerModal=true}>
				{#snippet children()}<Icon name="flag" size={14}/> Finish{/snippet}
			</Button>
			<Button variant="ghost" size="sm" onclick={handleAbandon}>
				{#snippet children()}<Icon name="trash" size={14}/> Abandon{/snippet}
			</Button>
		</div>

		<div class="tile-grid">
			{#each $gameState.players as p, i}
				<PlayerTile player={p} playerIndex={i}
					isActive={i===$gameState.activePlayerIndex}
					isReactive={i===$gameState.reactivePlayerIndex}
					isTimerTicking={i===$gameState.timerInfo.targetPlayerIndex && $isGameRunning}
					isPulsing={i===$gameState.timerInfo.targetPlayerIndex && $isTimerCritical}
					isDead={p.isDead}
					commanderDamageMode={$commanderDamageMode}
					commanderDamageSource={$commanderDamageMode && $commanderDamageSource===i}
					onlifechange={(amt: number)=>handleLifeChange(i,amt)}
					onclick={()=>handleTileClick(i)} />
			{/each}
		</div>

		<Modal bind:open={showWinnerModal} title="Select Winner">
			{#snippet children()}
				<div class="winner-list">
					{#each $gameState.players.filter((p: import('$lib/models/types').GamePlayerState) => !p.isDead) as p}
						<button class="winner-opt" onclick={()=>selectWinner(p.playerId)}>
							{#if p.commanderImageUrl}<img src={p.commanderImageUrl} alt="" class="winner-img"/>{/if}
							<div><strong>{p.playerName}</strong><span>{p.commanderName}</span></div>
						</button>
					{/each}
				</div>
			{/snippet}
		</Modal>
	{/if}
</div>

<style>
	.game-page{padding-top:var(--space-sm);display:flex;flex-direction:column;gap:var(--space-md);max-width:100%}
	.no-game,.finished{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--space-lg);padding:var(--space-2xl);text-align:center;min-height:60dvh}
	.finished h1{font-size:1.6rem;font-weight:900;color:var(--color-primary);letter-spacing:.1em;text-transform:uppercase}
	.winner{font-size:1.1rem;font-weight:700;color:var(--color-warning)}
	.controls{display:flex;gap:var(--space-xs);flex-wrap:wrap;justify-content:center}
	.tile-grid{display:flex;gap:var(--space-sm);overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;padding-bottom:var(--space-sm)}
	.tile-grid :global(.tile){flex:0 0 min(200px,45vw);scroll-snap-align:start}
	@media(min-width:768px){.tile-grid{flex-wrap:wrap;overflow-x:visible;scroll-snap-type:none}.tile-grid :global(.tile){flex:0 0 calc(50% - var(--space-sm))}}
	.winner-list{display:flex;flex-direction:column;gap:var(--space-sm)}
	.winner-opt{display:flex;align-items:center;gap:var(--space-md);padding:var(--space-md);border-radius:var(--radius-lg);background:var(--color-surface);border:1px solid var(--color-surface-elevated);transition:all var(--transition-fast);text-align:left;cursor:pointer}
	.winner-opt:hover{border-color:var(--neon-cyan);box-shadow:var(--glow-cyan)}
	.winner-img{width:40px;height:30px;border-radius:var(--radius-sm);object-fit:cover}
	.winner-opt strong{font-size:.85rem;display:block}.winner-opt span{font-size:.7rem;color:var(--color-text-muted)}

	/* ── Landscape compact mode ── */
	@media (orientation: landscape) and (max-height: 500px) {
		.game-page { gap: var(--space-xs); height: 100dvh; overflow: hidden; padding-top: 0; }
		.controls { gap: 2px; flex-wrap: nowrap; }
		.controls :global(button) { min-height: 32px; padding: 4px 8px; font-size: .6rem; }
		.tile-grid { flex: 1; min-height: 0; overflow-x: auto; overflow-y: hidden; gap: var(--space-xs); padding-bottom: 0; align-items: stretch; }
		.tile-grid :global(.tile) { flex: 0 0 min(160px, 30vw); min-height: unset; }
	}
</style>








