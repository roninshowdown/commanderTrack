<script lang="ts">
	import { onMount } from 'svelte';
	import type { GameRecord, Player, Deck } from '$lib/models/types';
	import { getDataService, isFirebaseConfigured } from '$lib/services/data-service';
	import { authUser } from '$lib/firebase/auth';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface PlayerRank {
		name: string;
		gamesPlayed: number;
		gamesWon: number;
		gamesLost: number;
		winRate: string;
	}

	interface DeckRank {
		commanderName: string;
		playerName: string;
		gamesPlayed: number;
		gamesWon: number;
		gamesLost: number;
		winRate: string;
	}

	let playerRanks = $state<PlayerRank[]>([]);
	let deckRanks = $state<DeckRank[]>([]);
	let loading = $state(true);
	let activeTab = $state<'players' | 'decks'>('players');
	let sortBy = $state<'played' | 'won' | 'lost'>('won');

	const localMode = !isFirebaseConfigured();
	let user = $derived($authUser);
	let hasLoaded = $state(false);

	onMount(() => {
		loadData();
	});

	// Reactively load when user auth state changes (Firebase mode)
	$effect(() => {
		const _user = user;
		if (!localMode && _user && !hasLoaded) {
			loadData();
		}
	});

	async function loadData() {
		if (!localMode && !user) {
			loading = false;
			return;
		}
		loading = true;
		try {
			const ds = await getDataService();
			const [games, allPlayers, allDecks] = await Promise.all([
				ds.getGameRecords(),
				ds.getPlayers(),
				ds.getDecks()
			]);

			playerRanks = computePlayerRanks(games, allPlayers);
			deckRanks = computeDeckRanks(games, allPlayers, allDecks);
			hasLoaded = true;
		} catch (e) {
			console.error('Failed to load ranks', e);
		}
		loading = false;
	}

	function computePlayerRanks(games: GameRecord[], players: Player[]): PlayerRank[] {
		const map = new Map<string, { played: number; won: number; lost: number }>();

		for (const p of players) {
			map.set(p.id, { played: 0, won: 0, lost: 0 });
		}

		for (const game of games) {
			for (const pid of game.playerIds) {
				const stat = map.get(pid);
				if (stat) {
					stat.played++;
					if (game.winnerId === pid) stat.won++;
					else if (game.winnerId) stat.lost++;
				}
			}
		}

		return players
			.map((p) => {
				const stat = map.get(p.id) ?? { played: 0, won: 0, lost: 0 };
				return {
					name: p.name,
					gamesPlayed: stat.played,
					gamesWon: stat.won,
					gamesLost: stat.lost,
					winRate: stat.played > 0 ? ((stat.won / stat.played) * 100).toFixed(1) : '0.0'
				};
			})
			.sort((a, b) => b.gamesWon - a.gamesWon);
	}

	function computeDeckRanks(games: GameRecord[], players: Player[], decks: Deck[]): DeckRank[] {
		const map = new Map<string, { played: number; won: number; lost: number }>();

		for (const d of decks) {
			map.set(d.id, { played: 0, won: 0, lost: 0 });
		}

		for (const game of games) {
			for (let i = 0; i < game.deckIds.length; i++) {
				const did = game.deckIds[i];
				const pid = game.playerIds[i];
				const stat = map.get(did);
				if (stat) {
					stat.played++;
					if (game.winnerId === pid) stat.won++;
					else if (game.winnerId) stat.lost++;
				}
			}
		}

		return decks
			.map((d) => {
				const stat = map.get(d.id) ?? { played: 0, won: 0, lost: 0 };
				const playerName = players.find((p) => p.id === d.playerId)?.name ?? 'Unknown';
				return {
					commanderName: d.commanderName,
					playerName,
					gamesPlayed: stat.played,
					gamesWon: stat.won,
					gamesLost: stat.lost,
					winRate: stat.played > 0 ? ((stat.won / stat.played) * 100).toFixed(1) : '0.0'
				};
			})
			.sort((a, b) => b.gamesWon - a.gamesWon);
	}

	function sortedPlayerRanks(): PlayerRank[] {
		return [...playerRanks].sort((a, b) => {
			if (sortBy === 'played') return b.gamesPlayed - a.gamesPlayed;
			if (sortBy === 'lost') return b.gamesLost - a.gamesLost;
			return b.gamesWon - a.gamesWon;
		});
	}

	function sortedDeckRanks(): DeckRank[] {
		return [...deckRanks].sort((a, b) => {
			if (sortBy === 'played') return b.gamesPlayed - a.gamesPlayed;
			if (sortBy === 'lost') return b.gamesLost - a.gamesLost;
			return b.gamesWon - a.gamesWon;
		});
	}
</script>

<div class="rank-page">
	<h1>Rankings</h1>
	<p class="subtitle">Player & deck statistics</p>

	{#if !localMode && !user}
		<div class="empty">
			<p>Sign in to see ranking data.</p>
		</div>
	{:else if loading}
		<div class="loading">Loading...</div>
	{:else}
		<!-- Tabs -->
		<div class="tabs">
			<button class="tab" class:active={activeTab === 'players'} onclick={() => activeTab = 'players'}>
				Players
			</button>
			<button class="tab" class:active={activeTab === 'decks'} onclick={() => activeTab = 'decks'}>
				Decks
			</button>
		</div>

		<!-- Sort -->
		<div class="sort-bar">
			<span class="sort-label">Sort by:</span>
			<button class="sort-btn" class:active={sortBy === 'won'} onclick={() => sortBy = 'won'}>Won</button>
			<button class="sort-btn" class:active={sortBy === 'played'} onclick={() => sortBy = 'played'}>Played</button>
			<button class="sort-btn" class:active={sortBy === 'lost'} onclick={() => sortBy = 'lost'}>Lost</button>
		</div>

		{#if activeTab === 'players'}
			{#if playerRanks.length === 0}
				<div class="empty"><p>No game data yet. Finish a game first!</p></div>
			{:else}
				<div class="rank-list">
					{#each sortedPlayerRanks() as rank, i}
						<div class="rank-card">
							<div class="rank-position">
								{#if i === 0}
									<Icon name="crown" size={20} color="var(--color-warning)" />
								{:else}
									<span class="rank-num">#{i + 1}</span>
								{/if}
							</div>
							<div class="rank-info">
								<span class="rank-name">{rank.name}</span>
								<div class="rank-stats-row">
									<span class="rank-stat">{rank.gamesPlayed} played</span>
									<span class="rank-stat won">{rank.gamesWon}W</span>
									<span class="rank-stat lost">{rank.gamesLost}L</span>
								</div>
							</div>
							<div class="rank-rate">{rank.winRate}%</div>
						</div>
					{/each}
				</div>
			{/if}
		{:else}
			{#if deckRanks.length === 0}
				<div class="empty"><p>No game data yet. Finish a game first!</p></div>
			{:else}
				<div class="rank-list">
					{#each sortedDeckRanks() as rank, i}
						<div class="rank-card">
							<div class="rank-position">
								{#if i === 0}
									<Icon name="crown" size={20} color="var(--color-warning)" />
								{:else}
									<span class="rank-num">#{i + 1}</span>
								{/if}
							</div>
							<div class="rank-info">
								<span class="rank-name">{rank.commanderName}</span>
								<span class="rank-sub">{rank.playerName}</span>
								<div class="rank-stats-row">
									<span class="rank-stat">{rank.gamesPlayed} played</span>
									<span class="rank-stat won">{rank.gamesWon}W</span>
									<span class="rank-stat lost">{rank.gamesLost}L</span>
								</div>
							</div>
							<div class="rank-rate">{rank.winRate}%</div>
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	{/if}
</div>

<style>
	.rank-page {
		padding-top: var(--space-md);
	}

	h1 {
		font-size: 1.4rem;
		font-weight: 900;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-primary);
	}

	.subtitle {
		color: var(--color-text-muted);
		margin-top: var(--space-xs);
		margin-bottom: var(--space-md);
		font-size: 0.75rem;
		letter-spacing: 0.04em;
	}

	.loading, .empty {
		text-align: center;
		padding: var(--space-2xl);
		color: var(--color-text-muted);
		font-size: 0.85rem;
	}

	.tabs {
		display: flex;
		gap: 2px;
		background: var(--color-surface);
		border: 1px solid var(--color-surface-elevated);
		border-radius: var(--radius-lg);
		padding: 3px;
		margin-bottom: var(--space-md);
	}

	.tab {
		flex: 1;
		padding: var(--space-sm);
		border-radius: var(--radius-md);
		font-weight: 700;
		font-size: 0.75rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		transition: all var(--transition-fast);
		color: var(--color-text-muted);
		min-height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.tab.active {
		background: var(--color-primary);
		color: white;
		box-shadow: var(--glow-primary);
	}

	.sort-bar {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
	}

	.sort-label {
		font-size: 0.65rem;
		color: var(--color-text-muted);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.sort-btn {
		padding: 6px 12px;
		border-radius: var(--radius-sm);
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		background: var(--color-surface);
		color: var(--color-text-muted);
		border: 1px solid var(--color-surface-elevated);
		transition: all var(--transition-fast);
		min-height: 36px;
	}

	.sort-btn.active {
		background: var(--color-surface-elevated);
		color: var(--color-secondary);
		border-color: var(--neon-cyan);
	}

	/* Card-based rank list */
	.rank-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.rank-card {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-elevated);
		border-radius: var(--radius-lg);
		transition: all var(--transition-fast);
	}

	.rank-card:first-child {
		border-color: var(--neon-red);
		box-shadow: var(--glow-primary);
	}

	.rank-position {
		width: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.rank-num {
		font-weight: 800;
		font-size: 0.9rem;
		color: var(--color-text-muted);
		font-variant-numeric: tabular-nums;
	}

	.rank-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.rank-name {
		font-weight: 700;
		font-size: 0.85rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.rank-sub {
		font-size: 0.65rem;
		color: var(--color-text-muted);
	}

	.rank-stats-row {
		display: flex;
		gap: var(--space-sm);
		margin-top: 2px;
	}

	.rank-stat {
		font-size: 0.65rem;
		color: var(--color-text-muted);
		font-variant-numeric: tabular-nums;
	}

	.rank-stat.won {
		color: var(--color-success);
		font-weight: 700;
	}

	.rank-stat.lost {
		color: var(--color-danger);
		font-weight: 700;
	}

	.rank-rate {
		font-size: 1.1rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		color: var(--color-secondary);
		flex-shrink: 0;
	}
</style>

