<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { Player, Deck, GameConfig, TimerConfig, TimerConfigA, TimerConfigB } from '$lib/models/types';
	import { getDataService, isFirebaseConfigured } from '$lib/services/data-service';
	import { initGame } from '$lib/stores/gameStore';
	import { uid } from '$lib/utils/format';
	import Button from '$lib/components/ui/Button.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

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

	/** Wrap a promise with a timeout so we never hang */
	function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
		return Promise.race([
			promise,
			new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
		]);
	}

	async function loadPlayers(): Promise<void> {
		try {
			const ds = await getDataService();
			players = await withTimeout(ds.getPlayers(), 8000, []);
			if (players.length === 0 && isFirebaseConfigured()) {
				toast = { message: 'No players found. Please sign in first or add players in Admin.', type: 'error' };
			}
			// Preload ALL decks to avoid async race conditions in the deck dropdown
			if (players.length > 0) {
				const allDecks = await withTimeout(ds.getDecks(), 8000, []);
				const cache: Record<string, Deck[]> = {};
				for (const p of players) {
					cache[p.id] = allDecks.filter((d) => d.playerId === p.id);
				}
				playerDecksCache = cache;
			}
		} catch (e) {
			console.error('Setup: Failed to load players', e);
			toast = { message: 'Failed to load players', type: 'error' };
		}
		loading = false;
	}

	onMount(() => {
		loadPlayers();
	});

	async function onPlayerSelect(index: number, playerId: string) {
		selectedPlayers[index] = playerId;
		selectedDecks[index] = null;

		// Decks are preloaded, but if missing (e.g. new player added during session), fetch them
		if (playerId && !playerDecksCache[playerId]) {
			try {
				const ds = await getDataService();
				const decks = await ds.getDecksForPlayer(playerId);
				playerDecksCache = { ...playerDecksCache, [playerId]: decks };
			} catch {
				playerDecksCache = { ...playerDecksCache, [playerId]: [] };
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

	function getAvailablePlayers(slotIndex: number): Player[] {
		const currentSelection = selectedPlayers[slotIndex];
		return players.filter((p) => {
			if (p.id === currentSelection) return true;
			// Exclude players already selected in other slots
			for (let i = 0; i < playerCount; i++) {
				if (i !== slotIndex && selectedPlayers[i] === p.id) return false;
			}
			return true;
		});
	}

	function startGame() {
		const setupPlayers = [];

		for (let i = 0; i < playerCount; i++) {
			const pid = selectedPlayers[i];
			const did = selectedDecks[i];

			if (!pid || !did) {
				toast = { message: `Please select player and deck for slot ${i + 1}`, type: 'error' };
				console.warn('[setup] Missing player or deck at slot', i + 1, { pid, did });
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
							{#each getAvailablePlayers(i) as p}
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
						<label for="pool-time-a">Pool Time (minutes)</label>
						<input id="pool-time-a" type="number" bind:value={poolTimeMinutes} min="1" max="120" />
					</div>
					<div class="field">
						<label for="shared-start">Shared Start Time (minutes)</label>
						<input id="shared-start" type="number" bind:value={sharedStartMinutes} min="1" max="60" />
					</div>
				</div>
			{:else}
				<div class="timer-fields">
					<div class="field">
						<label for="pool-time-b">Pool Time (minutes)</label>
						<input id="pool-time-b" type="number" bind:value={poolTimeMinutesB} min="1" max="120" />
					</div>
					<div class="field">
						<label for="player-time">Player Time (minutes)</label>
						<input id="player-time" type="number" bind:value={playerTimeMinutes} min="0.5" max="30" step="0.5" />
					</div>
					<div class="field">
						<label for="reaction-time">Reaction Time (minutes)</label>
						<input id="reaction-time" type="number" bind:value={reactionTimeMinutes} min="0.5" max="30" step="0.5" />
					</div>
					<div class="field">
						<label for="scale-player">Scale Player Time (seconds/round)</label>
						<input id="scale-player" type="number" bind:value={scalePlayerSeconds} min="0" max="60" />
					</div>
					<div class="field">
						<label for="scale-reaction">Scale Reaction Time (seconds/round)</label>
						<input id="scale-reaction" type="number" bind:value={scaleReactionSeconds} min="0" max="60" />
					</div>
				</div>
			{/if}
		</section>

		<!-- Start Game -->
		<section class="section start-section">
			<Button variant="primary" size="lg" fullWidth onclick={startGame}>
				{#snippet children()}<Icon name="play" size={16} /> Start Game{/snippet}
			</Button>
		</section>
	{/if}
</div>

{#if toast}
	<Toast message={toast.message} type={toast.type} onclose={() => toast = null} />
{/if}

<style>
	.setup-page {
		padding-top: var(--space-md);
	}

	h1 {
		font-size: 1.4rem;
		font-weight: 900;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-primary);
		margin-bottom: var(--space-xl);
	}

	.section {
		margin-bottom: var(--space-xl);
	}

	h2 {
		font-size: 0.75rem;
		font-weight: 800;
		margin-bottom: var(--space-md);
		color: var(--color-secondary);
		text-transform: uppercase;
		letter-spacing: 0.1em;
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
		border: 1px solid var(--color-surface-elevated);
		font-size: 1.1rem;
		font-weight: 700;
		transition: all var(--transition-fast);
	}

	.count-btn.active {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary-light);
		box-shadow: var(--glow-primary);
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
		width: 100%;
		font-size: 0.7rem;
		font-weight: 700;
		color: var(--color-text-muted);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.player-slot select {
		flex: 1;
		min-width: 0;
		min-height: 44px;
	}

	.variant-tabs {
		display: flex;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
	}

	.variant-tab {
		flex: 1;
		padding: var(--space-md);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-elevated);
		text-align: left;
		display: flex;
		flex-direction: column;
		gap: 4px;
		transition: all var(--transition-fast);
	}

	.variant-tab.active {
		border-color: var(--neon-red);
		background: var(--color-primary-dim);
		box-shadow: var(--glow-primary);
	}

	.variant-tab strong {
		font-size: 0.85rem;
		letter-spacing: 0.04em;
	}

	.variant-tab span {
		font-size: 0.65rem;
		color: var(--color-text-muted);
	}

	.timer-fields {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: var(--space-md);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.field label {
		font-size: 0.7rem;
		font-weight: 700;
		color: var(--color-text-muted);
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.start-section {
		margin-top: var(--space-2xl);
	}

	.loading {
		text-align: center;
		padding: var(--space-2xl);
		color: var(--color-text-muted);
		font-size: 0.85rem;
		letter-spacing: 0.04em;
	}
</style>

