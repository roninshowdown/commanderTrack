<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		title?: string;
		onclose?: () => void;
		children?: Snippet;
	}

	let { open = $bindable(), title = '', onclose, children }: Props = $props();

	function handleBackdrop() {
		open = false;
		onclose?.();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') handleBackdrop();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="modal-backdrop" onclick={handleBackdrop} role="presentation">
		<div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
			{#if title}
				<div class="modal-header">
					<h2>{title}</h2>
					<button class="close-btn" onclick={handleBackdrop}>✕</button>
				</div>
			{/if}
			<div class="modal-body">
				{#if children}{@render children()}{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: var(--space-md);
		animation: fade-in 200ms ease;
	}

	.modal {
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		width: 100%;
		max-width: 480px;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: var(--shadow-lg);
		animation: scale-in 200ms ease;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-md) var(--space-lg);
		border-bottom: 1px solid var(--color-surface-elevated);
	}

	.modal-header h2 {
		font-size: 1.1rem;
		font-weight: 700;
	}

	.close-btn {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-full);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1rem;
		color: var(--color-text-secondary);
		transition: all var(--transition-fast);
	}

	.close-btn:hover {
		background: var(--color-surface-elevated);
		color: var(--color-text);
	}

	.modal-body {
		padding: var(--space-lg);
	}
</style>


