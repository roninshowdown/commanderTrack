<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { Player, Deck, GameConfig, TimerConfigA, TimerConfigB, TimerVariant } from '$lib/models/types';
	import { getDataService } from '$lib/services/data-service';
	import { initGame } from '$lib/stores/gameStore';
	import { uid } from '$lib/utils/format';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';

	let players: Player[] = $state([]);
	let decks: Deck[] = $state([]);
	let loading: boolean = $state(true);

	let playerCount: number = $state(4);
	let selectedPlayers: (string | null)[] = $state([null, null, null, null, null, null]);
	let selectedDecks: (string | null)[] = $state([null, null, null, null, null, null]);
	let maxLife: number = $state(40);
	let timerVariant: TimerVariant = $state('B');

	/* Variant A */
	let poolTimeMinA: number = $state(30);
	let sharedStartMin: number = $state(10);

	/* Variant B */
	let poolTimeMinB: number = $state(30);
	let playerTimeMin: number = $state(2);
	let reactionTimeMin: number = $state(1);
	let scalePlayer: number = $state(10);
	let scaleReaction: number = $state(10);

	let toast: { message: string; type: 'success' | 'error' } | null = $state(null);

	onMount(async () => {
		try {
			const ds = await getDataService();
			[players, decks] = await Promise.all([ds.getPlayers(), ds.getDecks()]);
		} catch (e: any) { toast = { message: `Load failed: ${e?.message ?? e}`, type: 'error' }; }
		loading = false;
	});

	function getAvailablePlayers(slot: number): Player[] {
		const used = selectedPlayers.filter((p, i) => p && i !== slot);
		return players.filter((p) => !used.includes(p.id));
	}

	function onPlayerSelect(slot: number, id: string) {
		selectedPlayers[slot] = id || null;
		selectedDecks[slot] = null;
	}

	function getDecksForPlayer(slot: number): Deck[] {
		const pid = selectedPlayers[slot];
		return pid ? decks.filter((d) => d.playerId === pid) : [];
	}

	function startGame_() {
		const setupPlayers = [];
		for (let i = 0; i < playerCount; i++) {
			const pid = selectedPlayers[i];
			const did = selectedDecks[i];
			if (!pid || !did) { toast = { message: `Slot ${i + 1} is incomplete`, type: 'error' }; return; }
			const p = players.find((x) => x.id === pid)!;
			const d = decks.find((x) => x.id === did)!;
			setupPlayers.push({ playerId: pid, deckId: did, playerName: p.name, commanderName: d.commanderName, commanderImageUrl: d.commanderImageUrl });
		}
		const timerConfig = timerVariant === 'A'
			? { variant: 'A' as const, poolTimeSeconds: poolTimeMinA * 60, sharedStartTimeSeconds: sharedStartMin * 60 } satisfies TimerConfigA
			: { variant: 'B' as const, poolTimeSeconds: poolTimeMinB * 60, playerTimeSeconds: playerTimeMin * 60, reactionTimeSeconds: reactionTimeMin * 60, scaleFactorPlayerTimeSeconds: scalePlayer, scaleFactorReactionTimeSeconds: scaleReaction } satisfies TimerConfigB;

		const config: GameConfig = { id: uid(), maxLife, timerConfig, createdAt: Date.now() };
		initGame(setupPlayers, config);
		goto('/game');
	}
</script>

<div class="setup">
	<h1>Game Setup</h1>
	{#if loading}<div class="loading">Loading…</div>
	{:else}
		<section class="sec"><h2>Players</h2>
			<div class="count-row">{#each [2,3,4,5,6] as n}<button class="cnt" class:active={playerCount===n} onclick={()=>playerCount=n}>{n}</button>{/each}</div>
		</section>

		<section class="sec"><h2>Select Players & Decks</h2>
			<div class="slots">{#each Array(playerCount) as _,i}
				<div class="slot"><span class="slot-lbl">Slot {i+1}</span>
					<select value={selectedPlayers[i]??''} onchange={(e)=>onPlayerSelect(i,(e.target as HTMLSelectElement).value)}>
						<option value="">Select player…</option>
						{#each getAvailablePlayers(i) as p}<option value={p.id}>{p.name}</option>{/each}
					</select>
					<select value={selectedDecks[i]??''} onchange={(e)=>selectedDecks[i]=(e.target as HTMLSelectElement).value} disabled={!selectedPlayers[i]}>
						<option value="">Select deck…</option>
						{#each getDecksForPlayer(i) as d}<option value={d.id}>{d.commanderName}</option>{/each}
					</select>
				</div>
			{/each}</div>
		</section>

		<section class="sec"><h2>Starting Life</h2>
			<div class="count-row">{#each [20,25,30,40,50] as l}<button class="cnt" class:active={maxLife===l} onclick={()=>maxLife=l}>{l}</button>{/each}</div>
		</section>

		<section class="sec"><h2>Timer Variant</h2>
			<div class="vtabs">
				<button class="vtab" class:active={timerVariant==='A'} onclick={()=>timerVariant='A'}><strong>Variant A</strong><span>Shared start, no reaction</span></button>
				<button class="vtab" class:active={timerVariant==='B'} onclick={()=>timerVariant='B'}><strong>Variant B</strong><span>Player + reaction + scaling</span></button>
			</div>
			{#if timerVariant==='A'}
				<div class="fields"><div class="field"><label for="s-pa">Pool Time (min)</label><input id="s-pa" type="number" bind:value={poolTimeMinA} min="1" max="120"/></div>
				<div class="field"><label for="s-ss">Shared Start (min)</label><input id="s-ss" type="number" bind:value={sharedStartMin} min="1" max="60"/></div></div>
			{:else}
				<div class="fields"><div class="field"><label for="s-pb">Pool Time (min)</label><input id="s-pb" type="number" bind:value={poolTimeMinB} min="1" max="120"/></div>
				<div class="field"><label for="s-pt">Player Time (min)</label><input id="s-pt" type="number" bind:value={playerTimeMin} min="0.5" max="30" step="0.5"/></div>
				<div class="field"><label for="s-rt">Reaction (min)</label><input id="s-rt" type="number" bind:value={reactionTimeMin} min="0.5" max="30" step="0.5"/></div>
				<div class="field"><label for="s-sp">Scale Player (s)</label><input id="s-sp" type="number" bind:value={scalePlayer} min="0" max="60"/></div>
				<div class="field"><label for="s-sr">Scale React (s)</label><input id="s-sr" type="number" bind:value={scaleReaction} min="0" max="60"/></div></div>
			{/if}
		</section>

		<section class="sec start"><Button variant="primary" size="lg" fullWidth onclick={startGame_}>{#snippet children()}<Icon name="play" size={16}/> Start Game{/snippet}</Button></section>
	{/if}
</div>

{#if toast}<Toast message={toast.message} type={toast.type} onclose={()=>toast=null}/>{/if}

<style>
	.setup{padding-top:var(--space-md)}
	h1{font-size:1.4rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:var(--color-primary);margin-bottom:var(--space-xl)}
	.sec{margin-bottom:var(--space-xl)}
	h2{font-size:.75rem;font-weight:800;margin-bottom:var(--space-md);color:var(--color-secondary);text-transform:uppercase;letter-spacing:.1em}
	.count-row{display:flex;gap:var(--space-sm);flex-wrap:wrap}
	.cnt{width:48px;height:48px;border-radius:var(--radius-md);background:var(--color-surface);border:1px solid var(--color-surface-elevated);font-size:1.1rem;font-weight:700;transition:all var(--transition-fast)}
	.cnt.active{background:var(--color-primary);color:white;border-color:var(--color-primary-light);box-shadow:var(--glow-primary)}
	.slots{display:flex;flex-direction:column;gap:var(--space-md)}
	.slot{display:flex;gap:var(--space-sm);align-items:center;flex-wrap:wrap}
	.slot-lbl{width:100%;font-size:.7rem;font-weight:700;color:var(--color-text-muted);letter-spacing:.06em;text-transform:uppercase}
	.slot select{flex:1;min-width:0;min-height:44px}
	.vtabs{display:flex;gap:var(--space-sm);margin-bottom:var(--space-md)}
	.vtab{flex:1;padding:var(--space-md);border-radius:var(--radius-lg);background:var(--color-surface);border:1px solid var(--color-surface-elevated);text-align:left;display:flex;flex-direction:column;gap:4px;transition:all var(--transition-fast)}
	.vtab.active{border-color:var(--neon-red);background:var(--color-primary-dim);box-shadow:var(--glow-primary)}
	.vtab strong{font-size:.85rem;letter-spacing:.04em}.vtab span{font-size:.65rem;color:var(--color-text-muted)}
	.fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:var(--space-md)}
	.field{display:flex;flex-direction:column;gap:var(--space-xs)}
	.field label{font-size:.7rem;font-weight:700;color:var(--color-text-muted);letter-spacing:.04em;text-transform:uppercase}
	.start{margin-top:var(--space-2xl)}
	.loading{text-align:center;padding:var(--space-2xl);color:var(--color-text-muted)}
</style>


