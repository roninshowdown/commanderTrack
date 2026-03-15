<script lang="ts">
	import { onMount } from 'svelte';
	import type { Deck, Player } from '$lib/models/types';
	import { getDataService } from '$lib/services/data-service';
	import DeckForm from '$lib/components/admin/DeckForm.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ColorPip from '$lib/components/ui/ColorPip.svelte';

	let decks: Deck[] = $state([]);
	let players: Player[] = $state([]);
	let loading: boolean = $state(true);
	let showForm: boolean = $state(false);
	let editingDeck: Deck | null = $state(null);
	let toast: { message: string; type: 'success' | 'error' } | null = $state(null);
	let saving: boolean = $state(false);

	onMount(load);

	async function load() {
		loading = true;
		try { const ds = await getDataService(); [players, decks] = await Promise.all([ds.getPlayers(), ds.getDecks()]); }
		catch (e: any) { toast = { message: `Load failed: ${e?.message ?? e}`, type: 'error' }; }
		loading = false;
	}

	function openCreate() { editingDeck = null; showForm = true; }
	function openEdit(d: Deck) { editingDeck = d; showForm = true; }
	function playerName(id: string) { return players.find((p) => p.id === id)?.name ?? '?'; }

	async function handleSave(data: Omit<Deck, 'id'>) {
		saving = true;
		try {
			const ds = await getDataService();
			if (editingDeck) { await ds.updateDeck(editingDeck.id, data); toast = { message: 'Deck updated', type: 'success' }; }
			else { await ds.createDeck(data); toast = { message: 'Deck created', type: 'success' }; }
			showForm = false; await load();
		} catch (e: any) { toast = { message: `Save failed: ${e?.message ?? e}`, type: 'error' }; }
		finally { saving = false; }
	}

	async function handleDelete(d: Deck) {
		if (!confirm(`Delete deck "${d.commanderName}"?`)) return;
		try { const ds = await getDataService(); await ds.deleteDeck(d.id); toast = { message: 'Deleted', type: 'success' }; await load(); }
		catch (e: any) { toast = { message: `Delete failed: ${e?.message ?? e}`, type: 'error' }; }
	}
</script>

<div class="page">
	<div class="hdr"><div><h1>Decks</h1><a href="/admin" class="back">← Admin</a></div>
		{#if players.length}<Button variant="primary" onclick={openCreate}>{#snippet children()}+ Add Deck{/snippet}</Button>{/if}
	</div>
	{#if loading}<div class="empty">Loading…</div>
	{:else if !players.length}<div class="empty">Add players first before creating decks.</div>
	{:else if !decks.length}<div class="empty">No decks yet.</div>
	{:else}
		<div class="list">{#each decks as d (d.id)}
			<div class="card animate-fade-in">
				{#if d.commanderImageUrl}<img src={d.commanderImageUrl} alt={d.commanderName} class="img" />{:else}<div class="img ph"><Icon name="deck" size={20} color="var(--color-text-muted)" /></div>{/if}
				<div class="info">
					<span class="cmd">{d.commanderName}</span>
					<span class="owner">{playerName(d.playerId)}</span>
					<div class="pips">{#each d.colors as c}<ColorPip color={c} size={14} />{/each}</div>
				</div>
				<div class="actions">
					<Button variant="ghost" size="sm" onclick={() => openEdit(d)}>{#snippet children()}<Icon name="edit" size={16} />{/snippet}</Button>
					<Button variant="ghost" size="sm" onclick={() => handleDelete(d)}>{#snippet children()}<Icon name="trash" size={16} />{/snippet}</Button>
				</div>
			</div>
		{/each}</div>
	{/if}
</div>

<Modal bind:open={showForm} title={editingDeck ? 'Edit Deck' : 'New Deck'}>
	{#snippet children()}<DeckForm deck={editingDeck} {players} onsave={handleSave} oncancel={() => (showForm = false)} disabled={saving} />{/snippet}
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
	.img{width:56px;height:42px;border-radius:var(--radius-sm);object-fit:cover}
	.img.ph{display:flex;align-items:center;justify-content:center;background:var(--color-surface-elevated)}
	.info{flex:1;display:flex;flex-direction:column;gap:2px}
	.cmd{font-weight:700;font-size:.8rem}.owner{font-size:.65rem;color:var(--color-text-muted)}
	.pips{display:flex;gap:3px;margin-top:2px}
	.actions{display:flex;gap:var(--space-xs)}
</style>


