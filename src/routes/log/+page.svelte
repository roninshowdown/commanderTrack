<script lang="ts">
	import { onMount } from 'svelte';
	import type { Player, Deck, GameRecord, LogEntry } from '$lib/models/types';
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
	let activeTab: 'match' | 'player' | 'global' = $state('match');
	let selectedGameId: string = $state('');
	let selectedPlayerId: string = $state('');
	let matchChartType: 'line' | 'bar' = $state('line');
	let matchDataType: 'life' | 'damage_dealt' | 'damage_taken' = $state('life');

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

	const CHART_COLORS = ['#e94560','#3742fa','#2ed573','#ffa502','#a55eea','#ff6348','#1e90ff','#ff7f50','#70a1ff','#ffc048'];

	function getMatchChartData() {
		const gameLogs: LogEntry[] = selectedGameId ? allLogs.filter((l: LogEntry) => l.gameId === selectedGameId) : [...$currentLogs];
		if (!gameLogs.length) return null;
		if (matchDataType !== 'life') {
			const agg: Record<string, number> = {};
			for (const l of gameLogs) {
				if (l.value >= 0) continue;
				const key = l.playerName;
				agg[key] = (agg[key] ?? 0) + Math.abs(l.value);
			}
			const sorted = Object.entries(agg).sort((a: [string, number], b: [string, number]) => b[1] - a[1]);
			return { labels: sorted.map(([n]: [string, number]) => n), datasets: [{ label: matchDataType === 'damage_dealt' ? 'Dealt' : 'Taken', data: sorted.map(([, v]: [string, number]) => v), backgroundColor: CHART_COLORS.slice(0, sorted.length) }] };
		}
		const maxLife = selectedGameId ? (allRecords.find((r: GameRecord) => r.id === selectedGameId)?.maxLife ?? 40) : ($gameState?.config.maxLife ?? 40);
		const playerMap: Record<string, number[]> = {};
		const sorted = [...gameLogs].sort((a: LogEntry, b: LogEntry) => a.timestamp - b.timestamp);
		const pNames = [...new Set(sorted.map((l: LogEntry) => l.playerName))];
		for (const n of pNames) playerMap[n] = [maxLife];
		for (const l of sorted) { const arr = playerMap[l.playerName]; arr.push((arr[arr.length - 1] ?? maxLife) + l.value); }
		const maxLen = Math.max(...Object.values(playerMap).map((a: number[]) => a.length));
		return { labels: Array.from({ length: maxLen }, (_: unknown, i: number) => String(i)), datasets: pNames.map((n: string, i: number) => ({ label: n, data: playerMap[n], borderColor: CHART_COLORS[i % CHART_COLORS.length], backgroundColor: CHART_COLORS[i % CHART_COLORS.length] + '33', tension: 0.3, fill: false })) };
	}

	function getPlayerStats() {
		if (!selectedPlayerId) return null;
		const games = allRecords.filter((r: GameRecord) => r.playerIds.includes(selectedPlayerId));
		const wins = games.filter((r: GameRecord) => r.winnerId === selectedPlayerId).length;
		const losses = games.filter((r: GameRecord) => r.winnerId && r.winnerId !== selectedPlayerId).length;
		const deckMap: Record<string, { name: string; played: number; won: number }> = {};
		for (const g of games) {
			const idx = g.playerIds.indexOf(selectedPlayerId);
			const did = g.deckIds[idx];
			if (!deckMap[did]) deckMap[did] = { name: getDeckName(did), played: 0, won: 0 };
			deckMap[did].played++;
			if (g.winnerId === selectedPlayerId) deckMap[did].won++;
		}
		return { totalGames: games.length, wins, losses, winRate: games.length ? Math.round((wins / games.length) * 1000) / 10 : 0, decksUsed: Object.values(deckMap) };
	}

	function getGlobalWinsChart() {
		if (!allRecords.length) return null;
		const m: Record<string, number> = {};
		for (const g of allRecords) if (g.winnerId) { const n = getPlayerName(g.winnerId); m[n] = (m[n] ?? 0) + 1; }
		const s = Object.entries(m).sort((a, b) => b[1] - a[1]);
		return { labels: s.map(([n]) => n), datasets: [{ label: 'Wins', data: s.map(([, v]) => v), backgroundColor: CHART_COLORS.slice(0, s.length) }] };
	}

	function getGlobalDeckChart() {
		if (!allRecords.length) return null;
		const m: Record<string, number> = {};
		for (const g of allRecords) for (const did of g.deckIds) { const n = getDeckName(did); m[n] = (m[n] ?? 0) + 1; }
		const s = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 10);
		return { labels: s.map(([n]) => n), datasets: [{ label: 'Games', data: s.map(([, v]) => v), backgroundColor: CHART_COLORS.slice(0, s.length) }] };
	}

	function getGlobalGamesPerPlayer() {
		if (!allRecords.length) return null;
		const m: Record<string, number> = {};
		for (const g of allRecords) for (const pid of g.playerIds) { const n = getPlayerName(pid); m[n] = (m[n] ?? 0) + 1; }
		const s = Object.entries(m).sort((a, b) => b[1] - a[1]);
		return { labels: s.map(([n]) => n), datasets: [{ label: 'Games Played', data: s.map(([, v]) => v), backgroundColor: CHART_COLORS.slice(0, s.length) }] };
	}

	let matchChartData = $derived(getMatchChartData());
	let playerStats = $derived(getPlayerStats());
	let globalWinsData = $derived(getGlobalWinsChart());
	let globalDeckData = $derived(getGlobalDeckChart());
	let globalGamesData = $derived(getGlobalGamesPerPlayer());
</script>

<div class="log-page">
	<h1>Analytics</h1><p class="sub">Game logs, charts & dashboards</p>

	<div class="tabs">
		<button class="tab" class:active={activeTab==='match'} onclick={()=>activeTab='match'}><Icon name="swords" size={14}/> Match</button>
		<button class="tab" class:active={activeTab==='player'} onclick={()=>activeTab='player'}><Icon name="user" size={14}/> Player</button>
		<button class="tab" class:active={activeTab==='global'} onclick={()=>activeTab='global'}><Icon name="globe" size={14}/> Global</button>
	</div>

	{#if loading}<div class="empty">Loading…</div>
	{:else if activeTab==='match'}
		<section>
			{#if allRecords.length}<div class="pick"><label for="gp">Select match:</label><select id="gp" bind:value={selectedGameId}><option value="">Current Game</option>{#each allRecords as r}<option value={r.id}>{new Date(r.createdAt).toLocaleDateString()} — {r.playerIds.map(getPlayerName).join(' vs ')}</option>{/each}</select></div>{/if}
			<div class="toggles">
				<div class="tg">{#each (['line','bar'] as const) as t}<button class:active={matchChartType===t} onclick={()=>matchChartType=t}>{t}</button>{/each}</div>
				<div class="tg">{#each (['life','damage_dealt','damage_taken'] as const) as t}<button class:active={matchDataType===t} onclick={()=>matchDataType=t}>{t.replace('_',' ')}</button>{/each}</div>
			</div>
			{#if matchChartData}<ChartWrapper type={matchChartType} data={matchChartData} height={220}/>{:else}<div class="empty">No data. Play a game!</div>{/if}
			<h2>Event Log</h2>
			{#if (selectedGameId ? allLogs.filter((l: LogEntry) => l.gameId === selectedGameId) : $currentLogs).length}
				{@const displayLogs = selectedGameId ? allLogs.filter((l: LogEntry) => l.gameId === selectedGameId) : $currentLogs}
				<div class="log-list">{#each displayLogs as e (e.id)}
					<div class="log-card"><div class="ll"><span class="lt">{formatTimestamp(e.timestamp)}</span><span class="ln">{e.playerName}</span></div>
					<div class="lr"><span class="badge" class:cmd={e.type==='commander_damage'} class:life={e.type==='life'}>{e.type==='commander_damage'?'CMD':'LIFE'}</span><span class="lv" class:gain={e.value>0} class:loss={e.value<0}>{e.value>0?'+':''}{e.value}</span></div></div>
				{/each}</div>
			{:else}<div class="empty">No log entries yet.</div>{/if}
		</section>

	{:else if activeTab==='player'}
		<section>
			<div class="pick"><label for="pp">Select player:</label><select id="pp" bind:value={selectedPlayerId}><option value="">Choose…</option>{#each players as p}<option value={p.id}>{p.name}</option>{/each}</select></div>
			{#if playerStats}
				<div class="stats">{#each [['Games',playerStats.totalGames,''],['Wins',playerStats.wins,'success'],['Losses',playerStats.losses,'danger'],['Win %',playerStats.winRate+' %','']] as [lbl,val,cls]}
					<div class="stat"><span class="sv {cls}">{val}</span><span class="sl">{lbl}</span></div>
				{/each}</div>
				{#if playerStats.decksUsed.length}
					<h3>Deck Breakdown</h3>
					<div class="dk-list">{#each playerStats.decksUsed as d}<div class="dk-row"><span class="dk-n">{d.name}</span><span>{d.played}g</span><span class="w">{d.won}W</span><span class="l">{d.played-d.won}L</span></div>{/each}</div>
				{/if}
			{:else}<div class="empty">Select a player.</div>{/if}
		</section>

	{:else}
		<section>
			{#if !allRecords.length}<div class="empty">No games yet.</div>
			{:else}
				<div class="stats"><div class="stat"><span class="sv">{allRecords.length}</span><span class="sl">Games</span></div><div class="stat"><span class="sv">{players.length}</span><span class="sl">Players</span></div><div class="stat"><span class="sv">{decks.length}</span><span class="sl">Decks</span></div></div>
				{#if globalWinsData}<h3><Icon name="trophy" size={16}/> Most Wins</h3><ChartWrapper type="bar" data={globalWinsData} height={200}/>{/if}
				{#if globalGamesData}<h3><Icon name="bar-chart" size={16}/> Games Per Player</h3><ChartWrapper type="bar" data={globalGamesData} height={200}/>{/if}
				{#if globalDeckData}<h3><Icon name="pie-chart" size={16}/> Deck Usage</h3><ChartWrapper type="doughnut" data={globalDeckData} height={220}/>{/if}
			{/if}
		</section>
	{/if}
</div>

<style>
	.log-page{padding-top:var(--space-md)}
	h1{font-size:1.4rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:var(--color-primary)}
	.sub{color:var(--color-text-muted);margin-top:var(--space-xs);margin-bottom:var(--space-md);font-size:.75rem}
	.empty{text-align:center;padding:var(--space-xl);color:var(--color-text-muted);font-size:.85rem}
	.tabs{display:flex;gap:2px;background:var(--color-surface);border:1px solid var(--color-surface-elevated);border-radius:var(--radius-lg);padding:3px;margin-bottom:var(--space-md)}
	.tab{flex:1;padding:var(--space-sm);border-radius:var(--radius-md);font-weight:700;font-size:.7rem;letter-spacing:.06em;text-transform:uppercase;transition:all var(--transition-fast);color:var(--color-text-muted);display:flex;align-items:center;justify-content:center;gap:4px;min-height:44px}
	.tab.active{background:var(--color-primary);color:white;box-shadow:var(--glow-primary)}
	section{margin-bottom:var(--space-xl)}
	h2{font-size:.75rem;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--color-secondary);margin:var(--space-md) 0 var(--space-sm)}
	h3{font-size:.75rem;font-weight:800;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.06em;margin:var(--space-md) 0 var(--space-sm);display:flex;align-items:center;gap:6px}
	.pick{margin-bottom:var(--space-md)}.pick label{display:block;font-size:.65rem;font-weight:700;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:var(--space-xs)}.pick select{width:100%;min-height:44px}
	.toggles{display:flex;gap:var(--space-md);margin-bottom:var(--space-md);flex-wrap:wrap}.tg{display:flex;gap:2px;background:var(--color-surface);border:1px solid var(--color-surface-elevated);border-radius:var(--radius-md);padding:2px}.tg button{padding:6px 10px;border-radius:var(--radius-sm);font-size:.65rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--color-text-muted);transition:all var(--transition-fast);min-height:36px}.tg button.active{background:var(--color-surface-elevated);color:var(--color-secondary);border:1px solid var(--neon-cyan)}
	.log-list{display:flex;flex-direction:column;gap:var(--space-sm);max-height:400px;overflow-y:auto}.log-card{display:flex;justify-content:space-between;align-items:center;padding:var(--space-sm) var(--space-md);background:var(--color-surface);border:1px solid var(--color-surface-elevated);border-radius:var(--radius-md)}
	.ll{display:flex;flex-direction:column;gap:2px}.lt{font-family:var(--font-mono);font-size:.6rem;color:var(--color-text-muted)}.ln{font-weight:700;font-size:.75rem}
	.lr{display:flex;align-items:center;gap:var(--space-sm)}.badge{padding:2px 8px;border-radius:var(--radius-full);font-size:.5rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase}.badge.life{background:var(--color-secondary-dim);color:var(--color-secondary);border:1px solid var(--neon-cyan)}.badge.cmd{background:var(--color-primary-dim);color:var(--color-primary);border:1px solid var(--neon-red)}
	.lv{font-weight:800;font-size:.85rem;font-variant-numeric:tabular-nums;font-family:var(--font-mono);min-width:36px;text-align:right}.lv.gain{color:var(--color-success)}.lv.loss{color:var(--color-danger)}
	.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(80px,1fr));gap:var(--space-sm);margin-bottom:var(--space-md)}.stat{display:flex;flex-direction:column;align-items:center;gap:2px;padding:var(--space-md) var(--space-sm);background:var(--color-surface);border:1px solid var(--color-surface-elevated);border-radius:var(--radius-lg)}.sv{font-size:1.5rem;font-weight:800;font-variant-numeric:tabular-nums;font-family:var(--font-mono);line-height:1}.sv.success{color:var(--color-success)}.sv.danger{color:var(--color-danger)}.sl{font-size:.55rem;font-weight:700;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.08em}
	.dk-list{display:flex;flex-direction:column;gap:var(--space-xs)}.dk-row{display:flex;align-items:center;gap:var(--space-sm);padding:var(--space-sm) var(--space-md);background:var(--color-surface);border:1px solid var(--color-surface-elevated);border-radius:var(--radius-md);font-size:.75rem}.dk-n{flex:1;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.w{color:var(--color-success);font-weight:700}.l{color:var(--color-danger);font-weight:700}
</style>






