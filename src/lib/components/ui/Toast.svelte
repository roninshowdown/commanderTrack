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
		border-radius: var(--radius-lg);
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.03em;
		display: flex;
		align-items: center;
		gap: var(--space-md);
		z-index: 2000;
		animation: fade-in 200ms ease;
		border: 1px solid transparent;
	}

	.hiding {
		opacity: 0;
		transition: opacity 300ms ease;
	}

	.toast-success {
		background: rgba(0, 230, 118, 0.12);
		color: var(--color-success);
		border-color: rgba(0, 230, 118, 0.3);
		box-shadow: var(--glow-success);
	}

	.toast-error {
		background: rgba(232, 25, 59, 0.12);
		color: var(--color-primary);
		border-color: var(--neon-red);
		box-shadow: var(--glow-primary);
	}

	.toast-info {
		background: rgba(0, 229, 255, 0.1);
		color: var(--color-secondary);
		border-color: var(--neon-cyan);
		box-shadow: var(--glow-cyan);
	}

	.toast button {
		color: inherit;
		opacity: 0.6;
		font-size: 0.8rem;
		min-height: auto;
		padding: var(--space-xs);
	}
</style>
