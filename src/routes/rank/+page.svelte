<script lang="ts">
	import { onMount } from 'svelte';
	import type { GameRecord, Player, Deck } from '$lib/models/types';
	import { getDataService, isFirebaseConfigured } from '$lib/services/data-service';
	import { authUser } from '$lib/firebase/auth';

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

	onMount(async () => {
		if (!localMode && !user) {
			loading = false;
			return;
		}

		try {
			const ds = await getDataService();
			const [games, players, decks] = await Promise.all([
				ds.getGameRecords(),
				ds.getPlayers(),
				ds.getDecks()
			]);

			playerRanks = computePlayerRanks(games, players);
			deckRanks = computeDeckRanks(games, players, decks);
		} catch (e) {
			console.error('Failed to load ranks', e);
		}
		loading = false;
	});

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
				<div class="empty"><p>No game data yet.</p></div>
			{:else}
				<div class="rank-table-wrapper">
					<table class="rank-table">
						<thead>
							<tr>
								<th>#</th>
								<th>Player</th>
								<th>Played</th>
								<th>Won</th>
								<th>Lost</th>
								<th>Win %</th>
							</tr>
						</thead>
						<tbody>
							{#each sortedPlayerRanks() as rank, i}
								<tr>
									<td class="rank-num">{i + 1}</td>
									<td class="rank-name">{rank.name}</td>
									<td>{rank.gamesPlayed}</td>
									<td class="won">{rank.gamesWon}</td>
									<td class="lost">{rank.gamesLost}</td>
									<td class="rate">{rank.winRate}%</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		{:else}
			{#if deckRanks.length === 0}
				<div class="empty"><p>No game data yet.</p></div>
			{:else}
				<div class="rank-table-wrapper">
					<table class="rank-table">
						<thead>
							<tr>
								<th>#</th>
								<th>Commander</th>
								<th>Player</th>
								<th>Played</th>
								<th>Won</th>
								<th>Lost</th>
								<th>Win %</th>
							</tr>
						</thead>
						<tbody>
							{#each sortedDeckRanks() as rank, i}
								<tr>
									<td class="rank-num">{i + 1}</td>
									<td class="rank-name">{rank.commanderName}</td>
									<td class="rank-player">{rank.playerName}</td>
									<td>{rank.gamesPlayed}</td>
									<td class="won">{rank.gamesWon}</td>
									<td class="lost">{rank.gamesLost}</td>
									<td class="rate">{rank.winRate}%</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		{/if}
	{/if}
</div>

<style>
	.rank-page {
		padding-top: var(--space-lg);
	}

	h1 {
		font-size: 1.8rem;
		font-weight: 800;
	}

	.subtitle {
		color: var(--color-text-secondary);
		margin-top: var(--space-xs);
		margin-bottom: var(--space-xl);
		font-size: 0.9rem;
	}

	.loading, .empty {
		text-align: center;
		padding: var(--space-2xl);
		color: var(--color-text-secondary);
	}

	.tabs {
		display: flex;
		gap: 2px;
		background: var(--color-surface);
		border-radius: var(--radius-md);
		padding: 3px;
		margin-bottom: var(--space-md);
	}

	.tab {
		flex: 1;
		padding: var(--space-sm);
		border-radius: var(--radius-sm);
		font-weight: 600;
		font-size: 0.85rem;
		transition: all var(--transition-fast);
		color: var(--color-text-secondary);
	}

	.tab.active {
		background: var(--color-primary);
		color: white;
	}

	.sort-bar {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
	}

	.sort-label {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	.sort-btn {
		padding: 4px 10px;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 600;
		background: var(--color-surface);
		color: var(--color-text-secondary);
		transition: all var(--transition-fast);
	}

	.sort-btn.active {
		background: var(--color-surface-elevated);
		color: var(--color-text);
	}

	.rank-table-wrapper {
		overflow-x: auto;
		border-radius: var(--radius-md);
	}

	.rank-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}

	.rank-table th {
		text-align: left;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-surface);
		color: var(--color-text-secondary);
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.rank-table td {
		padding: var(--space-sm) var(--space-md);
		border-bottom: 1px solid var(--color-surface-elevated);
	}

	.rank-num {
		font-weight: 800;
		color: var(--color-text-muted);
		width: 32px;
	}

	.rank-name {
		font-weight: 600;
	}

	.rank-player {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}

	.won {
		color: var(--color-success);
		font-weight: 600;
	}

	.lost {
		color: var(--color-danger);
		font-weight: 600;
	}

	.rate {
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
</style>

