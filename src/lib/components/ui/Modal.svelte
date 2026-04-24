<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		title: string;
		open: boolean;
		children: import('svelte').Snippet;
	}

	let { title, open = $bindable(false), children }: Props = $props();

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') open = false;
	}

	onMount(() => {
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	});
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="backdrop" onclick={() => (open = false)}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="modal animate-fade-in" onclick={(e) => e.stopPropagation()}>
			<header class="modal-header">
				<h2>{title}</h2>
				<button class="close-btn" onclick={() => (open = false)}>✕</button>
			</header>
			<div class="modal-body">
				{@render children()}
			</div>
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed; inset: 0; z-index: 1000;
		background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center;
		padding: var(--space-md);
		overflow: hidden;
	}
	.modal {
		width: 100%; max-width: 420px; max-height: 90dvh; overflow: hidden;
		background: var(--color-surface); border: 1px solid var(--color-surface-elevated);
		border-radius: var(--radius-xl); padding: var(--space-lg);
		box-shadow: var(--shadow-lg);
		display: flex;
		flex-direction: column;
	}
	.modal-header {
		display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);
	}
	.modal-header h2 { font-size: 1rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-primary); }
	.close-btn { font-size: 1.2rem; color: var(--color-text-muted); min-height: 36px; }
	.modal-body { display: flex; flex-direction: column; gap: var(--space-md); overflow-y: auto; -webkit-overflow-scrolling: touch; touch-action: pan-y; }
</style>


