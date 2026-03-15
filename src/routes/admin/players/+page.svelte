<script lang="ts">
	import { onMount } from 'svelte';
	import type { Player } from '$lib/models/types';
	import { getDataService } from '$lib/services/data-service';
	import PlayerForm from '$lib/components/admin/PlayerForm.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	let players: Player[] = $state([]);
	let loading: boolean = $state(true);
	let showForm: boolean = $state(false);
	let editingPlayer: Player | null = $state(null);
	let toast: { message: string; type: 'success' | 'error' } | null = $state(null);
	let saving: boolean = $state(false);

	onMount(loadPlayers);

	async function loadPlayers() {
		loading = true;
		try { const ds = await getDataService(); players = await ds.getPlayers(); }
		catch (e: any) { toast = { message: `Load failed: ${e?.message ?? e}`, type: 'error' }; }
		loading = false;
	}

	function openCreate() { editingPlayer = null; showForm = true; }
	function openEdit(p: Player) { editingPlayer = p; showForm = true; }

	async function handleSave(data: Omit<Player, 'id'>) {
		const dup = players.find((p) => p.name.toLowerCase() === data.name.toLowerCase() && p.id !== editingPlayer?.id);
		if (dup) { toast = { message: `"${data.name}" already exists`, type: 'error' }; return; }
		saving = true;
		try {
			const ds = await getDataService();
			if (editingPlayer) { await ds.updatePlayer(editingPlayer.id, data); toast = { message: 'Player updated', type: 'success' }; }
			else { await ds.createPlayer(data); toast = { message: 'Player created', type: 'success' }; }
			showForm = false;
			await loadPlayers();
		} catch (e: any) { toast = { message: `Save failed: ${e?.message ?? e}`, type: 'error' }; }
		finally { saving = false; }
	}

	async function handleDelete(p: Player) {
		if (!confirm(`Delete "${p.name}" and all their decks?`)) return;
		try { const ds = await getDataService(); await ds.deletePlayer(p.id); toast = { message: 'Deleted', type: 'success' }; await loadPlayers(); }
		catch (e: any) { toast = { message: `Delete failed: ${e?.message ?? e}`, type: 'error' }; }
	}
</script>

<div class="page">
	<div class="hdr"><div><h1>Players</h1><a href="/admin" class="back">← Admin</a></div>
		<Button variant="primary" onclick={openCreate}>{#snippet children()}+ Add Player{/snippet}</Button>
	</div>
	{#if loading}<div class="empty">Loading…</div>
	{:else if !players.length}<div class="empty">No players yet. Add your first player!</div>
	{:else}
		<div class="list">{#each players as p (p.id)}
			<div class="card animate-fade-in">
				{#if p.imageUrl}<img src={p.imageUrl} alt={p.name} class="img" />{:else}<div class="img ph"><Icon name="user" size={24} color="var(--color-text-muted)" /></div>{/if}
				<div class="info"><span class="name">{p.name}</span></div>
				<div class="actions">
					<Button variant="ghost" size="sm" onclick={() => openEdit(p)}>{#snippet children()}<Icon name="edit" size={16} />{/snippet}</Button>
					<Button variant="ghost" size="sm" onclick={() => handleDelete(p)}>{#snippet children()}<Icon name="trash" size={16} />{/snippet}</Button>
				</div>
			</div>
		{/each}</div>
	{/if}
</div>

<Modal bind:open={showForm} title={editingPlayer ? 'Edit Player' : 'New Player'}>
	{#snippet children()}<PlayerForm player={editingPlayer} onsave={handleSave} oncancel={() => (showForm = false)} disabled={saving} />{/snippet}
</Modal>

{#if toast}<Toast message={toast.message} type={toast.type} onclose={() => (toast = null)} />{/if}

<style>
	.page{padding-top:var(--space-md)}
	.hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-xl)}
	h1{font-size:1.4rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:var(--color-primary)}
	.back{font-size:.75rem;color:var(--color-text-muted)}
	.empty{text-align:center;padding:var(--space-2xl);color:var(--color-text-muted);font-size:.85rem}
	.list{display:flex;flex-direction:column;gap:var(--space-sm)}
	.card{display:flex;align-items:center;gap:var(--space-md);padding:var(--space-md);background:var(--color-surface);border:1px solid var(--color-surface-elevated);border-radius:var(--radius-lg);transition:all var(--transition-fast)}
	.card:hover{border-color:var(--neon-cyan)}
	.img{width:48px;height:48px;border-radius:var(--radius-full);object-fit:cover;border:1px solid var(--color-surface-elevated)}
	.img.ph{display:flex;align-items:center;justify-content:center;background:var(--color-surface-elevated)}
	.info{flex:1}.name{font-weight:700;font-size:.9rem;letter-spacing:.03em}
	.actions{display:flex;gap:var(--space-xs)}
</style>


