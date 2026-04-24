<script lang="ts">
	import { onMount } from 'svelte';
	import type { Deck, AccountProfile, MtgColor } from '$lib/models/types';
	import { authUser } from '$lib/firebase/auth';
	import { isDebugMode } from '$lib/utils/env';
	import { getDataService } from '$lib/services/data-service';
	import { uploadPlayerImage } from '$lib/firebase/storage';
	import { isFirebaseConfigured } from '$lib/services/data-service';
	import { searchCommander, autocompleteCardName } from '$lib/services/scryfall';
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ManaIcon from '$lib/components/ui/ManaIcon.svelte';
	import LogViewer from '$lib/components/ui/LogViewer.svelte';

	const devMode = isDebugMode();
	let user = $derived($authUser);
	let userUid = $derived(user?.uid ?? '');

	let profile: AccountProfile | null = $state(null);
	let decks: Deck[] = $state([]);
	let loading: boolean = $state(true);
	let toast: { message: string; type: 'success' | 'error' } | null = $state(null);

	/* ── Profile state ── */
	let imageUrl: string = $state('');
	let selectedFile: File | null = $state(null);
	let previewUrl: string = $state('');
	let savingProfile: boolean = $state(false);

	/* ── Deck form state ── */
	let showDeckForm: boolean = $state(false);
	let editingDeck: Deck | null = $state(null);
	let deckName: string = $state('');
	let deckImage: string = $state('');
	let deckColors: MtgColor[] = $state([]);
	let deckSearching: boolean = $state(false);
	let deckSuggestions: string[] = $state([]);
	let showSuggestions: boolean = $state(false);
	let savingDeck: boolean = $state(false);


	onMount(loadData);

	async function loadData() {
		loading = true;
		try {
			const ds = await getDataService();
			profile = await ds.getAccountProfile(userUid);
			decks = await ds.getDecksForPlayer(userUid);
			imageUrl = profile?.imageUrl ?? user?.photoURL ?? '';
			previewUrl = imageUrl;
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : String(e);
			toast = { message: `Load failed: ${msg}`, type: 'error' };
		}
		loading = false;
	}

	function onFileChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		selectedFile = file;
		previewUrl = URL.createObjectURL(file);
	}

	function toBase64(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const r = new FileReader();
			r.onload = () => resolve(r.result as string);
			r.onerror = reject;
			r.readAsDataURL(file);
		});
	}

	async function saveProfile() {
		savingProfile = true;
		try {
			if (!userUid) throw new Error('Missing authenticated user id');
			let finalImage = profile?.imageUrl ?? undefined;
			if (selectedFile) {
				finalImage = (devMode || !isFirebaseConfigured())
					? await toBase64(selectedFile)
					: await uploadPlayerImage(selectedFile, userUid);
			}
			const ds = await getDataService();
			await ds.upsertAccountProfile(userUid, { imageUrl: finalImage });
			profile = { imageUrl: finalImage };
			imageUrl = finalImage ?? '';
			previewUrl = finalImage ?? '';
			selectedFile = null;
			toast = { message: 'Profile updated', type: 'success' };
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : String(e);
			toast = { message: `Save failed: ${msg}`, type: 'error' };
		}
		savingProfile = false;
	}

	/* ── Deck CRUD ── */
	function openCreateDeck() {
		editingDeck = null;
		deckName = '';
		deckImage = '';
		deckColors = [];
		showDeckForm = true;
	}
	function openEditDeck(d: Deck) {
		editingDeck = d;
		deckName = d.commanderName;
		deckImage = d.commanderImageUrl;
		deckColors = [...d.colors];
		showDeckForm = true;
	}

	async function searchCard() {
		if (!deckName.trim()) return;
		deckSearching = true;
		const r = await searchCommander(deckName);
		if (r) { deckName = r.name; deckImage = r.imageUrl; deckColors = r.colors; }
		deckSearching = false;
	}
	async function handleDeckInput() {
		if (deckName.length >= 2) {
			deckSuggestions = await autocompleteCardName(deckName);
			showSuggestions = deckSuggestions.length > 0;
		} else showSuggestions = false;
	}
	function selectSuggestion(n: string) { deckName = n; showSuggestions = false; searchCard(); }

	async function saveDeck() {
		if (!deckName.trim()) return;
		savingDeck = true;
		try {
			const ds = await getDataService();
			const data = { playerId: userUid, commanderName: deckName.trim(), commanderImageUrl: deckImage, colors: deckColors };
			if (editingDeck) {
				await ds.updateDeck(editingDeck.id, data);
				toast = { message: 'Deck updated', type: 'success' };
			} else {
				await ds.createDeck(data);
				toast = { message: 'Deck created', type: 'success' };
			}
			showDeckForm = false;
			decks = await ds.getDecksForPlayer(userUid);
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : String(e);
			toast = { message: `Save failed: ${msg}`, type: 'error' };
		}
		savingDeck = false;
	}

	async function deleteDeck(d: Deck) {
		if (!confirm(`Delete deck "${d.commanderName}"?`)) return;
		try {
			const ds = await getDataService();
			await ds.deleteDeck(d.id);
			toast = { message: 'Deleted', type: 'success' };
			decks = await ds.getDecksForPlayer(userUid);
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : String(e);
			toast = { message: `Delete failed: ${msg}`, type: 'error' };
		}
	}
</script>

<div class="profile-page">
	<h1>Profile</h1>

	{#if loading}
		<div class="empty">Loading…</div>
	{:else}
		<!-- Profile Image Section -->
		<section class="sec">
			<h2>Avatar</h2>
			<div class="avatar-section">
				{#if previewUrl}
					<img src={previewUrl} alt="Avatar" class="avatar-preview" />
				{:else}
					<div class="avatar-preview placeholder"><Icon name="user" size={40} color="var(--color-text-muted)" /></div>
				{/if}
				<div class="avatar-controls">
					<div class="field">
						<label for="pf-upload">Upload Image</label>
						<input id="pf-upload" type="file" accept="image/jpeg,image/png,image/gif,image/webp" onchange={onFileChange} />
					</div>
					<Button variant="primary" size="sm" onclick={saveProfile} disabled={savingProfile}>
						{#snippet children()}{savingProfile ? 'Saving…' : 'Save Avatar'}{/snippet}
					</Button>
				</div>
			</div>
		</section>

		<!-- Decks Section -->
		<section class="sec">
			<div class="sec-hdr">
				<h2>My Decks</h2>
				<Button variant="primary" size="sm" onclick={openCreateDeck}>
					{#snippet children()}+ Add Deck{/snippet}
				</Button>
			</div>
			{#if !decks.length}
				<div class="empty">No decks yet. Add your first commander deck!</div>
			{:else}
				<div class="list">
					{#each decks as d (d.id)}
						<div class="card animate-fade-in">
							{#if d.commanderImageUrl}<img src={d.commanderImageUrl} alt={d.commanderName} class="deck-img" />
							{:else}<div class="deck-img ph"><Icon name="deck" size={20} color="var(--color-text-muted)" /></div>{/if}
							<div class="info">
								<span class="cmd">{d.commanderName}</span>
								<div class="pips">{#each d.colors as c}<ManaIcon color={c} size={18} />{/each}</div>
							</div>
							<div class="actions">
								<Button variant="ghost" size="sm" onclick={() => openEditDeck(d)}>{#snippet children()}<Icon name="edit" size={16} />{/snippet}</Button>
								<Button variant="ghost" size="sm" onclick={() => deleteDeck(d)}>{#snippet children()}<Icon name="trash" size={16} />{/snippet}</Button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		{#if devMode}
			<LogViewer />
		{/if}
	{/if}
</div>

<!-- Deck Form Modal -->
<Modal bind:open={showDeckForm} title={editingDeck ? 'Edit Deck' : 'New Deck'}>
	{#snippet children()}
		<form class="form" onsubmit={(e) => { e.preventDefault(); saveDeck(); }}>
			<div class="field">
				<label for="df-cmd">Commander Name</label>
				<div class="search-row">
					<div class="autocomplete-wrap">
						<input id="df-cmd" type="text" bind:value={deckName}
							oninput={handleDeckInput}
							onfocus={() => (showSuggestions = deckSuggestions.length > 0)}
							onblur={() => setTimeout(() => (showSuggestions = false), 200)}
							placeholder="e.g. Atraxa, Grand Unifier" required />
						{#if showSuggestions}
							<ul class="suggestions">
								{#each deckSuggestions.slice(0, 8) as s}
									<li><button type="button" onmousedown={() => selectSuggestion(s)}>{s}</button></li>
								{/each}
							</ul>
						{/if}
					</div>
					<Button variant="ghost" size="sm" onclick={searchCard} disabled={deckSearching}>
						{#snippet children()}{#if deckSearching}…{:else}<Icon name="search" size={16} />{/if}{/snippet}
					</Button>
				</div>
			</div>
			<div class="field">
				<span class="field-label">Colors <span class="color-hint">(derived from commander)</span></span>
				<div class="color-row">
					{#each (['white','blue','black','red','green'] as const) as c}
						<span class="color-pip-wrap" class:inactive={!deckColors.includes(c)}>
							<ManaIcon color={c} size={36} />
						</span>
					{/each}
				</div>
			</div>
			{#if deckImage}<img src={deckImage} alt={deckName} class="preview" />{/if}
			<div class="form-actions">
				<Button variant="ghost" onclick={() => (showDeckForm = false)} disabled={savingDeck}>{#snippet children()}Cancel{/snippet}</Button>
				<Button variant="primary" onclick={saveDeck} disabled={!deckName.trim() || savingDeck}>
					{#snippet children()}{savingDeck ? 'Saving…' : (editingDeck ? 'Update' : 'Create')}{/snippet}
				</Button>
			</div>
		</form>
	{/snippet}
</Modal>

{#if toast}<Toast message={toast.message} type={toast.type} onclose={() => (toast = null)} />{/if}

<style>
	.profile-page { padding-top: var(--space-md); }
	h1 { font-size: 1.4rem; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; color: var(--color-primary); margin-bottom: var(--space-xl); }
	.sec { margin-bottom: var(--space-xl); }
	h2 { font-size: .75rem; font-weight: 800; margin-bottom: var(--space-md); color: var(--color-secondary); text-transform: uppercase; letter-spacing: .1em; }
	.sec-hdr { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md); }
	.avatar-section { display: flex; gap: var(--space-lg); align-items: flex-start; flex-wrap: wrap; }
	.avatar-preview { width: 96px; height: 96px; border-radius: var(--radius-full); object-fit: cover; border: 2px solid var(--color-surface-elevated); flex-shrink: 0; }
	.avatar-preview.placeholder { display: flex; align-items: center; justify-content: center; background: var(--color-surface); }
	.avatar-controls { flex: 1; display: flex; flex-direction: column; gap: var(--space-sm); min-width: 200px; }
	.empty { text-align: center; padding: var(--space-2xl); color: var(--color-text-muted); font-size: .85rem; }
	.list { display: flex; flex-direction: column; gap: var(--space-sm); }
	.card { display: flex; align-items: center; gap: var(--space-md); padding: var(--space-md); background: var(--color-surface); border: 1px solid var(--color-surface-elevated); border-radius: var(--radius-lg); transition: all var(--transition-fast); }
	.card:hover { border-color: var(--neon-cyan); }
	.deck-img { width: 56px; height: 42px; border-radius: var(--radius-sm); object-fit: cover; }
	.deck-img.ph { display: flex; align-items: center; justify-content: center; background: var(--color-surface-elevated); }
	.info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
	.cmd { font-weight: 700; font-size: .8rem; }
	.pips { display: flex; gap: 3px; margin-top: 2px; }
	.actions { display: flex; gap: var(--space-xs); }
	.field { display: flex; flex-direction: column; gap: var(--space-xs); }
	.field label, .field-label { font-size: .85rem; font-weight: 600; color: var(--color-text-secondary); }
	input[type='file'] { font-size: .8rem; padding: var(--space-sm); }
	.form { display: flex; flex-direction: column; gap: var(--space-md); }
	.search-row { display: flex; gap: var(--space-sm); }
	.autocomplete-wrap { flex: 1; position: relative; }
	.autocomplete-wrap input { width: 100%; }
	.suggestions { position: absolute; top: 100%; left: 0; right: 0; z-index: 100; background: var(--color-surface-elevated); border-radius: 0 0 var(--radius-md) var(--radius-md); list-style: none; max-height: 200px; overflow-y: auto; box-shadow: var(--shadow-md); }
	.suggestions button { display: block; width: 100%; text-align: left; padding: var(--space-sm) var(--space-md); font-size: .85rem; }
	.suggestions button:hover { background: var(--color-surface-hover); }
	.color-row { display: flex; gap: var(--space-sm); }
	.color-pip-wrap { transition: opacity 0.2s; }
	.color-pip-wrap.inactive { opacity: 0.2; filter: grayscale(0.8); }
	.color-hint { font-size: 0.7rem; color: var(--color-text-muted); font-weight: 400; }
	.preview { width: 100%; max-width: 200px; border-radius: var(--radius-md); margin-top: var(--space-sm); }
	.form-actions { display: flex; justify-content: flex-end; gap: var(--space-sm); margin-top: var(--space-md); }
</style>

