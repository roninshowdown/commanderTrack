<script lang="ts">
	import '../app.css';
	import { authUser } from '$lib/firebase/auth';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import Icon from '$lib/components/ui/Icon.svelte';
	import '$lib/utils/debug'; // Activate debug mode utilities

	let { children } = $props();

	let currentPath = $derived($page.url.pathname);
	let isHome = $derived(currentPath === '/');

	onMount(() => {
		authUser.init();
	});
</script>

<div class="app-shell">
	{#if !isHome}
		<header class="top-bar animate-fade-in">
			<a href="/" class="back-btn">
				<Icon name="back" size={20} />
				<span>Menu</span>
			</a>
		</header>
	{/if}
	<main class="app-main" class:has-header={!isHome}>
		{@render children()}
	</main>
</div>

<style>
	.app-shell {
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
	}

	.top-bar {
		position: sticky;
		top: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		padding: var(--space-sm) var(--space-md);
		padding-top: calc(var(--space-sm) + env(safe-area-inset-top, 0px));
		background: rgba(10, 10, 15, 0.85);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border-bottom: 1px solid var(--color-surface-elevated);
	}

	.back-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--color-primary);
		text-decoration: none;
		font-weight: 700;
		font-size: 0.85rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		transition: all var(--transition-fast);
		min-height: 44px;
	}

	.back-btn:hover {
		background: var(--color-primary-dim);
	}

	.app-main {
		flex: 1;
		padding: var(--space-md);
		padding-bottom: calc(var(--space-lg) + env(safe-area-inset-bottom, 0px));
		max-width: 600px;
		margin: 0 auto;
		width: 100%;
		overflow-x: hidden;
	}

	.app-main.has-header {
		padding-top: var(--space-sm);
	}
</style>
