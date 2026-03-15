<script lang="ts">
	import { onMount } from 'svelte';
	import { logEntries, gameState } from '$lib/stores/gameStore';
	import { formatTimestamp } from '$lib/utils/format';
	import { getDataService } from '$lib/services/data-service';
	import type { GameRecord, LogEntry, Player, Deck } from '$lib/models/types';
	import ChartWrapper from '$lib/components/ui/ChartWrapper.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	let logs = $derived($logEntries);
	let currentGameState = $derived($gameState);

	let activeTab: 'match' | 'player' | 'global' = $state('match');
	let matchChartType: 'line' | 'bar' = $state('line');
	let matchDataType: 'life' | 'damage_dealt' | 'damage_taken' = $state('life');

	// Persisted data
	let allRecords: GameRecord[] = $state([]);
	let allLogs: LogEntry[] = $state([]);
	let players: Player[] = $state([]);
	let decks: Deck[] = $state([]);
	let loading = $state(true);

	// Player dashboard
	let selectedPlayerId: string = $state('');

	// Historical match picker
	let selectedGameId: string = $state('');

	onMount(async () => {
		try {
			const ds = await getDataService();
			[allRecords, allLogs, players, decks] = await Promise.all([
				ds.getGameRecords(),
				ds.getAllLogEntries(),
				ds.getPlayers(),
				ds.getDecks()
			]);
		} catch (e) {
			console.error('Failed to load data', e);
		}
		loading = false;
	});

	function getSourceName(sourceId: string | undefined): string {
		if (!sourceId || !currentGameState) return '';
		const player = currentGameState.players.find((p) => p.playerId === sourceId);
		return player?.playerName ?? '';
	}

	function getPlayerName(pid: string): string {
		return players.find((p: Player) => p.id === pid)?.name ?? pid.slice(0, 6);
	}

	function getDeckName(did: string): string {
		return decks.find((d: Deck) => d.id === did)?.commanderName ?? did.slice(0, 6);
	}

	// ─── Match Charts ───

	function getMatchLogs(): LogEntry[] {
		if (selectedGameId) {
			return allLogs.filter((l: LogEntry) => l.gameId === selectedGameId).sort((a: LogEntry, b: LogEntry) => a.timestamp - b.timestamp);
		}
		return [...logs].sort((a: LogEntry, b: LogEntry) => a.timestamp - b.timestamp);
	}

	function getMatchChartData() {
		const matchLogs = getMatchLogs();
		if (matchLogs.length === 0) return null;

		const playerIds = [...new Set(matchLogs.map((l) => l.playerId))];
		const colors = ['#e94560', '#3742fa', '#2ed573', '#ffa502', '#a55eea', '#ff6348'];

		if (matchDataType === 'life') {
			const lifeByPlayer: Record<string, number[]> = {};
			const startLife = currentGameState?.config?.maxLife ?? 40;

			for (const pid of playerIds) {
				lifeByPlayer[pid] = [startLife];
			}

			const sortedLogs = [...matchLogs];
			for (const log of sortedLogs) {
				const pid = log.playerId;
				const last = lifeByPlayer[pid]?.[lifeByPlayer[pid].length - 1] ?? startLife;
				if (lifeByPlayer[pid]) {
					lifeByPlayer[pid].push(last + log.value);
				}
				for (const op of playerIds) {
					if (op !== pid && lifeByPlayer[op]) {
						lifeByPlayer[op].push(lifeByPlayer[op][lifeByPlayer[op].length - 1]);
					}
				}
			}

			const labels = Array.from({ length: (sortedLogs.length + 1) }, (_, i) => i === 0 ? 'Start' : `${i}`);

			return {
				labels,
				datasets: playerIds.map((pid, i) => ({
					label: matchLogs.find((l) => l.playerId === pid)?.playerName ?? pid,
					data: lifeByPlayer[pid],
					borderColor: colors[i % colors.length],
					backgroundColor: colors[i % colors.length] + '33',
					tension: 0.3,
					fill: false,
					pointRadius: 2
				}))
			};
		}

		if (matchDataType === 'damage_dealt') {
			const dealt: Record<string, number> = {};
			for (const log of matchLogs) {
				if (log.value < 0) {
					const source = log.sourcePlayerId ?? log.playerId;
					const name = matchLogs.find((l) => l.playerId === source)?.playerName ?? getPlayerName(source);
					dealt[name] = (dealt[name] ?? 0) + Math.abs(log.value);
				}
			}
			return {
				labels: Object.keys(dealt),
				datasets: [{
					label: 'Damage Dealt',
					data: Object.values(dealt),
					backgroundColor: colors.slice(0, Object.keys(dealt).length)
				}]
			};
		}

		const taken: Record<string, number> = {};
		for (const log of matchLogs) {
			if (log.value < 0) {
				taken[log.playerName] = (taken[log.playerName] ?? 0) + Math.abs(log.value);
			}
		}
		return {
			labels: Object.keys(taken),
			datasets: [{
				label: 'Damage Taken',
				data: Object.values(taken),
				backgroundColor: colors.slice(0, Object.keys(taken).length)
			}]
		};
	}

	// ─── Player Dashboard ───

	function getPlayerStats() {
		if (!selectedPlayerId) return null;
		const pid = selectedPlayerId;
		const pGames = allRecords.filter((g: GameRecord) => g.playerIds.includes(pid));
		const wins = pGames.filter((g: GameRecord) => g.winnerId === pid).length;
		const losses = pGames.filter((g: GameRecord) => g.winnerId && g.winnerId !== pid).length;
		const totalGames = pGames.length;
		const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : '0.0';

		const deckMap = new Map<string, { name: string; played: number; won: number }>();
		for (const game of pGames) {
			const idx = game.playerIds.indexOf(pid);
			if (idx !== -1) {
				const did = game.deckIds[idx];
				if (!deckMap.has(did)) {
					deckMap.set(did, { name: getDeckName(did), played: 0, won: 0 });
				}
				const entry = deckMap.get(did)!;
				entry.played++;
				if (game.winnerId === pid) entry.won++;
			}
		}

		return {
			totalGames,
			wins,
			losses,
			winRate,
			decksUsed: [...deckMap.values()].sort((a, b) => b.played - a.played)
		};
	}

	function getPlayerWinLossChart() {
		const stats = getPlayerStats();
		if (!stats || stats.totalGames === 0) return null;
		return {
			labels: ['Wins', 'Losses', 'Draws'],
			datasets: [{
				data: [stats.wins, stats.losses, stats.totalGames - stats.wins - stats.losses],
				backgroundColor: ['#2ed573', '#ff4757', '#5c5c7a']
			}]
		};
	}

	function getPlayerDeckChart() {
		const stats = getPlayerStats();
		if (!stats || stats.decksUsed.length === 0) return null;
		const colors = ['#e94560', '#3742fa', '#2ed573', '#ffa502', '#a55eea', '#ff6348', '#1e90ff', '#ff7f50'];
		return {
			labels: stats.decksUsed.map((d) => d.name),
			datasets: [{
				label: 'Games Played',
				data: stats.decksUsed.map((d) => d.played),
				backgroundColor: colors.slice(0, stats.decksUsed.length)
			}]
		};
	}

	// ─── Global Dashboard ───

	function getGlobalWinsChart() {
		if (allRecords.length === 0) return null;
		const winCount: Record<string, number> = {};
		for (const game of allRecords) {
			if (game.winnerId) {
				const name = getPlayerName(game.winnerId);
				winCount[name] = (winCount[name] ?? 0) + 1;
			}
		}
		const sorted = Object.entries(winCount).sort((a, b) => b[1] - a[1]);
		const colors = ['#e94560', '#3742fa', '#2ed573', '#ffa502', '#a55eea', '#ff6348'];
		return {
			labels: sorted.map(([name]) => name),
			datasets: [{
				label: 'Wins',
				data: sorted.map(([, v]) => v),
				backgroundColor: colors.slice(0, sorted.length)
			}]
		};
	}

	function getGlobalDeckUsageChart() {
		if (allRecords.length === 0) return null;
		const deckCount: Record<string, number> = {};
		for (const game of allRecords) {
			for (const did of game.deckIds) {
				const name = getDeckName(did);
				deckCount[name] = (deckCount[name] ?? 0) + 1;
			}
		}
		const sorted = Object.entries(deckCount).sort((a, b) => b[1] - a[1]).slice(0, 10);
		const colors = ['#e94560', '#3742fa', '#2ed573', '#ffa502', '#a55eea', '#ff6348', '#1e90ff', '#ff7f50', '#70a1ff', '#ffc048'];
		return {
			labels: sorted.map(([name]) => name),
			datasets: [{
				label: 'Games',
				data: sorted.map(([, v]) => v),
				backgroundColor: colors.slice(0, sorted.length)
			}]
		};
	}

	function getGlobalGamesPerPlayer() {
		if (allRecords.length === 0) return null;
		const count: Record<string, number> = {};
		for (const game of allRecords) {
			for (const pid of game.playerIds) {
				const name = getPlayerName(pid);
				count[name] = (count[name] ?? 0) + 1;
			}
		}
		const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]);
		const colors = ['#e94560', '#3742fa', '#2ed573', '#ffa502', '#a55eea', '#ff6348'];
		return {
			labels: sorted.map(([name]) => name),
			datasets: [{
				label: 'Games Played',
				data: sorted.map(([, v]) => v),
				backgroundColor: colors.slice(0, sorted.length)
			}]
		};
	}

	let matchChartData = $derived(getMatchChartData());
	let playerStats = $derived(getPlayerStats());
	let playerWinLossData = $derived(getPlayerWinLossChart());
	let playerDeckData = $derived(getPlayerDeckChart());
	let globalWinsData = $derived(getGlobalWinsChart());
	let globalDeckData = $derived(getGlobalDeckUsageChart());
	let globalGamesData = $derived(getGlobalGamesPerPlayer());
</script>

<div class="log-page">
	<h1>Analytics</h1>
	<p class="subtitle">Game logs, charts & dashboards</p>

	<div class="tabs">
		<button class="tab" class:active={activeTab === 'match'} onclick={() => activeTab = 'match'}>
			<Icon name="swords" size={14} /> Match
		</button>
		<button class="tab" class:active={activeTab === 'player'} onclick={() => activeTab = 'player'}>
			<Icon name="user" size={14} /> Player
		</button>
		<button class="tab" class:active={activeTab === 'global'} onclick={() => activeTab = 'global'}>
			<Icon name="globe" size={14} /> Global
		</button>
	</div>

	{#if loading}
		<div class="loading">Loading...</div>
	{:else if activeTab === 'match'}
		<section class="section">
			{#if allRecords.length > 0}
				<div class="picker">
					<label for="game-pick">Select match:</label>
					<select id="game-pick" bind:value={selectedGameId}>
						<option value="">Current Game</option>
						{#each allRecords as record}
							<option value={record.id}>
								{new Date(record.createdAt).toLocaleDateString()} — {record.playerIds.map(getPlayerName).join(' vs ')}
							</option>
						{/each}
					</select>
				</div>
			{/if}

			<div class="chart-controls">
				<div class="control-group">
					<span class="control-label">Chart:</span>
					<div class="toggle-group">
						<button class:active={matchChartType === 'line'} onclick={() => matchChartType = 'line'}>
							<Icon name="line-chart" size={14} /> Line
						</button>
						<button class:active={matchChartType === 'bar'} onclick={() => matchChartType = 'bar'}>
							<Icon name="bar-chart" size={14} /> Bar
						</button>
					</div>
				</div>
				<div class="control-group">
					<span class="control-label">Data:</span>
					<div class="toggle-group">
						<button class:active={matchDataType === 'life'} onclick={() => matchDataType = 'life'}>Life</button>
						<button class:active={matchDataType === 'damage_dealt'} onclick={() => matchDataType = 'damage_dealt'}>Dealt</button>
						<button class:active={matchDataType === 'damage_taken'} onclick={() => matchDataType = 'damage_taken'}>Taken</button>
					</div>
				</div>
			</div>

			{#if matchChartData}
				<ChartWrapper type={matchChartType} data={matchChartData} height={220} />
			{:else}
				<div class="empty-chart">
					<Icon name="line-chart" size={32} color="var(--color-text-muted)" />
					<p>No match data to chart. Play a game first!</p>
				</div>
			{/if}
		</section>

		<section class="section">
			<h2>Event Log</h2>
			{#if logs.length === 0 && !selectedGameId}
				<div class="empty"><p>No log entries yet.</p></div>
			{:else}
				{@const displayLogs = selectedGameId ? allLogs.filter((l: LogEntry) => l.gameId === selectedGameId) : logs}
				<div class="log-list">
					{#each displayLogs as entry (entry.id)}
						<div class="log-card animate-fade-in">
							<div class="log-left">
								<span class="log-time">{formatTimestamp(entry.timestamp)}</span>
								<span class="log-player">{entry.playerName}</span>
							</div>
							<div class="log-right">
								{#if entry.type === 'commander_damage'}
									<span class="badge cmd">CMD</span>
								{:else}
									<span class="badge life">LIFE</span>
								{/if}
								<span class="log-value" class:gain={entry.value > 0} class:loss={entry.value < 0}>
									{entry.value > 0 ? '+' : ''}{entry.value}
								</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>

	{:else if activeTab === 'player'}
		<section class="section">
			<div class="picker">
				<label for="player-pick">Select player:</label>
				<select id="player-pick" bind:value={selectedPlayerId}>
					<option value="">Choose...</option>
					{#each players as p}
						<option value={p.id}>{p.name}</option>
					{/each}
				</select>
			</div>

			{#if playerStats}
				<div class="stat-cards">
					<div class="stat-card">
						<span class="stat-value">{playerStats.totalGames}</span>
						<span class="stat-label">Games</span>
					</div>
					<div class="stat-card">
						<span class="stat-value success">{playerStats.wins}</span>
						<span class="stat-label">Wins</span>
					</div>
					<div class="stat-card">
						<span class="stat-value danger">{playerStats.losses}</span>
						<span class="stat-label">Losses</span>
					</div>
					<div class="stat-card">
						<span class="stat-value">{playerStats.winRate}%</span>
						<span class="stat-label">Win Rate</span>
					</div>
				</div>

				{#if playerWinLossData}
					<h3>Win / Loss Distribution</h3>
					<ChartWrapper type="doughnut" data={playerWinLossData} height={200} />
				{/if}

				{#if playerDeckData}
					<h3>Decks Used</h3>
					<ChartWrapper type="bar" data={playerDeckData} height={200} />
				{/if}

				{#if playerStats.decksUsed.length > 0}
					<h3>Deck Breakdown</h3>
					<div class="deck-stats">
						{#each playerStats.decksUsed as ds}
							<div class="deck-stat-row">
								<span class="deck-stat-name">{ds.name}</span>
								<span class="deck-stat-games">{ds.played}g</span>
								<span class="deck-stat-wins">{ds.won}W</span>
								<span class="deck-stat-losses">{ds.played - ds.won}L</span>
							</div>
						{/each}
					</div>
				{/if}
			{:else}
				<div class="empty-chart">
					<Icon name="user" size={32} color="var(--color-text-muted)" />
					<p>Select a player to see their stats.</p>
				</div>
			{/if}
		</section>

	{:else}
		<section class="section">
			{#if allRecords.length === 0}
				<div class="empty-chart">
					<Icon name="globe" size={32} color="var(--color-text-muted)" />
					<p>No game records yet. Finish a game to see global stats.</p>
				</div>
			{:else}
				<div class="stat-cards">
					<div class="stat-card">
						<span class="stat-value">{allRecords.length}</span>
						<span class="stat-label">Total Games</span>
					</div>
					<div class="stat-card">
						<span class="stat-value">{players.length}</span>
						<span class="stat-label">Players</span>
					</div>
					<div class="stat-card">
						<span class="stat-value">{decks.length}</span>
						<span class="stat-label">Decks</span>
					</div>
				</div>

				{#if globalWinsData}
					<h3><Icon name="trophy" size={16} /> Most Wins</h3>
					<ChartWrapper type="bar" data={globalWinsData} height={200} />
				{/if}

				{#if globalGamesData}
					<h3><Icon name="bar-chart" size={16} /> Games Per Player</h3>
					<ChartWrapper type="bar" data={globalGamesData} height={200} />
				{/if}

				{#if globalDeckData}
					<h3><Icon name="pie-chart" size={16} /> Deck Usage</h3>
					<ChartWrapper type="doughnut" data={globalDeckData} height={220} />
				{/if}
			{/if}
		</section>
	{/if}
</div>

<style>
	.log-page {
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
		padding: var(--space-xl);
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
		font-size: 0.7rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		transition: all var(--transition-fast);
		color: var(--color-text-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		min-height: 44px;
	}

	.tab.active {
		background: var(--color-primary);
		color: white;
		box-shadow: var(--glow-primary);
	}

	.section {
		margin-bottom: var(--space-xl);
	}

	h2 {
		font-size: 0.75rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-secondary);
		margin-bottom: var(--space-sm);
		margin-top: var(--space-md);
	}

	h3 {
		font-size: 0.75rem;
		font-weight: 800;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin: var(--space-md) 0 var(--space-sm);
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.picker {
		margin-bottom: var(--space-md);
	}

	.picker label {
		display: block;
		font-size: 0.65rem;
		font-weight: 700;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin-bottom: var(--space-xs);
	}

	.picker select {
		width: 100%;
		min-height: 44px;
	}

	.chart-controls {
		display: flex;
		gap: var(--space-md);
		margin-bottom: var(--space-md);
		flex-wrap: wrap;
	}

	.control-group {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.control-label {
		font-size: 0.6rem;
		font-weight: 700;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.toggle-group {
		display: flex;
		gap: 2px;
		background: var(--color-surface);
		border: 1px solid var(--color-surface-elevated);
		border-radius: var(--radius-md);
		padding: 2px;
	}

	.toggle-group button {
		padding: 6px 10px;
		border-radius: var(--radius-sm);
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--color-text-muted);
		transition: all var(--transition-fast);
		display: flex;
		align-items: center;
		gap: 3px;
		min-height: 36px;
	}

	.toggle-group button.active {
		background: var(--color-surface-elevated);
		color: var(--color-secondary);
		border: 1px solid var(--neon-cyan);
	}

	.empty-chart {
		text-align: center;
		padding: var(--space-2xl) var(--space-lg);
		color: var(--color-text-muted);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-sm);
	}

	.empty-chart p {
		font-size: 0.8rem;
	}

	.log-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		max-height: 400px;
		overflow-y: auto;
	}

	.log-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-elevated);
		border-radius: var(--radius-md);
	}

	.log-left {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.log-time {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		color: var(--color-text-muted);
	}

	.log-player {
		font-weight: 700;
		font-size: 0.75rem;
		letter-spacing: 0.03em;
	}

	.log-right {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.badge {
		padding: 2px 8px;
		border-radius: var(--radius-full);
		font-size: 0.5rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.badge.life {
		background: var(--color-secondary-dim);
		color: var(--color-secondary);
		border: 1px solid var(--neon-cyan);
	}

	.badge.cmd {
		background: var(--color-primary-dim);
		color: var(--color-primary);
		border: 1px solid var(--neon-red);
	}

	.log-value {
		font-weight: 800;
		font-size: 0.85rem;
		font-variant-numeric: tabular-nums;
		font-family: var(--font-mono);
		min-width: 36px;
		text-align: right;
	}

	.log-value.gain { color: var(--color-success); }
	.log-value.loss { color: var(--color-danger); }

	.stat-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
	}

	.stat-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: var(--space-md) var(--space-sm);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-elevated);
		border-radius: var(--radius-lg);
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		font-family: var(--font-mono);
		line-height: 1;
	}

	.stat-value.success { color: var(--color-success); }
	.stat-value.danger { color: var(--color-danger); }

	.stat-label {
		font-size: 0.55rem;
		font-weight: 700;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.deck-stats {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.deck-stat-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-elevated);
		border-radius: var(--radius-md);
		font-size: 0.75rem;
	}

	.deck-stat-name {
		flex: 1;
		font-weight: 700;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.deck-stat-games {
		color: var(--color-text-muted);
		font-size: 0.7rem;
		font-variant-numeric: tabular-nums;
	}

	.deck-stat-wins { color: var(--color-success); font-weight: 700; }
	.deck-stat-losses { color: var(--color-danger); font-weight: 700; }
</style>

