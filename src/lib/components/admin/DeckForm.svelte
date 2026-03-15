<script lang="ts">
	import type { Deck, Player, MtgColor } from '$lib/models/types';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ColorPip from '$lib/components/ui/ColorPip.svelte';
	import { searchCommander, autocompleteCardName } from '$lib/services/scryfall';

	interface Props {
		deck?: Deck | null;
		players: Player[];
		onsave: (data: Omit<Deck, 'id'>) => void;
		oncancel: () => void;
	}

	let { deck = null, players, onsave, oncancel }: Props = $props();

	let playerId = $state(deck?.playerId ?? (players[0]?.id ?? ''));
	let commanderName = $state(deck?.commanderName ?? '');
	let commanderImageUrl = $state(deck?.commanderImageUrl ?? '');
	let colors = $state<MtgColor[]>(deck?.colors ?? []);
	let searching = $state(false);
	let suggestions = $state<string[]>([]);
	let showSuggestions = $state(false);

	const allColors: MtgColor[] = ['white', 'blue', 'black', 'red', 'green'];

	async function searchCard() {
		if (!commanderName.trim()) return;
		searching = true;
		const result = await searchCommander(commanderName);
		if (result) {
			commanderName = result.name;
			commanderImageUrl = result.imageUrl;
			colors = result.colors;
		}
		searching = false;
	}

	async function handleInput() {
		if (commanderName.length >= 2) {
			suggestions = await autocompleteCardName(commanderName);
			showSuggestions = suggestions.length > 0;
		} else {
			showSuggestions = false;
		}
	}

	function selectSuggestion(name: string) {
		commanderName = name;
		showSuggestions = false;
		searchCard();
	}

	function toggleColor(color: MtgColor) {
		if (colors.includes(color)) {
			colors = colors.filter((c) => c !== color);
		} else {
			colors = [...colors, color];
		}
	}

	function handleSubmit() {
		if (!commanderName.trim() || !playerId) return;
		onsave({
			playerId,
			commanderName: commanderName.trim(),
			commanderImageUrl,
			colors
		});
	}
</script>

<form class="form" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
	<div class="field">
		<label for="deck-player">Player</label>
		<select id="deck-player" bind:value={playerId}>
			{#each players as p}
				<option value={p.id}>{p.name}</option>
			{/each}
		</select>
	</div>

	<div class="field">
		<label for="deck-commander">Commander Name</label>
		<div class="search-row">
			<div class="autocomplete-wrapper">
				<input
					id="deck-commander"
					type="text"
					bind:value={commanderName}
					oninput={handleInput}
					onfocus={() => showSuggestions = suggestions.length > 0}
					onblur={() => setTimeout(() => showSuggestions = false, 200)}
					placeholder="e.g. Atraxa, Grand Unifier"
					required
				/>
				{#if showSuggestions}
					<ul class="suggestions">
						{#each suggestions.slice(0, 8) as s}
							<li>
								<button type="button" onmousedown={() => selectSuggestion(s)}>{s}</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
			<Button variant="ghost" size="sm" onclick={searchCard} disabled={searching}>
				{#snippet children()}{#if searching}...{:else}<Icon name="search" size={16} />{/if}{/snippet}
			</Button>
		</div>
	</div>

	<div class="field">
		<span class="field-label">Colors</span>
		<div class="color-pills">
			{#each allColors as color}
				<button
					type="button"
					class="color-pill"
					class:active={colors.includes(color)}
					onclick={() => toggleColor(color)}
				>
					<ColorPip {color} size={28} active={colors.includes(color)} />
				</button>
			{/each}
		</div>
	</div>

	{#if commanderImageUrl}
		<img src={commanderImageUrl} alt={commanderName} class="preview" />
	{/if}

	<div class="actions">
		<Button variant="ghost" onclick={oncancel}>
			{#snippet children()}Cancel{/snippet}
		</Button>
		<Button variant="primary" onclick={handleSubmit}>
			{#snippet children()}{deck ? 'Update' : 'Create'}{/snippet}
		</Button>
	</div>
</form>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	label, .field-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	select {
		width: 100%;
	}

	.search-row {
		display: flex;
		gap: var(--space-sm);
	}

	.autocomplete-wrapper {
		flex: 1;
		position: relative;
	}

	.autocomplete-wrapper input {
		width: 100%;
	}

	.suggestions {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: var(--color-surface-elevated);
		border-radius: 0 0 var(--radius-md) var(--radius-md);
		list-style: none;
		z-index: 100;
		max-height: 200px;
		overflow-y: auto;
		box-shadow: var(--shadow-md);
	}

	.suggestions button {
		display: block;
		width: 100%;
		text-align: left;
		padding: var(--space-sm) var(--space-md);
		font-size: 0.85rem;
		transition: background var(--transition-fast);
	}

	.suggestions button:hover {
		background: var(--color-surface-hover);
	}

	.color-pills {
		display: flex;
		gap: var(--space-sm);
	}

	.color-pill {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-full);
		background: var(--color-surface-elevated);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.2rem;
		transition: all var(--transition-fast);
		border: 2px solid transparent;
	}

	.color-pill.active {
		border-color: var(--color-primary);
		background: var(--color-surface-hover);
	}

	.preview {
		width: 100%;
		max-width: 300px;
		border-radius: var(--radius-md);
		align-self: center;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-sm);
		margin-top: var(--space-md);
	}
</style>

