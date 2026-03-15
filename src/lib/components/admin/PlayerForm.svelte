<script lang="ts">
	import type { Player } from '$lib/models/types';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { searchCommander } from '$lib/services/scryfall';

	interface Props {
		player?: Player | null;
		onsave: (data: Omit<Player, 'id'>) => void;
		oncancel: () => void;
	}

	let { player = null, onsave, oncancel }: Props = $props();

	let name = $state(player?.name ?? '');
	let imageUrl = $state(player?.imageUrl ?? '');
	let searching = $state(false);

	async function searchImage() {
		if (!name.trim()) return;
		searching = true;
		const result = await searchCommander(name);
		if (result) {
			imageUrl = result.imageUrl;
		}
		searching = false;
	}

	function handleSubmit() {
		if (!name.trim()) return;
		onsave({ name: name.trim(), imageUrl: imageUrl || undefined });
	}
</script>

<form class="form" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
	<div class="field">
		<label for="player-name">Name</label>
		<input id="player-name" type="text" bind:value={name} placeholder="Player name" required />
	</div>

	<div class="field">
		<label for="player-image">Image URL</label>
		<div class="image-row">
			<input id="player-image" type="text" bind:value={imageUrl} placeholder="Image URL (optional)" />
			<Button variant="ghost" size="sm" onclick={searchImage} disabled={searching}>
				{#snippet children()}{#if searching}...{:else}<Icon name="search" size={16} />{/if}{/snippet}
			</Button>
		</div>
		{#if imageUrl}
			<img src={imageUrl} alt={name} class="preview" />
		{/if}
	</div>

	<div class="actions">
		<Button variant="ghost" onclick={oncancel}>
			{#snippet children()}Cancel{/snippet}
		</Button>
		<Button variant="primary" onclick={handleSubmit}>
			{#snippet children()}{player ? 'Update' : 'Create'}{/snippet}
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

	label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	.image-row {
		display: flex;
		gap: var(--space-sm);
	}

	.image-row input {
		flex: 1;
	}

	.preview {
		width: 100%;
		max-width: 200px;
		border-radius: var(--radius-md);
		margin-top: var(--space-sm);
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-sm);
		margin-top: var(--space-md);
	}
</style>

