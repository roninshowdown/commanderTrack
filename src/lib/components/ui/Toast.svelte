<script lang="ts">
	import { onMount } from 'svelte';

	interface Props { message: string; type?: 'success' | 'error'; onclose: () => void; }
	let { message, type = 'success', onclose }: Props = $props();

	onMount(() => {
		const t = setTimeout(onclose, 3000);
		return () => clearTimeout(t);
	});
</script>

<div class="toast toast-{type} animate-fade-in" role="alert">
	<span>{message}</span>
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
	.toast-success { background: var(--color-success); color: #04151f; }
	.toast-error { background: var(--color-danger); color: white; }
</style>

