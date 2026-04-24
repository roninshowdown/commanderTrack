 A<script lang="ts">
	import type { Deck, Player, MtgColor } from '$lib/models/types';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ManaIcon from '$lib/components/ui/ManaIcon.svelte';
	import { searchCommander, autocompleteCardName } from '$lib/services/scryfall';

	interface Props {
		deck?: Deck | null; players: Player[];
		onsave: (data: Omit<Deck, 'id'>) => void | Promise<void>;
		oncancel: () => void; disabled?: boolean;
	}
	let { deck = null, players, onsave, oncancel, disabled = false }: Props = $props();

	/* svelte-ignore state_referenced_locally — form fields intentionally capture initial prop values */
	let playerId: string = $state(deck?.playerId ?? (players[0]?.id ?? ''));
	let commanderName: string = $state(deck?.commanderName ?? '');
	let commanderImageUrl: string = $state(deck?.commanderImageUrl ?? '');
	let colors: MtgColor[] = $state(deck?.colors ?? []);
	let searching: boolean = $state(false);
	let suggestions: string[] = $state([]);
	let showSuggestions: boolean = $state(false);

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
		<span class="field-label">Colors <span class="color-hint">(derived from commander)</span></span>
		<div class="color-row">
			{#each (['white','blue','black','red','green'] as const) as c}
				<span class="color-pip-wrap" class:inactive={!colors.includes(c)}>
					<ManaIcon color={c} size={36} />
				</span>
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
	.color-pip-wrap { transition: opacity 0.2s; }
	.color-pip-wrap.inactive { opacity: 0.2; filter: grayscale(0.8); }
	.color-hint { font-size: 0.7rem; color: var(--color-text-muted); font-weight: 400; }
	.preview { width: 100%; max-width: 200px; border-radius: var(--radius-md); margin-top: var(--space-sm); }
	.actions { display: flex; justify-content: flex-end; gap: var(--space-sm); margin-top: var(--space-md); }
</style>


