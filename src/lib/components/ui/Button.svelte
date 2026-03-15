<script lang="ts">
	interface Props {
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		fullWidth?: boolean;
		disabled?: boolean;
		onclick?: () => void;
		children: import('svelte').Snippet;
	}

	let { variant = 'primary', size = 'md', fullWidth = false, disabled = false, onclick, children }: Props = $props();
</script>

<button class="btn btn-{variant} btn-{size}" class:full-width={fullWidth} {disabled} onclick={onclick}>
	{@render children()}
</button>

<style>
	.btn {
		display: inline-flex; align-items: center; justify-content: center; gap: 6px;
		font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
		border-radius: var(--radius-lg); transition: all var(--transition-fast);
		cursor: pointer; border: 1px solid transparent; white-space: nowrap;
	}
	.btn:disabled { opacity: 0.5; cursor: not-allowed; }
	.btn-sm { padding: 6px 12px; font-size: 0.7rem; min-height: 36px; }
	.btn-md { padding: 8px 18px; font-size: 0.8rem; min-height: 44px; }
	.btn-lg { padding: 12px 24px; font-size: 0.9rem; min-height: 48px; }
	.full-width { width: 100%; }

	.btn-primary { background: var(--color-primary); color: white; border-color: var(--color-primary-light); box-shadow: var(--glow-primary); }
	.btn-primary:hover:not(:disabled) { background: var(--color-primary-light); }
	.btn-secondary { background: var(--color-secondary-dim); color: var(--color-secondary); border-color: var(--neon-cyan); }
	.btn-secondary:hover:not(:disabled) { box-shadow: var(--glow-cyan); }
	.btn-ghost { background: transparent; color: var(--color-text-secondary); border-color: var(--color-surface-elevated); }
	.btn-ghost:hover:not(:disabled) { background: var(--color-surface-elevated); color: var(--color-text); }
	.btn-danger { background: rgba(255,23,68,0.15); color: var(--color-danger); border-color: rgba(255,23,68,0.4); }
	.btn-danger:hover:not(:disabled) { background: rgba(255,23,68,0.25); }
</style>

