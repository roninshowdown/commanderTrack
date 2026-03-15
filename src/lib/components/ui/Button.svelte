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
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		transition: all var(--transition-fast);
		white-space: nowrap;
		cursor: pointer;
		border: 1px solid transparent;
	}

	.btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.btn:not(:disabled):active {
		transform: scale(0.96);
	}

	/* Variants */
	.btn-primary {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary-light);
		box-shadow: var(--glow-primary);
	}
	.btn-primary:not(:disabled):hover {
		background: var(--color-primary-light);
		box-shadow: var(--glow-primary-strong);
	}

	.btn-secondary {
		background: var(--color-surface-elevated);
		color: var(--color-text);
		border-color: var(--color-surface-hover);
	}
	.btn-secondary:not(:disabled):hover {
		background: var(--color-surface-hover);
		border-color: var(--neon-cyan);
		box-shadow: var(--glow-cyan);
	}

	.btn-danger {
		background: var(--color-danger);
		color: white;
		border-color: rgba(255, 23, 68, 0.6);
		box-shadow: var(--glow-danger);
	}

	.btn-ghost {
		background: transparent;
		color: var(--color-text-secondary);
		border-color: transparent;
	}
	.btn-ghost:not(:disabled):hover {
		background: var(--color-surface-elevated);
		color: var(--color-text);
		border-color: var(--color-surface-hover);
	}

	.btn-success {
		background: var(--color-success);
		color: #0a0a0f;
		border-color: rgba(0, 230, 118, 0.5);
		box-shadow: var(--glow-success);
	}

	/* Sizes */
	.btn-sm {
		padding: var(--space-xs) var(--space-sm);
		font-size: 0.75rem;
	}
	.btn-md {
		padding: var(--space-sm) var(--space-md);
		font-size: 0.8rem;
	}
	.btn-lg {
		padding: var(--space-md) var(--space-lg);
		font-size: 0.9rem;
	}

	.full-width {
		width: 100%;
	}
</style>
