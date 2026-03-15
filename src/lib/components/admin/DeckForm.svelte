<script lang="ts">
	import type { Deck, Player, MtgColor } from '$lib/models/types';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ColorPip from '$lib/components/ui/ColorPip.svelte';
	import { searchCommander, autocompleteCardName } from '$lib/services/scryfall';

	interface Props {
		deck?: Deck | null; players: Player[];
		onsave: (data: Omit<Deck, 'id'>) => void | Promise<void>;
		oncancel: () => void; disabled?: boolean;
	}
	let { deck = null, players, onsave, oncancel, disabled = false }: Props = $props();

	const initialPlayerId = deck?.playerId ?? (players[0]?.id ?? '');
	const initialCmdName = deck?.commanderName ?? '';
	const initialCmdImage = deck?.commanderImageUrl ?? '';
	const initialColors = deck?.colors ?? [];

	let playerId: string = $state(initialPlayerId);
	let commanderName: string = $state(initialCmdName);
	let commanderImageUrl: string = $state(initialCmdImage);
	let colors: MtgColor[] = $state(initialColors);
	let searching: boolean = $state(false);
	let suggestions: string[] = $state([]);
	let showSuggestions: boolean = $state(false);
	const allColors: MtgColor[] = ['white','blue','black','red','green'];

	async function searchCard() {
		if (!commanderName.trim()) return;
		searching = true;
		const r = await searchCommander(commanderName);
		if (r) { commanderName = r.name; commanderImageUrl = r.imageUrl; colors = r.colors; }
		searching = false;
	}
	async function handleInput() {
		if (commanderName.length >= 2) { suggestions = await autocompleteCardName(commanderName); showSuggestions = suggestions.length > 0; }
		else showSuggestions = false;
	}
	function selectSuggestion(n: string) { commanderName = n; showSuggestions = false; searchCard(); }
	function toggleColor(c: MtgColor) { colors = colors.includes(c) ? colors.filter(x=>x!==c) : [...colors, c]; }
	function handleSubmit() {
		if (!commanderName.trim() || !playerId || disabled) return;
		onsave({ playerId, commanderName: commanderName.trim(), commanderImageUrl, colors });
	}
</script>

<form class="form" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
	<div class="field">
		<label for="df-player">Player</label>
		<select id="df-player" bind:value={playerId}>
			{#each players as p}<option value={p.id}>{p.name}</option>{/each}
		</select>
	</div>

	<div class="field">
		<label for="df-cmd">Commander Name</label>
		<div class="search-row">
			<div class="autocomplete-wrap">
				<input id="df-cmd" type="text" bind:value={commanderName}
					oninput={handleInput}
					onfocus={() => (showSuggestions = suggestions.length > 0)}
					onblur={() => setTimeout(() => (showSuggestions = false), 200)}
					placeholder="e.g. Atraxa, Grand Unifier" required />
				{#if showSuggestions}
					<ul class="suggestions">
						{#each suggestions.slice(0, 8) as s}
							<li><button type="button" onmousedown={() => selectSuggestion(s)}>{s}</button></li>
						{/each}
					</ul>
				{/if}
			</div>
			<Button variant="ghost" size="sm" onclick={searchCard} disabled={searching}>
				{#snippet children()}{#if searching}…{:else}<Icon name="search" size={16} />{/if}{/snippet}
			</Button>
		</div>
	</div>

	<div class="field">
		<span class="field-label">Colors</span>
		<div class="color-row">
			{#each allColors as c}
				<button type="button" class="color-pill" class:active={colors.includes(c)} onclick={() => toggleColor(c)}>
					<ColorPip color={c} size={28} active={colors.includes(c)} />
				</button>
			{/each}
		</div>
	</div>

	{#if commanderImageUrl}
		<img src={commanderImageUrl} alt={commanderName} class="preview" />
	{/if}

	<div class="actions">
		<Button variant="ghost" onclick={oncancel} {disabled}>{#snippet children()}Cancel{/snippet}</Button>
		<Button variant="primary" onclick={handleSubmit} disabled={!commanderName.trim() || !playerId || disabled}>
			{#snippet children()}{#if disabled}Saving…{:else}{deck ? 'Update' : 'Create'}{/if}{/snippet}
		</Button>
	</div>
</form>

<style>
	.form { display: flex; flex-direction: column; gap: var(--space-md); }
	.field { display: flex; flex-direction: column; gap: var(--space-xs); }
	label, .field-label { font-size: 0.85rem; font-weight: 600; color: var(--color-text-secondary); }
	select { width: 100%; }
	.search-row { display: flex; gap: var(--space-sm); }
	.autocomplete-wrap { flex: 1; position: relative; }
	.autocomplete-wrap input { width: 100%; }
	.suggestions { position: absolute; top: 100%; left: 0; right: 0; z-index: 100; background: var(--color-surface-elevated); border-radius: 0 0 var(--radius-md) var(--radius-md); list-style: none; max-height: 200px; overflow-y: auto; box-shadow: var(--shadow-md); }
	.suggestions button { display: block; width: 100%; text-align: left; padding: var(--space-sm) var(--space-md); font-size: 0.85rem; }
	.suggestions button:hover { background: var(--color-surface-hover); }
	.color-row { display: flex; gap: var(--space-sm); }
	.color-pill { padding: 4px; border-radius: var(--radius-full); border: 2px solid transparent; }
	.color-pill.active { border-color: var(--color-secondary); }
	.preview { width: 100%; max-width: 200px; border-radius: var(--radius-md); margin-top: var(--space-sm); }
	.actions { display: flex; justify-content: flex-end; gap: var(--space-sm); margin-top: var(--space-md); }
</style>


