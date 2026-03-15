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
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onpointerdown={handleBackdrop}>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="modal"
			role="dialog"
			aria-modal="true"
			aria-label={title || 'Dialog'}
			tabindex="-1"
			onpointerdown={(e) => e.stopPropagation()}
		>
			{#if title}
				<div class="modal-header">
					<h2>{title}</h2>
					<button type="button" class="close-btn" onclick={handleBackdrop}>✕</button>
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
		background: rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: var(--space-md);
		animation: fade-in 200ms ease;
	}

	.modal {
		background: var(--color-surface);
		border: 1px solid var(--neon-red);
		border-radius: var(--radius-xl);
		width: 100%;
		max-width: 480px;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: var(--glow-primary), var(--shadow-lg);
		animation: scale-in 200ms ease;
	}

	@media (max-width: 480px) {
		.modal {
			max-width: 100%;
			max-height: 100dvh;
			border-radius: var(--radius-lg);
			margin: var(--space-sm);
		}
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-md) var(--space-lg);
		border-bottom: 1px solid var(--color-surface-elevated);
	}

	.modal-header h2 {
		font-size: 0.95rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-primary);
	}

	.close-btn {
		width: 36px;
		height: 36px;
		border-radius: var(--radius-full);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.9rem;
		color: var(--color-text-muted);
		transition: all var(--transition-fast);
		min-height: 36px;
	}

	.close-btn:hover {
		background: var(--color-primary-dim);
		color: var(--color-primary);
	}

	.modal-body {
		padding: var(--space-lg);
	}
</style>
