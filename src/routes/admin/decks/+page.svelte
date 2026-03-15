<script lang="ts">
	import { onMount } from 'svelte';
	import type { Player, Deck } from '$lib/models/types';
	import { getDataService } from '$lib/services/data-service';
	import DeckForm from '$lib/components/admin/DeckForm.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ColorPip from '$lib/components/ui/ColorPip.svelte';

	let players = $state<Player[]>([]);
	let decks = $state<Deck[]>([]);
	let loading = $state(true);
	let showForm = $state(false);
	let editingDeck = $state<Deck | null>(null);
	let toast = $state<{ message: string; type: 'success' | 'error' } | null>(null);


	onMount(loadData);

	async function loadData() {
		loading = true;
		try {
			const ds = await getDataService();
			[players, decks] = await Promise.all([ds.getPlayers(), ds.getDecks()]);
		} catch (e) {
			toast = { message: 'Failed to load data', type: 'error' };
		}
		loading = false;
	}

	function getPlayerName(playerId: string): string {
		return players.find((p) => p.id === playerId)?.name ?? 'Unknown';
	}

	function openCreate() {
		editingDeck = null;
		showForm = true;
	}

	function openEdit(deck: Deck) {
		editingDeck = deck;
		showForm = true;
	}

	async function handleSave(data: Omit<Deck, 'id'>) {
		try {
			const ds = await getDataService();
			if (editingDeck) {
				await ds.updateDeck(editingDeck.id, data);
				toast = { message: 'Deck updated', type: 'success' };
			} else {
				await ds.createDeck(data);
				toast = { message: 'Deck created', type: 'success' };
			}
			showForm = false;
			await loadData();
		} catch (e) {
			toast = { message: 'Failed to save deck', type: 'error' };
		}
	}

	async function handleDelete(deck: Deck) {
		if (!confirm(`Delete deck "${deck.commanderName}"?`)) return;
		try {
			const ds = await getDataService();
			await ds.deleteDeck(deck.id);
			toast = { message: 'Deck deleted', type: 'success' };
			await loadData();
		} catch (e) {
			toast = { message: 'Failed to delete deck', type: 'error' };
		}
	}
</script>

<div class="page">
	<div class="page-header">
		<div>
			<h1>Decks</h1>
			<a href="/admin" class="back-link">← Back to Admin</a>
		</div>
		<Button variant="primary" onclick={openCreate} disabled={players.length === 0}>
			{#snippet children()}+ Add Deck{/snippet}
		</Button>
	</div>

	{#if loading}
		<div class="loading">Loading...</div>
	{:else if players.length === 0}
		<div class="empty">
			<p>Add players first before creating decks.</p>
			<a href="/admin/players">
				<Button variant="primary" size="sm">
					{#snippet children()}Go to Players{/snippet}
				</Button>
			</a>
		</div>
	{:else if decks.length === 0}
		<div class="empty">
			<p>No decks yet. Add your first deck!</p>
		</div>
	{:else}
		<div class="deck-list">
			{#each decks as deck (deck.id)}
				<div class="deck-card animate-fade-in">
					{#if deck.commanderImageUrl}
						<img src={deck.commanderImageUrl} alt={deck.commanderName} class="deck-img" />
					{:else}
						<div class="deck-img placeholder"><Icon name="deck" size={24} color="var(--color-text-muted)" /></div>
					{/if}
					<div class="deck-info">
						<span class="deck-commander">{deck.commanderName}</span>
						<span class="deck-player">{getPlayerName(deck.playerId)}</span>
						<div class="deck-colors">
							{#each deck.colors as color}
								<ColorPip {color} size={18} />
							{/each}
						</div>
					</div>
					<div class="deck-actions">
						<Button variant="ghost" size="sm" onclick={() => openEdit(deck)}>
							{#snippet children()}<Icon name="edit" size={16} />{/snippet}
						</Button>
						<Button variant="ghost" size="sm" onclick={() => handleDelete(deck)}>
							{#snippet children()}<Icon name="trash" size={16} />{/snippet}
						</Button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<Modal bind:open={showForm} title={editingDeck ? 'Edit Deck' : 'New Deck'}>
	{#snippet children()}
	<DeckForm
		deck={editingDeck}
		{players}
		onsave={handleSave}
		oncancel={() => showForm = false}
	/>
	{/snippet}
</Modal>

{#if toast}
	<Toast message={toast.message} type={toast.type} onclose={() => toast = null} />
{/if}

<style>
	.page {
		padding-top: var(--space-lg);
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: var(--space-xl);
	}

	h1 {
		font-size: 1.4rem;
		font-weight: 900;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-primary);
	}

	.back-link {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		letter-spacing: 0.04em;
	}

	.loading, .empty {
		text-align: center;
		padding: var(--space-2xl);
		color: var(--color-text-muted);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-md);
		font-size: 0.85rem;
	}

	.deck-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.deck-card {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-elevated);
		border-radius: var(--radius-lg);
		transition: all var(--transition-fast);
	}

	.deck-card:hover {
		border-color: var(--neon-cyan);
	}

	.deck-img {
		width: 64px;
		height: 48px;
		border-radius: var(--radius-sm);
		object-fit: cover;
		border: 1px solid var(--color-surface-elevated);
	}

	.deck-img.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-surface-elevated);
		font-size: 1.5rem;
	}

	.deck-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.deck-commander {
		font-weight: 700;
		font-size: 0.85rem;
		letter-spacing: 0.03em;
	}

	.deck-player {
		font-size: 0.7rem;
		color: var(--color-text-muted);
	}

	.deck-colors {
		display: flex;
		gap: 4px;
		margin-top: 2px;
	}

	.deck-actions {
		display: flex;
		gap: var(--space-xs);
	}
</style>


