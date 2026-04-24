<script lang="ts">
	import type { Player } from '$lib/models/types';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { searchCommander } from '$lib/services/scryfall';
	import { uploadPlayerImage } from '$lib/firebase/storage';
	import { isFirebaseConfigured } from '$lib/services/data-service';
	import { isDebugMode } from '$lib/utils/env';

	interface Props {
		player?: Player | null;
		onsave: (data: Omit<Player, 'id'>) => void | Promise<void>;
		oncancel: () => void;
		disabled?: boolean;
	}

	let { player = null, onsave, oncancel, disabled = false }: Props = $props();

	/* svelte-ignore state_referenced_locally — form fields intentionally capture initial prop values */
	let name: string = $state(player?.name ?? '');
	let imageUrl: string = $state(player?.imageUrl ?? '');
	let selectedFile: File | null = $state(null);
	let previewUrl: string = $state(player?.imageUrl ?? '');
	let searching: boolean = $state(false);
	let uploading: boolean = $state(false);

	/* Image file picked from device */
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

	async function resolveImage(): Promise<string | undefined> {
		if (selectedFile) {
			uploading = true;
			try {
				return (isDebugMode() || !isFirebaseConfigured())
					? await toBase64(selectedFile)
					: await uploadPlayerImage(selectedFile);
			} finally {
				uploading = false;
			}
		}
		return imageUrl || undefined;
	}

	/* Scryfall image search */
	async function searchImage() {
		if (!name.trim()) return;
		searching = true;
		const r = await searchCommander(name);
		if (r) { imageUrl = r.imageUrl; previewUrl = r.imageUrl; selectedFile = null; }
		searching = false;
	}

	async function handleSubmit() {
		if (!name.trim() || disabled || uploading) return;
		const finalImage = await resolveImage();
		await onsave({ name: name.trim(), imageUrl: finalImage });
	}
</script>

<form class="form" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
	<div class="field">
		<label for="pf-name">Name <span class="req">*</span></label>
		<input id="pf-name" type="text" bind:value={name} placeholder="Player name" required {disabled} />
	</div>

	<div class="field">
		<label for="pf-url">Image URL <span class="opt">(optional)</span></label>
		<div class="row">
			<input id="pf-url" type="text" bind:value={imageUrl} placeholder="https://…" {disabled}
				oninput={() => { previewUrl = imageUrl; selectedFile = null; }} />
			<Button variant="ghost" size="sm" onclick={searchImage} disabled={searching || disabled}>
				{#snippet children()}{#if searching}…{:else}<Icon name="search" size={16} />{/if}{/snippet}
			</Button>
		</div>
	</div>

	<div class="field">
		<label for="pf-upload">Upload Image <span class="opt">(optional)</span></label>
		<input id="pf-upload" type="file" accept="image/jpeg,image/png,image/gif,image/webp" onchange={onFileChange} {disabled} />
	</div>

	{#if previewUrl}
		<img src={previewUrl} alt={name} class="preview" />
	{/if}

	<div class="actions">
		<Button variant="ghost" onclick={oncancel} {disabled}>{#snippet children()}Cancel{/snippet}</Button>
		<Button variant="primary" onclick={handleSubmit} disabled={!name.trim() || disabled || uploading}>
			{#snippet children()}{#if disabled || uploading}Saving…{:else}{player ? 'Update' : 'Create'}{/if}{/snippet}
		</Button>
	</div>
</form>

<style>
	.form { display: flex; flex-direction: column; gap: var(--space-md); }
	.field { display: flex; flex-direction: column; gap: var(--space-xs); }
	label { font-size: 0.85rem; font-weight: 600; color: var(--color-text-secondary); }
	.req { color: var(--color-primary); }
	.opt { font-weight: 400; font-size: 0.75rem; color: var(--color-text-muted); }
	.row { display: flex; gap: var(--space-sm); }
	.row input { flex: 1; }
	.preview { width: 100%; max-width: 200px; border-radius: var(--radius-md); margin-top: var(--space-sm); }
	.actions { display: flex; justify-content: flex-end; gap: var(--space-sm); margin-top: var(--space-md); }
	input[type='file'] { font-size: 0.8rem; padding: var(--space-sm); }
</style>


