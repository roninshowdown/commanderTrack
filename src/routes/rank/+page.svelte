<script lang="ts">
	import { onMount } from 'svelte';
	import type { Player, Deck, GameRecord, RankEntry } from '$lib/models/types';
	import { getDataService } from '$lib/services/data-service';
	import { currentZone } from '$lib/stores/zoneStore';
	import { getPlayersInZone, getDecksInZone } from '$lib/stores/zoneStore';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ColorPip from '$lib/components/ui/ColorPip.svelte';

	let zone = $derived($currentZone);
	let players: Player[] = $state([]);
	let decks: Deck[] = $state([]);
	let records: GameRecord[] = $state([]);
	let loading: boolean = $state(true);
	let tab: 'players' | 'decks' = $state('players');
	let sortBy: 'won' | 'played' | 'lost' = $state('won');

	onMount(async () => {
		if (!zone) { loading = false; return; }
		try {
			const ds = await getDataService();
			[players, decks, records] = await Promise.all([
				getPlayersInZone(zone.id),
				getDecksInZone(zone.id),
				ds.getGameRecordsForZone(zone.id)
			]);
		} catch (e) { console.warn(e); }
		loading = false;
	});

	function calcPlayerRanks(): RankEntry[] {
		return players.map((p) => {
			const games = records.filter((r) => r.playerIds.includes(p.id));
			const wins = games.filter((r) => r.winnerId === p.id).length;
			const losses = games.filter((r) => r.winnerId && r.winnerId !== p.id).length;
			return { playerId: p.id, playerName: p.name, gamesPlayed: games.length, gamesWon: wins, gamesLost: losses, winRate: games.length ? Math.round((wins / games.length) * 1000) / 10 : 0 };
		}).sort((a, b) => b[sortKey()] - a[sortKey()]);
	}

	function calcDeckRanks(): RankEntry[] {
		return decks.map((d) => {
			const games = records.filter((r) => r.deckIds.includes(d.id));
			const wins = games.filter((r) => { const idx = r.deckIds.indexOf(d.id); return r.winnerId && r.playerIds[idx] === r.winnerId; }).length;
			const losses = games.filter((r) => { const idx = r.deckIds.indexOf(d.id); return r.winnerId && r.playerIds[idx] !== r.winnerId; }).length;
			return { playerId: d.playerId, playerName: players.find((p) => p.id === d.playerId)?.name ?? '?', deckId: d.id, commanderName: d.commanderName, gamesPlayed: games.length, gamesWon: wins, gamesLost: losses, winRate: games.length ? Math.round((wins / games.length) * 1000) / 10 : 0 };
		}).sort((a, b) => b[sortKey()] - a[sortKey()]);
	}

	function sortKey(): 'gamesWon' | 'gamesPlayed' | 'gamesLost' {
		return sortBy === 'won' ? 'gamesWon' : sortBy === 'played' ? 'gamesPlayed' : 'gamesLost';
	}

	let playerRanks = $derived(calcPlayerRanks());
	let deckRanks = $derived(calcDeckRanks());
</script>

<div class="rank-page">
	<h1>Rankings</h1>
	<div class="tabs"><button class:active={tab==='players'} onclick={()=>tab='players'}>Players</button><button class:active={tab==='decks'} onclick={()=>tab='decks'}>Decks</button></div>
	<div class="sort"><span>Sort:</span>{#each (['won','played','lost'] as const) as s}<button class:active={sortBy===s} onclick={()=>sortBy=s}>{s}</button>{/each}</div>

	{#if loading}<div class="empty">Loading…</div>
	{:else if tab==='players'}
		<div class="list">{#each playerRanks as r, i}
			<div class="row"><span class="pos">{#if i===0}<Icon name="crown" size={18} color="var(--color-warning)"/>{:else}{i+1}{/if}</span>
				<div class="info"><strong>{r.playerName}</strong><span class="meta">{r.gamesPlayed}G · {r.gamesWon}W · {r.gamesLost}L · {r.winRate}%</span></div>
			</div>
		{/each}</div>
	{:else}
		<div class="list">{#each deckRanks as r, i}
			<div class="row"><span class="pos">{#if i===0}<Icon name="crown" size={18} color="var(--color-warning)"/>{:else}{i+1}{/if}</span>
				<div class="info"><strong>{r.commanderName}</strong><span class="meta">{r.playerName} · {r.gamesPlayed}G · {r.gamesWon}W · {r.gamesLost}L · {r.winRate}%</span></div>
			</div>
		{/each}</div>
	{/if}
</div>

<style>
	.rank-page{padding-top:var(--space-md)}
	h1{font-size:1.4rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:var(--color-primary);margin-bottom:var(--space-md)}
	.tabs{display:flex;gap:2px;background:var(--color-surface);border:1px solid var(--color-surface-elevated);border-radius:var(--radius-lg);padding:3px;margin-bottom:var(--space-md)}
	.tabs button{flex:1;padding:var(--space-sm);border-radius:var(--radius-md);font-weight:700;font-size:.75rem;letter-spacing:.06em;text-transform:uppercase;transition:all var(--transition-fast);color:var(--color-text-muted);min-height:44px}
	.tabs button.active{background:var(--color-primary);color:white;box-shadow:var(--glow-primary)}
	.sort{display:flex;align-items:center;gap:var(--space-sm);margin-bottom:var(--space-md)}.sort span{font-size:.7rem;font-weight:700;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.06em}.sort button{padding:4px 10px;border-radius:var(--radius-md);font-size:.7rem;font-weight:700;color:var(--color-text-muted);transition:all var(--transition-fast);border:1px solid var(--color-surface-elevated)}.sort button.active{color:var(--color-secondary);border-color:var(--neon-cyan);background:var(--color-secondary-dim)}
	.empty{text-align:center;padding:var(--space-2xl);color:var(--color-text-muted)}
	.list{display:flex;flex-direction:column;gap:var(--space-sm)}
	.row{display:flex;align-items:center;gap:var(--space-md);padding:var(--space-md);background:var(--color-surface);border:1px solid var(--color-surface-elevated);border-radius:var(--radius-lg);transition:all var(--transition-fast)}
	.row:hover{border-color:var(--neon-cyan)}
	.pos{width:28px;text-align:center;font-weight:800;font-size:.85rem;color:var(--color-text-muted)}
	.info{flex:1;display:flex;flex-direction:column;gap:2px}.info strong{font-weight:700;font-size:.85rem}.meta{font-size:.65rem;color:var(--color-text-muted);letter-spacing:.02em}
</style>


