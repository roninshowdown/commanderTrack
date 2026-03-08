<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
		size?: 'sm' | 'md' | 'lg';
		disabled?: boolean;
		fullWidth?: boolean;
		onclick?: (e: MouseEvent) => void;
		children?: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		fullWidth = false,
		onclick,
		children
	}: Props = $props();
</script>

<button
	class="btn btn-{variant} btn-{size}"
	class:full-width={fullWidth}
	{disabled}
	{onclick}
>
	{#if children}{@render children()}{/if}
</button>

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		border-radius: var(--radius-md);
		font-weight: 600;
		transition: all var(--transition-fast);
		white-space: nowrap;
		cursor: pointer;
	}

	.btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.btn:not(:disabled):active {
		transform: scale(0.96);
	}

	/* Variants */
	.btn-primary {
		background: var(--color-primary);
		color: white;
	}
	.btn-primary:not(:disabled):hover {
		background: var(--color-primary-light);
	}

	.btn-secondary {
		background: var(--color-surface-elevated);
		color: var(--color-text);
	}
	.btn-secondary:not(:disabled):hover {
		background: var(--color-surface-hover);
	}

	.btn-danger {
		background: var(--color-danger);
		color: white;
	}

	.btn-ghost {
		background: transparent;
		color: var(--color-text-secondary);
	}
	.btn-ghost:not(:disabled):hover {
		background: var(--color-surface-elevated);
		color: var(--color-text);
	}

	.btn-success {
		background: var(--color-success);
		color: white;
	}

	/* Sizes */
	.btn-sm {
		padding: var(--space-xs) var(--space-sm);
		font-size: 0.8rem;
	}
	.btn-md {
		padding: var(--space-sm) var(--space-md);
		font-size: 0.9rem;
	}
	.btn-lg {
		padding: var(--space-md) var(--space-lg);
		font-size: 1rem;
	}

	.full-width {
		width: 100%;
	}
</style>


