<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		message: string;
		type?: 'success' | 'error';
		onclose: () => void;
		actionLabel?: string;
		onaction?: () => void;
		durationMs?: number;
		autoClose?: boolean;
	}
	let {
		message,
		type = 'success',
		onclose,
		actionLabel,
		onaction,
		durationMs = 3000,
		autoClose = true
	}: Props = $props();

	onMount(() => {
		if (!autoClose) return;
		const t = setTimeout(onclose, durationMs);
		return () => clearTimeout(t);
	});
</script>

<div class="toast toast-{type} animate-fade-in" role="alert">
	<span>{message}</span>
	{#if actionLabel && onaction}
		<button class="action-btn" onclick={onaction}>{actionLabel}</button>
	{/if}
	<button onclick={onclose}>✕</button>
</div>

<style>
	.toast {
		position: fixed; bottom: calc(var(--space-lg) + env(safe-area-inset-bottom, 0px));
		left: 50%; transform: translateX(-50%); z-index: 2000;
		display: flex; align-items: center; gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md); border-radius: var(--radius-lg);
		font-size: 0.8rem; font-weight: 600; max-width: 360px; width: 90vw;
		box-shadow: var(--shadow-md);
	}
	.toast span { flex: 1; }
	.toast button { color: inherit; font-size: 0.9rem; min-height: 24px; }
	.action-btn {
		padding: 4px 10px;
		border-radius: var(--radius-full);
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		border: 1px solid currentColor;
	}
	.toast-success { background: var(--color-success); color: #04151f; }
	.toast-error { background: var(--color-danger); color: white; }
</style>

