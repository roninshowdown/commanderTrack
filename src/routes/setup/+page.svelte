<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { Player, Deck, GameConfig, TimerConfigA, TimerConfigB, TimerConfigNone, GameRecord } from '$lib/models/types';
	import { initGame, hasActiveGame, abandonGame } from '$lib/stores/gameStore';
	import { currentZone } from '$lib/stores/zoneStore';
	import { getPlayersInZone, getDecksInZone } from '$lib/stores/zoneStore';
	import { getDataService } from '$lib/services/data-service';
	import { authUser } from '$lib/firebase/auth';
	import { uid } from '$lib/utils/format';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';

	let user = $derived($authUser);
	let zone = $derived($currentZone);
	let gameActive = $derived($hasActiveGame);

	let players: Player[] = $state([]);
	let decks: Deck[] = $state([]);
	let gameRecords: GameRecord[] = $state([]);
	let loading: boolean = $state(true);

	let playerCount: number = $state(4);
	let selectedPlayers: (string | null)[] = $state([null, null, null, null, null]);
	let selectedDecks: (string | null)[] = $state([null, null, null, null, null]);
	let maxLife: number = $state(40);

	/* Timer mode */
	let timerEnabled: boolean = $state(true);
	let timerType: 'A' | 'B' = $state('B'); // B = Progressive (default)

	/* Variant A — Simple */
	let poolTimeMinA: number = $state(30);
	let sharedStartMin: number = $state(10);

	/* Variant B — Progressive */
	let poolTimeMinB: number = $state(10);
	let playerTimeMin: number = $state(2);
	let reactionTimeMin: number = $state(1);
	let scalePlayer: number = $state(10);
	let scaleReaction: number = $state(10);

	let toast: { message: string; type: 'success' | 'error' } | null = $state(null);

	onMount(async () => {
		if (!zone) { loading = false; return; }
		try {
			const ds = await getDataService();
			[players, decks] = await Promise.all([
				getPlayersInZone(zone.id),
				getDecksInZone(zone.id)
			]);
			// Game records for deck prefill — non-critical, fail silently
			try {
				gameRecords = await ds.getGameRecordsForZone(zone.id);
			} catch (e) {
				console.warn('[setup] Failed to load game records for deck prefill:', e);
				gameRecords = [];
			}
		} catch (e: any) { toast = { message: `Load failed: ${e?.message ?? e}`, type: 'error' }; }
		loading = false;
	});

	/** Auto-fill player & deck slots with available zone members */
	function prefillSlots() {
		const newSelected: (string | null)[] = [null, null, null, null, null];
		const newDecks: (string | null)[] = [null, null, null, null, null];
		for (let i = 0; i < playerCount && i < players.length; i++) {
			const player = players[i];
			newSelected[i] = player.id;
			const validDecks = decks.filter((d) => d.playerId === player.id);
			const mostPlayed = getMostPlayedDeckId(player.id);
			newDecks[i] = (mostPlayed && validDecks.find((d) => d.id === mostPlayed))
				? mostPlayed
				: (validDecks.length === 1 ? validDecks[0].id : null);
		}
		selectedPlayers = newSelected;
		selectedDecks = newDecks;
	}

	/* Re-run prefill when data finishes loading or playerCount changes */
	$effect(() => {
		if (!loading && players.length) {
			prefillSlots();
		}
	});

	function getMostPlayedDeckId(playerId: string): string | null {
		const counts: Record<string, number> = {};
		for (const r of gameRecords) {
			const idx = r.playerIds.indexOf(playerId);
			if (idx !== -1 && r.deckIds[idx]) counts[r.deckIds[idx]] = (counts[r.deckIds[idx]] ?? 0) + 1;
		}
		if (!Object.keys(counts).length) return null;
		return Object.entries(counts).sort(([, a], [, b]) => b - a)[0][0];
	}

	function getAvailablePlayers(slot: number): Player[] {
		const used = selectedPlayers.filter((p, i) => p && i !== slot);
		return players.filter((p) => !used.includes(p.id));
	}

	function onPlayerSelect(slot: number, id: string) {
		selectedPlayers[slot] = id || null;
		if (id) {
			const validDecks = decks.filter((d) => d.playerId === id);
			const mostPlayed = getMostPlayedDeckId(id);
			const prefill = mostPlayed && validDecks.find((d) => d.id === mostPlayed) ? mostPlayed : null;
			// Prefill most played, or auto-select if only one deck available
			selectedDecks[slot] = prefill ?? (validDecks.length === 1 ? validDecks[0].id : null);
		} else {
			selectedDecks[slot] = null;
		}
	}

	function getDecksForPlayer(slot: number): Deck[] {
		const pid = selectedPlayers[slot];
		return pid ? decks.filter((d) => d.playerId === pid) : [];
	}

	/* ── Tile picker state ── */
	let pickerSlot: number | null = $state(null);
	let pickerKind: 'player' | 'deck' = $state('player');

	function openPlayerPicker(slot: number) {
		pickerKind = 'player';
		pickerSlot = slot;
	}
	function openDeckPicker(slot: number) {
		if (!selectedPlayers[slot]) return;
		pickerKind = 'deck';
		pickerSlot = slot;
	}
	function closePicker() {
		pickerSlot = null;
	}
	function pickPlayer(playerId: string) {
		if (pickerSlot === null) return;
		onPlayerSelect(pickerSlot, playerId);
		closePicker();
	}
	function pickDeck(deckId: string) {
		if (pickerSlot === null) return;
		selectedDecks[pickerSlot] = deckId;
		closePicker();
	}
	function clearSlot(slot: number) {
		selectedPlayers[slot] = null;
		selectedDecks[slot] = null;
	}

	function getPlayerById(id: string | null): Player | null {
		if (!id) return null;
		return players.find((p) => p.id === id) ?? null;
	}
	function getDeckById(id: string | null): Deck | null {
		if (!id) return null;
		return decks.find((d) => d.id === id) ?? null;
	}

	function handleAbandon() {
		if (!confirm('Abandon your active game? It will not be recorded.')) return;
		abandonGame();
		toast = { message: 'Game abandoned', type: 'success' };
	}

	function startGame_() {
		if (gameActive) {
			toast = { message: 'You already have an active game. Finish or abandon it first.', type: 'error' };
			return;
		}
		if (!zone) {
			toast = { message: 'No active Commander Zone selected.', type: 'error' };
			return;
		}
		const setupPlayers = [];
		for (let i = 0; i < playerCount; i++) {
			const pid = selectedPlayers[i];
			const did = selectedDecks[i];
			if (!pid || !did) { toast = { message: `Slot ${i + 1} is incomplete`, type: 'error' }; return; }
			const p = players.find((x) => x.id === pid)!;
			const d = decks.find((x) => x.id === did)!;
			setupPlayers.push({ playerId: pid, deckId: did, playerName: p.name, commanderName: d.commanderName, commanderImageUrl: d.commanderImageUrl });
		}

		let timerConfig: TimerConfigA | TimerConfigB | TimerConfigNone;
		if (!timerEnabled) {
			timerConfig = { variant: 'none' } satisfies TimerConfigNone;
		} else if (timerType === 'A') {
			timerConfig = { variant: 'A', poolTimeSeconds: poolTimeMinA * 60, sharedStartTimeSeconds: sharedStartMin * 60, enableReaction: true } satisfies TimerConfigA;
		} else {
			timerConfig = { variant: 'B', poolTimeSeconds: poolTimeMinB * 60, playerTimeSeconds: playerTimeMin * 60, reactionTimeSeconds: reactionTimeMin * 60, scaleFactorPlayerTimeSeconds: scalePlayer, scaleFactorReactionTimeSeconds: scaleReaction } satisfies TimerConfigB;
		}

		const config: GameConfig = { id: uid(), maxLife, timerConfig, createdAt: Date.now() };
		initGame(setupPlayers, config, zone.id, user?.uid ?? '');
		goto('/game');
	}
</script>

<div class="setup">
	<h1>Game Setup</h1>
	{#if !zone}
		<div class="loading">No Commander Zone selected. <a href="/zones">Join or create one →</a></div>
	{:else if gameActive}
		<div class="active-game-warning">
			<Icon name="swords" size={24} color="var(--color-warning)" />
			<p>You have an active game. Finish or abandon it before starting a new one.</p>
			<div class="warning-actions">
				<Button variant="primary" onclick={() => goto('/game')}>{#snippet children()}Resume Game{/snippet}</Button>
				<Button variant="danger" size="sm" onclick={handleAbandon}>{#snippet children()}Abandon Game{/snippet}</Button>
			</div>
		</div>
	{:else if loading}<div class="loading">Loading…</div>
	{:else}
		<!-- Players -->
		<section class="sec">
			<h2>Players</h2>
			<div class="count-row">
				{#each [2,3,4,5] as n}
					<button class="cnt" class:active={playerCount===n} onclick={()=>playerCount=n}>{n}</button>
				{/each}
			</div>
		</section>

		<!-- Player & Deck slots -->
		<section class="sec">
			<h2>Select Players &amp; Decks</h2>
			<div class="slots">
				{#each Array(playerCount) as _, i}
					{@const p = getPlayerById(selectedPlayers[i])}
					{@const d = getDeckById(selectedDecks[i])}
					<div class="slot-card">
						<span class="slot-num">{i + 1}</span>
						<button type="button" class="slot-pick player-pick" class:filled={!!p} onclick={() => openPlayerPicker(i)}>
							{#if p}
								{#if p.imageUrl}
									<img class="slot-avatar" src={p.imageUrl} alt={p.name} />
								{:else}
									<div class="slot-avatar slot-avatar-fallback"><Icon name="user" size={20} /></div>
								{/if}
								<span class="slot-name">{p.name}</span>
							{:else}
								<div class="slot-avatar slot-avatar-empty"><Icon name="user" size={20} /></div>
								<span class="slot-name slot-empty-text">Choose player</span>
							{/if}
						</button>
						<button type="button" class="slot-pick deck-pick" class:filled={!!d} disabled={!p} onclick={() => openDeckPicker(i)}>
							{#if d}
								{#if d.commanderImageUrl}
									<img class="slot-cmd-img" src={d.commanderImageUrl} alt={d.commanderName} />
								{:else}
									<div class="slot-cmd-img slot-cmd-fallback"><Icon name="deck" size={20} /></div>
								{/if}
								<span class="slot-name">{d.commanderName}</span>
							{:else}
								<div class="slot-cmd-img slot-cmd-empty"><Icon name="deck" size={20} /></div>
								<span class="slot-name slot-empty-text">{p ? 'Choose deck' : '—'}</span>
							{/if}
						</button>
						{#if p || d}
							<button type="button" class="slot-clear" title="Clear slot" onclick={() => clearSlot(i)}>
								<Icon name="x" size={14} />
							</button>
						{/if}
					</div>
				{/each}
			</div>
		</section>

		<!-- Starting Life -->
		<section class="sec">
			<h2>Starting Life</h2>
			<div class="count-row">
				{#each [20,40,60,80] as l}
					<button class="cnt" class:active={maxLife===l} onclick={()=>maxLife=l}>{l}</button>
				{/each}
			</div>
		</section>

		<!-- Timer -->
		<section class="sec">
			<div class="timer-header">
				<h2>Timer</h2>
				<label class="toggle-wrap">
					<span class="toggle-lbl">{timerEnabled ? 'Enabled' : 'Disabled'}</span>
					<button class="toggle" class:on={timerEnabled} onclick={()=>timerEnabled=!timerEnabled} aria-label="Toggle timer">
						<span class="knob"></span>
					</button>
				</label>
			</div>

			{#if timerEnabled}
				<div class="vtabs">
					<button class="vtab" class:active={timerType==='B'} onclick={()=>timerType='B'}>
						<strong>Progressive</strong><span>Turn time + reaction + scaling</span>
					</button>
					<button class="vtab" class:active={timerType==='A'} onclick={()=>timerType='A'}>
						<strong>Simple</strong><span>Shared start + pool time</span>
					</button>
				</div>

				{#if timerType==='A'}
					<div class="fields">
						<div class="field">
							<label for="s-pa">Player Pool Time (min)</label>
							<input id="s-pa" type="number" bind:value={poolTimeMinA} min="1" max="120"/>
						</div>
						<div class="field">
							<label for="s-ss">Shared Start Time (min)</label>
							<input id="s-ss" type="number" bind:value={sharedStartMin} min="1" max="60"/>
						</div>
					</div>
				{:else}
					<div class="fields">
						<div class="field">
							<label for="s-pb">Player Pool Time (min)</label>
							<input id="s-pb" type="number" bind:value={poolTimeMinB} min="1" max="120"/>
						</div>
						<div class="field">
							<label for="s-pt">Player Turn Time (min)</label>
							<input id="s-pt" type="number" bind:value={playerTimeMin} min="0.5" max="30" step="0.5"/>
						</div>
						<div class="field">
							<label for="s-rt">Reaction Time (min)</label>
							<input id="s-rt" type="number" bind:value={reactionTimeMin} min="0.5" max="30" step="0.5"/>
						</div>
						<div class="field">
							<label for="s-sp">Increase Player Time Per Round (s)</label>
							<input id="s-sp" type="number" bind:value={scalePlayer} min="0" max="60"/>
						</div>
						<div class="field">
							<label for="s-sr">Increase React Time Per Round (s)</label>
							<input id="s-sr" type="number" bind:value={scaleReaction} min="0" max="60"/>
						</div>
					</div>
				{/if}
			{/if}
		</section>

		<section class="sec start">
			<Button variant="primary" size="lg" fullWidth onclick={startGame_}>
				{#snippet children()}<Icon name="play" size={16}/> Start Game{/snippet}
			</Button>
		</section>
	{/if}
</div>

{#if toast}<Toast message={toast.message} type={toast.type} onclose={()=>toast=null}/>{/if}

{#if pickerSlot !== null}
	{@const slot = pickerSlot}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="picker-overlay" role="presentation" onclick={closePicker}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="picker-sheet animate-fade-in" role="dialog" tabindex="-1" onclick={(e) => e.stopPropagation()}>
			<div class="picker-header">
				<h3>{pickerKind === 'player' ? `Select Player · Slot ${slot + 1}` : `Select Deck · Slot ${slot + 1}`}</h3>
				<button class="picker-close" onclick={closePicker} aria-label="Close">
					<Icon name="x" size={18} />
				</button>
			</div>
			<div class="picker-grid">
				{#if pickerKind === 'player'}
					{#each getAvailablePlayers(slot) as p (p.id)}
						<button class="picker-item" class:active={selectedPlayers[slot] === p.id} onclick={() => pickPlayer(p.id)}>
							{#if p.imageUrl}
								<img class="picker-avatar" src={p.imageUrl} alt={p.name} />
							{:else}
								<div class="picker-avatar picker-avatar-fallback"><Icon name="user" size={26} /></div>
							{/if}
							<span class="picker-name">{p.name}</span>
						</button>
					{:else}
						<div class="picker-empty">No players available. <a href="/admin/players">Manage players →</a></div>
					{/each}
				{:else}
					{#each getDecksForPlayer(slot) as d (d.id)}
						<button class="picker-item" class:active={selectedDecks[slot] === d.id} onclick={() => pickDeck(d.id)}>
							{#if d.commanderImageUrl}
								<img class="picker-cmd" src={d.commanderImageUrl} alt={d.commanderName} />
							{:else}
								<div class="picker-cmd picker-cmd-fallback"><Icon name="deck" size={26} /></div>
							{/if}
							<span class="picker-name">{d.commanderName}</span>
						</button>
					{:else}
						<div class="picker-empty">No decks for this player. <a href="/admin/decks">Manage decks →</a></div>
					{/each}
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.setup{padding-top:var(--space-md)}
	h1{font-size:1.4rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:var(--color-primary);margin-bottom:var(--space-xl)}
	.sec{margin-bottom:var(--space-xl)}
	h2{font-size:.75rem;font-weight:800;margin-bottom:var(--space-md);color:var(--color-secondary);text-transform:uppercase;letter-spacing:.1em}
	.count-row{display:flex;gap:var(--space-sm);flex-wrap:wrap}
	.cnt{width:48px;height:48px;border-radius:var(--radius-md);background:var(--color-surface);border:1px solid var(--color-surface-elevated);font-size:1.1rem;font-weight:700;transition:all var(--transition-fast)}
	.cnt.active{background:var(--color-primary);color:white;border-color:var(--color-primary-light);box-shadow:var(--glow-primary)}
	.slots{display:flex;flex-direction:column;gap:var(--space-md)}

	/* Tile-based slot picker */
	.slot-card{position:relative;display:grid;grid-template-columns:auto 1fr 1fr auto;gap:var(--space-sm);align-items:stretch;padding:var(--space-sm);background:var(--color-surface);border:1px solid var(--color-surface-elevated);border-radius:var(--radius-lg)}
	.slot-num{display:flex;align-items:center;justify-content:center;width:28px;font-size:.7rem;font-weight:900;color:var(--color-text-muted);letter-spacing:.06em}
	.slot-pick{display:flex;align-items:center;gap:var(--space-sm);padding:var(--space-sm);min-height:64px;border-radius:var(--radius-md);background:var(--color-bg);border:1px solid var(--color-surface-elevated);text-align:left;color:var(--color-text);transition:all var(--transition-fast);overflow:hidden}
	.slot-pick:hover:not(:disabled){border-color:var(--neon-cyan);box-shadow:var(--glow-cyan)}
	.slot-pick:disabled{opacity:.5;cursor:not-allowed}
	.slot-pick.filled{border-color:var(--color-secondary)}
	.slot-avatar{width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0;background:var(--color-surface-elevated)}
	.slot-avatar-empty,.slot-avatar-fallback,.slot-cmd-empty,.slot-cmd-fallback{display:flex;align-items:center;justify-content:center;color:var(--color-text-muted)}
	.slot-cmd-img{width:48px;height:36px;border-radius:var(--radius-sm);object-fit:cover;object-position:center top;flex-shrink:0;background:var(--color-surface-elevated)}
	.slot-name{font-size:.78rem;font-weight:700;color:var(--color-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1}
	.slot-empty-text{color:var(--color-text-muted);font-weight:600}
	.slot-clear{width:28px;height:28px;border-radius:50%;background:transparent;border:1px solid var(--color-surface-elevated);color:var(--color-text-muted);align-self:center;display:flex;align-items:center;justify-content:center;padding:0;min-height:unset}
	.slot-clear:hover{border-color:var(--color-danger);color:var(--color-danger)}
	@media(max-width:640px){.slot-card{grid-template-columns:auto 1fr auto;grid-template-rows:auto auto;gap:6px}.slot-num{grid-row:1/3}.player-pick{grid-column:2;grid-row:1}.deck-pick{grid-column:2;grid-row:2}.slot-clear{grid-column:3;grid-row:1/3}}

	/* Picker bottom sheet */
	.picker-overlay{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);display:flex;align-items:flex-end;justify-content:center}
	.picker-sheet{width:100%;max-width:520px;max-height:80dvh;background:var(--color-surface);border:1px solid var(--color-surface-elevated);border-radius:var(--radius-lg) var(--radius-lg) 0 0;display:flex;flex-direction:column;overflow:hidden}
	@media(min-width:641px){.picker-overlay{align-items:center}.picker-sheet{border-radius:var(--radius-lg);max-height:75dvh}}
	.picker-header{display:flex;align-items:center;justify-content:space-between;padding:var(--space-md);border-bottom:1px solid var(--color-surface-elevated)}
	.picker-header h3{font-size:.9rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--color-secondary)}
	.picker-close{width:32px;height:32px;min-height:unset;padding:0;border-radius:50%;background:transparent;border:1px solid var(--color-surface-elevated);color:var(--color-text-muted);display:flex;align-items:center;justify-content:center}
	.picker-close:hover{border-color:var(--color-danger);color:var(--color-danger)}
	.picker-grid{flex:1;overflow-y:auto;padding:var(--space-md);display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:var(--space-sm)}
	.picker-item{display:flex;flex-direction:column;align-items:center;gap:6px;padding:var(--space-sm);border-radius:var(--radius-md);background:var(--color-bg);border:1px solid var(--color-surface-elevated);transition:all var(--transition-fast);cursor:pointer}
	.picker-item:hover{border-color:var(--neon-cyan);box-shadow:var(--glow-cyan);transform:translateY(-1px)}
	.picker-item.active{border-color:var(--color-primary);box-shadow:var(--glow-primary)}
	.picker-avatar{width:64px;height:64px;border-radius:50%;object-fit:cover;background:var(--color-surface-elevated)}
	.picker-avatar-fallback,.picker-cmd-fallback{display:flex;align-items:center;justify-content:center;color:var(--color-text-muted)}
	.picker-cmd{width:96px;height:72px;border-radius:var(--radius-sm);object-fit:cover;object-position:center top;background:var(--color-surface-elevated)}
	.picker-name{font-size:.72rem;font-weight:700;text-align:center;color:var(--color-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%}
	.picker-empty{grid-column:1/-1;text-align:center;padding:var(--space-xl);color:var(--color-text-muted);font-size:.8rem}
	.picker-empty a{color:var(--color-secondary);font-weight:700}

	/* Timer section */
	.timer-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-md)}
	.timer-header h2{margin-bottom:0}
	.toggle-wrap{display:flex;align-items:center;gap:var(--space-xs);cursor:pointer}
	.toggle-lbl{font-size:.7rem;font-weight:700;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.04em}
	.toggle{width:44px;height:24px;border-radius:12px;background:var(--color-surface-elevated);border:1px solid var(--color-surface-elevated);position:relative;transition:all var(--transition-fast);min-height:unset;padding:0}
	.toggle.on{background:var(--color-primary);border-color:var(--color-primary-light)}
	.knob{position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:white;transition:transform var(--transition-fast)}
	.toggle.on .knob{transform:translateX(20px)}

	.vtabs{display:flex;gap:var(--space-sm);margin-bottom:var(--space-md)}
	.vtab{flex:1;padding:var(--space-md);border-radius:var(--radius-lg);background:var(--color-surface);border:1px solid var(--color-surface-elevated);text-align:left;display:flex;flex-direction:column;gap:4px;transition:all var(--transition-fast)}
	.vtab.active{border-color:var(--neon-red);background:var(--color-primary-dim);box-shadow:var(--glow-primary)}
	.vtab strong{font-size:.85rem;letter-spacing:.04em}.vtab span{font-size:.65rem;color:var(--color-text-muted)}

	.fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:var(--space-md)}
	.field{display:flex;flex-direction:column;gap:var(--space-xs)}
	.field label{font-size:.7rem;font-weight:700;color:var(--color-text-muted);letter-spacing:.04em;text-transform:uppercase}


	.start{margin-top:var(--space-2xl)}
	.loading{text-align:center;padding:var(--space-2xl);color:var(--color-text-muted)}
	.active-game-warning{display:flex;flex-direction:column;align-items:center;gap:var(--space-md);padding:var(--space-xl);text-align:center;background:rgba(255,171,0,.08);border:1px solid rgba(255,171,0,.3);border-radius:var(--radius-lg)}
	.active-game-warning p{color:var(--color-text-muted);font-size:.85rem}
	.warning-actions{display:flex;gap:var(--space-sm)}
</style>

