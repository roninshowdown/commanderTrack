<script lang="ts">
	import { onMount } from 'svelte';
	import type { Player, Deck, GameRecord, LogEntry, RankEntry } from '$lib/models/types';
	import { getDataService } from '$lib/services/data-service';
	import { gameState, logEntries as currentLogs } from '$lib/stores/gameStore';
	import { currentZone } from '$lib/stores/zoneStore';
	import { getPlayersInZone, getDecksInZone } from '$lib/stores/zoneStore';
	import { formatTimestamp } from '$lib/utils/format';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ChartWrapper from '$lib/components/ui/ChartWrapper.svelte';

	let zone = $derived($currentZone);
	let players: Player[] = $state([]);
	let decks: Deck[] = $state([]);
	let allRecords: GameRecord[] = $state([]);
	let allLogs: LogEntry[] = $state([]);
	let loading: boolean = $state(true);

	/* ── Tab state ── */
	let activeTab: 'dashboard' | 'players' | 'commanders' | 'matches' = $state('dashboard');

	/* ── Matches tab ── */
	let selectedGameId: string = $state('');
	let matchChartType: 'line' | 'bar' = $state('line');
	let matchDataType: 'life' | 'damage_dealt' | 'damage_taken' | 'time_consumed' = $state('life');

	/* ── Players tab ── */
	let playerFilter: string = $state('');
	let playerSortBy: 'won' | 'played' | 'rate' = $state('won');

	/* ── Commanders tab ── */
	let commanderSortBy: 'won' | 'played' | 'rate' = $state('won');

	onMount(async () => {
		if (!zone) { loading = false; return; }
		try {
			const ds = await getDataService();
			[players, decks, allRecords, allLogs] = await Promise.all([
				getPlayersInZone(zone.id),
				getDecksInZone(zone.id),
				ds.getGameRecordsForZone(zone.id),
				ds.getLogEntriesForZone(zone.id)
			]);
		} catch (e) { console.warn('Analytics load error', e); }
		loading = false;
	});

	function getPlayerName(id: string): string { return players.find((p: Player) => p.id === id)?.name ?? '?'; }
	function getDeckName(id: string): string { return decks.find((d: Deck) => d.id === id)?.commanderName ?? '?'; }
	function getPlayerImage(id: string): string | undefined { return players.find((p: Player) => p.id === id)?.imageUrl; }

	const CHART_COLORS = ['#e94560','#3742fa','#2ed573','#ffa502','#a55eea','#ff6348','#1e90ff','#ff7f50','#70a1ff','#ffc048'];
	const MTG_COLORS: Record<string, string> = { white: '#F9FAF4', blue: '#0E68AB', black: '#150B00', red: '#D3202A', green: '#00733E' };

	/* ══════════════════════════════════════════════
	   DASHBOARD — zone-wide summary
	   ══════════════════════════════════════════════ */

	function getAvgDurationMin(): string {
		const finished = allRecords.filter(r => r.finishedAt && r.createdAt);
		if (!finished.length) return '—';
		const totalMs = finished.reduce((s, r) => s + ((r.finishedAt ?? 0) - r.createdAt), 0);
		const avg = totalMs / finished.length / 60000;
		return avg < 1 ? '<1' : Math.round(avg).toString();
	}

	function getRecentGames(limit = 8): GameRecord[] {
		return [...allRecords].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
	}

	function getWinLeaderboard() {
		if (!allRecords.length) return null;
		const m: Record<string, number> = {};
		for (const g of allRecords) if (g.winnerId) { const n = getPlayerName(g.winnerId); m[n] = (m[n] ?? 0) + 1; }
		const s = Object.entries(m).sort((a, b) => b[1] - a[1]);
		return { labels: s.map(([n]) => n), datasets: [{ label: 'Wins', data: s.map(([, v]) => v), backgroundColor: CHART_COLORS.slice(0, s.length) }] };
	}

	function getColorDistribution() {
		if (!allRecords.length || !decks.length) return null;
		const colorCounts: Record<string, number> = { white: 0, blue: 0, black: 0, red: 0, green: 0 };
		for (const g of allRecords) {
			for (const did of g.deckIds) {
				const deck = decks.find(d => d.id === did);
				if (deck) for (const c of deck.colors) colorCounts[c]++;
			}
		}
		const labels = Object.keys(colorCounts).map(c => c.charAt(0).toUpperCase() + c.slice(1));
		return {
			labels,
			datasets: [{
				label: 'Color Appearances',
				data: Object.values(colorCounts),
				backgroundColor: Object.keys(colorCounts).map(c => MTG_COLORS[c]),
				borderColor: Object.keys(colorCounts).map(() => 'rgba(255,255,255,0.2)'),
				borderWidth: 1
			}]
		};
	}

	function getGamesOverTime() {
		if (allRecords.length < 2) return null;
		const sorted = [...allRecords].sort((a, b) => a.createdAt - b.createdAt);
		const byMonth: Record<string, number> = {};
		for (const g of sorted) {
			const d = new Date(g.createdAt);
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
			byMonth[key] = (byMonth[key] ?? 0) + 1;
		}
		const labels = Object.keys(byMonth);
		return {
			labels,
			datasets: [{
				label: 'Games',
				data: Object.values(byMonth),
				borderColor: '#e94560',
				backgroundColor: '#e9456033',
				fill: true,
				tension: 0.3
			}]
		};
	}

	/* ══════════════════════════════════════════════
	   PLAYERS TAB
	   ══════════════════════════════════════════════ */

	function calcPlayerRanks(): RankEntry[] {
		return players.map((p) => {
			const games = allRecords.filter((r) => r.playerIds.includes(p.id));
			const wins = games.filter((r) => r.winnerId === p.id).length;
			const losses = games.filter((r) => r.winnerId && r.winnerId !== p.id).length;
			return { playerId: p.id, playerName: p.name, gamesPlayed: games.length, gamesWon: wins, gamesLost: losses, winRate: games.length ? Math.round((wins / games.length) * 1000) / 10 : 0 };
		}).sort((a, b) => {
			if (playerSortBy === 'won') return b.gamesWon - a.gamesWon;
			if (playerSortBy === 'played') return b.gamesPlayed - a.gamesPlayed;
			return b.winRate - a.winRate;
		});
	}

	function getPlayerStats(playerId: string) {
		const games = allRecords.filter((r: GameRecord) => r.playerIds.includes(playerId));
		const wins = games.filter((r: GameRecord) => r.winnerId === playerId).length;
		const losses = games.filter((r: GameRecord) => r.winnerId && r.winnerId !== playerId).length;
		const draws = games.length - wins - losses;

		const deckMap: Record<string, { name: string; played: number; won: number }> = {};
		for (const g of games) {
			const idx = g.playerIds.indexOf(playerId);
			const did = g.deckIds[idx];
			if (!deckMap[did]) deckMap[did] = { name: getDeckName(did), played: 0, won: 0 };
			deckMap[did].played++;
			if (g.winnerId === playerId) deckMap[did].won++;
		}

		// Nemesis & prey
		const beatBy: Record<string, number> = {};
		const beatThem: Record<string, number> = {};
		for (const g of games) {
			if (!g.winnerId) continue;
			if (g.winnerId !== playerId) {
				const n = getPlayerName(g.winnerId);
				beatBy[n] = (beatBy[n] ?? 0) + 1;
			} else {
				for (const pid of g.playerIds) {
					if (pid !== playerId) {
						const n = getPlayerName(pid);
						beatThem[n] = (beatThem[n] ?? 0) + 1;
					}
				}
			}
		}
		const nemesis = Object.entries(beatBy).sort(([,a],[,b]) => b-a)[0];
		const prey = Object.entries(beatThem).sort(([,a],[,b]) => b-a)[0];

		// Win streak
		const sortedGames = [...games].sort((a,b) => b.createdAt - a.createdAt);
		let bestStreak = 0;
		let streak = 0;
		for (const g of sortedGames) {
			if (g.winnerId === playerId) { streak++; bestStreak = Math.max(bestStreak, streak); }
			else streak = 0;
		}
		let currentStreak = 0;
		for (const g of sortedGames) {
			if (g.winnerId === playerId) currentStreak++;
			else break;
		}

		// Average time consumed
		let avgTimeConsumed: number | null = null;
		const timedGames = games.filter(g => g.playerTimeConsumed);
		if (timedGames.length) {
			let total = 0;
			for (const g of timedGames) {
				const idx = g.playerIds.indexOf(playerId);
				if (g.playerTimeConsumed && g.playerTimeConsumed[idx] !== undefined) {
					total += g.playerTimeConsumed[idx];
				}
			}
			avgTimeConsumed = Math.round(total / timedGames.length);
		}

		return {
			totalGames: games.length, wins, losses, draws,
			winRate: games.length ? Math.round((wins / games.length) * 1000) / 10 : 0,
			decksUsed: Object.values(deckMap),
			nemesis: nemesis ? { name: nemesis[0], count: nemesis[1] } : null,
			prey: prey ? { name: prey[0], count: prey[1] } : null,
			currentStreak,
			bestStreak,
			avgTimeConsumed
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
				{ label: 'Played', data: decksUsed.map((d) => d.played), backgroundColor: '#3742fa' },
				{ label: 'Won', data: decksUsed.map((d) => d.won), backgroundColor: '#2ed573' }
			]
		};
	}

	/* ══════════════════════════════════════════════
	   COMMANDERS TAB
	   ══════════════════════════════════════════════ */

	function calcDeckRanks(): (RankEntry & { deckColors?: string[] })[] {
		return decks.map((d) => {
			const games = allRecords.filter((r) => r.deckIds.includes(d.id));
			const wins = games.filter((r) => { const idx = r.deckIds.indexOf(d.id); return r.winnerId && r.playerIds[idx] === r.winnerId; }).length;
			const losses = games.filter((r) => { const idx = r.deckIds.indexOf(d.id); return r.winnerId && r.playerIds[idx] !== r.winnerId; }).length;
			return {
				playerId: d.playerId,
				playerName: players.find((p) => p.id === d.playerId)?.name ?? '?',
				deckId: d.id,
				commanderName: d.commanderName,
				gamesPlayed: games.length,
				gamesWon: wins,
				gamesLost: losses,
				winRate: games.length ? Math.round((wins / games.length) * 1000) / 10 : 0,
				deckColors: d.colors
			};
		}).sort((a, b) => {
			if (commanderSortBy === 'won') return b.gamesWon - a.gamesWon;
			if (commanderSortBy === 'played') return b.gamesPlayed - a.gamesPlayed;
			return b.winRate - a.winRate;
		});
	}

	function getDeckUsageChart() {
		if (!allRecords.length) return null;
		const m: Record<string, number> = {};
		for (const g of allRecords) for (const did of g.deckIds) { const n = getDeckName(did); m[n] = (m[n] ?? 0) + 1; }
		const s = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 10);
		return { labels: s.map(([n]) => n), datasets: [{ label: 'Games', data: s.map(([, v]) => v), backgroundColor: CHART_COLORS.slice(0, s.length) }] };
	}

	/* ══════════════════════════════════════════════
	   MATCHES TAB — per-game analytics
	   ══════════════════════════════════════════════ */

	function getMatchChartData() {
		const gameLogs: LogEntry[] = selectedGameId
			? allLogs.filter((l: LogEntry) => l.gameId === selectedGameId)
			: [...$currentLogs];

		if (matchDataType === 'time_consumed') {
			return getTimeConsumedChart();
		}

		if (!gameLogs.length) return null;

		if (matchDataType !== 'life') {
			const agg: Record<string, number> = {};
			for (const l of gameLogs) {
				if (l.value >= 0) continue;
				const key = matchDataType === 'damage_dealt' ? (l.sourcePlayerId ? getPlayerName(l.sourcePlayerId) : l.playerName) : l.playerName;
				agg[key] = (agg[key] ?? 0) + Math.abs(l.value);
			}
			const sorted = Object.entries(agg).sort((a, b) => b[1] - a[1]);
			return {
				labels: sorted.map(([n]) => n),
				datasets: [{ label: matchDataType === 'damage_dealt' ? 'Dealt' : 'Taken', data: sorted.map(([, v]) => v), backgroundColor: CHART_COLORS.slice(0, sorted.length) }]
			};
		}

		const maxLife = selectedGameId
			? (allRecords.find((r: GameRecord) => r.id === selectedGameId)?.maxLife ?? 40)
			: ($gameState?.config.maxLife ?? 40);
		const playerMap: Record<string, number[]> = {};
		const sorted = [...gameLogs].sort((a: LogEntry, b: LogEntry) => a.timestamp - b.timestamp);
		const pNames = [...new Set(sorted.map((l: LogEntry) => l.playerName))];
		for (const n of pNames) playerMap[n] = [maxLife];
		for (const l of sorted) {
			const arr = playerMap[l.playerName];
			arr.push((arr[arr.length - 1] ?? maxLife) + l.value);
		}
		const maxLen = Math.max(...Object.values(playerMap).map((a: number[]) => a.length));
		return {
			labels: Array.from({ length: maxLen }, (_: unknown, i: number) => String(i)),
			datasets: pNames.map((n: string, i: number) => ({
				label: n, data: playerMap[n],
				borderColor: CHART_COLORS[i % CHART_COLORS.length],
				backgroundColor: CHART_COLORS[i % CHART_COLORS.length] + '33',
				tension: 0.3, fill: false
			}))
		};
	}

	function getTimeConsumedChart() {
		// For selected historical game
		if (selectedGameId) {
			const record = allRecords.find(r => r.id === selectedGameId);
			if (!record?.playerTimeConsumed) return null;
			return {
				labels: record.playerIds.map(id => getPlayerName(id)),
				datasets: [{
					label: 'Time Consumed (s)',
					data: record.playerTimeConsumed,
					backgroundColor: CHART_COLORS.slice(0, record.playerIds.length)
				}]
			};
		}
		// For current game
		const state = $gameState;
		if (!state || state.config.timerConfig.variant === 'none') return null;
		const tc = state.config.timerConfig;
		return {
			labels: state.players.map(p => p.playerName),
			datasets: [{
				label: 'Time Consumed (s)',
				data: state.players.map(p => tc.poolTimeSeconds - p.poolTimeRemaining),
				backgroundColor: CHART_COLORS.slice(0, state.players.length)
			}]
		};
	}

	function formatDuration(seconds: number): string {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return `${m}:${String(s).padStart(2, '0')}`;
	}

	function formatGameDate(ts: number): string {
		const d = new Date(ts);
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function getGameDuration(r: GameRecord): string {
		if (!r.finishedAt) return '—';
		const mins = Math.round((r.finishedAt - r.createdAt) / 60000);
		return mins < 1 ? '<1 min' : `${mins} min`;
	}

	/* ── Derived ── */
	let matchChartData = $derived(getMatchChartData());
	let selectedPlayerStats = $derived(playerFilter ? getPlayerStats(playerFilter) : null);
	let playerDoughnutData = $derived(selectedPlayerStats ? getPlayerDoughnutData(selectedPlayerStats) : null);
	let playerDeckChartData = $derived(selectedPlayerStats ? getPlayerDeckChart(selectedPlayerStats.decksUsed) : null);
	let winLeaderboard = $derived(getWinLeaderboard());
	let colorDist = $derived(getColorDistribution());
	let gamesOverTime = $derived(getGamesOverTime());
	let deckUsageChart = $derived(getDeckUsageChart());
	let playerRanks = $derived(calcPlayerRanks());
	let deckRanks = $derived(calcDeckRanks());
	let recentGames = $derived(getRecentGames());
	let displayLogs = $derived(selectedGameId ? allLogs.filter((l: LogEntry) => l.gameId === selectedGameId) : $currentLogs);
</script>

<div class="log-page">
	<h1>Analytics</h1>
	<p class="sub">{zone?.name ?? 'Commander Zone'}</p>

	<div class="tabs">
		<button class="tab" class:active={activeTab==='dashboard'} onclick={()=>activeTab='dashboard'}>
			<Icon name="chart" size={14}/> Dashboard
		</button>
		<button class="tab" class:active={activeTab==='players'} onclick={()=>activeTab='players'}>
			<Icon name="user" size={14}/> Players
		</button>
		<button class="tab" class:active={activeTab==='commanders'} onclick={()=>activeTab='commanders'}>
			<Icon name="deck" size={14}/> Commanders
		</button>
		<button class="tab" class:active={activeTab==='matches'} onclick={()=>activeTab='matches'}>
			<Icon name="swords" size={14}/> Matches
		</button>
	</div>

	{#if loading}
		<div class="empty">Loading…</div>
	{:else if !zone}
		<div class="empty">No Commander Zone selected.</div>

	{:else if activeTab==='dashboard'}
		<!-- ══════════════════════════════ DASHBOARD ══════════════════════════════ -->
		{#if !allRecords.length}
			<div class="empty">No games yet. Start playing to see stats!</div>
		{:else}
			<div class="stats-strip">
				<div class="stat-card">
					<span class="stat-val">{allRecords.length}</span>
					<span class="stat-lbl">Games</span>
				</div>
				<div class="stat-card">
					<span class="stat-val">{players.length}</span>
					<span class="stat-lbl">Players</span>
				</div>
				<div class="stat-card">
					<span class="stat-val">{decks.length}</span>
					<span class="stat-lbl">Commanders</span>
				</div>
				<div class="stat-card">
					<span class="stat-val">{getAvgDurationMin()}</span>
					<span class="stat-lbl">Avg Min</span>
				</div>
			</div>

			{#if winLeaderboard}
				<div class="chart-section">
					<h3><Icon name="trophy" size={16}/> Win Leaderboard</h3>
					<ChartWrapper type="bar" data={winLeaderboard} height={200}/>
				</div>
			{/if}

			{#if gamesOverTime}
				<div class="chart-section">
					<h3><Icon name="line-chart" size={16}/> Activity</h3>
					<ChartWrapper type="line" data={gamesOverTime} height={180}/>
				</div>
			{/if}

			{#if colorDist}
				<div class="chart-section">
					<h3><Icon name="pie-chart" size={16}/> Color Distribution</h3>
					<ChartWrapper type="doughnut" data={colorDist} height={200}/>
				</div>
			{/if}

			<!-- Recent Games -->
			<div class="section">
				<h3><Icon name="swords" size={16}/> Recent Games</h3>
				<div class="game-list">
					{#each recentGames as g (g.id)}
						<div class="game-row">
							<div class="game-date">{formatGameDate(g.createdAt)}</div>
							<div class="game-players">
								{#each g.playerIds as pid, i}
									<span class="game-player" class:winner={pid === g.winnerId}>
										{#if pid === g.winnerId}<Icon name="crown" size={10} color="var(--color-warning)"/>{/if}
										{getPlayerName(pid)}
									</span>
									{#if i < g.playerIds.length - 1}<span class="vs">vs</span>{/if}
								{/each}
							</div>
							<span class="game-dur">{getGameDuration(g)}</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

	{:else if activeTab==='players'}
		<!-- ══════════════════════════════ PLAYERS ══════════════════════════════ -->
		<div class="pick">
			<label for="pf">Player:</label>
			<select id="pf" bind:value={playerFilter}>
				<option value="">All Players</option>
				{#each players as p}<option value={p.id}>{p.name}</option>{/each}
			</select>
		</div>

		{#if !playerFilter}
			<!-- All players ranking -->
			<div class="sort-row">
				<span>Sort:</span>
				{#each (['won','played','rate'] as const) as s}
					<button class:active={playerSortBy===s} onclick={()=>playerSortBy=s}>{s === 'rate' ? 'win %' : s}</button>
				{/each}
			</div>

			{#if !playerRanks.length}
				<div class="empty">No players yet.</div>
			{:else}
				<div class="rank-list">
					{#each playerRanks as r, i (r.playerId)}
						<button class="rank-card" onclick={() => playerFilter = r.playerId}>
							<span class="rank-pos">{#if i===0}<Icon name="crown" size={18} color="var(--color-warning)"/>{:else}#{i+1}{/if}</span>
							<div class="rank-avatar">
								{#if getPlayerImage(r.playerId)}
									<img src={getPlayerImage(r.playerId)} alt="" class="rank-img"/>
								{:else}
									<Icon name="user" size={16} color="var(--color-text-muted)"/>
								{/if}
							</div>
							<div class="rank-info">
								<strong>{r.playerName}</strong>
								<span class="rank-meta">{r.gamesPlayed} games · {r.gamesWon}W / {r.gamesLost}L</span>
							</div>
							<div class="rank-rate">
								<span class="rate-val">{r.winRate}%</span>
								<span class="rate-lbl">Win Rate</span>
							</div>
						</button>
					{/each}
				</div>
			{/if}

		{:else if selectedPlayerStats}
			<!-- Individual player stats -->
			<button class="back-link" onclick={() => playerFilter = ''}>
				<Icon name="back" size={14}/> All Players
			</button>

			<div class="player-header">
				<div class="player-avatar-lg">
					{#if getPlayerImage(playerFilter)}
						<img src={getPlayerImage(playerFilter)} alt="" class="avatar-lg"/>
					{:else}
						<Icon name="user" size={32} color="var(--color-text-muted)"/>
					{/if}
				</div>
				<div class="player-title">
					<h2 class="player-name">{getPlayerName(playerFilter)}</h2>
					{#if selectedPlayerStats.currentStreak > 0}
						<span class="streak-badge">🔥 {selectedPlayerStats.currentStreak} streak</span>
					{/if}
				</div>
			</div>

			<div class="stats-strip">
				<div class="stat-card"><span class="stat-val">{selectedPlayerStats.totalGames}</span><span class="stat-lbl">Games</span></div>
				<div class="stat-card"><span class="stat-val success">{selectedPlayerStats.wins}</span><span class="stat-lbl">Wins</span></div>
				<div class="stat-card"><span class="stat-val danger">{selectedPlayerStats.losses}</span><span class="stat-lbl">Losses</span></div>
				<div class="stat-card"><span class="stat-val">{selectedPlayerStats.winRate}%</span><span class="stat-lbl">Win Rate</span></div>
			</div>

			<!-- Extra stats row -->
			<div class="stats-strip sm">
				{#if selectedPlayerStats.bestStreak > 0}
					<div class="stat-card"><span class="stat-val">{selectedPlayerStats.bestStreak}</span><span class="stat-lbl">Best Streak</span></div>
				{/if}
				{#if selectedPlayerStats.avgTimeConsumed !== null}
					<div class="stat-card"><span class="stat-val">{formatDuration(selectedPlayerStats.avgTimeConsumed)}</span><span class="stat-lbl">Avg Time</span></div>
				{/if}
				{#if selectedPlayerStats.nemesis}
					<div class="stat-card nemesis"><span class="stat-val">💀</span><span class="stat-lbl">Nemesis: {selectedPlayerStats.nemesis.name} ({selectedPlayerStats.nemesis.count})</span></div>
				{/if}
				{#if selectedPlayerStats.prey}
					<div class="stat-card prey"><span class="stat-val">🎯</span><span class="stat-lbl">Prey: {selectedPlayerStats.prey.name} ({selectedPlayerStats.prey.count})</span></div>
				{/if}
			</div>

			{#if playerDoughnutData}
				<div class="chart-section">
					<h3><Icon name="pie-chart" size={16}/> Win / Loss / Draw</h3>
					<ChartWrapper type="doughnut" data={playerDoughnutData} height={200}/>
				</div>
			{/if}

			{#if playerDeckChartData}
				<div class="chart-section">
					<h3><Icon name="bar-chart" size={16}/> Deck Performance</h3>
					<ChartWrapper type="bar" data={playerDeckChartData} height={200}/>
				</div>
			{/if}

			{#if selectedPlayerStats.decksUsed.length}
				<div class="section">
					<h3><Icon name="deck" size={16}/> Deck Breakdown</h3>
					<div class="dk-list">
						{#each selectedPlayerStats.decksUsed as d}
							<div class="dk-row">
								<span class="dk-n">{d.name}</span>
								<span class="dk-stat">{d.played}G</span>
								<span class="dk-stat w">{d.won}W</span>
								<span class="dk-stat l">{d.played - d.won}L</span>
								<span class="dk-stat rate">{d.played ? Math.round(d.won / d.played * 100) : 0}%</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/if}

	{:else if activeTab==='commanders'}
		<!-- ══════════════════════════════ COMMANDERS ══════════════════════════════ -->
		{#if !deckRanks.length}
			<div class="empty">No commanders registered yet.</div>
		{:else}
			<div class="sort-row">
				<span>Sort:</span>
				{#each (['won','played','rate'] as const) as s}
					<button class:active={commanderSortBy===s} onclick={()=>commanderSortBy=s}>{s === 'rate' ? 'win %' : s}</button>
				{/each}
			</div>

			{#if deckUsageChart}
				<div class="chart-section">
					<h3><Icon name="pie-chart" size={16}/> Most Played Commanders</h3>
					<ChartWrapper type="doughnut" data={deckUsageChart} height={220}/>
				</div>
			{/if}

			<div class="rank-list">
				{#each deckRanks as r, i (r.deckId)}
					<div class="rank-card commander-card">
						<span class="rank-pos">{#if i===0}<Icon name="crown" size={18} color="var(--color-warning)"/>{:else}#{i+1}{/if}</span>
						<div class="commander-info">
							<strong>{r.commanderName}</strong>
							<span class="rank-meta">{r.playerName} · {r.gamesPlayed} games</span>
						</div>
						<div class="commander-stats">
							<span class="w">{r.gamesWon}W</span>
							<span class="l">{r.gamesLost}L</span>
							<span class="rate-badge">{r.winRate}%</span>
						</div>
					</div>
				{/each}
			</div>
		{/if}

	{:else if activeTab==='matches'}
		<!-- ══════════════════════════════ MATCHES ══════════════════════════════ -->
		<section>
			<div class="pick">
				<label for="gp">Select match:</label>
				<select id="gp" bind:value={selectedGameId}>
					<option value="">Current Game</option>
					{#each allRecords as r}
						<option value={r.id}>{formatGameDate(r.createdAt)} — {r.playerIds.map(getPlayerName).join(' vs ')}</option>
					{/each}
				</select>
			</div>

			<div class="toggles">
				{#if matchDataType === 'life'}
					<div class="tg">
						{#each (['line','bar'] as const) as t}
							<button class:active={matchChartType===t} onclick={()=>matchChartType=t}>{t}</button>
						{/each}
					</div>
				{/if}
				<div class="tg">
					{#each (['life','damage_dealt','damage_taken','time_consumed'] as const) as t}
						<button class:active={matchDataType===t} onclick={()=>matchDataType=t}>{t.replace(/_/g,' ')}</button>
					{/each}
				</div>
			</div>

			{#if matchChartData}
				<ChartWrapper type={matchDataType === 'life' ? matchChartType : 'bar'} data={matchChartData} height={220}/>
			{:else}
				<div class="empty">{matchDataType === 'time_consumed' ? 'No time data for this game.' : 'No data. Play a game!'}</div>
			{/if}

			<h2>Event Log</h2>
			{#if displayLogs.length}
				<div class="log-list">
					{#each displayLogs as e (e.id)}
						<div class="log-card">
							<div class="ll"><span class="lt">{formatTimestamp(e.timestamp)}</span><span class="ln">{e.playerName}</span></div>
							<div class="lr">
								<span class="badge" class:cmd={e.type==='commander_damage'} class:life={e.type==='life'}>
									{e.type==='commander_damage'?'CMD':'LIFE'}
								</span>
								<span class="lv" class:gain={e.value>0} class:loss={e.value<0}>{e.value>0?'+':''}{e.value}</span>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="empty">No log entries yet.</div>
			{/if}
		</section>
	{/if}
</div>

<style>
	.log-page { padding-top: var(--space-md); }
	h1 { font-size: 1.4rem; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; color: var(--color-primary); }
	.sub { color: var(--color-text-muted); margin-top: var(--space-xs); margin-bottom: var(--space-md); font-size: .75rem; }
	.empty { text-align: center; padding: var(--space-xl); color: var(--color-text-muted); font-size: .85rem; }

	/* ── Tabs ── */
	.tabs { display: flex; gap: 2px; background: var(--color-surface); border: 1px solid var(--color-surface-elevated); border-radius: var(--radius-lg); padding: 3px; margin-bottom: var(--space-md); }
	.tab { flex: 1; padding: var(--space-sm); border-radius: var(--radius-md); font-weight: 700; font-size: .6rem; letter-spacing: .04em; text-transform: uppercase; transition: all var(--transition-fast); color: var(--color-text-muted); display: flex; align-items: center; justify-content: center; gap: 3px; min-height: 44px; }
	.tab.active { background: var(--color-primary); color: white; box-shadow: var(--glow-primary); }

	/* ── Stats strip ── */
	.stats-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(75px, 1fr)); gap: var(--space-sm); margin-bottom: var(--space-md); }
	.stats-strip.sm { grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); }
	.stat-card { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: var(--space-md) var(--space-sm); background: var(--color-surface); border: 1px solid var(--color-surface-elevated); border-radius: var(--radius-lg); text-align: center; }
	.stat-val { font-size: 1.4rem; font-weight: 800; font-variant-numeric: tabular-nums; font-family: var(--font-mono); line-height: 1; }
	.stat-val.success { color: var(--color-success); }
	.stat-val.danger { color: var(--color-danger); }
	.stat-lbl { font-size: .5rem; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: .06em; }
	.stat-card.nemesis { border-color: rgba(233,69,96,.3); }
	.stat-card.prey { border-color: rgba(46,213,115,.3); }

	/* ── Chart section ── */
	.chart-section { margin-bottom: var(--space-lg); }
	.section { margin-bottom: var(--space-lg); }
	h2 { font-size: .75rem; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; color: var(--color-secondary); margin: var(--space-md) 0 var(--space-sm); }
	h3 { font-size: .7rem; font-weight: 800; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: .06em; margin-bottom: var(--space-sm); display: flex; align-items: center; gap: 6px; }

	/* ── Picker ── */
	.pick { margin-bottom: var(--space-md); }
	.pick label { display: block; font-size: .65rem; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: .06em; margin-bottom: var(--space-xs); }
	.pick select { width: 100%; min-height: 44px; }

	/* ── Sort row ── */
	.sort-row { display: flex; align-items: center; gap: var(--space-sm); margin-bottom: var(--space-md); }
	.sort-row span { font-size: .7rem; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: .06em; }
	.sort-row button { padding: 4px 10px; border-radius: var(--radius-md); font-size: .7rem; font-weight: 700; color: var(--color-text-muted); transition: all var(--transition-fast); border: 1px solid var(--color-surface-elevated); }
	.sort-row button.active { color: var(--color-secondary); border-color: var(--neon-cyan); background: var(--color-secondary-dim); }

	/* ── Player ranking list ── */
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

	/* ── Player detail header ── */
	.back-link { display: flex; align-items: center; gap: 4px; font-size: .75rem; font-weight: 700; color: var(--color-primary); margin-bottom: var(--space-md); background: none; border: none; cursor: pointer; }
	.player-header { display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-md); }
	.player-avatar-lg { width: 56px; height: 56px; border-radius: var(--radius-full); overflow: hidden; background: var(--color-surface-elevated); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 2px solid var(--color-surface-elevated); }
	.avatar-lg { width: 100%; height: 100%; object-fit: cover; }
	.player-title { display: flex; flex-direction: column; gap: 2px; }
	.player-name { font-size: 1rem; font-weight: 800; color: var(--color-text); text-transform: uppercase; letter-spacing: .05em; margin: 0; }
	.streak-badge { display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; border-radius: var(--radius-full); background: rgba(255,171,0,.12); color: var(--color-warning); font-size: .6rem; font-weight: 800; letter-spacing: .04em; }

	/* ── Commander ranking ── */
	.commander-card { cursor: default; }
	.commander-card:hover { transform: none; }
	.commander-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
	.commander-info strong { font-weight: 700; font-size: .8rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.commander-stats { display: flex; align-items: center; gap: var(--space-sm); flex-shrink: 0; font-size: .7rem; font-weight: 700; }
	.commander-stats .w { color: var(--color-success); }
	.commander-stats .l { color: var(--color-danger); }
	.rate-badge { padding: 2px 8px; border-radius: var(--radius-full); background: var(--color-secondary-dim); color: var(--color-secondary); font-size: .65rem; font-weight: 800; border: 1px solid var(--neon-cyan); }

	/* ── Recent games ── */
	.game-list { display: flex; flex-direction: column; gap: var(--space-xs); }
	.game-row { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-sm) var(--space-md); background: var(--color-surface); border: 1px solid var(--color-surface-elevated); border-radius: var(--radius-md); font-size: .75rem; }
	.game-date { font-size: .6rem; color: var(--color-text-muted); font-weight: 600; white-space: nowrap; flex-shrink: 0; min-width: 65px; }
	.game-players { flex: 1; display: flex; flex-wrap: wrap; gap: 2px; align-items: center; }
	.game-player { font-weight: 600; }
	.game-player.winner { color: var(--color-warning); font-weight: 800; }
	.vs { font-size: .5rem; color: var(--color-text-muted); font-weight: 700; margin: 0 2px; }
	.game-dur { font-size: .6rem; color: var(--color-text-muted); white-space: nowrap; flex-shrink: 0; }

	/* ── Deck breakdown ── */
	.dk-list { display: flex; flex-direction: column; gap: var(--space-xs); }
	.dk-row { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-sm) var(--space-md); background: var(--color-surface); border: 1px solid var(--color-surface-elevated); border-radius: var(--radius-md); font-size: .75rem; }
	.dk-n { flex: 1; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.dk-stat { font-weight: 600; min-width: 28px; text-align: right; }
	.dk-stat.w { color: var(--color-success); }
	.dk-stat.l { color: var(--color-danger); }
	.dk-stat.rate { color: var(--color-secondary); }

	/* ── Toggles ── */
	.toggles { display: flex; gap: var(--space-md); margin-bottom: var(--space-md); flex-wrap: wrap; }
	.tg { display: flex; gap: 2px; background: var(--color-surface); border: 1px solid var(--color-surface-elevated); border-radius: var(--radius-md); padding: 2px; }
	.tg button { padding: 6px 8px; border-radius: var(--radius-sm); font-size: .6rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--color-text-muted); transition: all var(--transition-fast); min-height: 36px; }
	.tg button.active { background: var(--color-surface-elevated); color: var(--color-secondary); border: 1px solid var(--neon-cyan); }

	/* ── Event log ── */
	.log-list { display: flex; flex-direction: column; gap: var(--space-sm); max-height: 400px; overflow-y: auto; }
	.log-card { display: flex; justify-content: space-between; align-items: center; padding: var(--space-sm) var(--space-md); background: var(--color-surface); border: 1px solid var(--color-surface-elevated); border-radius: var(--radius-md); }
	.ll { display: flex; flex-direction: column; gap: 2px; }
	.lt { font-family: var(--font-mono); font-size: .6rem; color: var(--color-text-muted); }
	.ln { font-weight: 700; font-size: .75rem; }
	.lr { display: flex; align-items: center; gap: var(--space-sm); }
	.badge { padding: 2px 8px; border-radius: var(--radius-full); font-size: .5rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
	.badge.life { background: var(--color-secondary-dim); color: var(--color-secondary); border: 1px solid var(--neon-cyan); }
	.badge.cmd { background: var(--color-primary-dim); color: var(--color-primary); border: 1px solid var(--neon-red); }
	.lv { font-weight: 800; font-size: .85rem; font-variant-numeric: tabular-nums; font-family: var(--font-mono); min-width: 36px; text-align: right; }
	.lv.gain { color: var(--color-success); }
	.lv.loss { color: var(--color-danger); }
</style>

