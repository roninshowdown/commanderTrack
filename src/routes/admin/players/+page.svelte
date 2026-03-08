<script lang="ts">
	import { onMount } from 'svelte';
	import type { Player } from '$lib/models/types';
	import { getDataService } from '$lib/services/data-service';
	import PlayerForm from '$lib/components/admin/PlayerForm.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';

	let players = $state<Player[]>([]);
	let loading = $state(true);
	let showForm = $state(false);
	let editingPlayer = $state<Player | null>(null);
	let toast = $state<{ message: string; type: 'success' | 'error' } | null>(null);

	onMount(loadPlayers);

	async function loadPlayers() {
		loading = true;
		try {
			const ds = await getDataService();
			players = await ds.getPlayers();
		} catch (e) {
			toast = { message: 'Failed to load players', type: 'error' };
		}
		loading = false;
	}

	function openCreate() {
		editingPlayer = null;
		showForm = true;
	}

	function openEdit(player: Player) {
		editingPlayer = player;
		showForm = true;
	}

	async function handleSave(data: Omit<Player, 'id'>) {
		try {
			const ds = await getDataService();
			if (editingPlayer) {
				await ds.updatePlayer(editingPlayer.id, data);
				toast = { message: 'Player updated', type: 'success' };
			} else {
				await ds.createPlayer(data);
				toast = { message: 'Player created', type: 'success' };
			}
			showForm = false;
			await loadPlayers();
		} catch (e) {
			toast = { message: 'Failed to save player', type: 'error' };
		}
	}

	async function handleDelete(player: Player) {
		if (!confirm(`Delete "${player.name}" and all their decks?`)) return;
		try {
			const ds = await getDataService();
			await ds.deletePlayer(player.id);
			toast = { message: 'Player deleted', type: 'success' };
			await loadPlayers();
		} catch (e) {
			toast = { message: 'Failed to delete player', type: 'error' };
		}
	}
</script>

<div class="page">
	<div class="page-header">
		<div>
			<h1>Players</h1>
			<a href="/admin" class="back-link">← Back to Admin</a>
		</div>
		<Button variant="primary" onclick={openCreate}>
			{#snippet children()}+ Add Player{/snippet}
		</Button>
	</div>

	{#if loading}
		<div class="loading">Loading...</div>
	{:else if players.length === 0}
		<div class="empty">
			<p>No players yet. Add your first player!</p>
		</div>
	{:else}
		<div class="player-list">
			{#each players as player (player.id)}
				<div class="player-card animate-fade-in">
					{#if player.imageUrl}
						<img src={player.imageUrl} alt={player.name} class="player-img" />
					{:else}
						<div class="player-img placeholder">👤</div>
					{/if}
					<div class="player-info">
						<span class="player-name">{player.name}</span>
					</div>
					<div class="player-actions">
						<Button variant="ghost" size="sm" onclick={() => openEdit(player)}>
							{#snippet children()}✏️{/snippet}
						</Button>
						<Button variant="ghost" size="sm" onclick={() => handleDelete(player)}>
							{#snippet children()}🗑️{/snippet}
						</Button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<Modal bind:open={showForm} title={editingPlayer ? 'Edit Player' : 'New Player'}>
	{#snippet children()}
	<PlayerForm
		player={editingPlayer}
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
		font-size: 1.8rem;
		font-weight: 800;
	}

	.back-link {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}

	.loading, .empty {
		text-align: center;
		padding: var(--space-2xl);
		color: var(--color-text-secondary);
	}

	.player-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.player-card {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md);
		background: var(--color-surface);
		border-radius: var(--radius-md);
		transition: background var(--transition-fast);
	}

	.player-card:hover {
		background: var(--color-surface-elevated);
	}

	.player-img {
		width: 48px;
		height: 48px;
		border-radius: var(--radius-full);
		object-fit: cover;
	}

	.player-img.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-surface-elevated);
		font-size: 1.5rem;
	}

	.player-info {
		flex: 1;
	}

	.player-name {
		font-weight: 600;
	}

	.player-actions {
		display: flex;
		gap: var(--space-xs);
	}
</style>


