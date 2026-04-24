<script lang="ts">
	import { onMount } from 'svelte';
	import { authUser } from '$lib/firebase/auth';
	import type { Player, Deck, GameRecord, LogEntry, AnalyticsEventV2, MtgColor } from '$lib/models/types';
	import type { AnalyticsV2Result } from '$lib/models/analytics-v2';
	import { getDataService } from '$lib/services/data-service';
	import { currentZone, getPlayersInZone, getDecksInZone } from '$lib/stores/zoneStore';
	import { computeAnalyticsV2 } from '$lib/services/analytics-v2.service';
	import { formatTimestamp } from '$lib/utils/format';
	import ChartWrapper from '$lib/components/ui/ChartWrapper.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ManaIcon from '$lib/components/ui/ManaIcon.svelte';

	type AnalyticsLogTone = 'gain' | 'loss' | 'turn' | 'react';
	type AnalyticsModalRow = { id: string; timestamp: number; type: string; detail: string; tone: AnalyticsLogTone };

	let user = $derived($authUser);
	let zone = $derived($currentZone);
	let players: Player[] = $state([]);
	let decks: Deck[] = $state([]);
	let gameRecords: GameRecord[] = $state([]);
	let logEntries: LogEntry[] = $state([]);
	let events: AnalyticsEventV2[] = $state([]);
	let loading = $state(true);
	let analytics: AnalyticsV2Result | null = $state(null);
	let activeTab: 'dashboard' | 'players' = $state('dashboard');
	let playerFilter: string = $state('');
	let playerSortBy: 'won' | 'played' | 'lost' = $state('won');
	let selectedGameId: string | null = $state(null);
	let showGameLogModal = $state(false);
	let modalTitle = $state('Game Log');
	let modalRows = $state<AnalyticsModalRow[]>([]);

	onMount(loadAnalytics);

	async function loadAnalytics() {
		if (!zone) {
			loading = false;
			return;
		}
		loading = true;
		try {
			const ds = await getDataService();
			[players, decks, gameRecords, logEntries, events] = await Promise.all([
				getPlayersInZone(zone.id),
				getDecksInZone(zone.id),
				ds.getGameRecordsForZone(zone.id),
				ds.getLogEntriesForZone(zone.id),
				ds.getAnalyticsEventsV2ForZone(zone.id)
			]);
			analytics = computeAnalyticsV2(players, gameRecords, logEntries, events);
		} catch (e) {
			console.warn('Analytics V2 load error', e);
		} finally {
			loading = false;
		}
	}

	const CHART_COLORS = ['#e94560', '#2ed573', '#1e90ff', '#ffa502', '#a55eea', '#ff6348', '#70a1ff', '#ff7f50'];

	function sortedPlayerRows() {
		if (!analytics) return [];
		const rows = [...analytics.players];
		if (playerSortBy === 'won') return rows.sort((a, b) => b.wins - a.wins || b.gamesPlayed - a.gamesPlayed);
		if (playerSortBy === 'played') return rows.sort((a, b) => b.gamesPlayed - a.gamesPlayed || b.wins - a.wins);
		return rows.sort((a, b) => b.losses - a.losses || b.gamesPlayed - a.gamesPlayed);
	}

	function getWinRateChart() {
		if (!analytics?.playerWinRateBars.length) return null;
		const top = analytics.playerWinRateBars.slice(0, 8);
		return {
			labels: top.map((r) => r.playerName),
			datasets: [{ label: 'Win %', data: top.map((r) => r.winRate), backgroundColor: CHART_COLORS.slice(0, top.length) }]
		};
	}

	function getGamesPerDayChart() {
		if (!analytics?.gamesByDay.length) return null;
		return {
			labels: analytics.gamesByDay.map((d) => d.label),
			datasets: [{ label: 'Games', data: analytics.gamesByDay.map((d) => d.games), backgroundColor: '#1e90ff' }]
		};
	}

	function getDamageVsHealVsTakenChart() {
		if (!analytics?.players.length) return null;
		const rows = analytics.players.filter((p) => p.gamesPlayed > 0).slice(0, 8);
		if (!rows.length) return null;
		return {
			labels: rows.map((p) => p.playerName),
			datasets: [
				{ label: 'Damage', data: rows.map((p) => p.damageDealt), backgroundColor: '#e94560' },
				{ label: 'Heal', data: rows.map((p) => p.healingDone), backgroundColor: '#2ed573' },
				{ label: 'Taken', data: rows.map((p) => p.damageTaken), backgroundColor: '#ff9f43' }
			]
		};
	}

	function getColorDistribution() {
		const counts: Record<MtgColor, number> = { white: 0, blue: 0, black: 0, red: 0, green: 0 };
		for (const g of gameRecords) {
			for (const did of g.deckIds) {
				const d = decks.find((deck) => deck.id === did);
				if (!d) continue;
				for (const c of d.colors) counts[c]++;
			}
		}
		return counts;
	}

	function totalColorCount(): number {
		const counts = getColorDistribution();
		return Object.values(counts).reduce((a, b) => a + b, 0);
	}

	async function getCommanderPattern(url: string): Promise<CanvasPattern | string> {
		try {
			const image = await new Promise<HTMLImageElement>((resolve, reject) => {
				const img = new Image();
				img.crossOrigin = 'anonymous';
				img.onload = () => resolve(img);
				img.onerror = () => reject(new Error('image load failed'));
				img.src = url;
			});
			const canvas = document.createElement('canvas');
			// Larger pattern so each slice actually shows recognisable commander art.
			const SIZE = 220;
			canvas.width = SIZE;
			canvas.height = SIZE;
			const ctx = canvas.getContext('2d');
			if (!ctx) return '#4b4b60';
			// Cover-draw: fill square tile preserving aspect ratio
			const ir = image.width / image.height;
			let sw = image.width, sh = image.height, sx = 0, sy = 0;
			if (ir > 1) { sw = image.height; sx = (image.width - sw) / 2; }
			else { sh = image.width; sy = (image.height - sh) / 2; }
			ctx.drawImage(image, sx, sy, sw, sh, 0, 0, SIZE, SIZE);
			return ctx.createPattern(canvas, 'no-repeat') ?? '#4b4b60';
		} catch {
			return '#4b4b60';
		}
	}

	/** Per-commander usage, filtered by `excludedDeckIds`. */
	let excludedDeckIds: string[] = $state([]);
	let commanderUsageChart = $state<any>(null);
	let commanderUsageLabels = $state<{ id: string; label: string; image: string; count: number; color: string }[]>([]);

	$effect(() => {
		void decks;
		void gameRecords;
		void excludedDeckIds;
		(async () => {
			const usage: Record<string, { id: string; label: string; image: string; count: number }> = {};
			for (const g of gameRecords) {
				for (const did of g.deckIds) {
					if (excludedDeckIds.includes(did)) continue;
					const d = decks.find((x) => x.id === did);
					if (!d) continue;
					usage[did] ??= { id: did, label: d.commanderName, image: d.commanderImageUrl, count: 0 };
					usage[did].count++;
				}
			}
			const top = Object.values(usage).sort((a, b) => b.count - a.count).slice(0, 12);
			if (!top.length) {
				commanderUsageChart = null;
				commanderUsageLabels = [];
				return;
			}
			commanderUsageLabels = top.map((t, i) => ({ ...t, color: CHART_COLORS[i % CHART_COLORS.length] }));
			if (typeof window === 'undefined') {
				commanderUsageChart = {
					ids: top.map((t) => t.id),
					labels: top.map((t) => t.label),
					datasets: [{ label: 'Games', data: top.map((t) => t.count), backgroundColor: top.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]) }]
				};
				return;
			}
			const bg = await Promise.all(top.map((t) => getCommanderPattern(t.image)));
			commanderUsageChart = {
				ids: top.map((t) => t.id),
				labels: top.map((t) => t.label),
				datasets: [{
					label: 'Games',
					data: top.map((t) => t.count),
					backgroundColor: bg,
					borderColor: '#0a0a12',
					borderWidth: 2
				}]
			};
		})();
	});

	function onCommanderPieClick(point: { label: string; value: number }) {
		const row = commanderUsageLabels.find((r) => r.label === point.label);
		if (!row) return;
		excludedDeckIds = [...excludedDeckIds, row.id];
	}

	function restoreCommanders() {
		excludedDeckIds = [];
	}

	function getRecentGames(limit = 8): GameRecord[] {
		return [...gameRecords].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
	}

	function formatGameDate(ts: number): string {
		return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function getGameDuration(r: GameRecord): string {
		if (!r.finishedAt) return '—';
		const mins = Math.round((r.finishedAt - r.createdAt) / 60000);
		return mins < 1 ? '<1 min' : `${mins} min`;
	}

	function getPlayerName(id: string): string {
		return players.find((p) => p.id === id)?.name ?? '?';
	}

	function getPlayerImage(id: string): string | undefined {
		return players.find((p) => p.id === id)?.imageUrl;
	}

	function getDeckName(id: string): string {
		return decks.find((d) => d.id === id)?.commanderName ?? '?';
	}

	function getSelectedPlayerStats() {
		if (!playerFilter) return null;
		const row = analytics?.players.find((p) => p.playerId === playerFilter);
		if (!row) return null;
		const games = gameRecords.filter((g) => g.playerIds.includes(playerFilter));
		const wins = row.wins;
		const losses = row.losses;
		const draws = Math.max(0, games.length - wins - losses);

		const deckMap: Record<string, { name: string; played: number; won: number }> = {};
		for (const g of games) {
			const idx = g.playerIds.indexOf(playerFilter);
			if (idx < 0) continue;
			const did = g.deckIds[idx];
			if (!did) continue;
			deckMap[did] ??= { name: getDeckName(did), played: 0, won: 0 };
			deckMap[did].played++;
			if (g.winnerId === playerFilter) deckMap[did].won++;
		}

		return {
			...row,
			totalGames: games.length,
			draws,
			decksUsed: Object.values(deckMap).sort((a, b) => b.played - a.played || b.won - a.won)
		};
	}

	function getPlayerDoughnutData(stats: { wins: number; losses: number; draws: number }) {
		if (stats.wins + stats.losses + stats.draws === 0) return null;
		return {
			labels: ['Wins', 'Losses', 'Draws'],
			datasets: [{ data: [stats.wins, stats.losses, stats.draws], backgroundColor: ['#2ed573', '#e94560', '#7a7a96'] }]
		};
	}

	function getPlayerDeckChart(decksUsed: { name: string; played: number; won: number }[]) {
		if (!decksUsed.length) return null;
		return {
			labels: decksUsed.map((d) => d.name),
			datasets: [
				{ label: 'Played', data: decksUsed.map((d) => d.played), backgroundColor: '#1e90ff' },
				{ label: 'Won', data: decksUsed.map((d) => d.won), backgroundColor: '#2ed573' }
			]
		};
	}

	function buildGameLogRows(gameId: string, logsIn: LogEntry[], eventsIn: AnalyticsEventV2[]): AnalyticsModalRow[] {
		const logs: AnalyticsModalRow[] = logsIn.filter((l) => l.gameId === gameId).map((l) => ({
			id: l.id,
			timestamp: l.timestamp,
			type: l.type === 'commander_damage' ? 'CMD' : 'LIFE',
			detail: `${l.playerName} ${l.value >= 0 ? 'gains' : 'loses'} ${Math.abs(l.value)}`,
			tone: l.value >= 0 ? 'gain' : 'loss'
		}));
		const reactions: AnalyticsModalRow[] = eventsIn
			.filter((e) => e.gameId === gameId)
			.map((e) => ({
				id: e.id,
				timestamp: e.timestamp,
				type:
					e.type === 'reaction_claimed' ? 'REACT CLAIM'
					: e.type === 'reaction_dropped' ? 'REACT DROP'
					: e.type === 'turn_start' ? 'TURN'
					: e.type === 'round_marker' ? 'ROUND'
					: 'REACT',
				detail:
					e.type === 'turn_start' ? `${getPlayerName(e.playerId ?? '')} turn started`
					: e.type === 'reaction_dropped' ? `${getPlayerName(e.playerId ?? '')} dropped priority`
					: e.type === 'round_marker' ? `Round ${e.round ?? ''}`
					: `${getPlayerName(e.playerId ?? '')} claimed priority`,
				tone: (e.type === 'turn_start' ? 'turn' : 'react') as AnalyticsLogTone
			}));
		return [...logs, ...reactions].sort((a, b) => b.timestamp - a.timestamp);
	}

	let selectedGameLogs = $derived(modalRows);
	let winRateChart = $derived(getWinRateChart());
	let gamesPerDayChart = $derived(getGamesPerDayChart());
	let damageMergedChart = $derived(getDamageVsHealVsTakenChart());
	let colorDistribution = $derived(getColorDistribution());
	let colorKeys = $derived(Object.keys(colorDistribution) as MtgColor[]);
	let playerRows = $derived(sortedPlayerRows());
	let selectedPlayerStats = $derived(getSelectedPlayerStats());
	let playerDoughnutData = $derived(
		selectedPlayerStats ? getPlayerDoughnutData({ wins: selectedPlayerStats.wins, losses: selectedPlayerStats.losses, draws: selectedPlayerStats.draws }) : null
	);
	let playerDeckChartData = $derived(selectedPlayerStats ? getPlayerDeckChart(selectedPlayerStats.decksUsed) : null);
	let recentGames = $derived(getRecentGames());

	function onWinrateBarClick(point: { label: string; value: number }) {
		const match = analytics?.playerWinRateBars.find((p) => p.playerName === point.label);
		if (!match) return;
		modalTitle = 'Winrate Detail';
		selectedGameId = null;
		modalRows = [{
			id: `wr-${match.playerId}`,
			timestamp: Date.now(),
			type: 'WINRATE',
			detail: `${match.playerName}: ${match.winRate}% over ${match.gamesPlayed} games`,
			tone: 'turn'
		}];
		showGameLogModal = true;
	}

	function onGamesPerDayBarClick(point: { label: string; value: number }) {
		modalTitle = 'Games Per Day Detail';
		selectedGameId = null;
		modalRows = [{
			id: `day-${point.label}`,
			timestamp: Date.now(),
			type: 'GAMES',
			detail: `${point.label}: ${Math.round(point.value)} games`,
			tone: 'turn'
		}];
		showGameLogModal = true;
	}

	async function openRecentGameLog(gameId: string) {
		selectedGameId = gameId;
		modalTitle = 'Game Log';
		let rows = buildGameLogRows(gameId, logEntries, events);
		if (!rows.length) {
			try {
				const ds = await getDataService();
				const [logs, evs] = await Promise.all([
					ds.getLogEntriesForGame(gameId),
					ds.getAnalyticsEventsV2ForGame(gameId)
				]);
				rows = buildGameLogRows(gameId, logs, evs);
			} catch (e) {
				console.warn('Game log fallback load failed', e);
			}
		}
		modalRows = rows as AnalyticsModalRow[];
		showGameLogModal = true;
	}

	async function deleteGame(gameId: string) {
		if (!zone || !user || zone.creatorId !== user.uid) return;
		const ok = confirm('Delete this game and all related logs/events?');
		if (!ok) return;
		try {
			const ds = await getDataService();
			await ds.deleteGameRecord(gameId);
			await loadAnalytics();
		} catch (e) {
			console.warn('Failed to delete game', e);
		}
	}
</script>

<div class="analytics-v2-page">
	<h1>Analytics V2</h1>
	<p class="sub">{zone?.name ?? 'Commander Zone'}</p>

	<div class="tabs">
		<button class:active={activeTab==='dashboard'} onclick={() => activeTab='dashboard'}>Dashboard</button>
		<button class:active={activeTab==='players'} onclick={() => activeTab='players'}>Players</button>
	</div>

	{#if loading}
		<div class="empty">Loading…</div>
	{:else if !zone || !analytics}
		<div class="empty">No analytics data.</div>
	{:else if activeTab === 'dashboard'}
		<div class="stats-strip">
			<div class="stat-card"><span class="stat-val">{analytics.overview.totalGames}</span><span class="stat-lbl">Games</span></div>
			<div class="stat-card"><span class="stat-val">{analytics.overview.avgRoundsPerGame}</span><span class="stat-lbl">Avg Rounds</span></div>
			<div class="stat-card"><span class="stat-val">{analytics.overview.avgDamagePerTurn}</span><span class="stat-lbl">DMG/Turn</span></div>
			<div class="stat-card"><span class="stat-val">{analytics.overview.totalCommanderDamage}</span><span class="stat-lbl">CMD Dmg</span></div>
		</div>

		{#if winRateChart}
			<div class="chart-section">
				<h3><Icon name="bar-chart" size={16} /> Winrate</h3>
				<ChartWrapper type="bar" data={winRateChart} height={220} onPointClick={onWinrateBarClick} />
			</div>
		{/if}

		{#if gamesPerDayChart}
			<div class="chart-section">
				<h3><Icon name="bar-chart" size={16} /> Games Per Day</h3>
				<ChartWrapper
					type="bar"
					data={gamesPerDayChart}
					height={220}
					onPointClick={onGamesPerDayBarClick}
					options={{ scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } } } }}
				/>
			</div>
		{/if}

		{#if damageMergedChart}
			<div class="chart-section">
				<h3><Icon name="bar-chart" size={16} /> Damage vs Heal vs Taken</h3>
				<ChartWrapper type="bar" data={damageMergedChart} height={240} />
			</div>
		{/if}

		{#if commanderUsageChart}
			<div class="chart-section">
				<h3>
					<Icon name="pie-chart" size={16} /> Most Played Commanders
					{#if excludedDeckIds.length}
						<button class="restore-btn" onclick={restoreCommanders} title="Show all">
							<Icon name="return" size={12} /> Restore
						</button>
					{/if}
				</h3>
				<div class="commander-pie">
					<div class="commander-pie-chart">
						<ChartWrapper type="pie" data={commanderUsageChart} height={280} onPointClick={onCommanderPieClick}
							options={{ plugins: { legend: { display: false }, tooltip: { callbacks: {} } } }} />
					</div>
					<div class="commander-pie-legend">
						{#each commanderUsageLabels as row (row.id)}
							<button class="legend-row" onclick={() => (excludedDeckIds = [...excludedDeckIds, row.id])} title="Click to hide">
								<span class="legend-swatch" style:background={row.color}></span>
								{#if row.image}<img class="legend-img" src={row.image} alt="" loading="lazy" />{/if}
								<span class="legend-name">{row.label}</span>
								<span class="legend-count">{row.count}</span>
							</button>
						{/each}
					</div>
				</div>
				<p class="hint">Click a slice or legend entry to hide that commander.</p>
			</div>
		{/if}

		<div class="section">
			<h3><Icon name="pie-chart" size={16} /> Color Distribution</h3>
			<div class="color-grid">
				{#each colorKeys as c}
					<div class="color-row">
						<ManaIcon color={c} size={20} />
						<span>{c}</span>
						<strong>{colorDistribution[c]}</strong>
						<em>{totalColorCount() > 0 ? Math.round((colorDistribution[c] / totalColorCount()) * 100) : 0}%</em>
					</div>
				{/each}
			</div>
		</div>

		<div class="section">
			<h3><Icon name="swords" size={16} /> Recent Games</h3>
			<div class="game-list">
				{#each recentGames as g (g.id)}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="game-row" onclick={() => void openRecentGameLog(g.id)}>
						<div class="game-date">{formatGameDate(g.createdAt)}</div>
						<div class="game-players">
							{#each g.playerIds as pid, i}
								<span class="game-player" class:winner={pid === g.winnerId}>{getPlayerName(pid)}</span>{#if i < g.playerIds.length - 1}<span class="vs">vs</span>{/if}
							{/each}
						</div>
						<span class="game-dur">{getGameDuration(g)}</span>
						{#if user?.uid === zone.creatorId}
							<button class="delete-btn" onclick={(e) => { e.stopPropagation(); void deleteGame(g.id); }}><Icon name="trash" size={14} /></button>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<div class="pick">
			<label for="v2-pf">Player:</label>
			<select id="v2-pf" bind:value={playerFilter}>
				<option value="">All Players</option>
				{#each players as p}<option value={p.id}>{p.name}</option>{/each}
			</select>
		</div>

		<div class="sort-row">
			<span>Sort:</span>
			<button class:active={playerSortBy==='won'} onclick={() => playerSortBy='won'}>won</button>
			<button class:active={playerSortBy==='played'} onclick={() => playerSortBy='played'}>played</button>
			<button class:active={playerSortBy==='lost'} onclick={() => playerSortBy='lost'}>lost</button>
		</div>

		{#if !playerFilter}
			<div class="rank-list">
				{#each playerRows as p, i (p.playerId)}
					<button class="rank-card" onclick={() => playerFilter = p.playerId}>
						<span class="rank-pos">{#if i===0}<Icon name="crown" size={18} color="var(--color-warning)" />{:else}#{i + 1}{/if}</span>
						<div class="rank-avatar">
							{#if getPlayerImage(p.playerId)}
								<img src={getPlayerImage(p.playerId)} alt="" class="rank-img" />
							{:else}
								<Icon name="user" size={16} color="var(--color-text-muted)" />
							{/if}
						</div>
						<div class="rank-info">
							<strong>{p.playerName}</strong>
							<span class="rank-meta">{p.gamesPlayed} games · {p.wins}W / {p.losses}L</span>
						</div>
						<div class="rank-rate">
							<span class="rate-val">{p.winRate}%</span>
							<span class="rate-lbl">Win Rate</span>
						</div>
					</button>
				{/each}
			</div>
		{:else if selectedPlayerStats}
			<button class="back-link" onclick={() => playerFilter = ''}>
				<Icon name="back" size={14} /> All Players
			</button>

			<div class="player-header">
				<div class="player-avatar-lg">
					{#if getPlayerImage(playerFilter)}
						<img src={getPlayerImage(playerFilter)} alt="" class="avatar-lg" />
					{:else}
						<Icon name="user" size={30} color="var(--color-text-muted)" />
					{/if}
				</div>
				<div class="player-title">
					<h2 class="player-name">{selectedPlayerStats.playerName}</h2>
				</div>
			</div>

			<div class="stats-strip">
				<div class="stat-card"><span class="stat-val">{selectedPlayerStats.totalGames}</span><span class="stat-lbl">Games</span></div>
				<div class="stat-card"><span class="stat-val success">{selectedPlayerStats.wins}</span><span class="stat-lbl">Wins</span></div>
				<div class="stat-card"><span class="stat-val danger">{selectedPlayerStats.losses}</span><span class="stat-lbl">Losses</span></div>
				<div class="stat-card"><span class="stat-val">{selectedPlayerStats.winRate}%</span><span class="stat-lbl">Win Rate</span></div>
			</div>

			{#if playerDoughnutData}
				<div class="chart-section">
					<h3><Icon name="pie-chart" size={16} /> Win / Loss / Draw</h3>
					<ChartWrapper type="doughnut" data={playerDoughnutData} height={220} />
				</div>
			{/if}

			{#if playerDeckChartData}
				<div class="chart-section">
					<h3><Icon name="bar-chart" size={16} /> Deck Performance</h3>
					<ChartWrapper type="bar" data={playerDeckChartData} height={220} />
				</div>
			{/if}

			{#if selectedPlayerStats.decksUsed.length}
				<div class="section">
					<h3><Icon name="deck" size={16} /> Deck Breakdown</h3>
					<div class="dk-list">
						{#each selectedPlayerStats.decksUsed as d}
							<div class="dk-row">
								<span class="dk-n">{d.name}</span>
								<span class="dk-stat">{d.played}G</span>
								<span class="dk-stat w">{d.won}W</span>
								<span class="dk-stat l">{d.played - d.won}L</span>
								<span class="dk-stat rate">{d.played ? Math.round((d.won / d.played) * 100) : 0}%</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/if}
	{/if}

	<Modal bind:open={showGameLogModal} title={modalTitle}>
		{#snippet children()}
			<div class="log-list">
				{#if !selectedGameLogs.length}
					<div class="empty">No entries yet.</div>
				{:else}
					{#each selectedGameLogs as row (row.id)}
						<div class="log-row"><span class="lt">{formatTimestamp(row.timestamp)}</span><span class="badge" class:badge-turn={row.tone === 'turn'} class:badge-life={row.type === 'LIFE'}>{row.type}</span><span class:gain={row.tone === 'gain'} class:loss={row.tone === 'loss'}>{row.detail}</span></div>
					{/each}
				{/if}
			</div>
		{/snippet}
	</Modal>
</div>

<style>
	.analytics-v2-page { padding-top: var(--space-md); }
	h1 { font-size: 1.4rem; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; color: var(--color-primary); }
	.sub { color: var(--color-text-muted); margin-top: var(--space-xs); margin-bottom: var(--space-md); font-size: .75rem; }
	.tabs { display: flex; gap: 4px; margin-bottom: var(--space-md); }
	.tabs button { flex: 1; min-height: 42px; border-radius: var(--radius-md); border: 1px solid var(--color-surface-elevated); color: var(--color-text-muted); }
	.tabs button.active { border-color: var(--neon-cyan); color: var(--color-secondary); background: var(--color-secondary-dim); }
	.empty { text-align: center; padding: var(--space-xl); color: var(--color-text-muted); font-size: .85rem; }
	.stats-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(75px, 1fr)); gap: var(--space-sm); margin-bottom: var(--space-md); }
	.stat-card { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: var(--space-md) var(--space-sm); background: var(--color-surface); border: 1px solid var(--color-surface-elevated); border-radius: var(--radius-lg); text-align: center; }
	.stat-val { font-size: 1.2rem; font-weight: 800; font-family: var(--font-mono); }
	.stat-lbl { font-size: .5rem; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; }
	.chart-section { margin-bottom: var(--space-lg); }
	.chart-section h3 { display: flex; align-items: center; gap: 8px; }
	.restore-btn { display: inline-flex; align-items: center; gap: 4px; margin-left: auto; padding: 4px 10px; font-size: .7rem; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; background: var(--color-surface); border: 1px solid var(--color-surface-elevated); border-radius: var(--radius-full); color: var(--color-text); cursor: pointer; }
	.restore-btn:hover { border-color: var(--neon-cyan); color: var(--neon-cyan); }
	.commander-pie { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(220px, 1fr); gap: var(--space-md); align-items: center; }
	.commander-pie-chart { min-width: 0; }
	.commander-pie-legend { display: flex; flex-direction: column; gap: 6px; max-height: 320px; overflow-y: auto; padding-right: 4px; }
	.legend-row { display: grid; grid-template-columns: 14px 40px 1fr auto; align-items: center; gap: 8px; padding: 6px 10px; background: var(--color-surface); border: 1px solid var(--color-surface-elevated); border-radius: var(--radius-md); text-align: left; cursor: pointer; transition: all var(--transition-fast); }
	.legend-row:hover { border-color: var(--color-danger); box-shadow: 0 0 10px rgba(255,23,68,.2); }
	.legend-swatch { width: 12px; height: 12px; border-radius: 3px; border: 1px solid rgba(255,255,255,.3); }
	.legend-img { width: 40px; height: 30px; border-radius: var(--radius-sm); object-fit: cover; object-position: center top; }
	.legend-name { font-size: .78rem; font-weight: 700; color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.legend-count { font-size: .82rem; font-weight: 900; color: var(--color-warning); font-variant-numeric: tabular-nums; }
	.hint { font-size: .68rem; color: var(--color-text-muted); margin-top: 6px; text-align: center; }
	@media (max-width: 768px) { .commander-pie { grid-template-columns: 1fr; } }
	.section { margin-bottom: var(--space-lg); }
	h3 { font-size: .7rem; font-weight: 800; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: .06em; margin-bottom: var(--space-sm); display: flex; align-items: center; gap: 6px; }
	.game-list { display: flex; flex-direction: column; gap: var(--space-xs); }
	.game-row { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-sm) var(--space-md); background: var(--color-surface); border: 1px solid var(--color-surface-elevated); border-radius: var(--radius-md); font-size: .75rem; cursor: pointer; }
	.game-date { font-size: .6rem; color: var(--color-text-muted); min-width: 72px; }
	.game-players { flex: 1; display: flex; flex-wrap: wrap; gap: 2px; align-items: center; }
	.game-player.winner { color: var(--color-warning); font-weight: 800; }
	.vs { font-size: .5rem; color: var(--color-text-muted); }
	.game-dur { font-size: .6rem; color: var(--color-text-muted); }
	.delete-btn { min-height: 28px; width: 28px; border-radius: var(--radius-full); border: 1px solid rgba(255,0,0,.2); color: var(--color-danger); }
	.color-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: var(--space-sm); }
	.color-row { display: flex; align-items: center; gap: 8px; background: var(--color-surface); border: 1px solid var(--color-surface-elevated); border-radius: var(--radius-md); padding: 8px; }
	.color-row strong { margin-left: auto; font-family: var(--font-mono); }
	.color-row em { font-style: normal; font-size: .62rem; color: var(--color-text-muted); min-width: 32px; text-align: right; }
	.sort-row { display: flex; align-items: center; gap: var(--space-sm); margin-bottom: var(--space-md); }
	.pick { margin-bottom: var(--space-md); }
	.pick label { display: block; font-size: .65rem; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: .06em; margin-bottom: var(--space-xs); }
	.pick select { width: 100%; min-height: 44px; }
	.sort-row button { padding: 4px 10px; border-radius: var(--radius-md); border: 1px solid var(--color-surface-elevated); color: var(--color-text-muted); }
	.sort-row button.active { color: var(--color-secondary); border-color: var(--neon-cyan); }
	.rank-list { display: flex; flex-direction: column; gap: var(--space-sm); margin-bottom: var(--space-md); }
	.rank-card { display: flex; align-items: center; gap: var(--space-md); padding: var(--space-md); background: var(--color-surface); border: 1px solid var(--color-surface-elevated); border-radius: var(--radius-lg); transition: all var(--transition-fast); cursor: pointer; text-align: left; }
	.rank-card:hover { border-color: var(--neon-cyan); transform: translateY(-1px); }
	.rank-pos { width: 32px; text-align: center; font-weight: 800; font-size: .85rem; color: var(--color-text-muted); flex-shrink: 0; }
	.rank-avatar { width: 36px; height: 36px; border-radius: var(--radius-full); overflow: hidden; background: var(--color-surface-elevated); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
	.rank-img { width: 100%; height: 100%; object-fit: cover; }
	.rank-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
	.rank-info strong { font-weight: 700; font-size: .85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.rank-meta { font-size: .6rem; color: var(--color-text-muted); letter-spacing: .02em; }
	.rank-rate { display: flex; flex-direction: column; align-items: center; gap: 1px; flex-shrink: 0; }
	.rate-val { font-size: 1rem; font-weight: 800; font-family: var(--font-mono); color: var(--color-secondary); }
	.rate-lbl { font-size: .45rem; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: .06em; }
	.back-link { display: flex; align-items: center; gap: 4px; font-size: .75rem; font-weight: 700; color: var(--color-primary); margin-bottom: var(--space-md); background: none; border: none; cursor: pointer; }
	.player-header { display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-md); }
	.player-avatar-lg { width: 56px; height: 56px; border-radius: var(--radius-full); overflow: hidden; background: var(--color-surface-elevated); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 2px solid var(--color-surface-elevated); }
	.avatar-lg { width: 100%; height: 100%; object-fit: cover; }
	.player-title { display: flex; flex-direction: column; gap: 2px; }
	.player-name { font-size: 1rem; font-weight: 800; color: var(--color-text); text-transform: uppercase; letter-spacing: .05em; margin: 0; }
	.stat-val.success { color: var(--color-success); }
	.stat-val.danger { color: var(--color-danger); }
	.dk-list { display: flex; flex-direction: column; gap: var(--space-xs); }
	.dk-row { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-sm) var(--space-md); background: var(--color-surface); border: 1px solid var(--color-surface-elevated); border-radius: var(--radius-md); font-size: .75rem; }
	.dk-n { flex: 1; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.dk-stat { font-weight: 600; min-width: 28px; text-align: right; }
	.dk-stat.w { color: var(--color-success); }
	.dk-stat.l { color: var(--color-danger); }
	.dk-stat.rate { color: var(--color-secondary); }
	.log-list { max-height: 360px; overflow: auto; display: flex; flex-direction: column; gap: var(--space-xs); }
	.log-row { display: grid; grid-template-columns: 72px 64px 1fr; gap: var(--space-sm); align-items: center; padding: var(--space-sm) var(--space-md); background: var(--color-surface); border: 1px solid var(--color-surface-elevated); border-radius: var(--radius-md); font-size: .72rem; }
	.lt { font-family: var(--font-mono); color: var(--color-text-muted); }
	.badge { font-size: .58rem; font-weight: 800; color: var(--color-secondary); }
	.badge-turn { color: var(--color-success); }
	.badge-life { color: #fff; }
	.gain { color: var(--color-success); }
	.loss { color: var(--color-danger); }
</style>

