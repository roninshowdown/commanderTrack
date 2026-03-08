<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { Player, Deck, GameConfig, TimerConfig, TimerConfigA, TimerConfigB } from '$lib/models/types';
	import { getDataService } from '$lib/services/data-service';
	import { initGame } from '$lib/stores/gameStore';
	import { uid } from '$lib/utils/format';
	import Button from '$lib/components/ui/Button.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';

	let players = $state<Player[]>([]);
	let loading = $state(true);
	let toast = $state<{ message: string; type: 'success' | 'error' } | null>(null);

	// Setup state
	let playerCount = $state(4);
	let maxLife = $state(40);
	let timerVariant = $state<'A' | 'B'>('B');

	// Variant A
	let poolTimeMinutes = $state(30);
	let sharedStartMinutes = $state(10);

	// Variant B
	let poolTimeMinutesB = $state(30);
	let playerTimeMinutes = $state(2);
	let reactionTimeMinutes = $state(1);
	let scalePlayerSeconds = $state(10);
	let scaleReactionSeconds = $state(10);

	// Selected players & decks
	let selectedPlayers = $state<(string | null)[]>(Array(6).fill(null));
	let selectedDecks = $state<(string | null)[]>(Array(6).fill(null));
	let playerDecksCache = $state<Record<string, Deck[]>>({});

	onMount(async () => {
		try {
			const ds = await getDataService();
			players = await ds.getPlayers();
		} catch (e) {
			toast = { message: 'Failed to load players', type: 'error' };
		}
		loading = false;
	});

	async function onPlayerSelect(index: number, playerId: string) {
		selectedPlayers[index] = playerId;
		selectedDecks[index] = null;

		if (!playerDecksCache[playerId]) {
			try {
				const ds = await getDataService();
				playerDecksCache[playerId] = await ds.getDecksForPlayer(playerId);
			} catch {
				playerDecksCache[playerId] = [];
			}
		}
	}

	function getDecksForSelectedPlayer(index: number): Deck[] {
		const pid = selectedPlayers[index];
		if (!pid) return [];
		return playerDecksCache[pid] ?? [];
	}

	function getPlayerName(pid: string): string {
		return players.find((p) => p.id === pid)?.name ?? '';
	}

	function startGame() {
		const setupPlayers = [];

		for (let i = 0; i < playerCount; i++) {
			const pid = selectedPlayers[i];
			const did = selectedDecks[i];

			if (!pid || !did) {
				toast = { message: `Please select player and deck for slot ${i + 1}`, type: 'error' };
				return;
			}

			const decks = playerDecksCache[pid] ?? [];
			const deck = decks.find((d) => d.id === did);

			if (!deck) {
				toast = { message: `Deck not found for slot ${i + 1}`, type: 'error' };
				return;
			}

			setupPlayers.push({
				playerId: pid,
				deckId: did,
				playerName: getPlayerName(pid),
				commanderName: deck.commanderName,
				commanderImageUrl: deck.commanderImageUrl
			});
		}

		let timerConfig: TimerConfig;

		if (timerVariant === 'A') {
			timerConfig = {
				variant: 'A',
				poolTimeSeconds: poolTimeMinutes * 60,
				sharedStartTimeSeconds: sharedStartMinutes * 60
			} satisfies TimerConfigA;
		} else {
			timerConfig = {
				variant: 'B',
				poolTimeSeconds: poolTimeMinutesB * 60,
				playerTimeSeconds: playerTimeMinutes * 60,
				reactionTimeSeconds: reactionTimeMinutes * 60,
				scaleFactorPlayerTimeSeconds: scalePlayerSeconds,
				scaleFactorReactionTimeSeconds: scaleReactionSeconds
			} satisfies TimerConfigB;
		}

		const config: GameConfig = {
			id: uid(),
			maxLife,
			timerConfig,
			createdAt: Date.now()
		};

		initGame(setupPlayers, config);
		goto('/game');
	}
</script>

<div class="setup-page">
	<h1>Game Setup</h1>

	{#if loading}
		<div class="loading">Loading...</div>
	{:else}
		<!-- Player Count -->
		<section class="section">
			<h2>Players</h2>
			<div class="count-selector">
				{#each [2, 3, 4, 5, 6] as n}
					<button
						class="count-btn"
						class:active={playerCount === n}
						onclick={() => playerCount = n}
					>
						{n}
					</button>
				{/each}
			</div>
		</section>

		<!-- Player & Deck Selection -->
		<section class="section">
			<h2>Select Players & Decks</h2>
			<div class="player-slots">
				{#each Array(playerCount) as _, i}
					<div class="player-slot">
						<span class="slot-label">Slot {i + 1}</span>
						<select
							value={selectedPlayers[i] ?? ''}
							onchange={(e) => onPlayerSelect(i, (e.target as HTMLSelectElement).value)}
						>
							<option value="">Select player...</option>
							{#each players as p}
								<option value={p.id}>{p.name}</option>
							{/each}
						</select>
						<select
							value={selectedDecks[i] ?? ''}
							onchange={(e) => selectedDecks[i] = (e.target as HTMLSelectElement).value}
							disabled={!selectedPlayers[i]}
						>
							<option value="">Select deck...</option>
							{#each getDecksForSelectedPlayer(i) as d}
								<option value={d.id}>{d.commanderName}</option>
							{/each}
						</select>
					</div>
				{/each}
			</div>
		</section>

		<!-- Life Total -->
		<section class="section">
			<h2>Starting Life</h2>
			<div class="life-options">
				{#each [20, 25, 30, 40, 50] as life}
					<button
						class="count-btn"
						class:active={maxLife === life}
						onclick={() => maxLife = life}
					>
						{life}
					</button>
				{/each}
			</div>
		</section>

		<!-- Timer Variant -->
		<section class="section">
			<h2>Timer Variant</h2>
			<div class="variant-tabs">
				<button
					class="variant-tab"
					class:active={timerVariant === 'A'}
					onclick={() => timerVariant = 'A'}
				>
					<strong>Variant A</strong>
					<span>Shared start, no reaction time</span>
				</button>
				<button
					class="variant-tab"
					class:active={timerVariant === 'B'}
					onclick={() => timerVariant = 'B'}
				>
					<strong>Variant B</strong>
					<span>Player + reaction + scaling</span>
				</button>
			</div>

			{#if timerVariant === 'A'}
				<div class="timer-fields">
					<div class="field">
						<label>Pool Time (minutes)</label>
						<input type="number" bind:value={poolTimeMinutes} min="1" max="120" />
					</div>
					<div class="field">
						<label>Shared Start Time (minutes)</label>
						<input type="number" bind:value={sharedStartMinutes} min="1" max="60" />
					</div>
				</div>
			{:else}
				<div class="timer-fields">
					<div class="field">
						<label>Pool Time (minutes)</label>
						<input type="number" bind:value={poolTimeMinutesB} min="1" max="120" />
					</div>
					<div class="field">
						<label>Player Time (minutes)</label>
						<input type="number" bind:value={playerTimeMinutes} min="0.5" max="30" step="0.5" />
					</div>
					<div class="field">
						<label>Reaction Time (minutes)</label>
						<input type="number" bind:value={reactionTimeMinutes} min="0.5" max="30" step="0.5" />
					</div>
					<div class="field">
						<label>Scale Player Time (seconds/round)</label>
						<input type="number" bind:value={scalePlayerSeconds} min="0" max="60" />
					</div>
					<div class="field">
						<label>Scale Reaction Time (seconds/round)</label>
						<input type="number" bind:value={scaleReactionSeconds} min="0" max="60" />
					</div>
				</div>
			{/if}
		</section>

		<!-- Start Game -->
		<section class="section start-section">
			<Button variant="primary" size="lg" fullWidth onclick={startGame}>
				{#snippet children()}🎮 Start Game{/snippet}
			</Button>
		</section>
	{/if}
</div>

{#if toast}
	<Toast message={toast.message} type={toast.type} onclose={() => toast = null} />
{/if}

<style>
	.setup-page {
		padding-top: var(--space-lg);
	}

	h1 {
		font-size: 1.8rem;
		font-weight: 800;
		margin-bottom: var(--space-xl);
	}

	.section {
		margin-bottom: var(--space-xl);
	}

	h2 {
		font-size: 1rem;
		font-weight: 700;
		margin-bottom: var(--space-md);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.count-selector, .life-options {
		display: flex;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.count-btn {
		width: 48px;
		height: 48px;
		border-radius: var(--radius-md);
		background: var(--color-surface);
		font-size: 1.1rem;
		font-weight: 700;
		transition: all var(--transition-fast);
	}

	.count-btn.active {
		background: var(--color-primary);
		color: white;
	}

	.player-slots {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.player-slot {
		display: flex;
		gap: var(--space-sm);
		align-items: center;
		flex-wrap: wrap;
	}

	.slot-label {
		width: 50px;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text-muted);
	}

	.player-slot select {
		flex: 1;
		min-width: 120px;
	}

	.variant-tabs {
		display: flex;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
	}

	.variant-tab {
		flex: 1;
		padding: var(--space-md);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		text-align: left;
		display: flex;
		flex-direction: column;
		gap: 4px;
		transition: all var(--transition-fast);
		border: 2px solid transparent;
	}

	.variant-tab.active {
		border-color: var(--color-primary);
		background: var(--color-surface-elevated);
	}

	.variant-tab strong {
		font-size: 0.9rem;
	}

	.variant-tab span {
		font-size: 0.7rem;
		color: var(--color-text-muted);
	}

	.timer-fields {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: var(--space-md);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.field label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	.start-section {
		margin-top: var(--space-2xl);
	}

	.loading {
		text-align: center;
		padding: var(--space-2xl);
		color: var(--color-text-secondary);
	}
</style>

