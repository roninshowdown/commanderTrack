<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		message: string;
		type?: 'success' | 'error' | 'info';
		duration?: number;
		onclose?: () => void;
	}

	let { message, type = 'info', duration = 3000, onclose }: Props = $props();
	let visible = $state(true);

	onMount(() => {
		const timer = setTimeout(() => {
			visible = false;
			setTimeout(() => onclose?.(), 300);
		}, duration);
		return () => clearTimeout(timer);
	});
</script>

{#if visible}
	<div class="toast toast-{type}" class:hiding={!visible}>
		<span>{message}</span>
		<button onclick={() => { visible = false; onclose?.(); }}>✕</button>
	</div>
{/if}

<style>
	.toast {
		position: fixed;
		bottom: var(--space-lg);
		left: 50%;
		transform: translateX(-50%);
		padding: var(--space-sm) var(--space-lg);
		border-radius: var(--radius-md);
		font-size: 0.9rem;
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: var(--space-md);
		z-index: 2000;
		animation: fade-in 200ms ease;
		box-shadow: var(--shadow-md);
	}

	.hiding {
		opacity: 0;
		transition: opacity 300ms ease;
	}

	.toast-success {
		background: var(--color-success);
		color: white;
	}
	.toast-error {
		background: var(--color-danger);
		color: white;
	}
	.toast-info {
		background: var(--color-info);
		color: white;
	}

	button {
		opacity: 0.7;
	}
	button:hover {
		opacity: 1;
	}
</style>

